<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\MaterialReceipt;
use App\Models\MaterialReceiptLine;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MaterialReceiptController extends BaseApiController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $query = MaterialReceipt::with(['warehouse', 'supplier', 'creator', 'poster', 'lines.material', 'lines.uom']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $receipts = $query->latest()->paginate((int) $request->input('per_page', 20));
        return $this->sendResponse($receipts, 'Material receipts retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');

        $input = $request->all();

        if (empty($input['company_id'])) {
            $input['company_id'] = \App\Models\Company::first()?->id;
        }
        if (empty($input['receipt_number'])) {
            $input['receipt_number'] = 'MR-' . date('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(4));
        }

        if (!empty($input['lines']) && is_array($input['lines'])) {
            foreach ($input['lines'] as &$line) {
                if (!isset($line['quantity']) && isset($line['quantity_received'])) {
                    $line['quantity'] = $line['quantity_received'];
                }
                if (empty($line['uom_id']) && !empty($line['material_id'])) {
                    $mat = \App\Models\Material::find($line['material_id']);
                    $line['uom_id'] = $mat?->stock_uom_id ?? $mat?->purchase_uom_id ?? \App\Models\Uom::first()?->id;
                }
            }
            unset($line);
        }

        $validator = Validator::make($input, [
            'company_id' => 'required|uuid|exists:companies,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'receipt_number' => 'required|string|max:50|unique:material_receipts,receipt_number',
            'supplier_id' => 'nullable|uuid|exists:suppliers,id',
            'receipt_date' => 'required|date',
            'reference_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.material_id' => 'required|uuid|exists:materials,id',
            'lines.*.batch_number' => 'nullable|string|max:100',
            'lines.*.expiry_date' => 'nullable|date',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.uom_id' => 'required|uuid|exists:uoms,id',
            'lines.*.unit_cost' => 'required|numeric|min:0',
            'lines.*.notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $receipt = DB::transaction(function () use ($data, $request) {
            $receipt = MaterialReceipt::create([
                'company_id' => $data['company_id'],
                'warehouse_id' => $data['warehouse_id'],
                'receipt_number' => $data['receipt_number'],
                'supplier_id' => $data['supplier_id'] ?? null,
                'receipt_date' => $data['receipt_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'status' => 'DRAFT',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                $qty = (float) $line['quantity'];
                $cost = (float) $line['unit_cost'];
                MaterialReceiptLine::create([
                    'material_receipt_id' => $receipt->id,
                    'material_id' => $line['material_id'],
                    'batch_number' => $line['batch_number'] ?? null,
                    'expiry_date' => $line['expiry_date'] ?? null,
                    'quantity' => $qty,
                    'uom_id' => $line['uom_id'],
                    'unit_cost' => $cost,
                    'subtotal' => $qty * $cost,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            return $receipt->load(['lines.material', 'lines.uom', 'warehouse', 'supplier']);
        });

        return $this->sendResponse($receipt, 'Material receipt created successfully.', 201);
    }

    public function show(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $receipt = MaterialReceipt::with(['warehouse', 'supplier', 'creator', 'poster', 'lines.material', 'lines.uom'])->find($id);
        if (!$receipt) {
            return $this->sendError('Material receipt not found.', [], 404);
        }
        return $this->sendResponse($receipt, 'Material receipt retrieved successfully.');
    }

    public function post(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $receipt = MaterialReceipt::find($id);
        if (!$receipt) {
            return $this->sendError('Material receipt not found.', [], 404);
        }

        try {
            $updated = $this->inventoryService->postMaterialReceipt($receipt, $request->user()->id);
            return $this->sendResponse($updated, 'Material receipt posted successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $receipt = MaterialReceipt::find($id);
        if (!$receipt) {
            return $this->sendError('Material receipt not found.', [], 404);
        }

        try {
            $updated = $this->inventoryService->cancelMaterialReceipt($receipt, $request->user()->id);
            return $this->sendResponse($updated, 'Material receipt cancelled successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }
}
