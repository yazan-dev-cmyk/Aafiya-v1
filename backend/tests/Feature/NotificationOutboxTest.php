<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\DispatchNotificationOutboxJob;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorVacation;
use App\Models\DoctorWorkingSlot;
use App\Models\NotificationOutbox;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;
use App\Services\DoctorVacationService;
use App\Services\NotificationOutboxService;
use App\Services\VacationRescheduleEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationOutboxTest extends TestCase
{
    protected Clinic $clinic;
    protected Doctor $doctor;
    protected User $doctorUser;
    protected User $patientUser;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertIsolationGate();

        // Create Doctor user & profile
        $this->doctorUser = User::factory()->create([
            'email' => 'dr.outbox_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0550' . rand(100000, 999999),
        ]);
        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-OUTBOX-' . Str::random(6),
            'is_active' => true,
        ]);

        // Create Clinic
        $this->clinic = Clinic::create([
            'id' => (string) Str::uuid(),
            'name' => 'Clinic Outbox ' . uniqid(),
            'phone' => '021' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'address' => 'Test Medical Center Outbox',
            'wilaya' => '16',
            'is_active' => true,
        ]);

        \App\Models\DoctorClinic::create([
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

        // Create Patient User & Patient model
        $this->patientUser = User::factory()->create([
            'email' => 'patient.outbox_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0555' . rand(100000, 999999),
        ]);
        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-OUTBOX-' . Str::random(6),
            'first_name' => 'مريض',
            'last_name' => 'إشعار',
            'phone' => $this->patientUser->phone,
            'email' => $this->patientUser->email,
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        if (isset($this->clinic)) {
            $apptIds = Appointment::where('clinic_id', $this->clinic->id)->pluck('id');
            if ($apptIds->isNotEmpty()) {
                DB::table('appointment_status_history')->whereIn('appointment_id', $apptIds)->delete();
                NotificationOutbox::whereIn('appointment_id', $apptIds)->delete();
                \App\Models\VacationAppointmentReschedule::whereIn('original_appointment_id', $apptIds)
                    ->orWhereIn('replacement_appointment_id', $apptIds)
                    ->delete();
                Appointment::whereIn('id', $apptIds)->forceDelete();
            }

            $vacIds = DoctorVacation::where('doctor_id', $this->doctor->id)->pluck('id');
            if ($vacIds->isNotEmpty()) {
                DB::table('doctor_vacation_clinics')->whereIn('doctor_vacation_id', $vacIds)->delete();
                DoctorVacation::whereIn('id', $vacIds)->delete();
            }

            NotificationOutbox::where('recipient_phone', $this->patientUser->phone)->delete();
            NotificationOutbox::where('recipient_phone', $this->clinic->phone)->delete();
            AppointmentSlot::where('clinic_id', $this->clinic->id)->delete();
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

        if (isset($this->patient)) {
            Patient::where('id', $this->patient->id)->forceDelete();
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
     * 1. Successful appointment relocation writes in_app NotificationOutbox record in same transaction.
     */
    public function test_successful_rescheduling_creates_in_app_outbox_record(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '08:00',
            'patient_id' => $this->patient->id,
            'patient_name' => 'مريض إشعار 1',
            'patient_phone' => $this->patientUser->phone,
        ], $this->patientUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['rescheduled']);

        // Assert outbox record exists
        $outbox = NotificationOutbox::where('appointment_id', $appt->id)
            ->where('template', 'vacation_reschedule_success')
            ->first();

        $this->assertNotNull($outbox, 'Successful reschedule must generate vacation_reschedule_success outbox record');
        $this->assertSame($this->patientUser->phone, $outbox->recipient_phone);
        $this->assertSame('in_app', $outbox->channel);
        $this->assertSame('patient', $outbox->recipient_type);
        $this->assertSame(NotificationOutbox::STATUS_PENDING, $outbox->status);
        $this->assertSame(0, $outbox->retry_count);
        $this->assertNull($outbox->acknowledged_at);
        $this->assertStringContainsString('reschedule_notice_rescheduled_', $outbox->idempotency_key);
        $this->assertSame('2026-10-26', $outbox->payload['new_date']);
        $this->assertSame('08:00', $outbox->payload['new_slot']);
    }

    /**
     * 2. Missing recipient phone records an observable failed outbox entry without breaking transaction.
     */
    public function test_missing_recipient_data_records_failed_outbox_entry(): void
    {
        Queue::fake();

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '08:00',
            'patient_name' => 'مريض بدون هاتف',
            'patient_phone' => '',
        ], $this->doctorUser);

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($this->doctor, [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $this->doctorUser);

        $engine = app(VacationRescheduleEngine::class);
        $stats = $engine->processVacationRescheduling($vacation);

        $this->assertEquals(1, $stats['rescheduled']);

        // Assert missing recipient failure record was recorded
        $outbox = NotificationOutbox::where('appointment_id', $appt->id)
            ->where('template', 'vacation_reschedule_missing_recipient')
            ->first();

        $this->assertNotNull($outbox);
        $this->assertSame(NotificationOutbox::STATUS_FAILED, $outbox->status);
        $this->assertStringContainsString('MISSING_RECIPIENT_DATA', $outbox->last_error);
    }

    /**
     * 3. DispatchNotificationOutboxJob processes in_app record and never mutates appointments or quotas.
     */
    public function test_dispatch_job_processes_record_without_mutating_appointments_or_quotas(): void
    {
        $outbox = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'recipient_phone' => '0555998877',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'test_template',
            'payload' => ['test' => true],
            'idempotency_key' => 'test_job_dispatch_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_PENDING,
            'retry_count' => 0,
        ]);

        $job = new DispatchNotificationOutboxJob($outbox->id);
        $job->handle(app(NotificationOutboxService::class));

        $refreshed = $outbox->fresh();
        $this->assertSame(NotificationOutbox::STATUS_SENT, $refreshed->status);
        $this->assertNull($refreshed->last_error);
    }

    /**
     * 4. Atomic claiming and lease recovery mechanism.
     */
    public function test_atomic_claiming_and_stale_lease_recovery(): void
    {
        $service = app(NotificationOutboxService::class);

        // Record A: Pending
        $recA = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'recipient_phone' => '0555112233',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'test_claim',
            'payload' => [],
            'idempotency_key' => 'claim_a_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_PENDING,
            'retry_count' => 0,
        ]);

        // Record B: Claimed but stale (> 300s ago)
        $recB = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'recipient_phone' => '0555112234',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'test_claim',
            'payload' => [],
            'idempotency_key' => 'claim_b_' . Str::random(8),
            'status' => 'claiming',
            'retry_count' => 0,
            'updated_at' => Carbon::now('Africa/Algiers')->subSeconds(400),
        ]);

        $batch = $service->claimPendingBatch(10, 'in_app');
        $claimedIds = $batch->pluck('id')->toArray();

        $this->assertContains($recA->id, $claimedIds);
        $this->assertContains($recB->id, $claimedIds);

        $this->assertSame('claiming', $recA->fresh()->status);
        $this->assertSame('claiming', $recB->fresh()->status);
    }

    /**
     * 5. Retryable vs Permanent failure handling.
     */
    public function test_retryable_vs_permanent_failure_handling(): void
    {
        $service = app(NotificationOutboxService::class);

        $outbox = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'recipient_phone' => '0555776655',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'test_retry',
            'payload' => [],
            'idempotency_key' => 'retry_test_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_PENDING,
            'retry_count' => 0,
        ]);

        // Transient failure #1
        $service->recordFailure($outbox, new \RuntimeException('Transient connection error'), false);
        $refreshed = $outbox->fresh();
        $this->assertSame(NotificationOutbox::STATUS_PENDING, $refreshed->status);
        $this->assertSame(1, $refreshed->retry_count);

        // Permanent failure
        $service->recordFailure($refreshed, new \RuntimeException('Fatal format error'), true);
        $refreshed2 = $outbox->fresh();
        $this->assertSame(NotificationOutbox::STATUS_FAILED, $refreshed2->status);
        $this->assertSame(2, $refreshed2->retry_count);
    }

    /**
     * 6. Patient acknowledgment ownership and cross-patient access denial.
     */
    public function test_patient_acknowledgment_and_cross_patient_denial(): void
    {
        $outbox = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'recipient_phone' => $this->patientUser->phone,
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'test_ack',
            'payload' => ['appointment_id' => 'none'],
            'idempotency_key' => 'ack_test_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_SENT,
            'retry_count' => 0,
        ]);

        // Unauthorized stranger user
        $stranger = User::factory()->create([
            'email' => 'stranger_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0559' . rand(100000, 999999),
        ]);

        // A. Stranger cannot access or acknowledge
        $responseForbidden = $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/v1/patient/notifications/{$outbox->id}/acknowledge");
        $responseForbidden->assertStatus(403);

        // B. Legitimate patient user acknowledges successfully
        $responseOk = $this->actingAs($this->patientUser, 'sanctum')
            ->postJson("/api/v1/patient/notifications/{$outbox->id}/acknowledge");
        $responseOk->assertStatus(200);

        $refreshed = $outbox->fresh();
        $this->assertNotNull($refreshed->acknowledged_at);

        // C. Idempotent re-acknowledgment
        $firstAckTime = $refreshed->acknowledged_at;
        $responseIdempotent = $this->actingAs($this->patientUser, 'sanctum')
            ->postJson("/api/v1/patient/notifications/{$outbox->id}/acknowledge");
        $responseIdempotent->assertStatus(200);

        $this->assertEquals($firstAckTime->format('Y-m-d H:i:s'), $outbox->fresh()->acknowledged_at->format('Y-m-d H:i:s'));
    }

    /**
     * 7. 24-hour unread SLA escalation boundary and scheduler idempotency.
     */
    public function test_24_hour_sla_escalation_and_scheduler_idempotency(): void
    {
        $service = app(NotificationOutboxService::class);

        $bookingService = app(BookingService::class);
        $appt = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '08:00',
            'patient_name' => 'مريض التصعيد',
            'patient_phone' => '0555443322',
        ], $this->doctorUser);

        // A. Recent notification (< 24h old): must NOT escalate
        $recentOutbox = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'appointment_id' => $appt->id,
            'recipient_phone' => '0555443322',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'vacation_reschedule_success',
            'payload' => ['clinic_id' => $this->clinic->id],
            'idempotency_key' => 'recent_notice_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_SENT,
            'created_at' => Carbon::now('Africa/Algiers')->subHours(12),
        ]);

        // B. Expired notification (> 24h old): MUST escalate
        $expiredOutbox = NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'appointment_id' => $appt->id,
            'recipient_phone' => '0555443322',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'vacation_reschedule_success',
            'payload' => ['clinic_id' => $this->clinic->id],
            'idempotency_key' => 'expired_notice_' . Str::random(8),
            'status' => NotificationOutbox::STATUS_SENT,
            'created_at' => Carbon::now('Africa/Algiers')->subHours(25),
        ]);

        // First run: 1 candidate escalated
        $stats1 = $service->escalateExpiredUnreadNotifications();
        $this->assertEquals(1, $stats1['escalated']);

        $escalationNotice = NotificationOutbox::where('idempotency_key', 'escalation_unread_sla_' . $expiredOutbox->id)->first();
        $this->assertNotNull($escalationNotice);
        $this->assertSame('clinic_staff', $escalationNotice->recipient_type);
        $this->assertSame('PATIENT_UNREAD_SLA_EXPIRED_24H', $escalationNotice->payload['escalation_reason']);

        // Second run: idempotent, 0 escalated
        $stats2 = $service->escalateExpiredUnreadNotifications();
        $this->assertEquals(0, $stats2['escalated']);
        $this->assertEquals(1, $stats2['skipped']);
    }
}
