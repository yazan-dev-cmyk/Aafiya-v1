<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\Appointment;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardTransaction;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantRewardQualificationService;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AssistantRewardAttributionTest extends TestCase
{
    use RefreshDatabase;

    protected BookingService $bookingService;
    protected AssistantRewardQualificationService $qualificationService;
    protected AssistantLedgerService $ledgerService;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected User $assistant1User;
    protected ClinicAssistant $clinicAssistant1;

    protected User $assistant2User;
    protected ClinicAssistant $clinicAssistant2;

    protected User $adminUser;
    protected User $bcUser;
    protected BookingCenter $bookingCenter;
    protected User $patientUser;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->bookingService = app(BookingService::class);
        $this->qualificationService = app(AssistantRewardQualificationService::class);
        $this->ledgerService = app(AssistantLedgerService::class);

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['is_active' => true]);
        $this->doctorUser->assignRole('doctor');
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-ATTR-001',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الإحسان الطبية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => '16',
            'phone' => '021000777',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_active' => true,
        ]);

        // Assistant 1 (Primary / First in DB)
        $this->assistant1User = User::factory()->create(['is_active' => true]);
        $this->assistant1User->assignRole('doctor_assistant');
        $this->clinicAssistant1 = ClinicAssistant::create([
            'user_id' => $this->assistant1User->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.confirm'],
            'is_active' => true,
        ]);

        // Assistant 2 (Secondary / Later in DB)
        $this->assistant2User = User::factory()->create(['is_active' => true]);
        $this->assistant2User->assignRole('doctor_assistant');
        $this->clinicAssistant2 = ClinicAssistant::create([
            'user_id' => $this->assistant2User->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.confirm'],
            'is_active' => true,
        ]);

        // Admin
        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');

        // Booking Center
        $this->bcUser = User::factory()->create(['is_active' => true]);
        $this->bcUser->assignRole('booking_center');
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bcUser->id,
            'name' => 'مركز حجز الأمان',
            'phone' => '021777888',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'quota_balance' => 50,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Patient
        $this->patientUser = User::factory()->create(['is_active' => true]);
        $this->patientUser->assignRole('patient_registered');
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-ATTR-' . rand(100000, 999999),
            'first_name' => 'Farid',
            'last_name' => 'Amrani',
            'phone' => '0555123456',
            'gender' => 'male',
            'date_of_birth' => '1988-06-15',
            'wilaya' => '16',
        ]);
    }

    protected function createAppointment(string $source = 'booking_center'): Appointment
    {
        return Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'Farid Amrani',
            'patient_phone' => '0555123456',
            'booking_reference' => 'BK-ATTR-' . strtoupper(uniqid()),
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'creator_type' => $source === 'booking_center' ? 'booking_center' : 'patient',
            'booking_center_id' => $source === 'booking_center' ? $this->bookingCenter->id : null,
            'created_by_id' => $source === 'booking_center' ? $this->bcUser->id : $this->patientUser->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Test 1: Eligible assistant confirms -> exactly one 10 DZD reward created for that assistant.
     */
    public function test_eligible_assistant_confirms_qualifies_exactly_one_10_dzd_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->assistant1User);

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($reward);
        $this->assertEquals(10.00, (float) $reward->amount);
        $this->assertEquals($this->assistant1User->id, $reward->assistant_id);
        $this->assertEquals($this->clinicAssistant1->id, $reward->clinic_assistant_id);
        $this->assertEquals('pending', $reward->settlement_status);

        $balance = AssistantRewardBalance::find($this->assistant1User->id);
        $this->assertNotNull($balance);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(10.00, (float) $balance->total_earned);

        $tx = AssistantRewardTransaction::where('assistant_id', $this->assistant1User->id)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('credit', $tx->direction);
        $this->assertEquals(10.00, (float) $tx->amount);
        $this->assertEquals('reward_earned', $tx->transaction_type);
        $this->assertEquals($this->assistant1User->id, $tx->created_by);
    }

    /**
     * Test 2: Doctor confirms -> no assistant reward is created.
     */
    public function test_doctor_confirms_creates_no_assistant_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->doctorUser);

        $this->assertEquals('confirmed', $appointment->fresh()->status);
        $this->assertNull(AssistantReward::where('appointment_id', $appointment->id)->first());
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
        $this->assertNull(AssistantRewardBalance::find($this->assistant2User->id));
        $this->assertEquals(0, AssistantRewardTransaction::count());
    }

    /**
     * Test 3: Administrator confirms -> no assistant reward is created.
     */
    public function test_administrator_confirms_creates_no_assistant_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->adminUser);

        $this->assertEquals('confirmed', $appointment->fresh()->status);
        $this->assertNull(AssistantReward::where('appointment_id', $appointment->id)->first());
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
        $this->assertEquals(0, AssistantRewardTransaction::count());
    }

    /**
     * Test 4: Other non-eligible actor confirms -> no assistant reward is created.
     */
    public function test_other_non_eligible_actor_confirms_creates_no_assistant_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->bcUser);
        $this->assertNull($reward);

        $rewardPatient = $this->qualificationService->qualifyAppointment($appointment, $this->patientUser);
        $this->assertNull($rewardPatient);

        $this->assertEquals(0, AssistantReward::count());
        $this->assertEquals(0, AssistantRewardTransaction::count());
    }

    /**
     * Test 5: An active assistant exists in clinic but did not confirm -> receives no reward.
     */
    public function test_active_assistant_exists_but_did_not_confirm_receives_no_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        // Confirmed by doctor
        $this->bookingService->confirmAppointment($appointment, $this->doctorUser);

        // Assistant 1 is active in clinic, but must NOT receive reward
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
        $this->assertEquals(0, AssistantReward::where('assistant_id', $this->assistant1User->id)->count());
    }

    /**
     * Test 6: No eligible assistant exists -> no reward is created.
     */
    public function test_no_eligible_assistant_exists_creates_no_reward(): void
    {
        // Deactivate both assistants
        $this->clinicAssistant1->update(['is_active' => false]);
        $this->clinicAssistant2->update(['is_active' => false]);

        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->doctorUser);

        $this->assertEquals(0, AssistantReward::count());
        $this->assertEquals(0, AssistantRewardTransaction::count());
    }

    /**
     * Test 7: Repeated confirmation -> no duplicate reward.
     */
    public function test_repeated_confirmation_does_not_create_duplicate_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $this->bookingService->confirmAppointment($appointment, $this->assistant1User);
        $this->assertEquals(1, AssistantReward::count());

        // Repeated confirmation invocation
        $this->bookingService->confirmAppointment($appointment, $this->assistant1User);

        $this->assertEquals(1, AssistantReward::count());
        $balance = AssistantRewardBalance::find($this->assistant1User->id);
        $this->assertEquals(10.00, (float) $balance->current_balance);
        $this->assertEquals(1, AssistantRewardTransaction::count());
    }

    /**
     * Test 8: Repeated qualification processing -> no duplicate reward.
     */
    public function test_repeated_qualification_processing_does_not_create_duplicate_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        $reward1 = $this->qualificationService->qualifyAppointment($appointment, $this->assistant1User);
        $this->assertNotNull($reward1);

        // Direct second call with same or different assistant
        $reward2 = $this->qualificationService->qualifyAppointment($appointment, $this->assistant2User);

        $this->assertNotNull($reward2);
        $this->assertEquals($reward1->id, $reward2->id);
        $this->assertEquals($this->assistant1User->id, $reward2->assistant_id);
        $this->assertEquals(1, AssistantReward::count());
        $this->assertEquals(1, AssistantRewardTransaction::count());
    }

    /**
     * Test 9: Multiple assistants exist -> only the actual eligible confirmation actor receives reward.
     */
    public function test_multiple_assistants_exist_only_actual_confirming_assistant_receives_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        // Assistant 2 confirms (Assistant 1 was created first and is older in DB)
        $this->bookingService->confirmAppointment($appointment, $this->assistant2User);

        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($reward);

        // Explicitly assert Assistant 2 received reward, NOT Assistant 1
        $this->assertEquals($this->assistant2User->id, $reward->assistant_id);
        $this->assertEquals($this->clinicAssistant2->id, $reward->clinic_assistant_id);

        $balance2 = AssistantRewardBalance::find($this->assistant2User->id);
        $this->assertNotNull($balance2);
        $this->assertEquals(10.00, (float) $balance2->current_balance);

        $balance1 = AssistantRewardBalance::find($this->assistant1User->id);
        $this->assertNull($balance1);
    }

    /**
     * Test 10: Assistant membership is inactive at confirmation time -> no reward created.
     */
    public function test_assistant_membership_inactive_at_confirmation_time_creates_no_reward(): void
    {
        // Deactivate Assistant 1
        $this->clinicAssistant1->update(['is_active' => false]);

        $appointment = $this->createAppointment('booking_center');

        // Direct qualification call with inactive assistant
        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->assistant1User);
        $this->assertNull($reward);

        $this->assertEquals(0, AssistantReward::count());
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
    }

    /**
     * Test 10b: Assistant membership is soft-deleted at confirmation time -> no reward created.
     */
    public function test_assistant_membership_soft_deleted_creates_no_reward(): void
    {
        $this->clinicAssistant1->delete();

        $appointment = $this->createAppointment('booking_center');

        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->assistant1User);
        $this->assertNull($reward);

        $this->assertEquals(0, AssistantReward::count());
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
    }

    /**
     * Test 11: Appointment not genuinely created by a Booking Center -> no reward created.
     */
    public function test_appointment_not_genuinely_created_by_booking_center_creates_no_reward(): void
    {
        $appointment = $this->createAppointment('direct');

        $this->bookingService->confirmAppointment($appointment, $this->assistant1User);

        $this->assertNull(AssistantReward::where('appointment_id', $appointment->id)->first());
        $this->assertNull(AssistantRewardBalance::find($this->assistant1User->id));
        $this->assertEquals(0, AssistantRewardTransaction::count());
    }

    /**
     * Test 12: Concurrent processing guarantees single reward and idempotent ledger.
     */
    public function test_concurrent_processing_guarantees_single_reward(): void
    {
        $appointment = $this->createAppointment('booking_center');

        // Simulate two sequential concurrent-like attempts within transaction boundaries
        $rewardA = null;
        $rewardB = null;

        DB::transaction(function () use ($appointment, &$rewardA) {
            $rewardA = $this->qualificationService->qualifyAppointment($appointment, $this->assistant1User);
        });

        DB::transaction(function () use ($appointment, &$rewardB) {
            $rewardB = $this->qualificationService->qualifyAppointment($appointment, $this->assistant2User);
        });

        $this->assertNotNull($rewardA);
        $this->assertNotNull($rewardB);
        $this->assertEquals($rewardA->id, $rewardB->id);
        $this->assertEquals($this->assistant1User->id, $rewardB->assistant_id);
        $this->assertEquals(1, AssistantReward::count());

        $balance1 = AssistantRewardBalance::find($this->assistant1User->id);
        $this->assertEquals(10.00, (float) $balance1->current_balance);
        $this->assertNull(AssistantRewardBalance::find($this->assistant2User->id));
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($this->assistant1User->id));
    }
}
