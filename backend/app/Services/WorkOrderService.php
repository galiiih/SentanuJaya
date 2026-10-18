<?php

namespace App\Services;

use App\Models\WorkOrder;
use App\Models\WorkOrderLine;
use App\Models\ProductionStageMovement;
use App\Models\InternalQcInspection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkOrderService
{
    public function postWorkOrder(WorkOrder $workOrder, string $userId): WorkOrder
    {
        return DB::transaction(function () use ($workOrder, $userId) {
            if ($workOrder->status !== 'DRAFT') {
                throw ValidationException::withMessages([
                    'status' => ['Only DRAFT work orders can be posted.'],
                ]);
            }

            // Verify customer goods receipt line availability / quantities
            foreach ($workOrder->lines as $line) {
                if ($line->goods_receipt_line_id) {
                    $grLine = $line->goodsReceiptLine;
                    if (!$grLine || $grLine->goodsReceipt->status !== 'POSTED') {
                        throw ValidationException::withMessages([
                            'goods_receipt_line_id' => ["Goods receipt line must be from a posted goods receipt."],
                        ]);
                    }

                    // Check if quantity requested exceeds available unallocated quantity from this GR line
                    $allocatedQty = WorkOrderLine::where('goods_receipt_line_id', $grLine->id)
                        ->where('work_order_id', '!=', $workOrder->id)
                        ->whereHas('workOrder', fn ($q) => $q->where('status', '!=', 'CANCELLED'))
                        ->sum('quantity');

                    $totalAvailable = (float) $grLine->quantity_received - (float) $allocatedQty;
                    if ((float) $line->quantity > $totalAvailable) {
                        throw ValidationException::withMessages([
                            'quantity' => ["Quantity exceeds available unallocated customer goods quantity ({$totalAvailable})."],
                        ]);
                    }
                }
            }

            $workOrder->update([
                'status' => 'IN_PROGRESS',
                'posted_by' => $userId,
                'posted_at' => now(),
            ]);

            return $workOrder->load(['lines.customerItem', 'customer', 'goodsReceipt']);
        });
    }

    public function recordStageMovement(WorkOrderLine $line, array $data, string $userId): ProductionStageMovement
    {
        return DB::transaction(function () use ($line, $data, $userId) {
            $wo = $line->workOrder;
            if ($wo->status !== 'IN_PROGRESS') {
                throw ValidationException::withMessages([
                    'status' => ['Work order is not in progress.'],
                ]);
            }

            $qtyToMove = (float) $data['quantity'];
            if ($qtyToMove <= 0) {
                throw ValidationException::withMessages([
                    'quantity' => ['Movement quantity must be greater than zero.'],
                ]);
            }

            // Optional: validate cumulative stage quantities if needed
            $movement = ProductionStageMovement::create([
                'work_order_line_id' => $line->id,
                'from_status_id' => $data['from_status_id'] ?? null,
                'to_status_id' => $data['to_status_id'],
                'quantity' => $qtyToMove,
                'worker_id' => $data['worker_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'moved_at' => $data['moved_at'] ?? now(),
            ]);

            return $movement->load(['fromStatus', 'toStatus', 'worker']);
        });
    }

    public function recordQcInspection(WorkOrderLine $line, array $data, string $userId): InternalQcInspection
    {
        return DB::transaction(function () use ($line, $data, $userId) {
            $passed = (float) $data['quantity_passed'];
            $rejected = (float) $data['quantity_rejected'];
            $inspected = (float) $data['quantity_inspected'];

            if (abs($inspected - ($passed + $rejected)) > 0.001) {
                throw ValidationException::withMessages([
                    'quantity_inspected' => ['Inspected quantity must equal sum of passed and rejected.'],
                ]);
            }

            $inspection = InternalQcInspection::create([
                'work_order_line_id' => $line->id,
                'quantity_inspected' => $inspected,
                'quantity_passed' => $passed,
                'quantity_rejected' => $rejected,
                'result' => $passed > 0 && $rejected == 0 ? 'PASS' : ($rejected > 0 && $passed == 0 ? 'FAIL' : 'PARTIAL'),
                'notes' => $data['notes'] ?? null,
                'inspector_id' => $userId,
                'inspected_at' => $data['inspected_at'] ?? now(),
            ]);

            // Update line completed/rejected totals
            $line->increment('quantity_completed', $passed);
            $line->increment('quantity_rejected', $rejected);

            return $inspection->load(['inspector']);
        });
    }
}
