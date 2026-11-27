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
            'name' => 'New Staff',
            'email' => 'new.staff@sentanu.local',
            'password' => 'secret123',
            'role' => 'STAFF',
        ])->assertForbidden();

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
        $this->assertDatabaseMissing('users', ['email' => 'new.staff@sentanu.local']);
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'STAFF']);
    }

    public function test_new_accounts_must_change_temporary_password_before_using_the_api(): void
    {
        $owner = User::factory()->create(['role' => 'OWNER']);
        $this->actingAs($owner)->postJson('/api/v1/users', [
            'name' => 'New Staff', 'email' => 'first.login@sentanu.local',
            'password' => 'Temporary123!', 'role' => 'STAFF',
        ])->assertCreated();
        $newUser = User::where('email', 'first.login@sentanu.local')->firstOrFail();
        $this->assertTrue($newUser->must_change_password);
        $this->actingAs($newUser)->getJson('/api/v1/dashboard/summary')->assertForbidden();
        $this->actingAs($newUser)->postJson('/api/v1/auth/change-password', [
            'current_password' => 'Temporary123!', 'password' => 'NewSecurePass123!',
            'password_confirmation' => 'NewSecurePass123!',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);
        $this->actingAs($newUser)->getJson('/api/v1/dashboard/summary')->assertOk();
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create(['is_active' => false]);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertUnprocessable();
        $this->assertGuest();
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

    public function test_role_permission_matrix_matches_the_approved_business_grants(): void
    {
        $expected = [
            'STAFF' => [
                'delivery.view', 'delivery.create',
                'acceptance.view', 'return.view',
                'po.view', 'po.create', 'po.edit',
                'master.view', 'documentation.view',
            ],
            'ADMIN' => [
                'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver', 'delivery.cancel_draft',
                'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
                'return.view', 'return.create', 'return.post',
                'invoice.view', 'invoice.create',
                'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
                'master.view', 'master.manage', 'report.view',
                'documentation.view', 'documentation.manage', 'documentation.publish',
            ],
            'OWNER' => [
                'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver',
                'delivery.cancel_draft', 'delivery.cancel_posted',
                'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
                'return.view', 'return.create', 'return.post',
                'invoice.view', 'invoice.create', 'invoice.approve',
                'report.view',
                'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
                'master.view', 'master.manage',
                'documentation.view', 'documentation.manage',
            ],
        ];

        $allPermissions = array_values(array_unique(array_merge(...array_values($expected))));

        foreach ($expected as $role => $grantedPermissions) {
            $user = User::factory()->create(['role' => $role]);

            foreach ($allPermissions as $permission) {
                $this->assertSame(
                    in_array($permission, $grantedPermissions, true),
                    $user->hasPermission($permission),
                    sprintf('%s permission mismatch for role %s', $permission, $role),
                );
            }

            $this->assertFalse($user->hasPermission('permission.not.defined'));
        }
    }

    public function test_internal_developer_roles_bypass_the_business_permission_matrix(): void
    {
        foreach (['DEV', 'DEV ADMIN'] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->assertTrue($user->hasPermission('delivery.cancel_posted'));
            $this->assertTrue($user->hasPermission('documentation.publish'));
            $this->assertTrue($user->hasPermission('permission.not.defined'));
        }
    }

    public function test_unknown_role_does_not_receive_any_business_permission(): void
    {
        $user = User::factory()->create(['role' => 'UNRECOGNIZED']);

        $this->assertFalse($user->hasPermission('master.view'));
        $this->assertFalse($user->hasPermission('invoice.create'));
    }
}
