<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\CustomerPoLine;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPoApiTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private Customer $customer;
    private CustomerItem $item1;
    private CustomerItem $item2;
    private User $staff;
    private User $admin;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create(['code' => 'SJ', 'name' => 'PT Sentanu Jaya']);
        $this->branch = Branch::create(['company_id' => $this->company->id, 'code' => 'HQ', 'name' => 'Headquarters']);
        $this->customer = Customer::create(['company_id' => $this->company->id, 'code' => 'CUST01', 'name' => 'PT Auto Parts']);
        
        $this->item1 = CustomerItem::create([
            'customer_id' => $this->customer->id,
            'code' => 'ITEM01',
            'name' => 'Front Bumper',
        ]);
        $this->item2 = CustomerItem::create([
            'customer_id' => $this->customer->id,
            'code' => 'ITEM02',
            'name' => 'Rear Wing',
        ]);

        $this->staff = User::create([
            'username' => 'staff',
            'email' => 'staff@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Staff User',
            'role' => 'STAFF',
        ]);

        $this->admin = User::create([
            'username' => 'admin',
            'email' => 'admin@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Admin User',
            'role' => 'ADMIN',
        ]);

        $this->owner = User::create([
            'username' => 'owner',
            'email' => 'owner@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'Owner User',
            'role' => 'OWNER',
        ]);
    }

    public function test_staff_can_create_customer_po_draft(): void
    {
        $response = $this->actingAs($this->staff)->postJson('/api/v1/customer-pos', [
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-001',
            'po_date' => '2026-10-01',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'quantity' => 10, 'unit_price' => 50000],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.po_number', 'PO-2026-001');

        $this->assertDatabaseHas('customer_pos', [
            'po_number' => 'PO-2026-001',
            'status' => 'DRAFT',
        ]);
    }

    public function test_admin_and_owner_can_activate_customer_po(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-002',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);
        $po->lines()->create([
            'customer_item_id' => $this->item1->id,
            'quantity' => 10,
            'unit_price' => 50000,
        ]);

        // Staff cannot activate
        $this->actingAs($this->staff)->postJson("/api/v1/customer-pos/{$po->id}/activate")
            ->assertStatus(403);

        // Admin can activate
        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po->id}/activate")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'OPEN');
    }

    public function test_delivery_order_requires_customer_po_and_matches_customer(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-003',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = CustomerPoLine::create([
            'customer_po_id' => $po->id,
            'customer_item_id' => $this->item1->id,
            'quantity' => 10,
        ]);

        // Attempt creation without Customer PO -> must fail validation
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'quantity' => 4],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['customer_po_id']);

        // Success with valid Customer PO
        $response = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('delivery_orders', [
            'customer_po_id' => $po->id,
            'status' => 'DRAFT',
        ]);
    }

    public function test_delivery_quantity_cannot_exceed_remaining_po_quantity(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-LIMIT',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = CustomerPoLine::create([
            'customer_po_id' => $po->id,
            'customer_item_id' => $this->item1->id,
            'quantity' => 10,
        ]);

        // First delivery: 7 items (Remaining = 3)
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 7],
            ],
        ])->assertStatus(201);

        // Second delivery attempt: 4 items (Total 11 > 10) -> Must FAIL
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-06',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ])->assertStatus(422);

        // Second delivery attempt: 3 items (Total 10 == 10) -> Must PASS
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-06',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 3],
            ],
        ])->assertStatus(201);
    }

    public function test_cancelled_delivery_order_reverts_consumed_quantity(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CANCEL',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = CustomerPoLine::create([
            'customer_po_id' => $po->id,
            'customer_item_id' => $this->item1->id,
            'quantity' => 10,
        ]);

        $res = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ]);
        $doId = $res->json('data.id');

        $this->assertEquals(6, $poLine->fresh()->remaining_quantity);

        // Cancel Delivery Order
        $this->actingAs($this->admin)->postJson("/api/v1/delivery-orders/{$doId}/cancel")
            ->assertStatus(200);

        // Remaining quantity should revert to 10
        $this->assertEquals(10, $poLine->fresh()->remaining_quantity);
    }

    public function test_historical_integrity_blocks_modifying_referenced_customer_po(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-HIST',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = CustomerPoLine::create([
            'customer_po_id' => $po->id,
            'customer_item_id' => $this->item1->id,
            'quantity' => 10,
        ]);

        // Link Delivery Order
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ])->assertStatus(201);

        // Attempting to change PO number or customer on referenced PO must fail
        $otherCustomer = Customer::create(['company_id' => $this->company->id, 'code' => 'CUST02', 'name' => 'PT Motor Indah']);

        $this->actingAs($this->staff)->patchJson("/api/v1/customer-pos/{$po->id}", [
            'customer_id' => $otherCustomer->id,
        ])->assertStatus(422);

        // Attempting to reduce PO line quantity below delivered (4) must fail
        $this->actingAs($this->staff)->patchJson("/api/v1/customer-pos/{$po->id}", [
            'lines' => [
                ['id' => $poLine->id, 'customer_item_id' => $this->item1->id, 'quantity' => 3],
            ],
        ])->assertStatus(422);
    }

    public function test_permanent_deletion_of_customer_po_is_forbidden(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-DEL',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);

        $this->actingAs($this->admin)->deleteJson("/api/v1/customer-pos/{$po->id}")
            ->assertStatus(403);
    }

    public function test_staff_can_edit_customer_po_draft(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-EDIT',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);

        $this->actingAs($this->staff)->patchJson("/api/v1/customer-pos/{$po->id}", [
            'notes' => 'Updated draft notes',
        ])->assertStatus(200)->assertJsonPath('data.notes', 'Updated draft notes');
    }

    public function test_owner_can_activate_customer_po(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-OWNER',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);
        $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->owner)->postJson("/api/v1/customer-pos/{$po->id}/activate")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'OPEN');
    }

    public function test_draft_po_can_be_cancelled(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CANCEL-DRAFT',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);

        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po->id}/cancel")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CANCELLED');
    }

    public function test_active_po_with_active_sj_cannot_be_cancelled(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-BLOCK-CANCEL',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ])->assertStatus(201);

        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po->id}/cancel")
            ->assertStatus(422);
    }

    public function test_active_po_with_no_fulfillment_can_be_cancelled_and_closed(): void
    {
        $po1 = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-OPEN-CANCEL',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po1->id}/cancel")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CANCELLED');

        $po2 = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-OPEN-CLOSE',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po2->id}/close")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'CLOSED');
    }

    public function test_customer_mismatch_is_rejected(): void
    {
        $otherCust = Customer::create(['company_id' => $this->company->id, 'code' => 'CUST03', 'name' => 'PT Trans Nusantara']);
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $otherCust->id,
            'po_number' => 'PO-2026-MISMATCH',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id, // Mismatched customer!
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
    }

    public function test_po_line_from_another_po_is_rejected(): void
    {
        $po1 = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-P1',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $po2 = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-P2',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine2 = $po2->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po1->id, // Passing PO 1
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine2->id, 'quantity' => 2], // Line from PO 2!
            ],
        ])->assertStatus(422);
    }

    public function test_customer_item_mismatch_with_po_line_is_rejected(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-ITEM-MISMATCH',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine1 = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item2->id, 'customer_po_line_id' => $poLine1->id, 'quantity' => 2], // item2 vs poLine1 (item1)!
            ],
        ])->assertStatus(422);
    }

    public function test_rejected_acceptance_does_not_replenish_po_quantity(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-REJECT',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        // Deliver 10
        $res = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 10],
            ],
        ]);
        $doId = $res->json('data.id');
        $doLineId = $res->json('data.lines.0.id');

        // Deliver DO
        $this->actingAs($this->admin)->postJson("/api/v1/delivery-orders/{$doId}/deliver");

        // Record Acceptance with 2 REJECTED
        $this->actingAs($this->admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $doId,
            'acceptance_number' => 'ACC-2026-001',
            'acceptance_date' => '2026-10-06',
            'lines' => [
                ['delivery_order_line_id' => $doLineId, 'quantity_ok' => 8, 'quantity_rejected' => 2],
            ],
        ]);

        // PO remaining quantity MUST still be 0 (rejected goods returned to Sentanu, not replenished to PO remaining)
        $this->assertEquals(0, $poLine->fresh()->remaining_quantity);
    }

    public function test_quantity_boundary_exact_remaining_passes(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-BOUNDARY',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 10],
            ],
        ])->assertStatus(201);

        $this->assertEquals(0, $poLine->fresh()->remaining_quantity);
    }

    public function test_quantity_one_above_remaining_fails(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-OVER-ONE',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 11],
            ],
        ])->assertStatus(422);
    }

    public function test_closed_po_cannot_be_used_by_sj(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CLOSED',
            'po_date' => '2026-10-01',
            'status' => 'CLOSED',
        ]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
    }

    public function test_closed_po_cannot_be_edited(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CLOSED-EDIT',
            'po_date' => '2026-10-01',
            'status' => 'CLOSED',
        ]);

        $this->actingAs($this->admin)->patchJson("/api/v1/customer-pos/{$po->id}", [
            'notes' => 'Blocked',
        ])->assertStatus(422);
    }

    public function test_invalid_lifecycle_transition_rejected(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-TRANS-1',
            'po_date' => '2026-10-01',
            'status' => 'DRAFT',
        ]);

        // Cannot close a DRAFT PO (only OPEN can be closed)
        $this->actingAs($this->admin)->postJson("/api/v1/customer-pos/{$po->id}/close")
            ->assertStatus(422)->assertJsonPath('message', 'Cannot close PO with status DRAFT. Only OPEN POs can be closed.');
    }

    public function test_cancelled_po_cannot_be_used_by_sj(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CANCELLED-USAGE',
            'po_date' => '2026-10-01',
            'status' => 'CANCELLED',
        ]);

        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
    }

    public function test_cancelled_sj_does_not_consume_po_quantity(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CANCEL-REVIVE',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $res = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 4],
            ],
        ]);
        $doId = $res->json('data.id');
        $this->assertEquals(6, $poLine->fresh()->remaining_quantity);

        $this->actingAs($this->admin)->postJson("/api/v1/delivery-orders/{$doId}/cancel")
            ->assertStatus(200);

        $res2 = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-06',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 6],
            ],
        ])->assertStatus(201);
    }

    public function test_rejected_acceptance_full_lifecycle_does_not_replenish_po_quantity(): void
    {
        $loc = \App\Models\CustodyLocation::create(['branch_id' => $this->branch->id, 'code' => 'WH-TEST', 'name' => 'Warehouse Test']);
        \App\Models\CustodyBalance::create([
            'customer_id' => $this->customer->id,
            'customer_item_id' => $this->item1->id,
            'custody_location_id' => $loc->id,
            'stage' => 'RAW',
            'balance_quantity' => 10,
        ]);

        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-REJECT-NOREPLENISH',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        $res = $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 6, 'unit_price' => 100],
            ],
        ])->assertStatus(201);
        $doId = $res->json('data.id');
        $doLineId = $res->json('data.lines.0.id');

        $this->assertEquals(4, $poLine->fresh()->remaining_quantity);

        // Advance DO to DELIVERED
        $this->actingAs($this->admin)->postJson("/api/v1/delivery-orders/{$doId}/submit")->assertOk();
        $this->actingAs($this->admin)->postJson("/api/v1/delivery-orders/{$doId}/deliver")->assertOk();

        // Create acceptance with reject
        $accRes = $this->actingAs($this->admin)->postJson('/api/v1/acceptances', [
            'delivery_order_id' => $doId,
            'acceptance_date' => '2026-10-06',
            'lines' => [
                [
                    'delivery_order_line_id' => $doLineId,
                    'quantity_ok' => 2,
                    'quantity_rejected' => 4,
                    'reject_reason' => 'Defect',
                ],
            ],
        ])->assertStatus(201);
        $accId = $accRes->json('data.id');

        $this->actingAs($this->admin)->postJson("/api/v1/acceptances/{$accId}/submit")->assertOk();
        $this->actingAs($this->admin)->postJson("/api/v1/acceptances/{$accId}/post")->assertOk();

        // Check remaining PO quantity: must remain 4, NOT replenished back to 8!
        $this->assertEquals(4, $poLine->fresh()->remaining_quantity);

        // Verify Invoiceable Quantity calculation logic: Only accepted-OK quantity (2) is invoiceable, not rejected (4) or delivered (6)
        $invoiceService = app(\App\Services\InvoiceService::class);
        $draftInvoice = $invoiceService->buildDraftInvoice(
            deliveryOrderIds: [$doId],
            customerId: $this->customer->id,
            invoiceDate: '2026-10-07',
            taxCondition: 1, // STANDARD_11
            actorId: $this->admin->id
        );

        $this->assertEquals(2, $draftInvoice->lines()->first()->quantity);
        $this->assertEquals(200.0, (float) $draftInvoice->subtotal);
    }

    public function test_over_fulfillment_rejected_by_backend(): void
    {
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-OVERFILL',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $poLine = $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 5]);

        // First DO takes 3
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 3],
            ],
        ])->assertStatus(201);

        // Second DO tries 3 → only 2 remaining → 422
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-06',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 3],
            ],
        ])->assertStatus(422);

        // Second DO with exactly 2 → OK
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-06',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $poLine->id, 'quantity' => 2],
            ],
        ])->assertStatus(201);
    }

    public function test_invalid_customer_po_combination_rejected(): void
    {
        // Create PO for customer A
        $po = CustomerPo::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'po_number' => 'PO-2026-CUST-MISMATCH',
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $po->lines()->create(['customer_item_id' => $this->item1->id, 'quantity' => 10]);

        // Create a different customer
        $otherCustomer = \App\Models\Customer::create(['company_id' => $this->company->id, 'code' => 'OTHER-CUST', 'name' => 'Other Customer']);

        // Try to create DO with otherCustomer but original PO → 422
        $this->actingAs($this->staff)->postJson('/api/v1/delivery-orders', [
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $otherCustomer->id,
            'customer_po_id' => $po->id,
            'delivery_date' => '2026-10-05',
            'lines' => [
                ['customer_item_id' => $this->item1->id, 'customer_po_line_id' => $po->lines->first()->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
    }
}
