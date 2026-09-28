<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiagnosticPrivacyScopingTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $patientUser;
    protected Patient $patient;
    protected User $labManagerUser;
    protected DiagnosticCenter $labCenter;
    protected User $labAssistantUser;
    protected DiagnosticStaff $labAssistant;
    protected DiagnosticOrder $order;
    protected DiagnosticOrderItem $item;

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
        $labRole = Role::where('name', 'lab')->firstOrFail();
        $assistantRole = Role::where('name', 'lab_assistant')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        // 1. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-4455',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الأمل',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '041556677',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Patient
        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-0030',
            'first_name' => 'نور الهدى',
            'last_name' => 'مقداد',
            'gender' => 'female',
            'date_of_birth' => '1996-06-16',
            'phone' => '0555332211',
        ]);

        // 3. Laboratory Center & Staff
        $this->labManagerUser = User::factory()->create();
        $this->labManagerUser->roles()->attach($labRole->id);
        $this->labCenter = DiagnosticCenter::create([
            'user_id' => $this->labManagerUser->id,
            'name' => 'مخبر وهران للتحاليل الطبية',
            'type' => 'laboratory',
            'phone' => '041889900',
            'address' => 'شارع الأمير عبد القادر',
            'wilaya' => 'وهران',
            'is_active' => true,
        ]);

        $this->labAssistantUser = User::factory()->create();
        $this->labAssistantUser->roles()->attach($assistantRole->id);
        $this->labAssistant = DiagnosticStaff::create([
            'diagnostic_center_id' => $this->labCenter->id,
            'user_id' => $this->labAssistantUser->id,
            'role_type' => 'assistant',
            'is_active' => true,
            'created_by_id' => $this->labManagerUser->id,
        ]);

        // 4. Create Diagnostic Order & Item in resulted status
        $this->order = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-0050',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'resulted',
            'ordered_at' => now(),
        ]);

        $this->item = DiagnosticOrderItem::create([
            'diagnostic_order_id' => $this->order->id,
            'test_name' => 'Fastening Blood Glucose',
            'test_code' => 'GLU-01',
            'status' => 'resulted',
            'result_value' => '1.85',
            'reference_range' => '0.70 - 1.10',
            'unit' => 'g/L',
            'interpretation' => 'abnormal',
            'notes' => 'ارتفاع ملحوظ في نسبة السكر',
        ]);
    }

    public function test_treating_doctor_cannot_view_draft_resulted_values_until_finalized(): void
    {
        // P6 Section 7 Invariant: Treating Doctor MUST NOT see resulted draft values!
        $response = $this->actingAs($this->doctorUser, 'sanctum')->getJson("/api/v1/diagnostic-orders/{$this->order->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.items.0.status', 'resulted')
            ->assertJsonPath('data.items.0.result_value', null) // Masked!
            ->assertJsonPath('data.items.0.interpretation', null) // Masked!
            ->assertJsonPath('data.items.0.unit', null); // Masked!
    }

    public function test_patient_cannot_view_draft_resulted_values_until_finalized(): void
    {
        // P6 Section 7 Invariant: Patient MUST NOT see resulted draft values!
        $response = $this->actingAs($this->patientUser, 'sanctum')->getJson("/api/v1/diagnostic-orders/{$this->order->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.items.0.status', 'resulted')
            ->assertJsonPath('data.items.0.result_value', null) // Masked!
            ->assertJsonPath('data.items.0.interpretation', null); // Masked!
    }

    public function test_lab_staff_can_view_draft_resulted_values(): void
    {
        $response = $this->actingAs($this->labAssistantUser, 'sanctum')->getJson("/api/v1/diagnostic-orders/{$this->order->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.items.0.result_value', '1.85') // Visible internally!
            ->assertJsonPath('data.items.0.interpretation', 'abnormal');
    }

    public function test_after_finalization_results_are_released_to_doctor_and_patient(): void
    {
        // Finalize order by Lab Manager
        $this->actingAs($this->labManagerUser, 'sanctum')->postJson("/api/v1/diagnostic-orders/{$this->order->id}/finalize")->assertStatus(200);

        // Doctor now sees official finalized results
        $docRes = $this->actingAs($this->doctorUser, 'sanctum')->getJson("/api/v1/diagnostic-orders/{$this->order->id}");
        $docRes->assertStatus(200)
            ->assertJsonPath('data.status', 'finalized')
            ->assertJsonPath('data.items.0.status', 'finalized')
            ->assertJsonPath('data.items.0.result_value', '1.85') // Released!
            ->assertJsonPath('data.items.0.interpretation', 'abnormal');

        // Patient now sees official finalized results
        $patRes = $this->actingAs($this->patientUser, 'sanctum')->getJson("/api/v1/diagnostic-orders/{$this->order->id}");
        $patRes->assertStatus(200)
            ->assertJsonPath('data.items.0.result_value', '1.85'); // Released!
    }
}
