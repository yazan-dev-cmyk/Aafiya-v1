<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\BookingCenter;
use App\Models\BookingTransaction;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentRescheduleTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected User $assistantUser;
    protected Clinic $clinic;
    protected Patient $patient;
    protected User $patientUser;
    protected BookingCenter $bookingCenter;
    protected User $bookingCenterUser;
    protected BookingService $bookingService;

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

        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // 1. Doctor & Clinic
        $this->doctorUser = User::factory()->create(['email' => 'doctor.reschedule@aafiya.dz', 'name' => 'د. سمير بن علي']);
        $this->doctorUser->roles()->attach($doctorRole->id);

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأعصاب',
            'license_number' => 'DOC-RESCHEDULE-001',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة ابن سينا',
            'address' => 'شارع ديدوش مراد، الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021998877',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 2,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Assistant
        $this->assistantUser = User::factory()->create(['email' => 'assistant.reschedule@aafiya.dz', 'name' => 'مساعد العيادة']);
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistantUser->clinicAssistant()->create([
            'clinic_id' => $this->clinic->id,
            'is_active' => true,
        ]);

        // 3. Patient
        $this->patientUser = User::factory()->create(['email' => 'patient.reschedule@aafiya.dz', 'name' => 'ريان شرقي']);
        $this->patientUser->roles()->attach($patientRole->id);

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'first_name' => 'ريان',
            'last_name' => 'شرقي',
            'gender' => 'male',
            'date_of_birth' => '1990-05-15',
            'phone' => '+213555123456',
            'wilaya' => 'الجزائر',
            'mrn' => 'MRN-2026-9901',
        ]);

        // 4. Booking Center
        $this->bookingCenterUser = User::factory()->create(['email' => 'bc.reschedule@aafiya.dz', 'name' => 'مركز الشفاء للحجز']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);

        $this->bookingCenter = BookingCenter::create([
            'name' => 'مركز الشفاء للحجز المعتمد',
            'user_id' => $this->bookingCenterUser->id,
            'license_number' => 'BC-LIC-2026-001',
            'phone' => '021665544',
            'address' => 'الجزائر الوسطى',
            'wilaya' => 'الجزائر',
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
            'quota_balance' => 5,
        ]);
    }

    /**
     * Helper to create a standard confirmed appointment via Booking Center.
     */
    protected function createConfirmedAppointment(string $date, string $slot = '08:00'): Appointment
    {
        $app = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'ريان شرقي',
            'patient_phone' => '+213555123456',
            'patient_mrn' => 'MRN-2026-9901',
            'booking_center_id' => $this->bookingCenter->id,
            'creator_type' => 'booking_center',
            'appointment_date' => $date,
            'time_slot' => $slot,
            'notes' => 'حجز تجريبي أولي',
        ], $this->bookingCenterUser);

        return $this->bookingService->confirmAppointment($app, $this->doctorUser);
    }

    /**
     * Test 1: Model A preserves the exact same appointment ID.
     */
    public function test_reschedule_preserves_same_appointment_id(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $originalId = $app->id;

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '09:00',
            'notes' => 'تعديل توقيت الموعد بناءً على طلب المريض',
        ]);

        $response->assertStatus(200);
        $this->assertEquals($originalId, $response->json('data.id'));

        $fresh = $app->fresh();
        $this->assertEquals($originalId, $fresh->id);
    }

    /**
     * Test 2: Model A preserves the exact same booking reference.
     */
    public function test_reschedule_preserves_same_booking_reference(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $originalRef = $app->booking_reference;

        $response = $this->actingAs($this->assistantUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(200);
        $this->assertEquals($originalRef, $response->json('data.booking_reference'));

        $fresh = $app->fresh();
        $this->assertEquals($originalRef, $fresh->booking_reference);
    }

    /**
     * Test 3: Model A preserves the exact same secure token.
     */
    public function test_reschedule_preserves_same_secure_token(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(3)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $originalToken = $app->secure_token;

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '11:00',
        ]);

        $response->assertStatus(200);
        $this->assertEquals($originalToken, $response->json('data.secure_token'));

        $fresh = $app->fresh();
        $this->assertEquals($originalToken, $fresh->secure_token);
    }

    /**
     * Test 4: Model A updates appointment_date and time_slot in-place.
     */
    public function test_reschedule_updates_date_and_time_slot(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(4)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '14:00',
            'notes' => 'الموعد الجديد بعد الظهر',
        ]);

        $response->assertStatus(200);
        $fresh = $app->fresh();
        $this->assertEquals($dateNew, $fresh->appointment_date->format('Y-m-d'));
        $this->assertEquals('14:00', $fresh->time_slot);
        $this->assertEquals('الموعد الجديد بعد الظهر', $fresh->notes);
    }

    /**
     * Test 5: Status Preservation — confirmed remains confirmed.
     */
    public function test_reschedule_preserves_confirmed_status(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(1)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $this->assertEquals('confirmed', $app->status);

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '09:00',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('confirmed', $response->json('data.status'));

        $fresh = $app->fresh();
        $this->assertEquals('confirmed', $fresh->status);
        $this->assertNotEquals('rescheduled', $fresh->status);
        $this->assertNotEquals('pending', $fresh->status);
    }

    /**
     * Test 6: Status Preservation — pending remains pending.
     */
    public function test_reschedule_preserves_pending_status(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

        // Unconfirmed booking (status = pending)
        $app = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'ريان شرقي',
            'patient_phone' => '+213555123456',
            'creator_type' => 'booking_center',
            'booking_center_id' => $this->bookingCenter->id,
            'appointment_date' => $dateOld,
            'time_slot' => '08:00',
        ], $this->bookingCenterUser);

        $this->assertEquals('pending', $app->status);

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('pending', $response->json('data.status'));

        $fresh = $app->fresh();
        $this->assertEquals('pending', $fresh->status);
    }

    /**
     * Test 7: No new Appointment record is created in database.
     */
    public function test_reschedule_does_not_create_new_appointment_row(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');

        $initialCount = Appointment::count();

        $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '11:00',
        ])->assertStatus(200);

        $this->assertEquals($initialCount, Appointment::count());
    }

    /**
     * Test 8: No second quota deduction and no second ledger confirmation transaction.
     */
    public function test_reschedule_does_not_deduct_second_quota_or_create_second_transaction(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

        // Initial balance is 5; upon confirmation it becomes 4
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $this->bookingCenter->refresh();
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        $initialTransactionsCount = BookingTransaction::where('appointment_id', $app->id)->count();
        $this->assertEquals(1, $initialTransactionsCount);

        // Perform Reschedule
        $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '09:00',
        ])->assertStatus(200);

        // Quota balance must remain exactly 4 (NO additional deduction)
        $this->bookingCenter->refresh();
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        // Ledger transactions for this appointment must remain 1
        $this->assertEquals(1, BookingTransaction::where('appointment_id', $app->id)->count());
    }

    /**
     * Test 9: Detailed audit history is recorded in appointment_status_history.
     */
    public function test_reschedule_records_detailed_audit_history(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');

        $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '10:00',
            'notes' => 'تعديل بسبب ظرف طارئ',
        ])->assertStatus(200);

        $history = AppointmentStatusHistory::where('appointment_id', $app->id)
            ->latest('created_at')
            ->first();

        $this->assertNotNull($history);
        $this->assertEquals('confirmed', $history->from_status);
        $this->assertEquals('confirmed', $history->to_status);
        $this->assertEquals($this->doctorUser->id, $history->changed_by_id);
        $this->assertStringContainsString($dateOld, $history->reason);
        $this->assertStringContainsString('08:00', $history->reason);
        $this->assertStringContainsString($dateNew, $history->reason);
        $this->assertStringContainsString('10:00', $history->reason);
        $this->assertStringContainsString('تعديل بسبب ظرف طارئ', $history->reason);
    }

    /**
     * Test 10: QR Token remains valid for verification and check-in after reschedule.
     */
    public function test_reschedule_qr_verification_and_checkin_use_same_token(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
        $app = $this->createConfirmedAppointment($dateOld, '08:00');
        $token = $app->secure_token;

        // Reschedule to new date
        $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '12:00',
        ])->assertStatus(200);

        // Check-in via the original secure_token
        $checkInResponse = $this->actingAs($this->assistantUser)->postJson('/api/v1/appointments/check-in', [
            'token' => $token,
        ]);

        $checkInResponse->assertStatus(200);
        $this->assertEquals('attended', $checkInResponse->json('data.status'));
        $this->assertEquals($dateNew, $checkInResponse->json('data.appointment_date'));

        $fresh = $app->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->assistantUser->id, $fresh->checked_in_by_id);
    }

    /**
     * Test 11: Rejection of forbidden terminal or inactive statuses.
     */
    public function test_reschedule_rejects_forbidden_terminal_statuses(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

        $forbiddenStatuses = ['attended', 'cancelled', 'rejected', 'expired'];

        foreach ($forbiddenStatuses as $idx => $status) {
            $testDate = Carbon::tomorrow()->addDays($idx + 1)->format('Y-m-d');
            $app = $this->createConfirmedAppointment($testDate, '08:00');
            $app->update(['status' => $status]);

            $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
                'appointment_date' => $dateNew,
                'time_slot' => '09:00',
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['status']);

            // Ensure unchanged
            $fresh = $app->fresh();
            $this->assertEquals($testDate, $fresh->appointment_date->format('Y-m-d'));
            $this->assertEquals('08:00', $fresh->time_slot);
            $this->assertEquals($status, $fresh->status);
        }
    }

    /**
     * Test 12: Slot Capacity Collision Prevention and Atomic Rollback.
     */
    public function test_reschedule_rejects_when_target_slot_capacity_exceeded(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $targetDate = Carbon::tomorrow()->addDays(3)->format('Y-m-d');
        $targetSlot = '15:00';

        // Fill target slot to capacity (clinic max_patients_per_slot = 2)
        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 1',
            'patient_phone' => '+213555000001',
            'appointment_date' => $targetDate,
            'time_slot' => $targetSlot,
        ], $this->doctorUser);

        $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 2',
            'patient_phone' => '+213555000002',
            'appointment_date' => $targetDate,
            'time_slot' => $targetSlot,
        ], $this->doctorUser);

        // Appointment to be rescheduled
        $app = $this->createConfirmedAppointment($dateOld, '08:00');

        // Attempt to reschedule into the full slot
        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $targetDate,
            'time_slot' => $targetSlot,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['capacity']);

        // Verify appointment remained in original slot
        $fresh = $app->fresh();
        $this->assertEquals($dateOld, $fresh->appointment_date->format('Y-m-d'));
        $this->assertEquals('08:00', $fresh->time_slot);
    }

    /**
     * Test 13 (Bonus): Rejection of no-op reschedule to identical slot.
     */
    public function test_reschedule_rejects_no_op_same_date_and_slot(): void
    {
        $date = Carbon::tomorrow()->format('Y-m-d');
        $app = $this->createConfirmedAppointment($date, '08:00');

        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$app->id}/reschedule", [
            'appointment_date' => $date,
            'time_slot' => '08:00',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['time_slot']);
    }

    /**
     * Test 14 (Bonus): Preserves Guest Patient information and Booking Center ownership.
     */
    public function test_reschedule_preserves_guest_patient_information_and_creator(): void
    {
        $dateOld = Carbon::tomorrow()->format('Y-m-d');
        $dateNew = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

        $guestApp = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض زائر تجريبي',
            'patient_phone' => '+213777889900',
            'patient_mrn' => 'GUEST-MRN-001',
            'booking_center_id' => $this->bookingCenter->id,
            'creator_type' => 'booking_center',
            'appointment_date' => $dateOld,
            'time_slot' => '08:00',
            'notes' => 'حجز زائر بدون حساب',
        ], $this->bookingCenterUser);

        $this->assertNull($guestApp->patient_id);
        $this->assertEquals($this->bookingCenterUser->id, $guestApp->created_by_id);
        $this->assertEquals($this->bookingCenter->id, $guestApp->booking_center_id);

        // Reschedule by Doctor
        $response = $this->actingAs($this->doctorUser)->postJson("/api/v1/appointments/{$guestApp->id}/reschedule", [
            'appointment_date' => $dateNew,
            'time_slot' => '10:00',
        ]);

        $response->assertStatus(200);

        $fresh = $guestApp->fresh();
        $this->assertNull($fresh->patient_id);
        $this->assertEquals('مريض زائر تجريبي', $fresh->patient_name);
        $this->assertEquals('+213777889900', $fresh->patient_phone);
        $this->assertEquals('GUEST-MRN-001', $fresh->patient_mrn);
        $this->assertEquals($this->bookingCenterUser->id, $fresh->created_by_id);
        $this->assertEquals($this->bookingCenter->id, $fresh->booking_center_id);
        $this->assertEquals('booking_center', $fresh->creator_type);
        $this->assertEquals($dateNew, $fresh->appointment_date->format('Y-m-d'));
        $this->assertEquals('10:00', $fresh->time_slot);
    }
}
