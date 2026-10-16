<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CustomerPo;
use App\Models\CustodyBalance;
use App\Models\GoodsReceipt;
use App\Models\DeliveryOrder;
use App\Models\Acceptance;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseApiController
{
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        // 1. Operational Summary
        $activePos = CustomerPo::where('status', 'ACTIVE')->count();
        
        // Production jobs status (mock/placeholder or via customer_items / delivery_orders lifecycle)
        // Using acceptance or delivery order statuses as operational proxy
        $readyToShip = DeliveryOrder::where('status', 'DELIVERED')->count();
        $pendingAcceptance = DeliveryOrder::where('status', 'DELIVERED')->whereDoesntHave('acceptances')->count();
        $pendingQc = GoodsReceipt::where('status', 'SUBMITTED')->count();
        $custodyItemsCount = CustodyBalance::sum('balance_quantity');

        // 2. Financial Summary
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $totalInvoicePeriod = Invoice::whereBetween('invoice_date', [$startDate, $endDate])
            ->where('status', 'POSTED')
            ->sum('total_amount');

        $totalPaymentPosted = Payment::whereBetween('payment_date', [$startDate, $endDate])
            ->where('status', 'POSTED')
            ->sum('amount');

        $unpaidInvoicesCount = Invoice::where('status', 'POSTED')->count();

        // Outstanding & Top Customers by Outstanding
        $topCustomers = Customer::with('invoices')->get()->map(function ($customer) {
            $invoices = $customer->invoices()->where('status', 'POSTED')->get();
            $totalBilled = $invoices->sum('total_amount');
            $invoiceIds = $invoices->pluck('id');
            $totalPaid = DB::table('payment_allocations')
                ->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
                ->whereIn('payment_allocations.invoice_id', $invoiceIds)
                ->where('payments.status', 'POSTED')
                ->sum('payment_allocations.amount');
            $outstanding = max(0, round($totalBilled - $totalPaid, 2));

            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'code' => $customer->code,
                'outstanding' => $outstanding,
            ];
        })->sortByDesc('outstanding')->take(5)->values();

        $totalOutstanding = Customer::get()->sum(function ($customer) {
            $invoices = $customer->invoices()->where('status', 'POSTED')->get();
            $totalBilled = $invoices->sum('total_amount');
            $invoiceIds = $invoices->pluck('id');
            $totalPaid = DB::table('payment_allocations')
                ->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
                ->whereIn('payment_allocations.invoice_id', $invoiceIds)
                ->where('payments.status', 'POSTED')
                ->sum('payment_allocations.amount');
            return max(0, round($totalBilled - $totalPaid, 2));
        });

        return $this->sendResponse([
            'operational' => [
                'active_customer_pos' => $activePos,
                'ready_to_ship' => $readyToShip,
                'pending_acceptance' => $pendingAcceptance,
                'pending_qc' => $pendingQc,
                'custody_items_total_qty' => (float) $custodyItemsCount,
            ],
            'financial' => [
                'period_start' => $startDate,
                'period_end' => $endDate,
                'total_invoice_period' => (float) $totalInvoicePeriod,
                'total_payment_posted' => (float) $totalPaymentPosted,
                'total_outstanding' => (float) $totalOutstanding,
                'unpaid_invoices_count' => $unpaidInvoicesCount,
                'top_outstanding_customers' => $topCustomers,
            ],
        ], 'Dashboard summary retrieved successfully');
    }
}
