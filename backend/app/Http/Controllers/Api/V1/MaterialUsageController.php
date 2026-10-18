<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\MaterialUsage;
use App\Models\MaterialUsageLine;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MaterialUsageController extends BaseApiController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $query = MaterialUsage::with(['warehouse', 'creator', 'poster', 'lines.material', 'lines.uom']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $usages = $query->latest()->paginate((int) $request->input('per_page', 20));
        return $this->sendResponse($usages, 'Material usages retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'usage_number' => 'required|string|max:50|unique:material_usages,usage_number',
            'usage_date' => 'required|date',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|uuid',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.material_id' => 'required|uuid|exists:materials,id',
            'lines.*.batch_id' => 'nullable|uuid|exists:material_batches,id',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.uom_id' => 'required|uuid|exists:uoms,id',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $usage = DB::transaction(function () use ($data, $request) {
            $usage = MaterialUsage::create([
                'company_id' => $data['company_id'],
                'warehouse_id' => $data['warehouse_id'],
                'usage_number' => $data['usage_number'],
                'usage_date' => $data['usage_date'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'status' => 'DRAFT',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                MaterialUsageLine::create([
                    'material_usage_id' => $usage->id,
                    'material_id' => $line['material_id'],
                    'batch_id' => $line['batch_id'] ?? null,
                    'quantity' => (float) $line['quantity'],
                    'uom_id' => $line['uom_id'],
                ]);
            }

            return $usage->load(['lines.material', 'lines.uom', 'warehouse']);
        });

        return $this->sendResponse($usage, 'Material usage created successfully.', 201);
    }

    public function show(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $usage = MaterialUsage::with(['warehouse', 'creator', 'poster', 'lines.material', 'lines.uom'])->find($id);
        if (!$usage) {
            return $this->sendError('Material usage not found.', [], 404);
        }
        return $this->sendResponse($usage, 'Material usage retrieved successfully.');
    }

    public function post(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $usage = MaterialUsage::find($id);
        if (!$usage) {
            return $this->sendError('Material usage not found.', [], 404);
        }

        try {
            $updated = $this->inventoryService->postMaterialUsage($usage, $request->user()->id);
            return $this->sendResponse($updated, 'Material usage posted successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $usage = MaterialUsage::find($id);
        if (!$usage) {
            return $this->sendError('Material usage not found.', [], 404);
        }

        try {
            $updated = $this->inventoryService->cancelMaterialUsage($usage, $request->user()->id);
            return $this->sendResponse($updated, 'Material usage cancelled successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }
}
