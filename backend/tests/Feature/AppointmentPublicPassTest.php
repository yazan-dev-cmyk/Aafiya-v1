<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentPublicPassTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $doctorRole = Role::where('name', 'doctor')->firstOrFail();

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب القلب والأوعية الدموية',
            'license_number' => 'DOC-CARDIO-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'مركز عافية الطبي المركزي',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021112233',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'position' => 'director',
            'consultation_fee' => 3000,
            'is_active' => true,
        ]);
    }

    public function test_public_pass_returns_200_and_sanitized_data_with_security_headers(): void
    {
        $token = Str::random(64);
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-0888',
            'secure_token' => $token,
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'كريم بوعلام',
            'patient_phone' => '0555112233',
            'patient_national_id' => '199016100012345678',
            'patient_mrn' => 'MRN-SECRET-999',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'appointment_date' => '2026-11-15',
            'time_slot' => '10:00',
            'status' => 'confirmed',
            'notes' => 'ملاحظات سرية للغاية تخص التاريخ العائلي للمريض',
        ]);

        $response = $this->getJson("/api/v1/appointments/pass/{$token}");

        $response->assertStatus(200)
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));

        $data = $response->json('data');

        $this->assertEquals('MS-2026-0888', $data['booking_reference']);
        $this->assertEquals('confirmed', $data['status']);
        $this->assertTrue($data['is_active_pass']);
        $this->assertEquals('2026-11-15', $data['appointment_date']);
        $this->assertEquals('10:00', $data['time_slot']);
        $this->assertEquals('كريم بوعلام', $data['patient_name']);
        $this->assertEquals($this->doctorUser->name, $data['doctor']['name']);
        $this->assertEquals('طب القلب والأوعية الدموية', $data['doctor']['specialty']);
        $this->assertEquals('مركز عافية الطبي المركزي', $data['clinic']['name']);
        $this->assertStringContainsString($token, $data['qr_pass_url']);

        // Strict data minimization: sensitive fields MUST NOT be present
        $this->assertArrayNotHasKey('id', $data);
        $this->assertArrayNotHasKey('patient_national_id', $data);
        $this->assertArrayNotHasKey('patient_mrn', $data);
        $this->assertArrayNotHasKey('notes', $data);
        $this->assertArrayNotHasKey('created_by_id', $data);
    }

    public function test_public_pass_returns_404_for_invalid_or_missing_token(): void
    {
        // 1. Invalid length/format
        $resShort = $this->getJson('/api/v1/appointments/pass/short-token-123');
        $resShort->assertStatus(404);
        $this->assertStringContainsString('no-store', (string) $resShort->headers->get('Cache-Control'));

        // 2. Non-existent 64-char token
        $fakeToken = str_repeat('a', 64);
        $resFake = $this->getJson("/api/v1/appointments/pass/{$fakeToken}");
        $resFake->assertStatus(404);
        $this->assertStringContainsString('no-store', (string) $resFake->headers->get('Cache-Control'));
    }

    public function test_public_pass_shows_correct_status_flag_for_pending_and_cancelled(): void
    {
        $pendingToken = Str::random(64);
        Appointment::create([
            'booking_reference' => 'MS-2026-0901',
            'secure_token' => $pendingToken,
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'فاطمة الزهراء',
            'patient_phone' => '0666112233',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'appointment_date' => '2026-11-20',
            'time_slot' => '11:00',
            'status' => 'pending',
        ]);

        $resPending = $this->getJson("/api/v1/appointments/pass/{$pendingToken}");
        $resPending->assertStatus(200);
        $this->assertEquals('pending', $resPending->json('data.status'));
        $this->assertTrue($resPending->json('data.is_active_pass'));

        $cancelledToken = Str::random(64);
        Appointment::create([
            'booking_reference' => 'MS-2026-0902',
            'secure_token' => $cancelledToken,
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'عمر سليم',
            'patient_phone' => '0777112233',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'appointment_date' => '2026-11-20',
            'time_slot' => '12:00',
            'status' => 'cancelled',
        ]);

        $resCancelled = $this->getJson("/api/v1/appointments/pass/{$cancelledToken}");
        $resCancelled->assertStatus(200);
        $this->assertEquals('cancelled', $resCancelled->json('data.status'));
        $this->assertFalse($resCancelled->json('data.is_active_pass'));
    }

    public function test_possessing_public_pass_token_does_not_grant_check_in_without_auth(): void
    {
        $token = Str::random(64);
        Appointment::create([
            'booking_reference' => 'MS-2026-0903',
            'secure_token' => $token,
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0555998877',
            'created_by_id' => $this->doctorUser->id,
            'creator_type' => 'doctor',
            'appointment_date' => '2026-11-22',
            'time_slot' => '09:00',
            'status' => 'confirmed',
        ]);

        // Unauthenticated check-in attempt using token must be rejected with 401
        $this->postJson('/api/v1/appointments/check-in', ['token' => $token])
            ->assertStatus(401);
    }

    public function test_str_random_64_tokens_are_strictly_compatible_with_public_pass_validation(): void
    {
        // 1. Verify 200 randomly generated project tokens are 100% accepted by regex
        for ($i = 0; $i < 200; $i++) {
            $token = Str::random(64);
            $this->assertEquals(64, strlen($token));
            $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{64}$/', $token);
        }

        // 2. Non-alphanumeric or malformed lengths must be rejected with 404
        $invalidTokens = [
            Str::random(63), // length 63
            Str::random(65), // length 65
            Str::random(32) . '-' . Str::random(31), // contains hyphen
            Str::random(32) . '_' . Str::random(31), // contains underscore
            Str::random(32) . '@' . Str::random(31), // contains symbol
            'MS-2026-0888', // sequential booking reference is not accepted as public pass token
        ];

        foreach ($invalidTokens as $bad) {
            $this->getJson("/api/v1/appointments/pass/{$bad}")->assertStatus(404);
        }
    }
}

