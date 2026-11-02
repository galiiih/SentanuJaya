<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nanu_knowledge_candidates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submitted_by')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('module', 100)->nullable();
            $table->text('question');
            $table->text('answer');
            $table->string('status', 30)->default('pending_review'); // pending_review, approved, rejected
            $table->text('reviewer_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('nanu_knowledge_base', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('module', 100)->nullable();
            $table->text('question_pattern');
            $table->text('content');
            $table->string('audience_role', 50)->default('ALL'); // ADMIN, OWNER, STAFF, ALL
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nanu_knowledge_base');
        Schema::dropIfExists('nanu_knowledge_candidates');
    }
};
