<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\Appointment;
use App\Models\AssistantProgramLifecycleEvent;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\AssistantRewardRateSchedule;
use App\Models\AssistantRewardTransaction;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Services\AssistantLedgerService;
use App\Services\AssistantProgramLifecycleService;
use App\Services\AssistantRewardQualificationService;
use App\Services\AssistantRewardRateService;
use App\Services\AssistantRewardReversalService;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicRateAndLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected AssistantRewardRateService $rateService;
    protected AssistantProgramLifecycleService $lifecycleService;
    protected AssistantRewardQualificationService $qualificationService;
    protected AssistantRewardReversalService $reversalService;
    protected AssistantLedgerService $ledgerService;
    protected BookingService $bookingService;

    protected User $adminUser;
    protected string $adminToken;

    protected User $assistantUser;
    protected ClinicAssistant $clinicAssistant;
    protected string $assistantToken;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

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

        $this->rateService = app(AssistantRewardRateService::class);
        $this->lifecycleService = app(AssistantProgramLifecycleService::class);
        $this->qualificationService = app(AssistantRewardQualificationService::class);
        $this->reversalService = app(AssistantRewardReversalService::class);
        $this->ledgerService = app(AssistantLedgerService::class);
        $this->bookingService = app(BookingService::class);

        // Platform Admin
        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');
        $this->adminToken = $this->adminUser->createToken('auth')->plainTextToken;

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['is_active' => true]);
        $this->doctorUser->assignRole('doctor');
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-RATE-001',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء المركزية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => '16',
            'phone' => '021999888',
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_active' => true,
        ]);

        // Doctor Assistant
        $this->assistantUser = User::factory()->create(['is_active' => true]);
        $this->assistantUser->assignRole('doctor_assistant');
        $this->assistantToken = $this->assistantUser->createToken('auth')->plainTextToken;

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
            'name' => 'مركز حجز العاصمة',
            'phone' => '021555666',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'quota_balance' => 50,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Patient with all non-null columns
        $this->patientUser = User::factory()->create(['is_active' => true]);
        $this->patientUser->assignRole('patient_registered');
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'first_name' => 'محمد',
            'last_name' => 'بوعلام',
            'phone' => '0550112233',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'mrn' => 'MRN-2026-' . rand(100000, 999999),
            'wilaya' => '16',
        ]);
    }

    protected function createAppointment(string $status = 'pending', ?Carbon $confirmedAt = null): Appointment
    {
        return Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'محمد بوعلام',
            'patient_phone' => '0550112233',
            'booking_reference' => 'BK-' . strtoupper(uniqid()),
            'booking_center_id' => $this->bookingCenter->id,
            'created_by_id' => $this->bcUser->id,
            'creator_id' => $this->bcUser->id,
            'creator_type' => 'booking_center',
            'appointment_date' => now('Africa/Algiers')->format('Y-m-d'),
            'time_slot' => '10:00',
            'status' => $status,
            'confirmed_at' => $confirmedAt,
            'confirmed_by_id' => $confirmedAt ? $this->assistantUser->id : null,
        ]);
    }

    public function test_default_baseline_rate_is_10_dzd_and_qualifies_correctly(): void
    {
        $this->assertEquals(10.00, $this->rateService->getEffectiveRateAt());

        $appointment = $this->createAppointment('confirmed', now('Africa/Algiers'));
        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->assistantUser);

        $this->assertNotNull($reward);
        $this->assertEquals(10.00, (float) $reward->amount);
        $this->assertNull($reward->rate_schedule_id);

        $balance = AssistantRewardBalance::where('assistant_id', $this->assistantUser->id)->first();
        $this->assertEquals(10.00, (float) $balance->current_balance);
    }

    public function test_admin_can_schedule_future_reward_rate_via_api(): void
    {
        $futureDate = now('Africa/Algiers')->addDays(10)->startOfHour()->toDateTimeString();

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson('/api/v1/admin/rewards/rates/schedule', [
                'rate_amount' => 15.00,
                'effective_from' => $futureDate,
                'decision_reference' => 'DEC-2026-TEST-R01',
                'notes' => 'زيادة تشجيعية مجدولة',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.rate_amount', '15.00')
            ->assertJsonPath('data.status', 'scheduled');

        $this->assertDatabaseHas('assistant_reward_rate_schedules', [
            'rate_amount' => 15.00,
            'status' => 'scheduled',
            'decision_reference' => 'DEC-2026-TEST-R01',
        ]);
    }

    public function test_rate_resolution_before_and_after_scheduled_effective_datetime(): void
    {
        $splitTime = Carbon::parse('2026-11-20 12:00:00', 'Africa/Algiers');

        $schedule = AssistantRewardRateSchedule::create([
            'rate_amount' => 20.00,
            'currency' => 'DZD',
            'effective_from' => $splitTime,
            'status' => 'scheduled',
            'decision_reference' => 'DEC-2026-STEP',
            'created_by_id' => $this->adminUser->id,
        ]);

        // Confirmation BEFORE split time -> gets baseline 10.00 DZD
        $beforeTime = $splitTime->copy()->subHours(2);
        $appointmentBefore = $this->createAppointment('confirmed', $beforeTime);
        $rewardBefore = $this->qualificationService->qualifyAppointment($appointmentBefore, $this->assistantUser);

        $this->assertEquals(10.00, (float) $rewardBefore->amount);
        $this->assertNull($rewardBefore->rate_schedule_id);

        // Confirmation AFTER split time -> gets 20.00 DZD and schedule link
        $afterTime = $splitTime->copy()->addHours(2);
        $appointmentAfter = $this->createAppointment('confirmed', $afterTime);
        $rewardAfter = $this->qualificationService->qualifyAppointment($appointmentAfter, $this->assistantUser);

        $this->assertEquals(20.00, (float) $rewardAfter->amount);
        $this->assertEquals($schedule->id, $rewardAfter->rate_schedule_id);

        // Cumulative Balance = 10 + 20 = 30.00 DZD
        $balance = AssistantRewardBalance::where('assistant_id', $this->assistantUser->id)->first();
        $this->assertEquals(30.00, (float) $balance->current_balance);
    }

    public function test_snapshot_permanence_after_future_rate_change(): void
    {
        // 1. Qualify appointment at 15.00 DZD
        $schedule1 = AssistantRewardRateSchedule::create([
            'rate_amount' => 15.00,
            'currency' => 'DZD',
            'effective_from' => now('Africa/Algiers')->subHour(),
            'status' => 'active',
            'created_by_id' => $this->adminUser->id,
        ]);

        $appointment1 = $this->createAppointment('confirmed', now('Africa/Algiers'));
        $reward1 = $this->qualificationService->qualifyAppointment($appointment1, $this->assistantUser);
        $this->assertEquals(15.00, (float) $reward1->amount);

        // 2. Schedule and activate a higher rate 30.00 DZD
        $schedule2 = AssistantRewardRateSchedule::create([
            'rate_amount' => 30.00,
            'currency' => 'DZD',
            'effective_from' => now('Africa/Algiers')->addDay(),
            'status' => 'scheduled',
            'created_by_id' => $this->adminUser->id,
        ]);

        // 3. Verify reward1 snapshot did NOT change
        $reward1Fresh = AssistantReward::find($reward1->id);
        $this->assertEquals(15.00, (float) $reward1Fresh->amount);
    }

    public function test_admin_can_cancel_scheduled_rate_before_it_becomes_effective(): void
    {
        $futureTime = now('Africa/Algiers')->addDays(5);
        $schedule = AssistantRewardRateSchedule::create([
            'rate_amount' => 25.00,
            'currency' => 'DZD',
            'effective_from' => $futureTime,
            'status' => 'scheduled',
            'created_by_id' => $this->adminUser->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken)
            ->postJson("/api/v1/admin/rewards/rates/schedules/{$schedule->id}/cancel", [
                'cancellation_reason' => 'تم إلغاء الزيادة لأسباب موازنية',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'cancelled');

        $schedule->refresh();
        $this->assertEquals('cancelled', $schedule->status);
        $this->assertEquals('تم إلغاء الزيادة لأسباب موازنية', $schedule->cancellation_reason);

        // At future time, rate service must ignore cancelled schedule and fallback to baseline (10.00 DZD)
        $rateAtFuture = $this->rateService->getEffectiveRateAt($futureTime->copy()->addHour());
        $this->assertEquals(10.00, $rateAtFuture);
    }

    public function test_dec_01_actual_reward_snapshot_deduction_on_cancellation(): void
    {
        // 1. Schedule a custom rate of 18.00 DZD
        $schedule = AssistantRewardRateSchedule::create([
            'rate_amount' => 18.00,
            'currency' => 'DZD',
            'effective_from' => now('Africa/Algiers')->subHour(),
            'status' => 'active',
            'created_by_id' => $this->adminUser->id,
        ]);

        $appointment = $this->createAppointment('confirmed', now('Africa/Algiers'));
        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->assistantUser);
        $this->assertEquals(18.00, (float) $reward->amount);

        // Balance should be 18.00 DZD
        $balance = AssistantRewardBalance::where('assistant_id', $this->assistantUser->id)->first();
        $this->assertEquals(18.00, (float) $balance->current_balance);

        // 2. Cancellation occurs by clinic assistant actor -> DEC-01 deduction must deduct exactly 18.00 DZD
        $this->reversalService->handleCancellation($appointment, $this->assistantUser, 'إلغاء من طرف العيادة');

        $reward->refresh();
        $this->assertEquals('deducted', $reward->cancellation_status);

        // Verify ledger has deduction of 18.00 DZD (NOT 10.00 DZD!)
        $deductionTx = AssistantRewardTransaction::where('assistant_id', $this->assistantUser->id)
            ->where('transaction_type', 'cancellation_deduction')
            ->first();

        $this->assertNotNull($deductionTx);
        $this->assertEquals(18.00, (float) $deductionTx->amount);

        // Balance must be zero (18 earned - 18 deducted = 0)
        $balance->refresh();
        $this->assertEquals(0.00, (float) $balance->current_balance);
    }

    public function test_program_lifecycle_suspension_halts_new_rewards(): void
    {
        // 1. Transition program lifecycle to suspended
        $this->lifecycleService->transitionState(
            targetState: 'suspended',
            effectiveAt: now('Africa/Algiers')->subMinute(),
            actor: $this->adminUser,
            reason: 'تعليق مؤقت لأعمال الصيانة والتسوية المالية السنوية'
        );

        $this->assertFalse($this->lifecycleService->isConfirmationEligible());

        // 2. Confirm appointment during suspension
        $appointment = $this->createAppointment('confirmed', now('Africa/Algiers'));
        $reward = $this->qualificationService->qualifyAppointment($appointment, $this->assistantUser);

        // Reward should be skipped (null returned, 0 rows)
        $this->assertNull($reward);
        $this->assertDatabaseMissing('assistant_rewards', ['appointment_id' => $appointment->id]);
    }

    public function test_program_lifecycle_termination_enforces_notice_deadline_datetime(): void
    {
        $noticeDeadline = Carbon::parse('2026-11-25 18:00:00', 'Africa/Algiers');

        $this->lifecycleService->transitionState(
            targetState: 'terminated',
            effectiveAt: '2026-11-05 00:00:00',
            actor: $this->adminUser,
            reason: 'إنهاء رسمي للبرنامج مع إشعار لمدة 20 يوماً',
            noticeDeadlineAt: $noticeDeadline
        );

        // Confirmation before deadline qualifies
        $beforeDeadline = $noticeDeadline->copy()->subHour();
        $this->assertTrue($this->lifecycleService->isConfirmationEligible($beforeDeadline));

        $appt1 = $this->createAppointment('confirmed', $beforeDeadline);
        $reward1 = $this->qualificationService->qualifyAppointment($appt1, $this->assistantUser);
        $this->assertNotNull($reward1);

        // Confirmation after deadline is rejected
        $afterDeadline = $noticeDeadline->copy()->addHour();
        $this->assertFalse($this->lifecycleService->isConfirmationEligible($afterDeadline));

        $appt2 = $this->createAppointment('confirmed', $afterDeadline);
        $reward2 = $this->qualificationService->qualifyAppointment($appt2, $this->assistantUser);
        $this->assertNull($reward2);
    }

    public function test_4d_authorization_blocks_unauthorized_actors(): void
    {
        // Doctor Assistant tries to schedule a rate -> 403 Forbidden
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/admin/rewards/rates/schedule', [
                'rate_amount' => 50.00,
                'effective_from' => now('Africa/Algiers')->addDay()->toDateTimeString(),
            ]);

        $response->assertStatus(403);

        // Doctor Assistant tries to transition lifecycle -> 403 Forbidden
        $response2 = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/admin/rewards/lifecycle/transition', [
                'target_state' => 'suspended',
                'effective_at' => now('Africa/Algiers')->toDateTimeString(),
                'reason' => 'غير مصرح له',
            ]);

        $response2->assertStatus(403);
    }
}