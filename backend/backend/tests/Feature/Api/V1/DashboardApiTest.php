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
                ],
                'message',
            ]);
    }
}
