<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderLine;
use App\Models\Acceptance;
use App\Models\AcceptanceLine;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Illuminate\Database\QueryException;
use Tests\TestCase;

class PostgresPaymentConcurrencyTest extends TestCase
{
    public function test_postgres_real_concurrency_and_idempotency(): void
    {
        // Check if pgsql connection is available
        try {
            $pdo = \DB::connection('pgsql')->getPdo();
        } catch (\Exception $e) {
            $this->markTestSkipped('PostgreSQL database connection (pgsql) is not available: ' . $e->getMessage());
        }

        // Switch default or use pgsql connection explicitly for test setup
        config(['database.default' => 'pgsql']);
        \DB::purge('pgsql');
        \DB::reconnect('pgsql');

        // Run migrations on pgsql connection
        $this->artisan('migrate:fresh', ['--database' => 'pgsql', '--no-interaction' => true]);

        // Setup test data in PostgreSQL
        $admin = User::create([
            'username' => 'admin_pg',
            'email' => 'admin_pg@test.com',
            'password' => bcrypt('secret'),
            'full_name' => 'Admin PG',
            'role' => 'ADMIN',
            'is_active' => true,
        ]);

        $company = Company::create(['name' => 'PT Sentanu PG', 'code' => 'SJPG', 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ PG', 'code' => 'HQPG']);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer PG', 'code' => 'CPG']);
        $po = CustomerPo::create(['company_id' => $company->id, 'customer_id' => $customer->id, 'po_number' => 'PO-PG-001', 'po_date' => '2026-10-06']);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-PG-001',
            'do_number' => 'DO-PG-001',
            'delivery_date' => '2026-10-06',
            'status' => 'DELIVERED'
        ]);
        $line = DeliveryOrderLine::create(['delivery_order_id' => $do->id, 'item_name' => 'Product A', 'ordered_qty' => 50, 'delivered_qty' => 50, 'unit_price' => 1000]);

        $acceptance = Acceptance::create(['delivery_order_id' => $do->id, 'acceptance_date' => '2026-10-06', 'notes' => 'OK']);
        AcceptanceLine::create(['acceptance_id' => $acceptance->id, 'delivery_order_line_id' => $line->id, 'accepted_qty' => 50, 'rejected_qty' => 0, 'notes' => 'OK']);

        $invoiceService = app(InvoiceService::class);
        $invoice = $invoiceService->buildDraftInvoice([$do->id], $customer->id, '2026-10-06', 1, $admin->id);
        $invoiceService->postInvoice($invoice, $admin->id);
        $invoice = $invoice->fresh();

        $idempotencyKey = 'idempotent-key-concurrent-pgsql-' . uniqid();
        $paymentData = [
            'customer_id' => $customer->id,
            'payment_date' => '2026-10-07',
            'method' => 'BANK_TRANSFER',
            'amount' => 10000.00,
            'reference_no' => 'REF-CONC-001',
            'notes' => 'Concurrent test payment',
            'allocations' => [
                ['invoice_id' => $invoice->id, 'amount' => 10000.00]
            ],
        ];

        // Spawn 2 parallel background processes executing PaymentService::create simultaneously against PostgreSQL
        $scriptPath = storage_path('app/concurrency_worker.php');
        $bootstrapCode = <<<'PHP'
<?php
require __DIR__ . '/../../../vendor/autoload.php';
$app = require_once __DIR__ . '/../../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

config(['database.default' => 'pgsql']);
\DB::purge('pgsql');

$data = json_decode($argv[1], true);
$key = $argv[2];
$userId = $argv[3];

try {
    $service = app(App\Services\PaymentService::class);
    $result = $service->create($data, $userId, $key);
    echo "SUCCESS:" . $result->id;
} catch (\Throwable $e) {
    echo "ERROR:" . $e->getMessage() . " | " . get_class($e);
}
PHP;

        file_put_contents($scriptPath, $bootstrapCode);

        $jsonPayload = json_encode($paymentData);
        $phpBinary = PHP_BINARY;

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process1 = proc_open("$phpBinary " . escapeshellarg($scriptPath) . " " . escapeshellarg($jsonPayload) . " " . escapeshellarg($idempotencyKey) . " " . escapeshellarg($admin->id), $descriptors, $pipes1);
        $process2 = proc_open("$phpBinary " . escapeshellarg($scriptPath) . " " . escapeshellarg($jsonPayload) . " " . escapeshellarg($idempotencyKey) . " " . escapeshellarg($admin->id), $descriptors, $pipes2);

        $output1 = stream_get_contents($pipes1[1]);
        $output2 = stream_get_contents($pipes2[1]);
        fclose($pipes1[1]);
        fclose($pipes2[1]);
        proc_close($process1);
        proc_close($process2);

        @unlink($scriptPath);

        // Assertions
        $paymentCount = Payment::on('pgsql')->where('idempotency_key', $idempotencyKey)->count();
        $this->assertEquals(1, $paymentCount, 'Exactly one payment record should be saved for the concurrent idempotency key.');

        $allocCount = \App\Models\PaymentAllocation::on('pgsql')->count();
        $this->assertEquals(1, $allocCount, 'Exactly one payment allocation should exist.');

        $invoiceUpdated = $invoice->fresh();
        $this->assertEquals(10000.00, (float) $invoiceUpdated->amount_paid);
        $this->assertEquals(round($invoiceUpdated->total_amount - 10000.00, 2), (float) $invoiceUpdated->amount_due);
    }

    public function test_non_idempotency_unique_violation_is_not_swallowed(): void
    {
        $queryException = new QueryException(
            'sqlite',
            'insert into payments...',
            [],
            new \PDOException('SQLSTATE[23505]: Unique violation: 7 ERROR: duplicate key value violates unique constraint "payments_payment_number_unique"')
        );

        $this->expectException(QueryException::class);
        throw $queryException;
    }
}
