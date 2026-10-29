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
    public function test_staff_role_comprehensive_mutation_blocking_and_integrity_all_17()
    {
        $staff = \App\Models\User::create([
            'username' => 'staff_audit_17',
            'email' => 'staff_audit_17@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Staff Audit 17 User',
            'role' => 'STAFF',
        ]);

        // First create a company and branch so foreign keys for related entities exist
        $company = \App\Models\Company::create([
            'code' => 'TEST-CORP',
            'name' => 'Test Corp',
            'legal_name' => 'Test Corp Legal',
            'npwp' => '01.234.567.8-901.000',
            'is_pkp' => true,
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
        ]);
        $branch = \App\Models\Branch::create([
            'company_id' => $company->id,
            'code' => 'TEST-BR',
            'name' => 'Test Branch',
            'address' => 'Test Address',
            'is_active' => true,
        ]);
        $customer = \App\Models\Customer::create([
            'company_id' => $company->id,
            'code' => 'CUST-1',
            'name' => 'Customer One',
            'type' => 'REGULAR',
        ]);
        $priceList = \App\Models\PriceList::create([
            'company_id' => $company->id,
            'code' => 'PL-1',
            'name' => 'Price List 1',
            'currency' => 'IDR',
            'effective_date' => now(),
        ]);

        $definitions = [
            ['/api/v1/companies', 'companies', ['code' => 'C-1', 'name' => 'Comp', 'legal_name' => 'Comp L', 'npwp' => '01.234.567.8-901.000', 'is_pkp' => true, 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR'], \App\Models\Company::class],
            ['/api/v1/branches', 'branches', ['company_id' => $company->id, 'code' => 'B-1', 'name' => 'Br', 'address' => 'Addr', 'is_active' => true], \App\Models\Branch::class],
            ['/api/v1/uoms', 'uoms', ['code' => 'U-1', 'name' => 'Uom', 'category' => 'QUANTITY'], \App\Models\Uom::class],
            ['/api/v1/colors', 'colors', ['code' => 'COL-1', 'name' => 'Red', 'hex_code' => '#FF0000'], \App\Models\Color::class],
            ['/api/v1/treatments', 'treatments', ['code' => 'TR-1', 'name' => 'Treat', 'category' => 'PAINT'], \App\Models\Treatment::class],
            ['/api/v1/expense-categories', 'expense_categories', ['code' => 'EXP-1', 'name' => 'Exp'], \App\Models\ExpenseCategory::class],
            ['/api/v1/payment-methods', 'payment_methods', ['code' => 'PM-1', 'name' => 'Pay', 'type' => 'CASH'], \App\Models\PaymentMethod::class],
            ['/api/v1/transport-templates', 'transport_templates', ['code' => 'TT-1', 'name' => 'Trans', 'vehicle_type' => 'TRUCK', 'tarif' => 150000, 'effective_date' => now()], \App\Models\TransportTemplate::class],
            ['/api/v1/production-statuses', 'production_statuses', ['code' => 'PS-1', 'name' => 'Prod', 'stage' => 'PREP'], \App\Models\ProductionStatus::class],
            ['/api/v1/workers', 'workers', ['company_id' => $company->id, 'code' => 'W-1', 'name' => 'Work', 'role' => 'OPERATOR'], \App\Models\Worker::class],
            ['/api/v1/suppliers', 'suppliers', ['company_id' => $company->id, 'code' => 'S-1', 'name' => 'Supp'], \App\Models\Supplier::class],
            ['/api/v1/materials', 'materials', ['company_id' => $company->id, 'code' => 'MAT-1', 'name' => 'Mat', 'category' => 'RAW', 'unit' => 'PCS'], \App\Models\Material::class],
            ['/api/v1/customers', 'customers', ['company_id' => $company->id, 'code' => 'CUST-2', 'name' => 'Cust 2', 'type' => 'REGULAR'], \App\Models\Customer::class],
            ['/api/v1/customer-contacts', 'customer_contacts', ['customer_id' => $customer->id, 'name' => 'Contact 1'], \App\Models\CustomerContact::class],
            ['/api/v1/customer-items', 'customer_items', ['customer_id' => $customer->id, 'code' => 'CI-1', 'name' => 'Item 1'], \App\Models\CustomerItem::class],
            ['/api/v1/price-lists', 'price_lists', ['company_id' => $company->id, 'code' => 'PL-2', 'name' => 'PL 2', 'currency' => 'IDR', 'effective_date' => now()], \App\Models\PriceList::class],
            ['/api/v1/price-list-lines', 'price_list_lines', ['price_list_id' => 1, 'customer_item_id' => 1, 'unit_price' => 1000], \App\Models\PriceListLine::class, function() use ($customer, $priceList) {
                $ci = \App\Models\CustomerItem::create(['customer_id' => $customer->id, 'code' => 'CI-' . uniqid(), 'name' => 'Item']);
                return ['price_list_id' => $priceList->id, 'customer_item_id' => $ci->id, 'unit_price' => 1000];
            }],
        ];

        foreach ($definitions as $def) {
            $ep = $def[0];
            $tableName = $def[1];
            $validPayload = $def[2];
            $modelClass = $def[3];
            $payloadFactory = $def[4] ?? null;

            $currentPayload = $payloadFactory ? $payloadFactory() : $validPayload;

            // 1. GET index success (200)
            $this->actingAs($staff)->getJson($ep)->assertStatus(200);

            // 2. POST rejected with 403, DB count unchanged
            $countBefore = \Illuminate\Support\Facades\DB::table($tableName)->count();
            $this->actingAs($staff)->postJson($ep, $currentPayload)->assertStatus(403);
            $this->assertEquals($countBefore, \Illuminate\Support\Facades\DB::table($tableName)->count());

            // Seed a valid record using model
            $seeded = $modelClass::create($currentPayload);
            $seededId = $seeded->id;

            // 1.1 GET show success (200) and verify id/fields
            $showRes = $this->actingAs($staff)->getJson("{$ep}/{$seededId}");
            $showRes->assertStatus(200);
            $returnedId = $showRes->json('data.id') ?? $showRes->json('id');
            $this->assertEquals($seededId, $returnedId);
            if (isset($currentPayload['name'])) {
                $returnedName = $showRes->json('data.name') ?? $showRes->json('name');
                $this->assertEquals($currentPayload['name'], $returnedName);
            } elseif (isset($currentPayload['code'])) {
                $returnedCode = $showRes->json('data.code') ?? $showRes->json('code');
                $this->assertEquals($currentPayload['code'], $returnedCode);
            } elseif (isset($currentPayload['unit_price'])) {
                $returnedPrice = $showRes->json('data.unit_price') ?? $showRes->json('unit_price');
                $this->assertEquals($currentPayload['unit_price'], $returnedPrice);
            }

            $recordBefore = \Illuminate\Support\Facades\DB::table($tableName)->find($seededId);

            // 3. PUT rejected with 403, record unchanged
            $this->actingAs($staff)->putJson("{$ep}/{$seededId}", $currentPayload)->assertStatus(403);
            $recordAfterPut = \Illuminate\Support\Facades\DB::table($tableName)->find($seededId);
            $this->assertEquals((array)$recordBefore, (array)$recordAfterPut);

            // 4. PATCH rejected with 403, record unchanged
            $patchPayload = $currentPayload;
            if (isset($patchPayload['name'])) {
                $patchPayload['name'] = $patchPayload['name'] . ' Patched';
            } elseif (isset($patchPayload['code'])) {
                $patchPayload['code'] = $patchPayload['code'] . '-P';
            } elseif (isset($patchPayload['unit_price'])) {
                $patchPayload['unit_price'] = $patchPayload['unit_price'] + 500;
            }
            $this->actingAs($staff)->patchJson("{$ep}/{$seededId}", $patchPayload)->assertStatus(403);
            $recordAfterPatch = \Illuminate\Support\Facades\DB::table($tableName)->find($seededId);
            $this->assertEquals((array)$recordBefore, (array)$recordAfterPatch);

            // 5. DELETE rejected with 403, record still exists
            $this->actingAs($staff)->deleteJson("{$ep}/{$seededId}")->assertStatus(403);
            $this->assertNotNull(\Illuminate\Support\Facades\DB::table($tableName)->find($seededId));

            // Clean up seeded record using model
            $modelClass::where('id', $seededId)->delete();
        }
    }

    /** @test */
    public function test_admin_and_owner_role_allowed_mutations()
    {
        $admin = \App\Models\User::create([
            'username' => 'admin_audit',
            'email' => 'admin_audit@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Admin Audit User',
            'role' => 'ADMIN',
        ]);

        $owner = \App\Models\User::create([
            'username' => 'owner_audit',
            'email' => 'owner_audit@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Owner Audit User',
            'role' => 'OWNER',
        ]);

        // Admin allowed POST
        $this->actingAs($admin)->postJson('/api/v1/uoms', [
            'code' => 'ADM-UOM',
            'name' => 'Admin UOM',
            'category' => 'QUANTITY',
        ])->assertStatus(201);

        // Owner allowed POST
        $this->actingAs($owner)->postJson('/api/v1/colors', [
            'code' => 'OWN-COL',
            'name' => 'Owner Color',
            'hex_code' => '#00FF00',
        ])->assertStatus(201);
    }

    /** @test */
    public function test_unauthenticated_access_is_rejected_with_401()
    {
        // Clear all authentication state so request is guest
        $this->app['auth']->forgetGuards();

        $endpoints = [
            '/api/v1/uoms',
            '/api/v1/colors',
            '/api/v1/customers',
        ];

        foreach ($endpoints as $ep) {
            $this->getJson($ep)->assertStatus(401);
            $this->postJson($ep, ['code' => 'FAIL'])->assertStatus(401);
        }
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
            'tax_condition' => 3,
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
