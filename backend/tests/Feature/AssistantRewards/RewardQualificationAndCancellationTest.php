<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\Appointment;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RewardQualificationAndCancellationTest extends TestCase
{
    use RefreshDatabase;

    protected BookingService $bookingService;
    protected AssistantLedgerService $ledgerService;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $assistantUser;
    protected ClinicAssistant $clinicAssistant;
    protected User $bcUser;
    protected BookingCenter $bookingCenter;
    protected User $patientUser;
    protected Patient $patient;
    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->bookingService = app(BookingService::class);
        $this->ledgerService = app(AssistantLedgerService::class);

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['is_active' => true]);
        $this->doctorUser->assignRole('doctor');
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-QUAL-101',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة النور الطبية',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'phone' => '021000111',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_active' => true,
        ]);

        // Active Assistant
        $this->assistantUser = User::factory()->create(['is_active' => true]);
        $this->assistantUser->assignRole('doctor_assistant');
        $this->clinicAssistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.confirm'],
            'is_active' => true,
        ]);

        // Booking Center
        $this->bcUser = User::factory()->create(['is_active' => true]);
        $this->bcUser->assignRole('booking_center');
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bcUser->id,
            'name' => 'مركز حجز الأمل',
            'phone' => '021333444',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'quota_balance' => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Patient
        $this->patientUser = User::factory()->create(['is_active' => true]);
        $this->patientUser->assignRole('patient_registered');
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-' . rand(100000, 999999),
            'first_name' => 'Karim',
            'last_name' => 'Bensalem',
            'phone' => '0555999888',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'wilaya' => '16',
        ]);

        // Admin
        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');
    }

    protected function createAppointment(string $source = 'booking_center'): Appointment
    {
        return Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'Karim Bensalem',
            'patient_phone' => '0555999888',
            'booking_reference' => 'BK-' . strtoupper(uniqid()),
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'creator_type' => $source === 'booking_center' ? 'booking_center' : 'patient',
            'booking_center_id' => $source === 'booking_center' ? $this->bookingCenter->id : null,
            'created_by_id' => $this->bcUser->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Scenario 1: Genuine Booking Center appointment confirmation by eligible assistant qualifies 10 DZD reward.
     */
    public function test_bc_appointment_confirmation_qualifies_10_dzd_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($reward);
        $this->assertEquals(10.00, (float) $reward->amount);
        $this->assertEquals('pending', $reward->settlement_status);
        $this->assertEquals('none', $reward->cancellation_status);
        $this->assertEquals($this->assistantUser->id, $reward->assistant_id);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(10.00, (float) $balance->total_earned);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($this->assistantUser->id));
    }

    /**
     * Scenario 1b: Doctor confirmation does NOT qualify assistant reward.
     */
    public function test_doctor_confirmation_does_not_qualify_assistant_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->doctorUser);

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertNull($reward);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertNull($balance);
    }

    /**
     * Scenario 2: Direct appointment confirmation does NOT qualify a reward.
     */
    public function test_direct_appointment_confirmation_does_not_qualify_reward(): void
    {
        $appointment = $this->createAppointment('direct');

        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertNull($reward);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertNull($balance);
    }

    /**
     * Scenario 3: Clinic employee / doctor cancellation causes 10 DZD deduction.
     */
    public function test_clinic_initiated_cancellation_deducts_10_dzd_penalty(): void
    {
        $appointment = $this->createAppointment('booking_center');
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        // Cancelled by Doctor
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->doctorUser, 'Doctor cancelled consultation');

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('deducted', $reward->cancellation_status);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balance->current_balance);
        $this->assertEquals(10.00, (float) $balance->total_earned);
        $this->assertEquals(10.00, (float) $balance->total_deducted);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($this->assistantUser->id));
    }

    /**
     * Scenario 4: Patient cancellation causes ZERO deduction (assistant retains reward).
     */
    public function test_patient_cancellation_preserves_reward_with_zero_deduction(): void
    {
        $appointment = $this->createAppointment('booking_center');
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        // Cancelled by Patient
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->patientUser, 'Patient had an emergency');

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('none', $reward->cancellation_status);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(0.00, (float) $balance->total_deducted);
    }

    /**
     * Scenario 5: Booking Center cancellation causes ZERO deduction.
     */
    public function test_booking_center_cancellation_preserves_reward_with_zero_deduction(): void
    {
        $appointment = $this->createAppointment('booking_center');
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        // Cancelled by Booking Center agent
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->bcUser, 'Booking center rescheduled patient');

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('none', $reward->cancellation_status);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(0.00, (float) $balance->total_deducted);
    }

    /**
     * Scenario 6: Admin cancellation causes ZERO deduction.
     */
    public function test_admin_cancellation_preserves_reward_with_zero_deduction(): void
    {
        $appointment = $this->createAppointment('booking_center');
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        // Cancelled by Platform Admin
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->adminUser, 'Admin audit adjustment');

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('none', $reward->cancellation_status);

        $balance = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(0.00, (float) $balance->total_deducted);
    }
}