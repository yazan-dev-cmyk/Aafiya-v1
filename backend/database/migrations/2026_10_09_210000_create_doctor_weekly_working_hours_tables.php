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
        Schema::create('doctor_day_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Saturday .. 6=Friday
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['clinic_id', 'doctor_id', 'day_of_week'], 'uniq_doc_clinic_day');
            $table->index(['clinic_id', 'doctor_id'], 'idx_doc_clinic_sched');
        });

        Schema::create('doctor_working_slots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('doctor_day_schedule_id')
                ->constrained('doctor_day_schedules')
                ->cascadeOnDelete();
            $table->string('time_slot', 5); // Hourly starts: '08:00' .. '16:00'
            $table->timestamps();

            $table->unique(['doctor_day_schedule_id', 'time_slot'], 'uniq_day_slot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_working_slots');
        Schema::dropIfExists('doctor_day_schedules');
    }
};
