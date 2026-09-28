<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\DiagnosticOrder;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Services\DiagnosticService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CrossContextRejectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected DiagnosticOrder $diagnosticOrder;
    protected Prescription $prescription;
    protected Appointment $appointment;

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

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-CROSS-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الأمان السريري',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021556677',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-CROSS01',
            'first_name' => 'طارق',
            'last_name' => 'زياد',
            'gender' => 'male',
            'date_of_birth' => '1988-08-08',
            'phone' => '0555667788',
        ]);

        // 1. Diagnostic Order
        $this->diagnosticOrder = app(DiagnosticService::class)->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Urea', 'test_code' => 'UREA-01'],
            ],
            $this->doctorUser
        );

        // 2. Prescription
        $this->prescription = Prescription::create([
            'prescription_reference' => 'RX-2026-CROSS01',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'issue_date' => now()->toDateString(),
            'expiry_date' => now()->addMonths(3)->toDateString(),
            'status' => 'active',
        ]);

        // 3. Appointment
        $this->appointment = Appointment::create([
            'booking_reference' => 'MS-2026-CROSS01',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->full_name,
            'patient_mrn' => $this->patient->mrn,
            'patient_phone' => $this->patient->phone,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'confirmed',
            'creator_type' => 'patient_registered',
            'created_by_id' => $this->doctorUser->id,
        ]);
    }

    /**
     * Scenario 1: Diagnostic Token sent to Prescription public verification endpoint must fail with 404.
     */
    public function test_diagnostic_token_rejected_by_prescription_endpoint(): void
    {
        $this->getJson("/api/v1/v/{$this->diagnosticOrder->secure_token}")
            ->assertStatus(404);
    }

    /**
     * Scenario 2: Diagnostic Token sent to Appointment Check-in endpoint must fail safely.
     */
    public function test_diagnostic_token_rejected_by_appointment_checkin(): void
    {
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();
        $assistantUser = User::factory()->create();
        $assistantUser->roles()->attach($assistantRole->id);

        $res = $this->actingAs($assistantUser, 'sanctum')->postJson('/api/v1/appointments/check-in', [
            'token' => $this->diagnosticOrder->secure_token,
        ]);

        $res->assertStatus(422);
    }

    /**
     * Scenario 3: Prescription Token sent to Diagnostic public endpoint must fail with 404.
     */
    public function test_prescription_token_rejected_by_diagnostic_endpoint(): void
    {
        $this->getJson("/api/v1/diagnostics/verify/{$this->prescription->secure_token}")
            ->assertStatus(404);
    }

    /**
     * Scenario 4: Appointment Token sent to Diagnostic public endpoint must fail with 404.
     */
    public function test_appointment_token_rejected_by_diagnostic_endpoint(): void
    {
        $this->getJson("/api/v1/diagnostics/verify/{$this->appointment->secure_token}")
            ->assertStatus(404);
    }

    /**
     * Scenario 5: Patient MRN sent to Diagnostic public endpoint must fail with 404.
     */
    public function test_patient_mrn_rejected_by_diagnostic_endpoint(): void
    {
        $this->getJson("/api/v1/diagnostics/verify/{$this->patient->mrn}")
            ->assertStatus(404);
    }

    /**
     * Scenario 6: Random/malformed string rejected by Diagnostic endpoint with 404.
     */
    public function test_random_string_rejected_by_diagnostic_endpoint(): void
    {
        $this->getJson('/api/v1/diagnostics/verify/NOT_A_VALID_TOKEN')
            ->assertStatus(404);
    }
}
