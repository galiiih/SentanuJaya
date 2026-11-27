<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerReturn;
use App\Models\DeliveryOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerReturnApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::create([
            'username' => 'return_admin',
            'email' => 'return_admin@test.com',
            'password' => 'secret',
            'full_name' => 'Return Admin',
            'role' => 'ADMIN',
            'is_active' => true,
        ]);
    }

    public function test_cancel_customer_return_requires_and_persists_draft_status(): void
    {
        $company = Company::create(['name' => 'PT Sentanu', 'code' => 'SJ', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ']);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer A', 'code' => 'CA', 'tax_condition' => 1]);
        $delivery = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'sj_number' => 'SJ-RETURN-0001',
            'delivery_date' => '2026-10-04',
            'status' => DeliveryOrder::STATUS_DELIVERED,
        ]);
        $return = CustomerReturn::create([
            'company_id' => $company->id,
            'delivery_order_id' => $delivery->id,
            'customer_id' => $customer->id,
            'return_number' => 'RET-202610-0001',
            'return_date' => '2026-10-05',
            'status' => 'DRAFT',
            'created_by' => $this->makeAdmin()->id,
        ]);
        $admin = User::where('email', 'return_admin@test.com')->firstOrFail();

        $this->actingAs($admin)
            ->postJson('/api/v1/customer-returns/' . $return->id . '/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'CANCELLED');

        $this->assertDatabaseHas('customer_returns', [
            'id' => $return->id,
            'status' => 'CANCELLED',
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/customer-returns/' . $return->id . '/cancel')
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }
}
