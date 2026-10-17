<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\RescheduleVacationAppointmentsJob;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorVacation;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DoctorVacationApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected User $otherDoctorUser;
    protected Doctor $otherDoctor;
    protected User $unverifiedDoctorUser;
    protected Doctor $unverifiedDoctor;
    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected User $assistantUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();

        // 1. Director Doctor & Clinic A
        $this->directorUser = User::factory()->create(['email' => 'director@aafiya.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-API-01',
            'is_verified' => true,
        ]);

        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء أ',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000001',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->clinicB = Clinic::create([
            'name' => 'عيادة الشفاء ب',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '021000002',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
            'is_active' => true,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinicA->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 2. Verified Doctor User
        $this->doctorUser = User::factory()->create(['email' => 'doctor@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-API-02',
            'is_verified' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinicA->id, [
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->doctor->clinics()->attach($this->clinicB->id, [
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
        ]);

        // 3. Other Doctor User
        $this->otherDoctorUser = User::factory()->create(['email' => 'other.doctor@aafiya.dz']);
        $this->otherDoctorUser->roles()->attach($doctorRole->id);
        $this->otherDoctor = Doctor::create([
            'user_id' => $this->otherDoctorUser->id,
            'specialty' => 'طب العيون',
            'license_number' => 'DOC-API-03',
            'is_verified' => true,
        ]);

        // 4. Unverified Doctor User
        $this->unverifiedDoctorUser = User::factory()->create(['email' => 'unverified@aafiya.dz']);
        $this->unverifiedDoctorUser->roles()->attach($doctorRole->id);
        $this->unverifiedDoctor = Doctor::create([
            'user_id' => $this->unverifiedDoctorUser->id,
            'specialty' => 'طب الجراحة',
            'license_number' => 'DOC-API-04',
            'is_verified' => false,
        ]);

        // 5. Assistant User
        $this->assistantUser = User::factory()->create(['email' => 'assistant@aafiya.dz']);
        $this->assistantUser->roles()->attach($assistantRole->id);
    }

    /**
     * Test unauthenticated access returns 401.
     */
    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson('/api/v1/doctor/vacations');
        $response->assertStatus(401);

        $storeResponse = $this->postJson('/api/v1/doctor/vacations', [
            'vacation_start' => '2026-11-01',
            'vacation_end' => '2026-11-05',
        ]);
        $storeResponse->assertStatus(401);
    }

    /**
     * Test non-doctor user (assistant) cannot access vacation endpoints (returns 403).
     */
    public function test_non_doctor_user_is_forbidden_with_403(): void
    {
        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->getJson('/api/v1/doctor/vacations');

        $response->assertStatus(403);
    }

    /**
     * Test unverified doctor cannot manage vacations (returns 403).
     */
    public function test_unverified_doctor_is_forbidden_with_403(): void
    {
        $response = $this->actingAs($this->unverifiedDoctorUser, 'sanctum')
            ->getJson('/api/v1/doctor/vacations');

        $response->assertStatus(403);
    }

    /**
     * Test doctor can register vacation with valid data (returns 201 and dispatches background job).
     */
    public function test_doctor_can_register_vacation_successfully(): void
    {
        Queue::fake();

        $payload = [
            'vacation_start' => '2026-11-10',
            'vacation_end' => '2026-11-15',
            'reason' => 'عطلة سنوية',
            'notes' => 'ملاحظات إضافية',
        ];

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'effective')
            ->assertJsonPath('data.vacation_start', '2026-11-10')
            ->assertJsonPath('data.vacation_end', '2026-11-15')
            ->assertJsonPath('data.reason', 'عطلة سنوية');

        $vacationId = $response->json('data.id');
        $this->assertNotNull($vacationId);

        // Assert database record was created with effective status
        $this->assertDatabaseHas('doctor_vacations', [
            'id' => $vacationId,
            'doctor_id' => $this->doctor->id,
            'status' => 'effective',
        ]);

        // Assert snapshot clinics were captured (Clinic A and Clinic B)
        $this->assertDatabaseHas('doctor_vacation_clinics', [
            'doctor_vacation_id' => $vacationId,
            'clinic_id' => $this->clinicA->id,
        ]);
        $this->assertDatabaseHas('doctor_vacation_clinics', [
            'doctor_vacation_id' => $vacationId,
            'clinic_id' => $this->clinicB->id,
        ]);

        Queue::assertPushed(RescheduleVacationAppointmentsJob::class, function ($job) use ($vacationId) {
            return $job->doctorVacationId === $vacationId;
        });
    }

    /**
     * Test registration rejects invalid date formats (returns 422).
     */
    public function test_registration_rejects_invalid_date_format(): void
    {
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '10-11-2026', // Invalid format
                'vacation_end' => '2026-11-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['vacation_start']);
    }

    /**
     * Test registration rejects end date before start date (returns 422).
     */
    public function test_registration_rejects_end_date_before_start_date(): void
    {
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-11-20',
                'vacation_end' => '2026-11-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['vacation_end']);
    }

    /**
     * Test registration rejects overlapping effective vacations for the same doctor (returns 422).
     */
    public function test_registration_rejects_overlapping_vacations(): void
    {
        Queue::fake();

        // Create first vacation
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-11-10',
                'vacation_end' => '2026-11-20',
            ])->assertStatus(201);

        // Attempt overlapping vacation
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-11-15',
                'vacation_end' => '2026-11-25',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['vacation_start']);
    }

    /**
     * Test doctor can list only their own vacations (data privacy).
     */
    public function test_doctor_lists_only_own_vacations(): void
    {
        Queue::fake();

        // Create vacation for doctor
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-11-01',
                'vacation_end' => '2026-11-05',
                'reason' => 'إجازة الطبيب الأول',
            ])->assertStatus(201);

        // Create vacation for other doctor
        $this->actingAs($this->otherDoctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-11-10',
                'vacation_end' => '2026-11-15',
                'reason' => 'إجازة الطبيب الثاني',
            ])->assertStatus(201);

        // Query as first doctor
        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/doctor/vacations');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reason', 'إجازة الطبيب الأول');
    }

    /**
     * Test logical cancellation transitions status to 'cancelled' without physical deletion.
     */
    public function test_vacation_cancellation_is_logical_without_physical_deletion(): void
    {
        Queue::fake();

        $createRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-12-01',
                'vacation_end' => '2026-12-05',
            ]);

        $vacationId = $createRes->json('data.id');

        // Cancel vacation via DELETE
        $deleteRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->deleteJson("/api/v1/doctor/vacations/{$vacationId}");

        $deleteRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'cancelled');

        // Record must still exist in DB with cancelled status
        $this->assertDatabaseHas('doctor_vacations', [
            'id' => $vacationId,
            'status' => 'cancelled',
        ]);
        $this->assertDatabaseCount('doctor_vacations', 1);
    }

    /**
     * Test repeated cancellation is safe and idempotent.
     */
    public function test_repeated_cancellation_is_idempotent(): void
    {
        Queue::fake();

        $createRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-12-10',
                'vacation_end' => '2026-12-15',
            ]);

        $vacationId = $createRes->json('data.id');

        // First cancellation
        $this->actingAs($this->doctorUser, 'sanctum')
            ->deleteJson("/api/v1/doctor/vacations/{$vacationId}")
            ->assertStatus(200);

        // Second cancellation on already cancelled vacation
        $repeatRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->deleteJson("/api/v1/doctor/vacations/{$vacationId}");

        $repeatRes->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');
    }

    /**
     * Test cancelling non-existent vacation returns 404.
     */
    public function test_cancelling_non_existent_vacation_returns_404(): void
    {
        $nonExistentId = (string) \Illuminate\Support\Str::uuid();

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->deleteJson("/api/v1/doctor/vacations/{$nonExistentId}");

        $response->assertStatus(404);
    }

    /**
     * Test doctor cannot cancel another doctor's vacation (returns 403).
     */
    public function test_doctor_cannot_cancel_another_doctors_vacation(): void
    {
        Queue::fake();

        $createRes = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/doctor/vacations', [
                'vacation_start' => '2026-12-20',
                'vacation_end' => '2026-12-25',
            ]);

        $vacationId = $createRes->json('data.id');

        // Other doctor attempts to cancel
        $response = $this->actingAs($this->otherDoctorUser, 'sanctum')
            ->deleteJson("/api/v1/doctor/vacations/{$vacationId}");

        $response->assertStatus(403);
    }
}
