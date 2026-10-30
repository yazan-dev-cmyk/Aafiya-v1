<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorClinic;
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
use Tests\TestCase;

class PatientNotificationEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected Doctor $doctor;
    protected User $doctorUser;
    protected string $doctorToken;
    protected User $patientUser;
    protected Patient $patient;
    protected string $patientToken;
    protected User $otherPatientUser;
    protected Patient $otherPatient;
    protected string $otherPatientToken;
    protected BookingService $bookingService;
    protected string $futureDate;
    protected int $futureDow;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        config(['booking.patient_booking_enabled' => true]);

        $this->bookingService = app(BookingService::class);

        // Target a consistent future weekday (e.g. next Monday)
        $future = Carbon::now('Africa/Algiers')->addWeeks(2)->startOfWeek(); // Monday
        $this->futureDate = $future->format('Y-m-d');
        $this->futureDow = ($future->dayOfWeek + 1) % 7;

        // 1. Clinic
        $this->clinic = Clinic::create([
            'id' => (string) Str::uuid(),
            'name' => 'عيادة الواحة الطبية',
            'address' => 'نهج العربي بن مهيدي، وهران',
            'wilaya' => 'وهران',
            'phone' => '+213550999888',
            'is_active' => true,
        ]);

        // 2. Doctor
        $this->doctorUser = User::factory()->create([
            'name' => 'د. سمير بلحاج',
            'email' => 'dr.belhadj_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213551000111',
            'is_active' => true,
        ]);
        $this->doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->doctorUser->id,
            'specialty' => 'Cardiology',
            'license_number' => 'DOC-ORAN-2026-88',
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

        // 3. Primary Patient (Karim)
        $this->patientUser = User::factory()->create([
            'name' => 'كريم بن ناصر',
            'email' => 'karim.patient_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213553300003',
            'is_active' => true,
        ]);
        $this->patientUser->assignRole('patient_registered');

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

        // 4. Other Patient (Ahmed)
        $this->otherPatientUser = User::factory()->create([
            'name' => 'أحمد سعيدي',
            'email' => 'ahmed.patient_' . Str::random(5) . '@aafiya.dz',
            'phone' => '+213554400004',
            'is_active' => true,
        ]);
        $this->otherPatientUser->assignRole('patient_registered');

        $this->otherPatient = Patient::create([
            'id' => (string) Str::uuid(),
            'user_id' => $this->otherPatientUser->id,
            'mrn' => 'MRN-2026-ORAN-102',
            'first_name' => 'أحمد',
            'last_name' => 'سعيدي',
            'gender' => 'male',
            'date_of_birth' => '1985-08-20',
            'phone' => '+213554400004',
            'email' => $this->otherPatientUser->email,
            'wilaya' => 'وهران',
        ]);
        $this->otherPatientToken = $this->otherPatientUser->createToken('other-token')->plainTextToken;

        // 5. Setup Doctor and Clinic schedules for test slots
        $this->setupClinicAndDoctorSchedule($this->clinic, $this->doctor, $this->futureDow, ['09:00', '11:00', '14:00']);
    }

    protected function setupClinicAndDoctorSchedule(Clinic $clinic, Doctor $doctor, int $dow, array $slots): void
    {
        for ($d = 0; $d <= 6; $d++) {
            $isOpenDay = ($d === $dow);
            DB::table('clinic_operating_hours')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'day_of_week' => $d, 'period_index' => 0],
                [
                    'id' => (string) Str::uuid(),
                    'is_closed' => ! $isOpenDay,
                    'open_time' => $isOpenDay ? '08:00' : null,
                    'close_time' => $isOpenDay ? '17:00' : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $existingSchedule = DB::table('doctor_day_schedules')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->where('day_of_week', $dow)
            ->first();

        if ($existingSchedule) {
            $scheduleId = $existingSchedule->id;
            DB::table('doctor_day_schedules')->where('id', $scheduleId)->update(['is_closed' => false, 'updated_at' => now()]);
        } else {
            $scheduleId = (string) Str::uuid();
            DB::table('doctor_day_schedules')->insert([
                'id' => $scheduleId,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'day_of_week' => $dow,
                'is_closed' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($slots as $slot) {
            $slotExists = DB::table('doctor_working_slots')
                ->where('doctor_day_schedule_id', $scheduleId)
                ->where('time_slot', $slot)
                ->exists();

            if (! $slotExists) {
                DB::table('doctor_working_slots')->insert([
                    'id' => (string) Str::uuid(),
                    'doctor_day_schedule_id' => $scheduleId,
                    'time_slot' => $slot,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        DB::table('doctor_clinic')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $doctor->id)
            ->update([
                'is_working_hours_activated' => true,
                'working_hours_activated_at' => now(),
            ]);
    }

    /**
     * 1. Direct rescheduling creates in-app notification with history UUID in idempotency key.
     */
    public function test_01_direct_reschedule_generates_in_app_outbox_notification(): void
    {
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->futureDate,
            'time_slot' => '09:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $rescheduled = $this->bookingService->rescheduleAppointment($appointment, [
            'appointment_date' => $this->futureDate,
            'time_slot' => '11:00',
            'notes' => 'تعديل توقيت الفحص حسب رغبة المريض',
        ], $this->doctorUser);

        $this->assertSame('11:00', $rescheduled->time_slot);

        $outbox = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_rescheduled')
            ->first();

        $this->assertNotNull($outbox, 'Direct reschedule must generate an appointment_rescheduled outbox record');
        $this->assertSame('in_app', $outbox->channel);
        $this->assertSame('patient', $outbox->recipient_type);
        $this->assertSame(NotificationOutbox::STATUS_SENT, $outbox->status);
        $this->assertNull($outbox->acknowledged_at);
        $this->assertStringStartsWith("appointment_rescheduled_{$appointment->id}_", $outbox->idempotency_key);
        $this->assertSame('11:00', $outbox->payload['new_slot']);
        $this->assertSame($this->futureDate, $outbox->payload['new_date']);
        $this->assertSame($this->clinic->name, $outbox->payload['clinic_name']);
        $this->assertStringContainsString('تمت إعادة جدولة موعدكم', $outbox->payload['message']);
    }

    /**
     * 2. Consecutive reschedules create distinct idempotent records without key collision.
     */
    public function test_02_consecutive_reschedules_create_distinct_idempotent_records(): void
    {
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->futureDate,
            'time_slot' => '09:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        // First Reschedule
        $rescheduled = $this->bookingService->rescheduleAppointment($appointment, [
            'appointment_date' => $this->futureDate,
            'time_slot' => '11:00',
        ], $this->doctorUser);

        // Second Reschedule (e.g. moved again to 14:00)
        $this->bookingService->rescheduleAppointment($rescheduled, [
            'appointment_date' => $this->futureDate,
            'time_slot' => '14:00',
        ], $this->doctorUser);

        $records = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_rescheduled')
            ->get();

        $this->assertCount(2, $records, 'Both consecutive reschedules must have independent notifications');
        $this->assertNotEquals($records[0]->idempotency_key, $records[1]->idempotency_key);
    }

    /**
     * 3. Authoritative unread count endpoint returns accurate count and reflects acknowledgment.
     */
    public function test_03_unread_count_endpoint_lifecycle(): void
    {
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->futureDate,
            'time_slot' => '09:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $this->bookingService->rescheduleAppointment($appointment, [
            'appointment_date' => $this->futureDate,
            'time_slot' => '11:00',
        ], $this->doctorUser);

        // Expect: 1 booked + 1 rescheduled = 2 unread
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson('/api/v1/patient/notifications/unread-count');

        $response->assertStatus(200);
        $response->assertJson(['unread_count' => 2]);

        // Acknowledge one notification
        $rescheduledNotif = NotificationOutbox::where('appointment_id', $appointment->id)
            ->where('template', 'appointment_rescheduled')
            ->firstOrFail();

        $ackResponse = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->postJson("/api/v1/patient/notifications/{$rescheduledNotif->id}/acknowledge");
        $ackResponse->assertStatus(200);

        // Unread count should now be 1
        $responseAfterAck = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson('/api/v1/patient/notifications/unread-count');

        $responseAfterAck->assertStatus(200);
        $responseAfterAck->assertJson(['unread_count' => 1]);
    }

    /**
     * 4. Algerian phone normalization matches international +213 and national 05/06/07 variants.
     */
    public function test_04_algerian_phone_normalization_fallback(): void
    {
        // Unlinked appointment (no patient_id, e.g. walk-in booking) with local phone format '0553300003'
        $unlinkedAppt = Appointment::create([
            'id' => (string) Str::uuid(),
            'booking_reference' => 'BK-UNLINKED-' . Str::upper(Str::random(6)),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->futureDate,
            'time_slot' => '09:00',
            'status' => 'pending',
            'patient_id' => null,
            'patient_name' => 'مريض غير مسجل مسبقاً',
            'patient_phone' => '0553300003',
            'created_by_id' => $this->doctorUser->id,
        ]);

        NotificationOutbox::create([
            'id' => (string) Str::uuid(),
            'appointment_id' => $unlinkedAppt->id,
            'recipient_phone' => '0553300003',
            'recipient_type' => 'patient',
            'channel' => 'in_app',
            'template' => 'appointment_booked',
            'payload' => ['booking_reference' => $unlinkedAppt->booking_reference],
            'idempotency_key' => 'unlinked_test_' . $unlinkedAppt->id,
            'status' => NotificationOutbox::STATUS_SENT,
        ]);

        // Patient user has phone '+213553300003' -> should resolve through normalization
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->patientToken)
            ->getJson('/api/v1/patient/notifications');

        $response->assertStatus(200);
        $items = $response->json('data');
        $references = array_map(fn($item) => $item['payload']['booking_reference'] ?? null, $items);

        $this->assertContains($unlinkedAppt->booking_reference, $references);
    }

    /**
     * 5. Strict isolation: Patient B cannot view or count Patient A's notifications.
     */
    public function test_05_multi_tenant_isolation(): void
    {
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'appointment_date' => $this->futureDate,
            'time_slot' => '09:00',
            'patient_id' => $this->patient->id,
            'patient_name' => $this->patient->first_name . ' ' . $this->patient->last_name,
            'patient_phone' => $this->patient->phone,
        ], $this->patientUser);

        $notif = NotificationOutbox::where('appointment_id', $appointment->id)->firstOrFail();

        // Ahmed (other patient) checks unread count -> 0
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->otherPatientToken)
            ->getJson('/api/v1/patient/notifications/unread-count');
        $response->assertStatus(200);
        $response->assertJson(['unread_count' => 0]);

        // Ahmed attempts to show Karim's notification -> 403 Forbidden
        $showResponse = $this->withHeader('Authorization', 'Bearer ' . $this->otherPatientToken)
            ->getJson("/api/v1/patient/notifications/{$notif->id}");
        $showResponse->assertStatus(403);
    }
}
