<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorTimeReservation;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\DoctorTimeReservationService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DoctorTimeReservationExclusivityTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Doctor $doctor;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected BookingService $bookingService;
    protected DoctorTimeReservationService $timeReservationService;
    protected string $testDate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDate = Carbon::now('Africa/Algiers')->addDays(2)->format('Y-m-d');

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $this->bookingService = app(BookingService::class);
        $this->timeReservationService = app(DoctorTimeReservationService::class);

        // Create Admin Actor
        $this->adminUser = User::factory()->create();
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $this->adminUser->roles()->attach($adminRole->id);

        // Create Shared Doctor
        $docUser = User::factory()->create();
        $this->doctor = Doctor::create([
            'user_id' => $docUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-TEST-001',
            'is_verified' => true,
        ]);

        // Create Clinic A
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الاختبار أ',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000001',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 3,
        ]);
        $this->doctor->clinics()->attach($this->clinicA->id, [
            'is_active' => true,
            'max_patients_per_slot' => 3,
        ]);

        // Create Clinic B
        $this->clinicB = Clinic::create([
            'name' => 'عيادة الاختبار ب',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '021000002',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 3,
        ]);
        $this->doctor->clinics()->attach($this->clinicB->id, [
            'is_active' => true,
            'max_patients_per_slot' => 3,
        ]);
    }

    /**
     * Helper to mock configured operating & working hours for tests.
     */
    protected function setupSchedules(Clinic $clinic, Doctor $doctor, int $dow, string $slot): void
    {
        // Populate clinic operating hours (all 7 days required by ClinicOperatingHoursService::isClinicConfigured)
        if (\Illuminate\Support\Facades\Schema::hasTable('clinic_operating_hours')) {
            for ($d = 0; $d <= 6; $d++) {
                $isOpenDay = ($d === $dow);
                $existing = DB::table('clinic_operating_hours')
                    ->where('clinic_id', $clinic->id)
                    ->where('day_of_week', $d)
                    ->where('period_index', 0)
                    ->first();

                if ($existing) {
                    if ($isOpenDay) {
                        DB::table('clinic_operating_hours')
                            ->where('id', $existing->id)
                            ->update([
                                'is_closed' => false,
                                'open_time' => '08:00',
                                'close_time' => '17:00',
                                'updated_at' => now(),
                            ]);
                    }
                } else {
                    DB::table('clinic_operating_hours')->insert([
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'clinic_id' => $clinic->id,
                        'day_of_week' => $d,
                        'period_index' => 0,
                        'is_closed' => ! $isOpenDay,
                        'open_time' => $isOpenDay ? '08:00' : null,
                        'close_time' => $isOpenDay ? '17:00' : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        if (\Illuminate\Support\Facades\Schema::hasTable('doctor_day_schedules')) {
            $existingDaySchedule = DB::table('doctor_day_schedules')
                ->where('clinic_id', $clinic->id)
                ->where('doctor_id', $doctor->id)
                ->where('day_of_week', $dow)
                ->first();

            if ($existingDaySchedule) {
                $actualId = $existingDaySchedule->id;
                DB::table('doctor_day_schedules')
                    ->where('id', $actualId)
                    ->update([
                        'is_closed' => false,
                        'updated_at' => now(),
                    ]);
            } else {
                $actualId = (string) \Illuminate\Support\Str::uuid();
                DB::table('doctor_day_schedules')->insert([
                    'id' => $actualId,
                    'clinic_id' => $clinic->id,
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $dow,
                    'is_closed' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('doctor_working_slots')) {
                $existingSlot = DB::table('doctor_working_slots')
                    ->where('doctor_day_schedule_id', $actualId)
                    ->where('time_slot', $slot)
                    ->first();

                if (! $existingSlot) {
                    DB::table('doctor_working_slots')->insert([
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'doctor_day_schedule_id' => $actualId,
                        'time_slot' => $slot,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Activate schedule on pivot using actual schema fields
        DB::table('doctor_clinic')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->update([
                'is_working_hours_activated' => true,
                'working_hours_activated_at' => now(),
            ]);
    }

    /**
     * 1. Cross-clinic booking conflict returns HTTP 422 with stable error identifier 'doctor_exclusive_clinic_conflict'.
     */
    public function test_cross_clinic_booking_conflict_returns_422_with_stable_error(): void
    {
        $date = $this->testDate;
        $slot = '09:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);
        $this->setupSchedules($this->clinicB, $this->doctor, $dow, $slot);

        // 1. Book in Clinic A -> Should succeed
        $appt1 = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient One',
            'patient_phone' => '0550000001',
        ], $this->adminUser);

        $this->assertInstanceOf(Appointment::class, $appt1);
        $this->assertDatabaseHas('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
        ]);

        // 2. Book in Clinic B for same doctor & slot -> Must throw ValidationException with doctor_exclusive_clinic_conflict
        try {
            $this->bookingService->createAppointment([
                'clinic_id' => $this->clinicB->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $date,
                'time_slot' => $slot,
                'patient_name' => 'Patient Two',
                'patient_phone' => '0550000002',
            ], $this->adminUser);
            $this->fail('Expected ValidationException doctor_exclusive_clinic_conflict was not thrown.');
        } catch (ValidationException $e) {
            $this->assertTrue(
                collect($e->errors())->flatten()->contains('doctor_exclusive_clinic_conflict'),
                'Exception did not contain the stable error identifier doctor_exclusive_clinic_conflict'
            );
        }

        // Verify zero reservation created for Clinic B
        $this->assertDatabaseMissing('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicB->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
        ]);
    }

    /**
     * 2. Multiple bookings at the same clinic succeed up to slot capacity.
     */
    public function test_multiple_bookings_at_same_clinic_succeed_up_to_capacity(): void
    {
        $date = $this->testDate;
        $slot = '10:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);

        // Book 3 patients (capacity is 3)
        for ($i = 1; $i <= 3; $i++) {
            $appt = $this->bookingService->createAppointment([
                'clinic_id' => $this->clinicA->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $date,
                'time_slot' => $slot,
                'patient_name' => "Patient {$i}",
                'patient_phone' => "055000000{$i}",
            ], $this->adminUser);

            $this->assertInstanceOf(Appointment::class, $appt);
        }

        // Exactly one reservation row exists for Clinic A
        $this->assertEquals(1, DoctorTimeReservation::where('doctor_id', $this->doctor->id)
            ->where('appointment_date', $date)
            ->where('time_slot', $slot)
            ->count());

        // appointment_slots.booked_count is exactly 3
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'booked_count' => 3,
        ]);
    }

    /**
     * 3. Booking exceeding capacity is rejected without corrupting reservation or counter.
     */
    public function test_booking_exceeding_capacity_rejected_without_corruption(): void
    {
        $date = $this->testDate;
        $slot = '11:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);

        // Fill capacity (3)
        for ($i = 1; $i <= 3; $i++) {
            $this->bookingService->createAppointment([
                'clinic_id' => $this->clinicA->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $date,
                'time_slot' => $slot,
                'patient_name' => "Patient {$i}",
                'patient_phone' => "055000000{$i}",
            ], $this->adminUser);
        }

        // 4th booking exceeds capacity
        $this->expectException(ValidationException::class);
        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient 4',
            'patient_phone' => '0550000004',
        ], $this->adminUser);

        // Verify counter is still exactly 3
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'booked_count' => 3,
        ]);
    }

    /**
     * 4. Cancellation releases the reservation when the last occupying appointment is removed.
     */
    public function test_cancellation_releases_reservation_when_empty(): void
    {
        $date = $this->testDate;
        $slot = '12:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);

        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient One',
            'patient_phone' => '0550000001',
        ], $this->adminUser);

        $this->assertDatabaseHas('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
        ]);

        // Cancel the only appointment
        $this->bookingService->rejectOrCancelAppointment($appt, $this->adminUser, 'Cancelled for test');

        // Reservation must be completely released
        $this->assertDatabaseMissing('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
        ]);

        // booked_count must be 0
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'booked_count' => 0,
        ]);
    }

    /**
     * 5. Cancellation preserves the reservation when another occupying appointment remains.
     */
    public function test_cancellation_preserves_reservation_when_others_remain(): void
    {
        $date = $this->testDate;
        $slot = '13:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);

        $appt1 = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient One',
            'patient_phone' => '0550000001',
        ], $this->adminUser);

        $appt2 = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient Two',
            'patient_phone' => '0550000002',
        ], $this->adminUser);

        // Cancel appointment 1
        $this->bookingService->rejectOrCancelAppointment($appt1, $this->adminUser, 'Cancelled first');

        // Reservation must STILL exist for Clinic A because Appt 2 remains occupying
        $this->assertDatabaseHas('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
        ]);

        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'booked_count' => 1,
        ]);
    }

    /**
     * 6. Successful rescheduling transfers ownership and updates counters atomically.
     */
    public function test_successful_rescheduling_transfers_ownership_atomically(): void
    {
        $oldDate = $this->testDate;
        $oldSlot = '14:00';
        $newDate = $this->testDate;
        $newSlot = '15:00';
        $dow = (Carbon::parse($oldDate)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $oldSlot);
        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $newSlot);

        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
            'patient_name' => 'Patient One',
            'patient_phone' => '0550000001',
        ], $this->adminUser);

        // Reschedule to newSlot
        $rescheduled = $this->bookingService->rescheduleAppointment($appt, [
            'appointment_date' => $newDate,
            'time_slot' => $newSlot,
        ], $this->adminUser);

        $this->assertEquals($newDate, $rescheduled->appointment_date->format('Y-m-d'));
        $this->assertEquals($newSlot, $rescheduled->time_slot);

        // Old reservation released
        $this->assertDatabaseMissing('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
        ]);

        // New reservation created for Clinic A
        $this->assertDatabaseHas('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_date' => $newDate,
            'time_slot' => $newSlot,
        ]);

        // Old slot count = 0, new slot count = 1
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
            'booked_count' => 0,
        ]);
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $newDate,
            'time_slot' => $newSlot,
            'booked_count' => 1,
        ]);
    }

    /**
     * 7. Failed rescheduling preserves original appointment, reservation, and counters.
     */
    public function test_failed_rescheduling_preserves_original_state(): void
    {
        $oldDate = $this->testDate;
        $oldSlot = '14:00';
        $targetDate = $this->testDate;
        $targetSlot = '16:00';
        $dow = (Carbon::parse($oldDate)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $oldSlot);
        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $targetSlot);
        $this->setupSchedules($this->clinicB, $this->doctor, $dow, $targetSlot);

        // Book Appointment 1 at Clinic A at 14:00
        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
            'patient_name' => 'Patient One',
            'patient_phone' => '0550000001',
        ], $this->adminUser);

        // Pre-claim target slot 16:00 at Clinic B for the same doctor
        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $targetDate,
            'time_slot' => $targetSlot,
            'patient_name' => 'Patient Other',
            'patient_phone' => '0550000099',
        ], $this->adminUser);

        // Attempt to reschedule Appt from Clinic A to 16:00 (which is owned by Clinic B)
        try {
            $this->bookingService->rescheduleAppointment($appt, [
                'appointment_date' => $targetDate,
                'time_slot' => $targetSlot,
            ], $this->adminUser);
            $this->fail('Expected reschedule conflict was not thrown.');
        } catch (ValidationException $e) {
            $this->assertTrue(
                collect($e->errors())->flatten()->contains('doctor_exclusive_clinic_conflict')
            );
        }

        // Original appointment at 14:00 must remain unchanged
        $freshAppt = $appt->fresh();
        $this->assertEquals($oldDate, $freshAppt->appointment_date->format('Y-m-d'));
        $this->assertEquals($oldSlot, $freshAppt->time_slot);

        // Old reservation at Clinic A remains
        $this->assertDatabaseHas('doctor_time_reservations', [
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinicA->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
        ]);

        // Old slot booked_count remains 1
        $this->assertDatabaseHas('appointment_slots', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $oldDate,
            'time_slot' => $oldSlot,
            'booked_count' => 1,
        ]);
    }

    /**
     * 8. Cancellation aborts safely and cleanly when appointment coordinates change concurrently.
     */
    public function test_cancellation_aborts_safely_when_coordinates_change_concurrently(): void
    {
        $date = $this->testDate;
        $slot = '14:00';
        $dow = (Carbon::parse($date)->dayOfWeek + 1) % 7;

        $this->setupSchedules($this->clinicA, $this->doctor, $dow, $slot);

        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $date,
            'time_slot' => $slot,
            'patient_name' => 'Patient Stale',
            'patient_phone' => '0550000088',
        ], $this->adminUser);

        // Simulate concurrent coordinate shift:
        // A stale in-memory model holding old slot '14:00', while the database row is concurrently updated to '15:00'
        $staleModel = clone $appt;
        $staleModel->time_slot = '14:00';

        // Mutate actual DB row directly to simulate concurrent commit
        Appointment::where('id', $appt->id)->update(['time_slot' => '15:00']);

        // Attempting to cancel using staleModel must abort with ValidationException rather than acquiring out-of-order locks
        try {
            $this->bookingService->rejectOrCancelAppointment($staleModel, $this->adminUser, 'Cancelled with stale coords');
            $this->fail('Expected ValidationException was not thrown on shifted coordinates.');
        } catch (ValidationException $e) {
            $this->assertTrue(
                collect($e->errors())->flatten()->contains('تغيرت بيانات وفترة الموعد بالتزامن قبل إتمام عملية الإلغاء أو الرفض.'),
                'ValidationException did not contain the expected coordinate shift message.'
            );
        }

        // Verify database state: appointment was NOT cancelled, status remains confirmed/pending
        $fresh = $appt->fresh();
        $this->assertNotEquals('cancelled', $fresh->status);
        $this->assertEquals('15:00', $fresh->time_slot);
    }
}
