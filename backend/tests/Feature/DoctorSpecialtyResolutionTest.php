<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\MedicalSpecialty;
use App\Models\User;
use App\Services\LegacySpecialtyResolutionService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DoctorSpecialtyResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected LegacySpecialtyResolutionService $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(DatabaseSeeder::class);
        $this->resolver = app(LegacySpecialtyResolutionService::class);
    }

    /**
     * Test 01: Direct uppercase/lowercase code matches resolve to correct canonical specialty.
     */
    public function test_direct_code_resolution(): void
    {
        $resCard = $this->resolver->resolve('CARD');
        $this->assertEquals('RESOLVED', $resCard['status']);
        $this->assertEquals('CARD', $resCard['code']);
        $this->assertNotNull($resCard['specialty_id']);

        $resGp = $this->resolver->resolve('gp');
        $this->assertEquals('RESOLVED', $resGp['status']);
        $this->assertEquals('GP', $resGp['code']);
    }

    /**
     * Test 02: Localized names resolve accurately across all 3 languages.
     */
    public function test_multilingual_name_resolution(): void
    {
        // Arabic
        $resAr = $this->resolver->resolve('طب الأطفال');
        $this->assertEquals('RESOLVED', $resAr['status']);
        $this->assertEquals('PED', $resAr['code']);

        // French
        $resFr = $this->resolver->resolve('Médecine générale');
        $this->assertEquals('RESOLVED', $resFr['status']);
        $this->assertEquals('GP', $resFr['code']);

        // English
        $resEn = $this->resolver->resolve('Cardiology');
        $this->assertEquals('RESOLVED', $resEn['status']);
        $this->assertEquals('CARD', $resEn['code']);
    }

    /**
     * Test 03: Known common clinical aliases resolve safely.
     */
    public function test_common_clinical_aliases_resolve(): void
    {
        $cases = [
            'ENT' => 'ORL',
            'Orthopedics' => 'ORTH',
            'طب باطني' => 'INT_MED',
            'أمراض القلب والأوعية الدموية (Cardiology)' => 'CARD',
            'طب الجلد (Dermatology)' => 'DERM',
            'جراحة العظام' => 'ORTH',
            'Urology' => 'UROL',
            'Dermatology' => 'DERM',
            'General Medicine' => 'GP',
            'General' => 'GP',
        ];

        foreach ($cases as $input => $expectedCode) {
            $res = $this->resolver->resolve($input);
            $this->assertEquals('RESOLVED', $res['status'], "Failed to resolve alias: {$input}");
            $this->assertEquals($expectedCode, $res['code'], "Mismatched code for alias: {$input}");
        }
    }

    /**
     * Test 04: Ambiguous composite values are flagged as AMBIGUOUS and not automatically mapped.
     */
    public function test_ambiguous_composite_values_not_automatically_mapped(): void
    {
        $compositeValues = [
            'طب عام (General Medicine) Gastro',
            'طب عام (General Medicine) الأذن زالحنجرة',
            'طب عام (General Medicine) العظام',
        ];

        foreach ($compositeValues as $val) {
            $res = $this->resolver->resolve($val);
            $this->assertEquals('AMBIGUOUS', $res['status'], "Composite value should be AMBIGUOUS: {$val}");
            $this->assertNull($res['specialty_id'], "Ambiguous specialty_id must remain null: {$val}");
            $this->assertNull($res['specialty']);
        }
    }

    /**
     * Test 05: Typographic corruption is marked as UNRESOLVED and not guessed.
     */
    public function test_typographic_corruption_marked_unresolved(): void
    {
        $res = $this->resolver->resolve('كب الأطفال');
        $this->assertEquals('UNRESOLVED', $res['status']);
        $this->assertNull($res['specialty_id']);
    }

    /**
     * Test 06: Arbitrary unknown strings return UNRESOLVED.
     */
    public function test_unknown_arbitrary_string_returns_unresolved(): void
    {
        $res = $this->resolver->resolve('unregistered-arbitrary-specialty-xyz');
        $this->assertEquals('UNRESOLVED', $res['status']);
        $this->assertNull($res['specialty_id']);
    }

    /**
     * Test 07: Non-destructive guarantee: legacy specialty strings are never mutated by resolution.
     */
    public function test_legacy_string_is_non_destructively_preserved(): void
    {
        $user = User::create(['name' => 'Dr. Preserved', 'email' => 'pres@test.com', 'phone' => '+213555888777', 'password' => 'sec', 'is_active' => true]);
        $user->assignRole('doctor');

        $originalLegacyString = 'طب عام (General Medicine) Gastro';
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialty' => $originalLegacyString,
            'license_number' => 'LIC-PRES-001',
            'is_verified' => true,
        ]);

        $res = $this->resolver->resolve($doctor->specialty);
        $this->assertEquals('AMBIGUOUS', $res['status']);

        // Doctor model reload
        $fresh = $doctor->fresh();
        $this->assertEquals($originalLegacyString, $fresh->specialty);
        $this->assertNull($fresh->specialty_id);
    }
}
