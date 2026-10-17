<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\NotificationOutbox;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentCancellationNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected Doctor $doctor;
    protected User $doctorUser;
    protected string $doctorToken;
    protected User $assistantUser;
    protected ClinicAssistant $assistant;
    protected string $assistantToken;
    protected User $patientUser;
    protected Patient $patient;
    protected string $patientToken;
    protected User $otherPatientUser;
    protected Patient $otherPatient;
    protected string $otherPatientToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        // 1. Clinic
        $this->clinic = Clinic::create([
            'id' => (string) Str::uuid(),
            'name' => 'عيادة الشفاء المركزية',
            'address' => 'نهج الأمير عبد القادر، وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550111999',
            'is_active' => true,
        ]);

        // 2. Doctor
        $this->doctorUser = User::factory()->create([
            'name' => 'د. مصطفى حساني',
            'email' => 'dr.hassani_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213551100001',
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->doctorUser->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-ORAN-2026-99',
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);
        $this->clinic->update(['director_doctor_id' => $this->doctor->id]);
        $this->doctorToken = $this->doctorUser->createToken('doc-token')->plainTextToken;

        // 3. Assistant
        $this->assistantUser = User::factory()->create([
            'name' => 'سميرة بلقاضي',
            'email' => 'samira.assistant_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213552200002',
            'is_active' => true,
        ]);
        $this->assistantUser->assignRole('doctor_assistant');

        $this->assistant = ClinicAssistant::create([
            'clinic_id' => $this->clinic->id,
            'user_id' => $this->assistantUser->id,
            'is_active' => true,
            'permissions_json' => [
                'booking.manage_queue',
                'booking.confirm_attendance',
                'booking.create',
            ],
        ]);
        $this->assistantToken = $this->assistantUser->createToken('ast-token')->plainTextToken;

        // 4. Primary Patient
        $this->patientUser = User::factory()->create([
            'name' => 'كريم بن ناصر',
            'email' => 'karim.patient_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213553300003',
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient');

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-ORAN-101',
            'first_name' => 'كريم',
            'last_name' => 'بن ناصر',
            'gender' => 'male',
            'date_of_birth' => '1990-05-10',
            'phone' => '+213553300003',
            'email' => $this->patientUser->email,
            'wilaya' => 'وهران',
        ]);
        $this->patientToken = $this->patientUser->createToken('patient-token')->plainTextToken;

        // 5. Other Patient
        $this->otherPatientUser = User::factory()->create([
            'name' => 'أحمد سعيدي',
            'email' => 'ahmed.patient_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213554400004',
            'is_active' => true,
        ]);
        $this->otherPatientUser->assignRole('patient');

        $this->otherPatient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->otherPatientUser->id,
            'mrn' => 'MRN-2026-ORAN-102',
            'first_name' => 'أحمد',
            'last_name' => 'سعيدي',
            'gender' => 'male',
            'date_of_birth' => '1985-02-14',
            'phone' => '+213554400004',
            'email' => $this->otherPatientUser->email,
            'wilaya' => 'وهران',
        ]);
        $this->otherPatientToken = $this->otherPatientUser->createToken('other-patient-token')->plainTextToken;
    }

    protected function createAppointment(string $status = 'confirmed', string $ref = 'REF-NOTIF-01'): Appointment
    {
        return Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => $ref,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
            'appointment_date' => '2026-10-30',
            'time_slot' => '10:00',
            'status' => $status,
            'creator_type' => 'patient',
            'created_by_id' => $this->patientUser->id,
        ]);
    }

    /**
     * 1. Assistant cancelling an appointment creates in_app NotificationOutbox record.
     */
    public function test_01_assistant_cancelling_appointment_creates_in_app_notification_in_outbox(): void
    {
        $appointment = $this->createAppointment('confirmed', 'REF-AST-CANCEL-01');

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
                'reason' => 'ظرف طارئ لدى الطبيب المعالج',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'cancelled');

        // Verify NotificationOutbox record exists
        $this->assertDatabaseHas('notification_outbox', [
            'appointment_id' => $appointment->id,
            'recipient_phone' => $this->patient->phone,
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'appointment_cancelled',
            'status' => NotificationOutbox::STATUS_SENT,
            'idempotency_key' => "appointment_cancelled_{$appointment->id}",
        ]);

        $notification = NotificationOutbox::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($notification);
        $this->assertEquals('ظرف طارئ لدى الطبيب المعالج', $notification->payload['reason']);
        $this->assertEquals('سميرة بلقاضي', $notification->payload['cancelled_by']);
        $this->assertStringContainsString('تم إلغاء موعدكم الطبي', $notification->payload['message']);
        $this->assertStringContainsString('ظرف طارئ لدى الطبيب المعالج', $notification->payload['message']);
    }

    /**
     * 2. Patient can query and view the cancellation notification via PatientNotificationController.
     */
    public function test_02_patient_can_view_cancellation_notification_via_api(): void
    {
        $appointment = $this->createAppointment('pending', 'REF-AST-CANCEL-02');

        // Cancel by assistant
        $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
                'reason' => 'عدم توفر سرير الفحص',
            ])
            ->assertStatus(200);

        // Query patient notifications
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson('/api/v1/patient/notifications');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        $first = $data[0];
        $this->assertEquals($appointment->id, $first['appointment_id']);
        $this->assertEquals('appointment_cancelled', $first['template']);
        $this->assertEquals('in_app', $first['channel']);
        $this->assertStringContainsString('REF-AST-CANCEL-02', $first['payload']['message']);
    }

    /**
     * 3. Patient cancelling own appointment produces a customized self-confirmation message.
     */
    public function test_03_patient_cancelling_own_appointment_creates_self_confirmation_notification(): void
    {
        $appointment = $this->createAppointment('pending', 'REF-PAT-SELF-03');

        // Cancel by the patient himself
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", [
                'reason' => 'تعارض مع موعد عمل شخصي',
            ]);

        $response->assertStatus(200);

        $notification = NotificationOutbox::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($notification);
        $this->assertEquals('appointment_cancelled', $notification->template);
        $this->assertStringContainsString('بناءً على طلبكم', $notification->payload['message']);
    }

    /**
     * 4. Cancellation notification is idempotent and does not create duplicate rows on repeat.
     */
    public function test_04_cancellation_notification_is_idempotent(): void
    {
        $appointment = $this->createAppointment('confirmed', 'REF-IDEMP-04');

        // First cancellation
        $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", ['reason' => 'سبب أولي'])
            ->assertStatus(200);

        $countInitial = NotificationOutbox::where('appointment_id', $appointment->id)->count();
        $this->assertEquals(1, $countInitial);

        // Second cancellation on already cancelled appointment
        $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", ['reason' => 'سبب متكرر'])
            ->assertStatus(200);

        $countRepeat = NotificationOutbox::where('appointment_id', $appointment->id)->count();
        $this->assertEquals(1, $countRepeat);
    }

    /**
     * 5. Data isolation: Another patient cannot access or view this patient's cancellation notification.
     */
    public function test_05_isolation_other_patients_cannot_see_the_cancellation_notification(): void
    {
        $appointment = $this->createAppointment('confirmed', 'REF-ISOL-05');

        $this->withHeader('Authorization', 'Bearer ' . $this->assistantToken)
            ->postJson("/api/v1/appointments/{$appointment->id}/cancel", ['reason' => 'إلغاء خاص'])
            ->assertStatus(200);

        // Other patient queries their notifications
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->otherPatientToken)
            ->getJson('/api/v1/patient/notifications');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEmpty($data);
    }
}
