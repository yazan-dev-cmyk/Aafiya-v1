<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentCheckInQrTest extends TestCase
{
    use RefreshDatabase;

    protected User $assistantUser;
    protected Clinic $clinic;
    protected Doctor $doctor;
    protected Patient $patient;

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
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();

        $doctorUser = User::factory()->create(['email' => 'doctor@clinic.dz']);
        $doctorUser->roles()->attach($doctorRole->id);

        $this->doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-QR-1234',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء النموذجية',
            'address' => 'شارع ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021778899',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->assistantUser = User::factory()->create(['email' => 'assistant@clinic.dz']);
        $this->assistantUser->roles()->attach($assistantRole->id);
        \App\Models\ClinicAssistant::create([
            'clinic_id' => $this->clinic->id,
            'user_id' => $this->assistantUser->id,
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-VAL99',
            'first_name' => 'سارة',
            'last_name' => 'بلمهيدي',
            'gender' => 'female',
            'date_of_birth' => '1995-05-15',
            'phone' => '0555123456',
            'national_id' => '199516010099',
        ]);
    }

    public function test_appointment_created_receives_unique_64_character_secure_token(): void
    {
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'فاطمة الزهراء',
            'patient_phone' => '0555998877',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
        ], $this->assistantUser);

        $this->assertNotNull($appointment->secure_token);
        $this->assertEquals(64, strlen($appointment->secure_token));
        $this->assertNull($appointment->checked_in_at);
        $this->assertNull($appointment->checked_in_by_id);
    }

    public function test_appointment_token_is_completely_independent_from_patient_mrn(): void
    {
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
            'patient_mrn' => $this->patient->mrn,
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'time_slot' => '11:00',
        ], $this->assistantUser);

        $this->assertNotEquals($appointment->secure_token, $this->patient->mrn);
        $this->assertStringNotContainsString($this->patient->mrn, $appointment->secure_token);
        $this->assertEquals(64, strlen($appointment->secure_token));
    }

    public function test_first_scan_check_in_succeeds_and_populates_checked_in_at(): void
    {
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
            'patient_mrn' => $this->patient->mrn,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'time_slot' => '09:00',
        ], $this->assistantUser);
        $appointment->update(['status' => 'confirmed']);

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->assistantUser->id, $fresh->checked_in_by_id);
    }

    public function test_second_scan_with_same_token_is_safely_idempotent(): void
    {
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'محمد العربي',
            'patient_phone' => '0555443322',
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'time_slot' => '14:00',
        ], $this->assistantUser);
        $appointment->update(['status' => 'confirmed']);

        // First Scan -> 200 OK
        $first = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);
        $first->assertStatus(200);

        // Second Scan with SAME token -> 200 OK (safely idempotent)
        $second = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $second->assertStatus(200);
        $second->assertJsonPath('data.status', 'attended');
    }

    public function test_check_in_with_invalid_token_fails_with_422(): void
    {
        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => Str::random(64), // non-existent
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['token']);
    }

    public function test_check_in_on_cancelled_appointment_fails_with_422(): void
    {
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'كريم بن ناصر',
            'patient_phone' => '0555001122',
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'time_slot' => '15:00',
        ], $this->assistantUser);
        $appointment->update(['status' => 'confirmed']);

        $bookingService->rejectOrCancelAppointment(
            $appointment,
            $this->assistantUser,
            'إلغاء تجريبي للموعد',
            'cancelled'
        );

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
    }
}
