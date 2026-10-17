<?php

declare(strict_types=1);

namespace Tests\Feature\Concurrency;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorTimeReservation;
use App\Models\DoctorWorkingSlot;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * MultiProcessStressOrchestratorTest
 * 
 * Verifies AAFIYA V1 concurrency invariants under true multi-process load
 * across scenarios CS-01 through CS-05.
 */
class MultiProcessStressOrchestratorTest extends TestCase
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

        $this->runUuid = 'STRESS_' . Str::uuid()->toString();
        $this->barrierFile = sys_get_temp_dir() . '/barrier_' . $this->runUuid . '.lock';
        $this->reportsDir = sys_get_temp_dir() . '/reports_' . $this->runUuid;
        if (! is_dir($this->reportsDir)) {
            mkdir($this->reportsDir, 0777, true);
        }

        $this->workerScript = base_path('tests/Feature/Concurrency/Workers/BookingStressWorker.php');

        $this->ledger = [
            'clinics' => [],
            'doctors' => [],
            'users' => [],
            'slots' => [],
            'appointments' => [],
            'day_schedules' => [],
            'operating_hours' => [],
        ];

        $this->cleanupPermitted = false;

        // Mandatory Isolation Gate Check in Orchestrator
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

    protected function createTestEnvironment(int $slotCapacity = 3, array $slots = ['10:00']): array
    {
        $user = User::create([
            'name' => 'Doctor Owner ' . $this->runUuid,
            'email' => 'doc_' . uniqid() . '@example.com',
            'phone' => '0555' . rand(100000, 999999),
            'password' => bcrypt('password123'),
        ]);
        $this->ledger['users'][] = $user->id;

        $clinic = Clinic::create([
            'name' => 'Clinic ' . $this->runUuid,
            'address' => 'Test Address 123',
            'wilaya' => '16',
            'phone' => '021' . rand(100000, 999999),
            'is_active' => true,
        ]);
        $this->ledger['clinics'][] = $clinic->id;

        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'طب عام',
            'license_number' => 'LIC-' . rand(10000, 99999),
            'is_verified' => true,
        ]);
        $this->ledger['doctors'][] = $doctor->id;

        $doctor->clinics()->attach($clinic->id, [
            'is_active' => true,
            'max_patients_per_slot' => $slotCapacity,
            'is_working_hours_activated' => true,
            'working_hours_activated_at' => now(),
        ]);

        // 7 days operating hours
        for ($d = 0; $d <= 6; $d++) {
            $oh = ClinicOperatingHour::create([
                'clinic_id' => $clinic->id,
                'day_of_week' => $d,
                'period_index' => 1,
                'is_closed' => false,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
            $this->ledger['operating_hours'][] = $oh->id;
        }

        // Sunday (day_of_week = 1 in Aafiya)
        $daySched = DoctorDaySchedule::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'day_of_week' => 1,
            'is_active' => true,
            'is_closed' => false,
        ]);
        $this->ledger['day_schedules'][] = $daySched->id;

        foreach ($slots as $s) {
            DoctorWorkingSlot::create([
                'doctor_day_schedule_id' => $daySched->id,
                'time_slot' => $s,
            ]);
        }

        return [
            'user' => $user,
            'clinic' => $clinic,
            'doctor' => $doctor,
        ];
    }

    protected function launchConcurrentWorkers(array $workerConfigs, float $timeoutSeconds = 12.0): array
    {
        $barrierFp = fopen($this->barrierFile, 'w+');
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
        usleep(300000); // 300ms

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
                // Timeout exceeded: terminate worker conservatively
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

            // Ingest created entities into orchestrator ledger strictly if report is valid and successful
            if (
                isset($results[$workerId]['status'])
                && $results[$workerId]['status'] === 'SUCCESS'
                && ! empty($results[$workerId]['created_entities']['appointments'])
            ) {
                foreach ($results[$workerId]['created_entities']['appointments'] as $appmtId) {
                    if (is_string($appmtId) || is_int($appmtId)) {
                        $this->ledger['appointments'][] = $appmtId;
                    }
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
        // 1. Appointments & histories
        if (! empty($this->ledger['appointments'])) {
            DB::table('appointment_status_history')->whereIn('appointment_id', $this->ledger['appointments'])->delete();
            Appointment::whereIn('id', $this->ledger['appointments'])->forceDelete();
        }

        // Also clean up any appointments created for clinics owned by this run
        if (! empty($this->ledger['clinics'])) {
            $clinicApptIds = Appointment::whereIn('clinic_id', $this->ledger['clinics'])->pluck('id');
            if ($clinicApptIds->isNotEmpty()) {
                DB::table('appointment_status_history')->whereIn('appointment_id', $clinicApptIds)->delete();
                Appointment::whereIn('id', $clinicApptIds)->forceDelete();
            }
        }

        // 2. Slots & reservations
        if (! empty($this->ledger['clinics'])) {
            AppointmentSlot::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            DoctorTimeReservation::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            ClinicOperatingHour::whereIn('clinic_id', $this->ledger['clinics'])->delete();
            DB::table('doctor_clinic')->whereIn('clinic_id', $this->ledger['clinics'])->delete();
        }

        if (! empty($this->ledger['day_schedules'])) {
            DoctorWorkingSlot::whereIn('doctor_day_schedule_id', $this->ledger['day_schedules'])->delete();
            DoctorDaySchedule::whereIn('id', $this->ledger['day_schedules'])->delete();
        }

        if (! empty($this->ledger['doctors'])) {
            Doctor::whereIn('id', $this->ledger['doctors'])->delete();
        }

        if (! empty($this->ledger['clinics'])) {
            Clinic::whereIn('id', $this->ledger['clinics'])->forceDelete();
        }

        if (! empty($this->ledger['users'])) {
            User::whereIn('id', $this->ledger['users'])->forceDelete();
        }
    }

    /**
     * CS-01: High-Contention Capacity Saturation
     */
    public function test_cs01_capacity_saturation(): void
    {
        $env = $this->createTestEnvironment(3, ['10:00']);
        $date = '2026-11-15'; // Sunday
        $slotTime = '10:00';

        // Pre-create 1 initial occupying appointment (U_pre = 1)
        $bookingService = app(BookingService::class);
        $initialAppointment = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => $slotTime,
            'patient_name' => 'Initial Pre-existing Patient',
            'patient_phone' => '0555000000',
        ], $env['user']);
        $this->ledger['appointments'][] = $initialAppointment->id;

        // Configure 6 concurrent booking workers competing for 2 available spots (C=3, U_pre=1, A=2)
        $workerConfigs = [];
        for ($i = 1; $i <= 6; $i++) {
            $workerConfigs[] = [
                'worker_id' => "CS01_W{$i}",
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => $slotTime,
                        'patient_name' => "Concurrent Patient {$i}",
                        'patient_phone' => sprintf('055599900%d', $i),
                    ],
                ],
            ];
        }

        $results = $this->launchConcurrentWorkers($workerConfigs);

        $successes = 0;
        $rejections = 0;
        foreach ($results as $res) {
            if ($res['status'] === 'SUCCESS') {
                $successes++;
            } elseif ($res['status'] === 'EXPECTED_REJECTION') {
                $rejections++;
            }
        }

        // Assert exactly 2 successes and 4 rejections under infrastructure contention-free condition
        $this->assertSame(2, $successes, "Exactly 2 concurrent bookings must succeed for remaining capacity");
        $this->assertSame(4, $rejections, "Remaining 4 concurrent bookings must be rejected");

        // Verify final invariants
        $slot = AppointmentSlot::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slotTime)
            ->firstOrFail();

        $activeOccupying = Appointment::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slotTime)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->count();

        $this->assertSame(3, (int) $slot->booked_count, "Slot booked_count must be exactly 3");
        $this->assertSame(3, $activeOccupying, "Active occupying appointments in DB must be exactly 3");
        $this->assertSame((int) $slot->booked_count, $activeOccupying, "Counter must match active appointments");
    }

    /**
     * CS-02: Concurrent Drift Detection & Quarantine Persistence
     */
    public function test_cs02_drift_detection_and_quarantine(): void
    {
        $env = $this->createTestEnvironment(3, ['10:00']);
        $date = '2026-11-15';
        $slotTime = '10:00';

        // Pre-create slot with injected drift: booked_count = 1, actual appointments = 0
        $slot = AppointmentSlot::create([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => $slotTime,
            'capacity' => 3,
            'booked_count' => 1, // Artificial drift!
            'is_quarantined' => false,
        ]);
        $this->ledger['slots'][] = $slot->id;

        // Launch 5 concurrent booking workers
        $workerConfigs = [];
        for ($i = 1; $i <= 5; $i++) {
            $workerConfigs[] = [
                'worker_id' => "CS02_W{$i}",
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => $slotTime,
                        'patient_name' => "Drift Race Patient {$i}",
                        'patient_phone' => sprintf('055588800%d', $i),
                    ],
                ],
            ];
        }

        $results = $this->launchConcurrentWorkers($workerConfigs);

        $successes = 0;
        $quarantineRejections = 0;
        foreach ($results as $res) {
            if ($res['status'] === 'SUCCESS') {
                $successes++;
            } elseif ($res['status'] === 'EXPECTED_REJECTION') {
                $quarantineRejections++;
            }
        }

        $this->assertSame(0, $successes, "Zero bookings must succeed on a drifted slot");
        $this->assertSame(5, $quarantineRejections, "All 5 workers must be rejected");

        // Verify post-contention invariants
        $refreshedSlot = $slot->fresh();
        $this->assertTrue((bool) $refreshedSlot->is_quarantined, "Slot must be quarantined durably");
        $this->assertStringContainsString('drift', strtolower($refreshedSlot->quarantine_reason ?? ''));
        $this->assertSame(1, (int) $refreshedSlot->booked_count, "booked_count must NOT be auto-repaired");

        $actualCount = Appointment::where('clinic_id', $env['clinic']->id)
            ->where('doctor_id', $env['doctor']->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slotTime)
            ->count();
        $this->assertSame(0, $actualCount, "Zero appointments created");
    }

    /**
     * CS-03: Bidirectional Reschedule Contention
     */
    public function test_cs03_bidirectional_reschedule(): void
    {
        $env = $this->createTestEnvironment(1, ['10:00', '11:00']);
        $date = '2026-11-15';

        $bookingService = app(BookingService::class);

        // Appointment A in Slot 10:00 (capacity 1)
        $appA = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => '10:00',
            'patient_name' => 'Patient Swap A',
            'patient_phone' => '0555777001',
        ], $env['user']);
        $this->ledger['appointments'][] = $appA->id;

        // Appointment B in Slot 11:00 (capacity 1)
        $appB = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => '11:00',
            'patient_name' => 'Patient Swap B',
            'patient_phone' => '0555777002',
        ], $env['user']);
        $this->ledger['appointments'][] = $appB->id;

        // Worker 1: A -> 11:00
        // Worker 2: B -> 10:00
        $workerConfigs = [
            [
                'worker_id' => 'CS03_W1',
                'action' => 'reschedule_appointment',
                'payload' => [
                    'user_id' => $env['user']->id,
                    'appointment_id' => $appA->id,
                    'new_slot_data' => [
                        'appointment_date' => $date,
                        'time_slot' => '11:00',
                    ],
                ],
            ],
            [
                'worker_id' => 'CS03_W2',
                'action' => 'reschedule_appointment',
                'payload' => [
                    'user_id' => $env['user']->id,
                    'appointment_id' => $appB->id,
                    'new_slot_data' => [
                        'appointment_date' => $date,
                        'time_slot' => '10:00',
                    ],
                ],
            ],
        ];

        $results = $this->launchConcurrentWorkers($workerConfigs);

        // Invariant checks: Neither appointment lost or corrupted
        $appAFresh = $appA->fresh();
        $appBFresh = $appB->fresh();

        $this->assertNotNull($appAFresh);
        $this->assertNotNull($appBFresh);

        $slot10 = AppointmentSlot::where('clinic_id', $env['clinic']->id)->where('time_slot', '10:00')->first();
        $slot11 = AppointmentSlot::where('clinic_id', $env['clinic']->id)->where('time_slot', '11:00')->first();

        $occ10 = Appointment::where('clinic_id', $env['clinic']->id)->where('time_slot', '10:00')->whereIn('status', Appointment::OCCUPYING_STATUSES)->count();
        $occ11 = Appointment::where('clinic_id', $env['clinic']->id)->where('time_slot', '11:00')->whereIn('status', Appointment::OCCUPYING_STATUSES)->count();

        $this->assertSame((int) $slot10->booked_count, $occ10, "Slot 10:00 counter matches occupancy");
        $this->assertSame((int) $slot11->booked_count, $occ11, "Slot 11:00 counter matches occupancy");
        $this->assertTrue($occ10 <= 1 && $occ11 <= 1, "Capacity 1 respected on both slots");
    }

    /**
     * CS-04: Concurrent Lifecycle (Cancel vs Book vs Reschedule)
     */
    public function test_cs04_concurrent_lifecycle(): void
    {
        $env = $this->createTestEnvironment(2, ['10:00', '12:00']);
        $date = '2026-11-15';

        $bookingService = app(BookingService::class);

        // Slot 10:00 has capacity 2, occupied by 1 appointment App_Init
        $appInit = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => '10:00',
            'patient_name' => 'Initial Lifecycle Patient',
            'patient_phone' => '0555666001',
        ], $env['user']);
        $this->ledger['appointments'][] = $appInit->id;

        // Slot 12:00 has 1 appointment App_Ext
        $appExt = $bookingService->createAppointment([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => '12:00',
            'patient_name' => 'External Patient',
            'patient_phone' => '0555666002',
        ], $env['user']);
        $this->ledger['appointments'][] = $appExt->id;

        // Competing workers:
        // W1: Cancel App_Init in 10:00
        // W2: Book new appointment in 10:00
        // W3: Reschedule App_Ext from 12:00 to 10:00
        $workerConfigs = [
            [
                'worker_id' => 'CS04_W1_CANCEL',
                'action' => 'cancel_appointment',
                'payload' => [
                    'user_id' => $env['user']->id,
                    'appointment_id' => $appInit->id,
                    'reason' => 'Concurrency cancellation test',
                ],
            ],
            [
                'worker_id' => 'CS04_W2_BOOK',
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => '10:00',
                        'patient_name' => 'New Lifecycle Booker',
                        'patient_phone' => '0555666003',
                    ],
                ],
            ],
            [
                'worker_id' => 'CS04_W3_RESCHEDULE',
                'action' => 'reschedule_appointment',
                'payload' => [
                    'user_id' => $env['user']->id,
                    'appointment_id' => $appExt->id,
                    'new_slot_data' => [
                        'appointment_date' => $date,
                        'time_slot' => '10:00',
                    ],
                ],
            ],
        ];

        $results = $this->launchConcurrentWorkers($workerConfigs);

        // Invariant verification on Slot 10:00 (capacity = 2)
        $slot10 = AppointmentSlot::where('clinic_id', $env['clinic']->id)->where('time_slot', '10:00')->first();
        $occ10 = Appointment::where('clinic_id', $env['clinic']->id)->where('time_slot', '10:00')->whereIn('status', Appointment::OCCUPYING_STATUSES)->count();

        $this->assertTrue($occ10 <= 2, "Occupancy in slot 10:00 must never exceed capacity 2");
        $this->assertSame((int) $slot10->booked_count, $occ10, "booked_count must match active occupancy in slot 10:00");

        // Invariant on Slot 12:00
        $slot12 = AppointmentSlot::where('clinic_id', $env['clinic']->id)->where('time_slot', '12:00')->first();
        $occ12 = Appointment::where('clinic_id', $env['clinic']->id)->where('time_slot', '12:00')->whereIn('status', Appointment::OCCUPYING_STATUSES)->count();
        $this->assertSame((int) $slot12->booked_count, $occ12, "booked_count must match active occupancy in slot 12:00");
    }

    /**
     * CS-05: Concurrent Quarantine Persistence & Re-entry Contention
     */
    public function test_cs05_quarantine_contention_and_reentry(): void
    {
        $env = $this->createTestEnvironment(3, ['10:00']);
        $date = '2026-11-15';
        $slotTime = '10:00';

        // Artificially drifted slot (booked_count = 2, actual = 0)
        $slot = AppointmentSlot::create([
            'clinic_id' => $env['clinic']->id,
            'doctor_id' => $env['doctor']->id,
            'appointment_date' => $date,
            'time_slot' => $slotTime,
            'capacity' => 3,
            'booked_count' => 2,
            'is_quarantined' => false,
        ]);
        $this->ledger['slots'][] = $slot->id;

        // Phase 1: 4 concurrent workers compete to book drifted slot
        $phase1Configs = [];
        for ($i = 1; $i <= 4; $i++) {
            $phase1Configs[] = [
                'worker_id' => "CS05_P1_W{$i}",
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => $slotTime,
                        'patient_name' => "Phase1 Patient {$i}",
                        'patient_phone' => sprintf('055555500%d', $i),
                    ],
                ],
            ];
        }

        $resultsP1 = $this->launchConcurrentWorkers($phase1Configs);

        // Verify all Phase 1 failed to book
        foreach ($resultsP1 as $res) {
            $this->assertSame('EXPECTED_REJECTION', $res['status']);
        }

        // Verify slot is durably quarantined
        $slotRefreshed = $slot->fresh();
        $this->assertTrue((bool) $slotRefreshed->is_quarantined, "Slot must be quarantined after Phase 1");

        // Phase 2: Re-entry attempt by 2 new workers on quarantined slot
        $phase2Configs = [
            [
                'worker_id' => 'CS05_P2_W1',
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => $slotTime,
                        'patient_name' => 'Reentry Patient 1',
                        'patient_phone' => '0555444001',
                    ],
                ],
            ],
            [
                'worker_id' => 'CS05_P2_W2',
                'action' => 'create_appointment',
                'payload' => [
                    'creator_id' => $env['user']->id,
                    'data' => [
                        'clinic_id' => $env['clinic']->id,
                        'doctor_id' => $env['doctor']->id,
                        'appointment_date' => $date,
                        'time_slot' => $slotTime,
                        'patient_name' => 'Reentry Patient 2',
                        'patient_phone' => '0555444002',
                    ],
                ],
            ],
        ];

        $resultsP2 = $this->launchConcurrentWorkers($phase2Configs);

        foreach ($resultsP2 as $res) {
            $this->assertSame('EXPECTED_REJECTION', $res['status']);
            $this->assertSame('SLOT_QUARANTINED', $res['error_code']);
        }

        // Final database verification
        $actualAppointments = Appointment::where('clinic_id', $env['clinic']->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slotTime)
            ->count();
        $this->assertSame(0, $actualAppointments, "Zero appointments created across Phase 1 and 2");
    }


    /**
     * ST-01: Repeated Capacity Contention (Stages C0, C1, C2, C3)
     */
    public function test_st01_repeated_capacity_contention(): void
    {
        $stages = [
            "C0" => ["workers" => 1, "capacity" => 1, "initial" => 0],
            "C1" => ["workers" => 5, "capacity" => 2, "initial" => 0],
            "C2" => ["workers" => 10, "capacity" => 3, "initial" => 1],
            "C3" => ["workers" => 15, "capacity" => 4, "initial" => 1],
        ];

        foreach ($stages as $stageKey => $config) {
            $numWorkers = $config["workers"];
            $capacity = $config["capacity"];
            $initialOccupied = $config["initial"];
            $available = $capacity - $initialOccupied;

            $env = $this->createTestEnvironment($capacity, ["10:00"]);
            $date = "2026-11-15";
            $slotTime = "10:00";

            $bookingService = app(BookingService::class);
            if ($initialOccupied > 0) {
                $initApp = $bookingService->createAppointment([
                    "clinic_id" => $env["clinic"]->id,
                    "doctor_id" => $env["doctor"]->id,
                    "appointment_date" => $date,
                    "time_slot" => $slotTime,
                    "patient_name" => "Init Patient {$stageKey}",
                    "patient_phone" => "05550000{$stageKey}",
                ], $env["user"]);
                $this->ledger["appointments"][] = $initApp->id;
            }

            $workerConfigs = [];
            for ($w = 1; $w <= $numWorkers; $w++) {
                $workerConfigs[] = [
                    "worker_id" => "ST01_{$stageKey}_W{$w}",
                    "action" => "create_appointment",
                    "payload" => [
                        "creator_id" => $env["user"]->id,
                        "data" => [
                            "clinic_id" => $env["clinic"]->id,
                            "doctor_id" => $env["doctor"]->id,
                            "appointment_date" => $date,
                            "time_slot" => $slotTime,
                            "patient_name" => "Concurrent Patient {$w}",
                            "patient_phone" => sprintf("0555%02d%04d", abs(crc32($stageKey)) % 99, $w),
                        ],
                    ],
                ];
            }

            $results = $this->launchConcurrentWorkers($workerConfigs, 25.0);

            $successes = 0;
            $rejections = 0;
            foreach ($results as $res) {
                if ($res["status"] === "SUCCESS") {
                    $successes++;
                } elseif ($res["status"] === "EXPECTED_REJECTION") {
                    $rejections++;
                }
            }

            $expectedSuccess = min($numWorkers, $available);
            $expectedRejection = $numWorkers - $expectedSuccess;

            $this->assertSame($expectedSuccess, $successes, "Stage {$stageKey}: Exactly {$expectedSuccess} must succeed");
            $this->assertSame($expectedRejection, $rejections, "Stage {$stageKey}: Exactly {$expectedRejection} must be rejected");

            $slot = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", $slotTime)->firstOrFail();
            $activeCount = Appointment::where("clinic_id", $env["clinic"]->id)
                ->where("time_slot", $slotTime)
                ->whereIn("status", Appointment::OCCUPYING_STATUSES)
                ->count();

            $this->assertSame((int) $slot->booked_count, $activeCount, "Stage {$stageKey}: Counter matches active count");
            $this->assertSame($initialOccupied + $expectedSuccess, $activeCount, "Stage {$stageKey}: Total occupancy verified");
            $this->assertTrue($activeCount <= $capacity, "Stage {$stageKey}: Capacity never exceeded");
        }
    }

    /**
     * ST-02: Counter Drift and Quarantine Under Contention
     */
    public function test_st02_drift_and_quarantine_under_contention(): void
    {
        $env = $this->createTestEnvironment(5, ["10:00"]);
        $date = "2026-11-15";
        $slotTime = "10:00";

        $slot = AppointmentSlot::create([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => $slotTime,
            "capacity" => 5,
            "booked_count" => 2,
            "is_quarantined" => false,
        ]);
        $this->ledger["slots"][] = $slot->id;

        $workerConfigs = [];
        for ($w = 1; $w <= 10; $w++) {
            $workerConfigs[] = [
                "worker_id" => "ST02_W{$w}",
                "action" => "create_appointment",
                "payload" => [
                    "creator_id" => $env["user"]->id,
                    "data" => [
                        "clinic_id" => $env["clinic"]->id,
                        "doctor_id" => $env["doctor"]->id,
                        "appointment_date" => $date,
                        "time_slot" => $slotTime,
                        "patient_name" => "Drift Worker {$w}",
                        "patient_phone" => sprintf("055411%04d", $w),
                    ],
                ],
            ];
        }

        $results = $this->launchConcurrentWorkers($workerConfigs, 20.0);

        $successes = 0;
        foreach ($results as $res) {
            if ($res["status"] === "SUCCESS") {
                $successes++;
            }
            $this->assertSame("EXPECTED_REJECTION", $res["status"]);
        }
        $this->assertSame(0, $successes, "Zero bookings permitted on drifted slot");

        $refreshedSlot = $slot->fresh();
        $this->assertTrue((bool) $refreshedSlot->is_quarantined, "Slot must be durably quarantined");
        $this->assertStringContainsString("drift", strtolower($refreshedSlot->quarantine_reason ?? ""));
        $this->assertSame(2, (int) $refreshedSlot->booked_count, "Counter preserved without auto-repair");
    }

    /**
     * ST-03: Reciprocal Rescheduling Contention
     */
    public function test_st03_reciprocal_rescheduling_contention(): void
    {
        $env = $this->createTestEnvironment(1, ["10:00", "11:00"]);
        $date = "2026-11-15";
        $bookingService = app(BookingService::class);

        $appA = $bookingService->createAppointment([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => "10:00",
            "patient_name" => "Reciprocal A",
            "patient_phone" => "0555333001",
        ], $env["user"]);
        $this->ledger["appointments"][] = $appA->id;

        $appB = $bookingService->createAppointment([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => "11:00",
            "patient_name" => "Reciprocal B",
            "patient_phone" => "0555333002",
        ], $env["user"]);
        $this->ledger["appointments"][] = $appB->id;

        $workerConfigs = [
            [
                "worker_id" => "ST03_W1",
                "action" => "reschedule_appointment",
                "payload" => [
                    "user_id" => $env["user"]->id,
                    "appointment_id" => $appA->id,
                    "new_slot_data" => ["appointment_date" => $date, "time_slot" => "11:00"],
                ],
            ],
            [
                "worker_id" => "ST03_W2",
                "action" => "reschedule_appointment",
                "payload" => [
                    "user_id" => $env["user"]->id,
                    "appointment_id" => $appB->id,
                    "new_slot_data" => ["appointment_date" => $date, "time_slot" => "10:00"],
                ],
            ],
        ];

        $results = $this->launchConcurrentWorkers($workerConfigs, 15.0);

        $appAFresh = $appA->fresh();
        $appBFresh = $appB->fresh();
        $this->assertNotNull($appAFresh);
        $this->assertNotNull($appBFresh);

        $slot10 = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", "10:00")->first();
        $slot11 = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", "11:00")->first();

        $occ10 = Appointment::where("clinic_id", $env["clinic"]->id)->where("time_slot", "10:00")->whereIn("status", Appointment::OCCUPYING_STATUSES)->count();
        $occ11 = Appointment::where("clinic_id", $env["clinic"]->id)->where("time_slot", "11:00")->whereIn("status", Appointment::OCCUPYING_STATUSES)->count();

        $this->assertSame((int) $slot10->booked_count, $occ10);
        $this->assertSame((int) $slot11->booked_count, $occ11);
        $this->assertTrue($occ10 <= 1 && $occ11 <= 1);
    }

    /**
     * ST-04: Mixed Lifecycle Contention
     */
    public function test_st04_mixed_lifecycle_contention(): void
    {
        $env = $this->createTestEnvironment(3, ["10:00", "13:00"]);
        $date = "2026-11-15";
        $bookingService = app(BookingService::class);

        $app1 = $bookingService->createAppointment([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => "10:00",
            "patient_name" => "Mixed App 1",
            "patient_phone" => "0555222001",
        ], $env["user"]);
        $this->ledger["appointments"][] = $app1->id;

        $app2 = $bookingService->createAppointment([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => "10:00",
            "patient_name" => "Mixed App 2",
            "patient_phone" => "0555222002",
        ], $env["user"]);
        $this->ledger["appointments"][] = $app2->id;

        $appExt = $bookingService->createAppointment([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => "13:00",
            "patient_name" => "Ext App",
            "patient_phone" => "0555222003",
        ], $env["user"]);
        $this->ledger["appointments"][] = $appExt->id;

        $workerConfigs = [
            ["worker_id" => "ST04_C1", "action" => "cancel_appointment", "payload" => ["user_id" => $env["user"]->id, "appointment_id" => $app1->id]],
            ["worker_id" => "ST04_C2", "action" => "cancel_appointment", "payload" => ["user_id" => $env["user"]->id, "appointment_id" => $app2->id]],
            ["worker_id" => "ST04_B1", "action" => "create_appointment", "payload" => ["creator_id" => $env["user"]->id, "data" => ["clinic_id" => $env["clinic"]->id, "doctor_id" => $env["doctor"]->id, "appointment_date" => $date, "time_slot" => "10:00", "patient_name" => "B1", "patient_phone" => "0555222010"]]],
            ["worker_id" => "ST04_B2", "action" => "create_appointment", "payload" => ["creator_id" => $env["user"]->id, "data" => ["clinic_id" => $env["clinic"]->id, "doctor_id" => $env["doctor"]->id, "appointment_date" => $date, "time_slot" => "10:00", "patient_name" => "B2", "patient_phone" => "0555222020"]]],
            ["worker_id" => "ST04_R1", "action" => "reschedule_appointment", "payload" => ["user_id" => $env["user"]->id, "appointment_id" => $appExt->id, "new_slot_data" => ["appointment_date" => $date, "time_slot" => "10:00"]]],
        ];

        $results = $this->launchConcurrentWorkers($workerConfigs, 15.0);

        $slot10 = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", "10:00")->first();
        $occ10 = Appointment::where("clinic_id", $env["clinic"]->id)->where("time_slot", "10:00")->whereIn("status", Appointment::OCCUPYING_STATUSES)->count();

        $this->assertSame((int) $slot10->booked_count, $occ10, "Counter strictly matches active occupancy");
        $this->assertTrue($occ10 <= 3, "Occupancy never exceeds capacity 3");
    }

    /**
     * ST-05: Quarantine Re-entry and Persistence Race
     */
    public function test_st05_quarantine_reentry_and_persistence_race(): void
    {
        $env = $this->createTestEnvironment(4, ["10:00"]);
        $date = "2026-11-15";
        $slotTime = "10:00";

        $slot = AppointmentSlot::create([
            "clinic_id" => $env["clinic"]->id,
            "doctor_id" => $env["doctor"]->id,
            "appointment_date" => $date,
            "time_slot" => $slotTime,
            "capacity" => 4,
            "booked_count" => 3,
            "is_quarantined" => false,
        ]);
        $this->ledger["slots"][] = $slot->id;

        $workerConfigs = [];
        for ($w = 1; $w <= 8; $w++) {
            $workerConfigs[] = [
                "worker_id" => "ST05_W{$w}",
                "action" => "create_appointment",
                "payload" => [
                    "creator_id" => $env["user"]->id,
                    "data" => [
                        "clinic_id" => $env["clinic"]->id,
                        "doctor_id" => $env["doctor"]->id,
                        "appointment_date" => $date,
                        "time_slot" => $slotTime,
                        "patient_name" => "Race Patient {$w}",
                        "patient_phone" => sprintf("055999%04d", $w),
                    ],
                ],
            ];
        }

        $results = $this->launchConcurrentWorkers($workerConfigs, 15.0);

        $refreshed = $slot->fresh();
        $this->assertTrue((bool) $refreshed->is_quarantined, "Slot must be quarantined");
        $this->assertSame(3, (int) $refreshed->booked_count, "Counter preserved");

        $reentryConfigs = [
            [
                "worker_id" => "ST05_REENTRY_1",
                "action" => "create_appointment",
                "payload" => [
                    "creator_id" => $env["user"]->id,
                    "data" => [
                        "clinic_id" => $env["clinic"]->id,
                        "doctor_id" => $env["doctor"]->id,
                        "appointment_date" => $date,
                        "time_slot" => $slotTime,
                        "patient_name" => "Reentry 1",
                        "patient_phone" => "0559999991",
                    ],
                ],
            ],
        ];

        $reentryRes = $this->launchConcurrentWorkers($reentryConfigs, 10.0);
        $this->assertSame("EXPECTED_REJECTION", $reentryRes["ST05_REENTRY_1"]["status"]);
        $this->assertSame("SLOT_QUARANTINED", $reentryRes["ST05_REENTRY_1"]["error_code"]);
    }

    /**
     * ST-06: Repeated-Run Stability (Multi-Iteration Verification)
     */
    public function test_st06_repeated_run_stability(): void
    {
        for ($iter = 1; $iter <= 3; $iter++) {
            $env = $this->createTestEnvironment(2, ["10:00"]);
            $date = "2026-11-15";
            $slotTime = "10:00";

            $workerConfigs = [
                ["worker_id" => "ST06_I{$iter}_W1", "action" => "create_appointment", "payload" => ["creator_id" => $env["user"]->id, "data" => ["clinic_id" => $env["clinic"]->id, "doctor_id" => $env["doctor"]->id, "appointment_date" => $date, "time_slot" => $slotTime, "patient_name" => "P1", "patient_phone" => "0555111111"]]],
                ["worker_id" => "ST06_I{$iter}_W2", "action" => "create_appointment", "payload" => ["creator_id" => $env["user"]->id, "data" => ["clinic_id" => $env["clinic"]->id, "doctor_id" => $env["doctor"]->id, "appointment_date" => $date, "time_slot" => $slotTime, "patient_name" => "P2", "patient_phone" => "0555111112"]]],
                ["worker_id" => "ST06_I{$iter}_W3", "action" => "create_appointment", "payload" => ["creator_id" => $env["user"]->id, "data" => ["clinic_id" => $env["clinic"]->id, "doctor_id" => $env["doctor"]->id, "appointment_date" => $date, "time_slot" => $slotTime, "patient_name" => "P3", "patient_phone" => "0555111113"]]],
            ];

            $results = $this->launchConcurrentWorkers($workerConfigs, 15.0);

            $successes = 0;
            $rejections = 0;
            foreach ($results as $res) {
                if ($res["status"] === "SUCCESS") $successes++;
                if ($res["status"] === "EXPECTED_REJECTION") $rejections++;
            }

            $this->assertSame(2, $successes, "Iteration {$iter}: Exactly 2 successes");
            $this->assertSame(1, $rejections, "Iteration {$iter}: Exactly 1 rejection");

            $slot = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", $slotTime)->first();
            $this->assertSame(2, (int) $slot->booked_count, "Iteration {$iter}: Counter is 2");
        }
    }


    /**
     * ST-C5-01: 50-Worker High Contention on Shared Booking Capacity
     */
    public function test_st_c5_01_fifty_worker_contention(): void
    {
        $capacity = 3;
        $numWorkers = 50;

        $env = $this->createTestEnvironment($capacity, ["10:00"]);
        $date = "2026-11-15"; // Sunday
        $slotTime = "10:00";

        $workerConfigs = [];
        for ($w = 1; $w <= $numWorkers; $w++) {
            $workerConfigs[] = [
                "worker_id" => "C5_W{$w}",
                "action" => "create_appointment",
                "payload" => [
                    "creator_id" => $env["user"]->id,
                    "data" => [
                        "clinic_id" => $env["clinic"]->id,
                        "doctor_id" => $env["doctor"]->id,
                        "appointment_date" => $date,
                        "time_slot" => $slotTime,
                        "patient_name" => "C5 Concurrent Patient {$w}",
                        "patient_phone" => sprintf("0550%06d", $w),
                    ],
                ],
            ];
        }

        $startTime = microtime(true);
        $results = $this->launchConcurrentWorkers($workerConfigs, 35.0);
        $elapsed = microtime(true) - $startTime;

        $successes = 0;
        $capacityRejections = 0;
        $errors = 0;
        $timeouts = 0;
        $durations = [];

        foreach ($results as $wId => $res) {
            $status = $res["status"] ?? "UNKNOWN";
            if ($status === "SUCCESS") {
                $successes++;
            } elseif ($status === "EXPECTED_REJECTION") {
                $capacityRejections++;
            } elseif ($status === "TIMEOUT") {
                $timeouts++;
            } else {
                $errors++;
            }

            if (isset($res["start_time"], $res["end_time"])) {
                $durations[] = ($res["end_time"] - $res["start_time"]) * 1000.0; // ms
            }
        }

        // Metrics output for reporting
        sort($durations);
        $countDur = count($durations);
        $minDur = $countDur > 0 ? $durations[0] : 0;
        $maxDur = $countDur > 0 ? $durations[$countDur - 1] : 0;
        $avgDur = $countDur > 0 ? array_sum($durations) / $countDur : 0;
        $medianDur = $countDur > 0 ? $durations[(int) ($countDur * 0.5)] : 0;
        $p95Dur = $countDur > 0 ? $durations[(int) ($countDur * 0.95)] : 0;
        $p99Dur = $countDur > 0 ? $durations[(int) ($countDur * 0.99)] : 0;

        $metrics = [
            "num_workers" => $numWorkers,
            "successes" => $successes,
            "capacity_rejections" => $capacityRejections,
            "errors" => $errors,
            "timeouts" => $timeouts,
            "elapsed_seconds" => round($elapsed, 3),
            "latencies_ms" => [
                "min" => round($minDur, 2),
                "median" => round($medianDur, 2),
                "avg" => round($avgDur, 2),
                "p95" => round($p95Dur, 2),
                "p99" => round($p99Dur, 2),
                "max" => round($maxDur, 2),
            ],
        ];

        file_put_contents("/tmp/c5_metrics.json", json_encode($metrics, JSON_PRETTY_PRINT));

        // Invariants assertions
        $this->assertSame(3, $successes, "Exactly 3 bookings must succeed on capacity 3");
        $this->assertSame(47, $capacityRejections, "Remaining 47 attempts must be rejected for capacity");
        $this->assertSame(0, $errors, "Zero unexpected errors under 50 workers");
        $this->assertSame(0, $timeouts, "Zero timeouts under 50 workers");

        // Database Invariant Checks
        $slot = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", $slotTime)->firstOrFail();
        $actualOccupied = Appointment::where("clinic_id", $env["clinic"]->id)
            ->where("time_slot", $slotTime)
            ->whereIn("status", Appointment::OCCUPYING_STATUSES)
            ->count();

        $this->assertSame(3, (int) $slot->booked_count, "booked_count must be exactly 3");
        $this->assertSame(3, $actualOccupied, "Actual occupied appointments in DB must be exactly 3");
        $this->assertSame((int) $slot->booked_count, $actualOccupied, "booked_count matches actual count");
        $this->assertTrue($actualOccupied <= $capacity, "Capacity never exceeded");
    }


    /**
     * ST-C7-01: 100-Worker High Contention on Shared Booking Capacity
     */
    public function test_st_c7_01_hundred_worker_contention(): void
    {
        $capacity = 3;
        $numWorkers = 100;

        $env = $this->createTestEnvironment($capacity, ["10:00"]);
        $date = "2026-11-15"; // Sunday
        $slotTime = "10:00";

        $workerConfigs = [];
        for ($w = 1; $w <= $numWorkers; $w++) {
            $workerConfigs[] = [
                "worker_id" => "C7_W{$w}",
                "action" => "create_appointment",
                "payload" => [
                    "creator_id" => $env["user"]->id,
                    "data" => [
                        "clinic_id" => $env["clinic"]->id,
                        "doctor_id" => $env["doctor"]->id,
                        "appointment_date" => $date,
                        "time_slot" => $slotTime,
                        "patient_name" => "C7 Concurrent Patient {$w}",
                        "patient_phone" => sprintf("0557%06d", $w),
                    ],
                ],
            ];
        }

        $startTime = microtime(true);
        $results = $this->launchConcurrentWorkers($workerConfigs, 45.0);
        $elapsed = microtime(true) - $startTime;

        $successes = 0;
        $capacityRejections = 0;
        $errors = 0;
        $timeouts = 0;
        $durations = [];

        foreach ($results as $wId => $res) {
            $status = $res["status"] ?? "UNKNOWN";
            if ($status === "SUCCESS") {
                $successes++;
            } elseif ($status === "EXPECTED_REJECTION") {
                $capacityRejections++;
            } elseif ($status === "TIMEOUT") {
                $timeouts++;
            } else {
                $errors++;
            }

            if (isset($res["start_time"], $res["end_time"])) {
                $durations[] = ($res["end_time"] - $res["start_time"]) * 1000.0; // ms
            }
        }

        // Metrics output for reporting
        sort($durations);
        $countDur = count($durations);
        $minDur = $countDur > 0 ? $durations[0] : 0;
        $maxDur = $countDur > 0 ? $durations[$countDur - 1] : 0;
        $avgDur = $countDur > 0 ? array_sum($durations) / $countDur : 0;
        $medianDur = $countDur > 0 ? $durations[(int) ($countDur * 0.5)] : 0;
        $p95Dur = $countDur > 0 ? $durations[(int) ($countDur * 0.95)] : 0;
        $p99Dur = $countDur > 0 ? $durations[(int) ($countDur * 0.99)] : 0;

        $metrics = [
            "num_workers" => $numWorkers,
            "successes" => $successes,
            "capacity_rejections" => $capacityRejections,
            "errors" => $errors,
            "timeouts" => $timeouts,
            "elapsed_seconds" => round($elapsed, 3),
            "latencies_ms" => [
                "min" => round($minDur, 2),
                "median" => round($medianDur, 2),
                "avg" => round($avgDur, 2),
                "p95" => round($p95Dur, 2),
                "p99" => round($p99Dur, 2),
                "max" => round($maxDur, 2),
            ],
        ];

        file_put_contents("/tmp/c7_metrics.json", json_encode($metrics, JSON_PRETTY_PRINT));

        // Invariants assertions
        $this->assertSame(3, $successes, "Exactly 3 bookings must succeed on capacity 3");
        $this->assertSame(97, $capacityRejections, "Remaining 97 attempts must be rejected for capacity");
        $this->assertSame(0, $errors, "Zero unexpected errors under 100 workers");
        $this->assertSame(0, $timeouts, "Zero timeouts under 100 workers");

        // Database Invariant Checks
        $slot = AppointmentSlot::where("clinic_id", $env["clinic"]->id)->where("time_slot", $slotTime)->firstOrFail();
        $actualOccupied = Appointment::where("clinic_id", $env["clinic"]->id)
            ->where("time_slot", $slotTime)
            ->whereIn("status", Appointment::OCCUPYING_STATUSES)
            ->count();

        $this->assertSame(3, (int) $slot->booked_count, "booked_count must be exactly 3");
        $this->assertSame(3, $actualOccupied, "Actual occupied appointments in DB must be exactly 3");
        $this->assertSame((int) $slot->booked_count, $actualOccupied, "booked_count matches actual count");
        $this->assertTrue($actualOccupied <= $capacity, "Capacity never exceeded");
    }

}
