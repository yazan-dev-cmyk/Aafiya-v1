<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorTimeReservation;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientBookingPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $employedUser;
    protected Doctor $employedDoctor;
    protected Clinic $clinic;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected User $bookingCenterUser;
    protected BookingCenter $bookingCenter;
    protected User $registeredPatientUser;
    protected Patient $registeredPatient;
    protected User $guestPatientUser;

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
        $patientRegRole = Role::where('name', 'patient_registered')->firstOrFail();
        $patientGuestRole = Role::where('name', 'patient_guest')->firstOrFail();

        // 1. Director Doctor & Clinic
        $this->directorUser = User::factory()->create(['email' => 'director@clinic.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-1234',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة النور الطبية',
            'address' => 'شارع الشهداء، الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021000001',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
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
            'is_active' => true,
        ]);

        // 3. Clinic Assistant
        $this->assistantUser = User::factory()->create(['email' => 'assistant@clinic.dz']);
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->assistant = ClinicAssistant::create([
            'user_id' => $this->assistantUser->id,
            'clinic_id' => $this->clinic->id,
            'is_active' => true,
        ]);

        // 4. Booking Center
        $this->bookingCenterUser = User::factory()->create(['email' => 'bc@center.dz']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز الحجز المعتمد',
            'phone' => '021998877',
            'address' => 'ديدوش مراد',
            'wilaya' => 'الجزائر',
            'quota_balance' => 10,
            'is_active' => true,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
        ]);

        // 5. Registered Patient
        $this->registeredPatientUser = User::factory()->create(['email' => 'patient.reg@aafiya.dz']);
        $this->registeredPatientUser->roles()->attach($patientRegRole->id);
        $this->registeredPatient = Patient::create([
            'user_id' => $this->registeredPatientUser->id,
            'first_name' => 'سليم',
            'last_name' => 'بن عيسى',
            'gender' => 'male',
            'date_of_birth' => '1992-06-15',
            'phone' => '0555123456',
            'wilaya' => 'الجزائر',
            'mrn' => 'MRN-2026-8801',
        ]);

        // 6. Guest Patient
        $this->guestPatientUser = User::factory()->create(['email' => 'patient.guest@aafiya.dz']);
        $this->guestPatientUser->roles()->attach($patientGuestRole->id);

        // Setup operating hours and activated schedules
        $this->setupWorkingHoursFixture();
    }

    protected function setupWorkingHoursFixture(): void
    {
        $clinicHoursService = app(\App\Services\ClinicOperatingHoursService::class);
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $days[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'periods' => [
                    ['period_index' => 0, 'open_time' => '08:00', 'close_time' => '17:00'],
                ],
            ];
        }
        $clinicHoursService->saveOperatingHours($this->clinic->id, $days, $this->directorUser);

        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        $doctorScheduleDays = [];
        for ($d = 0; $d <= 6; $d++) {
            $doctorScheduleDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'slots' => $slots,
            ];
        }

        $doctorHoursService = app(\App\Services\DoctorWorkingHoursService::class);
        foreach ([$this->directorDoctor, $this->employedDoctor] as $doc) {
            $doctorHoursService->saveDraft($this->clinic->id, $doc->id, $doctorScheduleDays, $this->directorUser);
            $doctorHoursService->activateSchedule($this->clinic->id, $doc->id, $this->directorUser);
        }
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض غير مسجل',
            'patient_phone' => '0550998877',
            'appointment_date' => $date,
            'time_slot' => '09:00',
        ]);

        $response->assertStatus(401);
    }

    public function test_guest_patient_is_strictly_rejected_with_403_even_if_booking_enabled(): void
    {
        // Even when patient booking is enabled in the test environment, guest role is strictly rejected
        config(['booking.patient_booking_enabled' => true]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->guestPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'ضيف عابر',
            'patient_phone' => '0550112233',
            'appointment_date' => $date,
            'time_slot' => '09:00',
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('المريض الضيف', $response->json('message'));
        $this->assertEquals(0, Appointment::count());
    }

    public function test_registered_patient_is_rejected_by_default_fail_closed(): void
    {
        // Ensure default fail-closed state
        config(['booking.patient_booking_enabled' => false]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->registeredPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'سليم بن عيسى',
            'patient_phone' => '0555123456',
            'appointment_date' => $date,
            'time_slot' => '09:00',
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('غير مفعّل حالياً', $response->json('message'));
        $this->assertStringContainsString('الدفع الإلكتروني', $response->json('message'));
    }

    public function test_default_rejection_leaves_no_appointment_and_does_not_increment_slot_capacity(): void
    {
        config(['booking.patient_booking_enabled' => false]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->registeredPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'سليم بن عيسى',
            'patient_phone' => '0555123456',
            'appointment_date' => $date,
            'time_slot' => '09:00',
        ]);

        $response->assertStatus(403);

        // Verify total database invariants
        $this->assertEquals(0, Appointment::count(), 'Zero appointments created on rejection');
        $this->assertEquals(0, DoctorTimeReservation::count(), 'Zero doctor reservations held');

        $slot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->employedDoctor->id)
            ->where('appointment_date', $date)
            ->where('time_slot', '09:00')
            ->first();

        $bookedCount = $slot ? (int) $slot->booked_count : 0;
        $this->assertEquals(0, $bookedCount, 'Slot booked_count was not incremented');
    }

    public function test_registered_patient_can_create_appointment_when_booking_enabled_in_isolated_test(): void
    {
        // Explicitly enable for isolated test verification
        config(['booking.patient_booking_enabled' => true]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->registeredPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'سليم بن عيسى',
            'patient_phone' => '0555123456',
            'appointment_date' => $date,
            'time_slot' => '10:00',
            'notes' => 'حجز تجريبي للمريض المسجل',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.time_slot', '10:00')
            ->assertJsonPath('data.patient.id', $this->registeredPatient->id);

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_id' => $this->registeredPatient->id,
            'time_slot' => '10:00',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('doctor_time_reservations', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'appointment_date' => $date,
            'time_slot' => '10:00',
        ]);

        $slot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->employedDoctor->id)
            ->where('appointment_date', $date)
            ->where('time_slot', '10:00')
            ->firstOrFail();

        $this->assertEquals(1, (int) $slot->booked_count);
    }

    public function test_clinic_assistant_booking_remains_operational_regardless_of_patient_booking_flag(): void
    {
        // Patient booking disabled
        config(['booking.patient_booking_enabled' => false]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->assistantUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'مريض قادم للعيادة',
            'patient_phone' => '0555888999',
            'appointment_date' => $date,
            'time_slot' => '11:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.time_slot', '11:00');

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_phone' => '0555888999',
            'creator_type' => 'clinic_assistant',
        ]);
    }

    public function test_booking_center_booking_remains_operational_regardless_of_patient_booking_flag(): void
    {
        // Patient booking disabled
        config(['booking.patient_booking_enabled' => false]);

        $date = now()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'booking_center_id' => $this->bookingCenter->id,
            'patient_name' => 'مريض مركز الحجز',
            'patient_phone' => '0555777888',
            'appointment_date' => $date,
            'time_slot' => '12:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.time_slot', '12:00');

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_phone' => '0555777888',
            'creator_type' => 'booking_center',
        ]);
    }

    public function test_reverting_to_disabled_restores_fail_closed_rejection(): void
    {
        // 1. Enable and verify success
        config(['booking.patient_booking_enabled' => true]);
        $date = now()->addDays(2)->format('Y-m-d');

        $r1 = $this->actingAs($this->registeredPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'سليم بن عيسى',
            'patient_phone' => '0555123456',
            'appointment_date' => $date,
            'time_slot' => '14:00',
        ]);
        $r1->assertStatus(201);

        // 2. Revert to disabled
        config(['booking.patient_booking_enabled' => false]);

        $r2 = $this->actingAs($this->registeredPatientUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->employedDoctor->id,
            'patient_name' => 'سليم بن عيسى',
            'patient_phone' => '0555123456',
            'appointment_date' => $date,
            'time_slot' => '15:00',
        ]);

        $r2->assertStatus(403);
        $this->assertStringContainsString('غير مفعّل حالياً', $r2->json('message'));

        // Confirm only 1 appointment exists in database (from r1, none from r2)
        $this->assertEquals(1, Appointment::count());
    }
}
