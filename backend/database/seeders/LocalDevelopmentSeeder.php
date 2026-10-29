<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\CustodyLocation;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\Uom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use LogicException;

class LocalDevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        // if (!app()->environment(['local', 'testing'])) {
        //     throw new LogicException('LocalDevelopmentSeeder hanya boleh dijalankan pada environment local atau testing.');
        // }

        $password = env('SENTANU_DEV_TEST_PASSWORD', 'password123');

        $company = Company::updateOrCreate(['code' => 'SJ-LOCAL'], [
            'name' => 'Sentanu Jaya Local',
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
        ]);
        $branch = Branch::updateOrCreate(['company_id' => $company->id, 'code' => 'HQ'], ['name' => 'Kantor Pusat']);
        $uom = Uom::updateOrCreate(['code' => 'PCS'], ['name' => 'Pcs', 'category' => 'COUNT', 'decimal_places' => 0]);
        $customer = Customer::updateOrCreate(['company_id' => $company->id, 'code' => 'CUST-LOCAL'], [
            'name' => 'Customer Local',
            'tax_condition' => 1,
        ]);
        CustomerItem::updateOrCreate(['customer_id' => $customer->id, 'code' => 'BUMPER-LOCAL'], [
            'name' => 'Bumper Local',
            'uom_id' => $uom->id,
        ]);
        CustodyLocation::updateOrCreate(['branch_id' => $branch->id, 'code' => 'RAW-LOCAL'], ['name' => 'Area Raw Local']);

        foreach (['ADMIN', 'OWNER', 'STAFF'] as $role) {
            User::updateOrCreate(['username' => strtolower($role) . '.local'], [
                'email' => strtolower($role) . '@sentanu.local',
                'full_name' => $role . ' Local',
                'password' => Hash::make($password),
                'role' => $role,
                'is_active' => true,
            ]);
        }
    }
}
