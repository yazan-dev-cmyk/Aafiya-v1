<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\Patient;
use App\Models\User;
use App\Services\ClinicService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorAssistantAppointmentConfirmationAndFilterTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected Doctor $doctorA1;
    protected User $doctorUserA1;
    protected string $doctorTokenA1;
    protected Doctor $doctorA2;
    protected User $doctorUserA2;
    protected string $doctorTokenA2;
    protected Doctor $doctorB;
    protected User $doctorUserB;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected string $assistantToken;
    protected Patient $patient;
    protected User $patientUser;
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
            'name' => 'عيادة النور المركزية',
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

        // 3. Clinic Director / Doctor 1 in Clinic A
        $this->doctorUserA1 = User::factory()->create([
            'name' => 'د. حسام الدين بلقاسم',
            'email' => 'dr.houssam@aafiya.dz',
            'phone' => '+213551000001',
            'is_active' => true,
        ]);
        $this->doctorUserA1->assignRole('doctor');

        $this->doctorA1 = Doctor::create([
            'user_id' => $this->doctorUserA1->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-ALG-2026-01',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctorA1->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinicA->update(['director_doctor_id' => $this->doctorA1->id]);
        $this->doctorTokenA1 = $this->doctorUserA1->createToken('doc1-token')->plainTextToken;

        // 4. Employed Doctor 2 in Clinic A
        $this->doctorUserA2 = User::factory()->create([
            'name' => 'د. سارة المنصوري',
            'email' => 'dr.sara@aafiya.dz',
            'phone' => '+213551000002',
            'is_active' => true,
        ]);
        $this->doctorUserA2->assignRole('doctor');

        $this->doctorA2 = Doctor::create([
            'user_id' => $this->doctorUserA2->id,
            'specialty' => 'Pediatrics',
            'license_number' => 'DOC-ALG-2026-02',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctorA2->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
        ]);
        $this->doctorTokenA2 = $this->doctorUserA2->createToken('doc2-token')->plainTextToken;

        // 5. Doctor in Foreign Clinic B (Not Affiliated with Clinic A)
        $this->doctorUserB = User::factory()->create([
            'name' => 'د. كريم وهراني',
            'email' => 'dr.karim@aafiya.dz',
            'phone' => '+213551000099',
            'is_active' => true,
        ]);
        $this->doctorUserB->assignRole('doctor');

        $this->doctorB = Doctor::create([
            'user_id' => $this->doctorUserB->id,
            'specialty' => 'Dermatology',
            'license_number' => 'DOC-ALG-2026-99',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctorB->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinicB->update(['director_doctor_id' => $this->doctorB->id]);

        // 6. Doctor Assistant affiliated strictly with Clinic A
        $this->assistantUser = User::factory()->create([
            'name' => 'فاطمة مساعدة العيادة',
            'email' => 'fatima.ast@aafiya.dz',
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
            'created_by_id' => $this->doctorUserA1->id,
            'is_active' => true,
        ]);

        // Default initial delegation without booking.confirm
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
        ]);

        $this->assistantToken = $this->assistantUser->createToken('ast-token')->plainTextToken;

        // 7. Registered Patient
        $this->patientUser = User::factory()->create([
            'name' => 'طارق الزواوي',
            'email' => 'tarek.patient@aafiya.dz',
            'phone' => '+213553000003',
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient_registered');

        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-ALG-777',
            'first_name' => 'طارق',
            'last_name' => 'الزواوي',
            'gender' => 'male',
            'date_of_birth' => '1992-07-15',
            'phone' => '+213553000003',
            'email' => 'tarek.patient@aafiya.dz',
            'wilaya' => 'الجزائر',
        ]);
    }

    /**
     * Helper to create a pending appointment.
     */
    protected function createPendingAppointment(
        Clinic $clinic,
        Doctor $doctor,
        string $date = '2026-09-20',
        string $timeSlot = '09:00',
        string $ref = 'APPT-TEST-001'
    ): Appointment {
        return Appointment::create([
            'booking_reference' => $ref,
            'patient_id' => $this->patient->id,
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
            'appointment_date' => $date,
            'time_slot' => $timeSlot,
            'status' => 'pending',
            'creator_type' => 'patient',
            'created_by_id' => $this->patientUser->id,
        ]);
    }

    /**
     * 1. Doctor Confirmation: A verified doctor can confirm a pending appointment in their clinic.
     */
    public function test_01_verified_doctor_can_confirm_pending_appointment_in_clinic(): void
    {
        $appointment = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:00', 'REF-DOC-CONF-01');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->doctorTokenA1)
            ->postJson("/api/v1/appointments/{$appointment->id}/confirm", [
                'reason' => 'تأكيد الحجز من الطبيب',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'confirmed');

        $fresh = $appointment->fresh();
        $this->assertEquals('confirmed', $fresh->status);
        $this->assertEquals($this->doctorUserA1->id, $fresh->confirmed_by_id);
        $this->assertNotNull($fresh->confirmed_at);
    }

    /**
     * 2. Assistant Without Permission: Assistant cannot confirm without booking.confirm (HTTP 403).
     */
    public function test_02_assistant_without_booking_confirm_permission_cannot_confirm_returns_403(): void
    {
        $appointment = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:30', 'REF-AST-NOPERM-02');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/confirm");

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'غير مصرح: تم سحب صلاحية تأكيد المواعيد من حسابك في هذه العيادة.',
        ]);

        $this->assertEquals('pending', $appointment->fresh()->status);
    }

    /**
     * 3. Assistant With Permission: Assistant with booking.confirm can confirm pending appointment (HTTP 200).
     */
    public function test_03_assistant_with_booking_confirm_permission_can_confirm_pending_appointment(): void
    {
        // Clinic director explicitly delegates booking.confirm to assistant
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
            'booking.confirm',
        ]);

        $appointment = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '10:00', 'REF-AST-CONF-03');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/confirm");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'confirmed');

        $fresh = $appointment->fresh();
        $this->assertEquals('confirmed', $fresh->status);
        $this->assertEquals($this->assistantUser->id, $fresh->confirmed_by_id);
        $this->assertNotNull($fresh->confirmed_at);

        // Status history audit record
        $this->assertDatabaseHas('appointment_status_history', [
            'appointment_id' => $appointment->id,
            'from_status' => 'pending',
            'to_status' => 'confirmed',
            'changed_by_id' => $this->assistantUser->id,
        ]);
    }

    /**
     * 4. Immediate Dynamic Revocation: Revoking booking.confirm on same token immediately returns 403.
     */
    public function test_04_immediate_dynamic_revocation_on_same_token_returns_403(): void
    {
        // 1. Grant permission
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.create',
            'booking.confirm',
        ]);

        $appointment1 = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '10:30', 'REF-AST-REV-04A');

        // Confirm succeeds
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment1->id}/confirm");
        $res1->assertStatus(200);

        // 2. Director dynamically revokes booking.confirm
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.create',
        ]);

        // 3. Assistant attempts to confirm another appointment using the EXACT SAME TOKEN without logging out
        $appointment2 = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '11:00', 'REF-AST-REV-04B');

        $res2 = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment2->id}/confirm");

        $res2->assertStatus(403);
        $res2->assertJsonFragment([
            'message' => 'غير مصرح: تم سحب صلاحية تأكيد المواعيد من حسابك في هذه العيادة.',
        ]);
        $this->assertEquals('pending', $appointment2->fresh()->status);
    }

    /**
     * 5. Foreign Clinic Confirmation: Assistant attempting confirmation in another clinic returns 403.
     */
    public function test_05_assistant_cannot_confirm_appointment_in_foreign_clinic_returns_403(): void
    {
        // Grant booking.confirm in Clinic A
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm',
        ]);

        // Appointment belongs to Clinic B
        $foreignAppointment = $this->createPendingAppointment($this->clinicB, $this->doctorB, '2026-09-20', '11:30', 'REF-FOR-05');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$foreignAppointment->id}/confirm");

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.',
        ]);
    }

    /**
     * 6. Exact Date Filter: Assistant queries appointment_date -> only appointments for that date returned.
     */
    public function test_06_assistant_can_filter_appointments_by_exact_date(): void
    {
        $appDate1 = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:00', 'REF-DATE-06A');
        $appDate2 = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-21', '09:00', 'REF-DATE-06B');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments?appointment_date=2026-09-20');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($appDate1->id, $ids);
        $this->assertNotContains($appDate2->id, $ids);
    }

    /**
     * 7. Date Range Filter: Assistant queries from_date and to_date -> only appointments in range returned.
     */
    public function test_07_assistant_can_filter_appointments_by_date_range(): void
    {
        $appBefore = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-15', '09:00', 'REF-RANGE-07A');
        $appInside = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:00', 'REF-RANGE-07B');
        $appAfter = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-28', '09:00', 'REF-RANGE-07C');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments?from_date=2026-09-18&to_date=2026-09-22');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($appInside->id, $ids);
        $this->assertNotContains($appBefore->id, $ids);
        $this->assertNotContains($appAfter->id, $ids);
    }

    /**
     * 8. Affiliated Doctor Filter: Assistant queries doctor_id -> only appointments for that doctor returned.
     */
    public function test_08_assistant_can_filter_appointments_by_affiliated_doctor(): void
    {
        $appDoctorA1 = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:00', 'REF-DOC-08A');
        $appDoctorA2 = $this->createPendingAppointment($this->clinicA, $this->doctorA2, '2026-09-20', '10:00', 'REF-DOC-08B');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments?doctor_id={$this->doctorA1->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($appDoctorA1->id, $ids);
        $this->assertNotContains($appDoctorA2->id, $ids);
    }

    /**
     * 9. Foreign Doctor Filter: Assistant queries unaffiliated doctor_id -> HTTP 422 rejected.
     */
    public function test_09_assistant_filtering_by_foreign_doctor_returns_422(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments?doctor_id={$this->doctorB->id}");

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'الطبيب المحدد غير منتسب لهذه العيادة.',
        ]);
    }

    /**
     * 10. Combined Date + Doctor Filter: Assistant queries appointment_date + doctor_id.
     */
    public function test_10_assistant_combined_date_and_doctor_filter(): void
    {
        $match = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-20', '09:00', 'REF-COMB-10A');
        $wrongDate = $this->createPendingAppointment($this->clinicA, $this->doctorA1, '2026-09-22', '09:00', 'REF-COMB-10B');
        $wrongDoctor = $this->createPendingAppointment($this->clinicA, $this->doctorA2, '2026-09-20', '09:00', 'REF-COMB-10C');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments?appointment_date=2026-09-20&doctor_id={$this->doctorA1->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($match->id, $ids);
        $this->assertNotContains($wrongDate->id, $ids);
        $this->assertNotContains($wrongDoctor->id, $ids);
    }

    /**
     * 11. EHR Separation: Assistant confirming appointment has NO access to EHR / clinical records.
     */
    public function test_11_assistant_confirming_appointment_has_no_access_to_ehr(): void
    {
        // 1. Director attempts to delegate clinical permissions (view_ehr, write_rx) alongside booking.confirm
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm',
            'clinical.view_ehr',
            'clinical.write_rx',
        ]);

        // 2. Hard ceiling strips clinical permissions while keeping booking.confirm
        $effective = $this->assistant->fresh()->permissions_json;
        $this->assertContains('booking.confirm', $effective);
        $this->assertNotContains('clinical.view_ehr', $effective);
        $this->assertNotContains('clinical.write_rx', $effective);

        // 3. 4D checks confirm ceiling rules
        $this->assertFalse(User::canDelegatePermissionToRole('doctor_assistant', 'clinical.view_ehr'));
        $this->assertFalse($this->assistantUser->hasClinicAccess('clinical.view_ehr', $this->clinicA->id));
        $this->assertFalse(User::canDelegatePermissionToRole('doctor_assistant', 'clinical.write_rx'));
        $this->assertFalse($this->assistantUser->hasClinicAccess('clinical.write_rx', $this->clinicA->id));

        // 4. Clinical consultation creation is strictly forbidden for assistant
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/clinical-visits', [
                'clinic_id' => $this->clinicA->id,
                'patient_id' => $this->patient->id,
                'chief_complaint' => 'صداع شديد',
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'doctor' => ['يجب أن يكون المستخدم طبيباً مسجلاً لإنشاء زيارة كلينيكية.'],
        ]);
    }

    /**
     * 12. Existing Assistant Delegated Permissions Regression: All 4 standard permissions work as expected.
     */
    public function test_12_existing_assistant_delegated_permissions_regression(): void
    {
        // Assistant has the full standard permission set + booking.confirm
        $this->clinicService->updateAssistantPermissions($this->doctorUserA1, $this->clinicA, $this->assistant, [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
            'booking.confirm',
        ]);

        // 1. booking.create works
        $createPayload = [
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA1->id,
            'appointment_date' => now()->addDays(5)->format('Y-m-d'),
            'time_slot' => '12:00',
            'patient_name' => 'مريض تجريبي',
            'patient_phone' => '+213559998877',
        ];
        $resCreate = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson('/api/v1/appointments', $createPayload);
        $resCreate->assertStatus(201);
        $createdId = $resCreate->json('data.id');

        // 2. booking.manage_queue works
        $resQueue = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson('/api/v1/appointments');
        $resQueue->assertStatus(200);

        // 3. booking.confirm works
        $resConfirm = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$createdId}/confirm");
        $resConfirm->assertStatus(200);
        $this->assertEquals('confirmed', Appointment::find($createdId)->status);

        // 4. booking.confirm_attendance works
        $resAttend = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$createdId}/attend");
        $resAttend->assertStatus(200);
        $this->assertEquals('attended', Appointment::find($createdId)->status);

        // 5. patient.view_contacts works (phone unmasked)
        $resApp = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->getJson("/api/v1/appointments/{$createdId}");
        $resApp->assertStatus(200);
        $this->assertEquals('+213559998877', $resApp->json('data.patient_phone'));
    }
}
