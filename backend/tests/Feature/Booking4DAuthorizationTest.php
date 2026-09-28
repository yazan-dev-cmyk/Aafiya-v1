<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Booking4DAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $employedUser;
    protected Doctor $employedDoctor;
    protected User $otherDoctorUser;
    protected Doctor $otherDoctor;
    protected Clinic $clinic;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected User $bookingCenterUser;
    protected BookingCenter $bookingCenter;

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
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // Director
        $this->directorUser = User::factory()->create();
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-1111',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء',
            'address' => 'قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '031000000',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // Employed Doctor
        $this->employedUser = User::factory()->create();
        $this->employedUser->roles()->attach($doctorRole->id);
        $this->employedDoctor = Doctor::create([
            'user_id' => $this->employedUser->id,
            'specialty' => 'طب القلب',
            'license_number' => 'DOC-2222',
            'is_verified' => true,
        ]);

        $this->employedDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
        ]);

        // Other Unrelated Doctor
        $this->otherDoctorUser = User::factory()->create();
        $this->otherDoctorUser->roles()->attach($doctorRole->id);
        $this->otherDoctor = Doctor::create([
            'user_id' => $this->otherDoctorUser->id,
            'specialty' => 'طب العيون',
            'license_number' => 'DOC-3333',
            'is_verified' => true,
        ]);

        // Assistant
        $this->assistantUser = User::factory()->create();
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'permissions_json' => ['booking.manage_queue', 'booking.confirm_attendance', 'booking.create'],
            'created_by_id' => $this->directorUser->id,
        ]);

        // Booking Center
        $this->bookingCenterUser = User::factory()->create();
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز الشرق للحجوزات',
            'phone' => '031445566',
            'address' => 'شارع عبان رمضان',
            'wilaya' => 'قسنطينة',
            'quota_balance' => 10,
        ]);
    }

    public function test_assigned_doctor_can_confirm_their_appointment(): void
    {
        $patient = User::factory()->create();

        $createRes = $this->actingAs($patient, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض 1',
            'patient_phone' => '0770000001',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
        ]);

        $appointmentId = $createRes->json('data.id');

        $response = $this->actingAs($this->employedUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');
    }

    public function test_clinic_director_can_confirm_appointments_for_employed_doctors(): void
    {
        $patient = User::factory()->create();

        $createRes = $this->actingAs($patient, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض 2',
            'patient_phone' => '0770000002',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
        ]);

        $appointmentId = $createRes->json('data.id');

        // Director confirms employed doctor's appointment
        $response = $this->actingAs($this->directorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');
    }

    public function test_unrelated_doctor_cannot_confirm_appointment(): void
    {
        $patient = User::factory()->create();

        $createRes = $this->actingAs($patient, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض 3',
            'patient_phone' => '0770000003',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '11:00',
        ]);

        $appointmentId = $createRes->json('data.id');

        // Other doctor tries to confirm -> Forbidden!
        $response = $this->actingAs($this->otherDoctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['authorization']);
    }

    public function test_assistant_cannot_confirm_quota_due_to_hard_permission_ceiling(): void
    {
        $patient = User::factory()->create();

        $createRes = $this->actingAs($patient, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض 4',
            'patient_phone' => '0770000004',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '12:00',
        ]);

        $appointmentId = $createRes->json('data.id');

        // Assistant tries to confirm -> Forbidden without delegated booking.confirm
        $response = $this->actingAs($this->assistantUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm");

        $response->assertStatus(403);
    }

    public function test_booking_center_privacy_wall_and_scoped_transaction_listing(): void
    {
        // Booking center can query its own quota balance
        $balanceRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->getJson('/api/v1/booking-centers/quota-balance');

        $balanceRes->assertStatus(200)
            ->assertJsonPath('data.quota_balance', 10);

        // Booking center cannot manage clinics staff (4D Access block)
        $clinicStaffRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson("/api/v1/clinics/{$this->clinic->id}/assistants", [
            'name' => 'مساعد غير مصرح',
            'email' => 'fake@assistant.dz',
            'password' => 'password123',
            'phone' => '0555999888',
        ]);

        $clinicStaffRes->assertStatus(403);
    }
}
