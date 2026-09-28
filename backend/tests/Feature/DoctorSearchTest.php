<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorSearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected User $bookingCenterUser;

    protected BookingCenter $bookingCenter;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->adminUser = User::factory()->create(['is_active' => true]);
        $this->adminUser->assignRole('admin');

        $this->bookingCenterUser = User::factory()->create(['is_active' => true]);
        $this->bookingCenterUser->assignRole('booking_center');
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز تجريبي للبحث',
            'phone' => '+213550999888',
            'wilaya' => 'الجزائر العاصمة',
            'address' => 'شارع الشهداء',
            'quota_balance' => 50,
            'verification_status' => BookingCenter::STATUS_VERIFIED,
            'is_active' => true,
        ]);

        $patientUser = User::factory()->create(['is_active' => true]);
        $patientUser->assignRole('patient_registered');
        $this->patient = Patient::create([
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-TEST-0001',
            'first_name' => 'كمال',
            'last_name' => 'بن علي',
            'gender' => 'male',
            'date_of_birth' => '1990-05-15',
            'phone' => '+213550000123',
            'email' => 'kamal.test@aafiya.test',
        ]);
    }

    /**
     * Helper to create doctor with user account.
     */
    protected function createTestDoctor(string $name, string $specialty = 'عظام', bool $isVerified = true): Doctor
    {
        $user = User::factory()->create([
            'name' => $name,
            'is_active' => true,
        ]);
        $user->assignRole('doctor');

        return Doctor::create([
            'user_id' => $user->id,
            'specialty' => $specialty,
            'license_number' => 'LIC-' . rand(1000, 9999),
            'bio' => "سيرة ذاتية لـ {$name}",
            'is_verified' => $isVerified,
        ]);
    }

    /**
     * Helper to create clinic.
     */
    protected function createTestClinic(string $name, string $wilaya = 'الجزائر العاصمة', bool $isActive = true): Clinic
    {
        return Clinic::create([
            'name' => $name,
            'wilaya' => $wilaya,
            'address' => "شارع {$name}",
            'phone' => '+21321' . rand(100000, 999999),
            'is_active' => $isActive,
            'max_patients_per_slot' => 10,
            'slot_duration_min' => 60,
        ]);
    }

    /**
     * TEST 01: Doctor appears when search matches an active clinic name.
     */
    public function test_01_search_by_active_clinic_name(): void
    {
        $doc = $this->createTestDoctor('د. سامي العاصمي', 'قلب');
        $clinic = $this->createTestClinic('عيادة الأمل التخصصية', 'الجزائر العاصمة', true);
        $doc->clinics()->attach($clinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('الأمل'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($doc->id, $ids);
    }

    /**
     * TEST 02: Doctor appears when search matches an active clinic Wilaya.
     */
    public function test_02_search_by_active_clinic_wilaya(): void
    {
        $doc = $this->createTestDoctor('د. خالد وهراني', 'عظام');
        $clinic = $this->createTestClinic('عيادة الباهية', 'وهران الفريدة', true);
        $doc->clinics()->attach($clinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('وهران الفريدة'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($doc->id, $ids);
    }

    /**
     * TEST 03: Doctor does NOT appear when search only matches an inactive clinic facility.
     */
    public function test_03_search_ignores_inactive_clinic_facility(): void
    {
        $doc = $this->createTestDoctor('د. عمر المغلق', 'جلدية');
        $inactiveClinic = $this->createTestClinic('عيادة النور المغلقة', 'قسنطينة', false);
        $doc->clinics()->attach($inactiveClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('المغلقة'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertNotContains($doc->id, $ids);
    }

    /**
     * TEST 04: Doctor does NOT appear when search only matches an inactive doctor_clinic affiliation.
     */
    public function test_04_search_ignores_inactive_doctor_clinic_affiliation(): void
    {
        $doc = $this->createTestDoctor('د. فاروق المعلق', 'أعصاب');
        $activeClinic = $this->createTestClinic('عيادة المعلق المعطلة', 'عنابة', true);
        // doctor_clinic.is_active = false (suspended affiliation)
        $doc->clinics()->attach($activeClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => false]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('المعلق المعطلة'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertNotContains($doc->id, $ids);
    }

    /**
     * TEST 05: Doctor appears through doctor name/specialty despite having an inactive clinic.
     */
    public function test_05_doctor_searchable_by_name_despite_having_one_inactive_clinic(): void
    {
        $doc = $this->createTestDoctor('د. رفيق المتعدد الفريد', 'أطفال');
        $activeClinic = $this->createTestClinic('عيادة الأطفال النشطة', 'البليدة', true);
        $inactiveClinic = $this->createTestClinic('عيادة الأطفال المتوقفة', 'البليدة', false);

        $doc->clinics()->attach($activeClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($inactiveClinic->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('المتعدد الفريد'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($doc->id, $ids);
    }

    /**
     * TEST 06: Inactive doctor_clinic affiliation is omitted from DoctorPublicResource clinics array.
     */
    public function test_06_inactive_doctor_clinic_affiliation_omitted_from_resource_clinics_array(): void
    {
        $doc = $this->createTestDoctor('د. كريم العيادات', 'عيون');
        $activeClinic = $this->createTestClinic('عيادة الرؤية', 'سطيف', true);
        $suspendedClinic = $this->createTestClinic('عيادة الظلام', 'سطيف', true);

        $doc->clinics()->attach($activeClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($suspendedClinic->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => false]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('كريم العيادات'));
        $res->assertStatus(200);

        $docData = collect($res->json('data'))->firstWhere('id', $doc->id);
        $this->assertNotNull($docData);

        $clinicIds = collect($docData['clinics'])->pluck('id')->all();
        $this->assertContains($activeClinic->id, $clinicIds);
        $this->assertNotContains($suspendedClinic->id, $clinicIds);
    }

    /**
     * TEST 07: Inactive clinic facility omitted from DoctorPublicResource clinics array.
     */
    public function test_07_inactive_facility_omitted_from_resource_clinics_array(): void
    {
        $doc = $this->createTestDoctor('د. طارق المنشأة', 'مسالك بولية');
        $activeClinic = $this->createTestClinic('عيادة الصفا المفتوحة', 'باتنة', true);
        $closedClinic = $this->createTestClinic('عيادة الصفا المغلقة', 'باتنة', false);

        $doc->clinics()->attach($activeClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($closedClinic->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('طارق المنشأة'));
        $res->assertStatus(200);

        $docData = collect($res->json('data'))->firstWhere('id', $doc->id);
        $this->assertNotNull($docData);

        $clinicIds = collect($docData['clinics'])->pluck('id')->all();
        $this->assertContains($activeClinic->id, $clinicIds);
        $this->assertNotContains($closedClinic->id, $clinicIds);
    }

    /**
     * TEST 08: Multiple active clinics are all returned in DoctorPublicResource.
     */
    public function test_08_multiple_active_clinics_all_returned(): void
    {
        $doc = $this->createTestDoctor('د. سمير المزدوج', 'باطنية');
        $clinicA = $this->createTestClinic('عيادة النخيل A', 'تلمسان', true);
        $clinicB = $this->createTestClinic('عيادة الزيتون B', 'سيدي بلعباس', true);

        $doc->clinics()->attach($clinicA->id, ['position' => 'director', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($clinicB->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('سمير المزدوج'));
        $res->assertStatus(200);

        $docData = collect($res->json('data'))->firstWhere('id', $doc->id);
        $this->assertNotNull($docData);

        $clinicIds = collect($docData['clinics'])->pluck('id')->all();
        $this->assertCount(2, $clinicIds);
        $this->assertContains($clinicA->id, $clinicIds);
        $this->assertContains($clinicB->id, $clinicIds);
    }

    /**
     * TEST 09 & 10: Non-primary active clinic is returned and remains selectable (is_primary does not restrict eligibility).
     */
    public function test_09_and_10_non_primary_active_clinic_returned_and_selectable(): void
    {
        $doc = $this->createTestDoctor('د. ليلى الفرعية', 'نساء وتوليد');
        $primaryClinic = $this->createTestClinic('المستشفى الرئيسي', 'الجزائر', true);
        $secondaryClinic = $this->createTestClinic('المركز الفرعي', 'تارت', true);

        $doc->clinics()->attach($primaryClinic->id, ['position' => 'director', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($secondaryClinic->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('ليلى الفرعية'));
        $res->assertStatus(200);

        $docData = collect($res->json('data'))->firstWhere('id', $doc->id);
        $this->assertNotNull($docData);

        $secondaryData = collect($docData['clinics'])->firstWhere('id', $secondaryClinic->id);
        $this->assertNotNull($secondaryData);
        $this->assertEquals('doctor', $secondaryData['position']);
    }

    /**
     * TEST 11: Search finds doctors beyond page 1.
     */
    public function test_11_search_finds_doctors_beyond_page_one(): void
    {
        // Create 20 dummy doctors to push target doctor onto page 2
        for ($i = 1; $i <= 20; $i++) {
            $d = $this->createTestDoctor("طبيب عادي {$i}", 'عام');
            $c = $this->createTestClinic("عيادة نموذجية {$i}");
            $d->clinics()->attach($c->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);
        }

        $specialDoctor = $this->createTestDoctor('د. النسر البعيد الباحث', 'جراحة أعصاب');
        $specialClinic = $this->createTestClinic('عيادة النسر البعيد');
        $specialDoctor->clinics()->attach($specialClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        // Search specifically for specialDoctor with per_page=10
        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('النسر البعيد') . '&per_page=10');
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($specialDoctor->id, $ids);
    }

    /**
     * TEST 12: Search and structured filters compose with AND semantics correctly.
     */
    public function test_12_search_and_structured_filters_compose_with_and_semantics(): void
    {
        $docMatchesAll = $this->createTestDoctor('د. ياسين التركي', 'قلب وشرائين');
        $clinicOran = $this->createTestClinic('مركز القلب الباهية', 'وهران المضيئة', true);
        $docMatchesAll->clinics()->attach($clinicOran->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        $docMatchesSearchOnly = $this->createTestDoctor('د. ياسين الجزائر', 'عيون');
        $clinicAlgiers = $this->createTestClinic('مركز العيون العاصمة', 'الجزائر العاصمة', true);
        $docMatchesSearchOnly->clinics()->attach($clinicAlgiers->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        // Search "ياسين" AND specialty "قلب"
        $res = $this->getJson('/api/v1/doctors?search=' . urlencode('ياسين') . '&specialty=' . urlencode('قلب'));
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($docMatchesAll->id, $ids);
        $this->assertNotContains($docMatchesSearchOnly->id, $ids);
    }

    /**
     * TEST 13: Pagination metadata is accurate and returned in envelope.
     */
    public function test_13_pagination_metadata_is_accurate(): void
    {
        $res = $this->getJson('/api/v1/doctors?per_page=5&page=1');
        $res->assertStatus(200);

        $res->assertJsonStructure([
            'status',
            'data',
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
            'links' => ['first', 'last', 'prev', 'next'],
        ]);

        $this->assertEquals(1, $res->json('meta.current_page'));
        $this->assertEquals(5, $res->json('meta.per_page'));
    }

    /**
     * TEST 14: per_page bounds are clamped between 1 and 100.
     */
    public function test_14_per_page_bounds_clamped_between_1_and_100(): void
    {
        $resOver = $this->getJson('/api/v1/doctors?per_page=500');
        $resOver->assertStatus(200);
        $this->assertEquals(100, $resOver->json('meta.per_page'));

        $resZero = $this->getJson('/api/v1/doctors?per_page=0');
        $resZero->assertStatus(200);
        $this->assertEquals(1, $resZero->json('meta.per_page'));
    }

    /**
     * TEST 15 & 16: Appointment creation persists explicitly selected non-primary clinic_id.
     */
    public function test_15_and_16_non_primary_clinic_booking_persists_selected_clinic_id(): void
    {
        $doc = $this->createTestDoctor('د. مصطفى التعيين', 'جلدية');
        $primaryClinic = $this->createTestClinic('عيادة الجلدية A', 'الجزائر', true);
        $secondaryClinic = $this->createTestClinic('عيادة الجلدية B', 'البليدة', true);

        $doc->clinics()->attach($primaryClinic->id, ['position' => 'director', 'is_primary' => true, 'is_active' => true]);
        $doc->clinics()->attach($secondaryClinic->id, ['position' => 'doctor', 'is_primary' => false, 'is_active' => true]);

        $payload = [
            'clinic_id' => $secondaryClinic->id,
            'doctor_id' => $doc->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'كمال بن علي',
            'patient_phone' => '+213550000123',
            'booking_center_id' => $this->bookingCenter->id,
            'appointment_date' => date('Y-m-d', strtotime('+3 days')),
            'time_slot' => '10:00',
            'notes' => 'حجز بالعيادة الثانوية غير الأساسية',
        ];

        $res = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->postJson('/api/v1/appointments', $payload);

        $res->assertStatus(201);
        $this->assertDatabaseHas('appointments', [
            'doctor_id' => $doc->id,
            'clinic_id' => $secondaryClinic->id,
            'booking_center_id' => $this->bookingCenter->id,
        ]);
    }

    /**
     * TEST 17: Booking fails closed when doctor is NOT affiliated with specified clinic.
     */
    public function test_17_wrong_clinic_affiliation_booking_fails_closed(): void
    {
        $doc = $this->createTestDoctor('د. أمين المنع', 'عظام');
        $affiliatedClinic = $this->createTestClinic('عيادة أمين الحقيقية', 'الجزائر', true);
        $unrelatedClinic = $this->createTestClinic('عيادة غريبة لا ينتمي لها', 'وهران', true);

        $doc->clinics()->attach($affiliatedClinic->id, ['position' => 'doctor', 'is_primary' => true, 'is_active' => true]);

        $payload = [
            'clinic_id' => $unrelatedClinic->id,
            'doctor_id' => $doc->id,
            'patient_id' => $this->patient->id,
            'patient_name' => 'كمال بن علي',
            'patient_phone' => '+213550000123',
            'booking_center_id' => $this->bookingCenter->id,
            'appointment_date' => date('Y-m-d', strtotime('+3 days')),
            'time_slot' => '11:00',
        ];

        $res = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->postJson('/api/v1/appointments', $payload);

        $res->assertStatus(403);
    }

    /**
     * TEST 18: Empty search parameter returns standard paginated doctors.
     */
    public function test_18_empty_search_returns_standard_paginated_doctors(): void
    {
        $res = $this->getJson('/api/v1/doctors?search=');
        $res->assertStatus(200);
        $res->assertJsonStructure(['status', 'data', 'meta']);
    }
}
