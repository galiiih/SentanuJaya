<?php

namespace Database\\Seeders;

use App\\Models\\ErpDocumentationCategory;
use Illuminate\\Database\\Seeder;

class ErpDocumentationCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['dashboard', 'Dashboard', 'Operational overview, key indicators, and ERP activity monitoring.'],
            ['master-data', 'Master Data', 'Management of company, branch, warehouse, customer, material, and reference data.'],
            ['customer-po', 'Customer PO', 'Recording and managing customer purchase orders.'],
            ['material-inventory', 'Material & Inventory', 'Material and warehouse data, stock balances, receipts, consumption, and inventory movements.'],
            ['work-order-production', 'Work Order & Production', 'Management of work orders and production process stages.'],
            ['quality-control', 'Quality Control', 'Recording quality inspections and QC results.'],
            ['surat-jalan', 'Delivery Note', 'Creating, submitting, and recording goods deliveries.'],
            ['invoice', 'Invoice', 'Billing based on delivery notes and invoice tax information.'],
            ['payment', 'Payment', 'Recording payments and allocating them to outstanding invoices.'],
            ['financial-reports', 'Financial Reports', 'Financial statements, accounts receivable, and transaction summaries.'],
            ['user-management-rbac', 'User Management & RBAC', 'Application users, roles, and access permissions.'],
            ['template-management', 'Template Management', 'Managing document templates and template versions.'],
            ['troubleshooting', 'Troubleshooting', 'Guides for diagnosing and resolving application issues.'],
            ['faq', 'FAQ', 'Frequently asked questions about using Sentanu Jaya ERP.'],
        ];

        foreach ($categories as $index => [$slug, $name, $description]) {
            ErpDocumentationCategory::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'description' => $description,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );
        }
    }
}
