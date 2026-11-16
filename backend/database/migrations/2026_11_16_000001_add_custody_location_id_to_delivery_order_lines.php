<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('delivery_order_lines', 'custody_location_id')) {
            Schema::table('delivery_order_lines', function (Blueprint $table) {
                $table->foreignUuid('custody_location_id')
                    ->nullable()
                    ->after('customer_item_id')
                    ->constrained('custody_locations');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('delivery_order_lines', 'custody_location_id')) {
            Schema::table('delivery_order_lines', function (Blueprint $table) {
                $table->dropForeign(['custody_location_id']);
                $table->dropColumn('custody_location_id');
            });
        }
    }
};
