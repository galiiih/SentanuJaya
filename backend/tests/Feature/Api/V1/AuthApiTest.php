<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_establishes_session_and_me_returns_authenticated_user(): void
    {
        $user = $this->makeUser();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Login berhasil.')
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.role', 'ADMIN');

        $this->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Data pengguna berhasil dimuat.')
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_invalid_login_is_rejected_with_localized_validation_error(): void
    {
        $user = $this->makeUser();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Email atau password tidak sesuai.')
            ->assertJsonPath('errors.email.0', 'Email atau password tidak sesuai.');
    }

    public function test_protected_auth_custody_and_goods_receipt_endpoints_require_session(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unauthenticated.');
        $this->getJson('/api/v1/custody-locations')->assertUnauthorized();
        $this->getJson('/api/v1/custody-balances')->assertUnauthorized();
        $this->getJson('/api/v1/custody-ledger')->assertUnauthorized();
        $this->getJson('/api/v1/goods-receipts')->assertUnauthorized();
    }

    public function test_authenticated_session_can_access_custody_and_goods_receipt_endpoints(): void
    {
        $user = $this->makeUser();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

        $this->getJson('/api/v1/custody-locations')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/v1/custody-balances')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/v1/custody-ledger')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/v1/goods-receipts')->assertOk()->assertJsonPath('success', true);
    }

    public function test_logout_invalidates_session(): void
    {
        $user = $this->makeUser();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

        $this->postJson('/api/v1/auth/logout')->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Logout berhasil.');

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    private function makeUser(): User
    {
        return User::create([
            'username' => 'admin-' . fake()->unique()->numerify('####'),
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'full_name' => 'Admin User',
            'role' => 'ADMIN',
        ]);
    }
}
