<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\DiagnosticOrder;
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
use Tests\TestCase;

class DiagnosticSecurityTamperingEnumerationTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;
    protected Doctor $doctor;
    protected Clinic $clinic;
    protected Patient $patient;
    protected DiagnosticOrder $order;
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
            'license_number' => 'DOC-SEC-01',
        ]);

        $this->clinic = Clinic::create([
            'name' => 'عيادة الأمان والتحقق',
            'address' => 'الجزائر',
            'wilaya' => 'الجزائر',
            'phone' => '021998877',
            'director_doctor_id' => $this->doctor->id,
            'max_patients_per_slot' => 5,
            'slot_duration_min' => 60,
        ]);

        $this->doctor->clinics()->attach($this->clinic->id, [
            'position' => 'director',
            'is_primary' => true,
        ]);

        $this->patient = Patient::create([
            'mrn' => 'MRN-2026-SEC01',
            'first_name' => 'سامي',
            'last_name' => 'قاسمي',
            'gender' => 'male',
            'date_of_birth' => '1992-02-02',
            'phone' => '0555332211',
        ]);

        $this->service = app(DiagnosticService::class);

        $this->order = $this->service->createOrder(
            [
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->id,
                'order_type' => 'laboratory',
                'clinical_indication' => 'فحص كيميائي شامل',
                'priority' => 'routine',
            ],
            [
                ['test_name' => 'Electrolytes Panel', 'test_code' => 'LYTE-01'],
            ],
            $this->doctorUser
        );
    }

    /**
     * Test 1: Enumeration Prevention - Order Reference cannot authenticate public verification.
     */
    public function test_order_reference_cannot_authenticate_public_verification(): void
    {
        $this->getJson("/api/v1/diagnostics/verify/{$this->order->order_reference}")
            ->assertStatus(404)
            ->assertJsonStructure(['message']);
    }

    /**
     * Test 2: Enumeration Prevention - Order UUID cannot authenticate public verification.
     */
    public function test_order_uuid_cannot_authenticate_public_verification(): void
    {
        $this->getJson("/api/v1/diagnostics/verify/{$this->order->id}")
            ->assertStatus(404)
            ->assertJsonStructure(['message']);
    }

    /**
     * Test 3: Token Tampering - Modifying the first character fails with 404.
     */
    public function test_tampered_first_character_fails(): void
    {
        $original = $this->order->secure_token;
        $tampered = ($original[0] === 'A' ? 'B' : 'A') . substr($original, 1);

        $this->getJson("/api/v1/diagnostics/verify/{$tampered}")
            ->assertStatus(404);
    }

    /**
     * Test 4: Token Tampering - Modifying the last character fails with 404.
     */
    public function test_tampered_last_character_fails(): void
    {
        $original = $this->order->secure_token;
        $lastChar = substr($original, -1);
        $tampered = substr($original, 0, -1) . ($lastChar === 'Z' ? 'Y' : 'Z');

        $this->getJson("/api/v1/diagnostics/verify/{$tampered}")
            ->assertStatus(404);
    }

    /**
     * Test 5: Token Tampering - Modifying middle characters fails with 404.
     */
    public function test_tampered_middle_character_fails(): void
    {
        $original = $this->order->secure_token;
        $tampered = substr($original, 0, 30) . 'X' . substr($original, 31);

        $this->getJson("/api/v1/diagnostics/verify/{$tampered}")
            ->assertStatus(404);
    }

    /**
     * Test 6: Token Tampering - Truncating or extending token length fails with 404.
     */
    public function test_tampered_token_length_fails(): void
    {
        $original = $this->order->secure_token;
        
        // Truncated (63 chars)
        $this->getJson("/api/v1/diagnostics/verify/" . substr($original, 0, 63))
            ->assertStatus(404);

        // Extended (65 chars)
        $this->getJson("/api/v1/diagnostics/verify/" . $original . "X")
            ->assertStatus(404);
    }

    /**
     * Test 7: Malformed Inputs - Special characters & SQL/XSS probes fail safely.
     */
    public function test_malformed_and_injection_probes_fail_safely(): void
    {
        $probes = [
            '../../etc/passwd',
            "' OR '1'='1",
            '<script>alert(1)</script>',
            'null',
            'undefined',
            '0',
            '~!@#$%^&*()_+',
        ];

        foreach ($probes as $probe) {
            $this->getJson("/api/v1/diagnostics/verify/" . urlencode($probe))
                ->assertStatus(404);
        }
    }
}
