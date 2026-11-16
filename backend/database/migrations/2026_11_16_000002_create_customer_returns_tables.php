<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders');
            $table->foreignUuid('customer_id')->constrained('customers');
            $table->string('return_number', 100);
            $table->date('return_date');
            $table->string('status', 30)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'return_number']);
        });

        Schema::create('customer_return_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_return_id')->constrained('customer_returns')->cascadeOnDelete();
            $table->foreignUuid('delivery_order_line_id')->constrained('delivery_order_lines');
            $table->decimal('quantity', 18, 3);
            $table->string('reason', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['customer_return_id', 'delivery_order_line_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_return_lines');
        Schema::dropIfExists('customer_returns');
    }
};
