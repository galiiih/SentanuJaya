<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends BaseApiController
{
    public function __construct(private InvoiceService $invoiceService)
    {
    }

    public function eligibleDeliveryOrders(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.create'), 403, __('invoice.errors.forbidden'));

        $request->validate(['customer_id' => 'required|uuid|exists:customers,id']);

        $customerId = $request->string('customer_id');

        // Fetch DELIVERED DOs for this customer, compute remaining invoiceable qty per line
        $dos = \App\Models\DeliveryOrder::query()
            ->where('customer_id', $customerId)
            ->where('status', 'DELIVERED')
            ->with(['lines.acceptanceLines.acceptance', 'lines.customerItem', 'customer'])
            ->get()
            ->filter(function ($do) {
                // Keep DO if any line has remaining invoiceable qty
                return $do->lines->contains(function ($line) {
                    $qtyOk = (float) $line->acceptanceLines
                        ->filter(fn ($al) => $al->acceptance?->status === \App\Models\Acceptance::STATUS_POSTED)
                        ->sum('quantity_ok');
                    $qtyInvoiced = (float) $line->qty_invoiced;
                    return ($qtyOk - $qtyInvoiced) > 0;
                });
            })
            ->values();

        return $this->sendResponse($dos, 'Eligible delivery orders retrieved.');
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.view'), 403, __('invoice.errors.forbidden'));

        $items = Invoice::query()
            ->with(['customer', 'deliveryLinks.deliveryOrder'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->string('customer_id')))
            ->when($request->filled('search'), fn ($q) => $q->where('invoice_number', 'like', '%' . $request->string('search') . '%'))
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($items, __('invoice.messages.listed'));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.create'), 403, __('invoice.errors.forbidden'));

        $data = $request->validate([
            'delivery_order_ids' => 'required|array|min:1',
            'delivery_order_ids.*' => 'uuid|exists:delivery_orders,id',
            'customer_id' => 'required|uuid|exists:customers,id',
            'invoice_date' => 'required|date',
            'tax_condition' => 'required|integer|in:1,2,3',
        ]);

        $invoice = $this->invoiceService->buildDraftInvoice(
            $data['delivery_order_ids'],
            $data['customer_id'],
            $data['invoice_date'],
            $data['tax_condition'],
            $request->user()->id
        );

        return $this->sendResponse($invoice, __('invoice.messages.created'), 201);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.view'), 403, __('invoice.errors.forbidden'));

        return $this->sendResponse(
            $invoice->load(['deliveryLinks.deliveryOrder', 'lines.deliveryOrderLine.customerItem', 'allocations.payment']),
            __('invoice.messages.retrieved')
        );
    }

    public function post(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.create'), 403, __('invoice.errors.forbidden'));

        $this->invoiceService->postInvoice($invoice, $request->user()->id);

        return $this->sendResponse(
            $invoice->fresh(['deliveryLinks', 'lines', 'allocations.payment']),
            __('invoice.messages.posted')
        );
    }

    public function cancel(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.create'), 403, __('invoice.errors.forbidden'));

        return $this->sendResponse(
            $this->invoiceService->cancelDraftInvoice($invoice, $request->user()->id),
            __('invoice.messages.cancelled')
        );
    }
}
