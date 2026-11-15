<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_create_or_promote_an_owner(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $target = User::factory()->create(['role' => 'STAFF']);

        $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'New Owner',
            'email' => 'new.owner@sentanu.local',
            'password' => 'secret123',
            'role' => 'OWNER',
        ])->assertForbidden();

        $this->actingAs($admin)->putJson('/api/v1/users/' . $target->id, [
            'role' => 'OWNER',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new.owner@sentanu.local']);
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'STAFF']);
    }

    public function test_admin_cannot_modify_or_deactivate_an_owner(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $owner = User::factory()->create(['role' => 'OWNER']);

        $this->actingAs($admin)->putJson('/api/v1/users/' . $owner->id, [
            'name' => 'Changed Owner',
        ])->assertForbidden();

        $this->actingAs($admin)->deleteJson('/api/v1/users/' . $owner->id)->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $owner->id,
            'role' => 'OWNER',
            'is_active' => true,
        ]);
    }

    public function test_user_delete_endpoint_deactivates_and_preserves_account(): void
    {
        $owner = User::factory()->create(['role' => 'OWNER']);
        $staff = User::factory()->create(['role' => 'STAFF', 'is_active' => true]);

        $this->actingAs($owner)->deleteJson('/api/v1/users/' . $staff->id)
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'is_active' => false,
        ]);
    }

    public function test_last_active_owner_cannot_be_deactivated(): void
    {
        $owner = User::factory()->create(['role' => 'OWNER', 'is_active' => true]);
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $this->actingAs($owner)->deleteJson('/api/v1/users/' . $owner->id)->assertStatus(422);
        $this->actingAs($admin)->deleteJson('/api/v1/users/' . $owner->id)->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $owner->id,
            'is_active' => true,
        ]);
    }
}
