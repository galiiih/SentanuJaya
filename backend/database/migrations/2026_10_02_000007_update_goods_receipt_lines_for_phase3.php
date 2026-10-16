<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('goods_receipt_lines', function (Blueprint $table) {
            if (!Schema::hasColumn('goods_receipt_lines', 'photo_path')) {
                $table->string('photo_path', 500)->nullable()->after('custody_location_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('goods_receipt_lines', function (Blueprint $table) {
            if (Schema::hasColumn('goods_receipt_lines', 'photo_path')) {
                $table->dropColumn('photo_path');
            }
        });
    }
};
