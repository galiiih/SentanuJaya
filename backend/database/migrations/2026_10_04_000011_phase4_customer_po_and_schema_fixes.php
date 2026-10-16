<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Customer PO entity (prerequisite for proper FK)
        Schema::create('customer_pos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->string('po_number', 100);
            $table->date('po_date');
            $table->date('expected_delivery_date')->nullable();
            $table->string('status', 30)->default('OPEN'); // OPEN, CLOSED, CANCELLED
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();

            $table->unique(['company_id', 'po_number']);
        });

        Schema::create('customer_po_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_po_id')->constrained('customer_pos')->onDelete('cascade');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->string('color_code', 100)->nullable();
            $table->decimal('quantity', 18, 3);
            $table->decimal('unit_price', 18, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. Fix delivery_orders.status default DELIVERED → DRAFT (cross-DB compatible)
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->string('status', 30)->default('DRAFT')->change();
        });

        // 3. Add customer_po_id FK to delivery_orders and customer_po_line_id to delivery_order_lines
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->foreignUuid('customer_po_id')->nullable()->after('customer_id')->constrained('customer_pos');
        });

        Schema::table('delivery_order_lines', function (Blueprint $table) {
            $table->foreignUuid('customer_po_line_id')->nullable()->after('delivery_order_id')->constrained('customer_po_lines');
        });

        // 4. Fix acceptances.status default POSTED → DRAFT
        Schema::table('acceptances', function (Blueprint $table) {
            $table->string('status', 30)->default('DRAFT')->change();
        });

        // 5. Add evidence_reference text field to acceptances (keep evidence_attachment_id as legacy)
        Schema::table('acceptances', function (Blueprint $table) {
            $table->text('evidence_reference')->nullable()->after('evidence_attachment_id');
        });
    }

    public function down(): void
    {
        Schema::table('acceptances', function (Blueprint $table) {
            $table->dropColumn('evidence_reference');
        });

        Schema::table('delivery_order_lines', function (Blueprint $table) {
            $table->dropForeign(['customer_po_line_id']);
            $table->dropColumn('customer_po_line_id');
        });

        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropForeign(['customer_po_id']);
            $table->dropColumn('customer_po_id');
        });

        Schema::table('acceptances', function (Blueprint $table) {
            $table->string('status', 30)->default('POSTED')->change();
        });

        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->string('status', 30)->default('DELIVERED')->change();
        });

        Schema::dropIfExists('customer_po_lines');
        Schema::dropIfExists('customer_pos');
    }
};
