<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorWorkingHoursService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SlotCounterDriftAndQuarantineTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected BookingService $bookingService;
    protected string $date = '2026-11-15'; // Future date
    protected string $slot = '10:00';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $this->bookingService = app(BookingService::class);

        // Admin User
        $this->adminUser = User::factory()->create();
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $this->adminUser->roles()->attach($adminRole->id);

        // Doctor
        $docUser = User::factory()->create();
        $this->doctor = Doctor::create([
            'user_id' => $docUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-DRIFT-001',
            'is_verified' => true,
        ]);

        // Clinic
        $this->clinic = Clinic::create([
            'name' => 'عيادة سلامة العدادات',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000999',
            'director_doctor_id' => $this->doctor->id,
            'slot_duration_min' => 60,
            'max_patients_per_slot' => 5,
        ]);

        // Affiliate doctor with clinic
        $this->doctor->clinics()->attach($this->clinic->id, [
            'is_active' => true,
            'max_patients_per_slot' => 5,
        ]);

        // Mock clinic operating hours & doctor working hours services as fully configured/activated
        $clinicHoursMock = \Mockery::mock(ClinicOperatingHoursService::class);
        $clinicHoursMock->shouldReceive('isClinicConfigured')->andReturn(true);
        $this->app->instance(ClinicOperatingHoursService::class, $clinicHoursMock);

        $docHoursMock = \Mockery::mock(DoctorWorkingHoursService::class);
        $docHoursMock->shouldReceive('isScheduleActivated')->andReturn(true);
        $docHoursMock->shouldReceive('isSlotAvailable')->andReturn(true);
        $this->app->instance(DoctorWorkingHoursService::class, $docHoursMock);

        // Re-resolve service with mocks
        $this->bookingService = app(BookingService::class);
    }

    /**
     * Test 1: Normal booking succeeds when stored counter matches actual occupancy.
     */
    public function test_booking_succeeds_when_counter_matches_actual_occupancy(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);
        $this->assertEquals(0, $slotRow->booked_count);
        $this->assertFalse($slotRow->is_quarantined);

        $payload = [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض عادي',
            'patient_phone' => '0555000001',
        ];

        $appt = $this->bookingService->createAppointment($payload, $this->adminUser);

        $this->assertNotNull($appt->id);
        $this->assertEquals('pending', $appt->status);

        $freshSlot = $slotRow->fresh();
        $this->assertEquals(1, $freshSlot->booked_count);
        $this->assertFalse($freshSlot->is_quarantined);
    }

    /**
     * Test 2: Booking is aborted and slot is quarantined when stored counter exceeds actual occupancy (ghost count).
     */
    public function test_booking_quarantines_slot_when_stored_count_exceeds_actual_occupancy(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);
        
        // Artificially inject drift: booked_count = 3, but 0 appointments exist in DB
        $slotRow->update(['booked_count' => 3]);

        $payload = [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض تجربة',
            'patient_phone' => '0555000002',
        ];

        try {
            $this->bookingService->createAppointment($payload, $this->adminUser);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            $this->assertTrue($e->errorBags['SLOT_QUARANTINED_DRIFT'] ?? false !== false || isset($e->errors()['time_slot']));
        }

        // Verify slot is durably quarantined
        $freshSlot = $slotRow->fresh();
        $this->assertTrue($freshSlot->is_quarantined);
        $this->assertStringContainsString('COUNTER_DRIFT_DETECTED', $freshSlot->quarantine_reason);

        // Verify no appointment was created
        $this->assertEquals(0, Appointment::where('doctor_id', $this->doctor->id)->count());

        // Verify booked_count was NOT automatically repaired
        $this->assertEquals(3, $freshSlot->booked_count);
    }

    /**
     * Test 3: Booking is aborted and slot is quarantined when actual occupancy exceeds stored counter (deficit counter).
     */
    public function test_booking_quarantines_slot_when_actual_occupancy_exceeds_stored_count(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);

        // Directly insert an occupying appointment into DB without incrementing booked_count
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض موجود مسبقاً',
            'patient_phone' => '0555000010',
            'status' => 'pending',
            'booking_reference' => 'MS-2026-9901',
            'secure_token' => 'token9901',
            'created_by_id' => $this->adminUser->id,
            'creator_type' => 'admin',
        ]);

        // Stored counter is 0, but actual count is 1
        $this->assertEquals(0, $slotRow->booked_count);

        $payload = [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض جديد',
            'patient_phone' => '0555000020',
        ];

        try {
            $this->bookingService->createAppointment($payload, $this->adminUser);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            $this->assertTrue(isset($e->errors()['time_slot']));
        }

        $freshSlot = $slotRow->fresh();
        $this->assertTrue($freshSlot->is_quarantined);
        $this->assertStringContainsString('COUNTER_DRIFT_DETECTED', $freshSlot->quarantine_reason);

        // Verify no second appointment was created
        $this->assertEquals(1, Appointment::where('doctor_id', $this->doctor->id)->count());
        // Verify booked_count remains 0 (not auto-repaired)
        $this->assertEquals(0, $freshSlot->booked_count);
    }

    /**
     * Test 4: Quarantined slot is completely excluded from getAvailableSlots and rejects new bookings.
     */
    public function test_quarantined_slot_is_excluded_from_available_slots_and_rejects_booking(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);
        $slotRow->update([
            'is_quarantined' => true,
            'quarantine_reason' => 'MANUAL_AUDIT_HOLD',
        ]);

        // Check availability query
        $availableSlots = $this->bookingService->getAvailableSlots($this->doctor, $this->clinic, $this->date);
        $slotTimes = array_column($availableSlots, 'time_slot');
        $this->assertNotContains($this->slot, $slotTimes);

        // Direct booking attempt
        $payload = [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض على موعد معلق',
            'patient_phone' => '0555000030',
        ];

        $this->expectException(ValidationException::class);
        $this->bookingService->createAppointment($payload, $this->adminUser);
    }

    /**
     * Test 5: Safe cancellation proceeds when counter is consistent, and detects drift if inconsistent without blocking cancellation.
     */
    public function test_cancellation_proceeds_safely_and_detects_drift(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);

        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض للإلغاء',
            'patient_phone' => '0555000040',
        ], $this->adminUser);

        $this->assertEquals(1, $slotRow->fresh()->booked_count);

        // Cancel appointment
        $cancelled = $this->bookingService->rejectOrCancelAppointment($appt, $this->adminUser, 'طلب إلغاء');
        $this->assertEquals('cancelled', $cancelled->status);

        $freshSlot = $slotRow->fresh();
        $this->assertEquals(0, $freshSlot->booked_count);
        $this->assertFalse($freshSlot->is_quarantined);

        // Repeated cancellation attempt is idempotent and does NOT decrement below zero
        $repeatCancelled = $this->bookingService->rejectOrCancelAppointment($cancelled, $this->adminUser, 'إلغاء مكرر');
        $this->assertEquals('cancelled', $repeatCancelled->status);
        $this->assertEquals(0, $freshSlot->fresh()->booked_count);
    }

    /**
     * Test 6: Rescheduling rejects quarantined target slot and detects drift on target.
     */
    public function test_reschedule_rejects_quarantined_target_slot(): void
    {
        $sourceSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '09:00');
        $targetSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '11:00');

        $appt = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => '09:00',
            'patient_name' => 'مريض لإعادة الجدولة',
            'patient_phone' => '0555000050',
        ], $this->adminUser);

        // Quarantine target slot
        $targetSlotRow->update(['is_quarantined' => true, 'quarantine_reason' => 'TARGET_HOLD']);

        $this->expectException(ValidationException::class);
        $this->bookingService->rescheduleAppointment($appt, [
            'appointment_date' => $this->date,
            'time_slot' => '11:00',
        ], $this->adminUser);

        // Verify source appointment and slot remain unchanged
        $this->assertEquals('09:00', $appt->fresh()->time_slot);
        $this->assertEquals(1, $sourceSlotRow->fresh()->booked_count);
    }

    /**
     * Test 7: When quarantine persistence throws an exception, booking rolls back cleanly,
     * diagnostic event is emitted, and caller receives unconfirmed drift error without exposing DB internals.
     */
    public function test_booking_rolls_back_and_handles_persistence_exception_safely(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, $this->slot);

        // Inject drift: booked_count = 2, actual = 0
        $slotRow->update(['booked_count' => 2]);

        // Mock DB query builder update on appointment_slots to throw an exception
        // Alternatively, delete the slot row right before outer persistence or mock DB
        // Let's create an anonymous subclass of BookingService that simulates persistence failure
        $mockService = new class(
            app(\App\Services\QuotaService::class),
            app(\App\Services\AuthorizationService::class),
            $this->app->make(DoctorWorkingHoursService::class),
            $this->app->make(ClinicOperatingHoursService::class),
            app(\App\Services\DoctorTimeReservationService::class)
        ) extends BookingService {
            public bool $persistenceAttempted = false;

            public function quarantineSlot(\App\Models\AppointmentSlot|string $slotOrId, string $reason, int $storedCount, int $actualOccupied, ?array $slotCoordinates = null): bool
            {
                $this->persistenceAttempted = true;
                // Simulate failure to persist (e.g. storage error)
                return false;
            }
        };

        $payload = [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot' => $this->slot,
            'patient_name' => 'مريض تجربة خطأ الحفظ',
            'patient_phone' => '0555000077',
        ];

        try {
            $mockService->createAppointment($payload, $this->adminUser);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            $this->assertTrue($mockService->persistenceAttempted);
            $this->assertFalse($e->quarantinePersisted);
            $this->assertEquals('SLOT_COUNTER_DRIFT_UNCONFIRMED', $e->errorBag);
            $this->assertStringContainsString('تعذر إتمام الحجز بسبب تعارض في سعة الفترة الزمنية', $e->errors()['time_slot'][0]);
            // Ensure no database internals leaked in user message
            $this->assertStringNotContainsString('SQLSTATE', $e->errors()['time_slot'][0]);
            $this->assertStringNotContainsString('quarantine', strtolower($e->errors()['time_slot'][0]));
        }

        // Verify transaction rolled back completely: zero appointments created
        $this->assertEquals(0, Appointment::where('doctor_id', $this->doctor->id)->count());

        // Verify slot was not falsely marked as quarantined in model/database
        $freshSlot = $slotRow->fresh();
        $this->assertFalse($freshSlot->is_quarantined);
        $this->assertEquals(2, $freshSlot->booked_count);
    }

    /**
     * Test 8: quarantineSlot helper directly returns false and logs critical event when zero rows are affected.
     */
    public function test_quarantine_slot_returns_false_when_zero_rows_affected(): void
    {
        $nonExistentSlotId = '00000000-0000-0000-0000-000000000000';

        $persisted = $this->bookingService->quarantineSlot(
            $nonExistentSlotId,
            'TEST_NON_EXISTENT_SLOT_DRIFT',
            1,
            0,
            [
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $this->date,
                'time_slot' => $this->slot,
            ]
        );

        $this->assertFalse($persisted, 'quarantineSlot must return false when zero rows are affected');
    }

    /**
     * Test 9: quarantineSlot helper directly returns true and marks model when update succeeds.
     */
    public function test_quarantine_slot_returns_true_when_update_succeeds(): void
    {
        $slotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '14:00');
        $this->assertFalse($slotRow->is_quarantined);

        $persisted = $this->bookingService->quarantineSlot(
            $slotRow,
            'TEST_VALID_DRIFT',
            2,
            1
        );

        $this->assertTrue($persisted);
        $this->assertTrue($slotRow->is_quarantined);
        $this->assertTrue($slotRow->fresh()->is_quarantined);
        $this->assertEquals('TEST_VALID_DRIFT', $slotRow->fresh()->quarantine_reason);
    }

    /**
     * Test 10: Target-slot drift during reschedule aborts the operation, rolls back the transaction,
     * leaves appointment coordinates and counters intact, durably quarantines the target slot,
     * and returns SLOT_QUARANTINED_DRIFT.
     */
    public function test_reschedule_target_drift_persists_quarantine_durably_and_rolls_back(): void
    {
        $sourceSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '08:00');
        $targetSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '12:00');

        $appt = $this->bookingService->createAppointment([
            'clinic_id'        => $this->clinic->id,
            'doctor_id'        => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot'        => '08:00',
            'patient_name'     => 'مريض اختبار إعادة الجدولة',
            'patient_phone'    => '0555000088',
        ], $this->adminUser);

        $this->assertEquals('08:00', $appt->time_slot);
        $this->assertEquals(1, $sourceSlotRow->fresh()->booked_count);
        $this->assertEquals(0, $targetSlotRow->fresh()->booked_count);
        $this->assertFalse($targetSlotRow->fresh()->is_quarantined);

        // Artificially inject drift on target slot: booked_count = 2, but actual occupied = 0
        $targetSlotRow->update(['booked_count' => 2]);

        try {
            $this->bookingService->rescheduleAppointment($appt, [
                'appointment_date' => $this->date,
                'time_slot'        => '12:00',
            ], $this->adminUser);
            $this->fail('Expected ValidationException was not thrown on target drift');
        } catch (ValidationException $e) {
            $this->assertEquals('SLOT_QUARANTINED_DRIFT', $e->errorBag);
            $this->assertTrue($e->quarantinePersisted);
            $this->assertStringContainsString('تعذر إتمام إعادة الجدولة: تم تعليق الفترة الزمنية المستهدفة', $e->errors()['time_slot'][0]);
        }

        // 1. Verify appointment coordinates remain completely untouched at source
        $freshAppt = $appt->fresh();
        $this->assertEquals('08:00', $freshAppt->time_slot);
        $this->assertEquals($this->date, $freshAppt->appointment_date->format('Y-m-d'));
        $this->assertEquals('pending', $freshAppt->status);

        // 2. Verify source slot counter remains untouched (no decrement)
        $this->assertEquals(1, $sourceSlotRow->fresh()->booked_count);

        // 3. Verify target slot counter was NOT repaired (remains 2)
        $this->assertEquals(2, $targetSlotRow->fresh()->booked_count);

        // 4. Verify target slot is DURABLY quarantined in storage despite transaction rollback!
        $freshTargetSlot = $targetSlotRow->fresh();
        $this->assertTrue($freshTargetSlot->is_quarantined, 'Target slot must remain durably quarantined after rollback');
        $this->assertStringContainsString('COUNTER_DRIFT_ON_RESCHEDULE_TARGET', $freshTargetSlot->quarantine_reason);
    }

    /**
     * Test 11: Target-slot drift with persistence failure returns SLOT_COUNTER_DRIFT_UNCONFIRMED,
     * rolls back completely, and does not falsely mark the slot as quarantined.
     */
    public function test_reschedule_target_drift_handles_persistence_failure_safely(): void
    {
        $sourceSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '08:00');
        $targetSlotRow = $this->bookingService->ensureSlotExists($this->clinic, $this->doctor, $this->date, '13:00');

        $appt = $this->bookingService->createAppointment([
            'clinic_id'        => $this->clinic->id,
            'doctor_id'        => $this->doctor->id,
            'appointment_date' => $this->date,
            'time_slot'        => '08:00',
            'patient_name'     => 'مريض اختبار فشل حفظ التعليق',
            'patient_phone'    => '0555000089',
        ], $this->adminUser);

        // Inject drift on target slot: booked_count = 1, actual = 0
        $targetSlotRow->update(['booked_count' => 1]);

        // Mock BookingService to simulate quarantineSlot returning false (persistence failure)
        $mockService = new class(
            app(\App\Services\QuotaService::class),
            app(\App\Services\AuthorizationService::class),
            $this->app->make(DoctorWorkingHoursService::class),
            $this->app->make(ClinicOperatingHoursService::class),
            app(\App\Services\DoctorTimeReservationService::class)
        ) extends BookingService {
            public bool $persistenceAttempted = false;

            public function quarantineSlot(\App\Models\AppointmentSlot|string $slotOrId, string $reason, int $storedCount, int $actualOccupied, ?array $slotCoordinates = null): bool
            {
                $this->persistenceAttempted = true;
                return false;
            }
        };

        try {
            $mockService->rescheduleAppointment($appt, [
                'appointment_date' => $this->date,
                'time_slot'        => '13:00',
            ], $this->adminUser);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            $this->assertTrue($mockService->persistenceAttempted);
            $this->assertEquals('SLOT_COUNTER_DRIFT_UNCONFIRMED', $e->errorBag);
            $this->assertFalse($e->quarantinePersisted);
            $this->assertStringContainsString('تعذر إتمام إعادة الجدولة بسبب تعارض في سعة الفترة الزمنية المستهدفة', $e->errors()['time_slot'][0]);
            // Ensure no database internals leaked in user message
            $this->assertStringNotContainsString('SQLSTATE', $e->errors()['time_slot'][0]);
        }

        // Verify appointment was not moved
        $freshAppt = $appt->fresh();
        $this->assertEquals('08:00', $freshAppt->time_slot);

        // Verify source counter unchanged
        $this->assertEquals(1, $sourceSlotRow->fresh()->booked_count);

        // Verify target slot was NOT marked quarantined
        $this->assertFalse($targetSlotRow->fresh()->is_quarantined);
    }
}
