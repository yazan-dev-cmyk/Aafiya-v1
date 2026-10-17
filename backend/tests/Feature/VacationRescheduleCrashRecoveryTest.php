<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorTimeReservation;
use App\Models\DoctorVacation;
use App\Models\DoctorWorkingSlot;
use App\Models\NotificationOutbox;
use App\Models\User;
use App\Models\VacationAppointmentReschedule;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorTimeReservationService;
use App\Services\DoctorVacationService;
use App\Services\DoctorWorkingHoursService;
use App\Services\QuotaService;
use App\Services\VacationRescheduleEngine;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * VacationRescheduleCrashRecoveryTest
 *
 * Dedicated test suite verifying TASK-DWH-07 crash recovery, transaction boundary atomicity,
 * transient MySQL locking error handling (1213 / 1205), and ledger/appointment mismatch detection.
 */
class VacationRescheduleCrashRecoveryTest extends TestCase
{
    protected User $doctorUser;
    protected User $patientUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertIsolationGate();

        $this->doctorUser = User::create([
            'name' => 'Doctor DWH-07',
            'email' => 'doc_dwh07_' . uniqid() . '@example.com',
            'phone' => '0555' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'password' => bcrypt('password'),
            'user_type' => 'doctor',
        ]);

        $this->patientUser = User::create([
            'name' => 'Patient DWH-07',
            'email' => 'pat_dwh07_' . uniqid() . '@example.com',
            'phone' => '0666' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'password' => bcrypt('password'),
            'user_type' => 'patient',
        ]);

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'LIC-' . rand(10000, 99999),
            'is_verified' => true,
            'is_active' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'Clinic DWH-07 ' . uniqid(),
            'phone' => '021' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'address' => 'Test Medical Center DWH07',
            'wilaya' => '16',
            'is_active' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'is_active' => true,
            'is_working_hours_activated' => true,
            'working_hours_activated_at' => now(),
            'working_hours_activated_by_id' => $this->doctorUser->id,
            'schedule_activated_at' => now(),
            'schedule_activated_by_id' => $this->doctorUser->id,
        ]);

        // 7 days operating hours: 08:00 - 17:00
        for ($dow = 0; $dow <= 6; $dow++) {
            ClinicOperatingHour::create([
                'clinic_id' => $this->clinic->id,
                'day_of_week' => $dow,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }

        // 7 days working hours: 08:00 - 16:00
        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        for ($dow = 0; $dow <= 6; $dow++) {
            $daySched = DoctorDaySchedule::create([
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'day_of_week' => $dow,
                'is_open' => true,
            ]);
            foreach ($slots as $s) {
                DoctorWorkingSlot::create([
                    'doctor_day_schedule_id' => $daySched->id,
                    'time_slot' => $s,
                    'is_available' => true,
                ]);
            }
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        // Scoped cleanup
        if (isset($this->clinic)) {
            $apptIds = Appointment::where('clinic_id', $this->clinic->id)->pluck('id');
            if ($apptIds->isNotEmpty()) {
                DB::table('appointment_status_history')->whereIn('appointment_id', $apptIds)->delete();
                NotificationOutbox::whereIn('appointment_id', $apptIds)->delete();
                VacationAppointmentReschedule::whereIn('original_appointment_id', $apptIds)
                    ->orWhereIn('replacement_appointment_id', $apptIds)
                    ->delete();
                Appointment::whereIn('id', $apptIds)->forceDelete();
            }

            $vacIds = DoctorVacation::where('doctor_id', $this->doctor->id)->pluck('id');
            if ($vacIds->isNotEmpty()) {
                DB::table('doctor_vacation_clinics')->whereIn('doctor_vacation_id', $vacIds)->delete();
                DoctorVacation::whereIn('id', $vacIds)->delete();
            }

            AppointmentSlot::where('clinic_id', $this->clinic->id)->delete();
            DoctorTimeReservation::where('clinic_id', $this->clinic->id)->delete();
            ClinicOperatingHour::where('clinic_id', $this->clinic->id)->delete();
            DB::table('doctor_clinic')->where('clinic_id', $this->clinic->id)->delete();

            $daySchedIds = DoctorDaySchedule::where('doctor_id', $this->doctor->id)->pluck('id');
            DoctorWorkingSlot::whereIn('doctor_day_schedule_id', $daySchedIds)->delete();
            DoctorDaySchedule::whereIn('id', $daySchedIds)->delete();
            Doctor::where('id', $this->doctor->id)->delete();
            Clinic::where('id', $this->clinic->id)->forceDelete();
        }

        if (isset($this->doctorUser)) {
            User::whereIn('id', [$this->doctorUser->id, $this->patientUser->id])->forceDelete();
        }

        parent::tearDown();
    }

    protected function assertIsolationGate(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame(self::REQUIRED_TEST_DB, config('database.connections.mysql.database'));

        $stmt = DB::connection()->getPdo()->query('SELECT DATABASE() AS cur_db');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $this->assertSame(self::REQUIRED_TEST_DB, $row['cur_db']);
    }

    /**
     * 1. Successful transfer commits appointment, capacity counters, and ledger outcome atomically.
     */
    public function test_successful_transfer_commits_appointment_counters_and_ledger_atomically(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض 1',
            'patient_phone' => '0555111111',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['rescheduled']);

        // Assert atomic commit across all 3 components:
        // A. Appointment updated
        $refreshed = $appt->fresh();
        $this->assertEquals('2026-10-26', $refreshed->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $refreshed->time_slot);

        // B. Capacity counters updated
        $destSlot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertEquals(1, $destSlot->booked_count);

        $oldSlot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-22')
            ->where('time_slot', '10:00')
            ->first();
        $this->assertEquals(0, $oldSlot->booked_count);

        // C. Ledger recorded
        $ledger = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->first();
        $this->assertNotNull($ledger);
        $this->assertEquals(VacationAppointmentReschedule::STATUS_RESCHEDULED, $ledger->status);
        $this->assertEquals($appt->id, $ledger->replacement_appointment_id);
    }

    /**
     * 2. Simulated crash after commit and queue redelivery recognizes completed status without duplicate transfer.
     */
    public function test_crash_after_commit_and_redelivery_recognizes_completed_status(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض كراش',
            'patient_phone' => '0555222222',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // First execution: commits DB transaction
        $engine = app(VacationRescheduleEngine::class);
        $stats1 = $engine->processVacationRescheduling($vacation);
        $this->assertEquals(1, $stats1['rescheduled']);

        // SIMULATED CRASH: Worker dies immediately after commit before queue ack.
        // Queue re-delivers the job for the same vacation:
        $job = new \App\Jobs\RescheduleVacationAppointmentsJob($vacation->id);
        $job->handle();

        // Verify:
        // A. Exactly 1 ledger row
        $ledgerCount = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->count();
        $this->assertEquals(1, $ledgerCount);

        // B. Slot counter remains 1, no duplicate increment
        $destSlot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertEquals(1, $destSlot->booked_count);
    }

    /**
     * 3. Transient MySQL deadlock (1213) is rethrown rather than permanently failing the appointment.
     */
    public function test_transient_mysql_deadlock_1213_is_rethrown_for_queue_retry(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض ديدلوك',
            'patient_phone' => '0555333333',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Mock BookingService to throw MySQL 1213 deadlock QueryException
        $deadlockException = new QueryException(
            'mysql',
            'SELECT * FROM appointments FOR UPDATE',
            [],
            new \PDOException('Deadlock found when trying to get lock; try restarting transaction', 1213)
        );
        $deadlockException->errorInfo = ['40001', 1213, 'Deadlock found when trying to get lock'];

        $mockBookingService = \Mockery::mock(BookingService::class);
        $mockBookingService->shouldReceive('rescheduleAppointment')
            ->once()
            ->andThrow($deadlockException);
        $mockBookingService->shouldReceive('validateActiveSlotBoundary')
            ->andReturn(true);
        $mockBookingService->shouldReceive('resolveSlotCapacity')
            ->andReturn(1);

        $engine = new VacationRescheduleEngine(
            $mockBookingService,
            app(DoctorWorkingHoursService::class),
            app(ClinicOperatingHoursService::class),
            app(DoctorVacationService::class),
            app(DoctorTimeReservationService::class),
            app(QuotaService::class)
        );

        $this->expectException(QueryException::class);
        try {
            $engine->processVacationRescheduling($vacation);
        } finally {
            $unresolved = VacationAppointmentReschedule::where('original_appointment_id', $appt->id)
                ->where('status', VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED)
                ->count();
            $this->assertEquals(0, $unresolved, "Deadlock must NOT record permanent urgent_unresolved outcome");
        }
    }

    /**
     * 4. Transient MySQL lock wait timeout (1205) is rethrown rather than permanently failing the appointment.
     */
    public function test_transient_mysql_lock_timeout_1205_is_rethrown_for_queue_retry(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض تايم أوت',
            'patient_phone' => '0555444444',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $timeoutException = new QueryException(
            'mysql',
            'SELECT * FROM appointments FOR UPDATE',
            [],
            new \PDOException('Lock wait timeout exceeded; try restarting transaction', 1205)
        );
        $timeoutException->errorInfo = ['HY000', 1205, 'Lock wait timeout exceeded'];

        $mockBookingService = \Mockery::mock(BookingService::class);
        $mockBookingService->shouldReceive('rescheduleAppointment')
            ->once()
            ->andThrow($timeoutException);
        $mockBookingService->shouldReceive('validateActiveSlotBoundary')
            ->andReturn(true);
        $mockBookingService->shouldReceive('resolveSlotCapacity')
            ->andReturn(1);

        $engine = new VacationRescheduleEngine(
            $mockBookingService,
            app(DoctorWorkingHoursService::class),
            app(ClinicOperatingHoursService::class),
            app(DoctorVacationService::class),
            app(DoctorTimeReservationService::class),
            app(QuotaService::class)
        );

        $this->expectException(QueryException::class);
        try {
            $engine->processVacationRescheduling($vacation);
        } finally {
            $unresolved = VacationAppointmentReschedule::where('original_appointment_id', $appt->id)
                ->where('status', VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED)
                ->count();
            $this->assertEquals(0, $unresolved, "Lock timeout must NOT record permanent urgent_unresolved outcome");
        }
    }

    /**
     * 5. Non-transient database error (e.g. general SQL error) is NOT rethrown but recorded as permanent unresolved.
     */
    public function test_non_transient_database_error_is_recorded_as_unresolved(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض خطأ دائم',
            'patient_phone' => '0555555555',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $syntaxException = new QueryException(
            'mysql',
            'SELECT * FROM bad_syntax',
            [],
            new \PDOException('Table does not exist', 1146)
        );
        $syntaxException->errorInfo = ['42S02', 1146, 'Table does not exist'];

        $mockBookingService = \Mockery::mock(BookingService::class);
        $mockBookingService->shouldReceive('rescheduleAppointment')
            ->once()
            ->andThrow($syntaxException);
        $mockBookingService->shouldReceive('validateActiveSlotBoundary')
            ->andReturn(true);
        $mockBookingService->shouldReceive('resolveSlotCapacity')
            ->andReturn(1);

        $engine = new VacationRescheduleEngine(
            $mockBookingService,
            app(DoctorWorkingHoursService::class),
            app(ClinicOperatingHoursService::class),
            app(DoctorVacationService::class),
            app(DoctorTimeReservationService::class),
            app(QuotaService::class)
        );

        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['unresolved']);
        $ledger = VacationAppointmentReschedule::where('original_appointment_id', $appt->id)->first();
        $this->assertNotNull($ledger);
        $this->assertEquals(VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED, $ledger->status);
        $this->assertStringContainsString('RELOCATION_FAILED', $ledger->failure_reason);
    }

    /**
     * 6. Ledger/appointment mismatch stops automated processing and transitions to manual_pending.
     */
    public function test_ledger_appointment_mismatch_transitions_to_manual_pending_and_stops_automated_moves(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض تعارض السجل',
            'patient_phone' => '0555666666',
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        // Corrupted state scenario: Ledger says 'rescheduled', but appointment date is STILL in vacation interval!
        $ledger = VacationAppointmentReschedule::create([
            'id' => (string) Str::uuid(),
            'doctor_vacation_id' => $vacation->id,
            'original_appointment_id' => $appt->id,
            'replacement_appointment_id' => $appt->id,
            'clinic_id' => $this->clinic->id,
            'status' => VacationAppointmentReschedule::STATUS_RESCHEDULED,
            'resolved_at' => now(),
        ]);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        // Engine must detect mismatch, transition to manual_pending, and not perform any automated move
        $refreshedLedger = $ledger->fresh();
        $this->assertEquals(VacationAppointmentReschedule::STATUS_MANUAL_PENDING, $refreshedLedger->status);
        $this->assertStringContainsString('LEDGER_APPOINTMENT_STATE_MISMATCH', $refreshedLedger->failure_reason);

        // Appointment remains preserved without guessing
        $refreshedAppt = $appt->fresh();
        $this->assertEquals('2026-10-22', $refreshedAppt->appointment_date->format('Y-m-d'));
        $this->assertEquals('10:00', $refreshedAppt->time_slot);
    }
}
