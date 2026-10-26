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
        $readyToShip = DeliveryOrder::where('status', 'SUBMITTED')->count();
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

        $unpaidInvoicesCount = Invoice::whereIn('status', [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID])->count();

        // Outstanding & Top Customers by Outstanding
        $topCustomers = Customer::with('invoices')->get()->map(function ($customer) {
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
                ->sum('payment_allocations.allocated_amount');
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
            'financial_trend' => $this->financialTrend(),
            'recent_activity' => $this->recentActivity(),
            'custody' => [
                'total_items' => (int) $custodyItemsCount,
            ],
            'uninvoiced_sj_count' => DeliveryOrder::where('status', 'DELIVERED')
                ->whereDoesntHave('invoiceLinks')
                ->count(),
        ], 'Dashboard summary retrieved successfully');
    }

    /**
     * Monthly financial trend for the last 6 months from actual invoices/payments.
     */
    private function financialTrend(): array
    {
        $months = collect(range(5, 0))->map(fn ($i) => now()->subMonths($i));

        return $months->map(function ($month) {
            $start = $month->copy()->startOfMonth()->toDateString();
            $end = $month->copy()->endOfMonth()->toDateString();

            $revenue = (float) Invoice::whereBetween('invoice_date', [$start, $end])
                ->where('status', 'POSTED')
                ->sum('total_amount');

            $payments = (float) Payment::whereBetween('payment_date', [$start, $end])
                ->where('status', 'POSTED')
                ->sum('amount');

            return [
                'period' => $month->translatedFormat('M Y'),
                'revenue' => round($revenue, 2),
                'payments' => round($payments, 2),
                'net' => round($revenue - $payments, 2),
            ];
        })->values()->all();
    }

    /**
     * Recent transaction activity from actual database records.
     */
    private function recentActivity(): array
    {
        $activities = collect();

        // Recent invoices
        Invoice::with('customer')->latest('created_at')->take(3)->get()->each(function ($inv) use ($activities) {
            $activities->push([
                'type' => 'invoice',
                'description' => "Invoice {$inv->invoice_number} — " . ($inv->customer->name ?? 'Unknown'),
                'status' => $inv->status,
                'timestamp' => $inv->created_at->toISOString(),
            ]);
        });

        // Recent payments
        Payment::latest('created_at')->take(3)->get()->each(function ($pmt) use ($activities) {
            $activities->push([
                'type' => 'payment',
                'description' => "Pembayaran {$pmt->payment_number} — Rp " . number_format($pmt->amount, 0, ',', '.'),
                'status' => $pmt->status,
                'timestamp' => $pmt->created_at->toISOString(),
            ]);
        });

        // Recent delivery orders
        DeliveryOrder::with('customerPo.customer')->latest('created_at')->take(2)->get()->each(function ($do) use ($activities) {
            $customerName = $do->customerPo?->customer?->name ?? 'Unknown';
            $activities->push([
                'type' => 'delivery',
                'description' => "Surat Jalan {$do->sj_number} — {$customerName}",
                'status' => $do->status,
                'timestamp' => $do->created_at->toISOString(),
            ]);
        });

        return $activities->sortByDesc('timestamp')->take(5)->values()->all();
    }
}
