<?php

namespace Tests\Feature\Api\V1;

use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_admin_can_access_dashboard_summary()
    {
        $admin = User::factory()->create([
            'email' => 'admin.dash@sentanu.local',
            'role' => 'ADMIN',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'operational' => [
                        'active_customer_pos',
                        'ready_to_ship',
                        'pending_acceptance',
                        'pending_qc',
                        'custody_items_total_qty',
                    ],
                    'financial' => [
                        'period_start',
                        'period_end',
                        'total_invoice_period',
                        'total_payment_posted',
                        'total_outstanding',
                        'unpaid_invoices_count',
                        'top_outstanding_customers',
                    ],
                    'financial_trend',
                    'recent_activity',
                    'custody' => ['total_items'],
                    'uninvoiced_sj_count',
                ],
                'message',
            ]);

        $data = $response->json('data');

        // financial_trend: 6 months of data
        $this->assertCount(6, $data['financial_trend']);
        foreach ($data['financial_trend'] as $month) {
            $this->assertArrayHasKey('period', $month);
            $this->assertArrayHasKey('revenue', $month);
            $this->assertArrayHasKey('payments', $month);
            $this->assertArrayHasKey('net', $month);
        }

        // recent_activity: array (empty when no transactions)
        $this->assertIsArray($data['recent_activity']);

        // uninvoiced_sj_count: non-negative integer
        $this->assertIsInt($data['uninvoiced_sj_count']);
        $this->assertGreaterThanOrEqual(0, $data['uninvoiced_sj_count']);

        // custody.total_items: non-negative integer
        $this->assertIsInt($data['custody']['total_items']);
    }

    /** @test */
    public function test_unauthenticated_cannot_access_dashboard()
    {
        $response = $this->getJson('/api/v1/dashboard/summary');
        $response->assertUnauthorized();
    }

    /** @test */
    public function test_dashboard_summary_with_diverse_data()
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $company = \App\Models\Company::create(['name' => 'PT Sentanu', 'code' => 'SJ']);
        $branch = \App\Models\Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ']);
        $customer = \App\Models\Customer::create(['company_id' => $company->id, 'name' => 'Cust A', 'code' => 'CUSTA', 'tax_condition' => 1]);

        // Active PO
        \App\Models\CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => 'PO-DASH-01',
            'po_date' => now()->toDateString(),
            'status' => 'ACTIVE',
        ]);

        // Pending QC Goods Receipt (status SUBMITTED)
        \App\Models\GoodsReceipt::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'stb_number' => 'STB-DASH-01',
            'received_date' => now()->toDateString(),
            'status' => 'SUBMITTED',
        ]);

        // Submitted DO (Ready to ship / awaiting dispatch)
        $doReady = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-READY-01',
            'delivery_date' => now()->toDateString(),
            'status' => 'SUBMITTED',
        ]);

        // Delivered DO without acceptance (pending acceptance)
        $doDeliveredWithoutAcceptance = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-DELIVERED-01',
            'delivery_date' => now()->toDateString(),
            'status' => 'DELIVERED',
        ]);

        // Delivered DO with acceptance (not pending acceptance)
        $doDeliveredWithAcceptance = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-DELIVERED-02',
            'delivery_date' => now()->toDateString(),
            'status' => 'DELIVERED',
        ]);

        \App\Models\Acceptance::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'delivery_order_id' => $doDeliveredWithAcceptance->id,
            'acceptance_number' => 'ACC-01',
            'acceptance_date' => now()->toDateString(),
            'status' => 'POSTED',
        ]);

        // DO not delivered (e.g. DRAFT)
        $doDraft = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-DRAFT-01',
            'delivery_date' => now()->toDateString(),
            'status' => 'DRAFT',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');
        $response->assertOk();

        $data = $response->json('data.operational');
        
        // Exact assertions
        $this->assertEquals(1, $data['active_customer_pos']);
        $this->assertEquals(1, $data['ready_to_ship']); // Only $doReady (SUBMITTED)
        $this->assertEquals(1, $data['pending_acceptance']); // Only $doDeliveredWithoutAcceptance
        $this->assertEquals(1, $data['pending_qc']);
    }
}
