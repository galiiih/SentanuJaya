<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptLine;
use App\Models\ProductionStatus;
use App\Models\User;
use App\Models\Worker;
use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOrderApiTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'username' => strtolower($role) . '_wo_' . fake()->unique()->numerify('###'),
            'email' => strtolower($role) . '_wo_' . fake()->unique()->numerify('###') . '@test.com',
            'password' => 'secret',
            'full_name' => $role,
            'role' => strtoupper($role),
            'is_active' => true,
        ]);
    }

    public function test_work_order_creation_and_posting_enforces_availability(): void
    {
        $admin = $this->user('ADMIN');
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ-WO1', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-WO1']);
        $customer = Customer::create(['company_id' => $company->id, 'code' => 'CUST-01', 'name' => 'Budi Otomotif']);
        $uom = \App\Models\Uom::create(['code' => 'PCS', 'name' => 'Pieces']);
        $item = CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'ITEM-01',
            'name' => 'Front Bumper Civic',
            'uom_id' => $uom->id,
            'is_active' => true,
        ]);

        // Post Goods Receipt for 10 units
        $gr = GoodsReceipt::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'stb_number' => 'STB-2026-001',
            'customer_id' => $customer->id,
            'received_date' => '2026-10-18',
            'status' => 'POSTED',
        ]);
        $grLine = GoodsReceiptLine::create([
            'goods_receipt_id' => $gr->id,
            'customer_item_id' => $item->id,
            'color_code' => 'NH-731P',
            'quantity_received' => 10,
            'condition' => 'GOOD',
        ]);

        // Create Work Order for 12 units (exceeds available 10) -> posting should fail validation
        $response = $this->actingAs($admin)->postJson('/api/v1/work-orders', [
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'wo_number' => 'WO-2026-001',
            'customer_id' => $customer->id,
            'goods_receipt_id' => $gr->id,
            'order_date' => '2026-10-18',
            'lines' => [
                [
                    'goods_receipt_line_id' => $grLine->id,
                    'customer_item_id' => $item->id,
                    'quantity' => 12,
                    'treatment_type' => 'PAINTING',
                ],
            ],
        ]);
        $response->assertStatus(201);
        $woId = $response->json('data.id');

        $postResponse = $this->actingAs($admin)->postJson("/api/v1/work-orders/{$woId}/post");
        $postResponse->assertStatus(422); // Exceeds available quantity

        // Update WO quantity to 6
        $wo = WorkOrder::find($woId);
        $wo->lines()->update(['quantity' => 6]);

        $postResponse2 = $this->actingAs($admin)->postJson("/api/v1/work-orders/{$woId}/post");
        $postResponse2->assertStatus(200);
        $this->assertEquals('IN_PROGRESS', $wo->fresh()->status);
    }

    public function test_qc_inspection_records_pass_and_reject_correctly(): void
    {
        $admin = $this->user('ADMIN');
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ-WO2', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-WO2']);
        $customer = Customer::create(['company_id' => $company->id, 'code' => 'CUST-02', 'name' => 'Soni Variasi']);
        $uom = \App\Models\Uom::create(['code' => 'PCS', 'name' => 'Pieces']);
        $item = CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'ITEM-02',
            'name' => 'Spoiler Brio',
            'uom_id' => $uom->id,
            'is_active' => true,
        ]);

        $wo = WorkOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'wo_number' => 'WO-2026-002',
            'customer_id' => $customer->id,
            'order_date' => '2026-10-18',
            'status' => 'IN_PROGRESS',
            'created_by' => $admin->id,
        ]);
        $line = $wo->lines()->create([
            'customer_item_id' => $item->id,
            'quantity' => 5,
        ]);

        // Record QC Inspection: 4 passed, 1 rejected (total 5)
        $qcResponse = $this->actingAs($admin)->postJson("/api/v1/work-order-lines/{$line->id}/qc-inspections", [
            'quantity_inspected' => 5,
            'quantity_passed' => 4,
            'quantity_rejected' => 1,
            'notes' => 'Minor paint bubble on 1 unit.',
        ]);

        $qcResponse->assertStatus(201);
        $this->assertEquals(4, $line->fresh()->quantity_completed);
        $this->assertEquals(1, $line->fresh()->quantity_rejected);
    }
}
