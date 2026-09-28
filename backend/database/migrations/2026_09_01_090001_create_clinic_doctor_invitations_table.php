<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinic_doctor_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->foreignUuid('invited_by_id')->constrained('users')->restrictOnDelete();
            $table->string('position')->default('doctor'); // 'director', 'doctor'
            $table->string('status')->default('pending')->index(); // 'pending', 'accepted', 'rejected', 'cancelled', 'expired'
            $table->text('notes')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['clinic_id', 'doctor_id', 'status'], 'idx_cdi_clinic_doc_status');
            $table->index(['doctor_id', 'status'], 'idx_cdi_doc_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_doctor_invitations');
    }
};
