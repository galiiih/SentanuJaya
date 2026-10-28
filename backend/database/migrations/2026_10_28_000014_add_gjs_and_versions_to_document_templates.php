<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('document_templates', 'css')) {
                $table->longText('css')->nullable()->after('content');
            }
            if (!Schema::hasColumn('document_templates', 'gjs_project')) {
                $table->longText('gjs_project')->nullable()->after('css');
            }
        });

        Schema::create('document_template_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_template_id')->constrained('document_templates')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('name');
            $table->longText('content')->nullable();
            $table->longText('css')->nullable();
            $table->longText('gjs_project')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_template_versions');

        Schema::table('document_templates', function (Blueprint $table) {
            $table->dropColumn(['css', 'gjs_project']);
        });
    }
};
