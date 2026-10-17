<?php

declare(strict_types=1);

namespace Tests\Feature\Concurrency;

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
use App\Services\DoctorVacationService;
use App\Services\VacationRescheduleEngine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * VacationRescheduleMultiProcessTest
 * 
 * Verifies AAFIYA V1 concurrency invariants under true multi-process load
 * for VacationRescheduleEngine (TASK-DWH-06 / FOLLOWUP-DWH-06-REAL-CONCURRENCY-STRESS).
 */
class VacationRescheduleMultiProcessTest extends TestCase
{
    protected string $runUuid;
    protected array $ledger = [];
    protected string $barrierFile;
    protected string $workerScript;
    protected string $reportsDir;
    protected string $targetDb = 'medical_db_dwh10_concurrency_test';
    protected bool $cleanupPermitted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->runUuid = 'VACTEST_' . Str::uuid()->toString();
        $this->barrierFile = sys_get_temp_dir() . '/barrier_' . $this->runUuid . '.lock';
        $this->reportsDir = sys_get_temp_dir() . '/reports_' . $this->runUuid;
        if (! is_dir($this->reportsDir)) {
            mkdir($this->reportsDir, 0777, true);
        }

        $this->workerScript = base_path('tests/Feature/Concurrency/Workers/VacationRescheduleStressWorker.php');

        $this->ledger = [
            'clinics' => [],
            'doctors' => [],
            'users' => [],
            'slots' => [],
            'appointments' => [],
            'vacations' => [],
            'ledger_records' => [],
            'outbox_records' => [],
        ];

        $this->cleanupPermitted = false;

        $this->assertIsolationGate();
    }

    protected function tearDown(): void
    {
        if (! $this->cleanupPermitted) {
            fwrite(STDERR, "\n[SAFETY FATAL] CLEANUP_BLOCKED: Automated cleanup prohibited due to incomplete or uncertain process state. Resources preserved for inspection. Run UUID: {$this->runUuid}\n");
            parent::tearDown();
            return;
        }

        $this->performOwnershipScopedCleanup();

        if (file_exists($this->barrierFile)) {
            @unlink($this->barrierFile);
        }

        if (is_dir($this->reportsDir)) {
            array_map('unlink', glob("{$this->reportsDir}/*.*"));
            @rmdir($this->reportsDir);
        }

        parent::tearDown();
    }

    protected function assertIsolationGate(): void
    {
        $env = app()->environment();
        $dbConn = config('database.default');
        $dbConfig = config("database.connections.{$dbConn}.database");

        $this->assertSame('testing', $env, "APP_ENV must be testing");
        $this->assertSame('mysql', $dbConn, "DB_CONNECTION must be mysql");
        $this->assertSame($this->targetDb, $dbConfig, "Database must be {$this->targetDb}");

        $stmt = DB::connection()->getPdo()->query('SELECT DATABASE() AS cur_db, @@hostname AS host, @@port AS port, CURRENT_USER() AS db_user');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        $this->assertSame($this->targetDb, $row['cur_db'], "Active database must be {$this->targetDb}");
        $this->assertNotSame('medical_db', $row['cur_db'], "Active database MUST NOT be medical_db");
        $this->assertNotSame('medical_db_testing', $row['cur_db'], "Active database MUST NOT be medical_db_testing");
    }

    protected function createIsolatedEnvironment(): array
    {
        $doctorUser = User::create([
            'name' => 'Doctor ' . $this->runUuid,
            'email' => 'doc_' . uniqid() . '@example.com',
            'phone' => '0555' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'password' => bcrypt('password'),
            'user_type' => 'doctor',
        ]);
        $this->ledger['users'][] = $doctorUser->id;

        $patientUser = User::create([
            'name' => 'Patient ' . $this->runUuid,
            'email' => 'pat_' . uniqid() . '@example.com',
            'phone' => '0666' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'password' => bcrypt('password'),
            'user_type' => 'patient',
        ]);
        $this->ledger['users'][] = $patientUser->id;

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'LIC-' . rand(10000, 99999),
            'is_verified' => true,
            'is_active' => true,
        ]);
        $this->ledger['doctors'][] = $doctor->id;

        $clinic = Clinic::create([
            'name' => 'Clinic ' . $this->runUuid,
            'phone' => '021' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'address' => 'Test Medical Center',
            'wilaya' => '16',
            'is_active' => true,
        ]);
        $this->ledger['clinics'][] = $clinic->id;

        DoctorClinic::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'is_active' => true,
            'is_working_hours_activated' => true,
            'working_hours_activated_at' => now(),
            'working_hours_activated_by_id' => $doctorUser->id,
            'schedule_activated_at' => now(),
            'schedule_activated_by_id' => $doctorUser->id,
        ]);

        // Clinic Operating Hours: all 7 days open 08:00 - 17:00
        for ($dow = 0; $dow <= 6; $dow++) {
            ClinicOperatingHour::create([
                'clinic_id' => $clinic->id,
                'day_of_week' => $dow,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }

        // Doctor Working Hours: all 7 days open 08:00 - 16:00
        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        for ($dow = 0; $dow <= 6; $dow++) {
            $daySched = DoctorDaySchedule::create([
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
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

        return [
            'doctor_user' => $doctorUser,
            'patient_user' => $patientUser,
            'doctor' => $doctor,
            'clinic' => $clinic,
        ];
    }

    protected function executeMultiProcessRun(array $workerConfigs, float $timeoutSeconds = 25.0): array
    {
        $barrierFp = fopen($this->barrierFile, 'c+');
        $this->assertNotFalse($barrierFp, 'Failed to initialize barrier file');
        flock($barrierFp, LOCK_EX); // Orchestrator holds exclusive lock

        $processes = [];
        $reports = [];

        foreach ($workerConfigs as $cfg) {
            $workerId = $cfg['worker_id'];
            $reportFile = "{$this->reportsDir}/report_{$workerId}.json";
            $reports[$workerId] = $reportFile;

            $cmd = sprintf(
                'APP_ENV=testing DB_DATABASE=%s php %s --target-db=%s --run-uuid=%s --worker-id=%s --action=%s --barrier-file=%s --payload=%s --report-file=%s',
                escapeshellarg($this->targetDb),
                escapeshellarg($this->workerScript),
                escapeshellarg($this->targetDb),
                escapeshellarg($this->runUuid),
                escapeshellarg($workerId),
                escapeshellarg($cfg['action']),
                escapeshellarg($this->barrierFile),
                escapeshellarg(json_encode($cfg['payload'])),
                escapeshellarg($reportFile)
            );

            $descriptors = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            $proc = proc_open($cmd, $descriptors, $pipes, base_path());
            $processes[$workerId] = [
                'proc' => $proc,
                'pipes' => $pipes,
                'start_time' => microtime(true),
            ];
        }

        // Give workers time to boot and queue at the barrier (flock LOCK_SH)
        usleep(400000); // 400ms

        // Release the barrier: all workers unblock simultaneously
        flock($barrierFp, LOCK_UN);
        fclose($barrierFp);

        $results = [];
        $deadline = microtime(true) + $timeoutSeconds;
        $allProcessesCleanlyTerminated = true;

        foreach ($processes as $workerId => $pData) {
            $proc = $pData['proc'];
            $pipes = $pData['pipes'];

            $status = proc_get_status($proc);
            while ($status['running'] && microtime(true) < $deadline) {
                usleep(20000); // 20ms
                $status = proc_get_status($proc);
            }

            if ($status['running']) {
                proc_terminate($proc, 9);
                $pollDeadline = microtime(true) + 1.0;
                while ($status['running'] && microtime(true) < $pollDeadline) {
                    usleep(10000); // 10ms
                    $status = proc_get_status($proc);
                }

                fclose($pipes[0]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);

                $allProcessesCleanlyTerminated = false;
                $results[$workerId] = [
                    'status' => 'TIMEOUT',
                    'error_code' => 'WORKER_TIMEOUT',
                    'message' => 'Process exceeded execution deadline and was killed',
                ];
            } else {
                fclose($pipes[0]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                $exitCode = proc_close($proc);

                $reportPath = $reports[$workerId];
                if (file_exists($reportPath)) {
                    $json = json_decode(file_get_contents($reportPath), true);
                    if (
                        is_array($json)
                        && isset($json['run_uuid'], $json['worker_id'], $json['status'])
                        && $json['run_uuid'] === $this->runUuid
                        && $json['worker_id'] === $workerId
                        && $exitCode === 0
                    ) {
                        $results[$workerId] = $json;
                    } else {
                        $allProcessesCleanlyTerminated = false;
                        $results[$workerId] = [
                            'status' => 'ERROR',
                            'error_code' => 'INVALID_REPORT_SCHEMA_OR_EXIT_CODE',
                            'exit_code' => $exitCode,
                            'raw' => $json,
                        ];
                    }
                } else {
                    $allProcessesCleanlyTerminated = false;
                    $results[$workerId] = [
                        'status' => 'INDETERMINATE',
                        'error_code' => 'MISSING_REPORT',
                        'exit_code' => $exitCode,
                    ];
                }
            }
        }

        // Global cleanup gate validation
        $allSuccessful = count($results) === count($workerConfigs);
        foreach ($results as $res) {
            $status = $res['status'] ?? null;
            if (! in_array($status, ['SUCCESS', 'EXPECTED_REJECTION'], true)) {
                $allSuccessful = false;
                break;
            }
        }

        if ($allProcessesCleanlyTerminated && $allSuccessful) {
            $this->cleanupPermitted = true;
        } else {
            $this->cleanupPermitted = false;
        }

        return $results;
    }

    protected function performOwnershipScopedCleanup(): void
    {
        // 1. Delete all appointments owned by this run, plus cascade dependencies
        if (! empty($this->ledger['appointments'])) {
            DB::table('appointment_status_history')->whereIn('appointment_id', $this->ledger['appointments'])->delete();
            NotificationOutbox::whereIn('appointment_id', $this->ledger['appointments'])->delete();
            VacationAppointmentReschedule::whereIn('original_appointment_id', $this->ledger['appointments'])
                ->orWhereIn('replacement_appointment_id', $this->ledger['appointments'])
                ->delete();
            Appointment::whereIn('id', $this->ledger['appointments'])->forceDelete();
        }

        // Also clean up any appointments created for clinics owned by this run
        if (! empty($this->ledger['clinics'])) {
            $clinicApptIds = Appointment::whereIn('clinic_id', $this->ledger['clinics'])->pluck('id');
            if ($clinicApptIds->isNotEmpty()) {
                DB::table('appointment_status_history')->whereIn('appointment_id', $clinicApptIds)->delete();
                NotificationOutbox::whereIn('appointment_id', $clinicApptIds)->delete();
                VacationAppointmentReschedule::whereIn('original_appointment_id', $clinicApptIds)
                    ->orWhereIn('replacement_appointment_id', $clinicApptIds)
                    ->delete();
                Appointment::whereIn('id', $clinicApptIds)->forceDelete();
            }
        }

        // 2. Delete vacations owned by this run
        if (! empty($this->ledger['vacations'])) {
            DB::table('doctor_vacation_clinics')->whereIn('doctor_vacation_id', $this->ledger['vacations'])->delete();
            DoctorVacation::whereIn('id', $this->ledger['vacations'])->delete();
        }

        // 3. Delete slots, reservations, hours, and clinic links
        if (! empty($this->ledger['clinics'])) {
            AppointmentSlot::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            DoctorTimeReservation::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            ClinicOperatingHour::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            DB::table('doctor_clinic')->whereIn('clinic_id', $this->ledger['clinics'])->delete();
        }

        // 4. Delete doctors and their schedules
        if (! empty($this->ledger['doctors'])) {
            $daySchedIds = DoctorDaySchedule::whereIn('doctor_id', $this->ledger['doctors'])->pluck('id');
            DoctorWorkingSlot::whereIn('doctor_day_schedule_id', $daySchedIds)->delete();
            DoctorDaySchedule::whereIn('id', $daySchedIds)->delete();
            Doctor::whereIn('id', $this->ledger['doctors'])->delete();
        }

        // 5. Delete clinics
        if (! empty($this->ledger['clinics'])) {
            Clinic::whereIn('id', $this->ledger['clinics'])->forceDelete();
        }

        // 6. Delete users
        if (! empty($this->ledger['users'])) {
            User::whereIn('id', $this->ledger['users'])->forceDelete();
        }
    }

    /**
     * Test A: Concurrent processing of the exact same (vacation, appointment) pair.
     */
    public function test_round_a_concurrent_processing_of_same_pair(): void
    {
        $env = $this->createIsolatedEnvironment();
        $bookingService = app(BookingService::class);

        $appt = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض الجولة أ',
            'patient_phone' => '0555998811',
        ], $env['patient_user']);
        $this->ledger['appointments'][] = $appt->id;

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($env['doctor'], [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $env['doctor_user']);
        $this->ledger['vacations'][] = $vacation->id;

        $workerConfigs = [
            [
                'worker_id' => 'worker_A1',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
            [
                'worker_id' => 'worker_A2',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
        ];

        $results = $this->executeMultiProcessRun($workerConfigs, 25.0);

        $this->assertEquals('SUCCESS', $results['worker_A1']['status']);
        $this->assertEquals('SUCCESS', $results['worker_A2']['status']);

        $t1 = $results['worker_A1']['barrier_unblock_time'] ?? 0;
        $t2 = $results['worker_A2']['barrier_unblock_time'] ?? 0;
        $this->assertLessThan(0.15, abs($t1 - $t2), "Workers did not unblock within simultaneous barrier window");

        // Verify exactly 1 ledger record exists in DB
        $ledgerRows = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->get();
        $this->assertCount(1, $ledgerRows, "Exactly 1 ledger record must exist for the pair");
        $this->assertEquals(VacationAppointmentReschedule::STATUS_RESCHEDULED, $ledgerRows->first()->status);

        // Verify the appointment moved to destination (D_end + 1 = 2026-10-26 08:00)
        $refreshedAppt = $appt->fresh();
        $this->assertEquals('2026-10-26', $refreshedAppt->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $refreshedAppt->time_slot);

        // Verify destination slot booked_count is exactly 1 (no double increment)
        $destSlot = AppointmentSlot::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertNotNull($destSlot);
        $this->assertEquals(1, $destSlot->booked_count);

        // Verify old slot booked_count is 0
        $oldSlot = AppointmentSlot::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', '2026-10-22')
            ->where('time_slot', '10:00')
            ->first();
        $this->assertNotNull($oldSlot);
        $this->assertEquals(0, $oldSlot->booked_count);
    }

    /**
     * Test B: Redelivery after committed success.
     */
    public function test_round_b_redelivery_after_committed_success(): void
    {
        $env = $this->createIsolatedEnvironment();
        $bookingService = app(BookingService::class);

        $appt = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => '2026-10-22',
            'time_slot' => '10:00',
            'patient_name' => 'مريض الجولة ب',
            'patient_phone' => '0555998812',
        ], $env['patient_user']);
        $this->ledger['appointments'][] = $appt->id;

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($env['doctor'], [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $env['doctor_user']);
        $this->ledger['vacations'][] = $vacation->id;

        // First pass: single process moves appointment
        $engine = app(VacationRescheduleEngine::class);
        // Sync queue executes RescheduleVacationAppointmentsJob during registerVacation
        // So first pass has already run via the dispatched job
        // First pass relocated the appointment during registration

        // Now trigger redelivery
        $secondStats = $engine->processVacationRescheduling($vacation);

        // Since the appointment was relocated outside [vacation_start, vacation_end],
        // the vacation query finds 0 remaining occupying appointments in the vacation window,
        // so total_affected is 0 and rescheduled is 0.
        $this->assertEquals(0, $secondStats['rescheduled'], "Redelivery must not reschedule again");
        $this->assertEquals(0, $secondStats['unresolved']);

        // Verify ledger record remains exactly 1
        $ledgerCount = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->count();
        $this->assertEquals(1, $ledgerCount);

        // Verify destination slot booked_count did not increment again
        $destSlot = AppointmentSlot::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', '2026-10-26')
            ->where('time_slot', '08:00')
            ->first();
        $this->assertEquals(1, $destSlot->booked_count);

        $this->cleanupPermitted = true;
    }

    /**
     * Test C: Repeated concurrent contention with a fresh isolated state.
     */
    public function test_round_c_repeated_concurrent_contention(): void
    {
        $env = $this->createIsolatedEnvironment();
        $bookingService = app(BookingService::class);

        $appt = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => '2026-10-23',
            'time_slot' => '11:00',
            'patient_name' => 'مريض الجولة ج',
            'patient_phone' => '0555998822',
        ], $env['patient_user']);
        $this->ledger['appointments'][] = $appt->id;

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($env['doctor'], [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $env['doctor_user']);
        $this->ledger['vacations'][] = $vacation->id;

        $workerConfigs = [
            [
                'worker_id' => 'worker_C1',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
            [
                'worker_id' => 'worker_C2',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
        ];

        $results = $this->executeMultiProcessRun($workerConfigs, 25.0);

        $this->assertEquals('SUCCESS', $results['worker_C1']['status']);
        $this->assertEquals('SUCCESS', $results['worker_C2']['status']);

        $t1 = $results['worker_C1']['barrier_unblock_time'] ?? 0;
        $t2 = $results['worker_C2']['barrier_unblock_time'] ?? 0;
        $this->assertLessThan(0.15, abs($t1 - $t2));

        $ledgerCount = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->count();
        $this->assertEquals(1, $ledgerCount);
    }

    /**
     * Test D: Repeated delivery under active concurrent contention.
     * Both workers fire while the vacation was already processed.
     */
    public function test_round_d_repeated_delivery_under_contention(): void
    {
        $env = $this->createIsolatedEnvironment();
        $bookingService = app(BookingService::class);

        $appt = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => '2026-10-24',
            'time_slot' => '12:00',
            'patient_name' => 'مريض الجولة د',
            'patient_phone' => '0555998833',
        ], $env['patient_user']);
        $this->ledger['appointments'][] = $appt->id;

        $vacationService = app(DoctorVacationService::class);
        $vacation = $vacationService->registerVacation($env['doctor'], [
            'vacation_start' => '2026-10-20',
            'vacation_end' => '2026-10-25',
        ], $env['doctor_user']);
        $this->ledger['vacations'][] = $vacation->id;

        // Pre-run first pass
        $engine = app(VacationRescheduleEngine::class);
        // Sync queue executes RescheduleVacationAppointmentsJob during registerVacation
        // So first pass has already run via the dispatched job
        // First pass relocated the appointment during registration

        // Now fire two concurrent workers re-delivering on the finished state
        $workerConfigs = [
            [
                'worker_id' => 'worker_D1',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
            [
                'worker_id' => 'worker_D2',
                'action' => 'reschedule_vacation',
                'payload' => ['vacation_id' => $vacation->id],
            ],
        ];

        $results = $this->executeMultiProcessRun($workerConfigs, 25.0);

        $this->assertEquals('SUCCESS', $results['worker_D1']['status']);
        $this->assertEquals('SUCCESS', $results['worker_D2']['status']);

        // Both workers find 0 remaining occupying appointments in the vacation window and reschedule 0
        $this->assertEquals(0, $results['worker_D1']['details']['stats']['rescheduled']);
        $this->assertEquals(0, $results['worker_D2']['details']['stats']['rescheduled']);

        // Ledger row remains 1
        $ledgerCount = VacationAppointmentReschedule::where('doctor_vacation_id', $vacation->id)
            ->where('original_appointment_id', $appt->id)
            ->count();
        $this->assertEquals(1, $ledgerCount);
    }

    /**
     * Test E: Final invariant verification across all entities in the test run.
     */
    public function test_round_e_final_invariant_verification(): void
    {
        // 1. Check for ANY duplicate (doctor_vacation_id, original_appointment_id) in vacation_appointment_reschedules
        $duplicates = DB::table('vacation_appointment_reschedules')
            ->select('doctor_vacation_id', 'original_appointment_id', DB::raw('COUNT(*) as total'))
            ->groupBy('doctor_vacation_id', 'original_appointment_id')
            ->having('total', '>', 1)
            ->get();
        $this->assertCount(0, $duplicates, "Zero duplicate (vacation, appointment) pairs must exist in the database");

        // 2. Check for counter drift across appointment_slots
        $occupyingStatuses = Appointment::OCCUPYING_STATUSES;
        $inStatuses = implode("', '", $occupyingStatuses);

        $driftedSlots = DB::select("
            SELECT s.id, s.clinic_id, s.doctor_id, s.appointment_date, s.time_slot, s.booked_count,
                   (SELECT COUNT(*) FROM appointments a 
                    WHERE a.clinic_id = s.clinic_id 
                      AND a.doctor_id = s.doctor_id 
                      AND a.appointment_date = s.appointment_date 
                      AND a.time_slot = s.time_slot 
                      AND a.status IN ('{$inStatuses}')) AS actual_count
            FROM appointment_slots s
            HAVING s.booked_count != actual_count
        ");
        $this->assertCount(0, $driftedSlots, "Zero counter drift must exist on any slot in testing database");

        $this->cleanupPermitted = true;
    }
}
