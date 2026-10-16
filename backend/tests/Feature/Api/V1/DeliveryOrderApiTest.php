<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustodyBalance;
use App\Models\CustodyLocation;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryOrderApiTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ']);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer A', 'code' => 'CA']);
        $item = CustomerItem::create(['customer_id' => $customer->id, 'name' => 'Velg R17', 'code' => 'VR17']);
        $loc = CustodyLocation::create(['branch_id' => $branch->id, 'code' => 'WH1', 'name' => 'Warehouse 1']);

        $po = \App\Models\CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => 'PO-BASE-01',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = \App\Models\CustomerPoLine::create([
            'customer_po_id' => $po->id,
            'customer_item_id' => $item->id,
            'quantity' => 1000,
        ]);

        // Seed custody balance (as if STB was posted)
        CustodyBalance::create([
            'customer_id' => $customer->id,
            'customer_item_id' => $item->id,
            'custody_location_id' => $loc->id,
            'stage' => 'RAW',
            'balance_quantity' => 20,
        ]);

        return compact('company', 'branch', 'customer', 'item', 'loc', 'po', 'poLine');
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'username' => $role . '_user',
            'email' => $role . '@test.com',
            'password' => 'secret',
            'full_name' => ucfirst($role),
            'role' => strtoupper($role),
            'is_active' => true,
        ]);
    }

    public function test_staff_can_create_draft_but_cannot_submit(): void
    {
        $s = $this->seedBase();
        $staff = $this->makeUser('staff');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 5,
            ]],
        ];

        // Can create
        $res = $this->actingAs($staff)->postJson('/api/v1/delivery-orders', $payload);
        $res->assertStatus(201);
        $this->assertTrue($res->json('success'));
        $this->assertEquals('DRAFT', $res->json('data.status'));
        $this->assertNotNull($res->json('data.sj_number'));

        $doId = $res->json('data.id');

        // Cannot submit
        $res2 = $this->actingAs($staff)->postJson("/api/v1/delivery-orders/$doId/submit");
        $res2->assertStatus(403);
    }

    public function test_admin_full_lifecycle_draft_submit_deliver(): void
    {
        $s = $this->seedBase();
        $admin = $this->makeUser('admin');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 10,
            ]],
        ];

        // Create
        $res = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $payload);
        $res->assertStatus(201);
        $doId = $res->json('data.id');

        // Submit
        $res2 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/submit");
        $res2->assertOk();
        $this->assertEquals('SUBMITTED', $res2->json('data.status'));

        // Deliver — should create OUT_TO_CUSTOMER custody movement
        $res3 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/deliver");
        $res3->assertOk();
        $this->assertEquals('DELIVERED', $res3->json('data.status'));

        // Verify custody balance decreased
        $balance = CustodyBalance::where('customer_item_id', $s['item']->id)->first();
        $this->assertEquals(10, (float) $balance->balance_quantity); // 20 - 10

        // Verify ledger entry
        $this->assertDatabaseHas('custody_ledger', [
            'reference_type' => 'DELIVERY_ORDER',
            'movement_type' => 'OUT_TO_CUSTOMER',
            'quantity_out' => 10,
        ]);
    }

    public function test_deliver_fails_with_insufficient_custody(): void
    {
        $s = $this->seedBase();
        $admin = $this->makeUser('admin');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 999, // more than balance (20)
            ]],
        ];

        $res = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $payload);
        $doId = $res->json('data.id');

        $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/submit")->assertOk();
        $res3 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/deliver");
        $res3->assertStatus(422);
        $this->assertFalse($res3->json('success'));
    }

    public function test_cancel_draft_by_admin(): void
    {
        $s = $this->seedBase();
        $admin = $this->makeUser('admin');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 5,
            ]],
        ];

        $res = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $payload);
        $doId = $res->json('data.id');

        $res2 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/cancel");
        $res2->assertOk();
        $this->assertEquals('CANCELLED', $res2->json('data.status'));
    }

    public function test_owner_can_cancel_delivered(): void
    {
        $s = $this->seedBase();
        $owner = $this->makeUser('owner');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 5,
            ]],
        ];

        $res = $this->actingAs($owner)->postJson('/api/v1/delivery-orders', $payload);
        $doId = $res->json('data.id');
        $this->actingAs($owner)->postJson("/api/v1/delivery-orders/$doId/submit")->assertOk();
        $this->actingAs($owner)->postJson("/api/v1/delivery-orders/$doId/deliver")->assertOk();

        $res2 = $this->actingAs($owner)->postJson("/api/v1/delivery-orders/$doId/cancel");
        $res2->assertOk();
        $this->assertEquals('CANCELLED', $res2->json('data.status'));
    }

    public function test_lifecycle_violations_are_rejected(): void
    {
        $s = $this->seedBase();
        $admin = $this->makeUser('admin');

        $payload = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 5,
            ]],
        ];

        $res = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $payload);
        $doId = $res->json('data.id');

        // Can't deliver a draft (must submit first)
        $res2 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/deliver");
        $res2->assertStatus(422);

        // Can't submit twice
        $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/submit")->assertOk();
        $res3 = $this->actingAs($admin)->postJson("/api/v1/delivery-orders/$doId/submit");
        $res3->assertStatus(422);
    }

    public function test_do_number_sequence(): void
    {
        $s = $this->seedBase();
        $admin = $this->makeUser('admin');

        $base = [
            'company_id' => $s['company']->id,
            'branch_id' => $s['branch']->id,
            'customer_id' => $s['customer']->id,
            'customer_po_id' => $s['po']->id,
            'delivery_date' => '2026-10-04',
            'lines' => [[
                'customer_item_id' => $s['item']->id,
                'customer_po_line_id' => $s['poLine']->id,
                'quantity' => 1,
            ]],
        ];

        $r1 = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $base);
        $r2 = $this->actingAs($admin)->postJson('/api/v1/delivery-orders', $base);

        $n1 = $r1->json('data.sj_number');
        $n2 = $r2->json('data.sj_number');

        $this->assertNotEquals($n1, $n2);
        $this->assertEquals((int) substr($n1, -4) + 1, (int) substr($n2, -4));
    }
}
