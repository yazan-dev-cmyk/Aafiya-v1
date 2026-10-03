<?php

use App\Models\Doctor;
use App\Services\LegacySpecialtyResolutionService;
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
        if (DB::table('medical_specialties')->count() === 0) {
            (new \Database\Seeders\MedicalSpecialtyMasterDataSeeder())->run();
        }

        $resolver = app(LegacySpecialtyResolutionService::class);
        $doctors = DB::table('doctors')->select(['id', 'specialty', 'specialty_id'])->get();

        $resolvedCount = 0;
        $unresolvedCount = 0;
        $ambiguousCount = 0;

        foreach ($doctors as $doc) {
            if ($doc->specialty_id !== null) {
                continue;
            }

            $result = $resolver->resolve($doc->specialty);

            if ($result['status'] === 'RESOLVED' && $result['specialty_id'] !== null) {
                DB::table('doctors')->where('id', $doc->id)->update([
                    'specialty_id' => $result['specialty_id'],
                ]);
                $resolvedCount++;
            } elseif ($result['status'] === 'AMBIGUOUS') {
                $ambiguousCount++;
                Log::warning("TASK-MD-11B Backfill: Ambiguous doctor specialty for ID {$doc->id}: '{$doc->specialty}'. Left unmutated.");
            } else {
                $unresolvedCount++;
                Log::warning("TASK-MD-11B Backfill: Unresolved doctor specialty for ID {$doc->id}: '{$doc->specialty}'. Left unmutated.");
            }
        }

        Log::info("TASK-MD-11B Backfill Summary: Resolved: {$resolvedCount}, Ambiguous: {$ambiguousCount}, Unresolved: {$unresolvedCount}");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('doctors')->update(['specialty_id' => null]);
    }
};
