<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nanu_knowledge_base', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique();
            $table->unsignedInteger('version')->default(1);
            $table->string('publication_status', 20)->default('published')->index();
            $table->timestampTz('published_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::create('nanu_intents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 100)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->jsonb('examples')->default('[]');
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
        });

        Schema::create('nanu_qa_examples', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('knowledge_id')->nullable()->constrained('nanu_knowledge_base')->nullOnDelete();
            $table->foreignUuid('intent_id')->nullable()->constrained('nanu_intents')->nullOnDelete();
            $table->text('question');
            $table->text('reference_answer');
            $table->string('audience_role', 50)->default('ALL')->index();
            $table->string('status', 20)->default('draft')->index();
            $table->timestampsTz();
            $table->index(['intent_id', 'status']);
        });

        Schema::create('nanu_response_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 100)->unique();
            $table->string('name');
            $table->text('instruction');
            $table->string('scope', 30)->default('global')->index();
            $table->integer('priority')->default(100);
            $table->jsonb('conditions')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
        });

        Schema::create('nanu_tool_mappings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('intent_id')->constrained('nanu_intents')->cascadeOnDelete();
            $table->string('tool_key', 120);
            $table->string('description')->nullable();
            $table->jsonb('parameter_schema')->nullable();
            $table->boolean('requires_live_data')->default(true);
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
            $table->unique(['intent_id', 'tool_key']);
        });

        Schema::create('nanu_evaluation_cases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('question');
            $table->string('expected_intent', 100)->nullable();
            $table->jsonb('expected_tools')->nullable();
            $table->text('expected_behavior');
            $table->jsonb('assertions')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestampsTz();
        });

        Schema::create('erp_documentation_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
        });

        Schema::create('erp_documentation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->nullable()->constrained('erp_documentation_categories')->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->longText('body_markdown');
            $table->string('module_key', 100)->nullable()->index();
            $table->jsonb('keywords')->default('[]');
            $table->jsonb('related_slugs')->default('[]');
            $table->string('minimum_role', 30)->default('STAFF');
            $table->string('publication_status', 20)->default('draft')->index();
            $table->unsignedInteger('current_version')->default(1);
            $table->timestampTz('published_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->index(['category_id', 'publication_status']);
            $table->index(['module_key', 'publication_status']);
        });

        Schema::create('erp_documentation_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('documentation_id')->constrained('erp_documentation')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('title');
            $table->text('summary')->nullable();
            $table->longText('body_markdown');
            $table->jsonb('change_summary')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['documentation_id', 'version']);
        });

        Schema::create('erp_documentation_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('documentation_id')->constrained('erp_documentation')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('was_helpful');
            $table->text('comment')->nullable();
            $table->timestampsTz();
            $table->unique(['documentation_id', 'user_id']);
        });

        Schema::create('nanu_knowledge_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('entity_type', 80);
            $table->uuid('entity_id');
            $table->string('action', 40);
            $table->jsonb('before_state')->nullable();
            $table->jsonb('after_state')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nanu_knowledge_audit_logs');
        Schema::dropIfExists('erp_documentation_feedback');
        Schema::dropIfExists('erp_documentation_versions');
        Schema::dropIfExists('erp_documentation');
        Schema::dropIfExists('erp_documentation_categories');
        Schema::dropIfExists('nanu_evaluation_cases');
        Schema::dropIfExists('nanu_tool_mappings');
        Schema::dropIfExists('nanu_response_rules');
        Schema::dropIfExists('nanu_qa_examples');
        Schema::dropIfExists('nanu_intents');

        Schema::table('nanu_knowledge_base', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('updated_by');
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'version', 'publication_status', 'published_at']);
        });
    }
};
