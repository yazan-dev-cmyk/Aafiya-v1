<?php

namespace Tests\Feature\Api\V1;

use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AppointmentAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected User $assistantUser;
    protected ClinicAssistant $clinicAssistant;

    protected User $otherDoctorUser;
    protected Doctor $otherDoctor;
    protected Clinic $otherClinic;
    protected User $otherAssistantUser;
    protected ClinicAssistant $otherClinicAssistant;

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
        $assistantRole = Role::where('name', 'doctor_assistant')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();
        $bcRole = Role::where('name', 'booking_center')->firstOrFail();

        // 1. Admin User
        $this->adminUser = User::factory()->create(['email' => 'admin@aafiya.dz']);
        $this->adminUser->roles()->attach($adminRole->id);

        // 2. Primary Doctor & Clinic
        $this->doctorUser = User::factory()->create(['email' => 'dr.ahmed@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-ALG-1001',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة ابن سينا',
            'address' => 'شارع ديدوش مراد، الجزائر الوسطى',
            'wilaya' => 'الجزائر',
            'phone' => '021710001',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 3. Primary Clinic Assistant
        $this->assistantUser = User::factory()->create(['email' => 'assistant1@aafiya.dz']);
        $this->assistantUser->roles()->attach($assistantRole->id);
        $this->clinicAssistant = ClinicAssistant::create([
            'clinic_id' => $this->clinic->id,
            'user_id' => $this->assistantUser->id,
            'is_active' => true,
        ]);

        // 4. Secondary Doctor & Clinic (for cross-clinic isolation tests)
        $this->otherDoctorUser = User::factory()->create(['email' => 'dr.karim@aafiya.dz']);
        $this->otherDoctorUser->roles()->attach($doctorRole->id);
        $this->otherDoctor = Doctor::create([
            'user_id' => $this->otherDoctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-ORN-2002',
            'is_verified' => true,
        ]);

        $this->otherClinic = Clinic::create([
            'name' => 'عيادة وهران المركزية',
            'address' => 'حي العقيد لطفي، وهران',
            'wilaya' => 'وهران',
            'phone' => '041520002',
            'director_doctor_id' => $this->otherDoctor->id,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
        ]);

        $this->otherDoctor->clinics()->attach($this->otherClinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        $this->otherAssistantUser = User::factory()->create(['email' => 'assistant2@aafiya.dz']);
        $this->otherAssistantUser->roles()->attach($assistantRole->id);
        $this->otherClinicAssistant = ClinicAssistant::create([
            'clinic_id' => $this->otherClinic->id,
            'user_id' => $this->otherAssistantUser->id,
            'is_active' => true,
        ]);

        // 5. Patient
        $this->patientUser = User::factory()->create(['email' => 'patient@aafiya.dz']);
        $this->patientUser->roles()->attach($patientRole->id);
        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-PAT01',
            'first_name' => 'ياسمين',
            'last_name' => 'بوزيد',
            'gender' => 'female',
            'date_of_birth' => '1998-07-20',
            'phone' => '0555987654',
            'national_id' => '199816010088',
        ]);

        // 6. Booking Center
        $this->bookingCenterUser = User::factory()->create(['email' => 'bookingcenter@aafiya.dz']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز العاصمة',
            'phone' => '021998877',
            'address' => 'ساحة أول ماي، الجزائر',
            'wilaya' => 'الجزائر',
            'quota_balance' => 10,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'verified_at' => now(),
            'is_active' => true,
        ]);
    }

    /**
     * Helper to create an appointment.
     */
    protected function createAppointment(string $status = 'confirmed', array $overrides = []): Appointment
    {
        static $sequence = 100;
        $sequence++;

        $bookingService = app(BookingService::class);
        $data = array_merge([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض تجريبي ' . $sequence,
            'patient_phone' => '0555' . str_pad((string) $sequence, 6, '0', STR_PAD_LEFT),
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
        ], $overrides);

        $appointment = $bookingService->createAppointment($data, $this->assistantUser);

        if ($status !== 'pending') {
            $appointment->update([
                'status' => $status,
                'confirmed_at' => $status === 'confirmed' ? now() : null,
                'confirmed_by_id' => $status === 'confirmed' ? $this->doctorUser->id : null,
            ]);
        }

        return $appointment->fresh();
    }

    // =========================================================================
    // GROUP 1: ATTENDANCE MARKING (POST /api/v1/appointments/{appointment}/attend)
    // =========================================================================

    public function test_01_confirmed_appointment_can_be_attended_by_active_doctor(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->doctorUser->id, $fresh->checked_in_by_id);
    }

    public function test_02_confirmed_appointment_can_be_attended_by_active_assistant(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->assistantUser->id, $fresh->checked_in_by_id);
    }

    public function test_03_confirmed_appointment_can_be_attended_by_admin(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->adminUser->id, $fresh->checked_in_by_id);
    }

    public function test_04_repeat_attend_is_safely_idempotent(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // First attend
        $res1 = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");
        $res1->assertStatus(200);

        $initialCheckedInAt = $appointment->fresh()->checked_in_at;
        $attendedHistoryCount = AppointmentStatusHistory::where('appointment_id', $appointment->id)
            ->where('to_status', 'attended')
            ->count();
        $this->assertEquals(1, $attendedHistoryCount);

        // Second attend (idempotent retry)
        $res2 = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");
        $res2->assertStatus(200);
        $res2->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertEquals($initialCheckedInAt->toIso8601String(), $fresh->checked_in_at->toIso8601String());
        $this->assertEquals(1, AppointmentStatusHistory::where('appointment_id', $appointment->id)->where('to_status', 'attended')->count());
    }

    public function test_05_pending_appointment_cannot_be_attended_and_returns_422(): void
    {
        $appointment = $this->createAppointment('pending');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.');

        $fresh = $appointment->fresh();
        $this->assertEquals('pending', $fresh->status);
        $this->assertNull($fresh->checked_in_at);
    }

    public function test_06_cancelled_appointment_cannot_be_attended_and_returns_422(): void
    {
        $appointment = $this->createAppointment('cancelled');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل حضور موعد ملغى.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل حضور موعد ملغى.');

        $this->assertEquals('cancelled', $appointment->fresh()->status);
    }

    public function test_07_rejected_appointment_cannot_be_attended_and_returns_422(): void
    {
        $appointment = $this->createAppointment('rejected');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل حضور موعد مرفوض.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل حضور موعد مرفوض.');

        $this->assertEquals('rejected', $appointment->fresh()->status);
    }

    public function test_08_expired_appointment_cannot_be_attended_and_returns_422(): void
    {
        $appointment = $this->createAppointment('expired');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل حضور موعد منتهي الصلاحية.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل حضور موعد منتهي الصلاحية.');

        $this->assertEquals('expired', $appointment->fresh()->status);
    }

    public function test_09_no_show_appointment_cannot_be_attended_and_returns_422(): void
    {
        $appointment = $this->createAppointment('no_show');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);

        $this->assertEquals('no_show', $appointment->fresh()->status);
    }

    public function test_10_cross_clinic_doctor_cannot_attend_appointment_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->otherDoctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');
        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_11_cross_clinic_assistant_cannot_attend_appointment_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->otherAssistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');
        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_12_patient_or_booking_center_cannot_attend_appointment_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // Patient attempt
        $resPatient = $this->actingAs($this->patientUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");
        $resPatient->assertStatus(403);
        $resPatient->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        // Booking center attempt
        $resBc = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");
        $resBc->assertStatus(403);
        $resBc->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    // =========================================================================
    // GROUP 2: NO-SHOW MARKING (POST /api/v1/appointments/{appointment}/no-show)
    // =========================================================================

    public function test_13_confirmed_appointment_can_be_marked_no_show_by_active_doctor(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show", [
                'reason' => 'لم يحضر المريض بعد انتظار 45 دقيقة',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'no_show');

        $fresh = $appointment->fresh();
        $this->assertEquals('no_show', $fresh->status);

        $history = AppointmentStatusHistory::where('appointment_id', $appointment->id)
            ->where('to_status', 'no_show')
            ->latest('id')
            ->first();
        $this->assertNotNull($history);
        $this->assertEquals('لم يحضر المريض بعد انتظار 45 دقيقة', $history->reason);
        $this->assertEquals($this->doctorUser->id, $history->changed_by_id);
    }

    public function test_14_confirmed_appointment_can_be_marked_no_show_by_active_assistant(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'no_show');

        $fresh = $appointment->fresh();
        $this->assertEquals('no_show', $fresh->status);
    }

    public function test_15_confirmed_appointment_can_be_marked_no_show_by_admin(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'no_show');

        $fresh = $appointment->fresh();
        $this->assertEquals('no_show', $fresh->status);
    }

    public function test_16_pending_appointment_cannot_be_marked_no_show_and_returns_422(): void
    {
        $appointment = $this->createAppointment('pending');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل عدم الحضور لموعد قيد الانتظار. يجب تأكيد الموعد أولاً.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل عدم الحضور لموعد قيد الانتظار. يجب تأكيد الموعد أولاً.');

        $this->assertEquals('pending', $appointment->fresh()->status);
    }

    public function test_17_attended_appointment_cannot_be_marked_no_show_and_returns_422(): void
    {
        $appointment = $this->createAppointment('attended');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل عدم الحضور لموعد تم تسجيل حضوره.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل عدم الحضور لموعد تم تسجيل حضوره.');

        $this->assertEquals('attended', $appointment->fresh()->status);
    }

    public function test_18_cancelled_or_rejected_or_expired_cannot_be_marked_no_show_and_returns_422(): void
    {
        $expectedMessages = [
            'cancelled' => 'لا يمكن تسجيل عدم الحضور لموعد ملغى.',
            'rejected' => 'لا يمكن تسجيل عدم الحضور لموعد مرفوض.',
            'expired' => 'لا يمكن تسجيل عدم الحضور لموعد منتهي الصلاحية.',
        ];

        foreach ($expectedMessages as $badStatus => $expectedMsg) {
            $appointment = $this->createAppointment($badStatus);

            $response = $this->actingAs($this->assistantUser, 'sanctum')
                ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['status']);
            $response->assertJsonPath('message', $expectedMsg);
            $response->assertJsonPath('errors.status.0', $expectedMsg);
            $this->assertEquals($badStatus, $appointment->fresh()->status);
        }
    }

    public function test_19_no_show_appointment_cannot_be_marked_no_show_again_and_returns_422(): void
    {
        $appointment = $this->createAppointment('no_show');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $this->assertEquals('no_show', $appointment->fresh()->status);
    }

    public function test_20_cross_clinic_staff_cannot_mark_no_show_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // Other Doctor
        $resDoc = $this->actingAs($this->otherDoctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");
        $resDoc->assertStatus(403);
        $resDoc->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        // Other Assistant
        $resAsst = $this->actingAs($this->otherAssistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");
        $resAsst->assertStatus(403);
        $resAsst->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_21_patient_or_booking_center_cannot_mark_no_show_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // Patient
        $resPat = $this->actingAs($this->patientUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");
        $resPat->assertStatus(403);
        $resPat->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        // Booking Center
        $resBc = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show");
        $resBc->assertStatus(403);
        $resBc->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    // =========================================================================
    // GROUP 3: TOKEN CHECK-IN (POST /api/v1/appointments/check-in)
    // =========================================================================

    public function test_22_token_check_in_succeeds_for_active_doctor(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->doctorUser->id, $fresh->checked_in_by_id);
    }

    public function test_23_token_check_in_succeeds_for_active_assistant(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'attended');

        $fresh = $appointment->fresh();
        $this->assertEquals('attended', $fresh->status);
        $this->assertNotNull($fresh->checked_in_at);
        $this->assertEquals($this->assistantUser->id, $fresh->checked_in_by_id);
    }

    public function test_24_token_check_in_is_safely_idempotent(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // First scan
        $res1 = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);
        $res1->assertStatus(200);

        $historyCount = AppointmentStatusHistory::where('appointment_id', $appointment->id)->count();

        // Second scan with same token
        $res2 = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);
        $res2->assertStatus(200);
        $res2->assertJsonPath('data.status', 'attended');

        $this->assertEquals($historyCount, AppointmentStatusHistory::where('appointment_id', $appointment->id)->count());
    }

    public function test_25_token_check_in_fails_for_pending_appointment_and_returns_422(): void
    {
        $appointment = $this->createAppointment('pending');

        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
        $response->assertJsonPath('message', 'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.');
        $response->assertJsonPath('errors.status.0', 'لا يمكن تسجيل حضور موعد قيد الانتظار. يجب تأكيد الموعد أولاً.');

        $fresh = $appointment->fresh();
        $this->assertEquals('pending', $fresh->status);
        $this->assertNull($fresh->checked_in_at);
    }

    public function test_26_token_check_in_fails_for_non_confirmed_appointments_and_returns_422(): void
    {
        $expectedMessages = [
            'cancelled' => 'لا يمكن تسجيل حضور موعد ملغى.',
            'rejected' => 'لا يمكن تسجيل حضور موعد مرفوض.',
            'expired' => 'لا يمكن تسجيل حضور موعد منتهي الصلاحية.',
        ];

        foreach ($expectedMessages as $badStatus => $expectedMsg) {
            $appointment = $this->createAppointment($badStatus);

            $response = $this->actingAs($this->assistantUser, 'sanctum')
                ->postJson('/api/v1/appointments/check-in', [
                    'token' => $appointment->secure_token,
                ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['status']);
            $response->assertJsonPath('message', $expectedMsg);
            $response->assertJsonPath('errors.status.0', $expectedMsg);
            $this->assertEquals($badStatus, $appointment->fresh()->status);
        }
    }

    public function test_27_token_check_in_fails_for_cross_clinic_staff_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        $response = $this->actingAs($this->otherAssistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');
        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_27b_token_check_in_fails_for_unauthorized_actor_and_returns_403(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // Patient token check-in attempt
        $resPatient = $this->actingAs($this->patientUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);
        $resPatient->assertStatus(403);
        $resPatient->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        // Booking Center token check-in attempt
        $resBc = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => $appointment->secure_token,
            ]);
        $resBc->assertStatus(403);
        $resBc->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء.');

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_28_token_check_in_fails_for_invalid_or_missing_token(): void
    {
        // Non-existent 64-char token
        $resInvalid = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', [
                'token' => Str::random(64),
            ]);
        $resInvalid->assertStatus(422);
        $resInvalid->assertJsonValidationErrors(['token']);
        $resInvalid->assertJsonPath('message', 'رمز تسجيل الحضور غير صالح.');
        $resInvalid->assertJsonPath('errors.token.0', 'رمز تسجيل الحضور غير صالح.');

        // Missing token
        $resMissing = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson('/api/v1/appointments/check-in', []);
        $resMissing->assertStatus(422);
        $resMissing->assertJsonValidationErrors(['token']);
    }

    // =========================================================================
    // GROUP 4: SIDE EFFECTS, LEDGER & AUTH GUARD
    // =========================================================================

    public function test_29_attendance_marking_does_not_alter_booking_center_quota(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        // Create pending appointment for booking center
        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'booking_center_id' => $this->bookingCenter->id,
            'patient_name' => 'مريض الحصة',
            'patient_phone' => '0555888111',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '11:00',
        ], $this->bookingCenterUser);

        // Confirm appointment -> deducts 1 quota (10 -> 9)
        $bookingService->confirmAppointment($appointment, $this->doctorUser);

        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);
        $txCountBefore = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count();
        $this->assertEquals(1, $txCountBefore);

        // Attend appointment
        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/attend");
        $response->assertStatus(200);

        // Assert Quota Balance is completely untouched
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);
        // Assert No new transactions logged
        $txCountAfter = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count();
        $this->assertEquals(1, $txCountAfter);
    }

    public function test_30_no_show_marking_does_not_refund_or_alter_booking_center_quota(): void
    {
        $this->bookingCenter->update(['quota_balance' => 10]);

        $bookingService = app(BookingService::class);
        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'booking_center_id' => $this->bookingCenter->id,
            'patient_name' => 'مريض عدم الحضور',
            'patient_phone' => '0555888222',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '12:00',
        ], $this->bookingCenterUser);

        // Confirm appointment -> deducts 1 quota (10 -> 9)
        $bookingService->confirmAppointment($appointment, $this->doctorUser);
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);

        // Mark No-Show
        $response = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appointment->id}/no-show", [
                'reason' => 'عدم حضور مريض مركز الحجز',
            ]);
        $response->assertStatus(200);

        // Assert Quota Balance is NOT refunded (remains 9, NOT 10)
        $this->assertEquals(9, $this->bookingCenter->fresh()->quota_balance);
        // Assert total transactions count remains 1 (no new transaction logged)
        $this->assertEquals(1, BookingTransaction::where('booking_center_id', $this->bookingCenter->id)->count());
        // Assert No refund transactions logged
        $refundTxCount = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('transaction_type', 'refund')
            ->count();
        $this->assertEquals(0, $refundTxCount);
    }

    public function test_31_attendance_and_no_show_record_correct_status_history(): void
    {
        // 1. Attendance status history
        $appAttend = $this->createAppointment('confirmed');
        $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appAttend->id}/attend")
            ->assertStatus(200);

        $attendHistory = AppointmentStatusHistory::where('appointment_id', $appAttend->id)
            ->where('to_status', 'attended')
            ->first();
        $this->assertNotNull($attendHistory);
        $this->assertEquals('confirmed', $attendHistory->from_status);
        $this->assertEquals('attended', $attendHistory->to_status);
        $this->assertEquals($this->assistantUser->id, $attendHistory->changed_by_id);

        // 2. No-Show status history
        $appNoShow = $this->createAppointment('confirmed');
        $this->actingAs($this->doctorUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$appNoShow->id}/no-show", [
                'reason' => 'سجل المريض تخلفاً عن الحضور',
            ])
            ->assertStatus(200);

        $noShowHistory = AppointmentStatusHistory::where('appointment_id', $appNoShow->id)
            ->where('to_status', 'no_show')
            ->first();
        $this->assertNotNull($noShowHistory);
        $this->assertEquals('confirmed', $noShowHistory->from_status);
        $this->assertEquals('no_show', $noShowHistory->to_status);
        $this->assertEquals($this->doctorUser->id, $noShowHistory->changed_by_id);
        $this->assertEquals('سجل المريض تخلفاً عن الحضور', $noShowHistory->reason);
    }

    public function test_32_unauthenticated_requests_to_attend_and_no_show_fail_with_401(): void
    {
        $appointment = $this->createAppointment('confirmed');

        // Attend unauthenticated
        $this->postJson("/api/v1/appointments/{$appointment->id}/attend")
            ->assertStatus(401);

        // No-Show unauthenticated
        $this->postJson("/api/v1/appointments/{$appointment->id}/no-show")
            ->assertStatus(401);

        // Check-In unauthenticated
        $this->postJson('/api/v1/appointments/check-in', [
            'token' => $appointment->secure_token,
        ])->assertStatus(401);

        $this->assertEquals('confirmed', $appointment->fresh()->status);
    }

    public function test_33_appointment_not_found_returns_404(): void
    {
        $nonExistentId = (string) Str::uuid();

        // Attend non-existent appointment
        $resAttend = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$nonExistentId}/attend");
        $resAttend->assertStatus(404);

        // No-show non-existent appointment
        $resNoShow = $this->actingAs($this->assistantUser, 'sanctum')
            ->postJson("/api/v1/appointments/{$nonExistentId}/no-show");
        $resNoShow->assertStatus(404);
    }
}
