<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\DiagnosticCenter;
use App\Models\Patient;
use App\Models\Wilaya;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LegacyWilayaMigrationService
{
    /**
     * In-memory cache of all active Wilayas.
     *
     * @var Collection<int, Wilaya>|null
     */
    protected ?Collection $wilayas = null;

    /**
     * Map of normalized Latin string => Wilaya model.
     *
     * @var array<string, Wilaya>
     */
    protected array $latinMap = [];

    /**
     * Map of normalized Arabic string => Wilaya model.
     *
     * @var array<string, Wilaya>
     */
    protected array $arabicMap = [];

    /**
     * Map of Wilaya code => Wilaya model.
     *
     * @var array<string, Wilaya>
     */
    protected array $codeMap = [];

    /**
     * Audited alias mapping for common official variants.
     *
     * @var array<string, string>
     */
    protected array $auditedAliases = [
        'الجزائر العاصمة' => '16',
        'alger centre'    => '16',
        'alger-centre'    => '16',
        'wilaya d\'alger' => '16',
        'algiers'         => '16',
    ];

    /**
     * Target table configuration for audit and migration.
     *
     * @var array<string, array{table: string, text_column: string, fk_column: string, model: class-string}>
     */
    public const TARGET_TABLES = [
        'clinics' => [
            'table'       => 'clinics',
            'text_column' => 'wilaya',
            'fk_column'   => 'wilaya_id',
            'model'       => Clinic::class,
        ],
        'booking_centers' => [
            'table'       => 'booking_centers',
            'text_column' => 'wilaya',
            'fk_column'   => 'wilaya_id',
            'model'       => BookingCenter::class,
        ],
        'patients' => [
            'table'       => 'patients',
            'text_column' => 'wilaya',
            'fk_column'   => 'wilaya_id',
            'model'       => Patient::class,
        ],
        'diagnostic_centers' => [
            'table'       => 'diagnostic_centers',
            'text_column' => 'wilaya',
            'fk_column'   => 'wilaya_id',
            'model'       => DiagnosticCenter::class,
        ],
        'advertisements' => [
            'table'       => 'advertisements',
            'text_column' => 'target_wilaya',
            'fk_column'   => 'target_wilaya_id',
            'model'       => Advertisement::class,
        ],
    ];

    public function __construct()
    {
        $this->initializeLookupTables();
    }

    /**
     * Initialize Wilaya lookup structures.
     */
    protected function initializeLookupTables(): void
    {
        if ($this->wilayas !== null) {
            return;
        }

        // Load active Wilayas from database if table exists
        if (!Schema::hasTable('wilayas')) {
            $this->wilayas = collect();
            return;
        }

        $this->wilayas = Wilaya::where('is_active', true)->get();

        foreach ($this->wilayas as $w) {
            $this->codeMap[$w->code] = $w;
            $this->codeMap[(string) ((int) $w->code)] = $w;

            // Latin indexing (French and English names)
            $normFr = $this->normalizeLatin($w->name_fr);
            $normEn = $this->normalizeLatin($w->name_en);
            if ($normFr !== '') {
                $this->latinMap[$normFr] = $w;
            }
            if ($normEn !== '') {
                $this->latinMap[$normEn] = $w;
            }

            // Arabic indexing
            $normAr = $this->normalizeArabic($w->name_ar);
            if ($normAr !== '') {
                $this->arabicMap[$normAr] = $w;
            }
        }
    }

    /**
     * Normalize Latin string: trim, transliterate accents, lowercase, strip non-alphanumeric.
     */
    public function normalizeLatin(string $str): string
    {
        $clean = trim($str);
        $clean = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $clean) ?: $clean;
        $clean = preg_replace('/[^a-zA-Z0-9]/', '', $clean);
        return strtolower($clean ?? '');
    }

    /**
     * Normalize Arabic string: trim, remove tatweel, diacritics, and normalize alef.
     */
    public function normalizeArabic(string $str): string
    {
        $clean = trim($str);
        // Remove tatweel and harakat (diacritics: fatha, damma, kasra, sukun, etc.)
        $clean = preg_replace('/[ـ\x{064B}-\x{065F}]/u', '', $clean);
        // Normalize alef variants
        $clean = str_replace(['أ', 'إ', 'آ'], 'ا', $clean);
        // Normalize teh marbuta to heh only for relaxed matching
        $clean = str_replace('ة', 'ه', $clean);
        // Remove punctuation/spaces
        $clean = preg_replace('/[^\x{0621}-\x{063A}\x{0641}-\x{064A}0-9]/u', '', $clean);
        return $clean ?? '';
    }

    /**
     * Resolve a legacy Wilaya string to its authoritative Wilaya model.
     * Returns null if unresolvable, ambiguous, or empty.
     */
    public function resolveWilaya(?string $legacyValue): ?Wilaya
    {
        if ($legacyValue === null) {
            return null;
        }

        $trimmed = trim($legacyValue);
        if ($trimmed === '') {
            return null;
        }

        // 1. Direct code lookup (e.g. "16", "01", 16)
        if (isset($this->codeMap[$trimmed])) {
            return $this->codeMap[$trimmed];
        }

        // 2. Direct exact attribute match
        $exact = $this->wilayas?->first(function (Wilaya $w) use ($trimmed) {
            return strcasecmp($w->name_fr, $trimmed) === 0
                || strcasecmp($w->name_en, $trimmed) === 0
                || $w->name_ar === $trimmed;
        });
        if ($exact) {
            return $exact;
        }

        // 3. Audited alias lookup
        $lowerTrimmed = mb_strtolower($trimmed);
        if (isset($this->auditedAliases[$lowerTrimmed])) {
            $aliasCode = $this->auditedAliases[$lowerTrimmed];
            if (isset($this->codeMap[$aliasCode])) {
                return $this->codeMap[$aliasCode];
            }
        }

        // 4. Normalized Latin match
        $normLatin = $this->normalizeLatin($trimmed);
        if ($normLatin !== '' && isset($this->latinMap[$normLatin])) {
            return $this->latinMap[$normLatin];
        }

        // 5. Normalized Arabic match
        $normArabic = $this->normalizeArabic($trimmed);
        if ($normArabic !== '' && isset($this->arabicMap[$normArabic])) {
            return $this->arabicMap[$normArabic];
        }

        // Unresolved / unknown value
        return null;
    }

    /**
     * Audit legacy Wilaya data across all target tables without mutating the database.
     *
     * @return array<string, mixed>
     */
    public function audit(): array
    {
        $this->initializeLookupTables();

        $tableReports = [];
        $totalRecords = 0;
        $totalMappedRecords = 0;
        $totalUnresolvedRecords = 0;
        $totalNullRecords = 0;
        $distinctDiscoveredValues = [];

        foreach (self::TARGET_TABLES as $key => $config) {
            $table = $config['table'];
            $col = $config['text_column'];
            $fkCol = $config['fk_column'];

            if (!Schema::hasTable($table) || !Schema::hasColumn($table, $col)) {
                continue;
            }

            $hasFk = Schema::hasColumn($table, $fkCol);
            $count = DB::table($table)->count();
            $nullCount = DB::table($table)->whereNull($col)->count();
            $emptyCount = DB::table($table)->whereNotNull($col)->where($col, '')->count();

            $distinctRows = DB::table($table)
                ->select($col, DB::raw('count(*) as count'))
                ->whereNotNull($col)
                ->where($col, '!=', '')
                ->groupBy($col)
                ->get();

            $mappedCount = 0;
            $unresolvedCount = 0;
            $distinctMappedCodes = [];
            $valueDetails = [];
            $unresolvedDetails = [];

            foreach ($distinctRows as $row) {
                $rawVal = $row->$col;
                $rowCount = (int) $row->count;
                $distinctDiscoveredValues[$rawVal] = ($distinctDiscoveredValues[$rawVal] ?? 0) + $rowCount;

                $resolved = $this->resolveWilaya($rawVal);

                if ($resolved) {
                    $mappedCount += $rowCount;
                    $distinctMappedCodes[$resolved->code] = $resolved->name_fr;
                    $valueDetails[] = [
                        'raw_value'     => $rawVal,
                        'count'         => $rowCount,
                        'status'        => 'MAPPED',
                        'target_code'   => $resolved->code,
                        'target_name_fr'=> $resolved->name_fr,
                        'target_name_ar'=> $resolved->name_ar,
                    ];
                } else {
                    $unresolvedCount += $rowCount;
                    $unresolvedDetails[] = [
                        'raw_value' => $rawVal,
                        'count'     => $rowCount,
                        'reason'    => 'No confident deterministic match found in authoritative 69 Wilayas',
                    ];
                    $valueDetails[] = [
                        'raw_value'     => $rawVal,
                        'count'         => $rowCount,
                        'status'        => 'UNRESOLVED',
                        'target_code'   => null,
                        'target_name_fr'=> null,
                        'target_name_ar'=> null,
                    ];
                }
            }

            $currentFkPopulated = $hasFk
                ? DB::table($table)->whereNotNull($fkCol)->count()
                : 0;

            $tableReports[$key] = [
                'table'                 => $table,
                'text_column'           => $col,
                'fk_column'             => $fkCol,
                'has_fk_column'         => $hasFk,
                'total_records'         => $count,
                'null_records'          => $nullCount,
                'empty_records'         => $emptyCount,
                'mapped_records'        => $mappedCount,
                'unresolved_records'    => $unresolvedCount,
                'current_fk_populated'  => $currentFkPopulated,
                'distinct_values_count' => count($distinctRows),
                'distinct_mapped_codes' => array_keys($distinctMappedCodes),
                'value_mappings'        => $valueDetails,
                'unresolved_details'    => $unresolvedDetails,
            ];

            $totalRecords += $count;
            $totalMappedRecords += $mappedCount;
            $totalUnresolvedRecords += $unresolvedCount;
            $totalNullRecords += ($nullCount + $emptyCount);
        }

        return [
            'tables'                    => $tableReports,
            'summary'                   => [
                'total_legacy_records'      => $totalRecords,
                'total_mapped_records'      => $totalMappedRecords,
                'total_unresolved_records'  => $totalUnresolvedRecords,
                'total_null_records'        => $totalNullRecords,
                'total_distinct_values'     => count($distinctDiscoveredValues),
            ],
            'distinct_discovered_values' => $distinctDiscoveredValues,
        ];
    }

    /**
     * Execute transactional and idempotent backfill of legacy Wilaya records.
     *
     * @return array<string, mixed>
     */
    public function migrate(): array
    {
        $this->initializeLookupTables();

        $auditBefore = $this->audit();
        $migrationResults = [];

        DB::transaction(function () use (&$migrationResults) {
            foreach (self::TARGET_TABLES as $key => $config) {
                $table = $config['table'];
                $textCol = $config['text_column'];
                $fkCol = $config['fk_column'];

                if (!Schema::hasTable($table) || !Schema::hasColumn($table, $fkCol)) {
                    continue;
                }

                $records = DB::table($table)
                    ->whereNotNull($textCol)
                    ->where($textCol, '!=', '')
                    ->get();

                $updatedCount = 0;
                $skippedCount = 0;

                foreach ($records as $record) {
                    $rawText = $record->$textCol;
                    $resolved = $this->resolveWilaya($rawText);

                    if ($resolved) {
                        DB::table($table)
                            ->where('id', $record->id)
                            ->update([$fkCol => $resolved->id]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                }

                $migrationResults[$key] = [
                    'table'        => $table,
                    'text_column'  => $textCol,
                    'fk_column'    => $fkCol,
                    'updated_rows' => $updatedCount,
                    'skipped_rows' => $skippedCount,
                ];
            }
        });

        $auditAfter = $this->audit();

        return [
            'before'   => $auditBefore['summary'],
            'results'  => $migrationResults,
            'after'    => $auditAfter['summary'],
            'tables'   => $auditAfter['tables'],
        ];
    }

    /**
     * Revert backfill by setting foreign keys to NULL without altering legacy text columns.
     *
     * @return array<string, int>
     */
    public function rollback(): array
    {
        $rollbackResults = [];

        DB::transaction(function () use (&$rollbackResults) {
            foreach (self::TARGET_TABLES as $key => $config) {
                $table = $config['table'];
                $fkCol = $config['fk_column'];

                if (Schema::hasTable($table) && Schema::hasColumn($table, $fkCol)) {
                    $cleared = DB::table($table)
                        ->whereNotNull($fkCol)
                        ->update([$fkCol => null]);
                    $rollbackResults[$key] = $cleared;
                }
            }
        });

        return $rollbackResults;
    }
}
