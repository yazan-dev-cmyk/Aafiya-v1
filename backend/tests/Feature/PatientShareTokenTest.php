<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientChronicCondition;
use App\Models\PatientCurrentMedication;
use App\Models\PatientShareToken;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PatientShareTokenTest extends TestCase
{
    use RefreshDatabase;

    protected User $patientUser;
    protected Patient $patient;
    protected User $otherPatientUser;
    protected Patient $otherPatient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $patientRegRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Primary Patient
        $this->patientUser = User::factory()->create([
            'email' => 'primary.patient@aafiya.test',
            'phone' => '+213550111222',
        ]);
        $this->patientUser->roles()->attach($patientRegRole->id);

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-P0501',
            'first_name' => 'ياسمين',
            'last_name' => 'العربي',
            'gender' => 'female',
            'date_of_birth' => '1995-04-12',
            'blood_group' => 'A+',
            'phone' => '+213550111222',
            'email' => 'yasmin.larbi@test.dz',
            'national_id' => '195160000000000001',
            'address' => 'حي أول نوفمبر، الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'is_active' => true,
        ]);

        // Add clinical data
        PatientAllergy::create([
            'patient_id' => $this->patient->id,
            'allergen' => 'البنسلين (Penicillin)',
            'severity' => 'severe',
            'reaction' => 'صدمة حساسية وحكة حادة',
            'diagnosed_at' => '2020-01-15',
            'notes' => 'حساسية مفرطة مؤكدة سريرياً',
        ]);

        PatientChronicCondition::create([
            'patient_id' => $this->patient->id,
            'condition_name' => 'الربو القصبي (Asthma)',
            'icd10_code' => 'J45',
            'diagnosed_date' => '2018-05-10',
            'status' => 'active',
            'notes' => 'متابعة دورية',
        ]);

        PatientCurrentMedication::create([
            'patient_id' => $this->patient->id,
            'medication_name' => 'بخاخ فنتولين (Ventolin Inhaler)',
            'dosage' => '100mcg',
            'frequency' => 'عند اللزوم',
            'start_date' => '2024-01-01',
            'is_active' => true,
        ]);

        // 2. Secondary Patient (for cross-tenant boundary verification)
        $this->otherPatientUser = User::factory()->create([
            'email' => 'other.patient@aafiya.test',
            'phone' => '+213550333444',
        ]);
        $this->otherPatientUser->roles()->attach($patientRegRole->id);

        $this->otherPatient = Patient::create([
            'user_id' => $this->otherPatientUser->id,
            'mrn' => 'MRN-2026-P0502',
            'first_name' => 'كريم',
            'last_name' => 'بوضياف',
            'gender' => 'male',
            'date_of_birth' => '1988-11-20',
            'blood_group' => 'O+',
            'phone' => '+213550333444',
            'email' => 'karim.b@test.dz',
            'national_id' => '188160000000000002',
            'address' => 'شارع ديدوش مراد',
            'wilaya' => 'الجزائر',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Successful creation of an all_emr share with mandatory PIN.
     */
    public function test_patient_can_create_all_emr_share_with_mandatory_pin(): void
    {
        $response = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '4821',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.scope', 'all_emr');
        $response->assertJsonPath('data.duration', '24h');
        $response->assertJsonPath('data.has_pin', true);
        $response->assertJsonPath('data.status', 'active');

        $token = $response->json('data.token');
        $this->assertNotNull($token);
        $this->assertStringStartsWith('pst_', $token);

        $shareUrl = $response->json('data.share_url');
        $this->assertNotNull($shareUrl);
        $this->assertStringContainsString('/records/view#token=' . $token, $shareUrl);

        $shareId = $response->json('data.id');
        $this->assertNotNull($shareId);

        // Verify database state: token_hash is stored, plaintext PIN is NEVER stored
        $dbShare = PatientShareToken::find($shareId);
        $this->assertNotNull($dbShare);
        $this->assertEquals($this->patient->id, $dbShare->patient_id);
        $this->assertEquals(hash('sha256', $token), $dbShare->token_hash);
        $this->assertTrue(Hash::check('4821', $dbShare->pin_hash));
        $this->assertNotEquals('4821', $dbShare->pin_hash);
        $this->assertEquals('active', $dbShare->status);
    }

    /**
     * Test 2: Mandatory PIN rejection for missing or invalid PIN input.
     */
    public function test_creation_strictly_rejects_missing_or_invalid_pin_input(): void
    {
        // Missing PIN
        $resMissing = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
            ]);
        $resMissing->assertStatus(422);
        $resMissing->assertJsonValidationErrors(['pin']);

        // Alphabetic PIN
        $resAlpha = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => 'abcd',
            ]);
        $resAlpha->assertStatus(422);
        $resAlpha->assertJsonValidationErrors(['pin']);

        // Under-length PIN (3 digits)
        $resShort = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '123',
            ]);
        $resShort->assertStatus(422);
        $resShort->assertJsonValidationErrors(['pin']);

        // Over-length PIN (9 digits)
        $resLong = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '123456789',
            ]);
        $resLong->assertStatus(422);
        $resLong->assertJsonValidationErrors(['pin']);
    }

    /**
     * Test 3: Explicit rejection of single_report per DEC-P05-01 Option A.
     */
    public function test_creation_explicitly_rejects_single_report_scope_per_dec_p05_01(): void
    {
        $response = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'single_report',
                'duration' => '24h',
                'pin' => '1234',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['scope']);
        $errorMessage = $response->json('errors.scope.0');
        $this->assertStringContainsString('single_report', $errorMessage);
        $this->assertStringContainsString('DEC-P05-01', $errorMessage);
    }

    /**
     * Test 4: Recipient can resolve active share with correct PIN.
     */
    public function test_recipient_can_resolve_share_with_correct_pin(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '5678',
            ]);

        $token = $createRes->json('data.token');

        // Resolve public recipient access with correct PIN
        $resolveRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '5678',
        ]);

        $resolveRes->assertStatus(200);
        $resolveRes->assertJsonPath('scope', 'all_emr');
        $resolveRes->assertJsonPath('patient.mrn', 'MRN-2026-P0501');
        $resolveRes->assertJsonPath('patient.first_name', 'ياسمين');
        $resolveRes->assertJsonPath('patient.blood_group', 'A+');

        // Assert verified clinical relations are returned
        $this->assertNotEmpty($resolveRes->json('patient.allergies'));
        $this->assertEquals('البنسلين (Penicillin)', $resolveRes->json('patient.allergies.0.allergen'));

        $this->assertNotEmpty($resolveRes->json('patient.chronic_conditions'));
        $this->assertEquals('الربو القصبي (Asthma)', $resolveRes->json('patient.chronic_conditions.0.condition_name'));

        $this->assertNotEmpty($resolveRes->json('patient.current_medications'));
        $this->assertEquals('بخاخ فنتولين (Ventolin Inhaler)', $resolveRes->json('patient.current_medications.0.medication_name'));

        // Assert telemetry incremented
        $share = PatientShareToken::find($createRes->json('data.id'));
        $this->assertEquals(1, $share->access_count);
        $this->assertNotNull($share->last_accessed_at);
        $this->assertEquals(0, $share->failed_attempts);
    }

    /**
     * Test 5: Strict data minimization excludes phone, email, national_id, address per DEC-P05-04.
     */
    public function test_shared_record_strictly_excludes_personal_identifiers_per_dec_p05_04(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '9988',
            ]);

        $token = $createRes->json('data.token');

        $resolveRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '9988',
        ]);

        $resolveRes->assertStatus(200);
        $patientData = $resolveRes->json('patient');

        // Prohibited PII attributes MUST NOT exist in payload
        $this->assertArrayNotHasKey('phone', $patientData, 'Phone number must be excluded per DEC-P05-04.');
        $this->assertArrayNotHasKey('email', $patientData, 'Email address must be excluded per DEC-P05-04.');
        $this->assertArrayNotHasKey('national_id', $patientData, 'National ID must be excluded per DEC-P05-04.');
        $this->assertArrayNotHasKey('address', $patientData, 'Residential address must be excluded per DEC-P05-04.');
        $this->assertArrayNotHasKey('wilaya_id', $patientData, 'Wilaya ID must be excluded.');
        $this->assertArrayNotHasKey('user_id', $patientData, 'User account ID must be excluded.');
    }

    /**
     * Test 6: Incorrect PIN rejection and lockout after 5 consecutive failures per DEC-P05-03.
     */
    public function test_recipient_is_rejected_with_incorrect_pin_and_locked_out_after_max_attempts(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '4444',
            ]);

        $token = $createRes->json('data.token');

        // First 4 failures: return 403 with decremented remaining attempts
        for ($i = 1; $i <= 4; $i++) {
            $failRes = $this->postJson('/api/v1/shared-records/resolve', [
                'token' => $token,
                'pin' => '0000',
            ]);
            $failRes->assertStatus(403);
            $this->assertEquals(5 - $i, $failRes->json('remaining_attempts'));
        }

        // 5th failure: triggers 15-minute lockout
        $fifthRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '0000',
        ]);
        $fifthRes->assertStatus(403);
        $this->assertEquals(0, $fifthRes->json('remaining_attempts'));

        // 6th attempt (even with CORRECT PIN): locked out with 423
        $lockedRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '4444',
        ]);
        $lockedRes->assertStatus(423);
        $lockedRes->assertJsonMissing(['locked_until']);
        $this->assertStringContainsString('قفل', $lockedRes->json('message'));

        // After lockout period elapses (15 minutes), retry is permitted with reset attempt count
        $share = PatientShareToken::find($createRes->json('data.id'));
        $share->update(['locked_until' => now()->subSecond()]);

        // Wrong PIN should now fail as attempt 1 of 5 (remaining: 4) instead of immediate re-lock
        $retryFailRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '9999',
        ]);
        $retryFailRes->assertStatus(403);
        $this->assertEquals(4, $retryFailRes->json('remaining_attempts'));

        // Correct PIN should succeed
        $retrySuccessRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '4444',
        ]);
        $retrySuccessRes->assertStatus(200);
    }

    /**
     * Test 7: Immediate server-side revocation rejects access immediately per DEC-P05-02.
     */
    public function test_share_is_immediately_rejected_after_patient_revocation_per_dec_p05_02(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '7777',
            ]);

        $shareId = $createRes->json('data.id');
        $token = $createRes->json('data.token');

        // Verify valid before revocation
        $preRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '7777',
        ]);
        $preRes->assertStatus(200);

        // Revoke share by patient owner
        $revokeRes = $this->actingAs($this->patientUser)
            ->deleteJson("/api/v1/patients/share-tokens/{$shareId}");
        $revokeRes->assertStatus(200);
        $revokeRes->assertJsonPath('data.status', 'revoked');

        // Verify subsequent access is immediately rejected with 410
        $postRes = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => $token,
            'pin' => '7777',
        ]);
        $postRes->assertStatus(410);
        $this->assertStringContainsString('إلغاء', $postRes->json('message'));
    }

    /**
     * Test 8: Expired shares are rejected with 410.
     */
    public function test_expired_shares_are_rejected_with_410(): void
    {
        $share = PatientShareToken::create([
            'patient_id' => $this->patient->id,
            'token_hash' => hash('sha256', 'pst_expired_test_token_123'),
            'scope' => 'all_emr',
            'pin_hash' => Hash::make('1234'),
            'status' => 'active',
            'expires_at' => now()->subHour(), // Expired 1 hour ago
        ]);

        $response = $this->postJson('/api/v1/shared-records/resolve', [
            'token' => 'pst_expired_test_token_123',
            'pin' => '1234',
        ]);

        $response->assertStatus(410);
        $this->assertStringContainsString('انتهت صلاحية', $response->json('message'));
    }

    /**
     * Test 9: Another patient cannot revoke or access foreign patient shares.
     */
    public function test_another_patient_cannot_revoke_foreign_share(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '1122',
            ]);

        $shareId = $createRes->json('data.id');

        // Other patient attempts revocation -> 404
        $revokeRes = $this->actingAs($this->otherPatientUser)
            ->deleteJson("/api/v1/patients/share-tokens/{$shareId}");

        $revokeRes->assertStatus(404);

        // Original share remains active
        $share = PatientShareToken::find($shareId);
        $this->assertEquals('active', $share->status);
    }

    /**
     * Test 10: Raw GET requests without PIN are rejected and never leak clinical data.
     */
    public function test_raw_get_without_pin_is_rejected_and_never_leaks_clinical_data(): void
    {
        $createRes = $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '3333',
            ]);

        $token = $createRes->json('data.token');

        $getRes = $this->getJson("/api/v1/shared-records/{$token}");
        $getRes->assertStatus(422);
        $getRes->assertJsonPath('require_pin', true);
        $this->assertArrayNotHasKey('patient', $getRes->json());
    }

    /**
     * Test 11: Patient can list their own shares without leaking credential hashes.
     */
    public function test_patient_can_list_their_shares_without_exposing_pin_or_token_hashes(): void
    {
        $this->actingAs($this->patientUser)
            ->postJson('/api/v1/patients/share-tokens', [
                'scope' => 'all_emr',
                'duration' => '24h',
                'pin' => '1234',
            ]);

        $listRes = $this->actingAs($this->patientUser)
            ->getJson('/api/v1/patients/share-tokens');

        $listRes->assertStatus(200);
        $shares = $listRes->json('data');
        $this->assertNotEmpty($shares);

        foreach ($shares as $s) {
            $this->assertArrayNotHasKey('pin_hash', $s);
            $this->assertArrayNotHasKey('token_hash', $s);
            $this->assertArrayHasKey('id', $s);
            $this->assertArrayHasKey('status', $s);
            $this->assertArrayHasKey('expires_at', $s);
        }
    }
}
