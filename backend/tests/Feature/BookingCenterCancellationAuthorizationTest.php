<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BookingCenterCancellationAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected User $bcUserA;
    protected BookingCenter $centerA;

    protected User $bcUserB;
    protected BookingCenter $centerB;

    protected User $creatorUser;
    protected User $unrelatedUser;

    protected User $patientUserA;
    protected Patient $patientA;

    protected User $patientUserB;
    protected Patient $patientB;

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
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-AUTH-100',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الاختبارات المعتمدة',
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

        $this->setupWorkingHoursFixture();

        // 2. Booking Center A
        $this->bcUserA = User::factory()->create();
        $this->bcUserA->roles()->attach($bcRole->id);
        $this->centerA = BookingCenter::create([
            'user_id' => $this->bcUserA->id,
            'name' => 'مركز حجز الأمل (أ)',
            'phone' => '021334401',
            'address' => 'الجزائر الوسطى',
            'wilaya' => 'الجزائر',
            'quota_balance' => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // 3. Booking Center B (Different Center)
        $this->bcUserB = User::factory()->create();
        $this->bcUserB->roles()->attach($bcRole->id);
        $this->centerB = BookingCenter::create([
            'user_id' => $this->bcUserB->id,
            'name' => 'مركز حجز النور (ب)',
            'phone' => '021334402',
            'address' => 'باب الوادي',
            'wilaya' => 'الجزائر',
            'quota_balance' => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // 4. Staff / Creator User (Different user from bcUserA)
        $this->creatorUser = User::factory()->create();
        $this->unrelatedUser = User::factory()->create();

        // 5. Patients A and B
        $this->patientUserA = User::factory()->create();
        $this->patientUserA->roles()->attach($patientRole->id);
        $this->patientA = Patient::create([
            'user_id' => $this->patientUserA->id,
            'mrn' => 'MRN-2026-PATA',
            'first_name' => 'فاطمة',
            'last_name' => 'بن علي',
            'gender' => 'female',
            'date_of_birth' => '1995-04-12',
            'phone' => '0555000001',
            'national_id' => '199516010011',
        ]);

        $this->patientUserB = User::factory()->create();
        $this->patientUserB->roles()->attach($patientRole->id);
        $this->patientB = Patient::create([
            'user_id' => $this->patientUserB->id,
            'mrn' => 'MRN-2026-PATB',
            'first_name' => 'مراد',
            'last_name' => 'قادري',
            'gender' => 'male',
            'date_of_birth' => '1992-08-20',
            'phone' => '0555000002',
            'national_id' => '199216010022',
        ]);
    }

    protected function setupWorkingHoursFixture(): void
    {
        $clinicHoursService = app(\App\Services\ClinicOperatingHoursService::class);
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $days[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'periods' => [
                    ['period_index' => 0, 'open_time' => '08:00', 'close_time' => '17:00'],
                ],
            ];
        }
        $clinicHoursService->saveOperatingHours($this->clinic->id, $days, $this->doctorUser);

        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        $doctorScheduleDays = [];
        for ($d = 0; $d <= 6; $d++) {
            $doctorScheduleDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'slots' => $slots,
            ];
        }

        $doctorHoursService = app(\App\Services\DoctorWorkingHoursService::class);
        $doctorHoursService->saveDraft($this->clinic->id, $this->doctor->id, $doctorScheduleDays, $this->doctorUser);
        $doctorHoursService->activateSchedule($this->clinic->id, $this->doctor->id, $this->doctorUser);
    }

    /**
     * Helper to create a confirmed booking center appointment with authentic slot and transaction ledger.
     */
    protected function createConfirmedCenterAppointment(string $timeSlot = '10:00'): Appointment
    {
        $date = now()->addDays(2)->format('Y-m-d');

        // Create slot
        AppointmentSlot::updateOrCreate(
            [
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $date,
                'time_slot' => $timeSlot,
            ],
            [
                'capacity' => 10,
                'booked_count' => 1,
            ]
        );

        // Appointment created by creatorUser, attributed to centerA
        $appointment = Appointment::create([
            'booking_reference' => 'MS-' . date('Y') . '-' . strtoupper(Str::random(6)),
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مركز أ',
            'patient_phone' => '0555112233',
            'booking_center_id' => $this->centerA->id,
            'created_by_id' => $this->creatorUser->id,
            'creator_type' => 'booking_center',
            'appointment_date' => $date,
            'time_slot' => $timeSlot,
            'status' => 'confirmed',
        ]);

        // Reflect quota confirmation (10 -> 9)
        $this->centerA->update(['quota_balance' => 9]);
        BookingTransaction::create([
            'booking_center_id' => $this->centerA->id,
            'appointment_id' => $appointment->id,
            'transaction_type' => 'confirmation',
            'units' => 1,
            'balance_after' => 9,
            'created_by_id' => $this->doctorUser->id,
        ]);

        return $appointment;
    }

    /**
     * Test 1: Another staff/user of the owning booking center can cancel the appointment,
     * even when they are NOT the original created_by_id.
     */
    public function test_booking_center_can_cancel_appointment_even_if_created_by_another_user(): void
    {
        $appointment = $this->createConfirmedCenterAppointment('10:00');
        $this->assertEquals(9, $this->centerA->fresh()->quota_balance);
        $this->assertNotEquals($this->bcUserA->id, $appointment->created_by_id, 'Testing actor must differ from created_by_id');

        // bcUserA cancels the appointment
        $response = $this->actingAs($this->bcUserA, 'sanctum')->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
            'reason' => 'إلغاء الموعد بناءً على طلب المريض لمركز الحجز',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        // Quota is refunded to center A (9 -> 10)
        $this->assertEquals(10, $this->centerA->fresh()->quota_balance);

        // Ledger contains refund record
        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->centerA->id,
            'appointment_id' => $appointment->id,
            'transaction_type' => 'refund',
            'units' => 1,
            'balance_after' => 10,
        ]);
    }

    /**
     * Test 2: A user belonging to a DIFFERENT booking center is rejected.
     */
    public function test_different_booking_center_cannot_cancel_appointment(): void
    {
        $appointment = $this->createConfirmedCenterAppointment('11:00');

        // bcUserB (from center B) attempts to cancel appointment owned by center A
        $response = $this->actingAs($this->bcUserB, 'sanctum')->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
            'reason' => 'محاولة إلغاء غير مصرح بها من مركز آخر',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorization']);

        // Appointment remains confirmed
        $this->assertEquals('confirmed', $appointment->fresh()->status);

        // Center A quota remains 9, Center B quota remains 10
        $this->assertEquals(9, $this->centerA->fresh()->quota_balance);
        $this->assertEquals(10, $this->centerB->fresh()->quota_balance);
    }

    /**
     * Test 3: An unrelated user without role or delegation is rejected.
     */
    public function test_unrelated_user_without_authorization_cannot_cancel_appointment(): void
    {
        $appointment = $this->createConfirmedCenterAppointment('12:00');

        $response = $this->actingAs($this->unrelatedUser, 'sanctum')->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
            'reason' => 'محاولة إلغاء من مستخدم عشوائي',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorization']);

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    /**
     * Test 4: Another patient cannot cancel an appointment that belongs to another patient.
     */
    public function test_patient_cannot_cancel_another_patients_appointment(): void
    {
        $date = now()->addDays(2)->format('Y-m-d');

        // Create slot
        AppointmentSlot::updateOrCreate(
            [
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => $date,
                'time_slot' => '14:00',
            ],
            [
                'capacity' => 10,
                'booked_count' => 1,
            ]
        );

        // Appointment belonging to Patient A
        $patientAppt = Appointment::create([
            'booking_reference' => 'MS-' . date('Y') . '-' . strtoupper(Str::random(6)),
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patientA->id,
            'patient_name' => 'فاطمة بن علي',
            'patient_phone' => '0555000001',
            'created_by_id' => $this->patientUserA->id,
            'creator_type' => 'patient',
            'appointment_date' => $date,
            'time_slot' => '14:00',
            'status' => 'confirmed',
        ]);

        // Patient B attempts to cancel Patient A's appointment
        $response = $this->actingAs($this->patientUserB, 'sanctum')->postJson("/api/v1/appointments/{$patientAppt->id}/cancel", [
            'reason' => 'محاولة إلغاء موعد مريض آخر',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorization']);

        $this->assertEquals('confirmed', $patientAppt->fresh()->status);
    }

    /**
     * Test 5: Repeating cancellation on an already cancelled appointment returns 200 idempotently
     * and does NOT double-refund quota or create duplicate transactions.
     */
    public function test_repeated_cancellation_does_not_double_refund_quota(): void
    {
        $appointment = $this->createConfirmedCenterAppointment('15:00');

        // First cancellation: 9 -> 10
        $res1 = $this->actingAs($this->bcUserA, 'sanctum')->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
            'reason' => 'إلغاء أولي',
        ]);
        $res1->assertStatus(200);
        $this->assertEquals(10, $this->centerA->fresh()->quota_balance);

        $refundCount1 = BookingTransaction::where('appointment_id', $appointment->id)
            ->where('transaction_type', 'refund')
            ->count();
        $this->assertEquals(1, $refundCount1);

        // Second cancellation attempt on the already cancelled appointment
        $res2 = $this->actingAs($this->bcUserA, 'sanctum')->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
            'reason' => 'محاولة إلغاء مكررة',
        ]);
        $res2->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        // Quota MUST remain 10 (NOT 11)
        $this->assertEquals(10, $this->centerA->fresh()->quota_balance);

        // Refund transaction count MUST remain 1
        $refundCount2 = BookingTransaction::where('appointment_id', $appointment->id)
            ->where('transaction_type', 'refund')
            ->count();
        $this->assertEquals(1, $refundCount2);
    }
}
