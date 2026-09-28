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
        Schema::create('mrn_sequences', function (Blueprint $table) {
            $table->string('period', 7)->primary(); // YYYY-MM
            $table->unsignedInteger('current_sequence')->default(0);
            $table->timestamps();
        });

        // Pre-provision monthly counters for 2026 and 2027 (24 months)
        $now = now();
        $periods = [];

        foreach ([2026, 2027] as $year) {
            for ($month = 1; $month <= 12; $month++) {
                $periods[] = [
                    'period'           => sprintf('%04d-%02d', $year, $month),
                    'current_sequence' => 0,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }
        }

        DB::table('mrn_sequences')->insertOrIgnore($periods);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mrn_sequences');
    }
};
