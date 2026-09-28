<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\RadiologyReport;
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

class DiagnosticPrivacyVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected User $labManagerUser;
    protected DiagnosticCenter $labCenter;
    protected DiagnosticService $service;

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

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-PRIV-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء النموذجية',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021778899',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-PRIV99',
            'first_name' => 'فاطمة',
            'last_name' => 'الزهراء',
            'gender' => 'female',
            'date_of_birth' => '1995-05-05',
            'phone' => '0555998877',
        ]);

        $this->labManagerUser = User::factory()->create();
        $this->labManagerUser->roles()->attach($labRole->id);
        $this->labCenter = DiagnosticCenter::create([
            'user_id' => $this->labManagerUser->id,
            'name' => 'مخبر التحاليل الطبية المركزية',
            'type' => 'laboratory',
            'license_number' => 'LAB-9988',
            'phone' => '021445566',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'is_active' => true,
        ]);

        $this->service = app(DiagnosticService::class);
    }

    /**
     * Test 1: Created Status - metadata visible, medical results masked.
     */
    public function test_created_status_masks_results(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
                'priority' => 'routine',
            ],
            [
                ['test_name' => 'Fastening Blood Sugar', 'test_code' => 'FBS-01'],
            ],
            $this->doctorUser
        );

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'created')
            ->assertJsonPath('data.is_finalized', false)
            ->assertJsonPath('data.items.0.result_value', null)
            ->assertJsonPath('data.items.0.interpretation', null);
        $this->assertNotNull($res->json('data.privacy_notice'));
    }

    /**
     * Test 2: Received Status - metadata visible, medical results masked.
     */
    public function test_received_status_masks_results(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Complete Blood Count', 'test_code' => 'CBC-01'],
            ],
            $this->doctorUser
        );

        $order->update(['status' => 'received']);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'received')
            ->assertJsonPath('data.is_finalized', false)
            ->assertJsonPath('data.items.0.result_value', null);
        $this->assertNotNull($res->json('data.privacy_notice'));
    }

    /**
     * Test 3: Processing Status - metadata visible, medical results masked.
     */
    public function test_processing_status_masks_results(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Thyroid Stimulating Hormone', 'test_code' => 'TSH-01'],
            ],
            $this->doctorUser
        );

        $order->update(['status' => 'processing']);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.is_finalized', false)
            ->assertJsonPath('data.items.0.result_value', null);
        $this->assertNotNull($res->json('data.privacy_notice'));
    }

    /**
     * Test 4: Resulted (Draft) Status - draft lab values, ranges, and interpretation strictly hidden.
     */
    public function test_resulted_status_strictly_masks_draft_results(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Hemoglobin A1c', 'test_code' => 'HBA1C-01'],
            ],
            $this->doctorUser
        );

        $item = $order->items->first();
        $item->update([
            'result_value' => '7.8',
            'reference_range' => '4.0 - 5.6',
            'unit' => '%',
            'interpretation' => 'high',
            'status' => 'resulted',
        ]);
        $order->update(['status' => 'resulted']);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'resulted')
            ->assertJsonPath('data.is_finalized', false)
            ->assertJsonPath('data.items.0.result_value', null)
            ->assertJsonPath('data.items.0.reference_range', null)
            ->assertJsonPath('data.items.0.unit', null)
            ->assertJsonPath('data.items.0.interpretation', null);
        $this->assertNotNull($res->json('data.privacy_notice'));
    }

    /**
     * Test 5: Finalized Laboratory Order releases official results and clear privacy notice.
     */
    public function test_finalized_laboratory_order_releases_results(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Serum Creatinine', 'test_code' => 'CREAT-01'],
            ],
            $this->doctorUser
        );

        $item = $order->items->first();
        $item->update([
            'result_value' => '0.9',
            'reference_range' => '0.6 - 1.2',
            'unit' => 'mg/dL',
            'interpretation' => 'normal',
            'status' => 'finalized',
        ]);
        $order->update(['status' => 'finalized']);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'finalized')
            ->assertJsonPath('data.is_finalized', true)
            ->assertJsonPath('data.privacy_notice', null)
            ->assertJsonPath('data.items.0.result_value', '0.9')
            ->assertJsonPath('data.items.0.reference_range', '0.6 - 1.2')
            ->assertJsonPath('data.items.0.unit', 'mg/dL')
            ->assertJsonPath('data.items.0.interpretation', 'normal');
    }

    /**
     * Test 6: Finalized Radiology Order releases official findings, impression, recommendations, and reporter.
     */
    public function test_finalized_radiology_order_releases_report(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'radiology',
            ],
            [
                ['test_name' => 'Chest X-Ray PA View', 'test_code' => 'XR-CHEST-01'],
            ],
            $this->doctorUser
        );

        RadiologyReport::create([
            'diagnostic_order_id' => $order->id,
            'modality' => 'X-Ray',
            'findings' => 'Clear lung fields bilaterally. Normal cardiac silhouette.',
            'impression' => 'Normal chest radiograph.',
            'recommendations' => 'No active lung disease.',
            'status' => 'finalized',
            'reported_by_id' => $this->labManagerUser->id,
            'reported_at' => now(),
        ]);
        $order->update(['status' => 'finalized']);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.order_type', 'radiology')
            ->assertJsonPath('data.is_finalized', true)
            ->assertJsonPath('data.radiology_report.modality', 'X-Ray')
            ->assertJsonPath('data.radiology_report.findings', 'Clear lung fields bilaterally. Normal cardiac silhouette.')
            ->assertJsonPath('data.radiology_report.impression', 'Normal chest radiograph.')
            ->assertJsonPath('data.radiology_report.reported_by', $this->labManagerUser->name);
    }

    /**
     * Test 7: Absolute Data Minimization & Forbidden Fields Audit.
     */
    public function test_public_response_strictly_excludes_forbidden_fields(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Lipid Profile', 'test_code' => 'LIP-01'],
            ],
            $this->doctorUser
        );

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200);

        // Verify that internal database IDs and tokens are completely absent from JSON
        $res->assertJsonMissing(['secure_token']);
        $res->assertJsonMissing(['patient_id']);
        $res->assertJsonMissing(['doctor_id']);
        $res->assertJsonMissing(['clinic_id']);
        $res->assertJsonMissing(['diagnostic_center_id']);
        $res->assertJsonMissing(['clinical_visit_id']);
        $res->assertJsonMissing(['phone']);
        $res->assertJsonMissing(['email']);
        $res->assertJsonMissing(['national_id']);
        $res->assertJsonMissing(['date_of_birth']);
        $res->assertJsonMissing(['blood_group']);
        $res->assertJsonMissing(['password']);
    }

    /**
     * Test 8: Null-Safety - Order with missing optional relations serializes cleanly with HTTP 200.
     */
    public function test_null_safety_with_missing_relations(): void
    {
        // Create an order without diagnostic_center or items
        $order = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-NULL01',
            'secure_token' => Str::random(64),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'diagnostic_center_id' => null,
            'order_type' => 'laboratory',
            'status' => 'created',
            'ordered_at' => now(),
        ]);

        $res = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");

        $res->assertStatus(200)
            ->assertJsonPath('data.order_reference', 'ORD-2026-NULL01')
            ->assertJsonPath('data.diagnostic_center', null)
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.radiology_report', null);
    }

    /**
     * Test 9: Rate limiter throttles excessive verification requests (30 requests/min).
     */
    public function test_rate_limiter_throttles_excessive_diagnostic_verification_requests(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'diagnostic_center_id' => $this->labCenter->id,
                'order_type' => 'laboratory',
            ],
            [
                ['test_name' => 'Routine Check', 'test_code' => 'RC-01'],
            ],
            $this->doctorUser
        );

        // 30 allowed requests
        for ($i = 0; $i < 30; $i++) {
            $response = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");
            $this->assertEquals(200, $response->status(), "Request {$i} failed");
        }

        // 31st request must be throttled with HTTP 429
        $throttled = $this->getJson("/api/v1/diagnostics/verify/{$order->secure_token}");
        $throttled->assertStatus(429)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 429);
    }
}
