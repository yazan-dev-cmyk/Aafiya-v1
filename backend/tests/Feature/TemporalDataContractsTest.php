<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingTransaction;
use App\Models\Clinic;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalVisit;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
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

class TemporalDataContractsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $patientUser;
    protected Patient $patient;
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

        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // 1. Admin
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);

        // 2. Doctor & Clinic
        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-9900',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الشفاء',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021000000',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 30,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        // 3. Patient
        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);
        $this->patient = Patient::create([
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-TEMP',
            'first_name' => 'كمال',
            'last_name' => 'العربي',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '0661000000',
        ]);

        // 4. Booking Center
        $this->bookingCenterUser = User::factory()->create();
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز العاصمة',
            'phone' => '021999999',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'verification_status' => 'verified',
            'is_active' => true,
            'quota_balance' => 100,
        ]);
    }

    public function test_appointments_date_range_filtering_and_validation(): void
    {
        // Create 3 appointments on different dates
        Appointment::create([
            'booking_reference' => 'REF-SEPT-01',
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'كمال العربي',
            'patient_phone' => '0661000000',
            'created_by_id' => $this->adminUser->id,
            'appointment_date' => '2026-09-01',
            'time_slot' => '09:00',
            'status' => 'confirmed',
        ]);

        Appointment::create([
            'booking_reference' => 'REF-SEPT-15',
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'كمال العربي',
            'patient_phone' => '0661000000',
            'created_by_id' => $this->adminUser->id,
            'appointment_date' => '2026-09-15',
            'time_slot' => '10:00',
            'status' => 'confirmed',
        ]);

        Appointment::create([
            'booking_reference' => 'REF-OCT-01',
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'كمال العربي',
            'patient_phone' => '0661000000',
            'created_by_id' => $this->adminUser->id,
            'appointment_date' => '2026-10-01',
            'time_slot' => '11:00',
            'status' => 'confirmed',
        ]);

        // Range search September 2026
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/appointments?from_date=2026-09-01&to_date=2026-09-30');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // Validation test: from_date > to_date -> 422
        $invalidRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/appointments?from_date=2026-09-30&to_date=2026-09-01');
        $invalidRes->assertStatus(422)
            ->assertJsonValidationErrors(['to_date']);

        // Validation test: malformed date -> 422
        $malformedRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/appointments?from_date=invalid-date');
        $malformedRes->assertStatus(422)
            ->assertJsonValidationErrors(['from_date']);
    }

    public function test_clinical_visits_date_range_filtering(): void
    {
        ClinicalVisit::create([
            'visit_reference' => 'VIS-SEPT-05',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => '2026-09-05',
            'chief_complaint' => 'متابعة دورية',
            'status' => 'finalized',
        ]);

        ClinicalVisit::create([
            'visit_reference' => 'VIS-OCT-10',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'visit_date' => '2026-10-10',
            'chief_complaint' => 'فحص شامل',
            'status' => 'finalized',
        ]);

        $res = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/clinical-visits?from_date=2026-09-01&to_date=2026-09-30');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.visit_reference', 'VIS-SEPT-05');
    }

    public function test_prescriptions_date_range_filtering_on_issue_date(): void
    {
        Prescription::create([
            'prescription_reference' => 'RX-SEPT-01',
            'secure_token' => str_repeat('a', 64),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'issue_date' => '2026-09-01',
            'expiry_date' => '2026-10-01',
            'status' => 'active',
        ]);

        Prescription::create([
            'prescription_reference' => 'RX-NOV-01',
            'secure_token' => str_repeat('b', 64),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'issue_date' => '2026-11-01',
            'expiry_date' => '2026-12-01',
            'status' => 'active',
        ]);

        $res = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/prescriptions?from_date=2026-09-01&to_date=2026-09-30');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.prescription_reference', 'RX-SEPT-01');
    }

    public function test_diagnostic_orders_date_range_filtering_on_ordered_at(): void
    {
        DiagnosticOrder::create([
            'order_reference' => 'ORD-SEPT-01',
            'secure_token' => str_repeat('c', 64),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'order_type' => 'laboratory',
            'priority' => 'routine',
            'status' => 'created',
            'ordered_at' => '2026-09-01 10:30:00',
        ]);

        DiagnosticOrder::create([
            'order_reference' => 'ORD-OCT-01',
            'secure_token' => str_repeat('d', 64),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'order_type' => 'laboratory',
            'priority' => 'routine',
            'status' => 'created',
            'ordered_at' => '2026-10-01 10:30:00',
        ]);

        $res = $this->actingAs($this->doctorUser, 'sanctum')
            ->getJson('/api/v1/diagnostic-orders?from_date=2026-09-01&to_date=2026-09-30&order_type=laboratory');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_reference', 'ORD-SEPT-01');
    }

    public function test_booking_center_transactions_date_range_filtering(): void
    {
        \Illuminate\Support\Facades\DB::table('booking_transactions')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'booking_center_id' => $this->bookingCenter->id,
            'transaction_type' => 'purchase',
            'units' => 50,
            'balance_after' => 150,
            'created_by_id' => $this->adminUser->id,
            'created_at' => '2026-09-01 14:00:00',
            'updated_at' => '2026-09-01 14:00:00',
        ]);

        \Illuminate\Support\Facades\DB::table('booking_transactions')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'booking_center_id' => $this->bookingCenter->id,
            'transaction_type' => 'booking_deduction',
            'units' => -1,
            'balance_after' => 149,
            'created_by_id' => $this->bookingCenterUser->id,
            'created_at' => '2026-10-01 14:00:00',
            'updated_at' => '2026-10-01 14:00:00',
        ]);

        $res = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->getJson('/api/v1/booking-centers/transactions?from_date=2026-09-01&to_date=2026-09-30');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.units', 50);
    }

    public function test_clinical_access_logs_date_range_filtering_and_validation(): void
    {
        \Illuminate\Support\Facades\DB::table('clinical_access_logs')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'actor_id' => $this->doctorUser->id,
            'actor_role' => 'doctor',
            'actor_position' => 'director',
            'patient_id' => $this->patient->id,
            'resource_type' => 'patient_ehr',
            'resource_id' => $this->patient->id,
            'action' => 'view_summary',
            'access_reason' => 'direct_care',
            'created_at' => '2026-09-05 12:00:00',
        ]);

        $res = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/audit/clinical-access-logs?from_date=2026-09-01&to_date=2026-09-30');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $invRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/audit/clinical-access-logs?from_date=2026-09-30&to_date=2026-09-01');

        $invRes->assertStatus(422)
            ->assertJsonValidationErrors(['to_date']);
    }
}
