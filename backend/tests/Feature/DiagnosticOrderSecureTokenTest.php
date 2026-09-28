<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Services\DiagnosticService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DiagnosticOrderSecureTokenTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected DiagnosticService $service;

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

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);
        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'specialty' => 'طب عام',
            'license_number' => 'DOC-TEST-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الاختبار التشخيصي',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021112233',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-DIAG01',
            'first_name' => 'أحمد',
            'last_name' => 'بن علي',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '0555123456',
        ]);

        $this->service = app(DiagnosticService::class);
    }

    /**
     * Test A: New Order receives a 64-character, independent, unique secure_token.
     */
    public function test_newly_created_order_automatically_receives_secure_token(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'order_type' => 'laboratory',
                'clinical_indication' => 'فحص روتيني',
                'priority' => 'routine',
            ],
            [
                ['test_name' => 'Lipid Profile', 'test_code' => 'LIP-01'],
            ],
            $this->doctorUser
        );

        $this->assertNotNull($order->secure_token);
        $this->assertEquals(64, strlen($order->secure_token));
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{64}$/', $order->secure_token);
        $this->assertNotEquals($order->order_reference, $order->secure_token);
        $this->assertNotEquals($order->id, $order->secure_token);
        $this->assertStringNotContainsString($this->patient->mrn, $order->secure_token);

        // Verify database persistence
        $fromDb = DiagnosticOrder::find($order->id);
        $this->assertEquals($order->secure_token, $fromDb->secure_token);
    }

    /**
     * Test B: Explicit/Existing secure_token is preserved and not overwritten.
     */
    public function test_existing_token_is_preserved(): void
    {
        $customToken = Str::random(64);

        $order = DiagnosticOrder::create([
            'order_reference' => 'ORD-2026-9999',
            'secure_token' => $customToken,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'order_type' => 'laboratory',
            'status' => 'created',
            'ordered_at' => now(),
        ]);

        $this->assertEquals($customToken, $order->fresh()->secure_token);
    }

    /**
     * Test C: Backfill populates missing tokens with 64-char unique values.
     */
    public function test_backfill_populates_missing_tokens_for_legacy_orders(): void
    {
        // Insert orders with NULL secure_token directly into database
        $orderId1 = (string) Str::uuid();
        $orderId2 = (string) Str::uuid();

        DB::table('diagnostic_orders')->insert([
            [
                'id' => $orderId1,
                'order_reference' => 'ORD-2026-0001',
                'secure_token' => null,
                'patient_id' => $this->patient->id,
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'order_type' => 'laboratory',
                'status' => 'created',
                'ordered_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $orderId2,
                'order_reference' => 'ORD-2026-0002',
                'secure_token' => null,
                'patient_id' => $this->patient->id,
                'doctor_id' => $this->doctor->id,
                'clinic_id' => $this->clinic->id,
                'order_type' => 'radiology',
                'status' => 'created',
                'ordered_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->assertEquals(2, DiagnosticOrder::whereNull('secure_token')->count());

        // Execute Backfill
        $result = $this->service->backfillMissingTokens();

        $this->assertEquals(2, $result['backfilled']);
        $this->assertEquals(0, DiagnosticOrder::whereNull('secure_token')->count());

        $o1 = DiagnosticOrder::find($orderId1);
        $o2 = DiagnosticOrder::find($orderId2);

        $this->assertNotNull($o1->secure_token);
        $this->assertNotNull($o2->secure_token);
        $this->assertEquals(64, strlen($o1->secure_token));
        $this->assertEquals(64, strlen($o2->secure_token));
        $this->assertNotEquals($o1->secure_token, $o2->secure_token);
    }

    /**
     * Test D: Backfill is idempotent (running again does not mutate existing tokens).
     */
    public function test_backfill_is_idempotent(): void
    {
        $order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'order_type' => 'laboratory',
                'priority' => 'routine',
            ],
            [
                ['test_name' => 'Glucose Fasting', 'test_code' => 'GLU-01'],
            ],
            $this->doctorUser
        );

        $initialToken = $order->secure_token;

        // Run backfill
        $result = $this->service->backfillMissingTokens();

        $this->assertEquals(0, $result['backfilled']);
        $this->assertEquals(1, $result['unchanged']);
        $this->assertEquals($initialToken, $order->fresh()->secure_token);

        // Run backfill via Artisan command
        $this->artisan('diagnostics:backfill-tokens')->assertExitCode(0);
        $this->assertEquals($initialToken, $order->fresh()->secure_token);
    }
}
