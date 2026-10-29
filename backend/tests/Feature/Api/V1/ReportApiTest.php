<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_admin_can_access_all_report_endpoints()
    {
        $admin = User::factory()->create([
            'email' => 'admin.reports@sentanu.local',
            'role' => 'ADMIN',
        ]);

        $this->actingAs($admin)->getJson('/api/v1/reports/financial')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/reports/receivables')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/reports/operational')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/reports/custody')->assertOk();
    }

    /** @test */
    public function test_receivables_calculation_with_payments()
    {
        $admin = User::factory()->create([
            'email' => 'admin.receivables@sentanu.local',
            'role' => 'ADMIN',
        ]);

        $company = \App\Models\Company::create(['name' => 'PT Sentanu', 'code' => 'SJ']);
        $branch = \App\Models\Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ']);
        $customer = \App\Models\Customer::create(['company_id' => $company->id, 'name' => 'PT Pelanggan Test', 'code' => 'CUST-TEST', 'tax_condition' => 1]);
        $invoice = \App\Models\Invoice::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-TEST-01',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'subtotal' => 10000.00,
            'tax_amount' => 0,
            'total_amount' => 10000.00,
            'status' => 'POSTED',
        ]);
        $payment = \App\Models\Payment::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'payment_number' => 'PAY-TEST-01',
            'method' => 'BANK_TRANSFER',
            'payment_date' => now()->toDateString(),
            'amount' => 4000.00,
            'status' => 'POSTED',
        ]);
        \App\Models\PaymentAllocation::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'payment_id' => $payment->id,
            'invoice_id' => $invoice->id,
            'allocated_amount' => 4000.00,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/reports/receivables');
        $response->assertOk();
        $data = $response->json('data.receivables');

        $found = collect($data)->firstWhere('customer_id', $customer->id);
        $this->assertNotNull($found);
        $this->assertEquals(10000.00, $found['total_billed']);
        $this->assertEquals(4000.00, $found['total_paid']);
        $this->assertEquals(6000.00, $found['outstanding']);
    }
    /** @test */
    public function test_staff_is_forbidden_from_all_report_endpoints_and_owner_can_access_them()
    {
        $staff = User::factory()->create([
            'email' => 'staff.reports@sentanu.local',
            'role' => 'STAFF',
        ]);
        $owner = User::factory()->create([
            'email' => 'owner.reports@sentanu.local',
            'role' => 'OWNER',
        ]);

        foreach (['financial', 'receivables', 'operational', 'custody'] as $report) {
            $this->actingAs($staff)->getJson('/api/v1/reports/' . $report)->assertForbidden();
            $this->actingAs($owner)->getJson('/api/v1/reports/' . $report)->assertOk();
        }
    }

}
