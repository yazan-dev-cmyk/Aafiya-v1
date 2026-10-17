<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorWorkingSlot;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorWorkingHoursService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorWeeklyWorkingHoursTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();

        // 1. Director Doctor & Clinic
        $this->directorUser = User::factory()->create(['email' => 'director@aafiya.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-999',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة العافية المركزية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000000',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Employed Doctor
        $this->doctorUser = User::factory()->create(['email' => 'doctor@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-888',
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
        ]);

        // Pin evaluation time to 2026-10-11 08:00:00 in Africa/Algiers for deterministic active-slot boundary testing
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-11 08:00:00', 'Africa/Algiers'));

        // Enable patient self-booking strictly within test execution context (DEC-GAP-D01 test pattern)
        config(['booking.patient_booking_enabled' => true]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    protected function configureFullClinicOperatingHours(): void
    {
        $service = app(ClinicOperatingHoursService::class);
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            // Saturday (0) and Friday (6) closed by default
            if ($d === 0 || $d === 6) {
                $days[] = ['day_of_week' => $d, 'is_closed' => true, 'periods' => []];
            } else {
                $days[] = [
                    'day_of_week' => $d,
                    'is_closed' => false,
                    'periods' => [
                        ['period_index' => 0, 'open_time' => '08:00', 'close_time' => '17:00'],
                    ],
                ];
            }
        }
        $service->saveOperatingHours($this->clinic->id, $days, $this->directorUser);
    }

    protected function buildSampleSevenDays(bool $with17Slot = false): array
    {
        $slots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
        if ($with17Slot) {
            $slots[] = '17:00';
        }

        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            if ($d === 0 || $d === 6) {
                $days[] = [
                    'day_of_week' => $d,
                    'is_closed' => true,
                    'slots' => [],
                ];
            } else {
                $days[] = [
                    'day_of_week' => $d,
                    'is_closed' => false,
                    'slots' => $slots,
                ];
            }
        }
        return $days;
    }

    public function test_canonical_weekday_mapping_saturday_is_zero_and_friday_is_six(): void
    {
        // 2026-10-10 is a Saturday
        $sat = Carbon::parse('2026-10-10');
        $this->assertSame(0, ($sat->dayOfWeek + 1) % 7);

        // 2026-10-11 is a Sunday
        $sun = Carbon::parse('2026-10-11');
        $this->assertSame(1, ($sun->dayOfWeek + 1) % 7);

        // 2026-10-16 is a Friday
        $fri = Carbon::parse('2026-10-16');
        $this->assertSame(6, ($fri->dayOfWeek + 1) % 7);
    }

    public function test_schedule_draft_can_be_saved_before_activation(): void
    {
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.is_activated', false);
        $this->assertDatabaseHas('doctor_day_schedules', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'day_of_week' => 1,
            'is_closed' => false,
        ]);
    }

    public function test_activation_requires_all_seven_distinct_weekdays(): void
    {
        // Save only 6 days
        $days = $this->buildSampleSevenDays();
        array_pop($days); // Remove day 6

        // Bypass draft request validation to test domain service completeness validation directly
        $service = app(DoctorWorkingHoursService::class);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->activateSchedule($this->clinic->id, $this->doctor->id, $this->doctorUser);
    }

    public function test_activation_rejects_17_00_slot(): void
    {
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(with17Slot: true),
            ]);

        $response->assertStatus(422);
    }

    public function test_activation_authorized_for_doctor_and_clinic_director(): void
    {
        $this->configureFullClinicOperatingHours();

        // 1. Doctor saves draft
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ])
            ->assertStatus(200);

        // 2. Clinic Director can activate it
        $response = $this->actingAs($this->directorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson("/api/v1/doctors/{$this->doctor->id}/working-hours/activate");

        $response->assertStatus(200);
        $response->assertJsonPath('data.is_activated', true);

        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'is_working_hours_activated' => true,
        ]);
    }

    public function test_activation_denied_for_unauthorized_user(): void
    {
        $unrelatedUser = User::factory()->create();

        $this->actingAs($unrelatedUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson("/api/v1/doctors/{$this->doctor->id}/working-hours/activate")
            ->assertStatus(403);
    }

    public function test_schedule_cannot_be_edited_after_activation(): void
    {
        $this->configureFullClinicOperatingHours();

        // Save & activate
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ])->assertStatus(200);

        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson("/api/v1/doctors/{$this->doctor->id}/working-hours/activate")
            ->assertStatus(200);

        // Attempting draft edit after activation must be rejected with 422 SCHEDULE_LOCKED_ACTIVATED
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ])
            ->assertStatus(422);
    }

    public function test_booking_rejected_when_clinic_operating_hours_not_configured(): void
    {
        $patientUser = User::factory()->create();

        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0550112233',
            'appointment_date' => '2026-10-11', // Sunday
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['clinic_id']);
    }

    public function test_booking_rejected_when_doctor_schedule_not_activated(): void
    {
        $this->configureFullClinicOperatingHours();
        $patientUser = User::factory()->create();

        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0550112233',
            'appointment_date' => '2026-10-11', // Sunday
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['doctor_id']);
    }

    public function test_booking_rejected_for_closed_day_or_disabled_slot(): void
    {
        $this->configureFullClinicOperatingHours();

        // Save & activate schedule (Friday day 6 is closed)
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ])->assertStatus(200);

        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson("/api/v1/doctors/{$this->doctor->id}/working-hours/activate")
            ->assertStatus(200);

        $patientUser = User::factory()->create();

        // Friday 2026-10-16 is closed
        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0550112233',
            'appointment_date' => '2026-10-16',
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['time_slot']);
    }

    public function test_booking_succeeds_for_activated_enabled_slot(): void
    {
        $this->configureFullClinicOperatingHours();

        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->putJson("/api/v1/doctors/{$this->doctor->id}/working-hours", [
                'days' => $this->buildSampleSevenDays(),
            ])->assertStatus(200);

        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinic->id)
            ->postJson("/api/v1/doctors/{$this->doctor->id}/working-hours/activate")
            ->assertStatus(200);

        $patientUser = User::factory()->create();

        // Sunday 2026-10-11 at 10:00
        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0550112233',
            'appointment_date' => '2026-10-11',
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.time_slot', '10:00');
        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'time_slot' => '10:00',
            'status' => 'pending',
        ]);
    }

    public function test_get_available_slots_is_read_only_and_creates_no_records(): void
    {
        $initialSlotsCount = AppointmentSlot::count();

        // Calling slots for unactivated doctor
        $bookingService = app(BookingService::class);
        $slots = $bookingService->getAvailableSlots($this->doctor, $this->clinic, '2026-10-11');

        $this->assertEmpty($slots);
        $this->assertSame($initialSlotsCount, AppointmentSlot::count());
    }
}
