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
        Schema::table('doctor_clinic', function (Blueprint $table) {
            $table->boolean('is_working_hours_activated')->default(false)->after('max_patients_per_slot');
            $table->timestamp('working_hours_activated_at')->nullable()->after('is_working_hours_activated');
            $table->unsignedBigInteger('schedule_version')->default(1)->after('working_hours_activated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctor_clinic', function (Blueprint $table) {
            $table->dropColumn([
                'is_working_hours_activated',
                'working_hours_activated_at',
                'schedule_version',
            ]);
        });
    }
};
