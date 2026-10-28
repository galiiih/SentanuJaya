<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('document_type'); // 'invoice' or 'surat_jalan'
            $table->string('format')->default('html'); // 'html', 'docx', 'xlsx'
            $table->longText('content')->nullable();
            $table->string('file_path')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(false);
            $table->string('status')->default('draft'); // 'draft', 'active'
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_templates');
    }
};
