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

        // Strict database safety validation: verify driver and exact test database name
        $driver = \DB::connection('pgsql')->getDriverName();
        $dbName = \DB::connection('pgsql')->getDatabaseName();

        if ($driver !== 'pgsql') {
            $this->fail("Database safety check failed: Expected driver 'pgsql', got '{$driver}'.");
        }

        if ($dbName !== 'sentanu_test') {
            $this->fail("Database safety check failed: Expected database 'sentanu_test', but connected to '{$dbName}'. Migration aborted to protect non-test databases.");
        }

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
        $readyFile1 = storage_path('app/concurrency_ready_1.signal');
        $readyFile2 = storage_path('app/concurrency_ready_2.signal');
        $signalFile = storage_path('app/concurrency_start.signal');
        $scriptPath = storage_path('app/concurrency_worker.php');

        // Ensure clean state before start
        @unlink($payloadFile);
        @unlink($readyFile1);
        @unlink($readyFile2);
        @unlink($signalFile);
        @unlink($scriptPath);

        // Worker script using base_path() for robust path resolution and barrier synchronization
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
            "\$readyFile = \$argv[3];\n" .
            "\$signalFile = \$argv[4];\n" .
            "\$data = json_decode(file_get_contents(\$payloadFile), true);\n\n" .
            "// Signal ready\n" .
            "file_put_contents(\$readyFile, 'READY');\n\n" .
            "// Wait for barrier signal with timeout (5 seconds max)\n" .
            "\$start = time();\n" .
            "while (!file_exists(\$signalFile)) {\n" .
            "    if (time() - \$start > 5) {\n" .
            "        echo \"ERROR: Timeout waiting for barrier signal\";\n" .
            "        exit(1);\n" .
            "    }\n" .
            "    usleep(500);\n" .
            "}\n\n" .
            "try {\n" .
            "    \$service = app(App\\Services\\PaymentService::class);\n" .
            "    \$result = \$service->create(\$data, \$userId);\n" .
            "    echo \"SUCCESS:\" . \$result->id;\n" .
            "} catch (\\Throwable \$e) {\n" .
            "    echo \"ERROR:\" . \$e->getMessage() . \" | \" . get_class(\$e) . \" | \" . \$e->getFile() . \":\" . \$e->getLine();\n" .
            "}\n";

        try {
            file_put_contents($payloadFile, json_encode($paymentData));
            file_put_contents($scriptPath, $bootstrapCode);

            $phpBinary = PHP_BINARY;

            $descriptors = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            $cmd1 = escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($payloadFile) . " " . escapeshellarg($admin->id) . " " . escapeshellarg($readyFile1) . " " . escapeshellarg($signalFile);
            $cmd2 = escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($payloadFile) . " " . escapeshellarg($admin->id) . " " . escapeshellarg($readyFile2) . " " . escapeshellarg($signalFile);

            $process1 = proc_open($cmd1, $descriptors, $pipes1);
            $process2 = proc_open($cmd2, $descriptors, $pipes2);

            // Close stdin pipes — workers don't read from stdin
            @fclose($pipes1[0]);
            @fclose($pipes2[0]);

            // Wait until both workers signal READY (max 5 seconds timeout)
            $timeout = 50;
            $ready = false;
            while ($timeout > 0) {
                if (file_exists($readyFile1) && file_exists($readyFile2)) {
                    $ready = true;
                    break;
                }
                usleep(100000); // 100ms
                $timeout--;
            }

            if (!$ready) {
                @proc_terminate($process1);
                @proc_terminate($process2);
                @fclose($pipes1[1]); @fclose($pipes1[2]);
                @fclose($pipes2[1]); @fclose($pipes2[2]);
                @proc_close($process1);
                @proc_close($process2);
                $this->fail('Workers failed to signal READY within timeout.');
            }

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

            // Mark references closed so finally block doesn't double close
            unset($process1, $process2);

            // Assert worker execution success, exit code 0, and clean stderr
            $this->assertEquals(0, $status1, "Worker 1 failed with exit code $status1, stderr: $err1, output: $output1");
            $this->assertEquals(0, $status2, "Worker 2 failed with exit code $status2, stderr: $err2, output: $output2");

            $this->assertEmpty($err1, "Worker 1 produced stderr output: $err1");
            $this->assertEmpty($err2, "Worker 2 produced stderr output: $err2");

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

        } finally {
            if (isset($process1) && is_resource($process1)) {
                @proc_terminate($process1);
                @proc_close($process1);
            }
            if (isset($process2) && is_resource($process2)) {
                @proc_terminate($process2);
                @proc_close($process2);
            }
            @unlink($scriptPath);
            @unlink($signalFile);
            @unlink($payloadFile);
            @unlink($readyFile1);
            @unlink($readyFile2);
        }
    }

    public function test_non_idempotency_unique_violation_is_not_swallowed(): void
    {
        // Real PostgreSQL test: a QueryException from payment_number unique constraint
        // must propagate, NOT be silently caught by the idempotency recovery path.
        try {
            $pdo = \DB::connection('pgsql')->getPdo();
        } catch (\Exception $e) {
            $this->markTestSkipped('PostgreSQL not available: ' . $e->getMessage());
        }

        config(['database.default' => 'pgsql']);
        \DB::purge('pgsql');
        \DB::reconnect('pgsql');

        $dbName = \DB::connection('pgsql')->getDatabaseName();
        if ($dbName !== 'sentanu_test') {
            $this->fail("Database safety check failed: Expected 'sentanu_test', got '{$dbName}'.");
        }

        $this->artisan('migrate:fresh', ['--database' => 'pgsql', '--no-interaction' => true]);

        // Add unique constraint on payment_number — mirrors production intent
        \DB::connection('pgsql')->statement(
            'CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_number_unique ON payments (payment_number)'
        );

        $admin = User::create([
            'username' => 'admin_uv',
            'email' => 'admin_uv@test.com',
            'password' => bcrypt('secret'),
            'full_name' => 'Admin UV',
            'role' => 'ADMIN',
            'is_active' => true,
        ]);

        $company = Company::create(['name' => 'PT UV Test', 'code' => 'UVT', 'tax_id' => '999']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ UV', 'code' => 'HQUV']);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer UV', 'code' => 'CUV']);
        $customerItem = CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'ITEM-UV-001',
            'name' => 'Product UV',
        ]);
        $po = CustomerPo::create(['company_id' => $company->id, 'customer_id' => $customer->id, 'po_number' => 'PO-UV-001', 'po_date' => '2026-10-17']);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-UV-001',
            'delivery_date' => '2026-10-17',
            'status' => 'DELIVERED',
        ]);
        $line = DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $customerItem->id,
            'quantity' => 20,
            'unit_price_snapshot' => 500.00,
        ]);

        $acceptance = Acceptance::create([
            'delivery_order_id' => $do->id,
            'acceptance_number' => 'ACC-UV-001',
            'acceptance_date' => '2026-10-17',
            'status' => 'POSTED',
            'notes' => 'OK',
        ]);
        AcceptanceLine::create([
            'acceptance_id' => $acceptance->id,
            'delivery_order_line_id' => $line->id,
            'quantity_ok' => 20,
            'quantity_rejected' => 0,
        ]);

        $invoiceService = app(InvoiceService::class);
        $invoice = $invoiceService->buildDraftInvoice([$do->id], $customer->id, '2026-10-17', 1, $admin->id);
        $invoiceService->postInvoice($invoice, $admin->id);
        $invoice = $invoice->fresh();

        // Create first payment normally (no idempotency key)
        $service = app(PaymentService::class);
        $payment1 = $service->create([
            'customer_id' => $customer->id,
            'payment_date' => '2026-10-17',
            'method' => 'CASH',
            'amount' => 5000.00,
            'reference_no' => 'REF-UV-001',
            'notes' => 'First payment',
            'allocations' => [
                ['invoice_id' => $invoice->id, 'amount' => 5000.00],
            ],
        ], $admin->id);

        $this->assertNotNull($payment1->id);
        $stolenNumber = $payment1->payment_number;

        // Directly insert a row with the same payment_number to simulate a collision
        // on the payment_number unique constraint (NOT idempotency_key).
        $thrown = false;
        try {
            \DB::connection('pgsql')->table('payments')->insert([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'payment_number' => $stolenNumber, // duplicate!
                'payment_date' => '2026-10-17',
                'method' => 'CASH',
                'amount' => 1000.00,
                'status' => 'POSTED',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (QueryException $e) {
            $thrown = true;
            // Must contain the payment_number constraint, NOT idempotency_key
            $this->assertStringContainsString('payment_number', $e->getMessage(),
                'QueryException should reference payment_number unique constraint.');
            $this->assertTrue(
                str_contains($e->getMessage(), '23505') || str_contains($e->getMessage(), 'UNIQUE'),
                'QueryException should be a unique violation (23505).'
            );
        }

        $this->assertTrue($thrown, 'A QueryException must be thrown for duplicate payment_number — it must NOT be silently swallowed.');

        // Verify only one payment with that number exists
        $count = Payment::on('pgsql')->where('payment_number', $stolenNumber)->count();
        $this->assertEquals(1, $count, 'Only the original payment should exist; the duplicate insert must have been rejected.');
    }
}
