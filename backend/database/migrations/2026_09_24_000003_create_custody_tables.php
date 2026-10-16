<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Custody Locations
        Schema::create('custody_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained('branches');
            $table->string('code', 50);
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Goods Receipts (Surat Terima Barang / STB)
        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('branch_id')->constrained('branches');
            $table->string('stb_number', 100);
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->date('received_date');
            $table->time('received_time')->nullable();
            $table->string('delivered_by_name')->nullable();
            $table->string('vehicle_plate', 30)->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, POSTED, CANCELLED
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();
            $table->uuid('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();

            $table->unique(['company_id', 'stb_number']);
        });

        // Goods Receipt Lines
        Schema::create('goods_receipt_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('goods_receipt_id')->constrained('goods_receipts')->onDelete('cascade');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->string('color_code', 100)->nullable();
            $table->decimal('quantity_received', 18, 3);
            $table->string('condition')->default('GOOD'); // GOOD, DAMAGED
            $table->text('damage_description')->nullable();
            $table->foreignUuid('custody_location_id')->nullable()->constrained('custody_locations');
            $table->timestamps();
        });

        // Custody Ledger (Off-balance sheet pergerakan fisik barang customer)
        Schema::create('custody_ledger', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->string('reference_type', 50); // GOODS_RECEIPT, WORK_ORDER, DELIVERY_ORDER
            $table->uuid('reference_id');
            $table->string('movement_type', 50); // IN_FROM_CUSTOMER, MOVE_TO_PRODUCTION, OUT_TO_CUSTOMER
            $table->decimal('quantity_in', 18, 3)->default(0);
            $table->decimal('quantity_out', 18, 3)->default(0);
            $table->foreignUuid('custody_location_id')->nullable()->constrained('custody_locations');
            $table->string('stage', 50)->default('RAW'); // RAW, PAINT, DRYING, POLISH, QC, PACKING, READY_DELIVERY, DELIVERED
            $table->date('movement_date');
            $table->uuid('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['customer_id', 'customer_item_id', 'movement_date']);
        });

        // Custody Balances (Saldo fisik real-time barang customer)
        Schema::create('custody_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->foreignUuid('custody_location_id')->nullable()->constrained('custody_locations');
            $table->string('stage', 50)->default('RAW');
            $table->decimal('balance_quantity', 18, 3)->default(0);
            $table->timestamp('last_movement_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'customer_item_id', 'custody_location_id', 'stage'], 'custody_bal_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custody_balances');
        Schema::dropIfExists('custody_ledger');
        Schema::dropIfExists('goods_receipt_lines');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('custody_locations');
    }
};
