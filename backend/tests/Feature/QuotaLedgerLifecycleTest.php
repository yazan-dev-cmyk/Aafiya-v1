<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
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

class QuotaLedgerLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
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

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب باطني',
            'license_number' => 'DOC-9900',
            'is_verified' => true,
        ]);

        $this->clinic = Clinic::create([
            'name' => 'العيادة التخصصية',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '041000000',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->bookingCenterUser = User::factory()->create();
        $this->bookingCenterUser->roles()->attach($bcRole->id);
        $this->bookingCenter = BookingCenter::create([
            'user_id' => $this->bookingCenterUser->id,
            'name' => 'مركز حجز الغرب',
            'phone' => '041223344',
            'address' => 'شارع العربي بن مهيدي',
            'wilaya' => 'وهران',
            'quota_balance' => 0,
        ]);
    }

    public function test_purchasing_package_increases_quota_balance_and_writes_transaction(): void
    {
        $pkg = BookingPackage::where('package_code', 'PKG_100')->firstOrFail();

        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/booking-centers/purchase-package', [
            'package_id' => $pkg->id,
            'payment_reference' => 'CCP-998877',
            'payment_method' => 'baridimob',
        ]);

        $response->assertStatus(201);
        $requestId = $response->json('data.id');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $approveRes = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/package-purchase-requests/{$requestId}/approve");
        $approveRes->assertStatus(200);

        $this->bookingCenter->refresh();
        $this->assertEquals(100, $this->bookingCenter->quota_balance);

        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'transaction_type' => 'purchase',
            'units' => 100,
            'balance_after' => 100,
        ]);
    }

    public function test_pending_appointment_does_not_deduct_quota(): void
    {
        // Give 5 units to booking center
        $this->bookingCenter->update(['quota_balance' => 5]);

        $response = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض مركز الحجز',
            'patient_phone' => '0661122334',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '11:00',
        ]);

        $response->assertStatus(201);

        $this->bookingCenter->refresh();
        // Quota MUST remain 5 (P10 43.5 Invariant: No deduction on pending!)
        $this->assertEquals(5, $this->bookingCenter->quota_balance);

        // No confirmation transaction should exist
        $this->assertDatabaseMissing('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'transaction_type' => 'confirmation',
        ]);
    }

    public function test_confirming_appointment_deducts_exactly_one_unit_atomically(): void
    {
        $this->bookingCenter->update(['quota_balance' => 5]);

        // Create booking
        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض للتأكيد',
            'patient_phone' => '0661122335',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '14:00',
        ]);
        $appointmentId = $createRes->json('data.id');

        // Doctor confirms appointment
        $confirmRes = $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm");

        $confirmRes->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        $this->bookingCenter->refresh();
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'appointment_id' => $appointmentId,
            'transaction_type' => 'confirmation',
            'units' => -1,
            'balance_after' => 4,
        ]);
    }

    public function test_double_confirmation_is_idempotent_and_does_not_deduct_twice(): void
    {
        $this->bookingCenter->update(['quota_balance' => 5]);

        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض تأكيد مكرر',
            'patient_phone' => '0661122336',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '15:00',
        ]);
        $appointmentId = $createRes->json('data.id');

        // First confirmation
        $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm")->assertStatus(200);
        $this->bookingCenter->refresh();
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        // Second confirmation (Duplicate request)
        $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm")->assertStatus(200);
        $this->bookingCenter->refresh();
        // Must still be 4, NOT 3!
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        $count = BookingTransaction::where('booking_center_id', $this->bookingCenter->id)
            ->where('appointment_id', $appointmentId)
            ->where('transaction_type', 'confirmation')
            ->count();

        $this->assertEquals(1, $count);
    }

    public function test_cancellation_of_confirmed_appointment_refunds_quota(): void
    {
        $this->bookingCenter->update(['quota_balance' => 5]);

        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'patient_name' => 'مريض للإلغاء بعد التأكيد',
            'patient_phone' => '0661122337',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '16:00',
        ]);
        $appointmentId = $createRes->json('data.id');

        // Confirm (Quota becomes 4)
        $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/confirm")->assertStatus(200);
        $this->bookingCenter->refresh();
        $this->assertEquals(4, $this->bookingCenter->quota_balance);

        // Cancel (Quota must be refunded back to 5)
        $cancelRes = $this->actingAs($this->doctorUser, 'sanctum')->postJson("/api/v1/appointments/{$appointmentId}/cancel", [
            'reason' => 'عطل تقني في جهاز العيادة',
        ]);

        $cancelRes->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        $this->bookingCenter->refresh();
        $this->assertEquals(5, $this->bookingCenter->quota_balance);

        $this->assertDatabaseHas('booking_transactions', [
            'booking_center_id' => $this->bookingCenter->id,
            'appointment_id' => $appointmentId,
            'transaction_type' => 'refund',
            'units' => 1,
            'balance_after' => 5,
        ]);
    }

    public function test_confirmation_fails_if_booking_center_quota_is_insufficient(): void
    {
        $this->bookingCenter->update(['quota_balance' => 0]); // Zero balance

        $createRes = $this->actingAs($this->bookingCenterUser, 'sanctum')->postJson('/api/v1/appointments', [
            'clinic_id' => $this->clinic->id,
            'doctor_id' => $this->doctor->id,
            'booking_center_id' => $this->bookingCenter->id,
            'patient_name' => 'مريض بدون رصيد كاف',
            'patient_phone' => '0661122338',
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'time_slot' => '09:00',
        ]);

        $createRes->assertStatus(422)
            ->assertJsonValidationErrors(['quota']);
    }

    public function test_quota_transactions_pagination_contract_and_page_isolation(): void
    {
        for ($i = 0; $i < 25; $i++) {
            BookingTransaction::create([
                'booking_center_id' => $this->bookingCenter->id,
                'transaction_type' => 'purchase',
                'units' => 10,
                'balance_after' => 10 * ($i + 1),
                'reference_note' => "Transaction {$i}",
                'created_by_id' => $this->bookingCenterUser->id,
            ]);
        }

        $resPage1 = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->getJson('/api/v1/booking-centers/transactions?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->actingAs($this->bookingCenterUser, 'sanctum')
            ->getJson('/api/v1/booking-centers/transactions?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Quota Transactions Page 1 and Page 2 must not overlap.');
    }
}
