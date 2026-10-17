<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Connection;
use Illuminate\Database\Events\ConnectionEstablished;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public const REQUIRED_TEST_DB = 'medical_db_dwh10_test';
    public const REQUIRED_CONCURRENCY_TEST_DB = 'medical_db_dwh10_concurrency_test';
    public const AUTHORIZED_TEST_DATABASES = [
        'medical_db_dwh10_test',
        'medical_db_dwh10_concurrency_test',
    ];
    public const FORBIDDEN_DATABASES = ['medical_db', 'medical_db_testing'];

    /**
     * Creates the application with fail-closed pre-bootstrap database isolation.
     *
     * Layer 1: Registers ConnectionEstablished listener on $app['events'] BEFORE Kernel bootstrap,
     * ensuring any connection created during provider boot or early test lifecycle is trapped
     * before its lazy PDO resolver connects.
     */
    public function createApplication()
    {
        $app = require Application::inferBasePath() . '/bootstrap/app.php';

        // 1. Attach ConnectionEstablished listener BEFORE Kernel bootstrap
        $app['events']->listen(ConnectionEstablished::class, function (ConnectionEstablished $event) {
            static::enforceConnectionIsolation($event->connection);
        });

        // 2. Bootstrap the Kernel (loads config, registers and boots service providers)
        $app->make(Kernel::class)->bootstrap();

        // 3. Early post-bootstrap configuration verification
        static::assertIsolationConfiguration($app);

        return $app;
    }

    /**
     * Enforce strict database isolation on any established or reconnected Laravel Connection.
     * Layer 2 (connection-level) & Layer 4 (query-level SQL barrier).
     *
     * Invariant: This executes when DatabaseManager creates the connection object,
     * while the underlying PDO is still an unresolved Closure. No socket handshake has occurred.
     */
    public static function enforceConnectionIsolation(Connection $connection): void
    {
        $dbName = $connection->getDatabaseName();

        if (empty($dbName) || !is_string($dbName)) {
            throw new RuntimeException(
                '[ISOLATION FATAL] Connection database name is empty or missing.'
            );
        }

        if (in_array(strtolower($dbName), self::FORBIDDEN_DATABASES, true)) {
            throw new RuntimeException(
                "[ISOLATION FATAL] Forbidden database access blocked: '{$dbName}'."
            );
        }

        if (! in_array($dbName, self::AUTHORIZED_TEST_DATABASES, true)) {
            throw new RuntimeException(
                "[ISOLATION FATAL] Unauthorized database connection blocked: '{$dbName}'."
            );
        }

        // Layer 4: Attach beforeExecuting callback to block database switching (e.g. USE other_db)
        $connection->beforeExecuting(function ($query, $bindings, Connection $conn) {
            static::enforceQueryIsolation($query, $conn);
        });
    }

    /**
     * Validate configuration against isolation rules without opening any database socket.
     * Layer 3: Configuration-level preflight.
     */
    public static function assertIsolationConfiguration(Application $app): void
    {
        $env = $app->environment();
        if ($env !== 'testing') {
            throw new RuntimeException(
                "[ISOLATION FATAL] APP_ENV must be 'testing', got '{$env}'."
            );
        }

        $defaultConn = $app['config']->get('database.default');
        if ($defaultConn !== 'mysql') {
            throw new RuntimeException(
                "[ISOLATION FATAL] database.default must be 'mysql', got '{$defaultConn}'."
            );
        }

        $defaultDb = $app['config']->get("database.connections.{$defaultConn}.database");
        if (! in_array($defaultDb, self::AUTHORIZED_TEST_DATABASES, true)) {
            throw new RuntimeException(
                "[ISOLATION FATAL] Default database must be one of authorized test databases, configured: '{$defaultDb}'."
            );
        }
    }

    /**
     * Inspect SQL statement before PDO execution to prevent database switching (e.g., USE `other_db`).
     * Layer 4: Query-level defense.
     */
    public static function enforceQueryIsolation(string $query, Connection $conn): void
    {
        if (static::isDatabaseSwitchStatement($query)) {
            throw new RuntimeException(
                '[ISOLATION FATAL] Database switching query (USE statement) is forbidden during tests.'
            );
        }
    }

    /**
     * Deterministically detect whether an SQL statement is attempting a database switch (USE database_name).
     * Strips SQL comments (both block and line comments) before matching.
     */
    public static function isDatabaseSwitchStatement(string $query): bool
    {
        // Strip block comments /* ... */
        $cleaned = preg_replace('/\/\*.*?\*\//s', ' ', $query);
        // Strip line comments -- ... and # ...
        $cleaned = preg_replace('/(?:--[^\r\n]*|#[^\r\n]*)/', ' ', (string) $cleaned);

        $trimmed = trim((string) $cleaned);

        // Match USE followed by whitespace and a database name / identifier
        return (bool) preg_match('/^use\s+[`\'"]?[a-zA-Z0-9_\-]+[`\'"]?\s*;?$/i', $trimmed);
    }

    /**
     * Standard test lifecycle hook.
     */
    protected function setUp(): void
    {
        // Pre-setup verification: ensure app exists and passes config isolation before parent setUp
        if ($this->app) {
            static::assertIsolationConfiguration($this->app);
        }

        parent::setUp();
    }
}


