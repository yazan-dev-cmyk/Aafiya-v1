<?php

namespace Tests\Feature\Api\V1;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PatientAppointmentScopingTest extends TestCase
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

    protected User $patientUserA;
    protected Patient $patientA;

    protected User $patientUserB;
    protected Patient $patientB;

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

        // 4. Secondary Doctor & Clinic
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

        // 5. Patient A
        $this->patientUserA = User::factory()->create(['email' => 'patient.a@aafiya.dz']);
        $this->patientUserA->roles()->attach($patientRole->id);
        $this->patientA = Patient::create([
            'user_id' => $this->patientUserA->id,
            'mrn' => 'MRN-2026-PATA',
            'first_name' => 'فاطمة',
            'last_name' => 'بن علي',
            'gender' => 'female',
            'date_of_birth' => '1995-04-12',
            'phone' => '0555111222',
            'national_id' => '199516010011',
        ]);

        // 6. Patient B
        $this->patientUserB = User::factory()->create(['email' => 'patient.b@aafiya.dz']);
        $this->patientUserB->roles()->attach($patientRole->id);
        $this->patientB = Patient::create([
            'user_id' => $this->patientUserB->id,
            'mrn' => 'MRN-2026-PATB',
            'first_name' => 'مراد',
            'last_name' => 'قادري',
            'gender' => 'male',
            'date_of_birth' => '1990-08-25',
            'phone' => '0555333444',
            'national_id' => '199016010022',
        ]);

        // 7. Booking Center
        $this->bookingCenterUser = User::factory()->create(['email' => 'bc@aafiya.dz']);
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'name' => 'مركز حجز العاصمة',
            'code' => 'BC-ALG-01',
            'user_id' => $this->bookingCenterUser->id,
            'phone' => '021700100',
            'email' => 'bc@aafiya.dz',
            'address' => 'ساحة أول ماي، الجزائر',
            'wilaya' => 'الجزائر',
            'quota_balance' => 50,
            'status' => 'approved',
            'is_active' => true,
        ]);
    }

    /**
     * Helper to create appointments directly with deterministic properties.
     */
    protected function createAppointmentForPatient(
        Patient $patient,
        User $creator,
        string $status = 'pending',
        array $overrides = []
    ): Appointment {
        static $seq = 100;
        $seq++;

        return Appointment::create(array_merge([
            'booking_reference' => 'MS-2026-' . str_pad((string) $seq, 5, '0', STR_PAD_LEFT),
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'patient_name' => $patient->first_name . ' ' . $patient->last_name,
            'patient_phone' => $patient->phone,
            'patient_mrn' => $patient->mrn,
            'patient_national_id' => $patient->national_id,
            'booking_center_id' => null,
            'created_by_id' => $creator->id,
            'creator_type' => 'patient',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => $status,
            'confirmed_at' => $status === 'confirmed' ? now() : null,
            'confirmed_by_id' => $status === 'confirmed' ? $this->doctorUser->id : null,
            'checked_in_at' => $status === 'attended' ? now() : null,
            'checked_in_by_id' => $status === 'attended' ? $this->doctorUser->id : null,
        ], $overrides));
    }

    /**
     * TEST 01: Patient sees strictly their own appointments on GET /api/v1/appointments.
     */
    public function test_01_patient_sees_only_own_appointments(): void
    {
        $apptsA = [
            $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', ['time_slot' => '09:00']),
            $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'confirmed', ['time_slot' => '10:00']),
            $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'attended', ['time_slot' => '11:00']),
        ];

        $apptsB = [
            $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending', ['time_slot' => '09:00']),
            $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'confirmed', ['time_slot' => '10:00']),
            $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'attended', ['time_slot' => '11:00']),
        ];

        $response = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');

        $returnedIds = collect($response->json('data'))->pluck('id')->all();
        $expectedIds = collect($apptsA)->pluck('id')->all();
        $forbiddenIds = collect($apptsB)->pluck('id')->all();

        $this->assertEqualsCanonicalizing($expectedIds, $returnedIds);
        foreach ($forbiddenIds as $fId) {
            $this->assertNotContains($fId, $returnedIds);
        }

        foreach ($response->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
        }
    }

    /**
     * TEST 02: Injected query parameter patient_id cannot override or expand patient scoping.
     */
    public function test_02_patient_id_query_tampering_cannot_override_scoping(): void
    {
        $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');
        $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending');

        // Attempt 1: Target Patient B via ?patient_id=UUID
        $response = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments?patient_id={$this->patientB->id}");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $this->assertEquals($this->patientA->id, $response->json('data.0.patient.id'));

        // Attempt 2: Array-style tampering ?patient_id[]={UUID}
        $responseArr = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments?patient_id[]={$this->patientB->id}");

        $responseArr->assertStatus(200);
        $responseArr->assertJsonCount(1, 'data');
        $this->assertEquals($this->patientA->id, $responseArr->json('data.0.patient.id'));
    }

    /**
     * TEST 03: Query filter tampering (clinic_id, doctor_id, booking_center_id) cannot weaken self-scoping.
     */
    public function test_03_filter_tampering_cannot_expand_patient_scope(): void
    {
        $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
        ]);

        $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending', [
            'clinic_id' => $this->otherClinic->id,
            'doctor_id' => $this->otherDoctor->id,
        ]);

        // Attempt clinic filter tampering targeting Patient B's clinic
        $responseClinic = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments?clinic_id={$this->otherClinic->id}");

        $responseClinic->assertStatus(200);
        foreach ($responseClinic->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
            $this->assertNotEquals($this->patientB->id, $item['patient']['id']);
        }

        // Attempt doctor filter tampering
        $responseDoctor = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments?doctor_id={$this->otherDoctor->id}");

        $responseDoctor->assertStatus(200);
        foreach ($responseDoctor->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
            $this->assertNotEquals($this->patientB->id, $item['patient']['id']);
        }

        // Attempt booking_center_id tampering
        $responseBc = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments?booking_center_id={$this->bookingCenter->id}");

        $responseBc->assertStatus(200);
        foreach ($responseBc->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
            $this->assertNotEquals($this->patientB->id, $item['patient']['id']);
        }
    }

    /**
     * TEST 04: Valid status filter operates strictly inside patient's own scope.
     */
    public function test_04_valid_status_filtering_operates_within_patient_scope(): void
    {
        $apptAConfirmed = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'confirmed');
        $apptAPending = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');
        $apptACancelled = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'cancelled');

        $apptBConfirmed = $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'confirmed');

        // Filter status=confirmed
        $responseConfirmed = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?status=confirmed');

        $responseConfirmed->assertStatus(200);
        $responseConfirmed->assertJsonCount(1, 'data');
        $this->assertEquals($apptAConfirmed->id, $responseConfirmed->json('data.0.id'));
        $this->assertEquals('confirmed', $responseConfirmed->json('data.0.status'));

        // Filter status=pending
        $responsePending = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?status=pending');

        $responsePending->assertStatus(200);
        $responsePending->assertJsonCount(1, 'data');
        $this->assertEquals($apptAPending->id, $responsePending->json('data.0.id'));
        $this->assertEquals('pending', $responsePending->json('data.0.status'));

        // Filter status=cancelled
        $responseCancelled = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?status=cancelled');

        $responseCancelled->assertStatus(200);
        $responseCancelled->assertJsonCount(1, 'data');
        $this->assertEquals($apptACancelled->id, $responseCancelled->json('data.0.id'));
        $this->assertEquals('cancelled', $responseCancelled->json('data.0.status'));
    }

    /**
     * TEST 05: Valid date filtering operates strictly inside patient's own scope.
     */
    public function test_05_valid_date_filtering_operates_within_patient_scope(): void
    {
        $apptADate1 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-01',
        ]);
        $apptADate2 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-15',
        ]);
        $apptADate3 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-30',
        ]);

        $apptBDate1 = $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending', [
            'appointment_date' => '2026-11-01',
        ]);

        // Exact date query
        $resExact = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?appointment_date=2026-11-01');

        $resExact->assertStatus(200);
        $resExact->assertJsonCount(1, 'data');
        $this->assertEquals($apptADate1->id, $resExact->json('data.0.id'));

        // Date range query
        $resRange = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?from_date=2026-11-10&to_date=2026-11-20');

        $resRange->assertStatus(200);
        $resRange->assertJsonCount(1, 'data');
        $this->assertEquals($apptADate2->id, $resRange->json('data.0.id'));
    }

    /**
     * TEST 06: Registered patient user without Patient profile model safely falls back to created_by_id.
     */
    public function test_06_registered_patient_without_patient_profile_falls_back_to_created_by_id(): void
    {
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        $userC = User::factory()->create(['email' => 'user.c@aafiya.dz']);
        $userC->roles()->attach($patientRole->id);

        $userD = User::factory()->create(['email' => 'user.d@aafiya.dz']);
        $userD->roles()->attach($patientRole->id);

        // Appointment created by User C with no Patient model linked
        $apptC = Appointment::create([
            'booking_reference' => 'MS-2026-USRC01',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => null,
            'patient_name' => 'مستخدم ج',
            'patient_phone' => '0555999001',
            'created_by_id' => $userC->id,
            'creator_type' => 'patient',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
            'status' => 'pending',
        ]);

        // Appointment created by User D
        $apptD = Appointment::create([
            'booking_reference' => 'MS-2026-USRD01',
            'secure_token' => Str::random(64),
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => null,
            'patient_name' => 'مستخدم د',
            'patient_phone' => '0555999002',
            'created_by_id' => $userD->id,
            'creator_type' => 'patient',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '10:00',
            'status' => 'pending',
        ]);

        // List endpoint
        $resList = $this->actingAs($userC, 'sanctum')
            ->getJson('/api/v1/appointments');

        $resList->assertStatus(200);
        $resList->assertJsonCount(1, 'data');
        $this->assertEquals($apptC->id, $resList->json('data.0.id'));

        // Show endpoint - own appointment
        $resShowOwn = $this->actingAs($userC, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptC->id}");

        $resShowOwn->assertStatus(200);
        $this->assertEquals($apptC->id, $resShowOwn->json('data.id'));

        // Show endpoint - IDOR attempt on User D's appointment
        $resShowOther = $this->actingAs($userC, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptD->id}");

        $resShowOther->assertStatus(403);
        $resShowOther->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');
    }

    /**
     * TEST 07: Direct appointment IDOR lookup returns HTTP 403 Forbidden with exact Arabic message.
     */
    public function test_07_direct_appointment_idor_lookup_returns_403(): void
    {
        $apptA = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');
        $apptB = $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending');

        // Patient A can access own appointment
        $resOwn = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptA->id}");

        $resOwn->assertStatus(200);
        $this->assertEquals($apptA->id, $resOwn->json('data.id'));

        // Patient A cannot access Patient B's appointment (IDOR)
        $resIdor = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptB->id}");

        $resIdor->assertStatus(403);
        $resIdor->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');

        // Patient B can access own appointment
        $resOwnB = $this->actingAs($this->patientUserB, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptB->id}");

        $resOwnB->assertStatus(200);
        $this->assertEquals($apptB->id, $resOwnB->json('data.id'));

        // Patient B cannot access Patient A's appointment (IDOR)
        $resIdorB = $this->actingAs($this->patientUserB, 'sanctum')
            ->getJson("/api/v1/appointments/{$apptA->id}");

        $resIdorB->assertStatus(403);
        $resIdorB->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');
    }

    /**
     * TEST 08: Unauthenticated requests return HTTP 401 Unauthorized.
     */
    public function test_08_unauthenticated_request_returns_401(): void
    {
        $appt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');

        // Index unauthenticated
        $resIndex = $this->getJson('/api/v1/appointments');
        $resIndex->assertStatus(401);
        $resIndex->assertJsonPath('code', 401);
        $resIndex->assertJsonPath('message', 'غير مصرح - يرجى تسجيل الدخول للوصول إلى هذا المورد.');

        // Show unauthenticated
        $resShow = $this->getJson("/api/v1/appointments/{$appt->id}");
        $resShow->assertStatus(401);
        $resShow->assertJsonPath('code', 401);
        $resShow->assertJsonPath('message', 'غير مصرح - يرجى تسجيل الدخول للوصول إلى هذا المورد.');
    }

    /**
     * TEST 09: Appointments booked on behalf of the patient by doctor or booking center are visible to the patient.
     */
    public function test_09_appointments_booked_on_behalf_of_patient_are_visible(): void
    {
        // Booked by Doctor for Patient A
        $doctorAppt = $this->createAppointmentForPatient($this->patientA, $this->doctorUser, 'pending', [
            'creator_type' => 'doctor',
        ]);

        // Booked by Booking Center for Patient A
        $bcAppt = $this->createAppointmentForPatient($this->patientA, $this->bookingCenterUser, 'pending', [
            'creator_type' => 'booking_center',
            'booking_center_id' => $this->bookingCenter->id,
        ]);

        // Patient A can see both in index
        $resIndexA = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments');

        $resIndexA->assertStatus(200);
        $resIndexA->assertJsonCount(2, 'data');
        $idsA = collect($resIndexA->json('data'))->pluck('id')->all();
        $this->assertContains($doctorAppt->id, $idsA);
        $this->assertContains($bcAppt->id, $idsA);

        // Patient A can view both in show
        $resShowDoc = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments/{$doctorAppt->id}");
        $resShowDoc->assertStatus(200);
        $this->assertEquals($doctorAppt->id, $resShowDoc->json('data.id'));

        $resShowBc = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments/{$bcAppt->id}");
        $resShowBc->assertStatus(200);
        $this->assertEquals($bcAppt->id, $resShowBc->json('data.id'));

        // Patient B cannot see them in index
        $resIndexB = $this->actingAs($this->patientUserB, 'sanctum')
            ->getJson('/api/v1/appointments');

        $resIndexB->assertStatus(200);
        $resIndexB->assertJsonCount(0, 'data');

        // Patient B cannot view them in show (IDOR -> 403)
        $resShowDocB = $this->actingAs($this->patientUserB, 'sanctum')
            ->getJson("/api/v1/appointments/{$doctorAppt->id}");
        $resShowDocB->assertStatus(403);
        $resShowDocB->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');

        $resShowBcB = $this->actingAs($this->patientUserB, 'sanctum')
            ->getJson("/api/v1/appointments/{$bcAppt->id}");
        $resShowBcB->assertStatus(403);
        $resShowBcB->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');
    }

    /**
     * TEST 10: Soft-deleted appointments are excluded from list and return 404 on show.
     */
    public function test_10_soft_deleted_appointments_are_excluded(): void
    {
        $activeAppt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');
        $deletedAppt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');

        $deletedAppt->delete();
        $this->assertSoftDeleted('appointments', ['id' => $deletedAppt->id]);

        // Index
        $response = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $this->assertEquals($activeAppt->id, $response->json('data.0.id'));

        // Show deleted appointment returns 404 (route model binding)
        $resShow = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson("/api/v1/appointments/{$deletedAppt->id}");

        $resShow->assertStatus(404);
    }

    /**
     * TEST 11: Pagination preserves patient scope strictly across all pages.
     */
    public function test_11_pagination_preserves_patient_scope_across_all_pages(): void
    {
        // Create 25 appointments for Patient A
        for ($i = 1; $i <= 25; $i++) {
            $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
                'appointment_date' => now()->addDays($i)->format('Y-m-d'),
                'time_slot' => '09:00',
            ]);
        }

        // Create 25 appointments for Patient B
        for ($j = 1; $j <= 25; $j++) {
            $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending', [
                'appointment_date' => now()->addDays($j)->format('Y-m-d'),
                'time_slot' => '10:00',
            ]);
        }

        // Page 1 (10 items)
        $resPage1 = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?per_page=10&page=1');

        $resPage1->assertStatus(200);
        $resPage1->assertJsonCount(10, 'data');
        $resPage1->assertJsonPath('meta.total', 25);
        foreach ($resPage1->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
        }

        // Page 2 (10 items)
        $resPage2 = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?per_page=10&page=2');

        $resPage2->assertStatus(200);
        $resPage2->assertJsonCount(10, 'data');
        foreach ($resPage2->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
        }

        // Page 3 (5 items)
        $resPage3 = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?per_page=10&page=3');

        $resPage3->assertStatus(200);
        $resPage3->assertJsonCount(5, 'data');
        foreach ($resPage3->json('data') as $item) {
            $this->assertEquals($this->patientA->id, $item['patient']['id']);
        }

        // Page 4 (0 items)
        $resPage4 = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?per_page=10&page=4');

        $resPage4->assertStatus(200);
        $resPage4->assertJsonCount(0, 'data');
    }

    /**
     * TEST 12: Guest patient role (patient_guest) is scoped and protected by IDOR identically.
     */
    public function test_12_guest_patient_role_scoping_and_idor_protection(): void
    {
        $guestRole = Role::where('name', 'patient_guest')->firstOrFail();

        $guestUser = User::factory()->create(['email' => 'guest@aafiya.dz']);
        $guestUser->roles()->attach($guestRole->id);

        $guestPatient = Patient::create([
            'user_id' => $guestUser->id,
            'mrn' => 'MRN-2026-GUEST',
            'first_name' => 'ضيف',
            'last_name' => 'مؤقت',
            'gender' => 'male',
            'date_of_birth' => '2000-01-01',
            'phone' => '0555888777',
            'national_id' => '200016010099',
        ]);

        $guestAppt = $this->createAppointmentForPatient($guestPatient, $guestUser, 'pending');
        $patientAAppt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');

        // Guest user index returns only guest's appointment
        $resIndex = $this->actingAs($guestUser, 'sanctum')
            ->getJson('/api/v1/appointments');

        $resIndex->assertStatus(200);
        $resIndex->assertJsonCount(1, 'data');
        $this->assertEquals($guestAppt->id, $resIndex->json('data.0.id'));

        // Guest user show own appointment
        $resShowOwn = $this->actingAs($guestUser, 'sanctum')
            ->getJson("/api/v1/appointments/{$guestAppt->id}");

        $resShowOwn->assertStatus(200);
        $this->assertEquals($guestAppt->id, $resShowOwn->json('data.id'));

        // Guest user cannot view Patient A's appointment (IDOR -> 403)
        $resIdor = $this->actingAs($guestUser, 'sanctum')
            ->getJson("/api/v1/appointments/{$patientAAppt->id}");

        $resIdor->assertStatus(403);
        $resIdor->assertJsonPath('message', 'غير مصرح لك باستعراض تفاصيل هذا الموعد.');
    }

    /**
     * TEST 13: Sorting operates safely strictly within patient scope.
     */
    public function test_13_sorting_operates_safely_within_patient_scope(): void
    {
        $appt1 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-01',
            'time_slot' => '09:00',
        ]);
        $appt2 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-05',
            'time_slot' => '10:00',
        ]);
        $appt3 = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending', [
            'appointment_date' => '2026-11-10',
            'time_slot' => '11:00',
        ]);

        $this->createAppointmentForPatient($this->patientB, $this->patientUserB, 'pending', [
            'appointment_date' => '2026-11-03',
            'time_slot' => '09:00',
        ]);

        // Ascending
        $resAsc = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?sort_by=appointment_date&sort_order=asc');

        $resAsc->assertStatus(200);
        $resAsc->assertJsonCount(3, 'data');
        $this->assertEquals($appt1->id, $resAsc->json('data.0.id'));
        $this->assertEquals($appt2->id, $resAsc->json('data.1.id'));
        $this->assertEquals($appt3->id, $resAsc->json('data.2.id'));

        // Descending
        $resDesc = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?sort_by=appointment_date&sort_order=desc');

        $resDesc->assertStatus(200);
        $resDesc->assertJsonCount(3, 'data');
        $this->assertEquals($appt3->id, $resDesc->json('data.0.id'));
        $this->assertEquals($appt2->id, $resDesc->json('data.1.id'));
        $this->assertEquals($appt1->id, $resDesc->json('data.2.id'));
    }

    /**
     * TEST 14: Rescheduled appointments are excluded by default and viewable when explicitly requested.
     */
    public function test_14_rescheduled_appointments_hidden_by_default_within_patient_scope(): void
    {
        $pendingAppt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'pending');
        $rescheduledAppt = $this->createAppointmentForPatient($this->patientA, $this->patientUserA, 'rescheduled');

        // Default query excludes rescheduled
        $resDefault = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments');

        $resDefault->assertStatus(200);
        $resDefault->assertJsonCount(1, 'data');
        $this->assertEquals($pendingAppt->id, $resDefault->json('data.0.id'));

        // Explicit filter returns rescheduled
        $resExplicit = $this->actingAs($this->patientUserA, 'sanctum')
            ->getJson('/api/v1/appointments?status=rescheduled');

        $resExplicit->assertStatus(200);
        $resExplicit->assertJsonCount(1, 'data');
        $this->assertEquals($rescheduledAppt->id, $resExplicit->json('data.0.id'));
    }
}
