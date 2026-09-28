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
        Schema::create('clinical_access_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('actor_role', 50); // doctor, doctor_assistant, lab, radiology, patient, admin
            $table->string('actor_position', 50)->nullable(); // director, doctor, staff
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('resource_type', 50)->index(); // patient_ehr, clinical_visit, prescription, diagnostic_order, radiology_report
            $table->uuid('resource_id')->index();
            $table->string('action', 50); // view_summary, view_confidential_ehr, finalize, void, emergency_break_glass
            $table->string('access_reason', 100)->index(); // active_appointment, direct_care, emergency_access, intake_vitals, diagnostic_fulfillment, patient_self_view
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->uuid('request_id')->nullable()->index();
            
            // Append-only constraint: only created_at timestamp is present (no updated_at, no deleted_at)
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['patient_id', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_access_logs');
    }
};
