<?php

namespace App\Services;

use App\Models\MaterialBatch;
use App\Models\MaterialReceipt;
use App\Models\MaterialUsage;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function __construct(private SecurityAuditLogger $auditLogger)
    {
    }

    public function postMaterialReceipt(MaterialReceipt $receipt, string $actorId): MaterialReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId) {
            $locked = MaterialReceipt::query()->with(['lines.material', 'warehouse'])->lockForUpdate()->findOrFail($receipt->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => ['Only DRAFT material receipts can be posted.']]);
            }

            foreach ($locked->lines as $line) {
                if ($line->quantity <= 0) {
                    throw ValidationException::withMessages(['lines' => ['Receipt quantity must be greater than zero.']]);
                }
                if (!$line->material->is_active) {
                    throw ValidationException::withMessages(['lines' => ["Material {$line->material->code} is inactive."]]);
                }

                $warehouseId = $locked->warehouse_id;
                $materialId = $line->material_id;

                // Lock stock record
                $stock = Stock::query()
                    ->where('warehouse_id', $warehouseId)
                    ->where('material_id', $materialId)
                    ->lockForUpdate()
                    ->first();

                if (!$stock) {
                    $stock = Stock::create([
                        'warehouse_id' => $warehouseId,
                        'material_id' => $materialId,
                        'quantity_on_hand' => 0,
                        'average_unit_cost' => 0,
                        'total_value' => 0,
                    ]);
                    $stock = Stock::query()->lockForUpdate()->findOrFail($stock->id);
                }

                $qtyIn = (float) $line->quantity;
                $unitCost = (float) $line->unit_cost;
                $valueIn = $qtyIn * $unitCost;

                $currentQty = (float) $stock->quantity_on_hand;
                $currentVal = (float) $stock->total_value;

                $nextQty = $currentQty + $qtyIn;
                $nextVal = $currentVal + $valueIn;
                $nextAvgCost = $nextQty > 0 ? $nextVal / $nextQty : $unitCost;

                // Handle batch if tracked
                $batchId = null;
                if ($line->batch_number) {
                    $batch = MaterialBatch::firstOrCreate(
                        [
                            'material_id' => $materialId,
                            'batch_number' => $line->batch_number,
                        ],
                        [
                            'received_date' => $locked->receipt_date,
                            'expiry_date' => $line->expiry_date,
                            'quantity_received' => 0,
                            'quantity_remaining' => 0,
                            'unit_cost' => $unitCost,
                            'status' => 'ACTIVE',
                        ]
                    );
                    $batch = MaterialBatch::query()->lockForUpdate()->findOrFail($batch->id);
                    $batch->increment('quantity_received', $qtyIn);
                    $batch->increment('quantity_remaining', $qtyIn);
                    $batchId = $batch->id;
                }

                StockMovement::create([
                    'warehouse_id' => $warehouseId,
                    'material_id' => $materialId,
                    'batch_id' => $batchId,
                    'movement_type' => 'IN_PURCHASE',
                    'reference_type' => 'MATERIAL_RECEIPT',
                    'reference_id' => $locked->id,
                    'quantity_in' => $qtyIn,
                    'quantity_out' => 0,
                    'unit_cost' => $unitCost,
                    'value_in' => $valueIn,
                    'value_out' => 0,
                    'balance_qty_after' => $nextQty,
                    'balance_value_after' => $nextVal,
                    'movement_date' => $locked->receipt_date,
                    'created_by' => $actorId,
                    'notes' => "Posted from Material Receipt {$locked->receipt_number}",
                ]);

                $stock->update([
                    'quantity_on_hand' => $nextQty,
                    'average_unit_cost' => $nextAvgCost,
                    'total_value' => $nextVal,
                    'last_movement_at' => now(),
                ]);
            }

            $locked->update([
                'status' => 'POSTED',
                'posted_by' => $actorId,
                'posted_at' => now(),
            ]);

            $this->auditLogger->log($actorId, 'POST_MATERIAL_RECEIPT', 'MATERIAL_RECEIPT', $locked->id, ['status' => 'DRAFT'], ['status' => 'POSTED']);

            return $locked->fresh(['lines.material', 'warehouse', 'supplier']);
        });
    }

    public function cancelMaterialReceipt(MaterialReceipt $receipt, string $actorId): MaterialReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId) {
            $locked = MaterialReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => ['Only DRAFT material receipts can be cancelled.']]);
            }

            $locked->update(['status' => 'CANCELLED']);
            $this->auditLogger->log($actorId, 'CANCEL_MATERIAL_RECEIPT', 'MATERIAL_RECEIPT', $locked->id, ['status' => 'DRAFT'], ['status' => 'CANCELLED']);

            return $locked->fresh(['lines.material', 'warehouse', 'supplier']);
        });
    }

    public function postMaterialUsage(MaterialUsage $usage, string $actorId): MaterialUsage
    {
        return DB::transaction(function () use ($usage, $actorId) {
            $locked = MaterialUsage::query()->with(['lines.material', 'warehouse'])->lockForUpdate()->findOrFail($usage->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => ['Only DRAFT material usages can be posted.']]);
            }

            foreach ($locked->lines as $line) {
                if ($line->quantity <= 0) {
                    throw ValidationException::withMessages(['lines' => ['Usage quantity must be greater than zero.']]);
                }

                $warehouseId = $locked->warehouse_id;
                $materialId = $line->material_id;

                $stock = Stock::query()
                    ->where('warehouse_id', $warehouseId)
                    ->where('material_id', $materialId)
                    ->lockForUpdate()
                    ->first();

                if (!$stock || (float) $stock->quantity_on_hand < (float) $line->quantity) {
                    throw ValidationException::withMessages(['lines' => ["Insufficient stock for material {$line->material->code}. Available: " . ($stock?->quantity_on_hand ?? 0)]]);
                }

                $qtyOut = (float) $line->quantity;
                $avgCost = (float) $stock->average_unit_cost;
                $valueOut = $qtyOut * $avgCost;

                $currentQty = (float) $stock->quantity_on_hand;
                $currentVal = (float) $stock->total_value;

                $nextQty = $currentQty - $qtyOut;
                $nextVal = max(0, $currentVal - $valueOut);
                $nextAvgCost = $nextQty > 0 ? $nextVal / $nextQty : $avgCost;

                StockMovement::create([
                    'warehouse_id' => $warehouseId,
                    'material_id' => $materialId,
                    'batch_id' => $line->batch_id,
                    'movement_type' => 'OUT_PRODUCTION',
                    'reference_type' => 'MATERIAL_USAGE',
                    'reference_id' => $locked->id,
                    'quantity_in' => 0,
                    'quantity_out' => $qtyOut,
                    'unit_cost' => $avgCost,
                    'value_in' => 0,
                    'value_out' => $valueOut,
                    'balance_qty_after' => $nextQty,
                    'balance_value_after' => $nextVal,
                    'movement_date' => $locked->usage_date,
                    'created_by' => $actorId,
                    'notes' => "Posted from Material Usage {$locked->usage_number}",
                ]);

                $stock->update([
                    'quantity_on_hand' => $nextQty,
                    'average_unit_cost' => $nextAvgCost,
                    'total_value' => $nextVal,
                    'last_movement_at' => now(),
                ]);
            }

            $locked->update([
                'status' => 'POSTED',
                'posted_by' => $actorId,
                'posted_at' => now(),
            ]);

            $this->auditLogger->log($actorId, 'POST_MATERIAL_USAGE', 'MATERIAL_USAGE', $locked->id, ['status' => 'DRAFT'], ['status' => 'POSTED']);

            return $locked->fresh(['lines.material', 'warehouse']);
        });
    }

    public function cancelMaterialUsage(MaterialUsage $usage, string $actorId): MaterialUsage
    {
        return DB::transaction(function () use ($usage, $actorId) {
            $locked = MaterialUsage::query()->lockForUpdate()->findOrFail($usage->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => ['Only DRAFT material usages can be cancelled.']]);
            }

            $locked->update(['status' => 'CANCELLED']);
            $this->auditLogger->log($actorId, 'CANCEL_MATERIAL_USAGE', 'MATERIAL_USAGE', $locked->id, ['status' => 'DRAFT'], ['status' => 'CANCELLED']);

            return $locked->fresh(['lines.material', 'warehouse']);
        });
    }
}
