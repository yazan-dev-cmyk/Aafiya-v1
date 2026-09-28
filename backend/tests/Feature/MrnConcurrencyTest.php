<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Services\EhrService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MrnConcurrencyTest extends TestCase
{
    /**
     * Test 20 concurrent patient registrations via independent PHP processes.
     */
    public function test_20_concurrent_patient_registrations(): void
    {
        $period = '2026-09';

        // Reset sequence counter to 0 for this test
        DB::table('mrn_sequences')->where('period', $period)->update(['current_sequence' => 0]);
        // Delete any test patients with this period in testing DB
        Patient::where('mrn', 'LIKE', "MRN-{$period}-%")->forceDelete();

        $workersCount = 20;
        $basePath = base_path();
        $workerScript = <<<PHP
require '{$basePath}/vendor/autoload.php';
\$app = require_once '{$basePath}/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

\$id = \$argv[1];
\$period = \$argv[2];

try {
    \Carbon\Carbon::setTestNow(\Carbon\Carbon::create(2026, 9, 15, 12, 0, 0, 'Africa/Algiers'));
    \$ehrService = app(\App\Services\EhrService::class);

    \$start = microtime(true);
    \$patient = \$ehrService->createPatient([
        'first_name'    => "متزامن {\$id}",
        'last_name'     => "عامل {\$id}",
        'gender'        => 'male',
        'date_of_birth' => '1990-01-01',
        'phone'         => sprintf('0559%06d', (int) \$id),
    ]);
    \$duration = microtime(true) - \$start;

    echo json_encode([
        'status'   => 'success',
        'worker'   => \$id,
        'mrn'      => \$patient->mrn,
        'duration' => \$duration,
    ]);
} catch (\Throwable \$e) {
    echo json_encode([
        'status'  => 'error',
        'worker'  => \$id,
        'message' => \$e->getMessage(),
    ]);
}
PHP;

        $tempScript = sys_get_temp_dir() . '/mrn_concurrency_worker_' . uniqid() . '.php';
        file_put_contents($tempScript, "<?php\n" . $workerScript);

        $processes = [];
        $pipes = [];

        // Launch all 20 worker processes simultaneously
        for ($i = 1; $i <= $workersCount; $i++) {
            $cmd = sprintf('php %s %d %s', escapeshellarg($tempScript), $i, escapeshellarg($period));
            $proc = proc_open($cmd, [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ], $procPipes, base_path(), [
                'APP_ENV'     => 'testing',
                'DB_DATABASE' => config('database.connections.mysql.database'),
            ]);

            $processes[$i] = $proc;
            $pipes[$i] = $procPipes;
        }

        $results = [];
        $errors = [];

        // Collect outputs
        foreach ($processes as $i => $proc) {
            $stdout = stream_get_contents($pipes[$i][1]);
            $stderr = stream_get_contents($pipes[$i][2]);
            fclose($pipes[$i][0]);
            fclose($pipes[$i][1]);
            fclose($pipes[$i][2]);
            proc_close($proc);

            $data = json_decode(trim($stdout), true);
            if ($data && isset($data['status']) && $data['status'] === 'success') {
                $results[] = $data;
            } else {
                $errors[] = [
                    'worker' => $i,
                    'stdout' => $stdout,
                    'stderr' => $stderr,
                ];
            }
        }

        @unlink($tempScript);

        // Assert zero process errors
        $this->assertEmpty($errors, 'Errors occurred during concurrent worker execution: ' . json_encode($errors));
        $this->assertCount($workersCount, $results);

        // Extract MRNs
        $mrns = array_column($results, 'mrn');

        // Assert zero duplicates
        $this->assertCount($workersCount, array_unique($mrns), 'Duplicate MRNs detected among concurrent workers!');

        // Sort MRNs to verify consecutive sequence
        sort($mrns);
        $expectedFirst = 'MRN-2026-09-00001';
        $expectedLast = sprintf('MRN-2026-09-%05d', $workersCount);

        $this->assertEquals($expectedFirst, $mrns[0], 'First sequence does not match expected 00001');
        $this->assertEquals($expectedLast, $mrns[$workersCount - 1], "Last sequence does not match expected {$expectedLast}");

        // Verify all values 00001 through 00020 are present
        for ($k = 1; $k <= $workersCount; $k++) {
            $expectedMrn = sprintf('MRN-2026-09-%05d', $k);
            $this->assertContains($expectedMrn, $mrns, "Missing sequence value: {$expectedMrn}");
        }

        // Verify final sequence in database equals 20
        $finalCounter = DB::table('mrn_sequences')->where('period', $period)->value('current_sequence');
        $this->assertEquals($workersCount, $finalCounter);
    }

    /**
     * Test 50 concurrent patient registrations via independent PHP processes (High Concurrency).
     */
    public function test_50_concurrent_patient_registrations(): void
    {
        $period = '2026-11';

        // Reset sequence counter to 0 for this test
        DB::table('mrn_sequences')->where('period', $period)->update(['current_sequence' => 0]);
        Patient::where('mrn', 'LIKE', "MRN-{$period}-%")->forceDelete();

        $workersCount = 50;
        $basePath = base_path();
        $workerScript = <<<PHP
require '{$basePath}/vendor/autoload.php';
\$app = require_once '{$basePath}/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

\$id = \$argv[1];
\$period = \$argv[2];

try {
    \Carbon\Carbon::setTestNow(\Carbon\Carbon::create(2026, 11, 20, 10, 0, 0, 'Africa/Algiers'));
    \$ehrService = app(\App\Services\EhrService::class);

    \$start = microtime(true);
    \$patient = \$ehrService->createPatient([
        'first_name'    => "متزامن50 {\$id}",
        'last_name'     => "عامل {\$id}",
        'gender'        => 'male',
        'date_of_birth' => '1990-01-01',
        'phone'         => sprintf('0558%06d', (int) \$id),
    ]);
    \$duration = microtime(true) - \$start;

    echo json_encode([
        'status'   => 'success',
        'worker'   => \$id,
        'mrn'      => \$patient->mrn,
        'duration' => \$duration,
    ]);
} catch (\Throwable \$e) {
    echo json_encode([
        'status'  => 'error',
        'worker'  => \$id,
        'message' => \$e->getMessage(),
    ]);
}
PHP;

        $tempScript = sys_get_temp_dir() . '/mrn_concurrency_worker_50_' . uniqid() . '.php';
        file_put_contents($tempScript, "<?php\n" . $workerScript);

        $processes = [];
        $pipes = [];

        for ($i = 1; $i <= $workersCount; $i++) {
            $cmd = sprintf('php %s %d %s', escapeshellarg($tempScript), $i, escapeshellarg($period));
            $proc = proc_open($cmd, [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ], $procPipes, base_path(), [
                'APP_ENV'     => 'testing',
                'DB_DATABASE' => config('database.connections.mysql.database'),
            ]);

            $processes[$i] = $proc;
            $pipes[$i] = $procPipes;
        }

        $results = [];
        $errors = [];

        foreach ($processes as $i => $proc) {
            $stdout = stream_get_contents($pipes[$i][1]);
            $stderr = stream_get_contents($pipes[$i][2]);
            fclose($pipes[$i][0]);
            fclose($pipes[$i][1]);
            fclose($pipes[$i][2]);
            proc_close($proc);

            $data = json_decode(trim($stdout), true);
            if ($data && isset($data['status']) && $data['status'] === 'success') {
                $results[] = $data;
            } else {
                $errors[] = [
                    'worker' => $i,
                    'stdout' => $stdout,
                    'stderr' => $stderr,
                ];
            }
        }

        @unlink($tempScript);

        $this->assertEmpty($errors, 'Errors occurred during 50-worker concurrent execution: ' . json_encode($errors));
        $this->assertCount($workersCount, $results);

        $mrns = array_column($results, 'mrn');
        $this->assertCount($workersCount, array_unique($mrns), 'Duplicate MRNs detected among 50 workers!');

        sort($mrns);
        $this->assertEquals('MRN-2026-11-00001', $mrns[0]);
        $this->assertEquals('MRN-2026-11-00050', $mrns[49]);

        for ($k = 1; $k <= $workersCount; $k++) {
            $expectedMrn = sprintf('MRN-2026-11-%05d', $k);
            $this->assertContains($expectedMrn, $mrns);
        }

        $finalCounter = DB::table('mrn_sequences')->where('period', $period)->value('current_sequence');
        $this->assertEquals($workersCount, $finalCounter);
    }

    /**
     * Test Month-boundary concurrency: simultaneous registrations across two distinct periods.
     */
    public function test_month_boundary_concurrency_independent_counters(): void
    {
        $periodA = '2026-09';
        $periodB = '2026-10';

        Patient::where('mrn', 'LIKE', "MRN-{$periodA}-%")->forceDelete();
        Patient::where('mrn', 'LIKE', "MRN-{$periodB}-%")->forceDelete();

        DB::table('mrn_sequences')->where('period', $periodA)->update(['current_sequence' => 50]);
        DB::table('mrn_sequences')->where('period', $periodB)->update(['current_sequence' => 0]);

        $basePath = base_path();
        $workerScript = <<<PHP
require '{$basePath}/vendor/autoload.php';
\$app = require_once '{$basePath}/bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

\$period = \$argv[1];
\$id = \$argv[2];

try {
    \$parts = explode('-', \$period);
    \Carbon\Carbon::setTestNow(\Carbon\Carbon::create((int)\$parts[0], (int)\$parts[1], 15, 12, 0, 0, 'Africa/Algiers'));
    \$ehrService = app(\App\Services\EhrService::class);

    \$patient = \$ehrService->createPatient([
        'first_name'    => "متزامن {\$period} {\$id}",
        'last_name'     => 'شهري',
        'gender'        => 'male',
        'date_of_birth' => '1990-01-01',
        'phone'         => sprintf('0551%06d', (int) \$id),
    ]);

    echo json_encode([
        'status' => 'success',
        'period' => \$period,
        'mrn'    => \$patient->mrn,
    ]);
} catch (\Throwable \$e) {
    echo json_encode(['status' => 'error', 'message' => \$e->getMessage()]);
}
PHP;

        $tempScript = sys_get_temp_dir() . '/mrn_boundary_worker_' . uniqid() . '.php';
        file_put_contents($tempScript, "<?php\n" . $workerScript);

        // Worker A targets 2026-09 (starting at 50 -> should receive 00051)
        // Worker B targets 2026-10 (starting at 0 -> should receive 00001)
        $procA = proc_open(sprintf('php %s %s 1', escapeshellarg($tempScript), escapeshellarg($periodA)), [
            0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']
        ], $pipesA, base_path(), ['APP_ENV' => 'testing', 'DB_DATABASE' => config('database.connections.mysql.database')]);

        $procB = proc_open(sprintf('php %s %s 2', escapeshellarg($tempScript), escapeshellarg($periodB)), [
            0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']
        ], $pipesB, base_path(), ['APP_ENV' => 'testing', 'DB_DATABASE' => config('database.connections.mysql.database')]);

        $outA = json_decode(stream_get_contents($pipesA[1]), true);
        $outB = json_decode(stream_get_contents($pipesB[1]), true);

        fclose($pipesA[0]); fclose($pipesA[1]); fclose($pipesA[2]); proc_close($procA);
        fclose($pipesB[0]); fclose($pipesB[1]); fclose($pipesB[2]); proc_close($procB);

        @unlink($tempScript);

        $this->assertNull($outA['message'] ?? null, 'Worker A error: ' . ($outA['message'] ?? ''));
        $this->assertNull($outB['message'] ?? null, 'Worker B error: ' . ($outB['message'] ?? ''));
        $this->assertEquals('success', $outA['status']);
        $this->assertEquals('success', $outB['status']);
        $this->assertEquals('MRN-2026-09-00051', $outA['mrn']);
        $this->assertEquals('MRN-2026-10-00001', $outB['mrn']);

        // Verify database counters
        $this->assertEquals(51, DB::table('mrn_sequences')->where('period', $periodA)->value('current_sequence'));
        $this->assertEquals(1, DB::table('mrn_sequences')->where('period', $periodB)->value('current_sequence'));
    }
}
