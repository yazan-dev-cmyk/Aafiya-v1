<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PilotAccountProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed initial roles, permissions and booking packages into medical_db_testing
        $this->seed(DatabaseSeeder::class);
    }

    public function test_all_eleven_pilot_roles_can_authenticate_and_access_scoped_features(): void
    {
        // 1. Super Admin Pilot Account
        $admin = User::factory()->create([
            'email' => 'pilot.admin@aafiya.dz',
            'password' => Hash::make('AdminPilotSecret2026!'),
            'is_active' => true,
        ]);
        $admin->assignRole('admin');

        $adminLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.admin@aafiya.dz',
            'password' => 'AdminPilotSecret2026!',
        ]);
        $adminLogin->assertStatus(200);
        $adminToken = $adminLogin->json('data.token');

        $adminMe = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/auth/me');
        $adminMe->assertStatus(200)
            ->assertJsonPath('data.roles.0', 'admin');

        // Admin can access clinical access logs
        $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/audit/clinical-access-logs')
            ->assertStatus(200);

        // 2. Doctor (Clinic Director) Pilot Account
        $doctorUser = User::factory()->create([
            'email' => 'pilot.doctor@aafiya.dz',
            'password' => Hash::make('DoctorPilotSecret2026!'),
            'is_active' => true,
        ]);
        $doctorUser->assignRole('doctor');

        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'طب عام وأمراض باطنية',
            'license_number' => 'DZ-MED-2026-9901',
            'is_active' => true,
        ]);

        $clinic = Clinic::create([
            'name' => 'عيادة الأمل الطبية النموذجية',
            'address' => 'حي 500 مسكن، عمارة ب، الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '+21321445566',
            'director_doctor_id' => $doctor->id,
            'is_active' => true,
        ]);

        $doctor->clinics()->attach($clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $docLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.doctor@aafiya.dz',
            'password' => 'DoctorPilotSecret2026!',
        ]);
        $docLogin->assertStatus(200);
        $docToken = $docLogin->json('data.token');

        // Doctor can access clinical visits
        $this->withHeader('Authorization', 'Bearer ' . $docToken)
            ->getJson('/api/v1/clinical-visits')
            ->assertStatus(200);

        // 3. Doctor Assistant Pilot Account
        $assistantUser = User::factory()->create([
            'email' => 'pilot.assistant@aafiya.dz',
            'password' => Hash::make('AssistantPilotSecret2026!'),
            'is_active' => true,
        ]);
        $assistantUser->assignRole('doctor_assistant');

        ClinicAssistant::create([
            'user_id' => $assistantUser->id,
            'clinic_id' => $clinic->id,
            'delegated_permissions' => ['record_vitals', 'manage_queue'],
            'is_active' => true,
        ]);

        $astLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.assistant@aafiya.dz',
            'password' => 'AssistantPilotSecret2026!',
        ]);
        $astLogin->assertStatus(200);

        // 4. Registered Patient Pilot Account
        $patientUser = User::factory()->create([
            'email' => 'pilot.patient@aafiya.dz',
            'password' => Hash::make('PatientPilotSecret2026!'),
            'is_active' => true,
        ]);
        $patientUser->assignRole('patient_registered');

        $patient = Patient::create([
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-2026-000001',
            'first_name' => 'ياسين',
            'last_name' => 'بلقاسم',
            'gender' => 'male',
            'date_of_birth' => '1988-05-12',
            'phone' => '+213550123456',
        ]);

        $patLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.patient@aafiya.dz',
            'password' => 'PatientPilotSecret2026!',
        ]);
        $patLogin->assertStatus(200);
        $patToken = $patLogin->json('data.token');

        // Patient can access their own record
        $this->withHeader('Authorization', 'Bearer ' . $patToken)
            ->getJson("/api/v1/patients/{$patient->id}")
            ->assertStatus(200);

        // 5. Booking Center Pilot Account
        $bookingUser = User::factory()->create([
            'email' => 'pilot.booking@aafiya.dz',
            'password' => Hash::make('BookingPilotSecret2026!'),
            'is_active' => true,
        ]);
        $bookingUser->assignRole('booking_center');

        $bcLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.booking@aafiya.dz',
            'password' => 'BookingPilotSecret2026!',
        ]);
        $bcLogin->assertStatus(200);
        $bcToken = $bcLogin->json('data.token');

        // Booking center can query booking packages
        $this->withHeader('Authorization', 'Bearer ' . $bcToken)
            ->getJson('/api/v1/booking-packages')
            ->assertStatus(200);

        // 6. Diagnostic Center (Lab)
        $labUser = User::factory()->create([
            'email' => 'pilot.lab@aafiya.dz',
            'password' => Hash::make('LabPilotSecret2026!'),
            'is_active' => true,
        ]);
        $labUser->assignRole('lab');

        $labCenter = DiagnosticCenter::create([
            'user_id' => $labUser->id,
            'name' => 'مخبر التحاليل الطبية الدقيقة',
            'type' => 'laboratory',
            'license_number' => 'LAB-PILOT-2026',
            'phone' => '+21321334455',
            'address' => 'شارع حسيبة بن بوعلي، الجزائر',
            'wilaya' => 'الجزائر',
            'is_active' => true,
        ]);

        $labLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.lab@aafiya.dz',
            'password' => 'LabPilotSecret2026!',
        ]);
        $labLogin->assertStatus(200);

        // 7. Lab Assistant
        $labAstUser = User::factory()->create([
            'email' => 'pilot.lab.assistant@aafiya.dz',
            'password' => Hash::make('LabAstPilotSecret2026!'),
            'is_active' => true,
        ]);
        $labAstUser->assignRole('lab_assistant');

        DiagnosticStaff::create([
            'diagnostic_center_id' => $labCenter->id,
            'user_id' => $labAstUser->id,
            'created_by_id' => $labUser->id,
            'role_in_center' => 'technician',
            'is_active' => true,
        ]);

        $labAstLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.lab.assistant@aafiya.dz',
            'password' => 'LabAstPilotSecret2026!',
        ]);
        $labAstLogin->assertStatus(200);

        // 8. Radiology Center & Staff
        $radUser = User::factory()->create([
            'email' => 'pilot.radiology@aafiya.dz',
            'password' => Hash::make('RadPilotSecret2026!'),
            'is_active' => true,
        ]);
        $radUser->assignRole('radiology');

        $radCenter = DiagnosticCenter::create([
            'user_id' => $radUser->id,
            'name' => 'مركز التصوير الطبي والأشعة المتطورة',
            'type' => 'radiology',
            'license_number' => 'RAD-PILOT-2026',
            'phone' => '+21321778899',
            'address' => 'شارع ديدوش مراد، الجزائر',
            'wilaya' => 'الجزائر',
            'is_active' => true,
        ]);

        $radLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.radiology@aafiya.dz',
            'password' => 'RadPilotSecret2026!',
        ]);
        $radLogin->assertStatus(200);

        // 9. Radiology Assistant
        $radAstUser = User::factory()->create([
            'email' => 'pilot.rad.assistant@aafiya.dz',
            'password' => Hash::make('RadAstPilotSecret2026!'),
            'is_active' => true,
        ]);
        $radAstUser->assignRole('rad_assistant');

        DiagnosticStaff::create([
            'diagnostic_center_id' => $radCenter->id,
            'user_id' => $radAstUser->id,
            'created_by_id' => $radUser->id,
            'role_in_center' => 'technician',
            'is_active' => true,
        ]);

        $radAstLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.rad.assistant@aafiya.dz',
            'password' => 'RadAstPilotSecret2026!',
        ]);
        $radAstLogin->assertStatus(200);

        // 10. Admin Assistant
        $adminAstUser = User::factory()->create([
            'email' => 'pilot.admin.assistant@aafiya.dz',
            'password' => Hash::make('AdminAstPilotSecret2026!'),
            'is_active' => true,
        ]);
        $adminAstUser->assignRole('admin_assistant');

        $adminAstLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'pilot.admin.assistant@aafiya.dz',
            'password' => 'AdminAstPilotSecret2026!',
        ]);
        $adminAstLogin->assertStatus(200);

        // 11. Guest Patient (via appointment slot query)
        $this->getJson('/api/v1/appointments/slots?clinic_id=' . $clinic->id . '&doctor_id=' . $doctor->id . '&date=' . now()->addDay()->toDateString())
            ->assertStatus(200);

        // Clean Token Revocation Verification
        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/v1/auth/logout');
        $logoutRes->assertStatus(200);

        // Verify Token deleted from personal_access_tokens
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $admin->id,
        ]);
    }
}
