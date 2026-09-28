<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DiagnosticOrderUnifiedSearchTest extends TestCase
{
    use DatabaseTransactions;

    protected User $labManagerUser;
    protected DiagnosticCenter $labCenter;
    protected User $labAssistantUser;
    protected DiagnosticStaff $labAssistant;

    protected User $radManagerUser;
    protected DiagnosticCenter $radCenter;
    protected User $radAssistantUser;
    protected DiagnosticStaff $radAssistant;

    protected User $otherLabManagerUser;
    protected DiagnosticCenter $otherLabCenter;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;

    protected Patient $patientA;
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
        $labRole = Role::where('name', 'lab')->firstOrFail();
        $labAssistantRole = Role::where('name', 'lab_assistant')->firstOrFail();
        $radRole = Role::where('name', 'radiology')->firstOrFail();
        $radAssistantRole = Role::where('name', 'rad_assistant')->firstOrFail();

        // Doctor & Clinic
        $this->doctorUser = User::factory()->create(['name' => 'د. أحمد محمود']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-SEARCH-001',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة البحث الموحد',
            'email' => 'clinic-search@test.local',
            'phone' => '0500000001',
            'address' => 'شارع الملك فهد',
            'city' => 'الرياض',
            'wilaya' => 'الرياض',
            'license_number' => 'CLN-SEARCH-001',
            'is_active' => true,
        ]);

        // Patients
        $patientUserA = User::factory()->create(['name' => 'خالد علي']);
        $this->patientA = Patient::create([
            'user_id' => $patientUserA->id,
            'first_name' => 'خالد',
            'last_name' => 'علي',
            'phone' => '0599112233',
            'mrn' => 'MRN-SEARCH-001',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
        ]);

        $patientUserB = User::factory()->create(['name' => 'سارة حسن']);
        $this->patientB = Patient::create([
            'user_id' => $patientUserB->id,
            'first_name' => 'سارة',
            'last_name' => 'حسن',
            'phone' => '0599445566',
            'mrn' => 'MRN-SEARCH-002',
            'gender' => 'female',
            'date_of_birth' => '1995-05-05',
        ]);

        // Lab Center 1
        $this->labManagerUser = User::factory()->create(['name' => 'مدير المختبر الرئيسي']);
        $this->labManagerUser->roles()->attach($labRole->id);
        $this->labCenter = DiagnosticCenter::create([
            'user_id' => $this->labManagerUser->id,
            'name' => 'مختبر الأمل المركزي',
            'type' => 'laboratory',
            'phone' => '0112223334',
            'address' => 'شارع المختبر الرئيسي',
            'wilaya' => 'الرياض',
            'is_active' => true,
        ]);

        $this->labAssistantUser = User::factory()->create(['name' => 'مساعد المختبر الرئيسي']);
        $this->labAssistantUser->roles()->attach($labAssistantRole->id);
        $this->labAssistant = DiagnosticStaff::create([
            'user_id' => $this->labAssistantUser->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'role_type' => 'assistant',
            'created_by_id' => $this->labManagerUser->id,
            'is_active' => true,
        ]);

        // Lab Center 2 (Isolated)
        $this->otherLabManagerUser = User::factory()->create(['name' => 'مدير مختبر آخر']);
        $this->otherLabManagerUser->roles()->attach($labRole->id);
        $this->otherLabCenter = DiagnosticCenter::create([
            'user_id' => $this->otherLabManagerUser->id,
            'name' => 'مختبر النور المستقل',
            'type' => 'laboratory',
            'phone' => '0119998887',
            'address' => 'شارع المختبر الثاني',
            'wilaya' => 'جدة',
            'is_active' => true,
        ]);

        // Radiology Center
        $this->radManagerUser = User::factory()->create(['name' => 'مدير الأشعة']);
        $this->radManagerUser->roles()->attach($radRole->id);
        $this->radCenter = DiagnosticCenter::create([
            'user_id' => $this->radManagerUser->id,
            'name' => 'مركز الأشعة المتقدم',
            'type' => 'radiology',
            'phone' => '0113334445',
            'address' => 'شارع الأشعة',
            'wilaya' => 'الرياض',
            'is_active' => true,
        ]);

        $this->radAssistantUser = User::factory()->create(['name' => 'مساعد الأشعة']);
        $this->radAssistantUser->roles()->attach($radAssistantRole->id);
        $this->radAssistant = DiagnosticStaff::create([
            'user_id' => $this->radAssistantUser->id,
            'diagnostic_center_id' => $this->radCenter->id,
            'role_type' => 'assistant',
            'created_by_id' => $this->radManagerUser->id,
            'is_active' => true,
        ]);
    }

    public function test_search_by_exact_order_reference(): void
    {
        $order = DiagnosticOrder::create([
            'order_reference' => 'ORD-REF-1001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=ORD-REF-1001');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $order->id);
    }

    public function test_search_by_partial_order_reference(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-REF-9999',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=REF-999');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_by_patient_first_name(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-P-FIRST',
            'patient_id' => $this->patientA->id, // خالد
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=خالد');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_by_patient_last_name(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-P-LAST',
            'patient_id' => $this->patientB->id, // حسن
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=حسن');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_by_patient_mrn(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-MRN',
            'patient_id' => $this->patientA->id, // MRN-SEARCH-001
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=MRN-SEARCH-001');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_by_patient_canonical_phone(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-PHONE',
            'patient_id' => $this->patientA->id, // 0599112233
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=0599112233');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_by_doctor_name(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-DOC',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id, // د. أحمد محمود
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=أحمد');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_with_pagination(): void
    {
        for ($i = 1; $i <= 15; $i++) {
            DiagnosticOrder::create([
                'order_reference' => sprintf('ORD-PAG-%02d', $i),
                'patient_id' => $this->patientA->id,
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
                'status' => 'pending',
                'ordered_at' => now(),
            ]);
        }

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=ORD-PAG&page=2&per_page=10');

        $response->assertStatus(200);
        $response->assertJsonCount(5, 'data');
        $response->assertJsonPath('meta.current_page', 2);
        $response->assertJsonPath('meta.total', 15);
    }

    public function test_search_combined_with_status_filter(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-PENDING-MATCH',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        DiagnosticOrder::create([
            'order_reference' => 'ORD-COMPLETED-MATCH',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'completed',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=MATCH&status=pending');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.order_reference', 'ORD-PENDING-MATCH');
    }

    public function test_search_combined_with_order_type_filter(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-LAB-TYPE',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=TYPE&order_type=laboratory');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_center_isolation_for_lab_manager_during_search(): void
    {
        // Order in Center 1
        DiagnosticOrder::create([
            'order_reference' => 'ORD-CENTER-1',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        // Order in Center 2 (Other manager)
        DiagnosticOrder::create([
            'order_reference' => 'ORD-CENTER-2',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->otherLabCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        // Manager of Center 1 searches for ORD-CENTER
        $response = $this->actingAs($this->labManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=ORD-CENTER');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.order_reference', 'ORD-CENTER-1');
    }

    public function test_center_isolation_for_lab_assistant_during_search(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-CENTER-1-AST',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        DiagnosticOrder::create([
            'order_reference' => 'ORD-CENTER-2-AST',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->otherLabCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labAssistantUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=ORD-CENTER');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.order_reference', 'ORD-CENTER-1-AST');
    }

    public function test_radiology_manager_search_isolation(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-RAD-001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->radCenter->id,
            'order_type' => 'radiology',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->radManagerUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=RAD-001');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_radiology_assistant_search_isolation(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-RAD-AST-001',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->radCenter->id,
            'order_type' => 'radiology',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->radAssistantUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=RAD-AST');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_inactive_assistant_returns_empty_results_even_with_search(): void
    {
        $this->labAssistant->update(['is_active' => false]);

        DiagnosticOrder::create([
            'order_reference' => 'ORD-INACTIVE-AST',
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => $this->labCenter->id,
            'order_type' => 'laboratory',
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->labAssistantUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=INACTIVE');

        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data');
    }

    public function test_unverified_doctor_search_returns_403(): void
    {
        $this->doctor->update(['is_verified' => false]);

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?search=anything');

        $response->assertStatus(403);
    }
}
