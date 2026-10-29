<?php

namespace App\Services;

use App\Models\Acceptance;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\InvoiceDeliveryLink;
use App\Models\InvoiceLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    public function __construct(
        private TaxEngine $taxEngine,
        private SecurityAuditLogger $auditLogger,
    ) {
    }

    public function buildDraftInvoice(
        array $deliveryOrderIds,
        string $customerId,
        string $invoiceDate,
        int $taxCondition,
        string $actorId
    ): Invoice {
        if (count($deliveryOrderIds) !== 1) {
            throw ValidationException::withMessages(['delivery_order_ids' => ['Aturan bisnis: Satu Surat Jalan hanya dapat menghasilkan satu invoice.']]);
        }
        return DB::transaction(function () use ($deliveryOrderIds, $customerId, $invoiceDate, $taxCondition, $actorId) {
            $dOrders = DeliveryOrder::query()
                ->whereIn('id', $deliveryOrderIds)
                ->where('customer_id', $customerId)
                ->with(['lines.acceptanceLines.acceptance', 'lines.customerItem'])
                ->lockForUpdate()
                ->get();

            if ($dOrders->count() !== count($deliveryOrderIds)) {
                throw ValidationException::withMessages(['delivery_order_ids' => ['Satu atau lebih Surat Jalan tidak valid atau bukan milik customer ini.']]);
            }

            $subtotal = 0;
            $lineData = [];
            $deliveryAmounts = [];

            foreach ($dOrders as $sj) {
                $deliveryAmounts[$sj->id] = 0;

                foreach ($sj->lines as $sjLine) {
                    $qtyOk = (float) $sjLine->acceptanceLines
                        ->filter(fn ($line) => $line->acceptance?->status === Acceptance::STATUS_POSTED)
                        ->sum('quantity_ok');
                    $qtyAlreadyInvoiced = (float) $sjLine->qty_invoiced;
                    $qtyInvoiceable = max(0, $qtyOk - $qtyAlreadyInvoiced);

                    if ($qtyInvoiceable <= 0) {
                        continue;
                    }

                    $unitPrice = (float) $sjLine->unit_price_snapshot;
                    $lineSubtotal = round($qtyInvoiceable * $unitPrice, 2);
                    $subtotal += $lineSubtotal;
                    $deliveryAmounts[$sj->id] += $lineSubtotal;

                    $lineData[] = [
                        'delivery_order_line_id' => $sjLine->id,
                        'description' => $sjLine->customerItem->name ?? '-',
                        'quantity' => $qtyInvoiceable,
                        'unit_price_snapshot' => $unitPrice,
                        'subtotal' => $lineSubtotal,
                    ];
                }
            }

            if ($subtotal <= 0) {
                throw ValidationException::withMessages(['delivery_order_ids' => ['Total yang dapat ditagih adalah 0. Pastikan Surat Jalan sudah memiliki Customer Acceptance OK yang sudah POSTED dan belum ditagih.']]);
            }

            $taxResult = $this->taxEngine->calculate(round($subtotal, 2), $taxCondition);
            $invoice = Invoice::create([
                'company_id' => $dOrders->first()->company_id,
                'branch_id' => $dOrders->first()->branch_id,
                'invoice_number' => $this->nextDraftInvoiceNumber(),
                'customer_id' => $customerId,
                'invoice_date' => $invoiceDate,
                'due_date' => now()->addDays(30)->toDateString(),
                'subtotal' => $taxResult['dpp'],
                'dpp' => $taxResult['dpp'],
                'ppn_amount' => $taxResult['ppn_amount'],
                'pph_amount' => $taxResult['pph_amount'],
                'total_amount' => $taxResult['total_net_invoice'],
                'amount_paid' => 0,
                'amount_due' => $taxResult['total_net_invoice'],
                'status' => Invoice::STATUS_DRAFT,
            ]);

            foreach ($lineData as $line) {
                InvoiceLine::create(array_merge(['invoice_id' => $invoice->id], $line));
                \App\Models\DeliveryOrderLine::where('id', $line['delivery_order_line_id'])
                    ->increment('qty_invoiced', $line['quantity']);
            }

            foreach ($deliveryAmounts as $deliveryOrderId => $amountBilled) {
                if ($amountBilled <= 0) {
                    continue;
                }

                InvoiceDeliveryLink::create([
                    'invoice_id' => $invoice->id,
                    'delivery_order_id' => $deliveryOrderId,
                    'amount_billed' => round($amountBilled, 2),
                ]);
            }

            DeliveryOrder::whereIn('id', $dOrders->pluck('id'))->update(['invoice_status' => 'INVOICED']);

            $this->auditLogger->log($actorId, 'CREATE_INVOICE_DRAFT', 'INVOICE', $invoice->id, null, [
                'customer_id' => $customerId,
                'sj_count' => $dOrders->count(),
                'total_amount' => $taxResult['total_net_invoice'],
                'tax_condition' => $taxCondition,
            ]);

            return $invoice->fresh(['deliveryLinks', 'lines']);
        });
    }

    public function postInvoice(Invoice $invoice, string $actorId): void
    {
        DB::transaction(function () use ($invoice, $actorId) {
            $locked = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($locked->status !== Invoice::STATUS_DRAFT) {
                throw ValidationException::withMessages(['status' => ['Hanya Invoice berstatus DRAFT yang dapat diposting.']]);
            }

            $locked->update([
                'status' => Invoice::STATUS_POSTED,
                'invoice_number' => $this->nextPostedInvoiceNumber(),
                'posted_by' => $actorId,
                'posted_at' => now(),
            ]);

            $this->auditLogger->log($actorId, 'POST_INVOICE', 'INVOICE', $locked->id,
                ['status' => Invoice::STATUS_DRAFT],
                ['status' => Invoice::STATUS_POSTED, 'invoice_number' => $locked->invoice_number]
            );
        });
    }

    public function cancelDraftInvoice(Invoice $invoice, string $actorId): Invoice
    {
        return DB::transaction(function () use ($invoice, $actorId) {
            $locked = Invoice::query()->with(['lines', 'deliveryLinks'])->lockForUpdate()->findOrFail($invoice->id);

            if ($locked->status !== Invoice::STATUS_DRAFT) {
                throw ValidationException::withMessages(['status' => ['Hanya Invoice DRAFT yang dapat dibatalkan.']]);
            }

            foreach ($locked->lines as $line) {
                \App\Models\DeliveryOrderLine::where('id', $line->delivery_order_line_id)
                    ->decrement('qty_invoiced', $line->quantity);
            }

            foreach ($locked->deliveryLinks as $link) {
                $doId = $link->delivery_order_id;
                // Refresh DO from DB after lines qty_invoiced are decremented
                $do = DeliveryOrder::with('lines')->find($doId);
                if ($do) {
                    $hasOtherInvoices = InvoiceDeliveryLink::where('delivery_order_id', $doId)
                        ->where('invoice_id', '!=', $locked->id)
                        ->whereHas('invoice', fn($q) => $q->where('status', '!=', Invoice::STATUS_CANCELLED))
                        ->exists();
                    $hasInvoiceableRemaining = $do->lines->contains(fn($l) => (float)$l->qty_invoiced > 0);

                    $status = ($hasOtherInvoices || $hasInvoiceableRemaining) ? 'INVOICED' : 'UNINVOICED';
                    $do->update(['invoice_status' => $status]);
                }
            }

            $locked->update(['status' => Invoice::STATUS_CANCELLED]);
            $this->auditLogger->log($actorId, 'CANCEL_INVOICE', 'INVOICE', $locked->id,
                ['status' => Invoice::STATUS_DRAFT],
                ['status' => Invoice::STATUS_CANCELLED]
            );

            return $locked->fresh(['deliveryLinks', 'lines']);
        });
    }

    private function nextDraftInvoiceNumber(): string
    {
        return 'INV-' . now()->format('Ymd') . '-DRAFT-' . strtoupper(substr((string) str()->uuid(), 0, 8));
    }

    private function nextPostedInvoiceNumber(): string
    {
        $prefix = 'INV-' . now()->format('Ymd') . '-';
        $last = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderBy('invoice_number', 'desc')
            ->lockForUpdate()
            ->value('invoice_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
