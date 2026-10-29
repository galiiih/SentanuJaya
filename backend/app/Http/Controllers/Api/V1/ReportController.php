<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Customer;
use App\Models\CustomerPo;
use App\Models\CustodyBalance;
use App\Models\GoodsReceipt;
use App\Models\DeliveryOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseApiController
{
    public function financial(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('report.view'), 403, 'Forbidden');

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $invoices = Invoice::whereBetween('invoice_date', [$startDate, $endDate])
            ->where('status', 'POSTED')
            ->get();

        $payments = Payment::whereBetween('payment_date', [$startDate, $endDate])
            ->where('status', 'POSTED')
            ->get();

        return $this->sendResponse([
            'period_start' => $startDate,
            'period_end' => $endDate,
            'total_invoices' => $invoices->count(),
            'total_invoice_amount' => (float) $invoices->sum('total_amount'),
            'total_payments' => $payments->count(),
            'total_payment_amount' => (float) $payments->sum('amount'),
            'invoices' => $invoices,
            'payments' => $payments,
        ], 'Financial report retrieved successfully');
    }

    public function receivables(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('report.view'), 403, 'Forbidden');

        $customers = Customer::with('invoices')->get()->map(function ($customer) {
            $invoices = $customer->invoices()->where('status', 'POSTED')->get();
            $totalBilled = $invoices->sum('total_amount');
            $invoiceIds = $invoices->pluck('id');
            $totalPaid = DB::table('payment_allocations')
                ->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
                ->whereIn('payment_allocations.invoice_id', $invoiceIds)
                ->where('payments.status', 'POSTED')
                ->sum('payment_allocations.allocated_amount');
            $outstanding = max(0, round($totalBilled - $totalPaid, 2));

            return [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'customer_code' => $customer->code,
                'total_billed' => (float) $totalBilled,
                'total_paid' => (float) $totalPaid,
                'outstanding' => (float) $outstanding,
                'unpaid_invoices' => $invoices->filter(fn($inv) => $inv->amount_due > 0)->values(),
            ];
        })->filter(fn($c) => $c['outstanding'] > 0)->values();

        return $this->sendResponse([
            'receivables' => $customers,
        ], 'Receivables report retrieved successfully');
    }

    public function operational(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('report.view'), 403, 'Forbidden');

        $activePos = CustomerPo::with('customer', 'lines')->where('status', 'ACTIVE')->get();
        $goodsReceipts = GoodsReceipt::with('supplier')->latest()->take(50)->get();
        $deliveryOrders = DeliveryOrder::with('customer')->latest()->take(50)->get();

        return $this->sendResponse([
            'active_customer_pos' => $activePos,
            'recent_goods_receipts' => $goodsReceipts,
            'recent_delivery_orders' => $deliveryOrders,
        ], 'Operational report retrieved successfully');
    }

    public function custody(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('report.view'), 403, 'Forbidden');

        $balances = CustodyBalance::with('customer', 'customerItem')->get();

        return $this->sendResponse([
            'custody_balances' => $balances,
        ], 'Custody report retrieved successfully');
    }
}
