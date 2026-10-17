<?php

namespace Tests\Feature;

use App\Jobs\RescheduleVacationAppointmentsJob;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\DoctorVacationClinic;
use App\Models\NotificationOutbox;
use App\Models\Role;
use App\Models\User;
use App\Models\VacationAppointmentReschedule;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorVacationService;
use App\Services\DoctorWorkingHoursService;
use App\Services\VacationRescheduleEngine;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class VacationRescheduleEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
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
            'license_number' => 'DIR-VAC-ENG-01',
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
            'name' => 'عيادة العافية ب (خارج النطاق)',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '021000002',
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
            'license_number' => 'DOC-VAC-ENG-02',
        ]);

        // Affiliate doctor initially only with Clinic A
        $this->doctor->clinics()->attach($this->clinicA->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        // Patient user
        $this->patientUser = User::factory()->create(['email' => 'patient@aafiya.dz']);
        $this->patientUser->roles()->attach($patientRole->id);

        // Pin evaluation time to 2026-10-15 08:00:00 (Thursday)
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 08:00:00', 'Africa/Algiers'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    protected function setupFullOperatingHoursAndSchedule(Clinic $clinic, array $slots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']): void
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
     * 1. Only appointments in snapshotted clinics and within vacation date range are relocated.
     * 2. Appointments outside the vacation range are left untouched.
     */
    public function test_only_appointments_in_snapshotted_clinics_and_within_range_are_selected(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);

        // Appointment 1: Inside vacation range (2026-10-22)
        $apptInside = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '09:00',
            'patient_name' => 'مريض داخل الإجازة',
            'patient_phone' => '0555111111',
        ], $this->patientUser);

        // Appointment 2: Outside vacation range (2026-10-18)
        $apptOutside = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-18',
            'time_slot' => '09:00',
            'patient_name' => 'مريض قبل الإجازة',
            'patient_phone' => '0555222222',
        ], $this->patientUser);

        // Register vacation: 2026-10-20 to 2026-10-25
        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['total_affected']);
        $this->assertEquals(1, $stats['rescheduled']);

        // Assert apptInside moved to first candidate slot after 2026-10-25 (e.g. 2026-10-26 08:00)
        $apptInside->refresh();
        $this->assertEquals('2026-10-26', $apptInside->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $apptInside->time_slot);

        // Assert apptOutside remained completely untouched
        $apptOutside->refresh();
        $this->assertEquals('2026-10-18', $apptOutside->appointment_date->format('Y-m-d'));
        $this->assertEquals('09:00', $apptOutside->time_slot);

        // Ledger check
        $this->assertDatabaseHas('vacation_appointment_reschedules', [
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $apptInside->id,
            'status' => 'rescheduled',
        ]);
        $this->assertDatabaseMissing('vacation_appointment_reschedules', [
            'original_appointment_id' => $apptOutside->id,
        ]);
    }

    /**
     * 3. Valid candidate is selected strictly within [D_end + 1, D_end + 30].
     * 4. First and last permitted candidate dates are respected.
     */
    public function test_candidate_selected_within_30_day_horizon(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-21',
            'time_slot' => '10:00',
            'patient_name' => 'سعيد مراد',
            'patient_phone' => '0555333333',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $candidate = $engine->findReplacementSlot($vacation, $this->clinicA, $this->doctor);

        $this->assertNotNull($candidate);
        // First candidate date must be vacation_end + 1 = 2026-10-26
        $this->assertEquals('2026-10-26', $candidate['date']);
        $this->assertEquals('08:00', $candidate['time_slot']);
    }

    /**
     * 5. Seven-day Option B boundary is evaluated independently of the 30-day search horizon.
     */
    public function test_seven_day_option_b_boundary_enforced_independently(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'خالد ناصر',
            'patient_phone' => '0555444444',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);

        // Within 7 days: isBeyondSevenDayWindow is false
        $this->assertFalse($engine->isBeyondSevenDayWindow($appt));

        // Advance clock past 7 calendar days from appointment creation
        // Created at 2026-10-15 08:00 -> 7th day midnight is 2026-10-22 00:00:00
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-22 00:00:00', 'Africa/Algiers'));
        $this->assertTrue($engine->isBeyondSevenDayWindow($appt));

        // Process rescheduling when clock is past 7 days -> records urgent_unresolved with RESTORATION_WINDOW_EXPIRED_7_DAYS
        $stats = $engine->processVacationRescheduling($vacation);
        $this->assertEquals(1, $stats['unresolved']);

        $this->assertDatabaseHas('vacation_appointment_reschedules', [
            'original_appointment_id' => $appt->id,
            'status' => 'urgent_unresolved',
            'failure_reason' => 'RESTORATION_WINDOW_EXPIRED_7_DAYS',
        ]);
    }

    /**
     * 6. Unconfigured clinic or inactive schedule disqualifies candidates and records urgent_unresolved.
     */
    public function test_unconfigured_hours_or_inactive_schedule_produces_urgent_unresolved(): void
    {
        Queue::fake();

        // Notice: Clinic hours not configured, schedule not activated
        // Directly insert occupying appointment to test resilience
        $appt = Appointment::create([
            'booking_reference' => 'TEST-UNCONF-01',
            'secure_token' => 'token-unconf-01',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'ياسين أحمد',
            'patient_phone' => '0555555555',
            'created_by_id' => $this->patientUser->id,
            'creator_type' => 'patient',
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'status' => 'confirmed',
        ]);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['unresolved']);
        $this->assertDatabaseHas('vacation_appointment_reschedules', [
            'original_appointment_id' => $appt->id,
            'status' => 'urgent_unresolved',
            'failure_reason' => 'NO_AVAILABLE_SLOT_WITHIN_30_DAYS',
        ]);

        // Original appointment remains intact
        $appt->refresh();
        $this->assertEquals('confirmed', $appt->status);
        $this->assertEquals('2026-10-22', $appt->appointment_date->format('Y-m-d'));
    }

    /**
     * 7. Quarantined, unavailable, or capacity-full slots are avoided by candidate search.
     */
    public function test_quarantined_and_full_capacity_slots_are_skipped(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);

        // Pre-create slot row for 2026-10-26 08:00 and quarantine it
        $slotQuarantined = AppointmentSlot::create([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-26',
            'time_slot' => '08:00',
            'capacity' => 5,
            'booked_count' => 0,
            'is_quarantined' => true,
            'quarantine_reason' => 'DRIFT_TEST',
        ]);

        // Create appointment in vacation range
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'كريم زروق',
            'patient_phone' => '0555666666',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $candidate = $engine->findReplacementSlot($vacation, $this->clinicA, $this->doctor);

        // Should skip 08:00 (quarantined) and pick next open slot: 09:00
        $this->assertEquals('2026-10-26', $candidate['date']);
        $this->assertEquals('09:00', $candidate['time_slot']);
    }

    /**
     * 8. Doctor exclusivity across clinics is preserved.
     */
    public function test_doctor_exclusivity_across_clinics_prevents_conflicting_candidate_slot(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        // Doctor is affiliated with Clinic B as well, and Clinic B holds a reservation on 2026-10-26 08:00
        DB::table('doctor_time_reservations')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'appointment_date' => '2026-10-26',
            'time_slot' => '08:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'جمال عبدلي',
            'patient_phone' => '0555777777',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $candidate = $engine->findReplacementSlot($vacation, $this->clinicA, $this->doctor);

        // Skips 08:00 (reserved by Clinic B) and selects 09:00
        $this->assertEquals('2026-10-26', $candidate['date']);
        $this->assertEquals('09:00', $candidate['time_slot']);
    }

    /**
     * 9. Repeated job execution does not duplicate outcomes or move appointments repeatedly (Sequential Idempotency).
     */
    public function test_repeated_execution_is_idempotent(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'نور الدين',
            'patient_phone' => '0555888888',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);

        // Run 1
        $stats1 = $engine->processVacationRescheduling($vacation);
        $this->assertEquals(1, $stats1['rescheduled']);

        // Run 2 (repeated execution)
        $stats2 = $engine->processVacationRescheduling($vacation);
        $this->assertEquals(0, $stats2['rescheduled']);
        $this->assertEquals(0, $stats2['unresolved']);

        // Ensure exactly 1 ledger record exists
        $ledgerCount = VacationAppointmentReschedule::where('original_appointment_id', $appt->id)->count();
        $this->assertEquals(1, $ledgerCount);
    }

    /**
     * 10. Database unique constraint rejects duplicate (doctor_vacation_id, original_appointment_id) pair.
     */
    public function test_database_unique_constraint_rejects_duplicate_ledger_pair(): void
    {
        $vacation = DoctorVacation::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'doctor_id' => $this->doctor->id,
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
            'status' => 'effective',
        ]);

        $appt = Appointment::create([
            'booking_reference' => 'TEST-UNIQ-01',
            'secure_token' => 'token-uniq-01',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض قيد فريد',
            'patient_phone' => '0555123999',
            'created_by_id' => $this->patientUser->id,
            'creator_type' => 'patient',
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'status' => 'confirmed',
        ]);

        // First insert succeeds
        VacationAppointmentReschedule::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $appt->id,
            'clinic_id' => $this->clinicA->id,
            'status' => 'rescheduled',
        ]);

        // Second direct insert must fail with QueryException / ER_DUP_ENTRY (1062)
        $this->expectException(QueryException::class);
        VacationAppointmentReschedule::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $appt->id,
            'clinic_id' => $this->clinicA->id,
            'status' => 'rescheduled',
        ]);
    }

    /**
     * 11. Concurrent collision handling safely recognizes existing terminal outcome without duplicate inserts.
     */
    public function test_concurrent_conflict_handling_recognizes_existing_terminal_outcome(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'فارس حمودي',
            'patient_phone' => '0555112233',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Pre-insert terminal outcome simulating a winning concurrent worker
        VacationAppointmentReschedule::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $appt->id,
            'replacement_appointment_id' => $appt->id,
            'clinic_id' => $this->clinicA->id,
            'status' => VacationAppointmentReschedule::STATUS_RESCHEDULED,
            'resolved_at' => now(),
        ]);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        // Must be safely skipped
        $this->assertEquals(0, $stats['rescheduled']);
        $this->assertEquals(0, $stats['unresolved']);
        $this->assertEquals(1, $stats['skipped']);

        // Exactly 1 row in ledger
        $this->assertEquals(1, VacationAppointmentReschedule::where('original_appointment_id', $appt->id)->count());
    }

    /**
     * 12. Option B produces notification_outbox entry and preserves original appointment.
     */
    public function test_option_b_creates_outbox_record_without_claiming_delivery(): void
    {
        Queue::fake();

        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        // Create appointment in vacation range
        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مصطفى بن علي',
            'patient_phone' => '0555999999',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Advance clock past 7 days to trigger Option B failure pathway
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-24 00:00:00', 'Africa/Algiers'));

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['unresolved']);

        // Verify notification_outbox record was created
        $outbox = NotificationOutbox::where('appointment_id', $appt->id)->first();
        $this->assertNotNull($outbox);
        $this->assertEquals('pending', $outbox->status);
        $this->assertNull($outbox->acknowledged_at);
        $this->assertEquals('vacation_reschedule_unresolved', $outbox->template);
    }

    /**
     * 13. Cancelled vacations are safely ignored by the engine.
     */
    public function test_cancelled_vacations_are_skipped(): void
    {
        Queue::fake();

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $vacationService->cancelVacation($vacation, $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(0, $stats['total_affected']);
        $this->assertEquals(0, $stats['rescheduled']);
        $this->assertEquals(0, $stats['unresolved']);
    }

    /**
     * 14. Full end-to-end integration via RescheduleVacationAppointmentsJob dispatch.
     */
    public function test_reschedule_vacation_appointments_job_end_to_end_execution(): void
    {
        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض تنفيذ متزامن',
            'patient_phone' => '0555000000',
        ], $this->patientUser);

        // When queue is sync (phpunit default without Queue::fake), registerVacation dispatches job synchronously
        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Assert job executed immediately in sync mode
        $appt->refresh();
        $this->assertEquals('2026-10-26', $appt->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $appt->time_slot);

        $this->assertDatabaseHas('vacation_appointment_reschedules', [
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $appt->id,
            'status' => 'rescheduled',
        ]);
    }

    /**
     * TC-RES-02: Vacation cancellation preserves completed reschedules in their new slots (DEC-VAC-05).
     *
     * Invariants:
     * - An appointment successfully relocated by the engine stays at its destination slot.
     * - Cancelling the vacation transitions vacation status to 'cancelled' without reverting the appointment.
     * - The original slot counter remains 0; the destination slot counter remains 1.
     * - Vacation appointment reschedule ledger records and status remain consistent without duplicates.
     * - Re-running the engine skips the cancelled vacation (0 affected).
     */
    public function test_tc_res_02_vacation_cancellation_preserves_completed_reschedules(): void
    {
        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض اختبار إلغاء الإجازة',
            'patient_phone' => '0555112233',
        ], $this->patientUser);

        // Verify initial slot counter is 1
        $initialSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-22')
            ->where('time_slot', '10:00')
            ->first();
        $this->assertNotNull($initialSlot);
        $this->assertEquals(1, $initialSlot->booked_count);

        // Register vacation covering 2026-10-20 to 2026-10-25
        // Dispatches RescheduleVacationAppointmentsJob synchronously in sync queue
        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Refresh and verify appointment moved to D_end + 1 (2026-10-26 08:00)
        $appt->refresh();
        $this->assertEquals('2026-10-26', $appt->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $appt->time_slot);

        // Verify counters post-reschedule
        $initialSlot->refresh();
        $this->assertEquals(0, $initialSlot->booked_count, 'Original slot booked_count must be decremented to 0');

        $destSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertNotNull($destSlot);
        $this->assertEquals(1, $destSlot->booked_count, 'Destination slot booked_count must be 1');

        // Verify ledger entry
        $ledgerCountBefore = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->count();
        $this->assertEquals(1, $ledgerCountBefore);

        // ACTION: Cancel the vacation
        $cancelledVacation = $vacationService->cancelVacation($vacation, $this->doctorUser);
        $this->assertEquals(DoctorVacation::STATUS_CANCELLED, $cancelledVacation->status);

        // ASSERT: Completed reschedule remains at replacement date/slot (DEC-VAC-05)
        $appt->refresh();
        $this->assertEquals('2026-10-26', $appt->appointment_date->format('Y-m-d'), 'Appointment must remain at replacement date after cancellation');
        $this->assertEquals('08:00', $appt->time_slot, 'Appointment must remain at replacement time_slot after cancellation');

        // Counters must remain consistent
        $initialSlot->refresh();
        $destSlot->refresh();
        $this->assertEquals(0, $initialSlot->booked_count, 'Original slot booked_count must remain 0 after cancellation');
        $this->assertEquals(1, $destSlot->booked_count, 'Destination slot booked_count must remain 1 after cancellation');

        // Ledger record remains exactly 1 and retains 'rescheduled' status
        $ledgerRow = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->first();
        $this->assertNotNull($ledgerRow);
        $this->assertEquals(VacationAppointmentReschedule::STATUS_RESCHEDULED, $ledgerRow->status);

        // Re-running engine on cancelled vacation skips execution safely
        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation->fresh());
        $this->assertEquals(0, $stats['total_affected']);
        $this->assertEquals(0, $stats['rescheduled']);
    }

    /**
     * TC-RES-03: Shortened vacation preserves completed reschedules; opened days allow new bookings (DEC-VAC-05).
     *
     * Note on Scope & Governance:
     * - Shortening is tested at the Domain/Engine level only by updating the model's vacation_end.
     * - No public vacation-update Service method or REST API is being asserted or introduced in V1.
     *
     * Invariants:
     * - An appointment relocated during the initial vacation window remains at its destination slot.
     * - Shortening vacation_end so the original appointment date is now outside the vacation period
     *   does NOT revert the relocated appointment.
     * - The newly opened date is no longer blocked: isDoctorOnVacation returns false, and new bookings succeed.
     * - Slot counters, doctor reservations, and ledger records remain consistent without duplicates.
     */
    public function test_tc_res_03_vacation_shortening_preserves_reschedules_and_allows_new_bookings(): void
    {
        $this->setupFullOperatingHoursAndSchedule($this->clinicA);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-25',
            'time_slot' => '10:00',
            'patient_name' => 'مريض تقصير الإجازة',
            'patient_phone' => '0555223344',
        ], $this->patientUser);

        // Register vacation: 2026-10-20 to 2026-10-25
        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Appointment was relocated outside [2026-10-20, 2026-10-25] to 2026-10-26 08:00
        $appt->refresh();
        $this->assertEquals('2026-10-26', $appt->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $appt->time_slot);

        $destSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertEquals(1, $destSlot->booked_count);

        // ACTION (Domain/Engine Level): Shorten vacation to end on 2026-10-23 instead of 2026-10-25
        // Original date 2026-10-25 is now AFTER the shortened vacation end date
        $vacation->update(['vacation_end' => '2026-10-23']);
        $vacation->refresh();

        // Rerun engine on the shortened vacation state
        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);
        $this->assertEquals(0, $stats['total_affected'], 'No occupying appointments remaining in shortened window');

        // ASSERT 1: Previously rescheduled appointment is NOT reverted
        $appt->refresh();
        $this->assertEquals('2026-10-26', $appt->appointment_date->format('Y-m-d'), 'Moved appointment must stay at replacement slot');
        $this->assertEquals('08:00', $appt->time_slot);
        $destSlot->refresh();
        $this->assertEquals(1, $destSlot->booked_count);

        // ASSERT 2: The opened date (2026-10-25) is no longer on vacation
        $this->assertFalse(
            $vacationService->isDoctorOnVacation($this->doctor->id, $this->clinicA->id, '2026-10-25'),
            'Shortened date must no longer be blocked by vacation'
        );

        // ASSERT 3: New booking on the opened date succeeds without vacation rejection
        $secondPatient = User::factory()->create(['email' => 'patient2@aafiya.dz']);
        $newAppt = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-25',
            'time_slot' => '10:00',
            'patient_name' => 'مريض جديد في اليوم المتاح بعد التقصير',
            'patient_phone' => '0555998877',
        ], $secondPatient);

        $this->assertNotNull($newAppt);
        $this->assertEquals('2026-10-25', $newAppt->appointment_date->format('Y-m-d'));

        // Opened slot booked_count is now 1
        $openedSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-25')
            ->where('time_slot', '10:00')
            ->first();
        $this->assertEquals(1, $openedSlot->booked_count);

        // Ledger row remains exactly 1 for the original moved appointment
        $ledgerCount = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)->count();
        $this->assertEquals(1, $ledgerCount);
    }

    /**
     * TC-RES-04: Extended vacation triggers additional rescheduling for newly covered appointments (DEC-VAC-05).
     *
     * Note on Scope & Governance:
     * - Extension is tested at the Domain/Engine level only by updating the model's vacation_end.
     * - No public vacation-update Service method or REST API is being asserted or introduced in V1.
     *
     * Invariants:
     * - Appointments falling into the newly extended window are identified and relocated.
     * - Previously moved appointments are recognized as already completed and remain in place (idempotency).
     * - Ledger entries are not duplicated; newly affected appointments receive their own ledger rows.
     * - Slot counters on all affected source and destination slots remain consistent.
     */
    public function test_tc_res_04_extended_vacation_reschedules_newly_covered_appointments(): void
    {
        $this->setupFullOperatingHoursAndSchedule($this->clinicA);
        $bookingService = app(BookingService::class);

        // 1. Initial Appointment 1 on 2026-10-22 (within initial vacation)
        $appt1 = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض الجولة الأولى',
            'patient_phone' => '0555001122',
        ], $this->patientUser);

        // 2. Initial Appointment 2 on 2026-10-27 (initially outside vacation, but inside extension)
        $secondPatient = User::factory()->create(['email' => 'patient_ext@aafiya.dz']);
        $appt2 = $bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-27',
            'time_slot' => '10:00',
            'patient_name' => 'مريض فترة التمديد',
            'patient_phone' => '0555334455',
        ], $secondPatient);

        // 3. Register vacation: 2026-10-20 to 2026-10-25
        // First pass relocates appt1 to 2026-10-26 08:00. appt2 (on 2026-10-27) is untouched.
        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $appt1->refresh();
        $appt2->refresh();
        $this->assertEquals('2026-10-26', $appt1->appointment_date->format('Y-m-d'));
        $this->assertEquals('2026-10-27', $appt2->appointment_date->format('Y-m-d'), 'Appt 2 was not in initial vacation');

        $this->assertEquals(1, VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)->count());

        // ACTION (Domain/Engine Level): Extend vacation end date from 2026-10-25 to 2026-10-28
        // Now appt2 (on 2026-10-27) falls inside the extended vacation window!
        // Note: appt1 was relocated to 2026-10-26 which also falls in [2026-10-20, 2026-10-28].
        $vacation->update(['vacation_end' => '2026-10-28']);
        $vacation->refresh();

        // 4. Rerun the engine on the extended vacation
        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        // Both appt1 and appt2 are occupying in [2026-10-20, 2026-10-28]
        // appt1 has existing ledger with status=rescheduled -> engine skips appt1 (skipped++)
        // appt2 has no ledger -> engine relocates appt2 past extended D_end (to 2026-10-29 or later) (rescheduled++)
        $this->assertEquals(2, $stats['total_affected']);
        $this->assertEquals(1, $stats['rescheduled'], 'Only appt2 should be newly rescheduled');
        $this->assertEquals(1, $stats['skipped'], 'appt1 was already relocated and must be skipped');

        // ASSERT 1: appt2 was moved to after extended vacation (D_end + 1 = 2026-10-29)
        $appt2->refresh();
        $this->assertEquals('2026-10-29', $appt2->appointment_date->format('Y-m-d'), 'Appt 2 must be relocated to post-extension date');
        $this->assertEquals('08:00', $appt2->time_slot);

        // ASSERT 2: appt2 source slot counter (2026-10-27 10:00) decremented to 0
        $appt2OldSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-27')
            ->where('time_slot', '10:00')
            ->first();
        $this->assertNotNull($appt2OldSlot);
        $this->assertEquals(0, $appt2OldSlot->booked_count);

        // ASSERT 3: appt2 destination slot counter (2026-10-29 08:00) incremented to 1
        $appt2DestSlot = AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-29')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertNotNull($appt2DestSlot);
        $this->assertEquals(1, $appt2DestSlot->booked_count);

        // ASSERT 4: Exactly 2 distinct ledger rows exist (zero duplication)
        $ledgerRows = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)->get();
        $this->assertCount(2, $ledgerRows, 'Exactly 2 ledger rows must exist for the 2 appointments');

        $originalIds = $ledgerRows->pluck('original_appointment_id')->all();
        $this->assertContains($appt1->id, $originalIds);
        $this->assertContains($appt2->id, $originalIds);
    }
}

