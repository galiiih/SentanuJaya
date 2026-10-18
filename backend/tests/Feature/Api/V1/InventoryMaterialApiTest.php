<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Material;
use App\Models\Supplier;
use App\Models\Uom;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Stock;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryMaterialApiTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'username' => strtolower($role) . '_inv_' . fake()->unique()->numerify('###'),
            'email' => strtolower($role) . '_inv_' . fake()->unique()->numerify('###') . '@test.com',
            'password' => 'secret',
            'full_name' => $role,
            'role' => strtoupper($role),
            'is_active' => true,
        ]);
    }

    public function test_material_receipt_posting_increases_stock(): void
    {
        $admin = $this->user('ADMIN');
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ-01', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-01']);
        $warehouse = Warehouse::create(['branch_id' => $branch->id, 'code' => 'WH-01', 'name' => 'Main Warehouse']);
        $supplier = Supplier::create(['company_id' => $company->id, 'code' => 'SUP-01', 'name' => 'Supplier Cat']);
        $uom = Uom::create(['code' => 'PCS', 'name' => 'Pieces']);
        $material = Material::create([
            'company_id' => $company->id,
            'code' => 'MAT-CAT-01',
            'name' => 'Cat Duco Hitam',
            'category' => 'CAT',
            'unit' => 'PCS',
            'minimum_stock' => 5,
            'is_active' => true,
            'purchase_uom_id' => $uom->id,
            'stock_uom_id' => $uom->id,
        ]);

        $response = $this->actingAs($admin)->postJson('/api/v1/material-receipts', [
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'receipt_number' => 'MR-2026-001',
            'supplier_id' => $supplier->id,
            'receipt_date' => '2026-10-18',
            'lines' => [
                [
                    'material_id' => $material->id,
                    'quantity' => 20,
                    'uom_id' => $uom->id,
                    'unit_cost' => 50000,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $receiptId = $response->json('data.id');

        // Stock should not exist while draft
        $this->assertFalse(Stock::where('warehouse_id', $warehouse->id)->where('material_id', $material->id)->exists());

        // Post receipt
        $postResponse = $this->actingAs($admin)->postJson("/api/v1/material-receipts/{$receiptId}/post");
        $postResponse->assertStatus(200);

        // Stock should now be 20
        $this->assertDatabaseHas('stocks', [
            'warehouse_id' => $warehouse->id,
            'material_id' => $material->id,
            'quantity_on_hand' => 20,
            'average_unit_cost' => 50000,
        ]);

        // Re-posting should fail
        $repostResponse = $this->actingAs($admin)->postJson("/api/v1/material-receipts/{$receiptId}/post");
        $repostResponse->assertStatus(422);
    }

    public function test_material_usage_posting_decreases_stock_and_prevents_negative(): void
    {
        $admin = $this->user('ADMIN');
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ-02', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-02']);
        $warehouse = Warehouse::create(['branch_id' => $branch->id, 'code' => 'WH-02', 'name' => 'Main Warehouse']);
        $supplier = Supplier::create(['company_id' => $company->id, 'code' => 'SUP-02', 'name' => 'Supplier Thinner']);
        $uom = Uom::create(['code' => 'LTR', 'name' => 'Liter']);
        $material = Material::create([
            'company_id' => $company->id,
            'code' => 'MAT-TH-01',
            'name' => 'Thinner PU',
            'category' => 'THINNER',
            'unit' => 'LTR',
            'minimum_stock' => 10,
            'is_active' => true,
            'purchase_uom_id' => $uom->id,
            'stock_uom_id' => $uom->id,
        ]);

        // First receipt 15 liters
        $receipt = \App\Models\MaterialReceipt::create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'receipt_number' => 'MR-2026-002',
            'supplier_id' => $supplier->id,
            'receipt_date' => '2026-10-18',
            'status' => 'DRAFT',
        ]);
        $receipt->lines()->create([
            'material_id' => $material->id,
            'quantity' => 15,
            'uom_id' => $uom->id,
            'unit_cost' => 20000,
            'subtotal' => 300000,
        ]);
        app(InventoryService::class)->postMaterialReceipt($receipt, $admin->id);

        // Try usage of 20 liters (exceeds stock of 15) -> should fail
        $usageResponse = $this->actingAs($admin)->postJson('/api/v1/material-usages', [
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'usage_number' => 'MU-2026-001',
            'usage_date' => '2026-10-18',
            'lines' => [
                [
                    'material_id' => $material->id,
                    'quantity' => 20,
                    'uom_id' => $uom->id,
                ],
            ],
        ]);
        $usageResponse->assertStatus(201);
        $usageId = $usageResponse->json('data.id');

        $postUsageResponse = $this->actingAs($admin)->postJson("/api/v1/material-usages/{$usageId}/post");
        $postUsageResponse->assertStatus(422); // Insufficient stock

        // Try usage of 10 liters -> should succeed
        $usageResponse2 = $this->actingAs($admin)->postJson('/api/v1/material-usages', [
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'usage_number' => 'MU-2026-002',
            'usage_date' => '2026-10-18',
            'lines' => [
                [
                    'material_id' => $material->id,
                    'quantity' => 10,
                    'uom_id' => $uom->id,
                ],
            ],
        ]);
        $usageId2 = $usageResponse2->json('data.id');
        $this->actingAs($admin)->postJson("/api/v1/material-usages/{$usageId2}/post")->assertStatus(200);

        $this->assertDatabaseHas('stocks', [
            'warehouse_id' => $warehouse->id,
            'material_id' => $material->id,
            'quantity_on_hand' => 5,
        ]);
    }
}
