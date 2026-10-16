<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\{
    Company, Branch, Uom, Color, Treatment, ExpenseCategory,
    PaymentMethod, TransportTemplate, ProductionStatus, Worker,
    Supplier, Material, Customer, CustomerContact, CustomerItem,
    PriceList, PriceListLine
};

class MasterDataApiTest extends TestCase
{
    use RefreshDatabase;

    private \App\Models\User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = \App\Models\User::create([
            'username' => 'admin',
            'email' => 'admin@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Admin User',
            'role' => 'ADMIN',
        ]);
        $this->actingAs($this->user);
    }

    /** @test */
    public function test_unauthenticated_access_is_rejected()
    {
        auth()->logout();
        $this->getJson('/api/v1/uoms')->assertStatus(401);
    }

    /** @test */
    public function test_uom_crud_and_validation()
    {
        // 1. Create
        $response = $this->postJson('/api/v1/uoms', [
            'code' => 'PCS',
            'name' => 'Pieces',
            'category' => 'QUANTITY',
            'decimal_places' => 0,
            'is_active' => true,
        ]);
        $response->assertStatus(201)
                 ->assertJson(['success' => true])
                 ->assertJsonPath('data.code', 'PCS');

        $uomId = $response->json('data.id');

        // 2. Index
        $this->getJson('/api/v1/uoms?search=PCS')
             ->assertStatus(200)
             ->assertJsonPath('data.total', 1);

        // 3. Show
        $this->getJson("/api/v1/uoms/{$uomId}")
             ->assertStatus(200)
             ->assertJsonPath('data.name', 'Pieces');

        // 4. Update
        $this->putJson("/api/v1/uoms/{$uomId}", ['name' => 'Pieces Updated'])
             ->assertStatus(200)
             ->assertJsonPath('data.name', 'Pieces Updated');

        // 5. Validation duplicate code
        $this->postJson('/api/v1/uoms', [
            'code' => 'PCS',
            'name' => 'Duplicate',
            'category' => 'QUANTITY',
        ])->assertStatus(422)->assertJson(['success' => false]);

        // 6. Delete
        $this->deleteJson("/api/v1/uoms/{$uomId}")
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        // 7. Not Found
        $this->getJson("/api/v1/uoms/{$uomId}")
             ->assertStatus(404);
    }

    /** @test */
    public function test_company_and_branch_crud_with_fk_protection()
    {
        // 1. Company Create
        $companyRes = $this->postJson('/api/v1/companies', [
            'code' => 'SJ-CORP',
            'name' => 'PT Sentanu Jaya Finishing',
            'legal_name' => 'PT Sentanu Jaya Finishing Utama',
            'npwp' => '01.234.567.8-901.000',
            'is_pkp' => true,
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
        ])->assertStatus(201);

        $companyId = $companyRes->json('data.id');

        // 2. Branch Create
        $branchRes = $this->postJson('/api/v1/branches', [
            'company_id' => $companyId,
            'code' => 'B-HQ',
            'name' => 'Bengkel Utama Headquarter',
            'address' => 'Jl. Industri No 45, Karawang',
            'is_active' => true,
        ])->assertStatus(201);

        $branchId = $branchRes->json('data.id');

        // 3. FK Protection: Deleting Company should fail with 409
        $this->deleteJson("/api/v1/companies/{$companyId}")
             ->assertStatus(409)
             ->assertJson(['success' => false]);

        // 4. Delete Branch first
        $this->deleteJson("/api/v1/branches/{$branchId}")
             ->assertStatus(200);

        // 5. Now delete Company succeeds
        $this->deleteJson("/api/v1/companies/{$companyId}")
             ->assertStatus(200);
    }

    /** @test */
    public function test_all_simple_masters_crud()
    {
        // Color
        $c = $this->postJson('/api/v1/colors', ['code' => 'RED-01', 'name' => 'Candy Red', 'hex_code' => '#FF0000'])->assertStatus(201);
        $this->getJson('/api/v1/colors/' . $c->json('data.id'))->assertStatus(200);
        $this->deleteJson('/api/v1/colors/' . $c->json('data.id'))->assertStatus(200);

        // Treatment
        $t = $this->postJson('/api/v1/treatments', ['code' => 'PNT-3L', 'name' => '3-Layer Paint System', 'category' => 'PAINT'])->assertStatus(201);
        $this->deleteJson('/api/v1/treatments/' . $t->json('data.id'))->assertStatus(200);

        // ExpenseCategory
        $e = $this->postJson('/api/v1/expense-categories', ['code' => 'EXP-ELEC', 'name' => 'Listrik Bengkel'])->assertStatus(201);
        $this->deleteJson('/api/v1/expense-categories/' . $e->json('data.id'))->assertStatus(200);

        // PaymentMethod
        $p = $this->postJson('/api/v1/payment-methods', ['code' => 'TF-BCA', 'name' => 'Transfer Bank BCA', 'type' => 'BANK_TRANSFER'])->assertStatus(201);
        $this->deleteJson('/api/v1/payment-methods/' . $p->json('data.id'))->assertStatus(200);

        // TransportTemplate
        $tr = $this->postJson('/api/v1/transport-templates', ['name' => 'Zone 1 (0-10km)', 'tarif' => 150000, 'effective_date' => '2026-01-01'])->assertStatus(201);
        $this->deleteJson('/api/v1/transport-templates/' . $tr->json('data.id'))->assertStatus(200);

        // ProductionStatus
        $ps = $this->postJson('/api/v1/production-statuses', ['code' => 'PAINTING', 'name' => 'Proses Pengecatan', 'sequence' => 2])->assertStatus(201);
        $this->deleteJson('/api/v1/production-statuses/' . $ps->json('data.id'))->assertStatus(200);
    }

    /** @test */
    public function test_complex_relational_masters_crud()
    {
        // 1. Setup Base Company & UOM
        $company = Company::create(['code' => 'C-01', 'name' => 'Comp 1', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR']);
        $uom = Uom::create(['code' => 'PCS', 'name' => 'Pieces', 'category' => 'QTY', 'decimal_places' => 0]);
        $branch = Branch::create(['company_id' => $company->id, 'code' => 'BR-01', 'name' => 'Branch 1']);

        // 2. Worker
        $w = $this->postJson('/api/v1/workers', [
            'branch_id' => $branch->id,
            'code' => 'W-01',
            'name' => 'Budi Worker',
            'type' => 'DAILY',
        ])->assertStatus(201);

        // 3. Supplier
        $s = $this->postJson('/api/v1/suppliers', [
            'company_id' => $company->id,
            'code' => 'SUP-01',
            'name' => 'PT Cat Utama Supplier',
        ])->assertStatus(201);

        // 4. Material
        $m = $this->postJson('/api/v1/materials', [
            'company_id' => $company->id,
            'code' => 'MAT-CAT-01',
            'name' => 'Cat Primer Red',
            'category' => 'PAINT',
            'unit' => 'KG',
            'minimum_stock' => 10,
            'purchase_uom_id' => $uom->id,
            'stock_uom_id' => $uom->id,
        ])->assertStatus(201);

        // 5. Customer & Contact
        $cust = $this->postJson('/api/v1/customers', [
            'company_id' => $company->id,
            'code' => 'CUST-VARIA',
            'name' => 'PT Varia Baru',
            'tax_status' => 'PKP',
        ])->assertStatus(201);

        $contact = $this->postJson('/api/v1/customer-contacts', [
            'customer_id' => $cust->json('data.id'),
            'name' => 'Pak Ahmad',
            'position' => 'Procurement Manager',
        ])->assertStatus(201);

        // 6. Customer Item
        $ci = $this->postJson('/api/v1/customer-items', [
            'customer_id' => $cust->json('data.id'),
            'code' => 'ITEM-BUMPER-01',
            'name' => 'Front Bumper Metal',
            'uom_id' => $uom->id,
        ])->assertStatus(201);

        // 7. Price List & Line
        $pl = $this->postJson('/api/v1/price-lists', [
            'company_id' => $company->id,
            'customer_id' => $cust->json('data.id'),
            'code' => 'PL-VARIA-2026',
            'name' => 'Daftar Harga Varia 2026',
            'effective_date' => '2026-01-01',
        ])->assertStatus(201);

        $pll = $this->postJson('/api/v1/price-list-lines', [
            'price_list_id' => $pl->json('data.id'),
            'customer_item_id' => $ci->json('data.id'),
            'color_code' => 'RED-01',
            'treatment_type' => 'PAINT',
            'unit_price' => 450000.00,
        ])->assertStatus(201);

        // 8. Verify relations retrieval in GET detail
        $res = $this->getJson('/api/v1/price-lists/' . $pl->json('data.id'))->assertStatus(200);
        $this->assertEquals('CUST-VARIA', $res->json('data.customer.code'));
        $this->assertEquals(450000, (float) $res->json('data.lines.0.unit_price'));
    }
}
