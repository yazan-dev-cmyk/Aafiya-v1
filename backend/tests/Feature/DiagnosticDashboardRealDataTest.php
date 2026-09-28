<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\DiagnosticStaff;
use App\Models\LaboratorySample;
use App\Models\Patient;
use App\Models\RadiologyReport;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DiagnosticDashboardRealDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    protected function createDiagnosticCenter(string $type = 'laboratory', string $prefix = 'ctr'): array
    {
        $role = ($type === 'radiology') ? 'radiology' : 'lab';

        $director = User::factory()->create([
            'email' => "{$prefix}_dir@example.com",
            'is_active' => true,
        ]);
        $director->assignRole($role);

        $center = DiagnosticCenter::create([
            'user_id' => $director->id,
            'name' => "Center {$prefix}",
            'type' => $type,
            'license_number' => "LIC-{$prefix}-" . uniqid(),
            'phone' => '+213550112233',
            'wilaya' => 'Algiers',
            'address' => 'Diagnostic Street 123',
            'is_active' => true,
        ]);

        return [$center, $director];
    }

    protected function createClinicAndDoctor(string $prefix = 'c'): array
    {
        [$clinic, $doctor] = $this->createClinicAndDoctor($prefix);

        $clinic = Clinic::create([
            'name' => "Clinic {$prefix}",
            'address' => 'Street 123',
            'wilaya' => 'Algiers',
            'phone' => '+213550112233',
            'director_doctor_id' => $doctor->id,
            'is_active' => true,
        ]);

        return [$clinic, $doctor];
    }

    protected function createDoctor(string $prefix = 'doc'): Doctor
    {
        $docUser = User::factory()->create(['email' => "{$prefix}_" . uniqid() . "@doctor.dz"]);
        $docUser->assignRole('doctor');

        return Doctor::create([
            'user_id' => $docUser->id,
            'license_number' => 'LIC-' . strtoupper($prefix) . '-' . uniqid(),
            'specialty' => 'General Medicine',
            'is_verified' => true,
        ]);
    }

    protected function createPatient(): Patient
    {
        return Patient::create([
            'mrn' => 'MRN-' . uniqid(),
            'first_name' => 'Ahmed',
            'last_name' => 'Benali',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '+213550000000',
        ]);
    }

    protected function createStaffMember(DiagnosticCenter $center, string $prefix = 'stf', array $permissions = []): array
    {
        $role = ($center->type === 'radiology') ? 'rad_assistant' : 'lab_assistant';

        $user = User::factory()->create([
            'email' => "{$prefix}@example.com",
            'is_active' => true,
        ]);
        $user->assignRole($role);

        $staff = DiagnosticStaff::create([
            'diagnostic_center_id' => $center->id,
            'user_id' => $user->id,
            'role_type' => 'technician',
            'permissions_json' => $permissions,
            'created_by_id' => $center->user_id,
            'is_active' => true,
        ]);

        return [$staff, $user];
    }

    /**
     * Test: UserResource /api/v1/auth/me resolves diagnostic_staff profile & center data.
     */
    public function test_auth_me_returns_diagnostic_staff_profile(): void
    {
        [$center, $director] = $this->createDiagnosticCenter('laboratory', 'lab_auth');
        [$staff, $user] = $this->createStaffMember($center, 'lab_emp_auth', ['lab.view_orders', 'lab.manage_orders']);

        $response = $this->actingAs($user)->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.diagnostic_staff.id', $staff->id)
            ->assertJsonPath('data.diagnostic_staff.diagnostic_center_id', $center->id)
            ->assertJsonPath('data.diagnostic_staff.is_active', true)
            ->assertJsonPath('data.diagnostic_staff.center.name', $center->name)
            ->assertJsonPath('data.diagnostic_staff.center.manager.name', $director->name);
    }

    /**
     * Test: Staff can retrieve their own diagnostic profile via /api/v1/diagnostic-staff/me.
     */
    public function test_diagnostic_staff_me_endpoint(): void
    {
        [$center, $director] = $this->createDiagnosticCenter('radiology', 'rad_prof');
        [$staff, $user] = $this->createStaffMember($center, 'rad_emp_prof', ['radiology.upload_images']);

        $response = $this->actingAs($user)->getJson('/api/v1/diagnostic-staff/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $staff->id)
            ->assertJsonPath('data.center.id', $center->id)
            ->assertJsonPath('data.center.type', 'radiology');
    }

    /**
     * Test Attack 1: Lab Assistant A requests Lab B orders -> Scoped strictly to Center A.
     */
    public function test_attack_1_assistant_cannot_view_other_center_orders(): void
    {
        [$centerA] = $this->createDiagnosticCenter('laboratory', 'lab_a');
        [$staffA, $userA] = $this->createStaffMember($centerA, 'lab_a_user', ['lab.view_orders']);

        [$centerB] = $this->createDiagnosticCenter('laboratory', 'lab_b');

        $patient = $this->createPatient();
        [$clinic, $doctor] = $this->createClinicAndDoctor('t1');

        // Order in Center A
        DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $centerA->id,
            'order_type' => 'laboratory',
            'priority' => 'normal',
            'status' => 'pending',
            'order_reference' => 'ORD-LAB-A',
        ]);

        // Order in Center B
        DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $centerB->id,
            'order_type' => 'laboratory',
            'priority' => 'normal',
            'status' => 'pending',
            'order_reference' => 'ORD-LAB-B',
        ]);

        $response = $this->actingAs($userA)->getJson('/api/v1/diagnostic-orders');

        $response->assertStatus(200);
        $orders = $response->json('data');
        $this->assertCount(1, $orders);
        $this->assertEquals('ORD-LAB-A', $orders[0]['order_reference']);
    }

    /**
     * Test Attack 2: Lab Assistant requests Lab B staff management -> 403 Forbidden.
     */
    public function test_attack_2_assistant_cannot_access_other_center_staff(): void
    {
        [$centerA] = $this->createDiagnosticCenter('laboratory', 'lab_a2');
        [$staffA, $userA] = $this->createStaffMember($centerA, 'lab_a2_user');

        [$centerB] = $this->createDiagnosticCenter('laboratory', 'lab_b2');

        $response = $this->actingAs($userA)->getJson("/api/v1/diagnostic-centers/{$centerB->id}/staff");

        $response->assertStatus(403);
    }

    /**
     * Test Attack 3: Radiology Assistant requests Laboratory Center analytics -> 403 Forbidden.
     */
    public function test_attack_3_rad_assistant_cannot_access_lab_center_analytics(): void
    {
        [$labCenter] = $this->createDiagnosticCenter('laboratory', 'lab_target');
        [$radCenter] = $this->createDiagnosticCenter('radiology', 'rad_source');
        [$staffRad, $userRad] = $this->createStaffMember($radCenter, 'rad_intruder');

        $response = $this->actingAs($userRad)->getJson("/api/v1/diagnostic-centers/{$labCenter->id}/analytics");

        $response->assertStatus(403);
    }

    /**
     * Test Attack 4: Suspended employee cannot access analytics or notifications -> 403 Forbidden.
     * Invariant: users.is_active remains true.
     */
    public function test_attack_4_suspended_employee_is_denied_access(): void
    {
        [$center] = $this->createDiagnosticCenter('laboratory', 'lab_susp');
        [$staff, $user] = $this->createStaffMember($center, 'lab_susp_user');

        // Suspend employee in diagnostic center
        $staff->update(['is_active' => false]);

        $this->assertTrue($user->fresh()->is_active, 'Invariant violation: users.is_active must remain untouched!');

        // Analytics blocked
        $responseAnalytics = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/analytics");
        $responseAnalytics->assertStatus(403);

        // Notifications blocked
        $responseNotifs = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/notifications");
        $responseNotifs->assertStatus(403);

        // Staff profile blocked
        $responseMe = $this->actingAs($user)->getJson('/api/v1/diagnostic-staff/me');
        $responseMe->assertStatus(403);
    }

    /**
     * Test Attack 5: Soft-deleted employee cannot access dashboard endpoints.
     */
    public function test_attack_5_soft_deleted_employee_is_blocked(): void
    {
        [$center] = $this->createDiagnosticCenter('laboratory', 'lab_del');
        [$staff, $user] = $this->createStaffMember($center, 'lab_del_user');

        $staff->delete(); // Soft delete

        $this->assertSoftDeleted('diagnostic_staff', ['id' => $staff->id]);

        $response = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/analytics");
        $response->assertStatus(403);

        $responseMe = $this->actingAs($user)->getJson('/api/v1/diagnostic-staff/me');
        $responseMe->assertStatus(404);
    }

    /**
     * Test Attack 6: Lab Assistant attempts finalize -> 403 Forbidden.
     */
    public function test_attack_6_assistant_cannot_finalize_lab_order(): void
    {
        [$center] = $this->createDiagnosticCenter('laboratory', 'lab_fin');
        [$staff, $user] = $this->createStaffMember($center, 'lab_fin_user', ['lab.enter_results']);

        $patient = $this->createPatient();
        [$clinic, $doctor] = $this->createClinicAndDoctor('t6');
        $order = DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'laboratory',
            'priority' => 'normal',
            'status' => 'received',
            'order_reference' => 'ORD-FIN-LAB',
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/diagnostic-orders/{$order->id}/finalize");

        $response->assertStatus(403);
    }

    /**
     * Test Attack 7: Radiology Assistant attempts finalize -> 403 Forbidden.
     */
    public function test_attack_7_assistant_cannot_finalize_radiology_order(): void
    {
        [$center] = $this->createDiagnosticCenter('radiology', 'rad_fin');
        [$staff, $user] = $this->createStaffMember($center, 'rad_fin_user', ['radiology.upload_images']);

        $patient = $this->createPatient();
        [$clinic, $doctor] = $this->createClinicAndDoctor('t7');
        $order = DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'radiology',
            'priority' => 'normal',
            'status' => 'received',
            'order_reference' => 'ORD-FIN-RAD',
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/diagnostic-orders/{$order->id}/finalize");

        $response->assertStatus(403);
    }

    /**
     * Test: Real Operational Analytics Calculation for Laboratory.
     */
    public function test_real_laboratory_operational_analytics_calculation(): void
    {
        [$center] = $this->createDiagnosticCenter('laboratory', 'lab_calc');
        [$staff, $user] = $this->createStaffMember($center, 'lab_calc_user');

        $patient = $this->createPatient();
        [$clinic, $doctor] = $this->createClinicAndDoctor('calc');

        // Order 1: Completed with 2 test items
        $order1 = DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'laboratory',
            'priority' => 'stat',
            'status' => 'finalized',
            'ordered_at' => now()->subMinutes(30),
            'order_reference' => 'ORD-CALC-1',
        ]);

        DiagnosticOrderItem::create([
            'diagnostic_order_id' => $order1->id,
            'test_code' => 'CBC',
            'test_name' => 'Complete Blood Count',
            'status' => 'finalized',
        ]);

        DiagnosticOrderItem::create([
            'diagnostic_order_id' => $order1->id,
            'test_code' => 'GLU',
            'test_name' => 'Fasting Blood Glucose',
            'status' => 'finalized',
        ]);

        // Order 2: Pending
        $order2 = DiagnosticOrder::create([
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'diagnostic_center_id' => $center->id,
            'order_type' => 'laboratory',
            'priority' => 'normal',
            'status' => 'pending',
            'ordered_at' => now(),
            'order_reference' => 'ORD-CALC-2',
        ]);

        // Samples: 1 received, 1 rejected
        LaboratorySample::create([
            'diagnostic_order_id' => $order1->id,
            'sample_barcode' => 'SMP-001',
            'sample_type' => 'EDTA Blood',
            'status' => 'received',
            'received_at' => now(),
        ]);

        LaboratorySample::create([
            'diagnostic_order_id' => $order2->id,
            'sample_barcode' => 'SMP-002',
            'sample_type' => 'Serum',
            'status' => 'rejected',
            'rejection_reason' => 'Hemolyzed sample',
        ]);

        $response = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/analytics");

        $response->assertStatus(200)
            ->assertJsonPath('data.total_orders', 2)
            ->assertJsonPath('data.pending_orders', 1)
            ->assertJsonPath('data.completed_orders', 1)
            ->assertJsonPath('data.stat_orders', 1)
            ->assertJsonPath('data.samples_received', 1)
            ->assertJsonPath('data.samples_rejected', 1)
            ->assertJsonPath('data.tests_completed', 2)
            ->assertJsonPath('data.acceptance_rate', 50.0);

        // Verify zero financial leakage
        $data = $response->json('data');
        $this->assertArrayNotHasKey('revenue', $data);
        $this->assertArrayNotHasKey('billing', $data);
        $this->assertArrayNotHasKey('price', $data);
        $this->assertArrayNotHasKey('total_amount', $data);
    }

    /**
     * Test: Empty center operational analytics returns truthful zeros and nulls.
     */
    public function test_empty_center_operational_analytics(): void
    {
        [$center] = $this->createDiagnosticCenter('laboratory', 'lab_empty');
        [$staff, $user] = $this->createStaffMember($center, 'lab_empty_user');

        $response = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/analytics");

        $response->assertStatus(200)
            ->assertJsonPath('data.total_orders', 0)
            ->assertJsonPath('data.pending_orders', 0)
            ->assertJsonPath('data.completed_orders', 0)
            ->assertJsonPath('data.average_tat_minutes', null)
            ->assertJsonPath('data.acceptance_rate', null)
            ->assertJsonPath('data.distribution', []);
    }

    /**
     * Test: Directives creation by Director and notification consumption by staff.
     */
    public function test_directives_and_notifications_flow(): void
    {
        [$center, $director] = $this->createDiagnosticCenter('laboratory', 'lab_dir_flow');
        [$staff, $user] = $this->createStaffMember($center, 'lab_staff_flow');

        // Director creates directive
        $directiveRes = $this->actingAs($director)->postJson("/api/v1/diagnostic-centers/{$center->id}/directives", [
            'title' => 'Important Calibration Notice',
            'content' => 'Please calibrate all Sysmex machines before 9am.',
            'priority' => 'important',
        ]);

        $directiveRes->assertStatus(201)
            ->assertJsonPath('data.title', 'Important Calibration Notice')
            ->assertJsonPath('data.recipients_count', 1);

        // Staff fetches notifications
        $notifRes = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/notifications");

        $notifRes->assertStatus(200);
        $notifs = $notifRes->json('data');
        $this->assertCount(1, $notifs);
        $this->assertEquals('Important Calibration Notice', $notifs[0]['title']);
        $this->assertFalse($notifs[0]['read']);

        $notifId = $notifs[0]['id'];

        // Mark single notification as read
        $readRes = $this->actingAs($user)->postJson("/api/v1/diagnostic-centers/{$center->id}/notifications/{$notifId}/read");
        $readRes->assertStatus(200);

        // Verify marked read
        $notifRes2 = $this->actingAs($user)->getJson("/api/v1/diagnostic-centers/{$center->id}/notifications");
        $this->assertTrue($notifRes2->json('data.0.read'));
    }

    public function test_diagnostic_centers_pagination_contract_and_page_isolation(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 25; $i++) {
            $u = User::factory()->create();
            DiagnosticCenter::create([
                'user_id' => $u->id,
                'name' => "Lab Center {$i}",
                'type' => 'laboratory',
                'license_number' => "LIC-LAB-{$i}-" . uniqid(),
                'phone' => '+213550000' . str_pad((string)$i, 2, '0', STR_PAD_LEFT),
                'wilaya' => 'Algiers',
                'address' => 'Lab Street 123',
                'is_active' => true,
            ]);
        }

        $resPage1 = $this->actingAs($user, 'sanctum')->getJson('/api/v1/diagnostic-centers?page=1&per_page=10');
        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->actingAs($user, 'sanctum')->getJson('/api/v1/diagnostic-centers?page=2&per_page=10');
        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Diagnostic Centers Page 1 and Page 2 must not overlap.');
    }
}
