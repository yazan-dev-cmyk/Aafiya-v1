<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->string('type', 30)->default('string');
            $table->string('group', 50)->default('general');
            $table->timestamps();
        });

        // Seed initial platform booking policies
        $now = now();
        DB::table('system_settings')->insertOrIgnore([
            [
                'key'        => 'booking.cancellation_cutoff_hours',
                'value'      => '24',
                'type'       => 'integer',
                'group'      => 'booking',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key'        => 'booking.max_daily_bookings_per_patient',
                'value'      => '5',
                'type'       => 'integer',
                'group'      => 'booking',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
