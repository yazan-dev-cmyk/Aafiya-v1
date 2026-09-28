<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\LaboratorySample;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiagnosticOrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected User $labManagerUser;
    protected DiagnosticCenter $labCenter;
    protected User $labAssistantUser;
    protected DiagnosticStaff $labAssistant;

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

        // 1. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب باطني',
            'license_number' => 'DOC-9090',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'العيادة التخصصية',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021990011',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Patient
        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-0020',
            'first_name' => 'حمزة',
            'last_name' => 'درويش',
            'gender' => 'male',
            'date_of_birth' => '1991-09-09',
            'phone' => '0555887766',
        ]);

        // 3. Laboratory Center & Staff
        $this->labManagerUser = User::factory()->create();
        $this->labManagerUser->roles()->attach($labRole->id);
        $this->labCenter = DiagnosticCenter::create([
            'user_id' => $this->labManagerUser->id,
            'name' => 'مخبر التحاليل الطبية الدقيقة',
            'type' => 'laboratory',
            'license_number' => 'LAB-1234',
            'phone' => '021334455',
            'address' => 'شارع حسيبة بن بوعلي',
            'wilaya' => 'الجزائر',
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
    }

    public function test_complete_diagnostic_order_lifecycle(): void
    {
        // 1. Doctor issues order
        $orderRes = $this->actingAs($this->doctorUser, 'sanctum')->postJson('/api/v1/diagnostic-orders', [
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->id,
            'order_type' => 'laboratory',
            'clinical_indication' => 'اشتباه فقر دم ونقص حديد',
            'priority' => 'routine',
            'items' => [
                ['test_name' => 'CBC (Complete Blood Count)', 'test_code' => 'CBC-01'],
                ['test_name' => 'Serum Ferritin', 'test_code' => 'FER-02'],
            ],
        ]);

        $orderRes->assertStatus(201)
            ->assertJsonPath('data.status', 'created')
            ->assertJsonCount(2, 'data.items');

        $orderId = $orderRes->json('data.id');
        $order = DiagnosticOrder::find($orderId);
        $this->assertMatchesRegularExpression('/^ORD-\d{4}-\d{4}$/', $order->order_reference);

        // 2. Lab receives order
        $receiveRes = $this->actingAs($this->labAssistantUser, 'sanctum')->postJson("/api/v1/diagnostic-orders/{$orderId}/receive", [
            'diagnostic_center_id' => $this->labCenter->id,
        ]);
        $receiveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'received');

        // 3. Lab collects sample
        $sampleRes = $this->actingAs($this->labAssistantUser, 'sanctum')->postJson("/api/v1/diagnostic-orders/{$orderId}/samples", [
            'sample_type' => 'blood_edta',
        ]);
        $sampleRes->assertStatus(201)
            ->assertJsonPath('data.status', 'collected')
            ->assertJsonPath('data.sample_type', 'blood_edta');

        $sample = LaboratorySample::first();
        $this->assertMatchesRegularExpression('/^SMP-\d{4}-\d{4}$/', $sample->sample_barcode);

        // 4. Lab Assistant enters test result for item 1 (Resulted / Draft)
        $item1 = $order->items->first();
        $resultRes = $this->actingAs($this->labAssistantUser, 'sanctum')->postJson("/api/v1/diagnostic-order-items/{$item1->id}/result", [
            'result_value' => '10.5',
            'reference_range' => '13.0 - 17.0',
            'unit' => 'g/dL',
            'interpretation' => 'abnormal',
            'notes' => 'فقر دم خفيف',
        ]);
        $resultRes->assertStatus(200)
            ->assertJsonPath('data.status', 'resulted');

        // 5. Lab Manager signs off and finalizes the order
        $finalizeRes = $this->actingAs($this->labManagerUser, 'sanctum')->postJson("/api/v1/diagnostic-orders/{$orderId}/finalize");
        $finalizeRes->assertStatus(200)
            ->assertJsonPath('data.status', 'finalized')
            ->assertJsonPath('data.is_finalized', true);

        $order->refresh();
        $this->assertEquals('finalized', $order->status);
        $this->assertEquals('finalized', $order->items()->first()->status);
    }

    public function test_diagnostic_orders_list_pagination_and_meta(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            DiagnosticOrder::create([
                'patient_id' => $this->patient->id,
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
                'priority' => 'routine',
                'status' => 'pending',
                'order_reference' => sprintf('ORD-PAG-%04d', $i),
                'ordered_at' => now()->subMinutes(25 - $i),
            ]);
        }

        $page1Res = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?order_type=laboratory&page=1&per_page=20');

        $page1Res->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonCount(20, 'data');

        $page1Ids = collect($page1Res->json('data'))->pluck('id')->toArray();

        $page2Res = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?order_type=laboratory&page=2&per_page=20');

        $page2Res->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonCount(5, 'data');

        $page2Ids = collect($page2Res->json('data'))->pluck('id')->toArray();

        $this->assertEmpty(array_intersect($page1Ids, $page2Ids));
    }
}
