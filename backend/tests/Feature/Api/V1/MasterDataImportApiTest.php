<?php

namespace Tests\\Feature\\Api\\V1;

use App\\Models\\Company;
use App\\Models\\User;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Tests\\TestCase;

class MasterDataImportApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'username' => 'master_import_admin',
            'email' => 'master_import_admin@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Master Import Admin',
            'role' => 'ADMIN',
        ]);
    }

    public function test_company_batch_import_creates_all_rows_atomically(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/master-data/import/companies', [
            'rows' => [
                ['code' => 'IMP-COMP-01', 'name' => 'Import Company 1', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR'],
                ['code' => 'IMP-COMP-02', 'name' => 'Import Company 2', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created_count', 2);

        $this->assertDatabaseHas('companies', ['code' => 'IMP-COMP-01']);
        $this->assertDatabaseHas('companies', ['code' => 'IMP-COMP-02']);
    }

    public function test_invalid_later_row_rolls_back_earlier_rows(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/master-data/import/companies', [
            'rows' => [
                ['code' => 'IMP-ROLLBACK-01', 'name' => 'Must Roll Back', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR'],
                ['code' => 'IMP-ROLLBACK-02', 'name' => '', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR'],
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.row', 3);

        $this->assertDatabaseMissing('companies', ['code' => 'IMP-ROLLBACK-01']);
        $this->assertDatabaseMissing('companies', ['code' => 'IMP-ROLLBACK-02']);
    }

    public function test_batch_import_enforces_master_manage_permission(): void
    {
        $staff = User::create([
            'username' => 'master_import_staff',
            'email' => 'master_import_staff@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Master Import Staff',
            'role' => 'STAFF',
        ]);

        $this->actingAs($staff)->postJson('/api/v1/master-data/import/companies', [
            'rows' => [['code' => 'IMP-STAFF-01', 'name' => 'Forbidden']],
        ])->assertForbidden();

        $this->assertDatabaseMissing('companies', ['code' => 'IMP-STAFF-01']);
    }

    public function test_batch_import_rejects_unknown_resources_and_oversized_batches(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/master-data/import/not-a-table', [
            'rows' => [['code' => 'X', 'name' => 'X']],
        ])->assertNotFound();

        $this->actingAs($this->admin)->postJson('/api/v1/master-data/import/companies', [
            'rows' => array_fill(0, 501, ['code' => 'X', 'name' => 'X']),
        ])->assertUnprocessable();
    }
}
