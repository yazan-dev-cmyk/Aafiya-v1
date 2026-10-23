<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for AAFIYA Platform Security Audit Logs.
     */
    public function up(): void
    {
        Schema::create('security_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 50)->nullable();
            $table->string('actor_position', 100)->nullable();
            $table->string('event_category', 50)->index(); // BACKUP_INFRASTRUCTURE, AUTH_STEP_UP, SECURITY_CONFIG
            $table->string('action', 50)->index(); // INITIATE_BACKUP_EXPORT, DOWNLOAD_BACKUP_EXPORT, STEP_UP_REQUEST
            $table->string('resource_type', 50)->index(); // BackupExport, SystemConfig
            $table->string('resource_id', 255)->nullable()->index();
            $table->string('access_reason', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->uuid('request_id')->nullable()->index();
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['event_category', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_audit_logs');
    }
};
