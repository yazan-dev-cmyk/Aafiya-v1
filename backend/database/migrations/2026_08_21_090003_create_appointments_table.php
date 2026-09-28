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
        Schema::create('appointments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('booking_reference')->unique();
            $table->foreignUuid('clinic_id')->constrained('clinics')->restrictOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->restrictOnDelete();
            
            // Patient reference: Nullable UUID WITHOUT FK constraint in P14 (patients table is P15)
            $table->uuid('patient_id')->nullable()->index();
            $table->string('patient_name');
            $table->string('patient_phone');
            $table->string('patient_mrn')->nullable()->index();
            $table->string('patient_national_id')->nullable()->index();

            $table->foreignUuid('booking_center_id')->nullable()->constrained('booking_centers')->nullOnDelete();
            $table->foreignUuid('created_by_id')->constrained('users')->restrictOnDelete();
            $table->string('creator_type')->default('patient'); // patient, booking_center, clinic_assistant, doctor, admin

            $table->date('appointment_date')->index();
            $table->string('time_slot', 5)->index(); // '08:00', '09:00', etc.
            $table->string('status')->default('pending')->index(); // pending, confirmed, attended, no_show, cancelled, rejected, expired, rescheduled

            $table->foreignUuid('rescheduled_from_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->text('notes')->nullable();
            
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignUuid('confirmed_by_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['clinic_id', 'doctor_id', 'appointment_date', 'time_slot'], 'idx_appointments_capacity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
