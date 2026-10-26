<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StockController extends BaseApiController
{
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
}
