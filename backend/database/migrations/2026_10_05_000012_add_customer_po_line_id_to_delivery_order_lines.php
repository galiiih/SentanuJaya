<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('delivery_order_lines', 'customer_po_line_id')) {
            Schema::table('delivery_order_lines', function (Blueprint $table) {
                $table->foreignUuid('customer_po_line_id')->nullable()->after('delivery_order_id')->constrained('customer_po_lines');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('delivery_order_lines', 'customer_po_line_id')) {
            Schema::table('delivery_order_lines', function (Blueprint $table) {
                $table->dropForeign(['customer_po_line_id']);
                $table->dropColumn('customer_po_line_id');
            });
        }
    }
};
