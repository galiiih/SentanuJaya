<?php

namespace Tests\Feature\Api\V1;

use App\Models\Acceptance;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustodyBalance;
use App\Models\CustodyLocation;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcceptanceApiTest extends TestCase
{
    use RefreshDatabase;

    private function seedDelivered(): array
    {
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ']);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer A', 'code' => 'CA']);
        $item = CustomerItem::create(['customer_id' => $customer->id, 'name' => 'Velg R17', 'code' => 'VR17']);
        $loc = CustodyLocation::create(['branch_id' => $branch->id, 'code' => 'WH1', 'name' => 'Warehouse 1']);

        $po = \App\Models\CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => 'PO-ACC-01',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);

        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-202610-0001',
            'delivery_date' => '2026-10-04',
            'status' => 'DELIVERED',
        ]);

        $doLine = DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $item->id,
            'quantity' => 10,
            'unit_price_snapshot' => 100.00,
        ]);

        return compact('company', 'branch', 'customer', 'item', 'loc', 'do', 'doLine');
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

    public function test_staff_cannot_create_acceptance(): void
    {
        $s = $this->seedDelivered();
        $staff = $this->makeUser('staff');

        $res = $this->actingAs($staff)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 6,
                'quantity_rejected' => 2,
            ]],
        ]);

        $res->assertStatus(403);
    }

    public function test_admin_full_acceptance_lifecycle(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        $payload = [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 6,
                'quantity_rejected' => 2,
            ]],
        ];

        // Create
        $res = $this->actingAs($admin)->postJson('/api/v1/acceptances', $payload);
        $res->assertStatus(201);
        $this->assertEquals('DRAFT', $res->json('data.status'));
        $this->assertStringStartsWith('ACC-', $res->json('data.acceptance_number'));
        $accId = $res->json('data.id');

        // Submit
        $res2 = $this->actingAs($admin)->postJson("/api/v1/acceptances/$accId/submit");
        $res2->assertOk();
        $this->assertEquals('SUBMITTED', $res2->json('data.status'));

        // Post — should create RETURN_REJECTED custody for rejected qty
        $res3 = $this->actingAs($admin)->postJson("/api/v1/acceptances/$accId/post");
        $res3->assertOk();
        $this->assertEquals('POSTED', $res3->json('data.status'));

        // Verify rejected goods returned to custody
        $this->assertDatabaseHas('custody_ledger', [
            'reference_type' => 'ACCEPTANCE',
            'movement_type' => 'RETURN_REJECTED',
            'quantity_in' => 2,
        ]);
    }

    public function test_partial_acceptance_multiple_rounds(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        // Acceptance #1: OK=6, Reject=2
        $r1 = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 6,
                'quantity_rejected' => 2,
            ]],
        ]);
        $r1->assertStatus(201);
        $acc1Id = $r1->json('data.id');
        $this->actingAs($admin)->postJson("/api/v1/acceptances/$acc1Id/submit")->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/acceptances/$acc1Id/post")->assertOk();

        // Acceptance #2: OK=2, Reject=0 (remaining unresolved)
        $r2 = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 2,
                'quantity_rejected' => 0,
            ]],
        ]);
        $r2->assertStatus(201);
        $acc2Id = $r2->json('data.id');
        $this->actingAs($admin)->postJson("/api/v1/acceptances/$acc2Id/submit")->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/acceptances/$acc2Id/post")->assertOk();

        // Delivery order should be CLOSED (all 10 resolved: 8 OK + 2 reject)
        $do = DeliveryOrder::find($s['do']->id);
        $this->assertEquals('CLOSED', $do->status);
    }

    public function test_over_acceptance_is_rejected(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        // Try to accept more than delivered (10)
        $res = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 8,
                'quantity_rejected' => 5, // 8+5=13 > 10
            ]],
        ]);
        $res->assertStatus(422);
        $this->assertFalse($res->json('success'));
    }

    public function test_acceptance_on_non_delivered_order_fails(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        // Change DO back to DRAFT
        $s['do']->update(['status' => 'DRAFT']);

        $res = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 5,
                'quantity_rejected' => 0,
            ]],
        ]);
        $res->assertStatus(422);
    }

    public function test_cancel_only_draft_acceptance(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        $res = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 3,
                'quantity_rejected' => 0,
            ]],
        ]);
        $accId = $res->json('data.id');

        // Cancel draft OK
        $r2 = $this->actingAs($admin)->postJson("/api/v1/acceptances/$accId/cancel");
        $r2->assertOk();
        $this->assertEquals('CANCELLED', $r2->json('data.status'));
    }

    public function test_audit_trail_logged(): void
    {
        $s = $this->seedDelivered();
        $admin = $this->makeUser('admin');

        $res = $this->actingAs($admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $s['do']->id,
            'company_id' => $s['company']->id,
            'acceptance_date' => '2026-10-04',
            'lines' => [[
                'delivery_order_line_id' => $s['doLine']->id,
                'quantity_ok' => 5,
                'quantity_rejected' => 0,
            ]],
        ]);
        $accId = $res->json('data.id');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CREATE_ACC',
            'entity_type' => 'ACCEPTANCE',
            'entity_id' => $accId,
        ]);
    }
}
