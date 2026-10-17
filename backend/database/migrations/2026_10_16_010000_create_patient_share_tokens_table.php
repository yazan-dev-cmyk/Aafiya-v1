<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for TASK-PAR-PAT-05 (Encrypted Medical Record Sharing Foundations).
     *
     * Governed by Decisions:
     * - DEC-P05-01: Sharing Scope (all_emr only)
     * - DEC-P05-02: Immediate Revocation (server-side token tracking and revocation status)
     * - DEC-P05-03: Mandatory PIN (salted hash storage, attempt counters, lockout timestamps)
     * - DEC-P05-04: Data Minimization (clinical allowlist resource)
     */
    public function up(): void
    {
        Schema::create('patient_share_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('scope', 32)->default('all_emr');
            $table->string('pin_hash', 255);
            $table->string('status', 20)->default('active')->index(); // active, revoked, expired, locked
            $table->unsignedSmallInteger('failed_attempts')->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(5);
            $table->timestamp('locked_until')->nullable();
            $table->unsignedInteger('access_count')->default(0);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->foreignUuid('revoked_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['patient_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_share_tokens');
    }
};
