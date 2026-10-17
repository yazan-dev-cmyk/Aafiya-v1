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
        Schema::table('vacation_appointment_reschedules', function (Blueprint $table) {
            $table->unique(
                ['doctor_vacation_id', 'original_appointment_id'],
                'uniq_var_vacation_original_appt'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vacation_appointment_reschedules', function (Blueprint $table) {
            $table->dropUnique('uniq_var_vacation_original_appt');
        });
    }
};
