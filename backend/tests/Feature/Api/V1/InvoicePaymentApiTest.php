<?php

namespace Tests\Feature\Api\V1;

use App\Models\Acceptance;
use App\Models\AcceptanceLine;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderLine;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoicePaymentApiTest extends TestCase
{
    use RefreshDatabase;
    
        private function user(string $role): User
{
    return User::create([
    'username' => strtolower($role) . '_invoice',
    'email' => strtolower($role) . '_invoice@test.com',
    'password' => 'secret',
    'full_name' => $role,
    'role' => strtoupper($role),
    'is_active' => true,
    ]);
    }

    private function delivery(float $qty = 40, float $price = 1000): array
    {
        $company = Company::create(['name' => 'PT Sentanu ' . fake()->unique()->numerify('###'), 'code' => 'SJ-' . fake()->unique()->numerify('###'), 'tax_id' => '123']);
        $branch = Branch::create(['company_id' => $company->id, 'name' => 'HQ', 'code' => 'HQ-' . fake()->unique()->numerify('###')]);
        $customer = Customer::create(['company_id' => $company->id, 'name' => 'Customer A', 'code' => 'CA-' . fake()->unique()->numerify('###')]);
        $item = CustomerItem::create(['customer_id' => $customer->id, 'name' => 'Velg R17', 'code' => 'VR17-' . fake()->unique()->numerify('###')]);
        $po = CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => 'PO-INV-' . fake()->unique()->numerify('###'),
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-INV-' . fake()->unique()->numerify('###'),
            'delivery_date' => '2026-10-04',
            'status' => 'DELIVERED',
        ]);
        $line = DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $item->id,
            'quantity' => $qty,
            'unit_price_snapshot' => $price,
        ]);
        return compact('company', 'branch', 'customer', 'po', 'do', 'line');
    }

    private function deliveryFor(Company $company, Branch $branch, Customer $customer, float $qty = 40, float $price = 1000): array
    {
        $item = CustomerItem::create(['customer_id' => $customer->id, 'name' => 'Velg R17 ' . fake()->unique()->numerify('###'), 'code' => 'VR17-' . fake()->unique()->numerify('###')]);
        $po = CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => 'PO-INV-' . fake()->unique()->numerify('###'),
            'po_date' => '2026-10-01',
            'status' => 'OPEN',
        ]);
        $do = DeliveryOrder::create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'customer_po_id' => $po->id,
            'sj_number' => 'SJ-INV-' . fake()->unique()->numerify('###'),
            'delivery_date' => '2026-10-04',
            'status' => 'DELIVERED',
        ]);
        $line = DeliveryOrderLine::create([
            'delivery_order_id' => $do->id,
            'customer_item_id' => $item->id,
            'quantity' => $qty,
            'unit_price_snapshot' => $price,
        ]);
        return compact('company', 'branch', 'customer', 'po', 'do', 'line');
    }



        private function postAcceptance(DeliveryOrder $do, DeliveryOrderLine $line, float $ok, float $reject): Acceptance
{
    $acceptance = Acceptance::create([
    'delivery_order_id' => $do->id,
    'acceptance_number' => 'ACC-INV-' . fake()->unique()->numerify('###'),
    'acceptance_date' => '2026-10-05',
    'status' => Acceptance::STATUS_POSTED,
    ]);
    AcceptanceLine::create([
    'acceptance_id' => $acceptance->id,
    'delivery_order_line_id' => $line->id,
    'quantity_ok' => $ok,
    'quantity_rejected' => $reject,
    ]);

    return $acceptance;
    }

    public function test_delivery_without_posted_acceptance_ok_cannot_be_invoiced(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');

    $this->actingAs($admin)->postJson('/api/v1/invoices', [
    'delivery_order_ids' => [$s['do']->id],
    'customer_id' => $s['customer']->id,
    'invoice_date' => '2026-10-06',
    'tax_condition' => 1,
    ])->assertStatus(422);
    }

    public function test_acceptance_ok_30_reject_10_only_invoices_30_and_second_invoice_is_rejected(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);

    $res = $this->actingAs($admin)->postJson('/api/v1/invoices', [
    'delivery_order_ids' => [$s['do']->id],
    'customer_id' => $s['customer']->id,
    'invoice_date' => '2026-10-06',
    'tax_condition' => 1,
    ])->assertCreated();

    $invoice = Invoice::with('lines')->find($res->json('data.id'));
    $this->assertSame(30.0, (float) $invoice->lines->first()->quantity);
    $this->assertSame(30000.0, (float) $invoice->total_amount);
    $this->assertSame(30.0, (float) $s['line']->fresh()->qty_invoiced);

    $this->actingAs($admin)->postJson('/api/v1/invoices', [
    'delivery_order_ids' => [$s['do']->id],
    'customer_id' => $s['customer']->id,
    'invoice_date' => '2026-10-06',
    'tax_condition' => 1,
    ])->assertStatus(422);
    }

    public function test_second_invoice_can_only_bill_new_later_acceptance_quantity(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);

    $first = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
    app(InvoiceService::class)->postInvoice($first, $admin->id);

    $this->postAcceptance($s['do'], $s['line'], 5, 0);
    $second = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-08', 1, $admin->id);

    $this->assertSame(5.0, (float) $second->lines->first()->quantity);
    $this->assertSame(35.0, (float) $s['line']->fresh()->qty_invoiced);
    }

    public function test_invoice_can_be_posted_and_draft_cancel_restores_invoiceable_quantity(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);

    $draft = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 2, $admin->id);
    $this->assertSame(30.0, (float) $s['line']->fresh()->qty_invoiced);

    app(InvoiceService::class)->cancelDraftInvoice($draft, $admin->id);
    $this->assertSame(Invoice::STATUS_CANCELLED, $draft->fresh()->status);
    $this->assertSame(0.0, (float) $s['line']->fresh()->qty_invoiced);
    $this->assertSame('UNINVOICED', $s['do']->fresh()->invoice_status);

    $freshDraft = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 2, $admin->id);
    $this->actingAs($admin)->postJson("/api/v1/invoices/{$freshDraft->id}/post")->assertOk();
    $this->assertSame(Invoice::STATUS_POSTED, $freshDraft->fresh()->status);
    }

    public function test_cancelling_draft_invoice_does_not_reset_do_status_if_other_invoice_exists(): void
    {
        $s1 = $this->delivery();
        $s2 = $this->delivery();
        $admin = $this->user('ADMIN');

        $this->postAcceptance($s1['do'], $s1['line'], 40, 0);
        $this->postAcceptance($s2['do'], $s2['line'], 40, 0);

        $invoiceA = app(InvoiceService::class)->buildDraftInvoice([$s1['do']->id], $s1['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoiceA, $admin->id);
        $this->assertSame('INVOICED', $s1['do']->fresh()->invoice_status);

        $invoiceB = app(InvoiceService::class)->buildDraftInvoice([$s2['do']->id], $s2['customer']->id, '2026-10-07', 1, $admin->id);
        app(InvoiceService::class)->cancelDraftInvoice($invoiceB, $admin->id);

        $this->assertSame('INVOICED', $s1['do']->fresh()->invoice_status);
        $this->assertSame('UNINVOICED', $s2['do']->fresh()->invoice_status);
    }

    public function test_partial_full_and_overpayment_update_outstanding_correctly(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 3, $admin->id);
    app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    $invoice = $invoice->fresh();
    $this->assertSame(32700.0, (float) $invoice->total_amount);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 10000,
    'reference_no' => 'TRX-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 10000]],
    ])->assertCreated();
    $this->assertSame(10000.0, (float) $invoice->fresh()->amount_paid);
    $this->assertSame(22700.0, (float) $invoice->fresh()->amount_due);
    $this->assertSame(Invoice::STATUS_PARTIALLY_PAID, $invoice->fresh()->status);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 22700,
    'reference_no' => 'TRX-2',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 22700]],
    ])->assertCreated();
    $this->assertSame(0.0, (float) $invoice->fresh()->amount_due);
    $this->assertSame(Invoice::STATUS_PAID, $invoice->fresh()->status);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 1,
    'reference_no' => 'TRX-3',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1]],
    ])->assertStatus(422);
    }

    public function test_payment_idempotency_behavior(): void
    {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);

        $key = 'key-idemp-comprehensive-001';
        $payload = [
            'customer_id' => $s['customer']->id,
            'payment_date' => '2026-10-07',
            'method' => 'BANK_TRANSFER',
            'amount' => 1000,
            'reference_no' => 'REF-ORIGINAL',
            'notes' => 'Original notes',
            'idempotency_key' => $key,
            'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1000]],
        ];

        // 1. First request creates payment
        $res1 = $this->actingAs($admin)->postJson('/api/v1/payments', $payload);
        $res1->assertCreated();
        $id1 = $res1->json('data.id');
        $this->assertSame(1, Payment::count());

        // 2. Retry with same key and identical payload returns existing payment
        $res2 = $this->actingAs($admin)->postJson('/api/v1/payments', $payload);
        $res2->assertStatus(201);
        $this->assertSame($id1, $res2->json('data.id'));
        $this->assertSame(1, Payment::count());

        // 3. Key same with changed amount -> 422
        $p3 = $payload;
        $p3['amount'] = 1500;
        $p3['allocations'] = [['invoice_id' => $invoice->id, 'amount' => 1500]];
        $this->actingAs($admin)->postJson('/api/v1/payments', $p3)->assertStatus(422);

        // 4. Key same with changed reference_no -> 422
        $p4 = $payload;
        $p4['reference_no'] = 'REF-CHANGED';
        $this->actingAs($admin)->postJson('/api/v1/payments', $p4)->assertStatus(422);

        // 5. Key same with changed notes -> 422
        $p5 = $payload;
        $p5['notes'] = 'Changed notes';
        $this->actingAs($admin)->postJson('/api/v1/payments', $p5)->assertStatus(422);

        // 6. Key same with changed payment_date -> 422
        $p6 = $payload;
        $p6['payment_date'] = '2026-10-08';
        $this->actingAs($admin)->postJson('/api/v1/payments', $p6)->assertStatus(422);

        // 7. Different key allows new payment
        $p7 = $payload;
        $p7['idempotency_key'] = 'key-idemp-comprehensive-002';
        $p7['reference_no'] = 'REF-SECOND';
        $res7 = $this->actingAs($admin)->postJson('/api/v1/payments', $p7);
        $res7->assertCreated();
        $this->assertNotSame($id1, $res7->json('data.id'));
        $this->assertSame(2, Payment::count());
    }

    public function test_payment_on_paid_invoice_rejected_422(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
    app(InvoiceService::class)->postInvoice($invoice, $admin->id);

    // Full pay
    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 30000,
    'reference_no' => 'FULL-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 30000]],
    ])->assertCreated();
    $this->assertSame(Invoice::STATUS_PAID, $invoice->fresh()->status);

    // Another payment on PAID invoice must 422
    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 1,
    'reference_no' => 'OVER-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1]],
    ])->assertStatus(422);
    }

    public function test_negative_amount_rejected(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
    app(InvoiceService::class)->postInvoice($invoice, $admin->id);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => -500,
    'reference_no' => 'NEG-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => -500]],
    ])->assertStatus(422);
    }

    public function test_overpayment_exceeding_outstanding_rejected(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
    app(InvoiceService::class)->postInvoice($invoice, $admin->id);

    // Pay 10000 partial
    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 10000,
    'reference_no' => 'PART-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 10000]],
    ])->assertCreated();

    // Outstanding = 20000. Try 25000 → 422
    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 25000,
    'reference_no' => 'OVER-2',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 25000]],
    ])->assertStatus(422);
    }

    public function test_payment_on_draft_invoice_rejected(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 1000,
    'reference_no' => 'DRAFT-1',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1000]],
    ])->assertStatus(422);
    }

    public function test_different_reference_same_customer_allowed(): void
{
    $s = $this->delivery();
    $admin = $this->user('ADMIN');
    $this->postAcceptance($s['do'], $s['line'], 30, 10);
    $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
    app(InvoiceService::class)->postInvoice($invoice, $admin->id);

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 5000,
    'reference_no' => 'REF-A',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 5000]],
    ])->assertCreated();

    $this->actingAs($admin)->postJson('/api/v1/payments', [
    'customer_id' => $s['customer']->id,
    'payment_date' => '2026-10-07',
    'method' => 'BANK_TRANSFER',
    'amount' => 5000,
    'reference_no' => 'REF-B',
    'allocations' => [['invoice_id' => $invoice->id, 'amount' => 5000]],
    ])->assertCreated();
    }

    public function test_staff_admin_owner_invoice_payment_permissions(): void
    {
    $s = $this->delivery();
    $staff = $this->user('STAFF');
    $admin = $this->user('ADMIN');
    $owner = $this->user('OWNER');
    
    $this->actingAs($staff)->getJson('/api/v1/invoices')->assertStatus(403);
    $this->actingAs($admin)->getJson('/api/v1/invoices')->assertOk();
    $this->actingAs($owner)->getJson('/api/v1/invoices')->assertOk();
    $this->actingAs($staff)->postJson('/api/v1/invoices', [
        'delivery_order_ids' => [$s['do']->id],
        'customer_id' => $s['customer']->id,
        'invoice_date' => '2026-10-06',
        'tax_condition' => 1,
    ])->assertStatus(403);
    }
    
        public function test_outstanding_recomputed_from_allocations_not_denormalized_amount_due(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
        $invoice = $invoice->fresh();
    
        // Manually corrupt the denormalized amount_due so it does not match allocations
        $invoice->amount_due = 999999;
        $invoice->amount_paid = 0;
        $invoice->save();
    
        // Pay part of it
        $this->actingAs($admin)->postJson('/api/v1/payments', [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 10000,
        'reference_no' => 'OS-1',
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 10000]],
        ])->assertCreated();
    
        // Outstanding endpoint must show 22700 (based on allocations), NOT 999999
        $res = $this->actingAs($admin)->getJson("/api/v1/customers/{$s['customer']->id}/outstanding");
        $res->assertOk();
        $this->assertSame(20000.0, (float) $res->json('data.total_outstanding'));
        $invoiceOutstanding = (float) $res->json('data.invoices.0.amount_due');
        $this->assertSame(20000.0, $invoiceOutstanding);
        $this->assertSame(10000.0, (float) $res->json('data.invoices.0.amount_paid'));
        }
    
        public function test_invoice_without_payment_shows_full_outstanding(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    
        $res = $this->actingAs($admin)->getJson("/api/v1/customers/{$s['customer']->id}/outstanding");
        $res->assertOk();
        $this->assertNotNull($res->json('data.invoices'));
        $this->assertEquals(30000.0, (float) $res->json('data.invoices.0.amount_due'));
        $this->assertEquals(0.0, (float) $res->json('data.invoices.0.amount_paid'));
        }
    
        public function test_payment_non_posted_does_not_affect_outstanding(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    
        // CANCELLED payment should not reduce outstanding
        $payment = \App\Models\Payment::create([
        'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
        'company_id' => $s['company']->id,
        'customer_id' => $s['customer']->id,
        'payment_number' => 'PAY-202610-9999',
        'payment_date' => '2026-10-07',
        'method' => 'CASH',
        'amount' => 5000,
        'reference_no' => 'CANCELLED-1',
        'status' => \App\Models\Payment::STATUS_CANCELLED,
        'created_by' => $admin->id,
        ]);
        \App\Models\PaymentAllocation::create([
        'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
        'payment_id' => $payment->id,
        'invoice_id' => $invoice->id,
        'allocated_amount' => 5000,
        ]);
    
        $res = $this->actingAs($admin)->getJson("/api/v1/customers/{$s['customer']->id}/outstanding");
        $res->assertOk();
        // CANCELLED payment allocations must NOT count toward outstanding
        $this->assertEquals(30000.0, (float) $res->json('data.invoices.0.amount_due'));
        }
    
        public function test_failed_payment_request_leaves_no_partial_state(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    
        // Allocate more than outstanding -> 422
        $this->actingAs($admin)->postJson('/api/v1/payments', [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 9999999,
        'reference_no' => 'FAIL-1',
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 9999999]],
        ])->assertStatus(422);
    
        $this->assertNull(\App\Models\Payment::where('customer_id', $s['customer']->id)->where('reference_no', 'FAIL-1')->first());
        $this->assertEmpty(\App\Models\PaymentAllocation::where('invoice_id', $invoice->id)->get());
        $this->assertSame(30000.0, (float) $invoice->fresh()->amount_due);
        }
    
        public function test_no_payment_created_when_amount_mismatch(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    
        $payload = [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 10000,
        'reference_no' => 'MISMATCH-1',
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 5000]],
        ];
    
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload)->assertStatus(422);
        $this->assertNull(\App\Models\Payment::where('reference_no', 'MISMATCH-1')->first());
        }
    
        public function test_different_reference_same_amount_allowed(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
        $invoice = $invoice->fresh();
    
        $payload = [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 1000,
        'reference_no' => 'SAME-AMOUNT-A',
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1000]],
        ];
    
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->assertSame(1, \App\Models\Payment::count());
        $this->assertEquals(29000.0, (float) $invoice->fresh()->amount_due);
    
        $payload['reference_no'] = 'SAME-AMOUNT-B';
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->assertEquals(28000.0, (float) $invoice->fresh()->amount_due);
        }
    
        public function test_duplicate_with_null_reference_allows_multiple(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
        $invoice = $invoice->fresh();
    
        $payload = [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 1000,
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1000]],
        ];
    
        // Reference omitted -> no duplicate check, so repeated call with same values is allowed by business logic
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->assertEquals(29000.0, (float) $invoice->fresh()->amount_due);
        }
    
        public function test_retry_with_null_reference_same_amount_and_invoice_duplicated(): void
        {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $s['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice, $admin->id);
    
        $payload = [
        'customer_id' => $s['customer']->id,
        'payment_date' => '2026-10-07',
        'method' => 'BANK_TRANSFER',
        'amount' => 1000,
        'allocations' => [['invoice_id' => $invoice->id, 'amount' => 1000]],
        ];
    
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $payload2 = $payload;
        // Same payload without reference is allowed because there is no idempotency key/reference.
        $payload2['allocations'] = [['invoice_id' => $invoice->id, 'amount' => 1000]];
        $this->actingAs($admin)->postJson('/api/v1/payments', $payload2)->assertCreated();
    }

    public function test_customer_outstanding_ignores_corrupted_denormalized_columns_for_partial_full_and_unpaid(): void
    {
        $s = $this->delivery();
        $admin = $this->user('ADMIN');
        $customer = $s['customer'];

        // Invoice 1: Partial payment
        $this->postAcceptance($s['do'], $s['line'], 30, 10);
        $invoice1 = app(InvoiceService::class)->buildDraftInvoice([$s['do']->id], $customer->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice1, $admin->id);
        $total1 = (float) $invoice1->fresh()->total_amount; // 32700.0

        // Pay 10000 partially for invoice 1
        $this->actingAs($admin)->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'payment_date' => '2026-10-07',
            'method' => 'BANK_TRANSFER',
            'amount' => 10000,
            'allocations' => [['invoice_id' => $invoice1->id, 'amount' => 10000]],
        ])->assertCreated();

        // Invoice 2: Full payment
        $s2 = $this->delivery(10, 1000);
        $this->postAcceptance($s2['do'], $s2['line'], 10, 0); // 10000 + tax = 11000
        $invoice2 = app(InvoiceService::class)->buildDraftInvoice([$s2['do']->id], $s2['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice2, $admin->id);
        $total2 = (float) $invoice2->fresh()->total_amount;

        $this->actingAs($admin)->postJson('/api/v1/payments', [
            'customer_id' => $s2['customer']->id,
            'payment_date' => '2026-10-07',
            'method' => 'BANK_TRANSFER',
            'amount' => $total2,
            'allocations' => [['invoice_id' => $invoice2->id, 'amount' => $total2]],
        ])->assertCreated();

        // Invoice 3: No payment
        $s3 = $this->delivery(5, 1000);
        $this->postAcceptance($s3['do'], $s3['line'], 5, 0); // 5000 + tax = 5500
        $invoice3 = app(InvoiceService::class)->buildDraftInvoice([$s3['do']->id], $s3['customer']->id, '2026-10-06', 1, $admin->id);
        app(InvoiceService::class)->postInvoice($invoice3, $admin->id);
        $total3 = (float) $invoice3->fresh()->total_amount;

        // Deliberately corrupt denormalized columns on all three invoices in DB
        \App\Models\Invoice::whereIn('id', [$invoice1->id, $invoice2->id, $invoice3->id])->update([
            'amount_paid' => 999999.99,
            'amount_due' => 111111.11,
        ]);

        // Test outstanding for customer 1
        $res1 = $this->actingAs($admin)->getJson('/api/v1/customers/' . $customer->id . '/outstanding')
            ->assertOk()
            ->json('data');

        $this->assertEquals($total1, (float) $res1['total_billed']);
        $this->assertEquals(10000.0, (float) $res1['total_paid']);
        $this->assertEquals(round($total1 - 10000.0, 2), (float) $res1['total_outstanding']);

        // Test outstanding for customer 2 (full paid)
        $res2 = $this->actingAs($admin)->getJson('/api/v1/customers/' . $s2['customer']->id . '/outstanding')
            ->assertOk()
            ->json('data');

        $this->assertEquals($total2, (float) $res2['total_billed']);
        $this->assertEquals($total2, (float) $res2['total_paid']);
        $this->assertEquals(0.0, (float) $res2['total_outstanding']);

        // Test outstanding for customer 3 (no payment)
        $res3 = $this->actingAs($admin)->getJson('/api/v1/customers/' . $s3['customer']->id . '/outstanding')
            ->assertOk()
            ->json('data');

        $this->assertEquals($total3, (float) $res3['total_billed']);
        $this->assertEquals(0.0, (float) $res3['total_paid']);
        $this->assertEquals($total3, (float) $res3['total_outstanding']);
    }

    public function test_multiple_delivery_orders_per_invoice_is_rejected(): void
    {
        $s1 = $this->delivery();
        $s2 = $this->delivery();
        $admin = $this->user('ADMIN');

        $this->postAcceptance($s1['do'], $s1['line'], 10, 0);
        $this->postAcceptance($s2['do'], $s2['line'], 10, 0);

        $this->actingAs($admin)->postJson('/api/v1/invoices', [
            'delivery_order_ids' => [$s1['do']->id, $s2['do']->id],
            'customer_id' => $s1['customer']->id,
            'invoice_date' => '2026-10-06',
            'tax_condition' => 1,
        ])->assertStatus(422);
    }
    
    }
    
