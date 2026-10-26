<?php

namespace Tests\Feature;

use App\Models\Commune;
use App\Models\Patient;
use App\Models\User;
use App\Models\Wilaya;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientLocationRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test 1: Successful patient registration with canonical wilaya_code and commune_code.
     */
    public function test_patient_can_register_with_canonical_wilaya_and_commune_codes(): void
    {
        $payload = [
            'name' => 'كمال بلمختار',
            'email' => 'kamel.location@aafiya.dz',
            'phone' => '+213550119988',
            'password' => 'SecurePass2026!',
            'wilaya_code' => '16',
            'commune_code' => '1601',
            'address' => '12 شارع ديدوش مراد',
            'accepted_terms' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $user = User::where('email', 'kamel.location@aafiya.dz')->firstOrFail();
        $this->assertTrue($user->hasRole('patient_registered'));

        $patient = Patient::where('user_id', $user->id)->firstOrFail();
        $wilaya16 = Wilaya::where('code', '16')->firstOrFail();
        $commune1601 = Commune::where('code', '1601')->firstOrFail();

        $this->assertEquals($wilaya16->id, $patient->wilaya_id);
        $this->assertEquals($commune1601->id, $patient->commune_id);
        $this->assertEquals('12 شارع ديدوش مراد', $patient->address);
        $this->assertEquals($wilaya16->name_ar, $patient->wilaya);
    }

    /**
     * Test 2: Registration rejects non-existent wilaya_code.
     */
    public function test_registration_rejects_non_existent_wilaya_code(): void
    {
        $payload = [
            'name' => 'مستخدم خطأ',
            'email' => 'invalid.wilaya@aafiya.dz',
            'phone' => '+213550119989',
            'password' => 'SecurePass2026!',
            'wilaya_code' => '999',
            'commune_code' => '1601',
            'accepted_terms' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['wilaya_code']);
    }

    /**
     * Test 3: Registration rejects commune_code belonging to a different wilaya.
     */
    public function test_registration_rejects_commune_code_mismatched_with_wilaya(): void
    {
        // Wilaya 16 (Alger), but commune 3101 (Oran)
        $payload = [
            'name' => 'مستخدم غير متطابق',
            'email' => 'mismatched@aafiya.dz',
            'phone' => '+213550119990',
            'password' => 'SecurePass2026!',
            'wilaya_code' => '16',
            'commune_code' => '3101',
            'accepted_terms' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['commune_code']);
    }

    /**
     * Test 4: Registration succeeds when commune_code and wilaya_code are omitted (transitional compatibility).
     */
    public function test_registration_succeeds_without_location_for_transitional_compatibility(): void
    {
        $payload = [
            'name' => 'مستخدم هاتف قديم',
            'email' => 'legacy.mobile@aafiya.dz',
            'phone' => '+213550119991',
            'password' => 'SecurePass2026!',
            'accepted_terms' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201);

        $user = User::where('email', 'legacy.mobile@aafiya.dz')->firstOrFail();
        $patient = Patient::where('user_id', $user->id)->firstOrFail();

        $this->assertNull($patient->wilaya_id);
        $this->assertNull($patient->commune_id);
        $this->assertNull($patient->address);
    }

    /**
     * Test 5: Exact Web Portal registration payload with Wilaya, Commune, and optional Address.
     */
    public function test_web_portal_exact_payload_creates_patient_with_correct_foreign_keys(): void
    {
        $payload = [
            'name' => 'ياسين عماري',
            'email' => 'yacine.web@aafiya.dz',
            'phone' => '+213550119992',
            'password' => 'SecurePass2026!',
            'password_confirmation' => 'SecurePass2026!',
            'role' => 'patient_registered',
            'accepted_terms' => true,
            'terms_version' => '2026.1',
            'wilaya_code' => '31',
            'commune_code' => '3101',
            'wilaya' => '31',
            'commune' => '3101',
            'address' => 'حي النور وهران',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $user = User::where('email', 'yacine.web@aafiya.dz')->firstOrFail();
        $patient = Patient::where('user_id', $user->id)->firstOrFail();
        $wilaya31 = Wilaya::where('code', '31')->firstOrFail();
        $commune3101 = Commune::where('code', '3101')->firstOrFail();

        $this->assertEquals($wilaya31->id, $patient->wilaya_id);
        $this->assertEquals($commune3101->id, $patient->commune_id);
        $this->assertEquals('حي النور وهران', $patient->address);
        $this->assertEquals($wilaya31->name_ar, $patient->wilaya);
    }

    /**
     * Test 6: Web Portal registration without optional address leaves address null.
     */
    public function test_web_portal_registration_without_optional_address(): void
    {
        $payload = [
            'name' => 'سارة لعمري',
            'email' => 'sarah.web@aafiya.dz',
            'phone' => '+213550119993',
            'password' => 'SecurePass2026!',
            'password_confirmation' => 'SecurePass2026!',
            'role' => 'patient_registered',
            'accepted_terms' => true,
            'terms_version' => '2026.1',
            'wilaya_code' => '31',
            'commune_code' => '3101',
            'address' => null,
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201);

        $user = User::where('email', 'sarah.web@aafiya.dz')->firstOrFail();
        $patient = Patient::where('user_id', $user->id)->firstOrFail();
        $wilaya31 = Wilaya::where('code', '31')->firstOrFail();
        $commune3101 = Commune::where('code', '3101')->firstOrFail();

        $this->assertEquals($wilaya31->id, $patient->wilaya_id);
        $this->assertEquals($commune3101->id, $patient->commune_id);
        $this->assertNull($patient->address);
    }
}
