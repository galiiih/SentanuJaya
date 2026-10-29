<?php

namespace Tests\Feature\Api\V1;

use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
    public function test_staff_dashboard_does_not_expose_financial_totals_trends_or_transactions()
    {
        $staff = User::factory()->create([
            'email' => 'staff.dashboard@sentanu.local',
            'role' => 'STAFF',
        ]);

        $financialQueries = [];
        DB::listen(function (QueryExecuted $query) use (&$financialQueries) {
            if (preg_match('/\\b(invoices|payments|payment_allocations)\\b/i', $query->sql)) {
                $financialQueries[] = $query->sql;
            }
        });

        $response = $this->actingAs($staff)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonStructure(['data' => ['operational', 'custody', 'recent_activity']])
            ->assertJsonMissingPath('data.financial')
            ->assertJsonMissingPath('data.financial_trend');

        $this->assertSame([], $financialQueries, 'STAFF dashboard must not execute financial database queries.');

        foreach ($response->json('data.recent_activity') as $activity) {
            $this->assertNotContains($activity['type'], ['invoice', 'payment']);
        }
    }

    /** @test */
    public function test_dashboard_counts_only_remaining_posted_acceptance_ok_quantity_as_invoiceable()
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $company = \App\Models\Company::create(['name' => 'PT Sentanu Invoiceable', 'code' => 'SJ-INV']);
        $branch = \App\Models\Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-INV']);
        $customer = \App\Models\Customer::create([
            'company_id' => $company->id,
            'name' => 'Customer Invoiceable',
            'code' => 'CUST-INV',
            'tax_condition' => 1,
        ]);
        $item = \App\Models\CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'ITEM-INV',
            'name' => 'Body Kit',
        ]);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-INV-01',
            'delivery_date' => now()->toDateString(),
            'status' => 'DELIVERED',
        ]);
        $line = \App\Models\DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $item->id,
            'quantity' => 5,
            'unit_price_snapshot' => 100,
            'qty_invoiced' => 2,
        ]);
        $acceptance = \App\Models\Acceptance::create([
            'delivery_order_id' => $do->id,
            'acceptance_number' => 'ACC-INV-01',
            'acceptance_date' => now()->toDateString(),
            'status' => \App\Models\Acceptance::STATUS_POSTED,
        ]);
        \App\Models\AcceptanceLine::create([
            'acceptance_id' => $acceptance->id,
            'delivery_order_line_id' => $line->id,
            'quantity_ok' => 5,
            'quantity_rejected' => 0,
        ]);

        // A linked invoice may cover only part of the accepted quantity; the remaining quantity
        // must still keep this SJ visible as invoiceable, matching InvoiceController eligibility.
        $invoice = \App\Models\Invoice::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-INV-01',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'subtotal' => 200,
            'total_amount' => 200,
            'status' => 'POSTED',
        ]);
        \App\Models\InvoiceDeliveryLink::create([
            'invoice_id' => $invoice->id,
            'delivery_order_id' => $do->id,
            'amount_billed' => 200,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');
        $response->assertOk()->assertJsonPath('data.uninvoiced_sj_count', 1);

        // Once all accepted OK quantity is invoiced, this SJ is no longer invoiceable.
        $line->update(['qty_invoiced' => 5]);
        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');
        $response->assertOk()->assertJsonPath('data.uninvoiced_sj_count', 0);
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

        // Delivered DO with invoice linked (uninvoiced_sj_count should exclude this)
        $doDeliveredWithInvoice = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-DELIVERED-03',
            'delivery_date' => now()->toDateString(),
            'status' => 'DELIVERED',
        ]);

        \App\Models\Acceptance::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'delivery_order_id' => $doDeliveredWithInvoice->id,
            'acceptance_number' => 'ACC-03',
            'acceptance_date' => now()->toDateString(),
            'status' => 'POSTED',
        ]);

        $invoice = \App\Models\Invoice::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-DASH-01',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'total_amount' => 500.00,
            'subtotal' => 500.00,
            'status' => 'POSTED',
        ]);

        \App\Models\InvoiceDeliveryLink::create([
            'invoice_id' => $invoice->id,
            'delivery_order_id' => $doDeliveredWithInvoice->id,
            'amount_billed' => 500.00,
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

        $json = $response->json('data');
        $op = $json['operational'];

        // Exact assertions
        $this->assertEquals(1, $op['active_customer_pos']);
        $this->assertEquals(1, $op['ready_to_ship']); // Only $doReady (SUBMITTED)
        $this->assertEquals(1, $op['pending_acceptance']); // Only $doDeliveredWithoutAcceptance ($doDeliveredWithAcceptance has acceptance)
        $this->assertEquals(1, $op['pending_qc']);

        // Neither delivered DO has an invoiceable line: one has no POSTED acceptance,
        // and the other has a POSTED acceptance header but no accepted line quantities.
        // The invoiced DO, submitted DO, and draft DO must also be excluded.
        $this->assertEquals(0, $json['uninvoiced_sj_count']);
    }
}
