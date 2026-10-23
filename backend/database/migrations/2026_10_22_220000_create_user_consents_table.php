<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for User Consents and Statutory Notices.
     *
     * Retention Policy & Trade-off Documentation:
     * We use `foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete()`
     * combined with `uuid('subject_id')->index()`.
     *
     * Why NOT cascadeOnDelete:
     * Cascading deletes would automatically destroy historical proof that a user consented
     * to terms and privacy policies at registration time, violating Algerian Law 18-07 evidentiary
     * retention requirements.
     * By using `nullOnDelete()` on the relational constraint while preserving the immutable `subject_id`
     * (the original user UUID snapshot), the evidentiary audit trail of consent survives account closure
     * without compromising referential integrity or violating GDPR/Law 18-07 right-to-erasure principles.
     */
    public function up(): void
    {
        Schema::create('user_consents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('subject_id')->index(); // Immutable copy of user UUID at time of consent
            $table->string('consent_type', 50)->index(); // terms_of_service, privacy_notice_acknowledgement, optional_analytics
            $table->string('document_version', 50); // e.g. '2026.1'
            $table->boolean('is_granted')->default(true);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            
            // Append-only constraint: only created_at timestamp is present (no updated_at, no deleted_at)
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['subject_id', 'consent_type']);
            $table->index(['consent_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_consents');
    }
};
