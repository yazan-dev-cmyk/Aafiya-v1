<?php

namespace Tests\Feature;

use App\Jobs\RescheduleVacationAppointmentsJob;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\DoctorVacationClinic;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorVacationService;
use App\Services\DoctorWorkingHoursService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class DoctorVacationTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Clinic $clinicC;
    protected User $patientUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Director Doctor & Primary Clinic A
        $this->directorUser = User::factory()->create(['email' => 'director@aafiya.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-VAC-01',
        ]);

        $this->clinicA = Clinic::create([
            'name' => 'عيادة العافية أ',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000001',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->clinicB = Clinic::create([
            'name' => 'عيادة العافية ب',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '021000002',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->clinicC = Clinic::create([
            'name' => 'عيادة العافية ج',
            'address' => 'قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '021000003',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        // 2. Doctor user
        $this->doctorUser = User::factory()->create(['email' => 'doctor@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-VAC-02',
        ]);

        // Affiliate doctor with Clinic A and Clinic B initially
        $this->doctor->clinics()->attach($this->clinicA->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);
        $this->doctor->clinics()->attach($this->clinicB->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        // Patient user
        $this->patientUser = User::factory()->create(['email' => 'patient@aafiya.dz']);
        $this->patientUser->roles()->attach($patientRole->id);

        // Pin test time to 2026-10-15 08:00:00 (Thursday)
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:00:00', 'Africa/Algiers'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    protected function setupClinicAndDoctorSchedule(Clinic $clinic): void
    {
        $clinicOpService = app(ClinicOperatingHoursService::class);
        $docHoursService = app(DoctorWorkingHoursService::class);

        $opDays = [];
        for ($d = 0; $d <= 6; $d++) {
            $opDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'periods' => [
                    ['period_index' => 0, 'open_time' => '08:00', 'close_time' => '17:00'],
                ],
            ];
        }
        $clinicOpService->saveOperatingHours($clinic->id, $opDays, $this->directorUser);

        $docDays = [];
        $slots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
        for ($d = 0; $d <= 6; $d++) {
            $docDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'slots' => $slots,
            ];
        }
        $docHoursService->saveDraft($clinic->id, $this->doctor->id, $docDays, $this->doctorUser);
        $docHoursService->activateSchedule($clinic->id, $this->doctor->id, $this->directorUser);
    }

    /**
     * 1. Doctor registers vacation -> status is 'effective' immediately; job dispatched.
     */
    public function test_doctor_can_register_vacation_with_immediate_effective_status(): void
    {
        Queue::fake();

        $service = app(DoctorVacationService::class);
        $vacation = $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
            'reason' => 'Annual Leave',
        ], $this->doctorUser);

        $this->assertEquals(DoctorVacation::STATUS_EFFECTIVE, $vacation->status);
        $this->assertDatabaseHas('doctor_vacations', [
            'id' => $vacation->id,
            'doctor_id' => $this->doctor->id,
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
            'status' => 'effective',
        ]);

        Queue::assertPushed(RescheduleVacationAppointmentsJob::class, function ($job) use ($vacation) {
            return $job->doctorVacationId === $vacation->id;
        });
    }

    /**
     * 2. Clinic snapshot captures currently affiliated clinics (Clinic A and Clinic B).
     */
    public function test_clinic_snapshot_captures_currently_affiliated_clinics(): void
    {
        $service = app(DoctorVacationService::class);
        $vacation = $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $clinics = $vacation->vacationClinics()->pluck('clinic_id')->toArray();
        $this->assertCount(2, $clinics);
        $this->assertContains($this->clinicA->id, $clinics);
        $this->assertContains($this->clinicB->id, $clinics);
    }

    /**
     * 3. Newly added clinic (Clinic C) after registration is NOT included in past snapshot.
     */
    public function test_newly_added_clinic_is_excluded_from_past_vacation_snapshot(): void
    {
        $service = app(DoctorVacationService::class);
        $vacation = $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Doctor subsequently affiliates with Clinic C
        $this->doctor->clinics()->attach($this->clinicC->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        // Check if vacation applies to Clinic C
        $this->assertTrue($service->isDoctorOnVacation($this->doctor->id, $this->clinicA->id, '2026-10-22'));
        $this->assertTrue($service->isDoctorOnVacation($this->doctor->id, $this->clinicB->id, '2026-10-22'));
        $this->assertFalse($service->isDoctorOnVacation($this->doctor->id, $this->clinicC->id, '2026-10-22'));
    }

    /**
     * 4. Vacation cancellation updates status to 'cancelled' without physical deletion.
     */
    public function test_vacation_cancellation_is_status_transition_without_physical_deletion(): void
    {
        $service = app(DoctorVacationService::class);
        $vacation = $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $cancelled = $service->cancelVacation($vacation, $this->doctorUser);

        $this->assertEquals(DoctorVacation::STATUS_CANCELLED, $cancelled->status);
        $this->assertDatabaseHas('doctor_vacations', [
            'id' => $vacation->id,
            'status' => 'cancelled',
        ]);
        $this->assertDatabaseCount('doctor_vacations', 1);

        // Vacation is no longer effective on those dates
        $this->assertFalse($service->isDoctorOnVacation($this->doctor->id, $this->clinicA->id, '2026-10-22'));
    }

    /**
     * 5. Unauthorized user cannot register or cancel vacation.
     */
    public function test_unauthorized_user_cannot_register_or_cancel_vacation(): void
    {
        $service = app(DoctorVacationService::class);

        // Other doctor user
        $otherUser = User::factory()->create();
        Doctor::create([
            'user_id' => $otherUser->id,
            'specialty' => 'عيون',
            'license_number' => 'DOC-OTHER',
        ]);

        $this->expectException(HttpException::class);
        $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $otherUser);
    }

    public function test_unauthorized_user_cannot_cancel_vacation(): void
    {
        $service = app(DoctorVacationService::class);
        $vacation = $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $otherUser = User::factory()->create();

        $this->expectException(HttpException::class);
        $service->cancelVacation($vacation, $otherUser);
    }

    /**
     * 6. Booking creation is rejected inside vacation dates at snapshotted clinic.
     */
    public function test_booking_creation_rejected_inside_vacation_in_snapshotted_clinic(): void
    {
        $this->setupClinicAndDoctorSchedule($this->clinicA);

        $service = app(DoctorVacationService::class);
        $service->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $bookingService = app(BookingService::class);

        $this->expectException(ValidationException::class);
        try {
            $bookingService->createAppointment([
                'clinic_id' => $this->clinicA->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => '2026-10-22',
                'time_slot' => '10:00',
                'patient_name' => 'عمر خالد',
                'patient_phone' => '0555123456',
            ], $this->patientUser);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('appointment_date', $e->errors());
            $this->assertEquals('DOCTOR_ON_VACATION', $e->errorBag);
            throw $e;
        }
    }

    /**
     * 7. Rescheduling is rejected inside vacation dates at snapshotted clinic.
     */
    public function test_rescheduling_rejected_inside_vacation_in_snapshotted_clinic(): void
    {
        $this->setupClinicAndDoctorSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-18', // Before vacation
            'time_slot' => '10:00',
            'patient_name' => 'عمر خالد',
            'patient_phone' => '0555123456',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $this->expectException(ValidationException::class);
        try {
            $bookingService->rescheduleAppointment($appointment, [
                'appointment_date' => '2026-10-21', // Inside vacation
                'time_slot' => '11:00',
            ], $this->patientUser);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('appointment_date', $e->errors());
            $this->assertEquals('DOCTOR_ON_VACATION', $e->errorBag);
            throw $e;
        }
    }

    /**
     * 8. Available slots returns empty list during vacation dates.
     */
    public function test_available_slots_returns_empty_during_vacation_dates(): void
    {
        $this->setupClinicAndDoctorSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $vacationService = app(DoctorVacationService::class);

        // Before vacation registration: slots are available
        $slotsBefore = $bookingService->getAvailableSlots($this->doctor, $this->clinicA, '2026-10-22');
        $this->assertNotEmpty($slotsBefore);

        // Register vacation
        $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // During vacation: slots return empty
        $slotsDuring = $bookingService->getAvailableSlots($this->doctor, $this->clinicA, '2026-10-22');
        $this->assertEmpty($slotsDuring);
    }

    /**
     * 9. Booking succeeds at clinic NOT included in vacation snapshot (Clinic C).
     */
    public function test_booking_succeeds_at_clinic_not_included_in_vacation_snapshot(): void
    {
        $vacationService = app(DoctorVacationService::class);
        $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Now attach doctor to Clinic C and configure schedule
        $this->doctor->clinics()->attach($this->clinicC->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);
        $this->setupClinicAndDoctorSchedule($this->clinicC);

        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinicC->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'طارق زياد',
            'patient_phone' => '0555987654',
        ], $this->patientUser);

        $this->assertNotNull($appointment->id);
        $this->assertEquals($this->clinicC->id, $appointment->clinic_id);
    }

    /**
     * 10. Dates immediately before and after vacation remain bookable.
     */
    public function test_dates_immediately_before_and_after_vacation_remain_bookable(): void
    {
        $this->setupClinicAndDoctorSchedule($this->clinicA);

        $vacationService = app(DoctorVacationService::class);
        $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $bookingService = app(BookingService::class);

        // Day before vacation: 2026-10-19
        $slotsBefore = $bookingService->getAvailableSlots($this->doctor, $this->clinicA, '2026-10-19');
        $this->assertNotEmpty($slotsBefore);

        // Day after vacation: 2026-10-26
        $slotsAfter = $bookingService->getAvailableSlots($this->doctor, $this->clinicA, '2026-10-26');
        $this->assertNotEmpty($slotsAfter);
    }

    /**
     * 11. Overlapping effective vacations for the same doctor are rejected.
     */
    public function test_overlapping_effective_vacations_for_same_doctor_are_rejected(): void
    {
        $vacationService = app(DoctorVacationService::class);
        $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $this->expectException(ValidationException::class);
        try {
            $vacationService->registerVacation($this->doctor, [
                'vacation_start' => '2026-10-22',
                'vacation_end' => '2026-10-28',
            ], $this->doctorUser);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('vacation_start', $e->errors());
            $this->assertEquals('DOCTOR_VACATION_OVERLAP', $e->errorBag);
            throw $e;
        }
    }
}
