<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\ClinicService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ScopedPermissionDelegationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    /**
     * Test Admin Assistant: Grant, Persist, Refresh, Logout/Login, Revoke, and Hard Ceiling.
     */
    public function test_admin_assistant_scoped_relational_permission_lifecycle(): void
    {
        $admin = User::factory()->create(['email' => 'admin.test@aafiya.dz', 'is_active' => true]);
        $admin->assignRole('admin');
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $assistant = User::factory()->create(['name' => 'Kada Belhadj', 'email' => 'kada.ast@aafiya.dz', 'is_active' => true]);
        $assistant->assignRole('admin_assistant');

        // 1. Grant selected permissions via PUT /admin/assistants/{id}/permissions
        $requestedPerms = [
            'platform.view_dashboard',
            'platform.view_requests',
            'platform.review_requests',
            'platform.approve_requests',
            'clinical.write_rx', // Illegal - beyond Hard Ceiling
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->putJson("/api/v1/admin/assistants/{$assistant->id}/permissions", [
                'permissions' => $requestedPerms,
            ]);

        $response->assertStatus(200);
        $delegated = $response->json('delegated_permissions');

        // Verify Hard Ceiling: clinical.write_rx was stripped!
        $this->assertNotContains('clinical.write_rx', $delegated);
        $this->assertContains('platform.view_dashboard', $delegated);
        $this->assertContains('platform.approve_requests', $delegated);

        // 2. Verify Database Persistence in scoped_permission_assignments
        $dbAssignments = ScopedPermissionAssignment::where('user_id', $assistant->id)
            ->where('scope_type', 'platform')
            ->where('is_active', true)
            ->with('permission')
            ->get();

        $this->assertCount(4, $dbAssignments);
        $permNames = $dbAssignments->pluck('permission.name')->all();
        $this->assertContains('platform.view_dashboard', $permNames);
        $this->assertNotContains('clinical.write_rx', $permNames);

        // Verify P7 Audit Attributes on Grant
        foreach ($dbAssignments as $assignment) {
            $this->assertEquals($admin->id, $assignment->granted_by_id);
            $this->assertNull($assignment->revoked_by_id);
            $this->assertNull($assignment->revoked_at);
        }

        // 3. Refresh Persistence: GET /api/v1/admin/assistants
        $indexResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants');

        $indexResponse->assertStatus(200);
        $firstAst = collect($indexResponse->json('data'))->firstWhere('id', $assistant->id);
        $this->assertNotNull($firstAst);
        $this->assertContains('platform.view_dashboard', $firstAst['scoped_permissions']);
        $this->assertContains('platform.approve_requests', $firstAst['scoped_permissions']);

        // 4. Backend Authorization Check: has4DAccess
        $freshAssistant = $assistant->fresh(['scopedPermissions.permission']);
        $this->assertTrue($freshAssistant->has4DAccess('platform.view_dashboard'));
        $this->assertTrue($freshAssistant->has4DAccess('platform.approve_requests'));
        $this->assertFalse($freshAssistant->has4DAccess('clinical.write_rx')); // Hard Ceiling
        $this->assertFalse($freshAssistant->has4DAccess('platform.delete_users')); // Not granted

        // 5. Revoke Permissions (Update with fewer permissions)
        $revokeResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->putJson("/api/v1/admin/assistants/{$assistant->id}/permissions", [
                'permissions' => ['platform.view_dashboard'], // Revoke approve_requests, review_requests, view_requests
            ]);

        $revokeResponse->assertStatus(200);

        // 6. P7 Audit Verification on Revoke: Records are NOT deleted; marked is_active=false with revoked_at & revoked_by_id
        $allRecords = ScopedPermissionAssignment::where('user_id', $assistant->id)->get();
        $this->assertCount(4, $allRecords, 'Historical records must be retained');

        $activeRecords = $allRecords->where('is_active', true);
        $revokedRecords = $allRecords->where('is_active', false);

        $this->assertCount(1, $activeRecords);
        $this->assertCount(3, $revokedRecords);

        foreach ($revokedRecords as $revoked) {
            $this->assertEquals($admin->id, $revoked->revoked_by_id);
            $this->assertNotNull($revoked->revoked_at);
        }

        // 7. Authorization after revoke
        $freshAssistant2 = $assistant->fresh(['scopedPermissions.permission']);
        $this->assertTrue($freshAssistant2->has4DAccess('platform.view_dashboard'));
        $this->assertFalse($freshAssistant2->has4DAccess('platform.approve_requests'));
    }

    /**
     * Test Doctor Assistant Scoped Delegation, Clinic Isolation, and Hard Permission Ceiling.
     */
    public function test_doctor_assistant_clinic_scoped_relational_delegation(): void
    {
        $directorUser = User::factory()->create(['email' => 'director@clinic.dz', 'is_active' => true]);
        $directorUser->assignRole('doctor');
        $directorDoctor = Doctor::create(['user_id' => $directorUser->id, 'specialty' => 'Cardiology', 'license_number' => 'CARD-001', 'is_verified' => true]);

        $clinic1 = Clinic::create([
            'name' => 'Al-Amal Clinic 1',
            'address' => 'Algiers',
            'wilaya' => 'Algiers',
            'phone' => '+213550111111',
            'director_doctor_id' => $directorDoctor->id,
            'is_active' => true,
        ]);
        $directorDoctor->clinics()->attach($clinic1->id, ['position' => 'director', 'is_primary' => true]);

        $clinic2 = Clinic::create([
            'name' => 'Al-Amal Clinic 2 (Other Clinic)',
            'address' => 'Oran',
            'wilaya' => 'Oran',
            'phone' => '+213550222222',
            'director_doctor_id' => $directorDoctor->id,
            'is_active' => true,
        ]);

        $clinicService = app(ClinicService::class);

        // 1. Create Assistant via ClinicService with delegated permissions
        $assistantRecord = $clinicService->createAssistant($directorUser, $clinic1, [
            'name' => 'Sarah Assistant',
            'email' => 'sarah.ast@clinic.dz',
            'phone' => '+213550333333',
            'password' => 'Assist#Secret2026!',
            'permissions_json' => [
                'booking.manage_queue',
                'booking.confirm_attendance',
                'clinical.write_rx', // Illegal - Hard ceiling!
            ],
        ]);

        $assistantUser = $assistantRecord->user;

        // 2. Verify Scoped Relational Table
        $assignments = ScopedPermissionAssignment::where('user_id', $assistantUser->id)
            ->where('scope_type', 'clinic')
            ->where('scope_id', $clinic1->id)
            ->where('is_active', true)
            ->with('permission')
            ->get();

        $this->assertCount(2, $assignments);
        $names = $assignments->pluck('permission.name')->all();
        $this->assertContains('booking.manage_queue', $names);
        $this->assertContains('booking.confirm_attendance', $names);
        $this->assertNotContains('clinical.write_rx', $names);

        // 3. Scope Isolation: Assistant has access in Clinic 1, but NOT in Clinic 2
        $this->assertTrue($assistantUser->hasClinicAccess('booking.manage_queue', $clinic1->id));
        $this->assertFalse($assistantUser->hasClinicAccess('booking.manage_queue', $clinic2->id));

        // 4. Hard Ceiling: Assistant CANNOT write prescriptions even in Clinic 1
        $this->assertFalse($assistantUser->hasClinicAccess('clinical.write_rx', $clinic1->id));

        // 5. Update Permissions via ClinicService
        $clinicService->updateAssistantPermissions($directorUser, $clinic1, $assistantRecord, [
            'booking.create',
        ]);

        $freshAssistant = $assistantUser->fresh(['scopedPermissions.permission']);
        $this->assertTrue($freshAssistant->hasClinicAccess('booking.create', $clinic1->id));
        $this->assertFalse($freshAssistant->hasClinicAccess('booking.manage_queue', $clinic1->id));
    }

    /**
     * Test Unauthorized Actor Cannot Delegate Permissions.
     */
    public function test_unauthorized_user_cannot_delegate_permissions(): void
    {
        $assistant1 = User::factory()->create(['email' => 'ast1@aafiya.dz', 'is_active' => true]);
        $assistant1->assignRole('admin_assistant');
        $token1 = $assistant1->createToken('ast1')->plainTextToken;

        $assistant2 = User::factory()->create(['email' => 'ast2@aafiya.dz', 'is_active' => true]);
        $assistant2->assignRole('admin_assistant');

        // Assistant cannot modify another assistant's permissions (403 Forbidden)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->putJson("/api/v1/admin/assistants/{$assistant2->id}/permissions", [
                'permissions' => ['platform.view_dashboard'],
            ]);

        $response->assertStatus(403);
    }
}
