<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Safety verification: verify whether any doctor references RAD or PATH
        $radPathIds = DB::table('medical_specialties')
            ->whereIn('code', ['RAD', 'PATH'])
            ->pluck('id')
            ->toArray();

        if (!empty($radPathIds)) {
            $referencedCount = DB::table('doctors')
                ->whereIn('specialty_id', $radPathIds)
                ->count();

            if ($referencedCount > 0) {
                Log::warning("RAD/PATH specialties are referenced by {$referencedCount} doctor(s). Preserving references and marking inactive.");
            }

            // Deactivate RAD and PATH in the canonical medical_specialties catalog
            DB::table('medical_specialties')
                ->whereIn('code', ['RAD', 'PATH'])
                ->update([
                    'is_active' => false,
                    'updated_at' => now(),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('medical_specialties')
            ->whereIn('code', ['RAD', 'PATH'])
            ->update([
                'is_active' => true,
                'updated_at' => now(),
            ]);
    }
};
