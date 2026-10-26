<?php

namespace Tests\Feature\Api\V1;

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
    public function test_financial_trend_has_zero_values_without_data()
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');
        $response->assertOk();

        $trend = $response->json('data.financial_trend');
        foreach ($trend as $month) {
            $this->assertEquals(0, $month['revenue']);
            $this->assertEquals(0, $month['payments']);
            $this->assertEquals(0, $month['net']);
        }
    }
}
