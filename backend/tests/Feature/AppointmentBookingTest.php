<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentBookingTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $employedUser;
    protected Doctor $employedDoctor;
    protected Clinic $clinic;
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
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // 1. Director Doctor & Clinic
        $this->directorUser = User::factory()->create(['email' => 'director@clinic.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-1234',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة النور الطبية',
            'address' => 'شارع الشهداء، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021000001',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 2, // Low capacity for testing limits
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 2. Employed Doctor
        $this->employedUser = User::factory()->create(['email' => 'employed@clinic.dz']);
        $this->employedUser->roles()->attach($doctorRole->id);
        $this->employedDoctor = Doctor::create([
            'user_id' => $this->employedUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-5678',
        ]);

        $this->employedDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
        ]);

        // 3. Booking Center
        $this->bookingCenterUser = User::factory()->create(['email' => 'bc@center.dz']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز الحجز المركزي الجزائري',
            'phone' => '021998877',
            'address' => 'ديدوش مراد',
            'wilaya' => 'الجزائر',
            'quota_balance' => 10,
        ]);
    }

    public function test_can_create_appointment_with_1_hour_slot(): void
    {
        $patientUser = User::factory()->create();

        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'أحمد بوزيد',
            'patient_phone' => '0550112233',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
            'notes' => 'استشارة طبية أولى',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.time_slot', '09:00')
            ->assertJsonPath('data.patient.name', 'أحمد بوزيد');

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_phone' => '0550112233',
            'status' => 'pending',
        ]);

        $appointment = Appointment::first();
        $this->assertMatchesRegularExpression('/^MS-\d{4}-\d{4}$/', $appointment->booking_reference);

        // Verify status history
        $this->assertDatabaseHas('appointment_status_history', [
            'appointment_id' => $appointment->id,
            'to_status' => 'pending',
        ]);
    }

    public function test_rejects_invalid_non_hourly_slot(): void
    {
        $patientUser = User::factory()->create();

        $response = $this->actingAs($patientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'أحمد بوزيد',
            'patient_phone' => '0550112233',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:30', // Fractional slot - forbidden by P3
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['time_slot']);
    }

    public function test_enforces_capacity_limit_per_doctor_per_slot(): void
    {
        $patient1 = User::factory()->create();
        $patient2 = User::factory()->create();
        $patient3 = User::factory()->create();

        $date = now()->addDays(3)->format('Y-m-d');

        // Book slot 1 (Capacity 1/2)
        $r1 = $this->actingAs($patient1, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'المريض الأول',
            'patient_phone' => '0550000001',
            'appointment_date' => $date,
            'time_slot' => '10:00',
        ]);
        $r1->assertStatus(201);

        // Book slot 2 (Capacity 2/2 - Full)
        $r2 = $this->actingAs($patient2, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'المريض الثاني',
            'patient_phone' => '0550000002',
            'appointment_date' => $date,
            'time_slot' => '10:00',
        ]);
        $r2->assertStatus(201);

        // Book slot 3 (Capacity 3/2 - Over capacity, must reject!)
        $r3 = $this->actingAs($patient3, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'المريض الثالث',
            'patient_phone' => '0550000003',
            'appointment_date' => $date,
            'time_slot' => '10:00',
        ]);
        $r3->assertStatus(422)
            ->assertJsonValidationErrors(['capacity']);

        // Capacity isolation: Doctor Director still has 0/2 on same slot and should accept booking
        $r4 = $this->actingAs($patient3, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->directorDoctor->id,
            'patient_name' => 'المريض الثالث مع المدير',
            'patient_phone' => '0550000003',
            'appointment_date' => $date,
            'time_slot' => '10:00',
        ]);
        $r4->assertStatus(201);
    }

    public function test_can_query_available_slots_endpoint(): void
    {
        $date = now()->addDays(4)->format('Y-m-d');

        $response = $this->getJson("/api/v1/appointments/slots?doctor_id={$this->employedDoctor->id}&clinic_id={$this->clinic->id}&date={$date}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'doctor_id',
                    'clinic_id',
                    'date',
                    'slots' => [
                        '*' => ['time_slot', 'max_capacity', 'occupied', 'available', 'is_available'],
                    ],
                ],
            ]);
    }

    public function test_appointments_list_pagination_and_meta(): void
    {
        $this->directorDoctor->update(['is_verified' => true]);

        for ($i = 1; $i <= 25; $i++) {
            Appointment::create([
                'booking_reference' => sprintf('MS-2026-PAG-%04d', $i),
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->directorDoctor->id,
                'patient_name' => "مريض الموعد {$i}",
                'patient_phone' => sprintf('055000%04d', $i),
                'appointment_date' => '2026-09-07',
                'time_slot' => sprintf('%02d:00', ($i % 8) + 8),
                'status' => 'confirmed',
                'created_by_id' => $this->directorUser->id,
            ]);
        }

        $res1 = $this->actingAs($this->directorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/appointments?page=1&per_page=10');

        $res1->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.last_page', 3);

        $res2 = $this->actingAs($this->directorUser, 'sanctum')
            ->withHeaders(['X-Clinic-ID' => $this->clinic->id])
            ->getJson('/api/v1/appointments?page=2&per_page=10');

        $res2->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2);

        $page1Ids = collect($res1->json('data'))->pluck('id');
        $page2Ids = collect($res2->json('data'))->pluck('id');

        $this->assertEmpty($page1Ids->intersect($page2Ids));
    }
}

