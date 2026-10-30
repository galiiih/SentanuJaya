<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('puffy_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('puffy_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('puffy_conversations')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('role', 20); // 'user', 'assistant', 'system'
            $table->text('content');
            $table->json('tool_calls')->nullable();
            $table->json('tool_result')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('puffy_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('message_id')->constrained('puffy_messages')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('value', 10); // 'up', 'down'
            $table->timestamps();
            
            $table->unique(['message_id', 'user_id']);
        });

        Schema::create('puffy_pending_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('action_type', 100);
            $table->json('payload');
            $table->string('status', 30)->default('pending'); // 'pending', 'confirmed', 'cancelled', 'expired', 'executed', 'failed'
            $table->timestamp('expires_at');
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('puffy_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 150);
            $table->json('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('puffy_audit_logs');
        Schema::dropIfExists('puffy_pending_actions');
        Schema::dropIfExists('puffy_feedback');
        Schema::dropIfExists('puffy_messages');
        Schema::dropIfExists('puffy_conversations');
    }
};
