<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAssistantPersistenceE2ETest extends TestCase
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
     * Complete 11-Step Real-World Verification Scenario
     */
    public function test_full_admin_assistant_lifecycle_and_refresh_persistence(): void
    {
        // Step 1: Super Admin exists & logs in
        $adminUser = User::factory()->create([
            'email' => 'superadmin.e2e@aafiya.dz',
            'is_active' => true,
        ]);
        $adminUser->assignRole('admin');

        $adminToken = $adminUser->createToken('auth')->plainTextToken;

        // Step 2 & 3: Super Admin creates Test Admin Assistant via POST /api/v1/admin/assistants
        $createResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/v1/admin/assistants', [
                'name' => 'Test Admin Assistant',
                'email' => 'test.admin.assistant@aafiya.test',
                'phone' => '0501234567',
                'password' => 'Assist#Pass2026!',
            ]);

        $createResponse->assertStatus(201);
        $createResponse->assertJsonPath('status', 'success');
        $createResponse->assertJsonPath('data.email', 'test.admin.assistant@aafiya.test');

        // Step 4: Verify Database Persistence
        $assistantUser = User::where('email', 'test.admin.assistant@aafiya.test')->first();
        $this->assertNotNull($assistantUser, 'Assistant user must exist in database');
        $this->assertTrue($assistantUser->is_active, 'Assistant must be active');
        $this->assertTrue(Hash::check('Assist#Pass2026!', $assistantUser->password), 'Password must match and be hashed');
        $this->assertNotEquals('Assist#Pass2026!', $assistantUser->password, 'Password must not be stored in plain text');
        $this->assertTrue($assistantUser->hasRole('admin_assistant'), 'Assistant must have admin_assistant role');

        // Step 5: Page Load / List fetch
        $listResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants');

        $listResponse->assertStatus(200);
        $emails = collect($listResponse->json('data'))->pluck('email')->toArray();
        $this->assertContains('test.admin.assistant@aafiya.test', $emails);

        // Step 6: Refresh Simulation (repeated fetch)
        $refreshResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants');

        $refreshResponse->assertStatus(200);
        $refreshedEmails = collect($refreshResponse->json('data'))->pluck('email')->toArray();
        $this->assertContains('test.admin.assistant@aafiya.test', $refreshedEmails, 'Assistant must persist after page refresh');

        // Step 7: Logout / Login Simulation
        $this->flushHeaders();
        $newAdminLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin.e2e@aafiya.dz',
            'password' => 'password',
        ]);
        $newAdminLogin->assertStatus(200);
        $newAdminToken = $newAdminLogin->json('data.token');

        $postLoginList = $this->withHeader('Authorization', 'Bearer ' . $newAdminToken)
            ->getJson('/api/v1/admin/assistants');
        $postLoginList->assertStatus(200);
        $postLoginEmails = collect($postLoginList->json('data'))->pluck('email')->toArray();
        $this->assertContains('test.admin.assistant@aafiya.test', $postLoginEmails, 'Assistant must persist across admin sessions');

        // Step 8: Assistant Login with initial password
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $astLoginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'test.admin.assistant@aafiya.test',
            'password' => 'Assist#Pass2026!',
        ]);

        $astLoginResponse->assertStatus(200);
        $astLoginResponse->assertJsonStructure([
            'status',
            'data' => [
                'user' => ['id', 'name', 'email', 'roles'],
                'token',
            ],
        ]);
        $astToken = $astLoginResponse->json('data.token');
        $astRoles = $astLoginResponse->json('data.user.roles');
        $this->assertContains('admin_assistant', $astRoles);

        // Step 9 & 10: Direct authenticated access without forced password change
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $astMeResponse = $this->withHeader('Authorization', 'Bearer ' . $astToken)
            ->getJson('/api/v1/auth/me');

        $astMeResponse->assertStatus(200);
        $astMeResponse->assertJsonPath('data.email', 'test.admin.assistant@aafiya.test');
        $this->assertArrayNotHasKey('must_change_password', $astMeResponse->json('data'));

        // Step 11: Authorization boundaries check (Admin Assistant cannot create other assistants)
        $unauthAstResponse = $this->withHeader('Authorization', 'Bearer ' . $astToken)
            ->postJson('/api/v1/admin/assistants', [
                'name' => 'Sub Assistant',
                'email' => 'sub.ast@aafiya.test',
                'phone' => '0509999999',
                'password' => 'Secret2026!',
            ]);
        $unauthAstResponse->assertStatus(403);
    }

    public function test_admin_assistants_pagination_contract_and_page_isolation(): void
    {
        $adminUser = User::factory()->create();
        $adminUser->assignRole('admin');
        $adminToken = $adminUser->createToken('auth')->plainTextToken;

        for ($i = 0; $i < 25; $i++) {
            $ast = User::factory()->create([
                'name' => "Assistant {$i}",
                'email' => "ast_{$i}_" . uniqid() . "@aafiya.dz",
            ]);
            $ast->assignRole('admin_assistant');
        }

        $resPage1 = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/v1/admin/assistants?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Admin Assistants Page 1 and Page 2 must not overlap.');
    }
}
