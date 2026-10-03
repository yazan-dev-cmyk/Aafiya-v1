<?php

namespace Tests\Feature;

use App\Models\Advertisement;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\Patient;
use App\Models\Wilaya;
use App\Services\LegacyWilayaMigrationService;
use Database\Seeders\WilayaCommuneMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LegacyWilayaMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected LegacyWilayaMigrationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed master data in test DB
        $this->seed(WilayaCommuneMasterDataSeeder::class);
        $this->service = app(LegacyWilayaMigrationService::class);
    }

    /**
     * Test 1 — Deterministic legacy value mapping.
     */
    public function test_deterministic_legacy_value_mapping(): void
    {
        // Direct Arabic
        $w14 = $this->service->resolveWilaya('تيارت');
        $this->assertNotNull($w14);
        $this->assertEquals('14', $w14->code);

        $w16Ar = $this->service->resolveWilaya('الجزائر');
        $this->assertNotNull($w16Ar);
        $this->assertEquals('16', $w16Ar->code);

        // Audited alias
        $w16Capital = $this->service->resolveWilaya('الجزائر العاصمة');
        $this->assertNotNull($w16Capital);
        $this->assertEquals('16', $w16Capital->code);

        // Direct French
        $w16Fr = $this->service->resolveWilaya('Alger');
        $this->assertNotNull($w16Fr);
        $this->assertEquals('16', $w16Fr->code);

        $w31 = $this->service->resolveWilaya('Oran');
        $this->assertNotNull($w31);
        $this->assertEquals('31', $w31->code);

        $w25 = $this->service->resolveWilaya('Constantine');
        $this->assertNotNull($w25);
        $this->assertEquals('25', $w25->code);

        $w09 = $this->service->resolveWilaya('Blida');
        $this->assertNotNull($w09);
        $this->assertEquals('09', $w09->code);

        $w23 = $this->service->resolveWilaya('Annaba');
        $this->assertNotNull($w23);
        $this->assertEquals('23', $w23->code);

        // Diacritic insensitive French
        $w19 = $this->service->resolveWilaya('Setif');
        $this->assertNotNull($w19);
        $this->assertEquals('19', $w19->code);

        $w19Acc = $this->service->resolveWilaya('Sétif');
        $this->assertNotNull($w19Acc);
        $this->assertEquals('19', $w19Acc->code);

        $w22 = $this->service->resolveWilaya('Sidi Bel Abbes');
        $this->assertNotNull($w22);
        $this->assertEquals('22', $w22->code);

        $w22Acc = $this->service->resolveWilaya('Sidi Bel Abbès');
        $this->assertNotNull($w22Acc);
        $this->assertEquals('22', $w22Acc->code);

        // Unknown value returns null (no guess)
        $this->assertNull($this->service->resolveWilaya('Atlantis'));
        $this->assertNull($this->service->resolveWilaya('Paris'));
        $this->assertNull($this->service->resolveWilaya(''));
        $this->assertNull($this->service->resolveWilaya(null));
    }

    /**
     * Test 2 — Successful FK backfill.
     */
    public function test_successful_fk_backfill(): void
    {
        // Create sample clinics with legacy wilaya text
        $clinic = Clinic::create([
            'name'                  => 'Clinique Test Oran',
            'address'               => 'Rue Test',
            'wilaya'                => 'Oran',
            'phone'                 => '041000000',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        $this->assertNull($clinic->wilaya_id);

        $this->service->migrate();

        $clinic->refresh();
        $this->assertNotNull($clinic->wilaya_id);
        $this->assertEquals('31', $clinic->wilaya()->first()->code);
        $this->assertEquals('Oran', $clinic->wilaya); // Text column preserved
    }

    /**
     * Test 3 — Unresolved value preservation.
     */
    public function test_unresolved_value_preservation(): void
    {
        $patient = Patient::create([
            'first_name'    => 'Fouad',
            'last_name'     => 'Ben',
            'gender'        => 'male',
            'date_of_birth' => '1990-01-01',
            'phone'         => '0550000001',
            'mrn'           => 'TEST-MRN-999',
            'wilaya'        => 'UnknownVille',
            'is_active'     => true,
        ]);

        $this->service->migrate();

        $patient->refresh();
        $this->assertNull($patient->wilaya_id);
        $this->assertEquals('UnknownVille', $patient->wilaya);

        $audit = $this->service->audit();
        $this->assertEquals(1, $audit['tables']['patients']['unresolved_records']);
        $this->assertEquals('UnknownVille', $audit['tables']['patients']['unresolved_details'][0]['raw_value']);
    }

    /**
     * Test 4 — NULL and empty value preservation.
     */
    public function test_null_and_empty_value_preservation(): void
    {
        $patientNull = Patient::create([
            'first_name'    => 'Sara',
            'last_name'     => 'Null',
            'gender'        => 'female',
            'date_of_birth' => '1992-05-15',
            'phone'         => '0550000002',
            'mrn'           => 'TEST-MRN-NULL',
            'wilaya'        => null,
            'is_active'     => true,
        ]);

        $patientEmpty = Patient::create([
            'first_name'    => 'Amine',
            'last_name'     => 'Empty',
            'gender'        => 'male',
            'date_of_birth' => '1988-11-20',
            'phone'         => '0550000003',
            'mrn'           => 'TEST-MRN-EMPTY',
            'wilaya'        => '',
            'is_active'     => true,
        ]);

        $this->service->migrate();

        $patientNull->refresh();
        $patientEmpty->refresh();

        $this->assertNull($patientNull->wilaya_id);
        $this->assertNull($patientNull->wilaya);

        $this->assertNull($patientEmpty->wilaya_id);
        $this->assertEquals('', $patientEmpty->wilaya);

        $audit = $this->service->audit();
        $this->assertEquals(0, $audit['tables']['patients']['unresolved_records']);
        $this->assertEquals(2, $audit['tables']['patients']['null_records'] + $audit['tables']['patients']['empty_records']);
    }

    /**
     * Test 5 — Idempotent backfill.
     */
    public function test_idempotent_backfill(): void
    {
        $clinic = Clinic::create([
            'name'                  => 'Clinique Test Tiaret',
            'address'               => 'Rue Test',
            'wilaya'                => 'تيارت',
            'phone'                 => '046000000',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        // Run migrate twice
        $res1 = $this->service->migrate();
        $clinic->refresh();
        $wilayaId1 = $clinic->wilaya_id;

        $res2 = $this->service->migrate();
        $clinic->refresh();
        $wilayaId2 = $clinic->wilaya_id;

        $this->assertNotNull($wilayaId1);
        $this->assertEquals($wilayaId1, $wilayaId2);
        $this->assertEquals('14', $clinic->wilaya()->first()->code);
    }

    /**
     * Test 6 — No duplicate records created.
     */
    public function test_no_duplicate_records_created(): void
    {
        $initialWilayasCount = Wilaya::count();
        $this->assertEquals(69, $initialWilayasCount);

        Clinic::create([
            'name'                  => 'Clinique Alger',
            'address'               => 'Didouche',
            'wilaya'                => 'Alger',
            'phone'                 => '021000000',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        $clinicsCountBefore = Clinic::count();

        $this->service->migrate();

        $this->assertEquals(69, Wilaya::count());
        $this->assertEquals($clinicsCountBefore, Clinic::count());
    }

    /**
     * Test 7 — Foreign key integrity.
     */
    public function test_foreign_key_integrity(): void
    {
        Clinic::create([
            'name'                  => 'Clinique Alger',
            'address'               => 'Didouche',
            'wilaya'                => 'Alger',
            'phone'                 => '021000000',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        $this->service->migrate();

        // Check zero orphan wilaya_ids
        $orphans = DB::table('clinics')
            ->whereNotNull('wilaya_id')
            ->whereNotIn('wilaya_id', Wilaya::pluck('id'))
            ->count();

        $this->assertEquals(0, $orphans);
    }

    /**
     * Test 8 — Legacy record count preservation.
     */
    public function test_legacy_record_count_preservation(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            Clinic::create([
                'name'                  => "Clinic {$i}",
                'address'               => "Address {$i}",
                'wilaya'                => 'Alger',
                'phone'                 => "02100000{$i}",
                'max_patients_per_slot' => 4,
                'slot_duration_min'     => 15,
                'is_active'             => true,
            ]);
        }

        $countBefore = Clinic::count();
        $this->service->migrate();
        $countAfter = Clinic::count();

        $this->assertEquals($countBefore, $countAfter);
    }

    /**
     * Test 9 — Migration rollback.
     */
    public function test_migration_rollback(): void
    {
        $clinic = Clinic::create([
            'name'                  => 'Clinique Constantine',
            'address'               => 'Belouizdad',
            'wilaya'                => 'Constantine',
            'phone'                 => '031000000',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        $this->service->migrate();
        $clinic->refresh();
        $this->assertNotNull($clinic->wilaya_id);

        // Rollback backfilled foreign keys
        $this->service->rollback();
        $clinic->refresh();

        $this->assertNull($clinic->wilaya_id);
        $this->assertEquals('Constantine', $clinic->wilaya); // Text intact
    }

    /**
     * Test 10 — Reconciliation totals.
     */
    public function test_reconciliation_totals(): void
    {
        Clinic::create([
            'name'                  => 'Clinic 1',
            'address'               => 'Addr',
            'wilaya'                => 'Alger',
            'phone'                 => '021000001',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        Clinic::create([
            'name'                  => 'Clinic 2',
            'address'               => 'Addr',
            'wilaya'                => 'Oran',
            'phone'                 => '021000002',
            'max_patients_per_slot' => 4,
            'slot_duration_min'     => 15,
            'is_active'             => true,
        ]);

        $this->service->migrate();

        $audit = $this->service->audit();
        $this->assertEquals(2, $audit['tables']['clinics']['total_records']);
        $this->assertEquals(2, $audit['tables']['clinics']['mapped_records']);
        $this->assertEquals(0, $audit['tables']['clinics']['unresolved_records']);
        $this->assertEquals(2, $audit['tables']['clinics']['current_fk_populated']);
    }
}
