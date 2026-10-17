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
        Schema::create('doctor_vacation_clinics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('doctor_vacation_id')
                ->constrained('doctor_vacations')
                ->cascadeOnDelete();
            $table->foreignUuid('clinic_id')
                ->constrained('clinics')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['doctor_vacation_id', 'clinic_id'], 'uniq_vacation_clinic');
            $table->index('clinic_id', 'idx_vacation_clinic_clinic');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_vacation_clinics');
    }
};
