<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Warehouses (Gudang Material)
        Schema::create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'code']);
        });

        // 2. Material Receipts (Penerimaan Material dari Supplier)
        Schema::create('material_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignUuid('warehouse_id')->constrained('warehouses');
            $table->string('receipt_number', 50)->unique();
            $table->foreignUuid('supplier_id')->constrained('suppliers');
            $table->date('receipt_date');
            $table->string('reference_no', 100)->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, POSTED, CANCELLED
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->foreignUuid('posted_by')->nullable()->constrained('users');
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });

        // 3. Material Receipt Lines
        Schema::create('material_receipt_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('material_receipt_id')->constrained('material_receipts')->onDelete('cascade');
            $table->foreignUuid('material_id')->constrained('materials');
            $table->string('batch_number', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('quantity', 18, 3);
            $table->foreignUuid('uom_id')->constrained('uoms');
            $table->decimal('unit_cost', 18, 2)->default(0);
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->timestamps();
        });

        // 4. Material Batches
        Schema::create('material_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('material_id')->constrained('materials');
            $table->string('batch_number', 100);
            $table->date('received_date');
            $table->date('expiry_date')->nullable();
            $table->decimal('quantity_received', 18, 3);
            $table->decimal('quantity_remaining', 18, 3);
            $table->decimal('unit_cost', 18, 2)->default(0);
            $table->string('status', 30)->default('ACTIVE'); // ACTIVE, EXHAUSTED, EXPIRED
            $table->timestamps();

            $table->unique(['material_id', 'batch_number']);
        });

        // 5. Material Usages / Issues (Pengeluaran Material untuk Produksi / Operasional)
        Schema::create('material_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignUuid('warehouse_id')->constrained('warehouses');
            $table->string('usage_number', 50)->unique();
            $table->date('usage_date');
            $table->string('reference_type', 50)->nullable(); // WORK_ORDER, GENERAL, ADJUSTMENT
            $table->uuid('reference_id')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, POSTED, CANCELLED
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->foreignUuid('posted_by')->nullable()->constrained('users');
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });

        // 6. Material Usage Lines
        Schema::create('material_usage_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('material_usage_id')->constrained('material_usages')->onDelete('cascade');
            $table->foreignUuid('material_id')->constrained('materials');
            $table->foreignUuid('batch_id')->nullable()->constrained('material_batches');
            $table->decimal('quantity', 18, 3);
            $table->foreignUuid('uom_id')->constrained('uoms');
            $table->decimal('unit_cost_snapshot', 18, 2)->default(0);
            $table->timestamps();
        });

        // 7. Stocks (Saldo Stok per Warehouse & Material)
        Schema::create('stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->onDelete('cascade');
            $table->foreignUuid('material_id')->constrained('materials')->onDelete('cascade');
            $table->decimal('quantity_on_hand', 18, 3)->default(0);
            $table->decimal('average_unit_cost', 18, 2)->default(0);
            $table->decimal('total_value', 18, 2)->default(0);
            $table->timestamp('last_movement_at')->nullable();
            $table->timestamps();

            $table->unique(['warehouse_id', 'material_id']);
        });

        // 8. Stock Movements (Stock Ledger / Stock Card)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('warehouse_id')->constrained('warehouses');
            $table->foreignUuid('material_id')->constrained('materials');
            $table->foreignUuid('batch_id')->nullable()->constrained('material_batches');
            $table->string('movement_type', 50); // IN_PURCHASE, OUT_PRODUCTION, ADJUSTMENT, etc.
            $table->string('reference_type', 50)->nullable();
            $table->uuid('reference_id')->nullable();
            $table->decimal('quantity_in', 18, 3)->default(0);
            $table->decimal('quantity_out', 18, 3)->default(0);
            $table->decimal('unit_cost', 18, 2)->default(0);
            $table->decimal('value_in', 18, 2)->default(0);
            $table->decimal('value_out', 18, 2)->default(0);
            $table->decimal('balance_qty_after', 18, 3)->default(0);
            $table->decimal('balance_value_after', 18, 2)->default(0);
            $table->date('movement_date');
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stocks');
        Schema::dropIfExists('material_usage_lines');
        Schema::dropIfExists('material_usages');
        Schema::dropIfExists('material_batches');
        Schema::dropIfExists('material_receipt_lines');
        Schema::dropIfExists('material_receipts');
        Schema::dropIfExists('warehouses');
    }
};
