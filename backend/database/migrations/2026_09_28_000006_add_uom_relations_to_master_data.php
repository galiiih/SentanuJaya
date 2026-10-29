<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_items', function (Blueprint $table) {
            $table->foreignUuid('uom_id')->nullable()->after('part_type')->constrained('uoms');
        });

        Schema::table('materials', function (Blueprint $table) {
            $table->foreignUuid('purchase_uom_id')->nullable()->after('unit')->constrained('uoms');
            $table->foreignUuid('stock_uom_id')->nullable()->after('purchase_uom_id')->constrained('uoms');
        });
    }

    public function down(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->dropForeign(['purchase_uom_id']);
            $table->dropForeign(['stock_uom_id']);
            $table->dropColumn(['purchase_uom_id', 'stock_uom_id']);
        });

        Schema::table('customer_items', function (Blueprint $table) {
            $table->dropForeign(['uom_id']);
            $table->dropColumn('uom_id');
        });
    }
};
