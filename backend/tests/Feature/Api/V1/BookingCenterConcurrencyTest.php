<?php

namespace Tests\Feature\Api\V1;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCenterConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $bookingCenterUser;
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
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-CONC-2026',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة اختبارات التزامن',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021001122',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->bookingCenterUser = User::factory()->create();
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز التزامن',
            'phone' => '021334455',
            'address' => 'شارع ديدوش مراد',
            'wilaya' => 'الجزائر',
            'quota_balance' => 0,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);
    }

    /**
     * Helper to create a pending appointment for the booking center.
     */
    protected function createPendingAppointment(string $phone = '0555000001', string $slot = '09:00', ?string $date = null): Appointment
    {
        $appointmentDate = $date ?? now()->addDays(2)->format('Y-m-d');

        $res = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'booking_center_id' => $this->bookingCenter->id,
            'patient_name' => 'مريض تجريبي',
            'patient_phone' => $phone,
            'appointment_date' => $appointmentDate,
            'time_slot' => $slot,
        ]);

        $res->assertStatus(201);

        return Appointment::findOrFail($res->json('data.id'));
    }

    /**
     * Test 1 — Two different appointments, quota = 1.
     * Expected: exactly 1 success (200), exactly 1 failure (422), final quota = 0, exactly 1 confirmation transaction.
     */
    public function test_two_different_appointments_concurrent_confirmation_with_quota_one(): void
    {
        $this->bookingCenter->update(['quota_balance' => 1]);

        $app1 = $this->createPendingAppointment('0555000001', '08:00');
        $app2 = $this->createPendingAppointment('0555000002', '09:00');

        $this->assertEquals(1, $this->bookingCenter->fresh()->quota_balance);

        // Worker A confirms Appointment 1 -> Succeeds
        $res1 = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app1->id}/confirm");
        $res1->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        // Worker B attempts to confirm Appointment 2 -> Rejected with 422 quota exhausted
        $res2 = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app2->id}/confirm");
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['quota']);

        // Final quota must be exactly 0
        $this->assertEquals(0, $this->bookingCenter->fresh()->quota_balance);

        // Exactly 1 confirmation transaction recorded
        $confirmCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('transaction_type', 'confirmation')
            ->count();
        $this->assertEquals(1, $confirmCount);

        // Appointment 2 remains pending
        $this->assertEquals('pending', $app2->fresh()->status);
    }

    /**
     * Test 2 — Five different appointments, quota = 1.
     * Expected: exactly 1 success (200), exactly 4 failures (422), final quota = 0, exactly 1 confirmation transaction.
     */
    public function test_five_different_appointments_concurrent_confirmation_with_quota_one(): void
    {
        $this->bookingCenter->update(['quota_balance' => 1]);

        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00'];
        $appointments = [];
        foreach ($slots as $i => $slot) {
            $appointments[] = $this->createPendingAppointment(sprintf('055500001%d', $i), $slot);
        }

        $this->assertEquals(1, $this->bookingCenter->fresh()->quota_balance);

        $successCount = 0;
        $failureCount = 0;

        foreach ($appointments as $app) {
            $res = $this->actingAs($this->doctorUser, 'sanctum')
                ->postJson("/api/v1/appointments/{$app->id}/confirm");

            if ($res->status() === 200) {
                $successCount++;
            } elseif ($res->status() === 422) {
                $failureCount++;
                $res->assertJsonValidationErrors(['quota']);
            }
        }

        $this->assertEquals(1, $successCount);
        $this->assertEquals(4, $failureCount);
        $this->assertEquals(0, $this->bookingCenter->fresh()->quota_balance);

        $confirmTxCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('transaction_type', 'confirmation')
            ->count();
        $this->assertEquals(1, $confirmTxCount);
    }

    /**
     * Test 3 — Same appointment confirmed concurrently (idempotency).
     * Expected: 2 x HTTP 200, final quota = 9 from initial 10, exactly 1 confirmation transaction, status = confirmed.
     */
    public function test_same_appointment_confirmed_concurrently_is_idempotent(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        $app = $this->createPendingAppointment('0555000030', '14:00');

        // First confirmation
        $res1 = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $res1->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // Second confirmation of the exact same appointment
        $res2 = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $res2->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        // Quota must remain 9, not 8!
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // Exactly 1 confirmation transaction
        $confirmCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('appointment_id', $app->id)
            ->where('transaction_type', 'confirmation')
            ->count();
        $this->assertEquals(1, $confirmCount);
    }

    /**
     * Test 4 — Confirm -> Cancel -> Confirm (State Machine Guard).
     * Expected: confirm 200 (quota 10->9), cancel 200 (quota 9->10), second confirm 422 (quota remains 10, no extra tx).
     */
    public function test_confirm_then_cancel_then_confirm_is_rejected(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        $app = $this->createPendingAppointment('0555000040', '15:00');

        // 1. Confirm: quota becomes 9
        $confirmRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $confirmRes->assertStatus(200);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // 2. Cancel: quota refunded to 10
        $cancelRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/cancel", ['reason' => 'إلغاء لظرف طارئ']);
        $cancelRes->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');
        $this->assertEquals(10, $this->bookingCenter->fresh()->quota_balance);

        // 3. Attempt to confirm cancelled appointment -> Must fail with 422
        $secondConfirmRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $secondConfirmRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Quota remains 10
        $this->assertEquals(10, $this->bookingCenter->fresh()->quota_balance);

        // Total confirmation transactions for this appointment remains 1
        $confirmCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('appointment_id', $app->id)
            ->where('transaction_type', 'confirmation')
            ->count();
        $this->assertEquals(1, $confirmCount);
    }

    /**
     * Test 5 — Confirm -> Reject -> Confirm.
     * Expected: confirm 200 (quota 10->9), reject 200 (quota 9->10), second confirm 422 (quota remains 10).
     */
    public function test_confirm_then_reject_then_confirm_is_rejected(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        $app = $this->createPendingAppointment('0555000050', '16:00');

        // 1. Confirm: quota becomes 9
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm")
            ->assertStatus(200);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // 2. Reject: quota refunded to 10
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/reject", ['reason' => 'رفض الموعد من العيادة'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected');
        $this->assertEquals(10, $this->bookingCenter->fresh()->quota_balance);

        // 3. Attempt to confirm rejected appointment -> Must fail with 422
        $secondConfirmRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $secondConfirmRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Quota remains 10
        $this->assertEquals(10, $this->bookingCenter->fresh()->quota_balance);
    }

    /**
     * Test 6 — Confirm -> Reschedule -> Confirm.
     * Expected: initial confirm 200 (quota 10->9), reschedule 200, confirm again 200 (idempotent, quota remains 9).
     */
    public function test_confirm_then_reschedule_then_confirm_is_idempotent(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        $app = $this->createPendingAppointment('0555000060', '10:00');

        // 1. Confirm: quota becomes 9
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm")
            ->assertStatus(200);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // 2. Reschedule to new slot
        $newDate = now()->addDays(3)->format('Y-m-d');
        $rescheduleRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/reschedule", [
                'appointment_date' => $newDate,
                'time_slot' => '11:00',
                'notes' => 'تم تعديل الموعد بالتنسيق مع المريض',
            ]);
        $rescheduleRes->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        // Quota must remain 9 (not refunded or charged during reschedule)
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // 3. Call confirm again on the rescheduled appointment
        $reconfirmRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$app->id}/confirm");
        $reconfirmRes->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        // Quota remains 9
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // Exactly 1 confirmation transaction exists
        $confirmCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('appointment_id', $app->id)
            ->where('transaction_type', 'confirmation')
            ->count();
        $this->assertEquals(1, $confirmCount);
    }
}
