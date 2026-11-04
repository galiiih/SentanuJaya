<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Material;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class StockController extends BaseApiController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $query = Stock::with(['warehouse.branch', 'material.stockUom']);

        if ($warehouseId = $request->input('warehouse_id')) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($materialId = $request->input('material_id')) {
            $query->where('material_id', $materialId);
        }

        $stocks = $query->paginate((int) $request->input('per_page', 20));
        return $this->sendResponse($stocks, 'Stock balances retrieved successfully.');
    }

    public function movements(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $query = StockMovement::with(['warehouse', 'material', 'batch', 'creator']);

        if ($warehouseId = $request->input('warehouse_id')) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($materialId = $request->input('material_id')) {
            $query->where('material_id', $materialId);
        }

        $movements = $query->latest('movement_date')->latest()->paginate((int) $request->input('per_page', 20));
        return $this->sendResponse($movements, 'Stock movements retrieved successfully.');
    }

    public function lowStock(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');

        // Find materials where total stock across warehouses <= minimum_stock
        $materials = Material::with(['stockUom'])->get()->map(function ($material) {
            $totalStock = Stock::where('material_id', $material->id)->sum('quantity_on_hand');
            return [
                'material' => $material,
                'total_stock' => (float) $totalStock,
                'minimum_stock' => (float) $material->minimum_stock,
                'is_low' => $totalStock <= $material->minimum_stock,
            ];
        })->filter(fn ($item) => $item['is_low'])->values();

        return $this->sendResponse($materials, 'Low stock alert retrieved successfully.');
    }

    public function adjust(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'material_id' => 'required|uuid|exists:materials,id',
            'type' => 'required|in:IN,OUT',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        try {
            $movement = $this->inventoryService->adjustStock($validator->validated(), $request->user()->id);
            return $this->sendResponse($movement, 'Stock adjusted successfully.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation Error.', $e->errors(), 422);
        }
    }
}
