<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tax Codes (PPN, PPh 23, dll)
        Schema::create('tax_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('tax_type', 30); // PPN, PPH_23, PPH_FINAL
            $table->string('direction', 20); // OUTPUT, INPUT
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Tax Rates (Versioned tax rates)
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_code_id')->constrained('tax_codes')->onDelete('cascade');
            $table->decimal('rate', 7, 4); // contoh 0.1100 (11%), 0.0200 (2%)
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->timestamps();
        });

        // Tax Rules (Kondisi Pajak Customer: Kondisi 1, Kondisi 2, Kondisi 3)
        Schema::create('tax_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->integer('condition_no'); // 1 = Tanpa PPN/PPh, 2 = PPh 2.5% tanpa PPN, 3 = PPN + PPh 2%
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Customers
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->nullable()->constrained('companies');
            $table->string('code', 50);
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('npwp', 30)->nullable();
            $table->integer('tax_condition')->default(3); // 1: Tanpa PPN & PPh, 2: PPh 2.5% Tanpa PPN, 3: PPN + PPh 2%
            $table->foreignUuid('default_tax_rule_id')->nullable()->constrained('tax_rules');
            $table->integer('payment_terms_days')->default(30);
            $table->decimal('credit_limit', 18, 2)->default(0);
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // Customer Items (Barang milik customer — BUKAN Inventory Persediaan)
        Schema::create('customer_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('name');
            $table->string('vehicle_model')->nullable();
            $table->string('part_type')->nullable();
            $table->string('size', 50)->nullable();
            $table->decimal('item_value', 18, 2)->nullable(); // Nilai perkiraan barang customer untuk klaim ganti rugi
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['customer_id', 'code']);
        });

        // Suppliers (Pemasok Material)
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->string('code', 50);
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('npwp', 30)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->integer('payment_terms_days')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // Materials (Bahan Baku Milik Perusahaan — Cat, Thinner, Dempul, Amplas)
        Schema::create('materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->string('code', 50);
            $table->string('name');
            $table->string('category', 50); // CAT, THINNER, EPOXY, DEMPUL, AMPLAS, PERNIS, LAKBAN, LAINNYA
            $table->string('unit', 30); // Kaleng, Galon, Pcs, Lembar, Liter
            $table->decimal('minimum_stock', 18, 3)->default(0);
            $table->decimal('reorder_level', 18, 3)->default(0);
            $table->boolean('is_batch_tracked')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // Price Lists & Lines (Kombinasi Customer x Item x Warna x Treatment x Ukuran x Harga)
        Schema::create('price_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies');
            $table->foreignUuid('customer_id')->nullable()->constrained('customers'); // Nullable = Price list umum
            $table->string('code', 50);
            $table->string('name');
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('price_list_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('price_list_id')->constrained('price_lists')->onDelete('cascade');
            $table->foreignUuid('customer_item_id')->constrained('customer_items');
            $table->string('color_code', 100)->nullable();
            $table->string('treatment_type', 100)->nullable(); // NORMAL, CANDY, CHROME, MATTE, SPECIAL
            $table->string('size', 50)->nullable();
            $table->decimal('unit_price', 18, 4);
            $table->decimal('minimum_charge', 18, 2)->default(0);
            $table->decimal('discount_percent', 7, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_list_lines');
        Schema::dropIfExists('price_lists');
        Schema::dropIfExists('materials');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customer_items');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('tax_rules');
        Schema::dropIfExists('tax_rates');
        Schema::dropIfExists('tax_codes');
    }
};
