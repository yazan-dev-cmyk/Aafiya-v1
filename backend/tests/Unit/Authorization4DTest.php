<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Services\AuthorizationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Authorization4DTest extends TestCase
{
    use RefreshDatabase;

    protected AuthorizationService $authService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->authService = new AuthorizationService();
    }

    public function test_doctor_with_director_position_has_administrative_and_clinical_access(): void
    {
        $doctor = User::factory()->create();
        $doctor->assignRole('doctor');

        // Director position inside clinic
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinic.manage_settings', position: 'director'),
            'Director must have clinic.manage_settings'
        );
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinic.create_staff', position: 'director'),
            'Director must have clinic.create_staff'
        );
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinic.view_analytics', position: 'director'),
            'Director must have clinic.view_analytics'
        );
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinical.write_rx', position: 'director'),
            'Director must have clinical.write_rx'
        );
    }

    public function test_employed_doctor_position_is_denied_administrative_access_but_retains_clinical(): void
    {
        $doctor = User::factory()->create();
        $doctor->assignRole('doctor');

        // Employed doctor position inside clinic
        $this->assertFalse(
            $this->authService->authorize($doctor, 'clinic.manage_settings', position: 'doctor'),
            'Employed doctor must NOT have clinic.manage_settings'
        );
        $this->assertFalse(
            $this->authService->authorize($doctor, 'clinic.create_staff', position: 'doctor'),
            'Employed doctor must NOT have clinic.create_staff'
        );
        $this->assertFalse(
            $this->authService->authorize($doctor, 'clinic.view_analytics', position: 'doctor'),
            'Employed doctor must NOT have clinic.view_analytics'
        );

        // Clinical authority is retained
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinical.write_rx', position: 'doctor'),
            'Employed doctor must have clinical.write_rx'
        );
        $this->assertTrue(
            $this->authService->authorize($doctor, 'clinical.view_ehr', position: 'doctor'),
            'Employed doctor must have clinical.view_ehr'
        );
    }

    public function test_doctor_assistant_hard_permission_ceiling_strictly_blocks_forbidden_delegations(): void
    {
        $assistant = User::factory()->create();
        $assistant->assignRole('doctor_assistant');

        // Hard Ceiling forbids delegating clinical / financial permissions to assistant
        $forbiddenPermissions = [
            'clinical.write_rx',
            'clinic.view_analytics',
            'clinical.delete_record',
            'clinic.create_staff',
            'diagnostic.approve_result',
        ];

        foreach ($forbiddenPermissions as $forbiddenPermission) {
            $this->assertFalse(
                $this->authService->canDelegate('doctor_assistant', $forbiddenPermission),
                "Permission ceiling failed: {$forbiddenPermission} must NOT be delegable to doctor_assistant"
            );

            $this->assertFalse(
                $this->authService->authorize($assistant, $forbiddenPermission, delegatedPermissions: [$forbiddenPermission]),
                "Assistant authorization failed: {$forbiddenPermission} must be blocked by Permission Ceiling"
            );
        }
    }

    public function test_doctor_assistant_allowed_delegations_are_authorized(): void
    {
        $assistant = User::factory()->create();
        $assistant->assignRole('doctor_assistant');

        $allowedPermissions = [
            'booking.manage_queue',
            'booking.confirm_attendance',
            'booking.create',
            'patient.view_contacts',
        ];

        foreach ($allowedPermissions as $allowedPermission) {
            $this->assertTrue(
                $this->authService->canDelegate('doctor_assistant', $allowedPermission),
                "Permission {$allowedPermission} must be delegable to doctor_assistant"
            );

            $this->assertTrue(
                $this->authService->authorize($assistant, $allowedPermission, delegatedPermissions: $allowedPermissions),
                "Assistant must be authorized for {$allowedPermission} when delegated"
            );
        }
    }

    public function test_sanitize_delegated_permissions_strips_out_ceiling_violating_permissions(): void
    {
        $requested = [
            'booking.manage_queue',
            'clinical.write_rx', // Forbidden!
            'booking.confirm_attendance',
            'clinic.create_staff', // Forbidden!
            'patient.view_contacts',
        ];

        $sanitized = $this->authService->sanitizeDelegatedPermissions('doctor_assistant', $requested);

        $this->assertEquals([
            'booking.manage_queue',
            'booking.confirm_attendance',
            'patient.view_contacts',
        ], $sanitized);
    }
}
