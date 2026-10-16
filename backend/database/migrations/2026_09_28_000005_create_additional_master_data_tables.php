<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Units of Measure (UOM)
        Schema::create('uoms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 100);
            $table->string('category', 50)->default('COUNT'); // COUNT, VOLUME, WEIGHT, LENGTH
            $table->integer('decimal_places')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Customer Contacts (Multiple contacts per customer)
        Schema::create('customer_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->onDelete('cascade');
            $table->string('name', 150);
            $table->string('position', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Branch-scoped reference data
        Schema::create('colors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->string('hex_code', 10)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Treatments Master
        Schema::create('treatments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->string('category', 50)->default('PAINTING'); // PAINTING, REPAINTING, FINISHING, POLISHING
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Workers / Employees Master
        Schema::create('workers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches');
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('type', 30)->default('DAILY'); // DAILY, MONTHLY
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->date('join_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Expense Categories Master
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Payment Methods Master
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->string('type', 30)->default('BANK_TRANSFER'); // CASH, BANK_TRANSFER, CHEQUE, OTHER
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Transport Templates Master
        Schema::create('transport_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('distance_range', 100)->nullable();
            $table->decimal('tarif', 18, 2);
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Production Statuses / Processes Reference Table
        Schema::create('production_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->integer('sequence')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_statuses');
        Schema::dropIfExists('transport_templates');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('workers');
        Schema::dropIfExists('treatments');
        Schema::dropIfExists('colors');
        Schema::dropIfExists('customer_contacts');
        Schema::dropIfExists('uoms');
    }
};
