<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorWorkingHoursService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ActiveSlotBookingTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $patientUser;
    protected BookingService $bookingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Director & Clinic
        $this->directorUser = User::factory()->create(['email' => 'director@aafiya.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-777',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة العافية للاختبارات',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021999888',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 2. Employed Doctor
        $this->doctorUser = User::factory()->create(['email' => 'doctor@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-777',
            'is_verified' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 3. Patient User
        $this->patientUser = User::factory()->create(['email' => 'patient@aafiya.dz']);
        $this->patientUser->roles()->attach($patientRole->id);

        $this->bookingService = app(BookingService::class);

        $this->configureFullSchedule();
    }

    protected function configureFullSchedule(): void
    {
        // Save clinic operating hours 08:00 to 17:00 for all days
        $opService = app(ClinicOperatingHoursService::class);
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $days[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'periods' => [
                    ['period_index' => 0, 'open_time' => '08:00', 'close_time' => '17:00'],
                ],
            ];
        }
        $opService->saveOperatingHours($this->clinic->id, $days, $this->directorUser);

        // Save and activate doctor schedule
        $docService = app(DoctorWorkingHoursService::class);
        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        $docDays = [];
        for ($d = 0; $d <= 6; $d++) {
            $docDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'slots' => $slots,
            ];
        }
        $docService->saveDraft($this->clinic->id, $this->doctor->id, $docDays, $this->doctorUser);
        $docService->activateSchedule($this->clinic->id, $this->doctor->id, $this->directorUser);
    }

    public function test_booking_within_active_slot_before_slot_end_succeeds(): void
    {
        // Slot is 09:00 (ends at 10:00). Current time is 09:30 in Africa/Algiers.
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 09:30:00', 'Africa/Algiers'));

        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختباري',
            'patient_phone' => '0555111222',
            'appointment_date' => '2026-10-15',
            'time_slot' => '09:00',
        ], $this->directorUser);

        $this->assertInstanceOf(Appointment::class, $appointment);
        $this->assertEquals('pending', $appointment->status);
        $this->assertEquals('09:00', $appointment->time_slot);
    }

    public function test_booking_at_exact_slot_end_is_rejected(): void
    {
        // Slot is 09:00 (ends at 10:00). Current time is exactly 10:00 in Africa/Algiers.
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 10:00:00', 'Africa/Algiers'));

        $this->expectException(ValidationException::class);

        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختباري',
            'patient_phone' => '0555111223',
            'appointment_date' => '2026-10-15',
            'time_slot' => '09:00',
        ], $this->directorUser);
    }

    public function test_booking_past_slot_same_day_is_rejected(): void
    {
        // Slot is 08:00 (ends at 09:00). Current time is 14:00 in Africa/Algiers.
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 14:00:00', 'Africa/Algiers'));

        $this->expectException(ValidationException::class);

        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختباري',
            'patient_phone' => '0555111224',
            'appointment_date' => '2026-10-15',
            'time_slot' => '08:00',
        ], $this->directorUser);
    }

    public function test_booking_future_canonical_slot_succeeds(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:00:00', 'Africa/Algiers'));

        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختباري',
            'patient_phone' => '0555111225',
            'appointment_date' => '2026-10-16',
            'time_slot' => '16:00',
        ], $this->directorUser);

        $this->assertInstanceOf(Appointment::class, $appointment);
        $this->assertEquals('16:00', $appointment->time_slot);
    }

    public function test_form_request_rejects_seventeen_hundred_closing_slot(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:00:00', 'Africa/Algiers'));

        $response = $this->actingAs($this->directorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson('/api/v1/appointments', [
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'patient_name' => 'مريض اختباري',
                'patient_phone' => '0555111226',
                'appointment_date' => '2026-10-16',
                'time_slot' => '17:00',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['time_slot']);
    }

    public function test_form_request_rejects_non_canonical_minutes_slot(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:00:00', 'Africa/Algiers'));

        $response = $this->actingAs($this->directorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson('/api/v1/appointments', [
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'patient_name' => 'مريض اختباري',
                'patient_phone' => '0555111227',
                'appointment_date' => '2026-10-16',
                'time_slot' => '09:30',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['time_slot']);
    }

    public function test_reschedule_to_past_slot_same_day_is_rejected(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:30:00', 'Africa/Algiers'));

        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختباري',
            'patient_phone' => '0555111228',
            'appointment_date' => '2026-10-16',
            'time_slot' => '10:00',
        ], $this->directorUser);

        // Advance time to 12:00 on 2026-10-15
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 12:00:00', 'Africa/Algiers'));

        // Attempt to reschedule to 08:00 today (ended at 09:00)
        $this->expectException(ValidationException::class);

        $this->bookingService->rescheduleAppointment($appointment, [
            'appointment_date' => '2026-10-15',
            'time_slot' => '08:00',
        ], $this->directorUser);
    }
}
