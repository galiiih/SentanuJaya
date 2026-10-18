<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('company_id');
            $table->uuid('branch_id');
            $table->string('wo_number', 50)->unique();
            $table->uuid('customer_id');
            $table->uuid('goods_receipt_id')->nullable(); // Reference to customer goods receipt (STB)
            $table->date('order_date');
            $table->date('target_date')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, IN_PROGRESS, QC_PENDING, COMPLETED, CANCELLED
            $table->text('notes')->nullable();
            $table->uuid('created_by');
            $table->uuid('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->foreign('goods_receipt_id')->references('id')->on('goods_receipts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('posted_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('work_order_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('work_order_id');
            $table->uuid('goods_receipt_line_id')->nullable(); // specific customer item line received
            $table->uuid('customer_item_id');
            $table->string('color_specification', 100)->nullable();
            $table->string('treatment_type', 100)->nullable(); // painting, finishing, body kit
            $table->decimal('quantity', 12, 3);
            $table->decimal('quantity_completed', 12, 3)->default(0);
            $table->decimal('quantity_rejected', 12, 3)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('cascade');
            $table->foreign('goods_receipt_line_id')->references('id')->on('goods_receipt_lines')->onDelete('set null');
            $table->foreign('customer_item_id')->references('id')->on('customer_items')->onDelete('cascade');
        });

        Schema::create('production_stage_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('work_order_line_id');
            $table->uuid('from_status_id')->nullable();
            $table->uuid('to_status_id');
            $table->decimal('quantity', 12, 3);
            $table->uuid('worker_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by');
            $table->timestamp('moved_at');
            $table->timestamps();

            $table->foreign('work_order_line_id')->references('id')->on('work_order_lines')->onDelete('cascade');
            $table->foreign('from_status_id')->references('id')->on('production_statuses')->onDelete('set null');
            $table->foreign('to_status_id')->references('id')->on('production_statuses')->onDelete('cascade');
            $table->foreign('worker_id')->references('id')->on('workers')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('internal_qc_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('work_order_line_id');
            $table->decimal('quantity_inspected', 12, 3);
            $table->decimal('quantity_passed', 12, 3); // OK
            $table->decimal('quantity_rejected', 12, 3); // REJECT
            $table->string('result', 30); // PASS, FAIL, PARTIAL
            $table->text('notes')->nullable();
            $table->uuid('inspector_id');
            $table->timestamp('inspected_at');
            $table->timestamps();

            $table->foreign('work_order_line_id')->references('id')->on('work_order_lines')->onDelete('cascade');
            $table->foreign('inspector_id')->references('id')->on('users')->onDelete('cascade');
        });

        // Add work_order_id reference to material_usages if not exists or ensure compatibility
        Schema::table('material_usages', function (Blueprint $table) {
            if (!Schema::hasColumn('material_usages', 'work_order_id')) {
                $table->uuid('work_order_id')->nullable()->after('warehouse_id');
                $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('material_usages', function (Blueprint $table) {
            if (Schema::hasColumn('material_usages', 'work_order_id')) {
                $table->dropForeign(['work_order_id']);
                $table->dropColumn('work_order_id');
            }
        });
        Schema::dropIfExists('internal_qc_inspections');
        Schema::dropIfExists('production_stage_movements');
        Schema::dropIfExists('work_order_lines');
        Schema::dropIfExists('work_orders');
    }
};
