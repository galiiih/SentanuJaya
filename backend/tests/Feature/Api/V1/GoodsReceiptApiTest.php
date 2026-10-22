<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\CustodyLocation;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\GoodsReceipt;
use App\Models\Uom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GoodsReceiptApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_submit_or_post_goods_receipt(): void
    {
        $receipt = $this->makeDraftReceipt();

        $this->postJson("/api/v1/goods-receipts/{$receipt->id}/submit")->assertStatus(401);
        $this->postJson("/api/v1/goods-receipts/{$receipt->id}/post")->assertStatus(401);
    }

    public function test_staff_cannot_submit_or_post_goods_receipt(): void
    {
        $receipt = $this->makeDraftReceipt();
        $staff = $this->makeUser('STAFF');

        $this->actingAs($staff)->postJson("/api/v1/goods-receipts/{$receipt->id}/submit")->assertStatus(403);
        $this->actingAs($staff)->postJson("/api/v1/goods-receipts/{$receipt->id}/post")->assertStatus(403);
    }

    public function test_admin_can_create_submit_and_post_goods_receipt_with_optional_photo(): void
    {
        $data = $this->makeDomain();
        $admin = $this->makeUser('ADMIN');
        $id = $this->createDraft($admin, $data);

        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$id}/submit")
            ->assertOk()->assertJsonPath('data.status', 'SUBMITTED');
        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$id}/post")
            ->assertOk()->assertJsonPath('data.status', 'POSTED');

        $this->assertDatabaseHas('custody_ledger', [
            'reference_id' => $id,
            'movement_type' => 'IN_FROM_CUSTOMER',
            'stage' => 'RAW',
            'quantity_in' => 2,
            'quantity_out' => 0,
        ]);
        $this->assertDatabaseHas('custody_balances', [
            'customer_id' => $data['customer']->id,
            'customer_item_id' => $data['item']->id,
            'custody_location_id' => $data['location']->id,
            'stage' => 'RAW',
            'balance_quantity' => 2,
        ]);
        $this->assertDatabaseHas('audit_logs', ['entity_id' => $id, 'action' => 'POST_STB']);
    }

    public function test_owner_can_submit_and_post_goods_receipt(): void
    {
        $data = $this->makeDomain();
        $owner = $this->makeUser('OWNER');
        $id = $this->createDraft($owner, $data);

        $this->actingAs($owner)->postJson("/api/v1/goods-receipts/{$id}/submit")->assertOk();
        $this->actingAs($owner)->postJson("/api/v1/goods-receipts/{$id}/post")->assertOk();
        $this->assertDatabaseHas('goods_receipts', ['id' => $id, 'status' => 'POSTED']);
    }

    public function test_draft_can_be_updated_and_cancelled_but_submitted_cannot_be_changed_or_deleted(): void
    {
        $data = $this->makeDomain();
        $admin = $this->makeUser('ADMIN');
        $id = $this->createDraft($admin, $data);
        $lineId = GoodsReceipt::findOrFail($id)->lines()->value('id');

        $this->actingAs($admin)->patchJson("/api/v1/goods-receipts/{$id}", [
            'notes' => 'Kondisi diperbarui.',
            'lines' => [['id' => $lineId, 'condition' => 'CRACK']],
        ])->assertOk()->assertJsonPath('data.lines.0.condition', 'CRACK');
        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$id}/cancel")
            ->assertOk()->assertJsonPath('data.status', 'CANCELLED');

        $submitted = $this->createDraft($admin, $this->makeDomain());
        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$submitted}/submit")->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/goods-receipts/{$submitted}", ['notes' => 'Tidak boleh'])
            ->assertStatus(422);
        $this->actingAs($admin)->deleteJson("/api/v1/goods-receipts/{$submitted}")->assertStatus(409);
        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$submitted}/cancel")->assertStatus(422);
    }

    public function test_validation_rejects_invalid_condition_and_non_positive_quantity(): void
    {
        $data = $this->makeDomain();
        $admin = $this->makeUser('ADMIN');
        $payload = $this->draftPayload($data);
        $payload['lines'][0]['condition'] = 'DAMAGED';
        $payload['lines'][0]['quantity_received'] = 0;

        $this->actingAs($admin)->postJson('/api/v1/goods-receipts', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lines.0.condition', 'lines.0.quantity_received']);
        $this->assertDatabaseCount('goods_receipts', 0);
    }

    public function test_rejects_customer_item_owned_by_another_customer_without_partial_creation(): void
    {
        $data = $this->makeDomain();
        $otherCustomer = Customer::create([
            'company_id' => $data['company']->id,
            'code' => 'CUST-OTHER',
            'name' => 'Customer Lain',
            'tax_condition' => 1,
        ]);
        $otherItem = CustomerItem::create([
            'customer_id' => $otherCustomer->id,
            'code' => 'ITEM-OTHER',
            'name' => 'Barang Lain',
            'uom_id' => $data['uom']->id,
        ]);
        $admin = $this->makeUser('ADMIN');
        $payload = $this->draftPayload($data);
        $payload['lines'][0]['customer_item_id'] = $otherItem->id;

        $this->actingAs($admin)->postJson('/api/v1/goods-receipts', $payload)->assertStatus(422);
        $this->assertDatabaseCount('goods_receipts', 0);
        $this->assertDatabaseCount('custody_ledger', 0);
    }

    public function test_post_rejects_invalid_lifecycle_without_ledger_entries(): void
    {
        $data = $this->makeDomain();
        $admin = $this->makeUser('ADMIN');
        $id = $this->createDraft($admin, $data);

        $this->actingAs($admin)->postJson("/api/v1/goods-receipts/{$id}/post")->assertStatus(422);
        $this->assertDatabaseHas('goods_receipts', ['id' => $id, 'status' => 'DRAFT']);
        $this->assertDatabaseCount('custody_ledger', 0);
        $this->assertDatabaseCount('custody_balances', 0);
    }

    public function test_generated_stb_numbers_are_unique_per_company_and_month(): void
    {
        $data = $this->makeDomain();
        $admin = $this->makeUser('ADMIN');
        $first = $this->createDraft($admin, $data);
        $second = $this->createDraft($admin, $data);

        $this->assertNotSame(
            GoodsReceipt::findOrFail($first)->stb_number,
            GoodsReceipt::findOrFail($second)->stb_number,
        );
    }

    private function createDraft(User $user, array $data): string
    {
        return $this->actingAs($user)->postJson('/api/v1/goods-receipts', $this->draftPayload($data))
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'DRAFT')
            ->json('data.id');
    }

    private function draftPayload(array $data): array
    {
        return [
            'company_id' => $data['company']->id,
            'branch_id' => $data['branch']->id,
            'customer_id' => $data['customer']->id,
            'received_date' => '2026-10-02',
            'lines' => [[
                'customer_item_id' => $data['item']->id,
                'quantity_received' => 2,
                'condition' => 'DENT',
                'custody_location_id' => $data['location']->id,
            ]],
        ];
    }

    private function makeDraftReceipt(): GoodsReceipt
    {
        $data = $this->makeDomain();
        return GoodsReceipt::create([
            'company_id' => $data['company']->id,
            'branch_id' => $data['branch']->id,
            'stb_number' => 'STB-202610-0001',
            'customer_id' => $data['customer']->id,
            'received_date' => '2026-10-02',
            'status' => 'DRAFT',
        ]);
    }

    private function makeDomain(): array
    {
        $company = Company::create(['code' => 'SJ-' . fake()->unique()->numerify('####'), 'name' => 'Sentanu Jaya', 'timezone' => 'Asia/Jakarta', 'currency' => 'IDR']);
        $branch = Branch::create(['company_id' => $company->id, 'code' => 'HQ-' . fake()->unique()->numerify('####'), 'name' => 'Kantor Pusat']);
        $uom = Uom::firstOrCreate(['code' => 'PCS'], ['name' => 'Pcs', 'category' => 'QUANTITY', 'decimal_places' => 0]);
        $customer = Customer::create(['company_id' => $company->id, 'code' => 'CUST-' . fake()->unique()->numerify('####'), 'name' => 'Customer Satu', 'tax_condition' => 1]);
        $item = CustomerItem::create(['customer_id' => $customer->id, 'code' => 'ITEM-' . fake()->unique()->numerify('####'), 'name' => 'Bumper', 'uom_id' => $uom->id]);
        $location = CustodyLocation::create(['branch_id' => $branch->id, 'code' => 'RAW-' . fake()->unique()->numerify('####'), 'name' => 'Raw Area']);

        return compact('company', 'branch', 'uom', 'customer', 'item', 'location');
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'username' => strtolower($role) . '-' . fake()->unique()->numerify('####'),
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'full_name' => $role . ' User',
            'role' => $role,
        ]);
    }
}
