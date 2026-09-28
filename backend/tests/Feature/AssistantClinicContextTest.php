<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantClinicContextTest extends TestCase
{
    use RefreshDatabase;

    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Doctor $doctorA;
    protected User $doctorUserA;
    protected string $assistantToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(RolePermissionSeeder::class);

        // 1. Create Clinic A
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء الاختبارية 01',
            'address' => 'شارع ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '+213550111111',
            'is_active' => true,
        ]);

        // 2. Create Clinic B (Foreign Clinic)
        $this->clinicB = Clinic::create([
            'name' => 'عيادة الأمل الخارجية 02',
            'address' => 'نهج بن بولعيد، وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550222222',
            'is_active' => true,
        ]);

        // 3. Create Doctor in Clinic A
        $this->doctorUserA = User::factory()->create([
            'email' => 'doc.a@aafiya.dz',
            'is_active' => true,
        ]);
        $this->doctorUserA->assignRole('doctor');

        $this->doctorA = Doctor::create([
            'user_id' => $this->doctorUserA->id,
            'license_number' => 'DOC-A-001',
            'specialty' => 'General Medicine',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 4. Create Assistant affiliated strictly with Clinic A
        $this->assistantUser = User::factory()->create([
            'name' => 'مساعد الاستقبال',
            'email' => 'assistant.a@aafiya.dz',
            'password' => bcrypt('Secret123!'),
            'is_active' => true,
        ]);
        $this->assistantUser->assignRole('doctor_assistant');

        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinicA->id,
            'permissions_json' => ['appointments.view', 'appointments.create', 'patients.view'],
            'created_by_id' => $this->doctorUserA->id,
            'is_active' => true,
        ]);

        $this->assistantToken = $this->assistantUser->createToken('assistant-token')->plainTextToken;
    }

    /**
     * Test 1: Active assistant receives authoritative single clinic and clinics array in auth/me and login.
     */
    public function test_active_assistant_receives_single_clinic_in_auth_payload_and_me(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk();
        $response->assertJsonPath('data.clinic.id', $this->clinicA->id);
        $response->assertJsonPath('data.clinic.name', 'عيادة الشفاء الاختبارية 01');
        $response->assertJsonPath('data.clinic.position', 'assistant');
        $response->assertJsonPath('data.clinic.is_director', false);

        $clinics = $response->json('data.clinics');
        $this->assertIsArray($clinics);
        $this->assertCount(1, $clinics);
        $this->assertEquals($this->clinicA->id, $clinics[0]['id']);
        $this->assertEquals('assistant', $clinics[0]['position']);
        $this->assertTrue($clinics[0]['is_active']);
        $this->assertTrue($clinics[0]['is_primary']);
    }

    /**
     * Test 2: Inactive assistant affiliation returns clinic: null and clinics: [] in auth/me.
     */
    public function test_inactive_assistant_receives_null_clinic_and_empty_clinics_in_auth_me(): void
    {
        $this->assistant->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk();
        $response->assertJsonPath('data.clinic', null);
        $this->assertSame([], $response->json('data.clinics'));
    }

    /**
     * Test 3: Assistant with inactive clinic returns clinic: null and clinics: [].
     */
    public function test_assistant_with_inactive_clinic_receives_null_clinic_and_empty_clinics(): void
    {
        $this->clinicA->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk();
        $response->assertJsonPath('data.clinic', null);
        $this->assertSame([], $response->json('data.clinics'));
    }

    /**
     * Test 4: Middleware binds authoritative active clinic context for assistant on protected routes.
     */
    public function test_middleware_binds_active_clinic_context_for_assistant_on_protected_routes(): void
    {
        // Calling /appointments without any X-Clinic-ID header succeeds and uses clinicA
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');

        $response->assertOk();
    }

    /**
     * Test 5: Forged foreign X-Clinic-ID is rejected with 403.
     */
    public function test_middleware_rejects_foreign_x_clinic_id_with_403(): void
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->assistantToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/appointments');

        $response->assertStatus(403);
        $response->assertJson([
            'status' => 'error',
            'code' => 403,
            'message' => 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.',
        ]);
    }

    /**
     * Test 6: Forged foreign clinic_id in request query is rejected with 403.
     */
    public function test_middleware_rejects_foreign_clinic_id_input_with_403(): void
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->assistantToken,
        ])->getJson('/api/v1/appointments?clinic_id=' . $this->clinicB->id);

        $response->assertStatus(403);
        $response->assertJson([
            'status' => 'error',
            'code' => 403,
            'message' => 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.',
        ]);
    }

    /**
     * Test 7: Suspended/inactive assistant is rejected on protected routes with 403 fail-closed.
     */
    public function test_middleware_rejects_inactive_assistant_on_protected_routes_with_403(): void
    {
        $this->assistant->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');

        $response->assertStatus(403);
        $response->assertJson([
            'status' => 'error',
            'code' => 403,
            'message' => 'غير مصرح: حساب المساعد غير نشط أو غير مرتبط بعيادة.',
        ]);
    }

    /**
     * Test 8: Assistant associated with an inactive clinic is rejected on protected routes with 403 fail-closed.
     */
    public function test_middleware_rejects_assistant_with_inactive_clinic_on_protected_routes_with_403(): void
    {
        $this->clinicA->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');

        $response->assertStatus(403);
        $response->assertJson([
            'status' => 'error',
            'code' => 403,
            'message' => 'غير مصرح: العيادة المرتبطة بالمساعد غير نشطة.',
        ]);
    }

    /**
     * Test 9: Assistant creates appointment for their own clinic (201 Created).
     */
    public function test_assistant_creates_appointment_for_own_clinic_successfully(): void
    {
        $payload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'patient_name' => 'أحمد بلقاسم',
            'patient_phone' => '+213555123456',
            'notes' => 'حجز حضوري في الاستقبال',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.clinic.id', $this->clinicA->id);
        $response->assertJsonPath('data.doctor.id', $this->doctorA->id);
        $response->assertJsonPath('data.creator_type', 'clinic_assistant');

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'patient_phone' => '+213555123456',
            'creator_type' => 'clinic_assistant',
        ]);
    }

    /**
     * Test 10: Assistant cannot create appointment for a foreign clinic (403 Forbidden).
     */
    public function test_assistant_cannot_create_appointment_for_foreign_clinic_returns_403(): void
    {
        $payload = [
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'patient_name' => 'أحمد بلقاسم',
            'patient_phone' => '+213555123456',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(403);
    }

    /**
     * Test 11: Doctor multi-clinic behavior remains completely intact and unaffected.
     */
    public function test_doctor_multi_clinic_context_remains_intact(): void
    {
        // Doctor associated with Clinic A and Clinic B
        DoctorClinic::create([
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
        ]);

        $doctorToken = $this->doctorUserA->createToken('doc-token')->plainTextToken;

        // With Clinic A header
        $responseA = $this->withHeaders([
            'Authorization' => 'Bearer ' . $doctorToken,
            'X-Clinic-ID' => $this->clinicA->id,
        ])->getJson('/api/v1/appointments');
        $responseA->assertOk();

        // With Clinic B header
        $responseB = $this->withHeaders([
            'Authorization' => 'Bearer ' . $doctorToken,
            'X-Clinic-ID' => $this->clinicB->id,
        ])->getJson('/api/v1/appointments');
        $responseB->assertOk();

        // With Unaffiliated Clinic (should fail 403)
        $unaffiliatedClinic = Clinic::create([
            'name' => 'عيادة غير منتسبة',
            'address' => 'نهج الأمير عبد القادر، قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '+213550333333',
            'is_active' => true,
        ]);

        $responseUnaffiliated = $this->withHeaders([
            'Authorization' => 'Bearer ' . $doctorToken,
            'X-Clinic-ID' => $unaffiliatedClinic->id,
        ])->getJson('/api/v1/appointments');
        $responseUnaffiliated->assertStatus(403);
    }
}
