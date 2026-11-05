<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class BrowserE2ESeeder extends Seeder
{
    /**
     * Create the dedicated STAFF account required by browser authorization tests.
     * The factory supplies the standard test password used by this E2E suite.
     */
    public function run(): void
    {
        if (! User::where('email', 'agus@sentanu.local')->exists()) {
            User::factory()->create([
                'username' => 'agus-e2e',
                'full_name' => 'Agus Test Staff',
                'email' => 'agus@sentanu.local',
                'role' => 'STAFF',
                'is_active' => true,
            ]);
        }
    }
}
