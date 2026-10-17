<?php

namespace Tests\Unit;

use Illuminate\Database\Connection;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Foundation\Application;
use PHPUnit\Framework\TestCase as PhpUnitTestCase;
use RuntimeException;
use Tests\TestCase;

class TestDatabaseIsolationGuardTest extends PhpUnitTestCase
{
    /**
     * Helper to create a mock Connection with a given database name.
     */
    protected function createMockConnection(string $databaseName, ?callable $pdoResolver = null): Connection
    {
        $mock = $this->getMockBuilder(Connection::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getDatabaseName', 'beforeExecuting', 'getPdo'])
            ->getMock();

        $mock->method('getDatabaseName')->willReturn($databaseName);

        if ($pdoResolver !== null) {
            $mock->method('getPdo')->willReturnCallback($pdoResolver);
        }

        return $mock;
    }

    /**
     * Helper to mock Application with configuration and environment.
     */
    protected function createMockApplication(string $env, string $defaultConn, string $defaultDb): Application
    {
        $app = $this->getMockBuilder(Application::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['environment', 'offsetGet'])
            ->getMock();

        $app->method('environment')->willReturn($env);

        $config = new class($defaultConn, $defaultDb) {
            private string $defaultConn;
            private string $defaultDb;

            public function __construct(string $defaultConn, string $defaultDb)
            {
                $this->defaultConn = $defaultConn;
                $this->defaultDb = $defaultDb;
            }

            public function get(string $key)
            {
                if ($key === 'database.default') {
                    return $this->defaultConn;
                }
                if ($key === "database.connections.{$this->defaultConn}.database") {
                    return $this->defaultDb;
                }
                return null;
            }
        };

        $app->method('offsetGet')->willReturnCallback(function ($key) use ($config) {
            if ($key === 'config') {
                return $config;
            }
            return null;
        });

        return $app;
    }

    // 1. Authorized database: medical_db_dwh10_test passes the guard
    public function test_authorized_database_passes_isolation_guard(): void
    {
        $conn = $this->createMockConnection('medical_db_dwh10_test');
        $conn->expects($this->once())->method('beforeExecuting');

        // Should not throw
        TestCase::enforceConnectionIsolation($conn);
        $this->assertTrue(true);
    }

    // 2. Wrong database: medical_db is rejected
    public function test_medical_db_is_rejected_as_forbidden(): void
    {
        $conn = $this->createMockConnection('medical_db');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Forbidden database access blocked: 'medical_db'");

        TestCase::enforceConnectionIsolation($conn);
    }

    // 3. Other unauthorized database: medical_db_testing or another name is rejected
    public function test_medical_db_testing_and_other_unauthorized_dbs_are_rejected(): void
    {
        $conn1 = $this->createMockConnection('medical_db_testing');
        try {
            TestCase::enforceConnectionIsolation($conn1);
            $this->fail('Expected exception for medical_db_testing');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("Forbidden database access blocked: 'medical_db_testing'", $e->getMessage());
        }

        $conn2 = $this->createMockConnection('unauthorized_production_backup');
        try {
            TestCase::enforceConnectionIsolation($conn2);
            $this->fail('Expected exception for unauthorized_production_backup');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("Unauthorized database connection blocked: 'unauthorized_production_backup'", $e->getMessage());
        }
    }

    // 4. Missing or empty database name is rejected
    public function test_empty_or_missing_database_name_is_rejected(): void
    {
        $conn = $this->createMockConnection('');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Connection database name is empty or missing');

        TestCase::enforceConnectionIsolation($conn);
    }

    // 5. Wrong environment: non-testing environment is rejected
    public function test_non_testing_environment_is_rejected(): void
    {
        $app = $this->createMockApplication('production', 'mysql', 'medical_db_dwh10_test');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("APP_ENV must be 'testing', got 'production'");

        TestCase::assertIsolationConfiguration($app);
    }

    // 6. Wrong default driver or database configuration: rejected
    public function test_wrong_driver_or_database_config_is_rejected(): void
    {
        $app1 = $this->createMockApplication('testing', 'pgsql', 'medical_db_dwh10_test');
        try {
            TestCase::assertIsolationConfiguration($app1);
            $this->fail('Expected exception for pgsql driver');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("database.default must be 'mysql', got 'pgsql'", $e->getMessage());
        }

        $app2 = $this->createMockApplication('testing', 'mysql', 'medical_db');
        try {
            TestCase::assertIsolationConfiguration($app2);
            $this->fail('Expected exception for medical_db config');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("Default database must be one of authorized test databases, configured: 'medical_db'", $e->getMessage());
        }
    }

    // 7. Named connection: an unauthorized named connection is rejected
    public function test_unauthorized_named_connection_is_rejected(): void
    {
        $namedConn = $this->createMockConnection('medical_reports_db');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Unauthorized database connection blocked: 'medical_reports_db'");

        TestCase::enforceConnectionIsolation($namedConn);
    }

    // 8. Dynamic connection: connectUsing() path cannot bypass the guard
    public function test_dynamic_connection_is_rejected_if_unauthorized(): void
    {
        $dynamicConn = $this->createMockConnection('arbitrary_target_db');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Unauthorized database connection blocked: 'arbitrary_target_db'");

        TestCase::enforceConnectionIsolation($dynamicConn);
    }

    // 9. Exception propagation: guard exception aborts connection creation and is not swallowed
    public function test_guard_exception_propagates_cleanly_through_event_dispatch(): void
    {
        $conn = $this->createMockConnection('medical_db');
        $event = new ConnectionEstablished($conn);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Forbidden database access blocked: 'medical_db'");

        // Simulating the listener callback registered in createApplication()
        TestCase::enforceConnectionIsolation($event->connection);
    }

    // 10. PDO timing: unauthorized connection's PDO resolver is never invoked
    public function test_unauthorized_connection_pdo_resolver_is_never_invoked(): void
    {
        $pdoInvoked = false;
        $conn = $this->createMockConnection('medical_db', function () use (&$pdoInvoked) {
            $pdoInvoked = true;
            throw new RuntimeException('FATAL: PDO was resolved!');
        });

        try {
            TestCase::enforceConnectionIsolation($conn);
            $this->fail('Expected exception');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString("Forbidden database access blocked: 'medical_db'", $e->getMessage());
        }

        $this->assertFalse($pdoInvoked, 'PDO resolver MUST NOT be invoked when isolation guard rejects connection');
    }

    // 11. Application refresh: guard is deterministic static method reusable on fresh applications
    public function test_application_refresh_rebinds_and_revalidates_correctly(): void
    {
        $app1 = $this->createMockApplication('testing', 'mysql', 'medical_db_dwh10_test');
        TestCase::assertIsolationConfiguration($app1);

        $app2 = $this->createMockApplication('testing', 'mysql', 'medical_db_testing');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("Default database must be one of authorized test databases, configured: 'medical_db_testing'");
        TestCase::assertIsolationConfiguration($app2);
    }

    // 12. Database-switch statement: USE statement is rejected before execution
    public function test_database_switch_statement_is_rejected(): void
    {
        $useStatements = [
            'USE medical_db;',
            'use medical_db',
            'USE `medical_db`;',
            "use 'medical_db';",
            '/* comment */ USE other_db;',
            "-- comment\nUSE other_db;",
            "# comment\nUSE other_db;",
        ];

        $conn = $this->createMockConnection('medical_db_dwh10_test');

        foreach ($useStatements as $sql) {
            $this->assertTrue(TestCase::isDatabaseSwitchStatement($sql), "Failed asserting that '{$sql}' is detected as a USE statement");

            try {
                TestCase::enforceQueryIsolation($sql, $conn);
                $this->fail("Expected query isolation exception for: '{$sql}'");
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('Database switching query (USE statement) is forbidden during tests', $e->getMessage());
            }
        }
    }

    // 13. Ordinary SQL containing the word USE is not rejected
    public function test_ordinary_sql_containing_word_use_is_not_rejected(): void
    {
        $safeQueries = [
            "SELECT * FROM appointments WHERE cause_of_visit = 'In use for cardiology'",
            "INSERT INTO doctor_notes (notes) VALUES ('Please use antiseptic')",
            "SELECT COUNT(*) FROM users WHERE username = 'user_admin'",
            "SELECT * FROM settings /* We use this query for stats */ WHERE active = 1",
            "UPDATE clinics SET name = 'Clinic house' WHERE id = 10",
        ];

        $conn = $this->createMockConnection('medical_db_dwh10_test');

        foreach ($safeQueries as $sql) {
            $this->assertFalse(TestCase::isDatabaseSwitchStatement($sql), "Query falsely flagged as USE statement: '{$sql}'");

            // Should not throw
            TestCase::enforceQueryIsolation($sql, $conn);
        }

        $this->assertTrue(true);
    }

    // 14. Authorized configuration: valid test configuration remains usable
    public function test_authorized_configuration_passes(): void
    {
        $app = $this->createMockApplication('testing', 'mysql', 'medical_db_dwh10_test');
        TestCase::assertIsolationConfiguration($app);
        $this->assertTrue(true);
    }
}
