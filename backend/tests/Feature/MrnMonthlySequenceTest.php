<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use App\Services\EhrService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MrnMonthlySequenceTest extends TestCase
{
    use RefreshDatabase;

    protected EhrService $ehrService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ehrService = app(EhrService::class);
    }

    /**
     * Test A — First patient in month receives sequence 00001.
     */
    public function test_first_patient_in_month_receives_00001(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 15, 10, 0, 0, 'Africa/Algiers'));

        DB::table('mrn_sequences')
            ->where('period', '2026-09')
            ->update(['current_sequence' => 0]);

        $patient = $this->ehrService->createPatient([
            'first_name'    => 'أحمد',
            'last_name'     => 'بن علي',
            'gender'        => 'male',
            'date_of_birth' => '1992-03-10',
            'phone'         => '0550112233',
        ]);

        $this->assertEquals('MRN-2026-09-00001', $patient->mrn);

        $seq = DB::table('mrn_sequences')->where('period', '2026-09')->value('current_sequence');
        $this->assertEquals(1, $seq);

        Carbon::setTestNow(); // Reset
    }

    /**
     * Test B — Sequential generation increments consecutive numbers.
     */
    public function test_sequential_generation(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 15, 10, 0, 0, 'Africa/Algiers'));

        DB::table('mrn_sequences')
            ->where('period', '2026-09')
            ->update(['current_sequence' => 1]);

        $patient = $this->ehrService->createPatient([
            'first_name'    => 'سمير',
            'last_name'     => 'منصوري',
            'gender'        => 'male',
            'date_of_birth' => '1988-07-20',
            'phone'         => '0550223344',
        ]);

        $this->assertEquals('MRN-2026-09-00002', $patient->mrn);

        $seq = DB::table('mrn_sequences')->where('period', '2026-09')->value('current_sequence');
        $this->assertEquals(2, $seq);

        Carbon::setTestNow();
    }

    /**
     * Test C — Monthly reset isolates distinct month domains.
     */
    public function test_monthly_reset_across_months(): void
    {
        // September: current_sequence = 101
        DB::table('mrn_sequences')->where('period', '2026-09')->update(['current_sequence' => 101]);
        // October: current_sequence = 0
        DB::table('mrn_sequences')->where('period', '2026-10')->update(['current_sequence' => 0]);

        // Create September patient
        Carbon::setTestNow(Carbon::create(2026, 9, 30, 23, 30, 0, 'Africa/Algiers'));
        $patientSep = $this->ehrService->createPatient([
            'first_name'    => 'نادية',
            'last_name'     => 'حداد',
            'gender'        => 'female',
            'date_of_birth' => '1995-11-12',
            'phone'         => '0660334455',
        ]);
        $this->assertEquals('MRN-2026-09-00102', $patientSep->mrn);

        // Move to October (Algiers time)
        Carbon::setTestNow(Carbon::create(2026, 10, 1, 0, 15, 0, 'Africa/Algiers'));
        $patientOct = $this->ehrService->createPatient([
            'first_name'    => 'ياسين',
            'last_name'     => 'طاهري',
            'gender'        => 'male',
            'date_of_birth' => '1990-04-05',
            'phone'         => '0660445566',
        ]);
        $this->assertEquals('MRN-2026-10-00001', $patientOct->mrn);

        // Verify independent counters in database
        $this->assertEquals(102, DB::table('mrn_sequences')->where('period', '2026-09')->value('current_sequence'));
        $this->assertEquals(1, DB::table('mrn_sequences')->where('period', '2026-10')->value('current_sequence'));

        Carbon::setTestNow();
    }

    /**
     * Test D — Historical compatibility: legacy MRNs remain intact and do not affect monthly sequence.
     */
    public function test_historical_compatibility_with_legacy_mrns(): void
    {
        // Insert historical patient with legacy format
        $legacy = Patient::create([
            'mrn'           => 'MRN-2026-0001',
            'first_name'    => 'مراد',
            'last_name'     => 'تواتي',
            'gender'        => 'male',
            'date_of_birth' => '1980-01-01',
            'phone'         => '0555000001',
        ]);

        Carbon::setTestNow(Carbon::create(2026, 9, 1, 9, 0, 0, 'Africa/Algiers'));
        DB::table('mrn_sequences')->where('period', '2026-09')->update(['current_sequence' => 0]);

        $newPatient = $this->ehrService->createPatient([
            'first_name'    => 'بلال',
            'last_name'     => 'قاسمي',
            'gender'        => 'male',
            'date_of_birth' => '1993-06-15',
            'phone'         => '0555000002',
        ]);

        // Legacy record untouched
        $this->assertEquals('MRN-2026-0001', $legacy->fresh()->mrn);
        // New patient starts at 00001 without collision
        $this->assertEquals('MRN-2026-09-00001', $newPatient->mrn);

        Carbon::setTestNow();
    }

    /**
     * Test E — Uniqueness: multiple sequential patient creations yield distinct, contiguous MRNs.
     */
    public function test_mrn_uniqueness_within_month(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 10, 10, 0, 0, 'Africa/Algiers'));
        DB::table('mrn_sequences')->where('period', '2026-09')->update(['current_sequence' => 0]);

        $mrns = [];
        for ($i = 1; $i <= 10; $i++) {
            $patient = $this->ehrService->createPatient([
                'first_name'    => "مريض {$i}",
                'last_name'     => 'تجريبي',
                'gender'        => 'male',
                'date_of_birth' => '1990-01-01',
                'phone'         => sprintf('05500000%02d', $i),
            ]);
            $mrns[] = $patient->mrn;
        }

        $this->assertCount(10, $mrns);
        $this->assertCount(10, array_unique($mrns));
        $this->assertEquals('MRN-2026-09-00001', $mrns[0]);
        $this->assertEquals('MRN-2026-09-00010', $mrns[9]);

        Carbon::setTestNow();
    }

    /**
     * Test F — Transaction rollback: aborted patient insert rolls back sequence counter.
     */
    public function test_transaction_rollback_restores_counter(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 10, 10, 0, 0, 'Africa/Algiers'));
        DB::table('mrn_sequences')->where('period', '2026-09')->update(['current_sequence' => 5]);

        try {
            DB::transaction(function () {
                $mrn = $this->ehrService->generateMrn();
                $this->assertEquals('MRN-2026-09-00006', $mrn);

                // Force exception inside transaction after sequence increment
                throw new \Exception('Simulated database error before patient insert completion');
            });
        } catch (\Exception $e) {
            $this->assertEquals('Simulated database error before patient insert completion', $e->getMessage());
        }

        // Counter must be rolled back to 5
        $seqAfterRollback = DB::table('mrn_sequences')->where('period', '2026-09')->value('current_sequence');
        $this->assertEquals(5, $seqAfterRollback);

        Carbon::setTestNow();
    }

    /**
     * Test G — Sequence boundary: sequence reaching 99999 succeeds, but next request fails safely.
     */
    public function test_sequence_boundary_enforcement(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 10, 10, 0, 0, 'Africa/Algiers'));
        DB::table('mrn_sequences')->where('period', '2026-09')->update(['current_sequence' => 99998]);

        // 99999 allocation succeeds
        $patient99999 = $this->ehrService->createPatient([
            'first_name'    => 'صالح',
            'last_name'     => 'سعيدي',
            'gender'        => 'male',
            'date_of_birth' => '1985-02-02',
            'phone'         => '0555999999',
        ]);
        $this->assertEquals('MRN-2026-09-99999', $patient99999->mrn);
        $this->assertEquals(99999, DB::table('mrn_sequences')->where('period', '2026-09')->value('current_sequence'));

        // Next allocation exceeds 99999 and must throw RuntimeException
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('تم استنفاد السعة القصوى');

        $this->ehrService->createPatient([
            'first_name'    => 'تجاوز',
            'last_name'     => 'الحد',
            'gender'        => 'male',
            'date_of_birth' => '1985-02-02',
            'phone'         => '0555000099',
        ]);

        Carbon::setTestNow();
    }

    /**
     * Test H — Missing period fails with controlled RuntimeException and never dynamically creates rows.
     */
    public function test_missing_period_produces_controlled_failure_and_does_not_insert_row(): void
    {
        Carbon::setTestNow(Carbon::create(2029, 1, 15, 10, 0, 0, 'Africa/Algiers'));

        $this->assertFalse(DB::table('mrn_sequences')->where('period', '2029-01')->exists());

        $exceptionCaught = false;
        try {
            $this->ehrService->generateMrn('2029-01');
        } catch (\RuntimeException $e) {
            $exceptionCaught = true;
            $this->assertStringContainsString('غير مهيأة في قاعدة البيانات', $e->getMessage());
        }

        $this->assertTrue($exceptionCaught, 'Expected RuntimeException was not thrown for missing period.');
        $this->assertFalse(DB::table('mrn_sequences')->where('period', '2029-01')->exists());

        Carbon::setTestNow();
    }
}
