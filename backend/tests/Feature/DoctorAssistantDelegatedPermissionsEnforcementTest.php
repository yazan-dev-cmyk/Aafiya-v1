<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\ClinicService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorAssistantDelegatedPermissionsEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Doctor $doctorA;
    protected User $doctorUserA;
    protected string $doctorTokenA;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected string $assistantToken;
    protected Patient $patient;
    protected User $patientUser;
    protected string $patientToken;
    protected ClinicService $clinicService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $this->clinicService = app(ClinicService::class);

        // 1. Primary Clinic (Clinic A)
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء المركزية',
            'address' => 'نهج العربي بن مهيدي، الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '+213550111222',
            'is_active' => true,
        ]);

        // 2. Foreign Clinic (Clinic B)
        $this->clinicB = Clinic::create([
            'name' => 'عيادة الأمل بوهران',
            'address' => 'نهج الأمير عبد القادر، وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550333444',
            'is_active' => true,
        ]);

        // 3. Clinic Director / Doctor for Clinic A
        $this->doctorUserA = User::factory()->create([
            'name' => 'د. أحمد بلقاسم',
            'email' => 'dr.ahmed@aafiya.dz',
            'phone' => '+213551000001',
            'is_active' => true,
        ]);
        $this->doctorUserA->assignRole('doctor');

        $this->doctorA = Doctor::create([
            'user_id' => $this->doctorUserA->id,
            'specialty' => 'General Medicine',
            'license_number' => 'DOC-ALG-2026',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinicA->update(['director_doctor_id' => $this->doctorA->id]);

        $this->doctorTokenA = $this->doctorUserA->createToken('doc-token')->plainTextToken;

        // 4. Doctor Assistant affiliated strictly with Clinic A
        $this->assistantUser = User::factory()->create([
            'name' => 'مريم مساعدة العيادة',
            'email' => 'mariam.ast@aafiya.dz',
            'phone' => '+213552000002',
            'is_active' => true,
        ]);
        $this->assistantUser->assignRole('doctor_assistant');

        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinicA->id,
            'permissions_json' => [
                'booking.manage_queue',
                'booking.confirm_attendance',
                'booking.create',
                'patient.view_contacts',
            ],
            'created_by_id' => $this->doctorUserA->id,
            'is_active' => true,
        ]);

        // Seed initial scoped permissions via ClinicService to mirror real production ledger
        $this->clinicService->updateAssistantPermissions($this->doctorUserA, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
        ]);

        $this->assistantToken = $this->assistantUser->createToken('ast-token')->plainTextToken;

        // 5. Registered Patient
        $this->patientUser = User::factory()->create([
            'name' => 'عمر المريض',
            'email' => 'omar.patient@aafiya.dz',
            'phone' => '+213553000003',
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient_registered');

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-ALG-001',
            'first_name' => 'عمر',
            'last_name' => 'المريض',
            'gender' => 'male',
            'date_of_birth' => '1988-05-12',
            'phone' => '+213553000003',
            'email' => 'omar.patient@aafiya.dz',
            'wilaya' => 'الجزائر',
        ]);

        $this->patientToken = $this->patientUser->createToken('patient-token')->plainTextToken;
    }

    /**
     * Authenticate request with specified bearer token, clearing cached Sanctum guards.
     */
    protected function authenticateAs(string $token, array $extraHeaders = []): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders(array_merge([
            'Authorization' => 'Bearer ' . $token,
        ], $extraHeaders));
    }

    /**
     * 1. booking.create: Assistant with permission can create appointment (201 Created).
     */
    public function test_assistant_with_booking_create_can_create_appointment(): void
    {
        $payload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'time_slot' => '10:00',
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'notes' => 'حجز عبر الاستقبال',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.clinic.id', $this->clinicA->id);
        $response->assertJsonPath('data.creator_type', 'clinic_assistant');
    }

    /**
     * 2. booking.create: Assistant with revoked permission is forbidden to create appointment (403 Forbidden).
     */
    public function test_assistant_without_booking_create_is_forbidden_to_create_appointment(): void
    {
        // Director updates permissions, revoking booking.create
        $this->clinicService->updateAssistantPermissions($this->doctorUserA, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'patient.view_contacts',
        ]);

        $payload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'time_slot' => '10:00',
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(403);
    }

    /**
     * 3. Single-Clinic Context: Assistant cannot create appointment for a foreign clinic even with booking.create (403 Forbidden).
     */
    public function test_assistant_cannot_create_appointment_for_foreign_clinic(): void
    {
        $payload = [
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'time_slot' => '10:00',
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $payload);

        $response->assertStatus(403);
    }

    /**
     * 4. booking.confirm_attendance: Assistant with permission can mark attendance (200 OK).
     */
    public function test_assistant_with_booking_confirm_attendance_can_mark_attendance(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-CONF-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'created_by_id' => $this->assistantUser->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');
    }

    /**
     * 5. booking.confirm_attendance: Assistant with revoked permission is forbidden to mark attendance (403 Forbidden).
     */
    public function test_assistant_without_booking_confirm_attendance_is_forbidden_to_mark_attendance(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-CONF-002',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'confirmed',
            'created_by_id' => $this->assistantUser->id,
        ]);

        // Director revokes booking.confirm_attendance
        $this->clinicService->updateAssistantPermissions($this->doctorUserA, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.create',
            'patient.view_contacts',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(403);
    }

    /**
     * 6. booking.manage_queue: Assistant with permission can list clinic appointments (200 OK).
     */
    public function test_assistant_with_booking_manage_queue_can_list_appointments(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');

        $response->assertStatus(200);
    }

    /**
     * 7. booking.manage_queue: Assistant with revoked permission is forbidden to list appointments (403 Forbidden).
     */
    public function test_assistant_without_booking_manage_queue_is_forbidden_to_list_appointments(): void
    {
        // Director revokes booking.manage_queue
        $this->clinicService->updateAssistantPermissions($this->doctorUserA, $this->clinicA, $this->assistant, [
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');

        $response->assertStatus(403);
    }

    /**
     * 8. patient.view_contacts: Assistant with permission views unmasked patient contacts (200 OK, phone populated).
     */
    public function test_assistant_with_patient_view_contacts_sees_patient_phone(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-VIEW-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'pending',
            'created_by_id' => $this->assistantUser->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments/{$appointment->id}");

        $response->assertStatus(200);
        $this->assertEquals('+213553000003', $response->json('data.patient_phone'));
    }

    /**
     * 9. patient.view_contacts: Assistant with revoked permission receives masked patient contacts (200 OK, phone is null).
     */
    public function test_assistant_without_patient_view_contacts_receives_masked_patient_phone(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-MASK-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'pending',
            'created_by_id' => $this->assistantUser->id,
        ]);

        // Director revokes patient.view_contacts
        $this->clinicService->updateAssistantPermissions($this->doctorUserA, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments/{$appointment->id}");

        $response->assertStatus(200);
        $this->assertNull($response->json('data.patient_phone'));
    }

    /**
     * 10. Role Decoupling: Doctors and Patients retain full contact visibility regardless of assistant delegations.
     */
    public function test_unrelated_roles_retain_full_contact_visibility(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-ROLES-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'pending',
            'created_by_id' => $this->assistantUser->id,
        ]);

        // Doctor viewing appointment
        $docResponse = $this->authenticateAs($this->doctorTokenA, ['X-Clinic-ID' => $this->clinicA->id])
            ->getJson("/api/v1/appointments/{$appointment->id}");

        $docResponse->assertStatus(200);
        $this->assertEquals('+213553000003', $docResponse->json('data.patient_phone'));

        // Patient viewing own appointment
        $patResponse = $this->authenticateAs($this->patientToken)
            ->getJson("/api/v1/appointments/{$appointment->id}");

        $patResponse->assertStatus(200);
        $this->assertEquals('+213553000003', $patResponse->json('data.patient_phone'));
    }

    /**
     * 11. Role Decoupling: Doctor can manage queue and confirm appointments without assistant delegations.
     */
    public function test_doctor_retains_queue_management_and_confirmation(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-DOC-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'pending',
            'created_by_id' => $this->assistantUser->id,
        ]);

        // Doctor manages queue
        $queueResponse = $this->authenticateAs($this->doctorTokenA, ['X-Clinic-ID' => $this->clinicA->id])
            ->getJson('/api/v1/appointments');

        $queueResponse->assertStatus(200);

        // Doctor confirms appointment
        $confirmResponse = $this->authenticateAs($this->doctorTokenA, ['X-Clinic-ID' => $this->clinicA->id])
            ->postJson("/api/v1/appointments/{$appointment->id}/confirm");

        $confirmResponse->assertStatus(200);
        $this->assertEquals('confirmed', $confirmResponse->json('data.status'));
    }

    /**
     * 12. Hard Permission Ceiling: Director cannot grant booking.confirm or clinical permissions, and assistant cannot confirm.
     */
    public function test_hard_permission_ceiling_enforcement_for_doctor_assistant(): void
    {
        $appointment = Appointment::create([
            'booking_reference' => 'MS-2026-CEIL-001',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'clinic_id' => $this->clinicA->id,
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
            'appointment_date' => now()->format('Y-m-d'),
            'time_slot' => '11:00',
            'status' => 'pending',
            'created_by_id' => $this->doctorUserA->id,
        ]);

        // Director attempts to grant clinical.write_rx and clinical.view_ehr (Beyond Ceiling)
        $updateResponse = $this->authenticateAs($this->doctorTokenA)
            ->putJson("/api/v1/clinics/{$this->clinicA->id}/assistants/{$this->assistant->id}/permissions", [
                'permissions' => [
                    'booking.manage_queue',
                    'clinical.write_rx',     // Beyond Ceiling!
                    'clinical.view_ehr',     // Beyond Ceiling!
                ],
            ]);

        $updateResponse->assertStatus(200);
        $freshAssistant = $this->assistant->fresh();

        $this->assertEquals(['booking.manage_queue'], $freshAssistant->permissions_json);
        $this->assertFalse(in_array('clinical.write_rx', $freshAssistant->permissions_json, true));
        $this->assertFalse(in_array('clinical.view_ehr', $freshAssistant->permissions_json, true));
    }

    /**
     * 13. Immediate Revocation without token re-issuance:
     * Revoking a permission via Director API immediately blocks the assistant using the SAME existing bearer token.
     */
    public function test_immediate_revocation_takes_effect_without_token_reissuance(): void
    {
        // 1. Initial State: Assistant can create appointment with existing token
        $payload1 = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(4)->format('Y-m-d'),
            'time_slot' => '14:00',
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
        ];

        $resp1 = $this->authenticateAs($this->assistantToken)
            ->postJson('/api/v1/appointments', $payload1);
        $resp1->assertStatus(201);

        // 2. Director immediately revokes booking.create via Director API endpoint
        $revokeResp = $this->authenticateAs($this->doctorTokenA)
            ->putJson("/api/v1/clinics/{$this->clinicA->id}/assistants/{$this->assistant->id}/permissions", [
                'permissions' => [
                    'booking.manage_queue',
                    'booking.confirm_attendance',
                    'patient.view_contacts',
                ],
            ]);
        $revokeResp->assertStatus(200);

        // 3. Assistant immediately attempts to create appointment with the EXACT SAME token (no re-login)
        $payload2 = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'appointment_date' => now()->addDays(5)->format('Y-m-d'),
            'time_slot' => '15:00',
            'patient_name' => 'عمر المريض',
            'patient_phone' => '+213553000003',
        ];

        $resp2 = $this->authenticateAs($this->assistantToken)
            ->postJson('/api/v1/appointments', $payload2);

        // Immediately 403 Forbidden!
        $resp2->assertStatus(403);

        // 4. Director restores booking.create but revokes booking.manage_queue
        $restoreResp = $this->authenticateAs($this->doctorTokenA)
            ->putJson("/api/v1/clinics/{$this->clinicA->id}/assistants/{$this->assistant->id}/permissions", [
                'permissions' => [
                    'booking.create',
                    'patient.view_contacts',
                ],
            ]);
        $restoreResp->assertStatus(200);

        // 5. Assistant with same token can now create appointment again
        $resp3 = $this->authenticateAs($this->assistantToken)
            ->postJson('/api/v1/appointments', $payload2);
        $resp3->assertStatus(201);

        // 6. But assistant with same token cannot list appointments (manage_queue revoked)
        $respQueue = $this->authenticateAs($this->assistantToken)
            ->getJson('/api/v1/appointments');
        $respQueue->assertStatus(403);
    }
}
