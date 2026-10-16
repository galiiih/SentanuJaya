<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Companies
        Schema::create('companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('npwp', 30)->nullable();
            $table->boolean('is_pkp')->default(true);
            $table->date('pkp_date')->nullable();
            $table->text('address')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('timezone')->default('Asia/Jakarta');
            $table->string('currency', 10)->default('IDR');
            $table->date('system_start_date')->nullable();
            $table->timestamps();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });

        // Branches
        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('name');
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // Users
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('username', 50)->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('full_name');
            $table->string('phone', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('failed_login_count')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->boolean('mfa_enabled')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        // Audit Logs (Append-only)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('actor_id')->nullable()->constrained('users');
            $table->string('action', 50);
            $table->string('entity_type', 100);
            $table->uuid('entity_id');
            $table->jsonb('old_value')->nullable();
            $table->jsonb('new_value')->nullable();
            $table->text('reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('users');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('companies');
    }
};
