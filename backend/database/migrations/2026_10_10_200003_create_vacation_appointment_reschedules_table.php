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
        Schema::create('vacation_appointment_reschedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('doctor_vacation_id')
                ->constrained('doctor_vacations', indexName: 'fk_var_vacation')
                ->cascadeOnDelete();
            // Condition A2: protect rescheduling ledger from appointment purge
            $table->foreignUuid('original_appointment_id')
                ->constrained('appointments', indexName: 'fk_var_original_appt')
                ->restrictOnDelete();
            $table->foreignUuid('replacement_appointment_id')
                ->nullable()
                ->constrained('appointments', indexName: 'fk_var_replacement_appt')
                ->nullOnDelete();
            $table->foreignUuid('clinic_id')
                ->constrained('clinics', indexName: 'fk_var_clinic')
                ->cascadeOnDelete();
            $table->string('status', 30); // rescheduled, urgent_unresolved, manual_pending, restored
            $table->text('failure_reason')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignUuid('resolved_by_id')
                ->nullable()
                ->constrained('users', indexName: 'fk_var_resolved_by')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['doctor_vacation_id', 'status'], 'idx_var_vacation_status');
            $table->index(['clinic_id', 'status'], 'idx_var_clinic_status');
            $table->index('original_appointment_id', 'idx_var_original_appt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vacation_appointment_reschedules');
    }
};
