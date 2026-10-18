<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\WorkOrder;
use App\Models\WorkOrderLine;
use App\Services\WorkOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WorkOrderController extends BaseApiController
{
    public function __construct(private WorkOrderService $woService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $query = WorkOrder::with(['customer', 'goodsReceipt', 'branch', 'creator', 'lines.customerItem']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($customerId = $request->input('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        $wos = $query->latest()->paginate((int) $request->input('per_page', 20));
        return $this->sendResponse($wos, 'Work orders retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'branch_id' => 'required|uuid|exists:branches,id',
            'wo_number' => 'required|string|max:50|unique:work_orders,wo_number',
            'customer_id' => 'required|uuid|exists:customers,id',
            'goods_receipt_id' => 'nullable|uuid|exists:goods_receipts,id',
            'order_date' => 'required|date',
            'target_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.goods_receipt_line_id' => 'nullable|uuid|exists:goods_receipt_lines,id',
            'lines.*.customer_item_id' => 'required|uuid|exists:customer_items,id',
            'lines.*.color_specification' => 'nullable|string|max:100',
            'lines.*.treatment_type' => 'nullable|string|max:100',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $wo = DB::transaction(function () use ($data, $request) {
            $wo = WorkOrder::create([
                'company_id' => $data['company_id'],
                'branch_id' => $data['branch_id'],
                'wo_number' => $data['wo_number'],
                'customer_id' => $data['customer_id'],
                'goods_receipt_id' => $data['goods_receipt_id'] ?? null,
                'order_date' => $data['order_date'],
                'target_date' => $data['target_date'] ?? null,
                'status' => 'DRAFT',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                WorkOrderLine::create([
                    'work_order_id' => $wo->id,
                    'goods_receipt_line_id' => $line['goods_receipt_line_id'] ?? null,
                    'customer_item_id' => $line['customer_item_id'],
                    'color_specification' => $line['color_specification'] ?? null,
                    'treatment_type' => $line['treatment_type'] ?? null,
                    'quantity' => (float) $line['quantity'],
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            return $wo->load(['lines.customerItem', 'customer', 'goodsReceipt']);
        });

        return $this->sendResponse($wo, 'Work order created successfully.', 201);
    }

    public function show(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $wo = WorkOrder::with([
            'customer', 'goodsReceipt', 'branch', 'creator', 'poster',
            'lines.customerItem', 'lines.stageMovements.toStatus', 'lines.stageMovements.worker',
            'lines.qcInspections.inspector', 'materialUsages.lines.material'
        ])->find($id);

        if (!$wo) {
            return $this->sendError('Work order not found.', [], 404);
        }
        return $this->sendResponse($wo, 'Work order retrieved successfully.');
    }

    public function post(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $wo = WorkOrder::find($id);
        if (!$wo) {
            return $this->sendError('Work order not found.', [], 404);
        }

        try {
            $updated = $this->woService->postWorkOrder($wo, $request->user()->id);
            return $this->sendResponse($updated, 'Work order posted successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }

    public function storeStageMovement(Request $request, string $lineId): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $line = WorkOrderLine::find($lineId);
        if (!$line) {
            return $this->sendError('Work order line not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'to_status_id' => 'required|uuid|exists:production_statuses,id',
            'from_status_id' => 'nullable|uuid|exists:production_statuses,id',
            'quantity' => 'required|numeric|min:0.001',
            'worker_id' => 'nullable|uuid|exists:workers,id',
            'notes' => 'nullable|string',
            'moved_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        try {
            $movement = $this->woService->recordStageMovement($line, $validator->validated(), $request->user()->id);
            return $this->sendResponse($movement, 'Stage movement recorded successfully.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }

    public function storeQcInspection(Request $request, string $lineId): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $line = WorkOrderLine::find($lineId);
        if (!$line) {
            return $this->sendError('Work order line not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'quantity_inspected' => 'required|numeric|min:0.001',
            'quantity_passed' => 'required|numeric|min:0',
            'quantity_rejected' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'inspected_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        try {
            $inspection = $this->woService->recordQcInspection($line, $validator->validated(), $request->user()->id);
            return $this->sendResponse($inspection, 'QC inspection recorded successfully.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }
}
