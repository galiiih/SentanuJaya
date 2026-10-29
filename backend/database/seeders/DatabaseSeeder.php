<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create default company Sentanu Jaya if not exists
        \App\Models\Company::firstOrCreate(
            ['code' => 'SJ'],
            [
                'name' => 'PT Sentanu Jaya',
                'address' => 'Jl. Industri Utama No. 1',
                'phone' => '021-5551234',
            ]
        );

        User::factory()->create([
            'full_name' => 'Test User',
            'username' => 'admin',
            'email' => 'admin@sentanu.local',
            'password' => Hash::make('password123'),
            'role' => 'ADMIN',
            'is_active' => true,
        ]);
    }
}
