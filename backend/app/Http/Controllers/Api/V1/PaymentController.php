<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends BaseApiController
{
    public function __construct(private PaymentService $paymentService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.view'), 403, __('payment.errors.forbidden'));

        $items = Payment::query()
            ->with(['customer', 'allocations.invoice'])
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->string('customer_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('payment_date')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($items, __('payment.messages.listed'));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.create'), 403, __('payment.errors.forbidden'));

        $data = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'payment_date' => 'required|date',
            'method' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'reference_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'idempotency_key' => 'nullable|string|max:255',
            'allocations' => 'required|array|min:1',
            'allocations.*.invoice_id' => 'required|uuid|exists:invoices,id',
            'allocations.*.amount' => 'required|numeric|min:0.01',
        ]);

        if (empty($data['idempotency_key'])) {
            if ($request->hasHeader('Idempotency-Key')) {
                $data['idempotency_key'] = $request->header('Idempotency-Key');
            } elseif ($request->hasHeader('idempotency-key')) {
                $data['idempotency_key'] = $request->header('idempotency-key');
            }
        }

        return $this->sendResponse(
            $this->paymentService->create($data, $request->user()->id),
            __('payment.messages.created'),
            201
        );
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.view'), 403, __('payment.errors.forbidden'));

        return $this->sendResponse(
            $payment->load(['customer', 'allocations.invoice']),
            __('payment.messages.retrieved')
        );
    }

    public function customerOutstanding(Request $request, \App\Models\Customer $customer): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('invoice.view'), 403, __('payment.errors.forbidden'));

        $invoices = Invoice::where('customer_id', $customer->id)
            ->whereNotIn('status', [Invoice::STATUS_CANCELLED, Invoice::STATUS_DRAFT])
            ->get();

        $invoiceIds = $invoices->pluck('id')->all();
        $paidMap = $this->paymentService->calculatePaidBulk($invoiceIds);

        $totalBilled = 0.0;
        $totalPaid = 0.0;
        $totalOutstanding = 0.0;

        $invoiceList = $invoices->map(function ($inv) use ($paidMap, &$totalBilled, &$totalPaid, &$totalOutstanding) {
            $total = round((float) $inv->total_amount, 2);
            $paid = round((float) ($paidMap[$inv->id] ?? 0), 2);
            $due = max(0.0, round($total - $paid, 2));

            $totalBilled += $total;
            $totalPaid += $paid;
            $totalOutstanding += $due;

            return [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'invoice_date' => $inv->invoice_date,
                'total_amount' => $total,
                'amount_paid' => $paid,
                'amount_due' => $due,
                'status' => $inv->status,
            ];
        });

        return $this->sendResponse([
            'customer' => $customer->only(['id', 'name', 'code']),
            'total_billed' => round($totalBilled, 2),
            'total_paid' => round($totalPaid, 2),
            'total_outstanding' => round($totalOutstanding, 2),
            'invoices' => $invoiceList,
        ], __('payment.messages.outstanding_retrieved'));
    }
}
