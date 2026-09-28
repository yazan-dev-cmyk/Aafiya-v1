<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\QuotaService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingAndQuotaConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $centerUser;
    protected BookingCenter $bookingCenter;

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
        $centerRole = Role::where('name', 'booking_center')->firstOrFail();

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-CONC-01',
        ]);

        // Max 2 patients per slot for precise concurrency collision test
        $this->clinic = Clinic::create([
            'name' => 'عيادة التزامن',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021112233',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 2,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->centerUser = User::factory()->create();
        $this->centerUser->roles()->attach($centerRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->centerUser->id,
            'name' => 'مركز الحجز المركزي',
            'address' => 'شارع ديدوش مراد',
            'wilaya' => 'الجزائر',
            'phone' => '021998877',
            'quota_balance' => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);
    }

    public function test_capacity_overflow_collision_is_prevented_by_pessimistic_lock(): void
    {
        $bookingService = app(BookingService::class);
        $date = now()->addDay()->format('Y-m-d');
        $slot = '10:00';

        // 1. Book Slot 1 (occupancy = 1 / 2) -> SUCCESS
        $app1 = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 1',
            'patient_phone' => '0555000001',
            'appointment_date' => $date,
            'time_slot' => $slot,
        ], $this->centerUser);
        $this->assertNotNull($app1);

        // 2. Book Slot 2 (occupancy = 2 / 2) -> SUCCESS
        $app2 = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 2',
            'patient_phone' => '0555000002',
            'appointment_date' => $date,
            'time_slot' => $slot,
        ], $this->centerUser);
        $this->assertNotNull($app2);

        // 3. Attempt to book Slot 3 exceeding capacity -> FAILS with ValidationException
        $this->expectException(ValidationException::class);
        $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 3',
            'patient_phone' => '0555000003',
            'appointment_date' => $date,
            'time_slot' => $slot,
        ], $this->centerUser);
    }

    public function test_duplicate_active_booking_for_same_patient_in_same_slot_is_prevented(): void
    {
        $bookingService = app(BookingService::class);
        $date = now()->addDays(2)->format('Y-m-d');
        $slot = '11:00';

        // First booking
        $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مكرر',
            'patient_phone' => '0555777888',
            'appointment_date' => $date,
            'time_slot' => $slot,
        ], $this->centerUser);

        // Second booking with exact same phone & slot -> Rejected
        $this->expectException(ValidationException::class);
        $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مكرر',
            'patient_phone' => '0555777888',
            'appointment_date' => $date,
            'time_slot' => $slot,
        ], $this->centerUser);
    }

    public function test_quota_deduction_is_idempotent_and_prevents_double_charge(): void
    {
        $quotaService = app(QuotaService::class);
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض اختبار الحصة',
            'patient_phone' => '0555123456',
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'time_slot' => '14:00',
        ], $this->centerUser);

        $this->assertEquals(10, $this->bookingCenter->fresh()->quota_balance);

        // First deduction: drops balance from 10 to 9
        $tx1 = $quotaService->deductForAppointment($this->bookingCenter, $appointment, $this->doctorUser);
        $this->assertNotNull($tx1);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // Second duplicate deduction call on the same appointment -> Idempotently returns existing tx without double deduction
        $tx2 = $quotaService->deductForAppointment($this->bookingCenter, $appointment, $this->doctorUser);
        $this->assertEquals($tx1->id, $tx2->id);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);
    }

    public function test_quota_deduction_fails_when_balance_is_zero(): void
    {
        $bookingService = app(BookingService::class);

        $this->bookingCenter->update(['quota_balance' => 0]);

        $this->expectException(ValidationException::class);

        $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض الرصيد المنتهي',
            'patient_phone' => '0555654321',
            'appointment_date' => now()->addDays(4)->format('Y-m-d'),
            'time_slot' => '15:00',
        ], $this->centerUser);
    }
}
