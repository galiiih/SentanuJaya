<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('material_receipt_lines', 'notes')) {
            Schema::table('material_receipt_lines', function (Blueprint $table) {
                $table->text('notes')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('material_receipt_lines', 'notes')) {
            Schema::table('material_receipt_lines', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
