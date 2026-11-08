<?php

namespace Tests\Feature\AssistantRewards;

use App\Models\Appointment;
use App\Models\AssistantPayoutBatch;
use App\Models\AssistantPayoutBatchItem;
use App\Models\AssistantPayoutProfile;
use App\Models\AssistantReward;
use App\Models\AssistantRewardBalance;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PlatformOperationalLoss;
use App\Models\User;
use App\Services\AssistantDepartureSettlementService;
use App\Services\AssistantLedgerService;
use App\Services\AssistantRewardReversalService;
use App\Services\BookingService;
use App\Services\ClinicService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostDepartureScenariosTest extends TestCase
{
    use RefreshDatabase;

    protected BookingService $bookingService;
    protected ClinicService $clinicService;
    protected AssistantLedgerService $ledgerService;
    protected AssistantDepartureSettlementService $departureService;
    protected AssistantRewardReversalService $reversalService;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $assistantUser;
    protected ClinicAssistant $clinicAssistant;
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
        $this->clinicService = app(ClinicService::class);
        $this->ledgerService = app(AssistantLedgerService::class);
        $this->departureService = app(AssistantDepartureSettlementService::class);
        $this->reversalService = app(AssistantRewardReversalService::class);

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['is_active' => true]);
        $this->doctorUser->assignRole('doctor');
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-DEP-201',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة التضامن',
            'address' => 'الجزائر',
            'wilaya' => '16',
            'phone' => '021000222',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_active' => true,
        ]);

        // Assistant
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
            'name' => 'مركز حجز الشفاء',
            'phone' => '021333555',
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
            'mrn' => 'MRN-2026-991122',
            'first_name' => 'Walid',
            'last_name' => 'Dahmani',
            'phone' => '0555112233',
            'gender' => 'male',
            'date_of_birth' => '1988-05-15',
            'wilaya' => '16',
        ]);
    }

    protected function createAppointment(): Appointment
    {
        return Appointment::create([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'Walid Dahmani',
            'patient_phone' => '0555112233',
            'booking_reference' => 'BK-' . strtoupper(uniqid()),
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'creator_type' => 'booking_center',
            'booking_center_id' => $this->bookingCenter->id,
            'created_by_id' => $this->bcUser->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Scenario A: Departure with negative balance (Deficit) -> Platform absorbs deficit.
     */
    public function test_scenario_a_departure_deficit_absorption(): void
    {
        // Assistant incurs a deficit balance of -20.00 DZD
        $this->ledgerService->recordTransaction(
            assistantId: $this->assistantUser->id,
            transactionType: 'cancellation_deduction',
            direction: 'debit',
            amount: 20.00,
            referenceType: 'penalty',
            referenceId: 'pen-1',
            idempotencyKey: 'init_deficit'
        );

        $balanceBefore = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(-20.00, (float) $balanceBefore->current_balance);

        // Departure processed
        $result = $this->departureService->processDeparture($this->clinicAssistant, $this->doctorUser);

        $this->assertEquals('deficit_absorbed', $result['status']);
        $this->assertEquals(20.00, (float) $result['amount_absorbed']);

        // Check platform operational loss
        $loss = PlatformOperationalLoss::where('assistant_id', $this->assistantUser->id)
            ->where('loss_category', 'departure_deficit_absorption')
            ->first();
        $this->assertNotNull($loss);
        $this->assertEquals(20.00, (float) $loss->amount);

        // Check balance restored to 0.00
        $balanceAfter = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(0.00, (float) $balanceAfter->current_balance);
        $this->assertEquals(20.00, (float) $balanceAfter->total_relieved);
        $this->assertTrue($this->ledgerService->verifyBalanceInvariant($this->assistantUser->id));
    }

    /**
     * Scenario B: Departure after payout transferred -> Post-departure cancellation absorbed by platform.
     */
    public function test_scenario_b_post_departure_cancellation_after_completed_payout(): void
    {
        // 1. Confirm appointment while assistant is active -> 10 DZD earned
        $appointment = $this->createAppointment();
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        // 2. RIP Profile & Payout Batch completed
        $profile = AssistantPayoutProfile::create([
            'assistant_id' => $this->assistantUser->id,
            'version' => 1,
            'rip_number' => '00799999000123456789',
            'cheque_image_path' => 'private/cheques/test.jpg',
            'status' => 'active',
        ]);

        $batch = AssistantPayoutBatch::create([
            'batch_number' => 'BAT-TEST-001',
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->toDateString(),
            'status' => 'completed',
            'total_recipients' => 1,
            'total_amount' => 10.00,
        ]);

        $batchItem = AssistantPayoutBatchItem::create([
            'batch_id' => $batch->id,
            'assistant_id' => $this->assistantUser->id,
            'payout_profile_id' => $profile->id,
            'amount' => 10.00,
            'status' => 'paid',
            'transfer_reference' => 'TX-REF-B-001',
            'transferred_at' => now(),
        ]);

        // Assistant leaves clinic
        $this->clinicAssistant->delete();

        // 3. Appointment cancelled post-departure
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->doctorUser, 'Doctor cancelled post-departure');

        // Check platform operational loss
        $loss = PlatformOperationalLoss::where('appointment_id', $appointment->id)
            ->where('loss_category', 'post_departure_cancellation')
            ->first();
        $this->assertNotNull($loss);
        $this->assertEquals(10.00, (float) $loss->amount);

        // Check reward cancellation status
        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('absorbed', $reward->cancellation_status);
    }

    /**
     * Scenario C: Departure with pending payout -> Post-departure cancellation absorbed without reducing payout.
     */
    public function test_scenario_c_post_departure_cancellation_before_payout_transferred(): void
    {
        // 1. Confirm appointment -> 10 DZD earned
        $appointment = $this->createAppointment();
        $this->bookingService->confirmAppointment($appointment, $this->assistantUser);

        $balanceBefore = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balanceBefore->current_balance);

        // 2. Assistant departs (membership soft deleted)
        $this->clinicAssistant->delete();

        // 3. Appointment cancelled before departure payout has been transferred
        $this->bookingService->rejectOrCancelAppointment($appointment, $this->doctorUser, 'Clinic cancelled pre-payout');

        // Check platform operational loss under Scenario C category
        $loss = PlatformOperationalLoss::where('appointment_id', $appointment->id)
            ->where('loss_category', 'post_departure_pre_payout_cancellation')
            ->first();
        $this->assertNotNull($loss);
        $this->assertEquals(10.00, (float) $loss->amount);

        // Assistant balance NOT clawed back / reduced
        $balanceAfter = AssistantRewardBalance::find($this->assistantUser->id);
        $this->assertEquals(10.00, (float) $balanceAfter->current_balance);
        $this->assertEquals(0.00, (float) $balanceAfter->total_deducted);

        // Reward marked absorbed
        $reward = AssistantReward::where('appointment_id', $appointment->id)->first();
        $this->assertEquals('absorbed', $reward->cancellation_status);
    }
}