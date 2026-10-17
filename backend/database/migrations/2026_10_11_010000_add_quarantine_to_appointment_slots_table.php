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
        Schema::table('appointment_slots', function (Blueprint $table) {
            $table->boolean('is_quarantined')->default(false)->after('booked_count');
            $table->string('quarantine_reason', 255)->nullable()->after('is_quarantined');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointment_slots', function (Blueprint $table) {
            $table->dropColumn(['is_quarantined', 'quarantine_reason']);
        });
    }
};
