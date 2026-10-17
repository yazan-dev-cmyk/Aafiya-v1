<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\AppointmentStatusHistory;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorTimeReservation;
use App\Models\Role;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ClinicOperatingHoursService;
use App\Services\DoctorWorkingHoursService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyPendingExpiryTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUser;
    protected Doctor $directorDoctor;
    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected BookingService $bookingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();

        // 1. Director & Clinic
        $this->directorUser = User::factory()->create(['email' => 'director@aafiya.dz']);
        $this->directorUser->roles()->attach($doctorRole->id);
        $this->directorDoctor = Doctor::create([
            'user_id' => $this->directorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DIR-666',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة العافية لانتهاء الصلاحية',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '021777666',
            'director_doctor_id' => $this->directorDoctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->directorDoctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 2. Doctor
        $this->doctorUser = User::factory()->create(['email' => 'doctor@aafiya.dz']);
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-666',
            'is_verified' => true,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
        ]);

        $this->bookingService = app(BookingService::class);
        $this->configureSchedule();
    }

    protected function configureSchedule(): void
    {
        $opService = app(ClinicOperatingHoursService::class);
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
        $opService->saveOperatingHours($this->clinic->id, $days, $this->directorUser);

        $docService = app(DoctorWorkingHoursService::class);
        $slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        $docDays = [];
        for ($d = 0; $d <= 6; $d++) {
            $docDays[] = [
                'day_of_week' => $d,
                'is_closed' => false,
                'slots' => $slots,
            ];
        }
        $docService->saveDraft($this->clinic->id, $this->doctor->id, $docDays, $this->doctorUser);
        $docService->activateSchedule($this->clinic->id, $this->doctor->id, $this->directorUser);
    }

    public function test_pending_appointment_past_slot_end_expires_at_midnight(): void
    {
        // Created on 2026-10-14 for slot 10:00
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض 1',
            'patient_phone' => '0555000001',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        $slot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-14')
            ->where('time_slot', '10:00')
            ->firstOrFail();

        $this->assertEquals(1, $slot->booked_count);

        // Advance to midnight 2026-10-15 00:00:00
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 00:00:00', 'Africa/Algiers'));

        $this->artisan('aafiya:expire-past-pending-appointments')
            ->assertExitCode(0);

        $appointment->refresh();
        $this->assertEquals('expired', $appointment->status);

        $slot->refresh();
        $this->assertEquals(0, $slot->booked_count);

        // Verify doctor time reservation was released
        $hasReservation = DoctorTimeReservation::where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-14')
            ->where('time_slot', '10:00')
            ->exists();
        $this->assertFalse($hasReservation);

        // Verify Status History entry
        $history = AppointmentStatusHistory::where('appointment_id', $appointment->id)
            ->where('to_status', 'expired')
            ->first();
        $this->assertNotNull($history);
        $this->assertEquals('pending', $history->from_status);
        $this->assertEquals($appointment->created_by_id, $history->changed_by_id);
        $this->assertStringStartsWith('[SYSTEM_AUTO_EXPIRE]', $history->reason);
    }

    public function test_future_pending_appointment_does_not_expire(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مستقبل',
            'patient_phone' => '0555000002',
            'appointment_date' => '2026-10-16',
            'time_slot' => '10:00',
        ], $this->directorUser);

        // Run command on 2026-10-14 09:30:00
        $this->artisan('aafiya:expire-past-pending-appointments')
            ->assertExitCode(0);

        $appointment->refresh();
        $this->assertEquals('pending', $appointment->status);
    }

    public function test_confirmed_appointment_past_slot_end_does_not_expire(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مؤكد',
            'patient_phone' => '0555000003',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        $appointment = $this->bookingService->confirmAppointment($appointment, $this->directorUser);
        $this->assertEquals('confirmed', $appointment->status);

        // Advance to midnight 2026-10-15 00:00:00
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 00:00:00', 'Africa/Algiers'));

        $this->artisan('aafiya:expire-past-pending-appointments')
            ->assertExitCode(0);

        $appointment->refresh();
        $this->assertEquals('confirmed', $appointment->status);
    }

    public function test_date_filter_option_is_a_filter_and_does_not_expire_future_records(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 09:00:00', 'Africa/Algiers'));

        // Reject future date filter immediately
        $this->artisan('aafiya:expire-past-pending-appointments', ['--date' => '2026-10-20'])
            ->assertExitCode(1);
    }

    public function test_repeated_execution_is_strictly_idempotent(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض تكرار',
            'patient_phone' => '0555000004',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 00:00:00', 'Africa/Algiers'));

        // Run 1
        $this->artisan('aafiya:expire-past-pending-appointments')->assertExitCode(0);
        $appointment->refresh();
        $this->assertEquals('expired', $appointment->status);

        // Run 2
        $this->artisan('aafiya:expire-past-pending-appointments')->assertExitCode(0);
        $historyCount = AppointmentStatusHistory::where('appointment_id', $appointment->id)
            ->where('to_status', 'expired')
            ->count();

        $this->assertEquals(1, $historyCount);
    }

    public function test_dry_run_option_performs_zero_mutations(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $appointment = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض محاكاة',
            'patient_phone' => '0555000005',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 00:00:00', 'Africa/Algiers'));

        $this->artisan('aafiya:expire-past-pending-appointments', ['--dry-run' => true])
            ->assertExitCode(0);

        $appointment->refresh();
        $this->assertEquals('pending', $appointment->status);

        $slot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-14')
            ->where('time_slot', '10:00')
            ->firstOrFail();
        $this->assertEquals(1, $slot->booked_count);

        $hasHistory = AppointmentStatusHistory::where('appointment_id', $appointment->id)
            ->where('to_status', 'expired')
            ->exists();
        $this->assertFalse($hasHistory);
    }

    public function test_multiple_occupying_appointments_in_slot_decrements_without_releasing_reservation(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-14 09:30:00', 'Africa/Algiers'));
        $app1 = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض أ',
            'patient_phone' => '0555000006',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        $app2 = $this->bookingService->createAppointment([
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض ب',
            'patient_phone' => '0555000007',
            'appointment_date' => '2026-10-14',
            'time_slot' => '10:00',
        ], $this->directorUser);

        // Confirm app2 so it remains occupying
        $this->bookingService->confirmAppointment($app2, $this->directorUser);

        $slot = AppointmentSlot::where('clinic_id', $this->clinic->id)
            ->where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-14')
            ->where('time_slot', '10:00')
            ->firstOrFail();
        $this->assertEquals(2, $slot->booked_count);

        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-10-15 00:00:00', 'Africa/Algiers'));

        $this->artisan('aafiya:expire-past-pending-appointments')->assertExitCode(0);

        $app1->refresh();
        $app2->refresh();
        $slot->refresh();

        $this->assertEquals('expired', $app1->status);
        $this->assertEquals('confirmed', $app2->status);
        $this->assertEquals(1, $slot->booked_count);

        // Reservation must still exist because app2 is still occupying!
        $hasReservation = DoctorTimeReservation::where('doctor_id', $this->doctor->id)
            ->where('appointment_date', '2026-10-14')
            ->where('time_slot', '10:00')
            ->exists();
        $this->assertTrue($hasReservation);
    }
}
