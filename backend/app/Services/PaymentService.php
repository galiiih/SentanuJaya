<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    /**
     * Calculate total posted paid amount for an invoice
     */
    public function calculatePaid(string $invoiceId): float
    {
        return (float) PaymentAllocation::where('invoice_id', $invoiceId)
            ->whereHas('payment', fn ($q) => $q->where('status', Payment::STATUS_POSTED))
            ->sum('allocated_amount');
    }

    /**
     * Bulk calculate posted paid amounts for given invoice IDs
     *
     * @param array<string> $invoiceIds
     * @return array<string, float> [invoice_id => paid_amount]
     */
    public function calculatePaidBulk(array $invoiceIds): array
    {
        if (empty($invoiceIds)) {
            return [];
        }

        $rows = PaymentAllocation::whereIn('invoice_id', $invoiceIds)
            ->whereHas('payment', fn ($q) => $q->where('status', Payment::STATUS_POSTED))
            ->groupBy('invoice_id')
            ->selectRaw('invoice_id, SUM(allocated_amount) as total_allocated')
            ->pluck('total_allocated', 'invoice_id')
            ->all();

        $result = [];
        foreach ($invoiceIds as $id) {
            $result[$id] = round((float) ($rows[$id] ?? 0), 2);
        }

        return $result;
    }

    /**
     * Calculate outstanding amount for an invoice based on posted payment allocations
     */
    public function calculateOutstanding(string $invoiceId): float
    {
        $invoice = Invoice::query()->findOrFail($invoiceId);
        $alreadyPaid = $this->calculatePaid($invoice->id);

        return max(0, round((float) $invoice->total_amount - $alreadyPaid, 2));
    }

    public function create(array $data, string $actorId): Payment
    {
        return DB::transaction(function () use ($data, $actorId) {
            $idempotencyKey = $data['idempotency_key'] ?? null;
            $requestPayloadSignature = [
                'customer_id' => $data['customer_id'] ?? null,
                'payment_date' => $data['payment_date'] ?? null,
                'method' => $data['method'] ?? null,
                'amount' => $data['amount'] ?? null,
                'allocations' => $data['allocations'] ?? [],
            ];
            $requestHash = hash('sha256', json_encode($requestPayloadSignature));

            if ($idempotencyKey) {
                $existing = Payment::query()->where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
                if ($existing) {
                    if ($existing->request_hash === $requestHash) {
                        return $existing->fresh(['customer', 'allocations.invoice']);
                    }
                    throw ValidationException::withMessages(['idempotency_key' => ['The idempotency key is already used with a different request payload.']]);
                }
            }

            $customer = \App\Models\Customer::query()->findOrFail($data['customer_id']);

            $amount = round((float) $data['amount'], 2);
            if ($amount <= 0) {
                throw ValidationException::withMessages(['amount' => ['Payment amount must be greater than zero.']]);
            }

            if (!isset($data['allocations']) || !is_array($data['allocations']) || count($data['allocations']) === 0) {
                throw ValidationException::withMessages(['allocations' => ['At least one invoice allocation is required.']]);
            }

            $totalAllocated = round(array_reduce($data['allocations'], function ($carry, $alloc) {
                return $carry + ((float) ($alloc['amount'] ?? 0));
            }, 0), 2);

            if (abs($amount - $totalAllocated) > 0.009) {
                throw ValidationException::withMessages(['amount' => ['Payment amount must equal the sum of allocated amounts.']]);
            }

            if (!empty($data['reference_no'])) {
                $duplicate = Payment::query()
                    ->where('customer_id', $data['customer_id'])
                    ->where('reference_no', $data['reference_no'])
                    ->where('amount', $amount)
                    ->where('status', Payment::STATUS_POSTED)
                    ->exists();

                if ($duplicate) {
                    throw ValidationException::withMessages(['reference_no' => ['Payment with this reference and amount already exists.']]);
                }
            }

            $payment = Payment::create([
                'company_id' => $customer->company_id,
                'customer_id' => $data['customer_id'],
                'payment_number' => $this->nextPaymentNumber(),
                'payment_date' => $data['payment_date'],
                'method' => $data['method'],
                'amount' => $amount,
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => Payment::STATUS_POSTED,
                'created_by' => $actorId,
                'idempotency_key' => $idempotencyKey ?? null,
                'request_hash' => $idempotencyKey ? $requestHash : null,
            ]);

            foreach ($data['allocations'] as $alloc) {
                $invoice = Invoice::query()->lockForUpdate()->findOrFail($alloc['invoice_id']);

                if ($invoice->customer_id !== $data['customer_id']) {
                    throw ValidationException::withMessages(['allocations' => ['Invoice does not belong to the specified customer.']]);
                }

                if (!in_array($invoice->status, [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID], true)) {
                    throw ValidationException::withMessages(['allocations' => ['Only posted invoices can receive payment.']]);
                }

                $allocAmount = round((float) $alloc['amount'], 2);
                if ($allocAmount <= 0) {
                    throw ValidationException::withMessages(['allocations' => ['Allocated amount must be greater than zero.']]);
                }

                // Calculate outstanding using the helper (consistent with controller)
                $outstanding = $this->calculateOutstanding($invoice->id);
                if ($outstanding <= 0) {
                    throw ValidationException::withMessages(['allocations' => ['Invoice ' . $invoice->invoice_number . ' is already fully paid.']]);
                }
                if ($allocAmount > $outstanding) {
                    throw ValidationException::withMessages(['allocations' => ['Allocated amount (' . $allocAmount . ') exceeds outstanding (' . $outstanding . ') for invoice ' . $invoice->invoice_number]]);
                }

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => $allocAmount,
                ]);

                // Update invoice denormalized fields for performance (keep in sync)
                $invoice->amount_paid = round((float) $invoice->amount_paid + $allocAmount, 2);
                $invoice->amount_due = max(0, round((float) $invoice->total_amount - (float) $invoice->amount_paid, 2));
                $invoice->status = $invoice->amount_due <= 0 ? Invoice::STATUS_PAID : Invoice::STATUS_PARTIALLY_PAID;
                $invoice->save();
            }

            return $payment->fresh(['customer', 'allocations.invoice']);
        });
    }

    private function nextPaymentNumber(): string
    {
        $prefix = 'PAY-' . now()->format('Ym') . '-';
        $last = Payment::where('payment_number', 'like', $prefix . '%')
            ->orderBy('payment_number', 'desc')
            ->lockForUpdate()
            ->value('payment_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
