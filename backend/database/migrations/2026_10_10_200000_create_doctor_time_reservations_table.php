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
        Schema::create('doctor_time_reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->date('appointment_date');
            $table->string('time_slot', 5);
            $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['doctor_id', 'appointment_date', 'time_slot'], 'uniq_doctor_date_slot');
            $table->index('clinic_id', 'idx_dtr_clinic');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_time_reservations');
    }
};
