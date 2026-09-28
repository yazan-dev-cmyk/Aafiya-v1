<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create appointment_slots ledger table for deterministic row-level serialization
        Schema::create('appointment_slots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->date('appointment_date');
            $table->string('time_slot', 5); // '08:00', '09:00', etc.
            $table->unsignedInteger('capacity')->default(10);
            $table->unsignedInteger('booked_count')->default(0);
            $table->timestamps();

            $table->unique(['clinic_id', 'doctor_id', 'appointment_date', 'time_slot'], 'uniq_clinic_doctor_date_slot');
            $table->index(['clinic_id', 'doctor_id', 'appointment_date'], 'idx_slots_lookup');
        });

        // 2. Create appointment_sequences table for atomic reference generation (Blocker #3)
        Schema::create('appointment_sequences', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('current_sequence')->default(0);
            $table->timestamps();
        });

        // 3. Add max_patients_per_slot to doctor_clinic pivot for doctor-level capacity overrides (1..10)
        Schema::table('doctor_clinic', function (Blueprint $table) {
            $table->unsignedInteger('max_patients_per_slot')->nullable()->after('is_active');
        });

        // 4. Update clinics table default for max_patients_per_slot to 10 and slot_duration_min to 60
        // Enforce 60-minute duration and initialize existing clinics to capacity 10
        DB::table('clinics')->update([
            'slot_duration_min'     => 60,
            'max_patients_per_slot' => 10,
        ]);

        // 5. Pre-provision appointment_sequences rows for 2026..2030
        $existing2026Count = DB::table('appointments')
            ->where('booking_reference', 'LIKE', 'MS-2026-%')
            ->count();

        // Detect current max numerical sequence for 2026
        $max2026Seq = 0;
        $refs = DB::table('appointments')
            ->where('booking_reference', 'LIKE', 'MS-2026-%')
            ->pluck('booking_reference');

        foreach ($refs as $ref) {
            $parts = explode('-', $ref);
            if (isset($parts[2]) && is_numeric($parts[2])) {
                $max2026Seq = max($max2026Seq, (int) $parts[2]);
            }
        }

        $years = [2026, 2027, 2028, 2029, 2030];
        foreach ($years as $year) {
            DB::table('appointment_sequences')->insert([
                'year'             => $year,
                'current_sequence' => ($year === 2026) ? max($existing2026Count, $max2026Seq) : 0,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        // 6. Pre-populate appointment_slots from existing active appointments in the database
        $existingSlotAggregates = DB::table('appointments')
            ->whereNull('deleted_at')
            ->whereIn('status', ['pending', 'confirmed', 'attended', 'no_show'])
            ->select('clinic_id', 'doctor_id', 'appointment_date', 'time_slot', DB::raw('count(*) as aggregate_count'))
            ->groupBy('clinic_id', 'doctor_id', 'appointment_date', 'time_slot')
            ->get();

        foreach ($existingSlotAggregates as $agg) {
            DB::table('appointment_slots')->insertOrIgnore([
                'id'               => (string) Str::uuid(),
                'clinic_id'        => $agg->clinic_id,
                'doctor_id'        => $agg->doctor_id,
                'appointment_date' => $agg->appointment_date,
                'time_slot'        => $agg->time_slot,
                'capacity'         => 10,
                'booked_count'     => (int) $agg->aggregate_count,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_slots');
        Schema::dropIfExists('appointment_sequences');

        Schema::table('doctor_clinic', function (Blueprint $table) {
            $table->dropColumn('max_patients_per_slot');
        });
    }
};
