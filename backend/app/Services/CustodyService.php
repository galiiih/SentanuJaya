<?php

namespace App\Services;

use App\Models\Acceptance;
use App\Models\CustodyBalance;
use App\Models\CustodyLedger;
use App\Models\DeliveryOrder;
use App\Models\GoodsReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustodyService
{
    public function __construct(private SecurityAuditLogger $auditLogger)
    {
    }

    public function submitGoodsReceipt(GoodsReceipt $receipt, string $actorId): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId) {
            $locked = GoodsReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => [__('goods_receipt.errors.submit_only_draft')]]);
            }

            $this->validateCustomerOwnership($locked);
            $locked->update(['status' => 'SUBMITTED']);
            $this->auditLogger->log($actorId, 'SUBMIT_STB', 'GOODS_RECEIPT', $locked->id, ['status' => 'DRAFT'], ['status' => 'SUBMITTED']);

            return $locked->fresh('lines.customerItem', 'customer');
        });
    }

    public function postGoodsReceipt(GoodsReceipt $receipt, string $actorId): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId) {
            $locked = GoodsReceipt::query()->with('lines.customerItem')->lockForUpdate()->findOrFail($receipt->id);
            if ($locked->status !== 'SUBMITTED') {
                throw ValidationException::withMessages(['status' => [__('goods_receipt.errors.post_only_submitted')]]);
            }

            $this->validateCustomerOwnership($locked);
            foreach ($locked->lines as $line) {
                $balance = CustodyBalance::query()
                    ->where('customer_id', $locked->customer_id)
                    ->where('customer_item_id', $line->customer_item_id)
                    ->where('custody_location_id', $line->custody_location_id)
                    ->where('stage', 'RAW')
                    ->lockForUpdate()
                    ->first();

                if (!$balance) {
                    $balance = CustodyBalance::create([
                        'customer_id' => $locked->customer_id,
                        'customer_item_id' => $line->customer_item_id,
                        'custody_location_id' => $line->custody_location_id,
                        'stage' => 'RAW',
                        'balance_quantity' => 0,
                    ]);
                    $balance = CustodyBalance::query()->lockForUpdate()->findOrFail($balance->id);
                }

                $nextBalance = (float) $balance->balance_quantity + (float) $line->quantity_received;
                if ($nextBalance < 0) {
                    throw ValidationException::withMessages(['balance_quantity' => [__('goods_receipt.errors.negative_balance')]]);
                }

                CustodyLedger::create([
                    'customer_id' => $locked->customer_id,
                    'customer_item_id' => $line->customer_item_id,
                    'reference_type' => 'GOODS_RECEIPT',
                    'reference_id' => $locked->id,
                    'movement_type' => 'IN_FROM_CUSTOMER',
                    'quantity_in' => $line->quantity_received,
                    'quantity_out' => 0,
                    'custody_location_id' => $line->custody_location_id,
                    'stage' => 'RAW',
                    'movement_date' => $locked->received_date,
                    'created_by' => $actorId,
                    'notes' => __('goods_receipt.ledger_note', ['number' => $locked->stb_number]),
                ]);
                $balance->update(['balance_quantity' => $nextBalance, 'last_movement_at' => now()]);
            }

            $locked->update(['status' => 'POSTED', 'posted_by' => $actorId, 'posted_at' => now()]);
            $this->auditLogger->log($actorId, 'POST_STB', 'GOODS_RECEIPT', $locked->id, ['status' => 'SUBMITTED'], ['status' => 'POSTED', 'posted_at' => $locked->posted_at]);

            return $locked->fresh('lines.customerItem', 'customer');
        });
    }

    public function cancelGoodsReceipt(GoodsReceipt $receipt, string $actorId): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId) {
            $locked = GoodsReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => [__('goods_receipt.errors.cancel_only_draft')]]);
            }

            $locked->update(['status' => 'CANCELLED']);
            $this->auditLogger->log($actorId, 'CANCEL_STB', 'GOODS_RECEIPT', $locked->id, ['status' => 'DRAFT'], ['status' => 'CANCELLED']);

            return $locked->fresh('lines.customerItem', 'customer');
        });
    }

    public function validateCustomerOwnership(GoodsReceipt $receipt): void
    {
        $receipt->loadMissing('lines.customerItem');
        foreach ($receipt->lines as $line) {
            if (!$line->customerItem || $line->customerItem->customer_id !== $receipt->customer_id) {
                throw ValidationException::withMessages(['lines' => [__('goods_receipt.errors.customer_item_mismatch')]]);
            }
        }
    }

    // ── Phase 4: Delivery custody ─────────────────────────────

    /**
     * OUT_TO_CUSTOMER: decrease custody balance when delivery is posted.
     * Row-level lock on custody_balances. Negative balance → abort.
     */
    public function createOutToCustomer(DeliveryOrder $delivery, string $actorId): void
    {
        $delivery->loadMissing('lines.customerItem');
        foreach ($delivery->lines as $line) {
            $balanceQuery = CustodyBalance::query()
                ->where('customer_id', $delivery->customer_id)
                ->where('customer_item_id', $line->customer_item_id)
                ->where('stage', 'RAW');

            if (!empty($line->custody_location_id)) {
                $balanceQuery->where('custody_location_id', $line->custody_location_id);
            }

            $balance = $balanceQuery->lockForUpdate()->first();

            if (!$balance || (float) $balance->balance_quantity < (float) $line->quantity) {
                throw ValidationException::withMessages([
                    'balance_quantity' => [__('delivery_order.errors.insufficient_custody', [
                        'item' => $line->customerItem->name ?? $line->customer_item_id,
                        'available' => $balance ? $balance->balance_quantity : 0,
                        'requested' => $line->quantity,
                    ])],
                ]);
            }

            CustodyLedger::create([
                'customer_id' => $delivery->customer_id,
                'customer_item_id' => $line->customer_item_id,
                'reference_type' => 'DELIVERY_ORDER',
                'reference_id' => $delivery->id,
                'movement_type' => 'OUT_TO_CUSTOMER',
                'quantity_in' => 0,
                'quantity_out' => $line->quantity,
                'custody_location_id' => $line->custody_location_id,
                'stage' => 'OUT_TO_CUSTOMER',
                'movement_date' => $delivery->delivery_date,
                'created_by' => $actorId,
                'notes' => __('delivery_order.ledger_note', ['number' => $delivery->do_number]),
            ]);

            $balance->update([
                'balance_quantity' => (float) $balance->balance_quantity - (float) $line->quantity,
                'last_movement_at' => now(),
            ]);
        }
    }

    /**
     * RETURN_REJECTED: increase custody balance when acceptance rejects goods.
     * Separate from material inventory — stays in custody as customer-owned.
     */
    public function createReturnRejected(Acceptance $acceptance, string $actorId): void
    {
        $acceptance->loadMissing('lines.deliveryOrderLine.customerItem', 'deliveryOrder');
        $delivery = $acceptance->deliveryOrder;

        foreach ($acceptance->lines as $aLine) {
            if ((float) $aLine->quantity_rejected <= 0) {
                continue;
            }

            $doLine = $aLine->deliveryOrderLine;

            // Return to original location custody balance
            $balance = CustodyBalance::query()
                ->where('customer_id', $delivery->customer_id)
                ->where('customer_item_id', $doLine->customer_item_id)
                ->where('stage', 'RAW')
                ->lockForUpdate()
                ->first();

            CustodyLedger::create([
                'customer_id' => $delivery->customer_id,
                'customer_item_id' => $doLine->customer_item_id,
                'reference_type' => 'ACCEPTANCE',
                'reference_id' => $acceptance->id,
                'movement_type' => 'RETURN_REJECTED',
                'quantity_in' => $aLine->quantity_rejected,
                'quantity_out' => 0,
                'custody_location_id' => $balance?->custody_location_id,
                'stage' => 'RETURNED',
                'movement_date' => $acceptance->acceptance_date,
                'created_by' => $actorId,
                'notes' => __('acceptance.ledger_note_reject', ['number' => $acceptance->acceptance_number]),
            ]);

            if ($balance) {
                $balance->update([
                    'balance_quantity' => (float) $balance->balance_quantity + (float) $aLine->quantity_rejected,
                    'last_movement_at' => now(),
                ]);
            } else {
                CustodyBalance::create([
                    'customer_id' => $delivery->customer_id,
                    'customer_item_id' => $doLine->customer_item_id,
                    'custody_location_id' => null,
                    'stage' => 'RAW',
                    'balance_quantity' => $aLine->quantity_rejected,
                    'last_movement_at' => now(),
                ]);
            }
        }
    }
}
