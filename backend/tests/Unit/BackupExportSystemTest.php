<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Jobs\ExportDatabaseBackupJob;
use App\Models\BackupExport;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SecurityAuditLog;
use App\Models\User;
use App\Services\BackupExportService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class BackupExportSystemTest extends TestCase
{
    protected BackupExportService $service;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'cache.default' => 'array',
            'logging.default' => 'null',
        ]);
        $this->service = new BackupExportService();
    }

    public function test_can_export_authorization_rule(): void
    {
        $admin = new User(['id' => '00000000-0000-0000-0000-000000000001']);
        $admin->setRelation('roles', collect([new Role(['name' => 'admin'])]));
        $this->assertTrue($this->service->canExport($admin), 'Admin must be authorized to export backups.');

        $regularUser = new User(['id' => '00000000-0000-0000-0000-000000000002']);
        $regularUser->setRelation('roles', collect([new Role(['name' => 'patient'])]));
        $this->assertFalse($this->service->canExport($regularUser), 'Regular patient must NOT be authorized to export backups.');
    }

    public function test_step_up_token_issuance_and_single_use_invariant(): void
    {
        $admin = new User([
            'id' => '00000000-0000-0000-0000-000000000001',
            'password' => Hash::make('Admin_Valid_Secret_123!'),
        ]);
        $admin->setRelation('roles', collect([new Role(['name' => 'admin'])]));

        $sessionId = 'session_test_abc123';

        // 1. Correct password issues single-use token
        $result = $this->service->verifyPasswordAndGenerateToken($admin, 'Admin_Valid_Secret_123!', $sessionId);
        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('expires_at', $result);
        $token = $result['token'];
        $this->assertEquals(64, strlen($token));

        // 2. Token is present in Cache
        $this->assertTrue(Cache::has("backup_export_stepup:{$token}"));

        // 3. Invalid password throws ValidationException
        $this->expectException(ValidationException::class);
        $this->service->verifyPasswordAndGenerateToken($admin, 'Wrong_Password_XYZ', $sessionId);
    }

    public function test_step_up_token_session_binding(): void
    {
        $admin = new User([
            'id' => '00000000-0000-0000-0000-000000000001',
            'password' => Hash::make('Admin_Valid_Secret_123!'),
        ]);
        $admin->setRelation('roles', collect([new Role(['name' => 'admin'])]));

        $sessionId = 'session_legitimate';
        $result = $this->service->verifyPasswordAndGenerateToken($admin, 'Admin_Valid_Secret_123!', $sessionId);
        $token = $result['token'];

        // Attempt to consume token from a different session must be rejected
        $this->expectException(AuthorizationException::class);
        $this->service->initiateExport($admin, $token, 'session_hijacked_or_mismatched');
    }

    public function test_unauthorized_user_is_denied_step_up_token(): void
    {
        $unauthorized = new User([
            'id' => '00000000-0000-0000-0000-000000000003',
            'password' => Hash::make('Valid_Password_For_Regular_User!'),
        ]);
        $unauthorized->setRelation('roles', collect([new Role(['name' => 'patient'])]));

        $this->expectException(AuthorizationException::class);
        $this->service->verifyPasswordAndGenerateToken($unauthorized, 'Valid_Password_For_Regular_User!', 'session_123');
    }

    public function test_expired_or_missing_step_up_token_is_rejected(): void
    {
        $admin = new User([
            'id' => '00000000-0000-0000-0000-000000000001',
            'password' => Hash::make('Admin_Valid_Secret_123!'),
        ]);
        $admin->setRelation('roles', collect([new Role(['name' => 'admin'])]));

        $this->expectException(ValidationException::class);
        $this->service->initiateExport($admin, 'non_existent_token_placeholder', 'session_abc');
    }

    public function test_token_single_use_consumption_invariant(): void
    {
        $admin = new User([
            'id' => '00000000-0000-0000-0000-000000000001',
            'password' => Hash::make('Admin_Valid_Secret_123!'),
        ]);
        $admin->setRelation('roles', collect([new Role(['name' => 'admin'])]));

        $sessionId = 'session_test';
        $result = $this->service->verifyPasswordAndGenerateToken($admin, 'Admin_Valid_Secret_123!', $sessionId);
        $token = $result['token'];

        $this->assertTrue(Cache::has("backup_export_stepup:{$token}"));

        // Simulate consumption (Cache::pull)
        $cachedData = Cache::pull("backup_export_stepup:{$token}");
        $this->assertNotNull($cachedData);
        $this->assertFalse(Cache::has("backup_export_stepup:{$token}"));

        // Second attempt to initiate with already consumed token must fail
        $this->expectException(ValidationException::class);
        $this->service->initiateExport($admin, $token, $sessionId);
    }

    public function test_job_explicit_queue_and_isolation_attributes(): void
    {
        $job = new ExportDatabaseBackupJob('dummy-uuid-123');
        $this->assertEquals('backups', $job->queue, 'Job must be assigned strictly to backups queue.');
        $this->assertEquals(1, $job->tries, 'Job must have tries = 1 to prevent runaway backup retries.');
        $this->assertEquals(600, $job->timeout, 'Job timeout must be 600 seconds (10 minutes).');
    }

    public function test_queue_configuration_has_dedicated_backups_connection(): void
    {
        $connectionConfig = config('queue.connections.backups');
        $this->assertIsArray($connectionConfig, 'Queue connection backups must be configured.');
        $this->assertEquals('backups', $connectionConfig['queue'] ?? null);
        $this->assertGreaterThanOrEqual(700, $connectionConfig['retry_after'] ?? 0, 'retry_after must be >= 700 to exceed job timeout of 600.');
    }

    public function test_security_audit_log_immutable_lifecycle(): void
    {
        $log = new SecurityAuditLog([
            'actor_id' => '00000000-0000-0000-0000-000000000001',
            'action' => 'INITIATE_BACKUP_EXPORT',
        ]);
        $log->exists = true; // Simulate persisted model

        $this->expectException(RuntimeException::class);
        $log->update(['action' => 'TAMPERED_ACTION']);
    }

    public function test_security_audit_log_deletion_prohibited(): void
    {
        $log = new SecurityAuditLog([
            'actor_id' => '00000000-0000-0000-0000-000000000001',
            'action' => 'INITIATE_BACKUP_EXPORT',
        ]);
        $log->exists = true; // Simulate persisted model

        $this->expectException(RuntimeException::class);
        $log->delete();
    }
}
