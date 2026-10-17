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
        Schema::create('clinic_operating_hours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Saturday .. 6=Friday
            $table->unsignedTinyInteger('period_index')->default(0);
            $table->string('open_time', 5)->nullable();
            $table->string('close_time', 5)->nullable();
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['clinic_id', 'day_of_week', 'period_index'], 'uniq_clinic_day_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_operating_hours');
    }
};
