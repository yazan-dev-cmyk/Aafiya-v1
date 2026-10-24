<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\ClinicOperatingHour;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\DoctorDaySchedule;
use App\Models\DoctorWorkingSlot;
use App\Models\NotificationOutbox;
use App\Models\Patient;
use App\Models\User;
use App\Services\BookingService;
use Carbon\Carbon;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AppointmentBookingNotificationTest extends TestCase
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

        $this->assertIsolationGate();

        Carbon::setTestNow(Carbon::parse('2026-10-24 09:00:00', 'Africa/Algiers'));

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        config(['booking.patient_booking_enabled' => true]);

        // 1. Clinic
        $this->clinic = Clinic::create([
            'id' => (string) Str::uuid(),
            'name' => 'عيادة الأمل التخصصية',
            'phone' => '021' . str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT),
            'address' => 'نهج العربي بن مهيدي، وهران',
            'wilaya' => '31',
            'is_active' => true,
        ]);

        // 2. Doctor & User
        $this->doctorUser = User::factory()->create([
            'name' => 'د. كريم بوعلام',
            'email' => 'dr.kareem_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0550' . rand(100000, 999999),
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب الأطفال',
            'license_number' => 'DOC-ORAN-' . Str::random(6),
            'is_active' => true,
            'is_verified' => true,
        ]);

        DoctorClinic::create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'is_working_hours_activated' => true,
            'working_hours_activated_at' => now(),
            'working_hours_activated_by_id' => $this->doctorUser->id,
            'schedule_activated_at' => now(),
            'schedule_activated_by_id' => $this->doctorUser->id,
        ]);
        $this->clinic->update(['director_doctor_id' => $this->doctor->id]);
        $this->doctorToken = $this->doctorUser->createToken('doc-token')->plainTextToken;

        // Operating hours & Doctor schedule
        for ($dow = 0; $dow <= 6; $dow++) {
            ClinicOperatingHour::create([
                'clinic_id' => $this->clinic->id,
                'day_of_week' => $dow,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);

            $daySched = DoctorDaySchedule::create([
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'day_of_week' => $dow,
                'is_open' => true,
            ]);

            foreach (['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'] as $slot) {
                DoctorWorkingSlot::create([
                    'doctor_day_schedule_id' => $daySched->id,
                    'time_slot' => $slot,
                    'is_available' => true,
                ]);
            }
        }

        // 3. Assistant
        $this->assistantUser = User::factory()->create([
            'name' => 'فاطمة الزهراء عون',
            'email' => 'fatima.ast_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0552' . rand(100000, 999999),
            'is_active' => true,
        ]);
        $this->assistantUser->assignRole('doctor_assistant');

        $this->assistant = ClinicAssistant::create([
            'clinic_id' => $this->clinic->id,
            'user_id' => $this->assistantUser->id,
            'assigned_doctor_id' => $this->doctor->id,
            'permissions_json' => ['booking.confirm', 'booking.create', 'booking.confirm_attendance'],
            'is_active' => true,
        ]);
        $this->assistantToken = $this->assistantUser->createToken('ast-token')->plainTextToken;

        // 4. Primary Patient
        $this->patientUser = User::factory()->create([
            'name' => 'ياسين براهيمي',
            'email' => 'yacine.patient_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0555' . rand(100000, 999999),
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient_registered');

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-ORAN-' . rand(100, 999),
            'first_name' => 'ياسين',
            'last_name' => 'براهيمي',
            'gender' => 'male',
            'date_of_birth' => '1992-05-10',
            'phone' => $this->patientUser->phone,
            'email' => $this->patientUser->email,
            'wilaya' => '31',
            'is_active' => true,
        ]);
        $this->patientToken = $this->patientUser->createToken('patient-token')->plainTextToken;

        // 5. Other Patient (Isolation testing)
        $this->otherPatientUser = User::factory()->create([
            'name' => 'عمر خوجة',
            'email' => 'omar.patient_' . Str::random(6) . '@aafiya.dz',
            'phone' => '0556' . rand(100000, 999999),
            'is_active' => true,
        ]);
        $this->otherPatientUser->assignRole('patient_registered');

        $this->otherPatient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->otherPatientUser->id,
            'mrn' => 'MRN-2026-ORAN-' . rand(100, 999),
            'first_name' => 'عمر',
            'last_name' => 'خوجة',
            'gender' => 'male',
            'date_of_birth' => '1988-11-20',
            'phone' => $this->otherPatientUser->phone,
            'email' => $this->otherPatientUser->email,
            'wilaya' => '31',
            'is_active' => true,
        ]);
        $this->otherPatientToken = $this->otherPatientUser->createToken('other-patient-token')->plainTextToken;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    protected function assertIsolationGate(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame(self::REQUIRED_TEST_DB, config('database.connections.mysql.database'));

        $stmt = DB::connection()->getPdo()->query('SELECT DATABASE() AS cur_db');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $this->assertSame(self::REQUIRED_TEST_DB, $row['cur_db']);
    }

    /**
     * 1. Successful appointment booking creates exactly one in-app notification for the patient.
     */
    public function test_01_successful_appointment_booking_creates_in_app_notification_for_patient(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-26',
            'time_slot' => '10:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $this->assertNotNull($appointment);
        $this->assertSame('pending', $appointment->status);

        // Assert NotificationOutbox record exists with correct attributes
        $outbox = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_booked')
            ->first();

        $this->assertNotNull($outbox, 'Outbox record for appointment_booked must exist');
        $this->assertSame($this->patient->phone, $outbox->recipient_phone);
        $this->assertSame('patient', $outbox->recipient_type);
        $this->assertSame('in_app', $outbox->channel);
        $this->assertSame(NotificationOutbox::STATUS_SENT, $outbox->status);
        $this->assertSame("appointment_booked_{$appointment->id}", $outbox->idempotency_key);
        $this->assertNull($outbox->acknowledged_at);
        $this->assertSame(0, $outbox->retry_count);

        // Verify payload content
        $payload = $outbox->payload;
        $this->assertSame($appointment->id, $payload['appointment_id']);
        $this->assertSame($appointment->booking_reference, $payload['booking_reference']);
        $this->assertSame('2026-10-26', $payload['appointment_date']);
        $this->assertSame('10:00', $payload['time_slot']);
        $this->assertSame($this->clinic->name, $payload['clinic_name']);
        $this->assertSame($this->doctorUser->name, $payload['doctor_name']);
        $this->assertNotEmpty($payload['message']);
        $this->assertNotEmpty($payload['message_en']);
        $this->assertNotEmpty($payload['message_fr']);
    }

    /**
     * 2. Failed appointment booking creates zero notifications and rolls back cleanly.
     */
    public function test_02_failed_appointment_booking_creates_zero_notifications(): void
    {
        $bookingService = app(BookingService::class);

        // Attempt booking on invalid time slot
        $initialCount = NotificationOutbox::count();

        try {
            $bookingService->createAppointment([
                'clinic_id' => $this->clinic->id,
                'doctor_id' => $this->doctor->id,
                'appointment_date' => '2026-10-26',
                'time_slot' => '03:00', // Non-existent slot
                'patient_id' => $this->patient->id,
                'patient_name' => 'مريض غير صالح',
                'patient_phone' => $this->patient->phone,
            ], $this->patientUser);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            // Expected failure
        }

        $this->assertSame($initialCount, NotificationOutbox::count());
    }

    /**
     * 3. Successful appointment confirmation creates in-app notification for the patient.
     */
    public function test_03_successful_appointment_confirmation_creates_in_app_notification(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-27',
            'time_slot' => '11:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        // Assistant confirms the appointment
        $confirmed = $bookingService->confirmAppointment($appointment, $this->assistantUser, 'تم التأكيد من العيادة');

        $this->assertSame('confirmed', $confirmed->status);

        // Assert NotificationOutbox record exists for confirmation
        $outbox = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_confirmed')
            ->first();

        $this->assertNotNull($outbox, 'Outbox record for appointment_confirmed must exist');
        $this->assertSame($this->patient->phone, $outbox->recipient_phone);
        $this->assertSame('patient', $outbox->recipient_type);
        $this->assertSame('in_app', $outbox->channel);
        $this->assertSame(NotificationOutbox::STATUS_SENT, $outbox->status);
        $this->assertSame("appointment_confirmed_{$appointment->id}", $outbox->idempotency_key);
        $this->assertNull($outbox->acknowledged_at);

        $payload = $outbox->payload;
        $this->assertSame($appointment->id, $payload['appointment_id']);
        $this->assertSame($appointment->booking_reference, $payload['booking_reference']);
        $this->assertSame($this->clinic->name, $payload['clinic_name']);
        $this->assertSame($this->assistantUser->name, $payload['confirmed_by']);
        $this->assertNotEmpty($payload['message']);
        $this->assertNotEmpty($payload['message_en']);
        $this->assertNotEmpty($payload['message_fr']);
    }

    /**
     * 4. Failed/unauthorized confirmation creates no confirmation notification.
     */
    public function test_04_failed_confirmation_creates_no_confirmation_notification(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-28',
            'time_slot' => '14:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        // Unauthorized user attempts confirmation (patient cannot confirm appointments)
        try {
            $bookingService->confirmAppointment($appointment, $this->patientUser);
            $this->fail('Expected ValidationException for unauthorized confirmation');
        } catch (ValidationException $e) {
            // Expected authorization exception
        }

        $confirmedNotif = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_confirmed')
            ->first();

        $this->assertNull($confirmedNotif, 'No confirmation notification should exist for failed authorization');
    }

    /**
     * 5. Repeated confirmation requests do not produce duplicate notifications.
     */
    public function test_05_repeated_confirmation_does_not_produce_duplicate_notifications(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-28',
            'time_slot' => '15:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        // First confirmation
        $bookingService->confirmAppointment($appointment, $this->doctorUser);

        $countAfterFirst = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_confirmed')
            ->count();
        $this->assertSame(1, $countAfterFirst);

        // Second confirmation (idempotent call)
        $bookingService->confirmAppointment($appointment, $this->doctorUser);

        $countAfterSecond = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_confirmed')
            ->count();
        $this->assertSame(1, $countAfterSecond);
    }

    /**
     * 6. Patient notification API returns new templates and enforces strict ownership isolation.
     */
    public function test_06_patient_notification_api_returns_templates_and_enforces_isolation(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-29',
            'time_slot' => '08:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $bookingService->confirmAppointment($appointment, $this->doctorUser);

        // 1. Primary Patient queries notifications via API
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson('/api/v1/patient/notifications');

        $response->assertStatus(200);
        $items = $response->json('data');
        $this->assertNotEmpty($items);

        $templates = array_column($items, 'template');
        $this->assertContains('appointment_booked', $templates);
        $this->assertContains('appointment_confirmed', $templates);

        $bookedNotif = collect($items)->firstWhere('template', 'appointment_booked');
        $this->assertNotNull($bookedNotif);

        // 2. Primary Patient can view single notification
        $showResponse = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson("/api/v1/patient/notifications/{$bookedNotif['id']}");
        $showResponse->assertStatus(200);
        $showResponse->assertJsonPath('data.id', $bookedNotif['id']);

        // 3. Primary Patient can acknowledge notification
        $ackResponse = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->postJson("/api/v1/patient/notifications/{$bookedNotif['id']}/acknowledge");
        $ackResponse->assertStatus(200);
    }

    /**
     * 7. Data isolation: Another patient cannot view or access this patient's notifications.
     */
    public function test_07_data_isolation_other_patients_cannot_see_or_show_notifications(): void
    {
        $bookingService = app(BookingService::class);

        $appointment = $bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => '2026-10-30',
            'time_slot' => '09:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $bookingService->confirmAppointment($appointment, $this->doctorUser);

        $bookedNotif = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_booked')
            ->firstOrFail();

        // Flush any in-memory auth guard state before switching to other patient
        $this->app['auth']->forgetGuards();

        // Other Patient queries their notifications -> strictly 0 items
        $otherResponse = $this->withHeader('Authorization', 'Bearer ' . $this->otherPatientToken)
            ->getJson('/api/v1/patient/notifications');
        $otherResponse->assertStatus(200);
        $otherItems = $otherResponse->json('data');
        $this->assertEmpty($otherItems, 'Other patient must receive empty list of notifications');

        // Other Patient attempts to view primary patient's notification -> 403 Forbidden
        $forbiddenResponse = $this->withHeader('Authorization', 'Bearer ' . $this->otherPatientToken)
            ->getJson("/api/v1/patient/notifications/{$bookedNotif->id}");
        $forbiddenResponse->assertStatus(403);
    }
}
