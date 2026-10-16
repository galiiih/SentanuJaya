<?php

namespace Tests\Feature\Api\V1;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderLine;
use App\Models\Acceptance;
use App\Models\AcceptanceLine;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Illuminate\Database\QueryException;
use Tests\TestCase;

class PostgresPaymentConcurrencyTest extends TestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

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
        $customerItem = CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'ITEM-PG-001',
            'name' => 'Product A',
        ]);
        $po = CustomerPo::create(['company_id' => $company->id, 'customer_id' => $customer->id, 'po_number' => 'PO-PG-001', 'po_date' => '2026-10-06']);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-PG-001',
            'delivery_date' => '2026-10-06',
            'status' => 'DELIVERED'
        ]);
        $line = DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $customerItem->id,
            'quantity' => 50,
            'unit_price_snapshot' => 200.00,
        ]);

        $acceptance = Acceptance::create([
            'delivery_order_id' => $do->id,
            'acceptance_number' => 'ACC-PG-001',
            'acceptance_date' => '2026-10-06',
            'status' => 'POSTED',
            'notes' => 'OK'
        ]);
        AcceptanceLine::create([
            'acceptance_id' => $acceptance->id,
            'delivery_order_line_id' => $line->id,
            'quantity_ok' => 50,
            'quantity_rejected' => 0,
        ]);

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
            'idempotency_key' => $idempotencyKey,
            'allocations' => [
                ['invoice_id' => $invoice->id, 'amount' => 10000.00]
            ],
        ];

        $payloadFile = storage_path('app/payment_payload.json');
        file_put_contents($payloadFile, json_encode($paymentData));

        // Setup synchronization barrier signal file
        $signalFile = storage_path('app/concurrency_start.signal');
        if (file_exists($signalFile)) {
            @unlink($signalFile);
        }

        // Worker script using base_path() for robust path resolution and barrier synchronization
        $scriptPath = storage_path('app/concurrency_worker.php');
        $autoloadPath = base_path('vendor/autoload.php');
        $bootstrapPath = base_path('bootstrap/app.php');

        $bootstrapCode = "<?php\n" .
            "require '{$autoloadPath}';\n" .
            "\$app = require_once '{$bootstrapPath}';\n" .
            "\$kernel = \$app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n" .
            "\$kernel->bootstrap();\n\n" .
            "config(['database.default' => 'pgsql']);\n" .
            "\\DB::purge('pgsql');\n\n" .
            "\$payloadFile = \$argv[1];\n" .
            "\$userId = \$argv[2];\n" .
            "\$signalFile = \$argv[3];\n" .
            "\$data = json_decode(file_get_contents(\$payloadFile), true);\n\n" .
            "// Wait for barrier signal\n" .
            "while (!file_exists(\$signalFile)) {\n" .
            "    usleep(500);\n" .
            "}\n\n" .
            "try {\n" .
            "    \$service = app(App\\Services\\PaymentService::class);\n" .
            "    \$result = \$service->create(\$data, \$userId);\n" .
            "    echo \"SUCCESS:\" . \$result->id;\n" .
            "} catch (\\Throwable \$e) {\n" .
            "    echo \"ERROR:\" . \$e->getMessage() . \" | \" . get_class(\$e) . \" | \" . \$e->getFile() . \":\" . \$e->getLine();\n" .
            "}\n";

        file_put_contents($scriptPath, $bootstrapCode);

        $phpBinary = PHP_BINARY;

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $cmd = escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($payloadFile) . " " . escapeshellarg($admin->id) . " " . escapeshellarg($signalFile);

        $process1 = proc_open($cmd, $descriptors, $pipes1);
        $process2 = proc_open($cmd, $descriptors, $pipes2);

        // Trigger barrier simultaneously
        file_put_contents($signalFile, 'GO');

        $output1 = stream_get_contents($pipes1[1]);
        $err1 = stream_get_contents($pipes1[2]);
        $output2 = stream_get_contents($pipes2[1]);
        $err2 = stream_get_contents($pipes2[2]);

        fclose($pipes1[1]);
        fclose($pipes1[2]);
        fclose($pipes2[1]);
        fclose($pipes2[2]);

        $status1 = proc_close($process1);
        $status2 = proc_close($process2);

        @unlink($scriptPath);
        @unlink($signalFile);
        @unlink($payloadFile);

        // Assert worker execution success, exit code 0, and no errors
        $this->assertEquals(0, $status1, "Worker 1 failed with exit code $status1, stderr: $err1, output: $output1");
        $this->assertEquals(0, $status2, "Worker 2 failed with exit code $status2, stderr: $err2, output: $output2");

        $this->assertStringContainsString('SUCCESS:', $output1, "Worker 1 did not succeed. Output: $output1 | Stderr: $err1");
        $this->assertStringContainsString('SUCCESS:', $output2, "Worker 2 did not succeed. Output: $output2 | Stderr: $err2");

        // Extract payment ids from outputs
        preg_match('/SUCCESS:(.+)/', $output1, $match1);
        preg_match('/SUCCESS:(.+)/', $output2, $match2);
        $paymentId1 = trim($match1[1] ?? '');
        $paymentId2 = trim($match2[1] ?? '');
        $this->assertNotEmpty($paymentId1);
        $this->assertNotEmpty($paymentId2);
        $this->assertEquals($paymentId1, $paymentId2, 'Both concurrent requests must return the same payment ID due to idempotency.');

        // Database assertions: exactly one payment record for this idempotency key
        $payments = Payment::on('pgsql')->where('idempotency_key', $idempotencyKey)->get();
        $this->assertCount(1, $payments, 'Exactly one payment record should be saved for the concurrent idempotency key.');
        $payment = $payments->first();
        $this->assertEquals($paymentId1, $payment->id);

        // Exactly one allocation associated with this payment
        $allocations = PaymentAllocation::on('pgsql')->where('payment_id', $payment->id)->get();
        $this->assertCount(1, $allocations, 'Exactly one payment allocation should exist for this payment.');
        $this->assertEquals(10000.00, (float) $allocations->first()->allocated_amount);

        // Invoice amount_paid and amount_due updated exactly once
        $invoiceUpdated = $invoice->fresh();
        $this->assertEquals(10000.00, (float) $invoiceUpdated->amount_paid);
        $this->assertEquals(round($invoiceUpdated->total_amount - 10000.00, 2), (float) $invoiceUpdated->amount_due);
    }

    public function test_non_idempotency_unique_violation_is_not_swallowed(): void
    {
    $queryException = new QueryException(
        'pgsql',
        'insert into payments...',
        [],
        new \PDOException('SQLSTATE[23505]: Unique violation: 7 ERROR: duplicate key value violates unique constraint "payments_payment_number_unique"')
    );

    $service = app(PaymentService::class);

    $this->expectException(QueryException::class);

    \DB::shouldReceive('transaction')
        ->once()
        ->andThrow($queryException);

    $service->create([
        'customer_id' => '00000000-0000-0000-0000-000000000000',
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 1000.00,
        'idempotency_key' => 'some-key',
        'allocations' => []
    ], '00000000-0000-0000-0000-000000000000');
}
}
