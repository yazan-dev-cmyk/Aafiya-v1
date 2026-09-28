<?php

namespace Tests\Feature;

use App\Models\Advertisement;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthSecurityAndThrottlingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected string $password = 'SecurePassword123!';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $this->user = User::factory()->create([
            'email' => 'doctor.security@aafiya.dz',
            'password' => bcrypt($this->password),
            'is_active' => true,
        ]);
    }

    public function test_api_responses_include_security_headers(): void
    {
        $response = $this->getJson('/api/v1/doctors');

        $response->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_login_endpoint_is_rate_limited_to_prevent_brute_force(): void
    {
        // Execute 5 allowed login attempts
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => 'doctor.security@aafiya.dz',
                'password' => 'WrongPassword!',
            ]);
            $response->assertStatus(422);
        }

        // 6th attempt must be throttled with HTTP 429
        $throttledResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'doctor.security@aafiya.dz',
            'password' => 'WrongPassword!',
        ]);

        $throttledResponse->assertStatus(429)
            ->assertJsonPath('code', 429);
    }

    public function test_registration_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => "User {$i}",
                'email' => "user{$i}@aafiya.dz",
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'phone' => "055500000{$i}",
            ]);
            $response->assertStatus(201);
        }

        // 4th attempt must be throttled
        $throttledResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'User Spammer',
            'email' => 'spam@aafiya.dz',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone' => '0555000009',
        ]);

        $throttledResponse->assertStatus(429)
            ->assertJsonPath('code', 429);
    }

    public function test_qr_verification_endpoint_is_rate_limited_and_does_not_leak_internal_ids(): void
    {
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $this->user->roles()->attach($doctorRole->id);
        $doctor = Doctor::create(['user_id' => $this->user->id, 'specialty' => 'طب عام', 'license_number' => 'DOC-SEC-01']);
        $clinic = Clinic::create(['name' => 'عيادة الأمان', 'address' => 'الجزائر', 'wilaya' => 'الجزائر', 'phone' => '021000000', 'director_doctor_id' => $doctor->id, 'max_patients_per_slot' => 5, 'slot_duration_min' => 60]);
        $doctor->clinics()->attach($clinic->id, ['position' => 'director', 'is_primary' => true]);
        $patient = Patient::create(['mrn' => 'MRN-2026-9999', 'first_name' => 'سليم', 'last_name' => 'قادري', 'gender' => 'male', 'date_of_birth' => '1990-01-01', 'phone' => '0555999888']);

        $prescription = Prescription::create([
            'prescription_reference' => 'RX-2026-9999',
            'secure_token' => 'secure-un-guessable-token-p18-test',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        // Verify successful public QR verification does not leak internal UUID primary key
        $res = $this->getJson("/api/v1/v/{$prescription->secure_token}");
        $res->assertStatus(200)
            ->assertJsonPath('data.prescription_reference', 'RX-2026-9999')
            ->assertJsonMissing(['id' => $prescription->id]);

        // Fire 29 more requests to reach 30 allowed requests
        for ($i = 0; $i < 29; $i++) {
            $this->getJson("/api/v1/v/{$prescription->secure_token}")->assertStatus(200);
        }

        // 31st request must trigger HTTP 429 Throttle
        $throttled = $this->getJson("/api/v1/v/{$prescription->secure_token}");
        $throttled->assertStatus(429)
            ->assertJsonPath('code', 429);
    }
}
