<?php

namespace Tests\Feature;

use Database\Seeders\LocalDevelopmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LocalDevelopmentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_local_roles_and_stb_browser_fixture_data(): void
    {
        putenv('SENTANU_DEV_TEST_PASSWORD=test-only-password');
        $_ENV['SENTANU_DEV_TEST_PASSWORD'] = 'test-only-password';
        $_SERVER['SENTANU_DEV_TEST_PASSWORD'] = 'test-only-password';

        try {
            $this->seed(LocalDevelopmentSeeder::class);

            foreach (['ADMIN', 'OWNER', 'STAFF'] as $role) {
                $user = \App\Models\User::where('role', $role)->firstOrFail();
                $this->assertTrue(Hash::check('test-only-password', $user->password));
            }

            $this->assertDatabaseHas('companies', ['code' => 'SJ-LOCAL']);
            $this->assertDatabaseHas('branches', ['code' => 'HQ']);
            $this->assertDatabaseHas('customers', ['code' => 'CUST-LOCAL']);
            $this->assertDatabaseHas('customer_items', ['code' => 'BUMPER-LOCAL']);
            $this->assertDatabaseHas('custody_locations', ['code' => 'RAW-LOCAL']);
        } finally {
            putenv('SENTANU_DEV_TEST_PASSWORD');
            unset($_ENV['SENTANU_DEV_TEST_PASSWORD'], $_SERVER['SENTANU_DEV_TEST_PASSWORD']);
        }
    }
}
