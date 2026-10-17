<?php

declare(strict_types=1);

/**
 * VacationRescheduleStressWorker
 * 
 * Independent worker process for multi-process concurrency testing of VacationRescheduleEngine.
 * Strictly verifies the database isolation gate before executing any operation.
 */

// 1. Parse CLI arguments
$options = getopt('', [
    'run-uuid:',
    'worker-id:',
    'action:',
    'barrier-file:',
    'payload:',
    'report-file:',
    'target-db:',
]);

$runUuid = $options['run-uuid'] ?? null;
$workerId = $options['worker-id'] ?? null;
$action = $options['action'] ?? null;
$barrierFile = $options['barrier-file'] ?? null;
$payloadRaw = $options['payload'] ?? null;
$reportFile = $options['report-file'] ?? null;
$targetDb = $options['target-db'] ?? null;

const AUTHORIZED_TARGET_DB = 'medical_db_dwh10_concurrency_test';

if (! $runUuid || ! $workerId || ! $action || ! $barrierFile || ! $payloadRaw || ! $reportFile || ! $targetDb) {
    fwrite(STDERR, "[SAFETY FATAL] Missing required worker arguments.\n");
    exit(1);
}

if ($targetDb !== AUTHORIZED_TARGET_DB) {
    fwrite(STDERR, "[SAFETY FATAL] Worker rejected unauthorized target database: '{$targetDb}'\n");
    exit(2);
}

$payload = json_decode($payloadRaw, true);
if (! is_array($payload)) {
    fwrite(STDERR, "Invalid payload JSON.\n");
    exit(1);
}

$startTime = microtime(true);
$pid = getmypid();

// 2. Bootstrap Laravel testing environment
require_once __DIR__ . '/../../../../vendor/autoload.php';
$app = require_once __DIR__ . '/../../../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 3. Mandatory Database Isolation Gate (Worker independent validation)
$env = app()->environment();
$dbConn = config('database.default');
$dbConfig = config("database.connections.{$dbConn}.database");

if ($env !== 'testing' || $dbConn !== 'mysql' || $dbConfig !== AUTHORIZED_TARGET_DB) {
    $report = [
        'run_uuid' => $runUuid,
        'worker_id' => $workerId,
        'pid' => $pid,
        'action' => $action,
        'status' => 'BLOCKED',
        'error_code' => 'ISOLATION_GATE_FAILED',
        'message' => "Worker isolation gate failed: env={$env}, conn={$dbConn}, db={$dbConfig}, expected=" . AUTHORIZED_TARGET_DB,
        'start_time' => $startTime,
        'end_time' => microtime(true),
        'created_entities' => [],
    ];
    file_put_contents($reportFile, json_encode($report, JSON_PRETTY_PRINT));
    exit(2);
}

// Runtime Handshake
try {
    $pdo = Illuminate\Support\Facades\DB::connection()->getPdo();
    $stmt = $pdo->query('SELECT DATABASE() AS cur_db, @@hostname AS host, @@port AS port, CURRENT_USER() AS db_user');
    $handshake = $stmt->fetch(PDO::FETCH_ASSOC);
    $activeDb = $handshake['cur_db'] ?? '';

    if ($activeDb !== AUTHORIZED_TARGET_DB || in_array($activeDb, ['medical_db', 'medical_db_testing'], true)) {
        throw new RuntimeException("Database mismatch: '{$activeDb}', expected '" . AUTHORIZED_TARGET_DB . "'");
    }
} catch (Throwable $e) {
    $report = [
        'run_uuid' => $runUuid,
        'worker_id' => $workerId,
        'pid' => $pid,
        'action' => $action,
        'status' => 'BLOCKED',
        'error_code' => 'HANDSHAKE_FAILED',
        'message' => 'Worker database handshake failed: ' . $e->getMessage(),
        'start_time' => $startTime,
        'end_time' => microtime(true),
        'created_entities' => [],
    ];
    file_put_contents($reportFile, json_encode($report, JSON_PRETTY_PRINT));
    exit(2);
}

// 4. Synchronize at the barrier
if (! file_exists($barrierFile)) {
    touch($barrierFile);
}

$barrierFp = fopen($barrierFile, 'r');
if (! $barrierFp) {
    fwrite(STDERR, "Cannot open barrier file.\n");
    exit(3);
}

// Signal readiness by acquiring shared lock, unblocks when orchestrator releases exclusive lock
flock($barrierFp, LOCK_SH);
fclose($barrierFp);

// Record exact time after unblocking from barrier
$executionStartTime = microtime(true);

// 5. Execute Action
$outcome = [
    'run_uuid' => $runUuid,
    'worker_id' => $workerId,
    'pid' => $pid,
    'action' => $action,
    'status' => 'INDETERMINATE',
    'error_code' => null,
    'exception_class' => null,
    'message' => null,
    'start_time' => $startTime,
    'barrier_unblock_time' => $executionStartTime,
    'end_time' => null,
    'created_entities' => [],
    'details' => [],
];

$engine = app(\App\Services\VacationRescheduleEngine::class);

try {
    if ($action === 'reschedule_vacation') {
        $vacationId = $payload['vacation_id'];
        $vacation = \App\Models\DoctorVacation::findOrFail($vacationId);

        $stats = $engine->processVacationRescheduling($vacation);

        $outcome['status'] = 'SUCCESS';
        $outcome['details'] = [
            'stats' => $stats,
        ];
    } else {
        throw new InvalidArgumentException("Unknown action: {$action}");
    }
} catch (\Illuminate\Validation\ValidationException $e) {
    $outcome['status'] = 'EXPECTED_REJECTION';
    $outcome['exception_class'] = get_class($e);
    $outcome['error_code'] = $e->errorBag;
    $outcome['message'] = $e->getMessage();
    $outcome['details'] = [
        'errors' => $e->errors(),
    ];
} catch (\Illuminate\Database\QueryException $e) {
    $errorCode = $e->errorInfo[1] ?? null;
    $outcome['exception_class'] = get_class($e);
    $outcome['message'] = $e->getMessage();
    if ($errorCode === 1062) {
        $outcome['status'] = 'DUPLICATE_KEY_1062';
        $outcome['error_code'] = 'ER_DUP_ENTRY_1062';
    } elseif ($errorCode === 1213) {
        $outcome['status'] = 'EXPECTED_REJECTION';
        $outcome['error_code'] = 'DEADLOCK_1213';
    } elseif ($errorCode === 1205) {
        $outcome['status'] = 'EXPECTED_REJECTION';
        $outcome['error_code'] = 'LOCK_WAIT_TIMEOUT_1205';
    } else {
        $outcome['status'] = 'ERROR';
        $outcome['error_code'] = 'QUERY_EXCEPTION_' . $errorCode;
    }
} catch (\Throwable $e) {
    $outcome['status'] = 'ERROR';
    $outcome['exception_class'] = get_class($e);
    $outcome['message'] = $e->getMessage();
} finally {
    $outcome['end_time'] = microtime(true);
    file_put_contents($reportFile, json_encode($outcome, JSON_PRETTY_PRINT));
}

exit(0);
