<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PartiallyPaidReceivablesTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function partially_paid_invoices_remain_in_dashboard_and_receivables_totals(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $company = Company::create(['name' => 'PT Receivables Test', 'code' => 'RCV']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-RCV']);
        $customer = Customer::create([
            'company_id' => $company->id,
            'name' => 'Customer Partial',
            'code' => 'CUST-PARTIAL',
            'tax_condition' => 1,
        ]);

        $invoice = Invoice::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-PARTIAL-01',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'subtotal' => 10000,
            'total_amount' => 10000,
            'amount_paid' => 4000,
            'amount_due' => 6000,
            'status' => Invoice::STATUS_PARTIALLY_PAID,
        ]);

        $payment = Payment::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'payment_number' => 'PAY-PARTIAL-01',
            'method' => 'BANK_TRANSFER',
            'payment_date' => now()->toDateString(),
            'amount' => 4000,
            'status' => Payment::STATUS_POSTED,
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $invoice->id,
            'allocated_amount' => 4000,
        ]);

        $dashboard = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');
        $dashboard->assertOk()
            ->assertJsonPath('data.financial.total_outstanding', 6000)
            ->assertJsonPath('data.financial.unpaid_invoices_count', 1);

        $topCustomer = collect($dashboard->json('data.financial.top_outstanding_customers'))
            ->firstWhere('id', $customer->id);
        $this->assertNotNull($topCustomer);
        $this->assertEquals(6000, $topCustomer['outstanding']);

        $report = $this->actingAs($admin)->getJson('/api/v1/reports/receivables');
        $report->assertOk();

        $receivable = collect($report->json('data.receivables'))
            ->firstWhere('customer_id', $customer->id);
        $this->assertNotNull($receivable);
        $this->assertEquals(10000, $receivable['total_billed']);
        $this->assertEquals(4000, $receivable['total_paid']);
        $this->assertEquals(6000, $receivable['outstanding']);
        $this->assertCount(1, $receivable['unpaid_invoices']);
    }
}
