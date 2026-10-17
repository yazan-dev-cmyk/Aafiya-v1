<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\Patient;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\VacationAppointmentReschedule;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClinicRescheduleDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected User $directorUserA;
    protected Doctor $directorDoctorA;
    protected User $doctorUserA;
    protected Doctor $doctorA;
    protected User $otherDoctorUserB;
    protected Doctor $otherDoctorB;
    protected User $assistantUserA;
    protected ClinicAssistant $assistantA;
    protected User $assistantUserB;
    protected ClinicAssistant $assistantB;

    protected Patient $patientA;
    protected VacationAppointmentReschedule $unresolvedA;
    protected VacationAppointmentReschedule $unresolvedB;
    protected VacationAppointmentReschedule $rescheduledA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(RolePermissionSeeder::class);

        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();

        // 1. Clinics
        $this->clinicA = Clinic::create([
            'name' => 'عيادة العافية الجزائر',
            'address' => 'ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021000010',
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->clinicB = Clinic::create([
            'name' => 'عيادة العافية وهران',
            'address' => 'بن بولعيد، وهران',
            'wilaya' => 'وهران',
            'phone' => '021000020',
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        // 2. Director in Clinic A
        $this->directorUserA = User::factory()->create(['email' => 'director.a@aafiya.dz']);
        $this->directorUserA->roles()->attach($doctorRole->id);
        $this->directorDoctorA = Doctor::create([
            'user_id' => $this->directorUserA->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-DASH-01',
            'is_verified' => true,
        ]);
        $this->clinicA->update(['director_doctor_id' => $this->directorDoctorA->id]);
        $this->directorDoctorA->clinics()->attach($this->clinicA->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 3. Employed Doctor in Clinic A
        $this->doctorUserA = User::factory()->create(['email' => 'doc.a@aafiya.dz']);
        $this->doctorUserA->roles()->attach($doctorRole->id);
        $this->doctorA = Doctor::create([
            'user_id' => $this->doctorUserA->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-DASH-02',
            'is_verified' => true,
        ]);
        $this->doctorA->clinics()->attach($this->clinicA->id, [
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 4. Other Doctor in Clinic B only
        $this->otherDoctorUserB = User::factory()->create(['email' => 'doc.b@aafiya.dz']);
        $this->otherDoctorUserB->roles()->attach($doctorRole->id);
        $this->otherDoctorB = Doctor::create([
            'user_id' => $this->otherDoctorUserB->id,
            'specialty' => 'طب العيون',
            'license_number' => 'DOC-DASH-03',
            'is_verified' => true,
        ]);
        $this->otherDoctorB->clinics()->attach($this->clinicB->id, [
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 5. Assistant in Clinic A (without patient.view_contacts initially)
        $this->assistantUserA = User::factory()->create(['email' => 'assistant.a@aafiya.dz']);
        $this->assistantUserA->roles()->attach($assistantRole->id);
        $this->assistantA = ClinicAssistant::create([
            'user_id' => $this->assistantUserA->id,
            'clinic_id' => $this->clinicA->id,
            'permissions_json' => ['booking.manage_queue'],
            'is_active' => true,
        ]);

        // 6. Assistant in Clinic B
        $this->assistantUserB = User::factory()->create(['email' => 'assistant.b@aafiya.dz']);
        $this->assistantUserB->roles()->attach($assistantRole->id);
        $this->assistantB = ClinicAssistant::create([
            'user_id' => $this->assistantUserB->id,
            'clinic_id' => $this->clinicB->id,
            'is_active' => true,
        ]);

        // 7. Seed Appointments & Ledgers in Clinic A and Clinic B
        $vacationA = DoctorVacation::create([
            'id' => (string) Str::uuid(),
            'doctor_id' => $this->doctorA->id,
            'vacation_start' => '2026-11-01',
            'vacation_end' => '2026-11-05',
            'status' => 'effective',
            'reason' => 'إجازة الطبيب أ',
        ]);

        $patientUser = User::factory()->create(['phone' => '0555001122']);

        $this->patientA = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-DASH-01',
            'first_name' => 'أحمد',
            'last_name' => 'العاصمي',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '0555001122',
            'is_active' => true,
        ]);

        $apptA = Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-CLINIC-A-01',
            'secure_token' => 'token-a-01',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'patient_id' => $this->patientA->id,
            'patient_name' => 'أحمد العاصمي',
            'patient_phone' => '0555001122',
            'patient_mrn' => 'MRN-A-01',
            'created_by_id' => $patientUser->id,
            'creator_type' => 'patient',
            'appointment_date' => '2026-11-02',
            'time_slot' => '10:00',
            'status' => 'confirmed',
        ]);

        $this->unresolvedA = VacationAppointmentReschedule::create([
            'id' => (string) Str::uuid(),
            'doctor_vacation_id' => $vacationA->id,
            'original_appointment_id' => $apptA->id,
            'clinic_id' => $this->clinicA->id,
            'status' => VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
            'failure_reason' => 'NO_AVAILABLE_SLOT_WITHIN_30_DAYS',
            'resolved_at' => null,
        ]);

        // A resolved/rescheduled record in Clinic A (should NOT appear in unresolved dashboard)
        $apptA2 = Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-CLINIC-A-02',
            'secure_token' => 'token-a-02',
            'clinic_id' => $this->clinicA->id,
            'doctor_id' => $this->doctorA->id,
            'patient_name' => 'سمير الجزائري',
            'patient_phone' => '0555001133',
            'created_by_id' => $patientUser->id,
            'creator_type' => 'patient',
            'appointment_date' => '2026-11-03',
            'time_slot' => '11:00',
            'status' => 'confirmed',
        ]);

        $this->rescheduledA = VacationAppointmentReschedule::create([
            'id' => (string) Str::uuid(),
            'doctor_vacation_id' => $vacationA->id,
            'original_appointment_id' => $apptA2->id,
            'clinic_id' => $this->clinicA->id,
            'status' => VacationAppointmentReschedule::STATUS_RESCHEDULED,
            'failure_reason' => null,
            'resolved_at' => now(),
        ]);

        // An unresolved record in Clinic B (Foreign clinic)
        $vacationB = DoctorVacation::create([
            'id' => (string) Str::uuid(),
            'doctor_id' => $this->otherDoctorB->id,
            'vacation_start' => '2026-11-01',
            'vacation_end' => '2026-11-05',
            'status' => 'effective',
        ]);

        $apptB = Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'REF-CLINIC-B-01',
            'secure_token' => 'token-b-01',
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->otherDoctorB->id,
            'patient_name' => 'مراد الوهراني',
            'patient_phone' => '0666998877',
            'created_by_id' => $patientUser->id,
            'creator_type' => 'patient',
            'appointment_date' => '2026-11-02',
            'time_slot' => '10:00',
            'status' => 'confirmed',
        ]);

        $this->unresolvedB = VacationAppointmentReschedule::create([
            'id' => (string) Str::uuid(),
            'doctor_vacation_id' => $vacationB->id,
            'original_appointment_id' => $apptB->id,
            'clinic_id' => $this->clinicB->id,
            'status' => VacationAppointmentReschedule::STATUS_URGENT_UNRESOLVED,
            'failure_reason' => 'NO_AVAILABLE_SLOT_WITHIN_30_DAYS',
            'resolved_at' => null,
        ]);
    }

    /**
     * Test unauthenticated access returns 401.
     */
    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');
        $response->assertStatus(401);
    }

    /**
     * Test request missing X-Clinic-ID header fails closed with 403 or 422 depending on role fallback.
     */
    public function test_request_missing_clinic_context_fails_closed(): void
    {
        // Doctor with multiple clinics without header fails closed via EnsureActiveClinicContext with 403
        $this->doctorA->clinics()->attach($this->clinicB->id, ['position' => 'doctor', 'is_active' => true]);

        $response = $this->actingAs($this->doctorUserA, 'sanctum')
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(403);
    }

    /**
     * Test authorized Director of Clinic A views only unresolved records for Clinic A.
     */
    public function test_clinic_director_views_only_own_clinic_unresolved_records(): void
    {
        $response = $this->actingAs($this->directorUserA, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->unresolvedA->id)
            ->assertJsonPath('data.0.status', 'urgent_unresolved')
            ->assertJsonPath('data.0.failure_reason', 'NO_AVAILABLE_SLOT_WITHIN_30_DAYS')
            ->assertJsonPath('data.0.original_appointment.booking_reference', 'REF-CLINIC-A-01');
    }

    /**
     * Test cross-clinic isolation: Doctor B cannot query Clinic A dashboard (returns 403).
     */
    public function test_doctor_not_affiliated_with_clinic_is_forbidden_with_403(): void
    {
        $response = $this->actingAs($this->otherDoctorUserB, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(403);
    }

    /**
     * Test cross-clinic isolation: Assistant B cannot query Clinic A dashboard (returns 403).
     */
    public function test_assistant_of_other_clinic_is_forbidden_with_403(): void
    {
        $response = $this->actingAs($this->assistantUserB, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(403);
    }

    /**
     * Test assistant in Clinic A without patient.view_contacts has patient_phone masked as null.
     */
    public function test_assistant_without_view_contacts_permission_has_patient_phone_masked(): void
    {
        $response = $this->actingAs($this->assistantUserA, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.original_appointment.patient_name', 'أحمد العاصمي')
            ->assertJsonPath('data.0.original_appointment.patient_phone', null); // Masked
    }

    /**
     * Test assistant in Clinic A WITH patient.view_contacts permission sees patient_phone.
     */
    public function test_assistant_with_view_contacts_permission_can_see_patient_phone(): void
    {
        // Delegate permission via clinicAssistant permissions_json
        $this->assistantA->update([
            'permissions_json' => ['patient.view_contacts', 'booking.manage_queue'],
        ]);

        $response = $this->actingAs($this->assistantUserA, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicA->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.original_appointment.patient_phone', '0555001122');
    }

    /**
     * Test empty results when no unresolved records exist for a clinic.
     */
    public function test_empty_results_returned_when_no_unresolved_records_exist(): void
    {
        // Remove unresolved record in Clinic B
        $this->unresolvedB->delete();

        $response = $this->actingAs($this->otherDoctorUserB, 'sanctum')
            ->withHeader('X-Clinic-ID', $this->clinicB->id)
            ->getJson('/api/v1/clinic/reschedule-dashboard/unresolved');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }
}
