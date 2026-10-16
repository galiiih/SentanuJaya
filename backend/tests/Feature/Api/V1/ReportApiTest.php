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
}
