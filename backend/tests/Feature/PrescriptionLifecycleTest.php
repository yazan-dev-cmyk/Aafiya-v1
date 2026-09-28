<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrescriptionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;

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
            'license_number' => 'DOC-7711',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء',
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
            'mrn' => 'MRN-2026-0010',
            'first_name' => 'عمر',
            'last_name' => 'مختار',
            'gender' => 'male',
            'date_of_birth' => '1980-01-01',
            'phone' => '0555001122',
        ]);
    }

    public function test_doctor_can_issue_digital_prescription_with_qr_token(): void
    {
        $items = [
            [
                'medication_name' => 'Amoxicillin',
                'dosage' => '1000mg',
                'frequency' => 'Twice daily',
                'duration' => '7 days',
                'instructions' => 'Take with meals',
            ],
            [
                'medication_name' => 'Paracetamol',
                'dosage' => '500mg',
                'frequency' => 'Every 6 hours as needed',
                'duration' => '5 days',
                'instructions' => 'Do not exceed 3000mg daily',
            ],
        ];

        $response = $this->actingAs($this->doctorUser, 'sanctum')->postJson('/api/v1/prescriptions', [
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->id,
            'validity_days' => 15,
            'notes' => 'وصفة طبية علاجية لحالة التهاب الحلق',
            'items' => $items,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonCount(2, 'data.items');

        $prescription = Prescription::first();
        $this->assertNotNull($prescription);
        $this->assertMatchesRegularExpression('/^RX-\d{4}-\d{4}$/', $prescription->prescription_reference);
        $this->assertNotEmpty($prescription->secure_token);

        // Verify public QR verification endpoint
        $verifyRes = $this->getJson("/api/v1/v/{$prescription->secure_token}");
        $verifyRes->assertStatus(200)
            ->assertJsonPath('data.is_valid', true)
            ->assertJsonPath('data.verification_status', 'active')
            ->assertJsonPath('data.prescription_reference', $prescription->prescription_reference)
            ->assertJsonPath('data.items_count', 2);
    }

    public function test_doctor_can_void_active_prescription(): void
    {
        $prescription = Prescription::create([
            'prescription_reference' => 'RX-2026-0005',
            'secure_token' => 'test-secure-token-123456789',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'issue_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(30)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/prescriptions/{$prescription->id}/void", [
            'reason' => 'تم استبدال العلاج بعد ظهور حساسية دوائية',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'voided');

        // Verification endpoint reflects voided status
        $verifyRes = $this->getJson("/api/v1/v/{$prescription->secure_token}");
        $verifyRes->assertStatus(404)
            ->assertJsonPath('data.is_valid', false)
            ->assertJsonPath('data.verification_status', 'voided');
    }

    public function test_doctor_can_save_and_retrieve_prescription_templates(): void
    {
        $items = [
            ['medication_name' => 'Ibuprofen', 'dosage' => '400mg', 'frequency' => 'TDS', 'duration' => '3 days'],
        ];

        $response = $this->actingAs($this->doctorUser, 'sanctum')->postJson('/api/v1/prescriptions/templates', [
            'template_name' => 'بروتوكول الآلام العضلية',
            'items_json' => $items,
            'is_shared' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.template_name', 'بروتوكول الآلام العضلية');

        $listRes = $this->actingAs($this->doctorUser, 'sanctum')->getJson('/api/v1/prescriptions/templates');
        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_prescriptions_list_pagination_and_meta(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            Prescription::create([
                'prescription_reference' => sprintf('RX-PAG-%04d', $i),
                'secure_token' => sprintf('token-pag-%04d-%s', $i, str_repeat('x', 32)),
                'patient_id' => $this->patient->id,
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'issue_date' => now()->subDays(25 - $i)->format('Y-m-d'),
                'expiry_date' => now()->addDays(30)->format('Y-m-d'),
                'status' => 'active',
            ]);
        }

        $page1Res = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/prescriptions?page=1&per_page=10');

        $page1Res->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonCount(10, 'data');

        $page1Ids = collect($page1Res->json('data'))->pluck('id')->toArray();

        $page2Res = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/prescriptions?page=2&per_page=10');

        $page2Res->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonCount(10, 'data');

        $page2Ids = collect($page2Res->json('data'))->pluck('id')->toArray();

        $this->assertEmpty(array_intersect($page1Ids, $page2Ids));
    }
}
