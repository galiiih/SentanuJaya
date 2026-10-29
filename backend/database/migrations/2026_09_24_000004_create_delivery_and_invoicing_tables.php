<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Delivery Orders (Surat Jalan Pengiriman)
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('branch_id')->constrained('branches');
            $table->string('sj_number', 100);
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->string('customer_po_number', 100)->nullable();
            $table->date('delivery_date');
            $table->string('vehicle_plate', 30)->nullable();
            $table->string('receiver_name')->nullable();
            $table->string('status', 30)->default('DELIVERED'); // DRAFT, DELIVERED, ACCEPTED, CANCELLED
            $table->string('invoice_status', 30)->default('UNINVOICED'); // UNINVOICED, INVOICED
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();

            $table->unique(['company_id', 'sj_number']);
        });

        Schema::create('delivery_order_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders')->onDelete('cascade');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->string('color_code', 100)->nullable();
            $table->decimal('quantity', 18, 3);
            $table->decimal('unit_price_snapshot', 18, 4); // Snapshot harga price list saat pengiriman
            $table->decimal('qty_accepted', 18, 3)->default(0);
            $table->decimal('qty_rejected', 18, 3)->default(0);
            $table->decimal('qty_invoiced', 18, 3)->default(0);
            $table->timestamps();
        });

        // Customer Acceptances (Pengakuan Penerimaan Resmi dari Tim QC Customer)
        Schema::create('acceptances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders');
            $table->string('acceptance_number', 100);
            $table->date('acceptance_date');
            $table->string('accepted_by_name')->nullable();
            $table->string('evidence_attachment_id')->nullable(); // Copy Surat Jalan fisik yang ditandatangani/distempel
            $table->string('status', 30)->default('POSTED'); // DRAFT, POSTED, REJECTED
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();
        });

        Schema::create('acceptance_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('acceptance_id')->constrained('acceptances')->onDelete('cascade');
            $table->foreignUuid('delivery_order_line_id')->constrained('delivery_order_lines');
            $table->decimal('quantity_ok', 18, 3); // Menjadi dasar Billable Quantity & Revenue Recognition
            $table->decimal('quantity_rejected', 18, 3)->default(0);
            $table->text('reject_reason')->nullable();
            $table->timestamps();
        });

        // Invoices (Tagihan Penagihan Customer — N Surat Jalan → 1 Invoice)
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('branch_id')->constrained('branches');
            $table->string('invoice_number', 100);
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->date('invoice_date');
            $table->date('due_date');
            $table->foreignUuid('tax_rule_id')->nullable()->constrained('tax_rules');
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('discount_amount', 18, 2)->default(0);
            $table->decimal('dpp', 18, 2)->default(0); // Dasar Pengenaan Pajak
            $table->decimal('ppn_amount', 18, 2)->default(0);
            $table->decimal('pph_amount', 18, 2)->default(0);
            $table->decimal('total_amount', 18, 2)->default(0); // Net Invoice Total (Subtotal + PPN - PPh)
            $table->decimal('amount_paid', 18, 2)->default(0);
            $table->decimal('amount_due', 18, 2)->default(0);
            $table->string('status', 30)->default('DRAFT'); // DRAFT, POSTED, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED
            $table->timestamp('posted_at')->nullable();
            $table->uuid('posted_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'invoice_number']);
        });

        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignUuid('delivery_order_line_id')->constrained('delivery_order_lines');
            $table->string('description');
            $table->decimal('quantity', 18, 3); // Terkunci pada Accepted Quantity OK
            $table->decimal('unit_price_snapshot', 18, 4);
            $table->decimal('subtotal', 18, 2);
            $table->timestamps();
        });

        // Invoice - Delivery Order Mapping (Melacak Surat Jalan mana saja yang digabung dalam Invoice)
        Schema::create('invoice_delivery_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders');
            $table->decimal('amount_billed', 18, 2);
            $table->timestamps();
        });

        // Payments (Pembayaran Pembayaran Customer)
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->string('payment_number', 100);
            $table->date('payment_date');
            $table->string('method', 50); // CASH, BANK_TRANSFER
            $table->decimal('amount', 18, 2);
            $table->string('reference_no')->nullable();
            $table->string('status', 30)->default('POSTED');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignUuid('invoice_id')->constrained('invoices');
            $table->decimal('allocated_amount', 18, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_delivery_links');
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('acceptance_lines');
        Schema::dropIfExists('acceptances');
        Schema::dropIfExists('delivery_order_lines');
        Schema::dropIfExists('delivery_orders');
    }
};
