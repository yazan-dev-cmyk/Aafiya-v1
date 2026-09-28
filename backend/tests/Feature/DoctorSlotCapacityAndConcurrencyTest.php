<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DoctorSlotCapacityAndConcurrencyTest extends TestCase
{
    protected User $directorUser;
    protected Doctor $doctorA;
    protected Doctor $doctorB;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected User $bookingCenterUser;
    protected BookingCenter $bookingCenter;
    protected BookingService $bookingService;

    protected function setUp(): void
    {
        parent::setUp();

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('appointments')->truncate();
        DB::table('appointment_slots')->truncate();
        DB::table('patients')->truncate();
        DB::table('doctor_clinic')->truncate();
        DB::table('clinics')->truncate();
        DB::table('booking_centers')->truncate();
        DB::table('doctors')->truncate();
        DB::table('role_user')->truncate();
        DB::table('users')->truncate();
        DB::table('appointment_sequences')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // 1. Setup Director & Doctor A
        $this->directorUser = User::factory()->create(['email' => 'director.slot@clinic.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->doctorA = Doctor::create([
            'user_id'        => $this->directorUser->id,
            'specialty'      => 'طب عام',
            'license_number' => 'DOC-SLOT-A',
            'is_verified'    => true,
        ]);

        // 2. Setup Doctor B
        $userB = User::factory()->create(['email' => 'doctorB.slot@clinic.dz']);
        $userB->roles()->attach($doctorRole->id);
        $this->doctorB = Doctor::create([
            'user_id'        => $userB->id,
            'specialty'      => 'طب الأطفال',
            'license_number' => 'DOC-SLOT-B',
            'is_verified'    => true,
        ]);

        // 3. Setup Clinic A
        $this->clinicA = Clinic::create([
            'name'                  => 'عيادة الأمل للاختبارات',
            'address'               => 'شارع ديدوش، الجزائر',
            'wilaya'                => 'الجزائر',
            'phone'                 => '021001122',
            'director_doctor_id'    => $this->doctorA->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min'     => 60,
        ]);

        $this->doctorA->clinics()->attach($this->clinicA->id, [
            'position'   => 'director',
            'is_primary' => true,
            'is_active'  => true,
        ]);

        $this->doctorB->clinics()->attach($this->clinicA->id, [
            'position'   => 'doctor',
            'is_primary' => false,
            'is_active'  => true,
        ]);

        // 4. Setup Clinic B
        $this->clinicB = Clinic::create([
            'name'                  => 'عيادة الشفاء للاختبارات',
            'address'               => 'نهج العقيد عميروش، وهران',
            'wilaya'                => 'وهران',
            'phone'                 => '041002233',
            'director_doctor_id'    => $this->doctorB->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min'     => 60,
        ]);

        $this->doctorB->clinics()->attach($this->clinicB->id, [
            'position'   => 'director',
            'is_primary' => true,
            'is_active'  => true,
        ]);

        // 5. Setup Booking Center with generous quota
        $this->bookingCenterUser = User::factory()->create(['email' => 'bc.slot@center.dz']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id'             => $this->bookingCenterUser->id,
            'name'                => 'مركز الحجز المتزامن',
            'phone'               => '021554433',
            'address'             => 'الجزائر الوسطى',
            'wilaya'              => 'الجزائر',
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at'         => now(),
            'quota_balance'       => 5000,
            'is_active'           => true,
        ]);

        // 6. Ensure appointment sequences row exists for 2026
        DB::table('appointment_sequences')->insertOrIgnore([
            'year'             => 2026,
            'current_sequence' => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $this->bookingService = app(BookingService::class);
    }

    /**
     * Helper to run parallel worker processes executing createAppointment.
     *
     * @param array<int, array<string, mixed>> $requestsData
     * @return array<string, mixed>
     */
    protected function executeParallelBookings(array $requestsData): array
    {
        $basePath = base_path();
        $dbName = config('database.connections.mysql.database');

        $workerScript = <<<PHP
putenv("DB_DATABASE={$dbName}");
\$_ENV['DB_DATABASE'] = "{$dbName}";
\$_SERVER['DB_DATABASE'] = "{$dbName}";

require '{$basePath}/vendor/autoload.php';
\$app = require_once '{$basePath}/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

config(['database.connections.mysql.database' => '{$dbName}']);
\Illuminate\Support\Facades\DB::purge('mysql');
\Illuminate\Support\Facades\DB::reconnect('mysql');

\$payloadRaw = \$argv[1];
\$payload = json_decode(base64_decode(\$payloadRaw), true);
\$actorId = \$payload['actor_id'];
\$appointmentData = \$payload['data'];

try {
    \Carbon\Carbon::setTestNow(\Carbon\Carbon::create(2026, 9, 15, 12, 0, 0, 'Africa/Algiers'));
    \$actor = \App\Models\User::findOrFail(\$actorId);
    \$service = app(\App\Services\BookingService::class);

    \$start = microtime(true);
    \$appointment = \$service->createAppointment(\$appointmentData, \$actor);
    \$duration = microtime(true) - \$start;

    echo json_encode([
        'status'            => 'success',
        'appointment_id'    => \$appointment->id,
        'booking_reference' => \$appointment->booking_reference,
        'time_slot'         => \$appointment->time_slot,
        'duration'          => \$duration,
    ]);
} catch (\Illuminate\Validation\ValidationException \$e) {
    echo json_encode([
        'status'  => 'rejected',
        'errors'  => \$e->errors(),
        'message' => \$e->getMessage(),
    ]);
} catch (\Throwable \$e) {
    echo json_encode([
        'status'    => 'error',
        'exception' => get_class(\$e),
        'message'   => \$e->getMessage(),
    ]);
}
PHP;

        $tempScript = sys_get_temp_dir() . '/slot_worker_' . uniqid() . '.php';
        file_put_contents($tempScript, "<?php\n" . $workerScript);

        $processes = [];
        $pipes = [];

        $workerEnv = [];
        foreach ($_SERVER as $k => $v) {
            if (is_scalar($v)) {
                $workerEnv[$k] = (string) $v;
            }
        }
        $workerEnv['APP_ENV'] = 'testing';
        $workerEnv['DB_DATABASE'] = $dbName;

        foreach ($requestsData as $idx => $req) {
            $payload = base64_encode(json_encode([
                'actor_id' => $this->bookingCenterUser->id,
                'data'     => $req,
            ]));

            $cmd = sprintf('php %s %s', escapeshellarg($tempScript), escapeshellarg($payload));
            $proc = proc_open($cmd, [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ], $procPipes, base_path(), $workerEnv);

            $processes[$idx] = $proc;
            $pipes[$idx] = $procPipes;
        }

        $results = [
            'success'   => 0,
            'rejected'  => 0,
            'errors'    => 0,
            'deadlocks' => 0,
            'http_500'  => 0,
            'details'   => [],
        ];

        foreach ($processes as $idx => $proc) {
            $stdout = stream_get_contents($pipes[$idx][1]);
            $stderr = stream_get_contents($pipes[$idx][2]);
            fclose($pipes[$idx][0]);
            fclose($pipes[$idx][1]);
            fclose($pipes[$idx][2]);
            proc_close($proc);

            $data = json_decode(trim($stdout), true);
            if ($data && isset($data['status'])) {
                if ($data['status'] === 'success') {
                    $results['success']++;
                } elseif ($data['status'] === 'rejected') {
                    $results['rejected']++;
                } else {
                    $results['errors']++;
                    $results['http_500']++;
                    if (str_contains(strtolower($data['message'] ?? ''), 'deadlock')) {
                        $results['deadlocks']++;
                    }
                }
                $results['details'][$idx] = $data;
            } else {
                $results['errors']++;
                $results['http_500']++;
                $results['details'][$idx] = ['status' => 'crash', 'stderr' => $stderr, 'stdout' => $stdout];
            }
        }

        @unlink($tempScript);

        return $results;
    }

    /**
     * TEST MATRIX 1..10: Exact Capacity Concurrency
     * For each capacity 1..10: launch exactly N = capacity simultaneous requests against an empty slot.
     * Expected: success = capacity, overflow = 0, deadlocks = 0, 500 = 0.
     */
    public function test_exact_capacity_concurrency_for_capacities_1_through_10(): void
    {
        for ($cap = 1; $cap <= 10; $cap++) {
            // Configure capacity on doctor_clinic pivot
            DB::table('doctor_clinic')
                ->where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->update(['max_patients_per_slot' => $cap]);

            $date = sprintf('2026-10-%02d', $cap);
            $slot = '09:00';

            // Clean any previous test rows for this date
            Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->forceDelete();

            AppointmentSlot::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->delete();

            // Prepare N = capacity simultaneous requests with unique phone numbers
            $requests = [];
            for ($w = 1; $w <= $cap; $w++) {
                $requests[] = [
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "مريض كفاءة {$cap}-{$w}",
                    'patient_phone'    => sprintf('0551%02d%04d', $cap, $w),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ];
            }

            $res = $this->executeParallelBookings($requests);

            $this->assertEquals($cap, $res['success'], "Capacity {$cap} exact test failed: expected {$cap} successes, got {$res['success']}");
            $this->assertEquals(0, $res['rejected'], "Capacity {$cap} exact test: unexpected rejections");
            $this->assertEquals(0, $res['errors'], "Capacity {$cap} exact test: unexpected errors");
            $this->assertEquals(0, $res['deadlocks'], "Capacity {$cap} exact test encountered deadlocks");
            $this->assertEquals(0, $res['http_500'], "Capacity {$cap} exact test encountered 500 errors");

            // Verify final DB state
            $dbCount = Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();

            $this->assertEquals($cap, $dbCount);

            $slotRow = AppointmentSlot::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->first();

            $this->assertNotNull($slotRow);
            $this->assertEquals($cap, $slotRow->booked_count);
            $this->assertEquals($cap, $slotRow->capacity);
        }
    }

    /**
     * TEST MATRIX 1..10: One Over Capacity Concurrency
     * For each capacity 1..10: launch N = capacity + 1 simultaneous requests against empty slot.
     * Expected: success = capacity, rejected = 1, overflow = 0, deadlocks = 0, 500 = 0.
     */
    public function test_one_over_capacity_concurrency_for_capacities_1_through_10(): void
    {
        for ($cap = 1; $cap <= 10; $cap++) {
            DB::table('doctor_clinic')
                ->where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->update(['max_patients_per_slot' => $cap]);

            $date = sprintf('2026-11-%02d', $cap);
            $slot = '10:00';

            Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->forceDelete();

            AppointmentSlot::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->delete();

            $totalWorkers = $cap + 1;
            $requests = [];
            for ($w = 1; $w <= $totalWorkers; $w++) {
                $requests[] = [
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "مريض زائد {$cap}-{$w}",
                    'patient_phone'    => sprintf('0552%02d%04d', $cap, $w),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ];
            }

            $res = $this->executeParallelBookings($requests);

            $this->assertEquals($cap, $res['success'], "Capacity {$cap} one-over test: expected {$cap} successes");
            $this->assertEquals(1, $res['rejected'], "Capacity {$cap} one-over test: expected exactly 1 rejection");
            $this->assertEquals(0, $res['errors'], "Capacity {$cap} one-over test: unexpected errors");
            $this->assertEquals(0, $res['deadlocks'], "Capacity {$cap} one-over test encountered deadlocks");

            $dbCount = Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();

            $this->assertEquals($cap, $dbCount);
        }
    }

    /**
     * Heavy Overload Test: 20 simultaneous booking requests against an empty slot for capacities 1, 5, 7, 10.
     * Expected: exactly capacity successes, (20 - capacity) rejected, 0 HTTP 500, 0 deadlocks.
     */
    public function test_heavy_overload_20_concurrent_requests(): void
    {
        $testedCapacities = [1, 5, 7, 10];

        foreach ($testedCapacities as $cap) {
            DB::table('doctor_clinic')
                ->where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->update(['max_patients_per_slot' => $cap]);

            $date = sprintf('2026-12-%02d', $cap);
            $slot = '11:00';

            Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->forceDelete();

            AppointmentSlot::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->delete();

            $requests = [];
            for ($w = 1; $w <= 20; $w++) {
                $requests[] = [
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "حمل ثقيل {$cap}-{$w}",
                    'patient_phone'    => sprintf('0553%02d%04d', $cap, $w),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ];
            }

            $res = $this->executeParallelBookings($requests);

            $this->assertEquals($cap, $res['success'], "Heavy overload for capacity {$cap}: expected {$cap} successes");
            $this->assertEquals(20 - $cap, $res['rejected'], "Heavy overload for capacity {$cap}: expected " . (20 - $cap) . " rejections");
            $this->assertEquals(0, $res['errors'], "Heavy overload encountered errors");
            $this->assertEquals(0, $res['deadlocks'], "Heavy overload encountered deadlocks");
            $this->assertEquals(0, $res['http_500'], "Heavy overload encountered 500 errors");

            $finalDbCount = Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();

            $this->assertEquals($cap, $finalDbCount);
        }
    }

    /**
     * Partial-Full Slot Race: Pre-populate capacity - 1, then launch 2 concurrent requests.
     * Expected: 1 success, 1 rejected, final count = capacity.
     */
    public function test_partial_full_slot_concurrency_race(): void
    {
        $capacities = [3, 7, 10];

        foreach ($capacities as $cap) {
            DB::table('doctor_clinic')
                ->where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->update(['max_patients_per_slot' => $cap]);

            $date = sprintf('2027-01-%02d', $cap);
            $slot = '14:00';

            Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->forceDelete();

            AppointmentSlot::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->delete();

            // Prepopulate cap - 1 sequentially
            for ($p = 1; $p <= $cap - 1; $p++) {
                $this->bookingService->createAppointment([
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "مريض مسبق {$cap}-{$p}",
                    'patient_phone'    => sprintf('0554%02d%04d', $cap, $p),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ], $this->bookingCenterUser);
            }

            $preCount = Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();
            $this->assertEquals($cap - 1, $preCount);

            // Launch 2 simultaneous requests for the final remaining slot place
            $requests = [
                [
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "متنافس أخير 1",
                    'patient_phone'    => sprintf('0555%02d0001', $cap),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ],
                [
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => "متنافس أخير 2",
                    'patient_phone'    => sprintf('0555%02d0002', $cap),
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ],
            ];

            $res = $this->executeParallelBookings($requests);

            $this->assertEquals(1, $res['success'], "Partial full race for cap {$cap}: expected 1 success");
            $this->assertEquals(1, $res['rejected'], "Partial full race for cap {$cap}: expected 1 rejection");
            $this->assertEquals(0, $res['deadlocks']);
            $this->assertEquals(0, $res['http_500']);

            $finalDbCount = Appointment::where('clinic_id', $this->clinicA->id)
                ->where('doctor_id', $this->doctorA->id)
                ->where('appointment_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('status', Appointment::OCCUPYING_STATUSES)
                ->count();

            $this->assertEquals($cap, $finalDbCount);
        }
    }

    /**
     * Duplicate Patient Booking Race: Same phone attempting to book same doctor slot concurrently.
     * Expected: exactly 1 success, remainder rejected, final count = 1.
     */
    public function test_same_patient_duplicate_booking_race(): void
    {
        DB::table('doctor_clinic')
            ->where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorA->id)
            ->update(['max_patients_per_slot' => 10]);

        $date = '2027-02-10';
        $slot = '15:00';
        $sharedPhone = '0555999888';

        Appointment::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->forceDelete();

        AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->delete();

        // 5 simultaneous requests with the exact same phone
        $requests = [];
        for ($w = 1; $w <= 5; $w++) {
            $requests[] = [
                'clinic_id'        => $this->clinicA->id,
                'doctor_id'        => $this->doctorA->id,
                'patient_name'     => 'المريض المكرر المتزامن',
                'patient_phone'    => $sharedPhone,
                'appointment_date' => $date,
                'time_slot'        => $slot,
            ];
        }

        $res = $this->executeParallelBookings($requests);

        $this->assertEquals(1, $res['success'], "Duplicate patient race: exactly 1 should succeed");
        $this->assertEquals(4, $res['rejected'], "Duplicate patient race: 4 should be rejected");
        $this->assertEquals(0, $res['deadlocks']);
        $this->assertEquals(0, $res['http_500']);

        $patientCount = Appointment::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->where('patient_phone', $sharedPhone)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->count();

        $this->assertEquals(1, $patientCount);
    }

    /**
     * Different Doctors Same Time Slot Isolation:
     * Doctor A (capacity 10) and Doctor B (capacity 10) at 10:00.
     * 20 concurrent requests (10 for Doctor A, 10 for Doctor B) should all succeed independently.
     */
    public function test_different_doctors_same_slot_isolation(): void
    {
        DB::table('doctor_clinic')
            ->where('clinic_id', $this->clinicA->id)
            ->update(['max_patients_per_slot' => 10]);

        $date = '2027-03-15';
        $slot = '10:00';

        Appointment::where('clinic_id', $this->clinicA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->forceDelete();

        AppointmentSlot::where('clinic_id', $this->clinicA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->delete();

        $requests = [];
        // 10 for Doctor A
        for ($i = 1; $i <= 10; $i++) {
            $requests[] = [
                'clinic_id'        => $this->clinicA->id,
                'doctor_id'        => $this->doctorA->id,
                'patient_name'     => "مريض طبيب أ {$i}",
                'patient_phone'    => sprintf('05561%05d', $i),
                'appointment_date' => $date,
                'time_slot'        => $slot,
            ];
        }
        // 10 for Doctor B
        for ($i = 1; $i <= 10; $i++) {
            $requests[] = [
                'clinic_id'        => $this->clinicA->id,
                'doctor_id'        => $this->doctorB->id,
                'patient_name'     => "مريض طبيب ب {$i}",
                'patient_phone'    => sprintf('05562%05d', $i),
                'appointment_date' => $date,
                'time_slot'        => $slot,
            ];
        }

        // Shuffle requests to interleave them
        shuffle($requests);

        $res = $this->executeParallelBookings($requests);

        $this->assertEquals(20, $res['success']);
        $this->assertEquals(0, $res['rejected']);
        $this->assertEquals(0, $res['deadlocks']);
        $this->assertEquals(0, $res['http_500']);

        $countDocA = Appointment::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorA->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->count();

        $countDocB = Appointment::where('clinic_id', $this->clinicA->id)
            ->where('doctor_id', $this->doctorB->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->whereIn('status', Appointment::OCCUPYING_STATUSES)
            ->count();

        $this->assertEquals(10, $countDocA);
        $this->assertEquals(10, $countDocB);
    }

    /**
     * Booking Reference Atomic Generation Race:
     * 20 concurrent requests across different slots generate 20 strictly distinct sequential references.
     */
    public function test_booking_reference_atomic_generation_race(): void
    {
        $date = '2027-04-20';

        $requests = [];
        for ($i = 1; $i <= 20; $i++) {
            $slotHour = sprintf('%02d:00', ($i % 8) + 8); // 08:00 to 15:00
            $docId = ($i % 2 === 0) ? $this->doctorA->id : $this->doctorB->id;
            $clinicId = ($i % 2 === 0) ? $this->clinicA->id : $this->clinicB->id;

            $requests[] = [
                'clinic_id'        => $clinicId,
                'doctor_id'        => $docId,
                'patient_name'     => "مريض مرجع {$i}",
                'patient_phone'    => sprintf('0557%06d', $i),
                'appointment_date' => $date,
                'time_slot'        => $slotHour,
            ];
        }

        $res = $this->executeParallelBookings($requests);

        $this->assertEquals(20, $res['success']);
        $this->assertEquals(0, $res['errors']);

        $references = [];
        foreach ($res['details'] as $detail) {
            $this->assertNotEmpty($detail['booking_reference']);
            $this->assertMatchesRegularExpression('/^MS-\d{4}-\d{4}$/', $detail['booking_reference']);
            $references[] = $detail['booking_reference'];
        }

        $this->assertCount(20, array_unique($references), 'All booking references must be strictly unique under concurrency');
    }

    /**
     * Transaction Rollback atomicity: Slot booked_count is rolled back if booking creation fails.
     */
    public function test_transaction_rollback_restores_slot_counter(): void
    {
        $date = '2027-05-10';
        $slot = '16:00';

        $slotRow = $this->bookingService->ensureSlotExists($this->clinicA, $this->doctorA, $date, $slot);
        $this->assertEquals(0, $slotRow->booked_count);

        try {
            DB::transaction(function () use ($date, $slot) {
                $this->bookingService->createAppointment([
                    'clinic_id'        => $this->clinicA->id,
                    'doctor_id'        => $this->doctorA->id,
                    'patient_name'     => 'مريض تجربة التراجع',
                    'patient_phone'    => '0558112233',
                    'appointment_date' => $date,
                    'time_slot'        => $slot,
                ], $this->bookingCenterUser);

                throw new \RuntimeException('Simulated failure during appointment transaction');
            });
        } catch (\RuntimeException $e) {
            $this->assertEquals('Simulated failure during appointment transaction', $e->getMessage());
        }

        // Slot booked_count must remain 0
        $freshSlot = AppointmentSlot::find($slotRow->id);
        $this->assertEquals(0, $freshSlot->booked_count);

        // No appointment row should exist
        $appCount = Appointment::where('patient_phone', '0558112233')->count();
        $this->assertEquals(0, $appCount);
    }
}
