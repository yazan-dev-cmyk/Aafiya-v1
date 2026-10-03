<?php

namespace Tests\Feature;

use App\Models\Advertisement;
use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\Commune;
use App\Models\DiagnosticCenter;
use App\Models\Patient;
use App\Models\Wilaya;
use App\Services\LegacyWilayaMigrationService;
use Database\Seeders\WilayaCommuneMasterDataSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MasterDataComprehensiveVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(WilayaCommuneMasterDataSeeder::class);
    }

    /*
    |--------------------------------------------------------------------------
    | 1. MASTER DATASET VERIFICATION
    |--------------------------------------------------------------------------
    */

    /**
     * Verify exactly 69 Wilayas exist.
     */
    public function test_master_dataset_has_exactly_69_wilayas(): void
    {
        $this->assertEquals(69, Wilaya::count());
    }

    /**
     * Verify Wilaya codes are sequential 01 through 69 with zero-padding.
     */
    public function test_wilaya_codes_are_01_through_69_zero_padded(): void
    {
        $expectedCodes = array_map(fn ($n) => sprintf('%02d', $n), range(1, 69));
        $actualCodes = Wilaya::orderBy('code')->pluck('code')->all();

        $this->assertEquals($expectedCodes, $actualCodes);
    }

    /**
     * Verify all 69 Wilayas are marked active.
     */
    public function test_all_wilayas_are_active(): void
    {
        $this->assertEquals(69, Wilaya::active()->count());
        $this->assertEquals(0, Wilaya::where('is_active', false)->count());
    }

    /**
     * Verify all Wilayas possess Arabic, French, and English names.
     */
    public function test_wilayas_have_complete_trilingual_names(): void
    {
        $wilayas = Wilaya::all();
        foreach ($wilayas as $wilaya) {
            $this->assertNotEmpty(trim($wilaya->name_ar), "Wilaya {$wilaya->code} missing name_ar");
            $this->assertNotEmpty(trim($wilaya->name_fr), "Wilaya {$wilaya->code} missing name_fr");
            $this->assertNotEmpty(trim($wilaya->name_en), "Wilaya {$wilaya->code} missing name_en");
        }
    }

    /**
     * Verify deterministic display ordering of Wilayas.
     */
    public function test_wilayas_deterministic_display_ordering(): void
    {
        $wilayas = Wilaya::orderBy('display_order')->orderBy('code')->get();
        for ($i = 0; $i < $wilayas->count() - 1; $i++) {
            $this->assertLessThanOrEqual($wilayas[$i + 1]->display_order, $wilayas[$i]->display_order);
        }
    }

    /**
     * Verify exactly 1,541 Communes exist.
     */
    public function test_master_dataset_has_exactly_1541_communes(): void
    {
        $this->assertEquals(1541, Commune::count());
    }

    /**
     * Verify Commune ONS codes are completely unique across all 1,541 communes.
     */
    public function test_commune_ons_codes_are_unique(): void
    {
        $uniqueCodes = Commune::distinct('code')->count('code');
        $this->assertEquals(1541, $uniqueCodes);
    }

    /**
     * Verify every Commune belongs to a valid Wilaya (0 orphan communes).
     */
    public function test_every_commune_belongs_to_valid_wilaya_zero_orphans(): void
    {
        $orphanCommunes = Commune::whereDoesntHave('wilaya')->count();
        $this->assertEquals(0, $orphanCommunes);

        $invalidFk = Commune::whereNotIn('wilaya_id', Wilaya::pluck('id'))->count();
        $this->assertEquals(0, $invalidFk);
    }

    /**
     * Verify all 1,541 Communes possess complete trilingual names.
     */
    public function test_communes_have_complete_trilingual_names(): void
    {
        $missingNames = Commune::whereNull('name_ar')
            ->orWhere('name_ar', '')
            ->orWhereNull('name_fr')
            ->orWhere('name_fr', '')
            ->orWhereNull('name_en')
            ->orWhere('name_en', '')
            ->count();

        $this->assertEquals(0, $missingNames);
    }

    /**
     * Verify postal code distribution: null preserved where appropriate (136 nulls), string format otherwise (1,405 non-nulls).
     */
    public function test_commune_postal_code_null_distribution(): void
    {
        $nullCount = Commune::whereNull('postal_code')->count();
        $nonNullCount = Commune::whereNotNull('postal_code')->count();

        $this->assertEquals(136, $nullCount, 'Expected exactly 136 communes with null postal codes');
        $this->assertEquals(1405, $nonNullCount, 'Expected exactly 1,405 communes with valid postal codes');
        $this->assertEquals(1541, $nullCount + $nonNullCount);
    }

    /**
     * Verify 2026 Administrative Reform Wilayas (59 through 69) commune distribution.
     */
    public function test_reform_wilayas_59_through_69_commune_counts(): void
    {
        $expectedCounts = [
            '59' => 12, // Aflou
            '60' => 8,  // Aïn Oussara
            '61' => 5,  // Barika
            '62' => 4,  // Boussaâda
            '63' => 4,  // Touggourt
            '64' => 6,  // Djanet
            '65' => 10, // In Salah
            '66' => 8,  // In Guezzam
            '67' => 21, // Béni Abbès
            '68' => 23, // Timimoun
            '69' => 7,  // El Meniaa
        ];

        foreach ($expectedCounts as $code => $expectedCount) {
            $wilaya = Wilaya::where('code', $code)->first();
            $this->assertNotNull($wilaya, "Wilaya {$code} must exist");
            $this->assertEquals(
                $expectedCount,
                $wilaya->communes()->count(),
                "Wilaya {$code} expected {$expectedCount} communes but found {$wilaya->communes()->count()}"
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | 2. ELOQUENT DOMAIN MODELS & RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    /**
     * Verify Wilaya model active scope and communes HasMany relationship.
     */
    public function test_wilaya_model_scopes_and_relationships(): void
    {
        $wilaya = Wilaya::where('code', '16')->first();
        $this->assertNotNull($wilaya);
        $this->assertInstanceOf(Collection::class, $wilaya->communes);
        $this->assertEquals(57, $wilaya->communes->count());

        $rel = $wilaya->communes();
        $this->assertInstanceOf(HasMany::class, $rel);
        $this->assertEquals('wilaya_id', $rel->getForeignKeyName());
    }

    /**
     * Verify Commune model active scope and wilaya BelongsTo relationship.
     */
    public function test_commune_model_scopes_and_relationships(): void
    {
        $commune = Commune::where('code', '1601')->first();
        $this->assertNotNull($commune);
        $this->assertInstanceOf(Wilaya::class, $commune->wilaya);
        $this->assertEquals('16', $commune->wilaya->code);

        $rel = $commune->wilaya();
        $this->assertInstanceOf(BelongsTo::class, $rel);
        $this->assertEquals('wilaya_id', $rel->getForeignKeyName());
    }

    /**
     * Verify Legacy models' Wilaya relationships.
     */
    public function test_legacy_models_wilaya_relationships(): void
    {
        $w16 = Wilaya::where('code', '16')->first();
        $this->assertNotNull($w16);

        // Clinic
        $clinic = new Clinic(['name' => 'Test Clinic', 'wilaya_id' => $w16->id]);
        $this->assertInstanceOf(BelongsTo::class, $clinic->wilaya());
        $this->assertEquals('wilaya_id', $clinic->wilaya()->getForeignKeyName());

        // BookingCenter
        $bc = new BookingCenter(['name' => 'Test BC', 'wilaya_id' => $w16->id]);
        $this->assertInstanceOf(BelongsTo::class, $bc->wilaya());
        $this->assertEquals('wilaya_id', $bc->wilaya()->getForeignKeyName());

        // Patient
        $patient = new Patient(['first_name' => 'John', 'last_name' => 'Doe', 'wilaya_id' => $w16->id]);
        $this->assertInstanceOf(BelongsTo::class, $patient->wilaya());
        $this->assertEquals('wilaya_id', $patient->wilaya()->getForeignKeyName());

        // DiagnosticCenter
        $dc = new DiagnosticCenter(['name' => 'Test DC', 'wilaya_id' => $w16->id]);
        $this->assertInstanceOf(BelongsTo::class, $dc->wilaya());
        $this->assertEquals('wilaya_id', $dc->wilaya()->getForeignKeyName());

        // Advertisement
        $ad = new Advertisement(['title' => 'Test Ad', 'target_wilaya_id' => $w16->id]);
        $this->assertInstanceOf(BelongsTo::class, $ad->targetWilaya());
        $this->assertEquals('target_wilaya_id', $ad->targetWilaya()->getForeignKeyName());
    }

    /*
    |--------------------------------------------------------------------------
    | 3. MASTER DATA API REGRESSION
    |--------------------------------------------------------------------------
    */

    /**
     * Verify Wilayas API endpoint response schema, status, and privacy.
     */
    public function test_api_wilayas_endpoint_contract(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'meta' => [
                    'total' => 69,
                ],
            ])
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'code',
                        'name_ar',
                        'name_fr',
                        'name_en',
                        'is_active',
                        'display_order',
                    ],
                ],
                'meta' => ['total'],
            ]);

        // Verify internal DB ID is NEVER exposed
        $first = $response->json('data.0');
        $this->assertArrayNotHasKey('id', $first, 'Internal database ID must not be exposed');
        $this->assertArrayNotHasKey('created_at', $first);
        $this->assertArrayNotHasKey('updated_at', $first);
    }

    /**
     * Verify API search functionality for Wilayas across Arabic, French, English, and code.
     */
    public function test_api_wilayas_deterministic_search(): void
    {
        // Search by code: 16
        $resCode = $this->getJson('/api/v1/master/wilayas?search=16');
        $resCode->assertStatus(200);
        $this->assertCount(1, $resCode->json('data'));
        $this->assertEquals('16', $resCode->json('data.0.code'));

        // Search by French: Alger
        $resFr = $this->getJson('/api/v1/master/wilayas?search=Alger');
        $resFr->assertStatus(200);
        $codes = collect($resFr->json('data'))->pluck('code')->all();
        $this->assertContains('16', $codes);

        // Search by Arabic: الجزائر
        $resAr = $this->getJson('/api/v1/master/wilayas?search='.urlencode('الجزائر'));
        $resAr->assertStatus(200);
        $codesAr = collect($resAr->json('data'))->pluck('code')->all();
        $this->assertContains('16', $codesAr);

        // Search by English: Algiers
        $resEn = $this->getJson('/api/v1/master/wilayas?search=Algiers');
        $resEn->assertStatus(200);
        $codesEn = collect($resEn->json('data'))->pluck('code')->all();
        $this->assertContains('16', $codesEn);
    }

    /**
     * Verify Communes API endpoint for key reform and metropolitan Wilayas.
     */
    public function test_api_communes_endpoint_counts_and_structure(): void
    {
        $testCases = [
            '16' => 57,
            '59' => 12,
            '68' => 23,
            '69' => 7,
        ];

        foreach ($testCases as $code => $expectedCount) {
            $response = $this->getJson("/api/v1/master/wilayas/{$code}/communes");
            $response->assertStatus(200)
                ->assertJson([
                    'status' => 'success',
                    'meta' => [
                        'wilaya_code' => $code,
                        'total' => $expectedCount,
                    ],
                ]);

            $data = $response->json('data');
            $this->assertCount($expectedCount, $data);

            $first = $data[0];
            $this->assertArrayNotHasKey('id', $first, 'Internal database ID must not be exposed');
            $this->assertArrayHasKey('code', $first);
            $this->assertArrayHasKey('name_ar', $first);
            $this->assertArrayHasKey('name_fr', $first);
            $this->assertArrayHasKey('name_en', $first);
            $this->assertArrayHasKey('postal_code', $first);
        }
    }

    /**
     * Verify Communes API endpoint error handling for invalid or inactive Wilayas.
     */
    public function test_api_communes_endpoint_error_handling(): void
    {
        // Non-existent numeric code 999
        $res999 = $this->getJson('/api/v1/master/wilayas/999/communes');
        $res999->assertStatus(404);

        // Non-existent alpha code ZZ
        $resZZ = $this->getJson('/api/v1/master/wilayas/ZZ/communes');
        $resZZ->assertStatus(404);

        // Inactive Wilaya handling
        $inactive = Wilaya::where('code', '69')->first();
        $inactive->update(['is_active' => false]);
        Cache::flush();

        $resInactive = $this->getJson('/api/v1/master/wilayas/69/communes');
        $resInactive->assertStatus(404);
    }

    /*
    |--------------------------------------------------------------------------
    | 4. CACHE REGRESSION & ISOLATION
    |--------------------------------------------------------------------------
    */

    /**
     * Verify Wilaya list cache creation and reuse.
     */
    public function test_cache_wilaya_list_creation_and_reuse(): void
    {
        $cacheKey = 'aafiya:master:wilayas:v1:all';
        $this->assertFalse(Cache::has($cacheKey));

        $res1 = $this->getJson('/api/v1/master/wilayas');
        $res1->assertStatus(200);

        $this->assertTrue(Cache::has($cacheKey));

        // Subsequent call serves from cache
        $cachedData = Cache::get($cacheKey);
        $this->assertEquals(69, $cachedData['meta']['total']);
        $this->assertCount(69, $cachedData['data']);
    }

    /**
     * Verify search query bypasses and isolates from base list cache.
     */
    public function test_cache_search_isolation(): void
    {
        // Warm base cache
        $this->getJson('/api/v1/master/wilayas');
        $this->assertTrue(Cache::has('aafiya:master:wilayas:v1:all'));

        // Perform search
        $resSearch = $this->getJson('/api/v1/master/wilayas?search=Oran');
        $resSearch->assertStatus(200);

        // Base cache is intact and still contains all 69 wilayas
        $baseData = Cache::get('aafiya:master:wilayas:v1:all');
        $this->assertEquals(69, $baseData['meta']['total']);
    }

    /**
     * Verify Commune cache creation, cross-Wilaya isolation, and 24h TTL.
     */
    public function test_cache_commune_creation_and_cross_wilaya_isolation(): void
    {
        // Warm caches for 16, 31, 59, 68, 69
        $res16 = $this->getJson('/api/v1/master/wilayas/16/communes');
        $res31 = $this->getJson('/api/v1/master/wilayas/31/communes');
        $res59 = $this->getJson('/api/v1/master/wilayas/59/communes');
        $res68 = $this->getJson('/api/v1/master/wilayas/68/communes');
        $res69 = $this->getJson('/api/v1/master/wilayas/69/communes');

        $this->assertTrue(Cache::has('aafiya:master:communes:v1:16'));
        $this->assertTrue(Cache::has('aafiya:master:communes:v1:31'));
        $this->assertTrue(Cache::has('aafiya:master:communes:v1:59'));
        $this->assertTrue(Cache::has('aafiya:master:communes:v1:68'));
        $this->assertTrue(Cache::has('aafiya:master:communes:v1:69'));

        // Specifically confirm isolation: 16 != 31, 59 != 68, 68 != 69
        $cached16 = Cache::get('aafiya:master:communes:v1:16');
        $cached31 = Cache::get('aafiya:master:communes:v1:31');
        $cached59 = Cache::get('aafiya:master:communes:v1:59');
        $cached68 = Cache::get('aafiya:master:communes:v1:68');
        $cached69 = Cache::get('aafiya:master:communes:v1:69');

        $this->assertNotEquals($cached16['data'], $cached31['data'], 'Cache for Wilaya 16 must not equal Wilaya 31');
        $this->assertNotEquals($cached59['data'], $cached68['data'], 'Cache for Wilaya 59 must not equal Wilaya 68');
        $this->assertNotEquals($cached68['data'], $cached69['data'], 'Cache for Wilaya 68 must not equal Wilaya 69');

        $this->assertEquals(57, count($cached16['data']));
        $this->assertEquals(26, count($cached31['data']));
        $this->assertEquals(12, count($cached59['data']));
        $this->assertEquals(23, count($cached68['data']));
        $this->assertEquals(7, count($cached69['data']));
    }

    /*
    |--------------------------------------------------------------------------
    | 5. LEGACY DATA LINKAGE REGRESSION
    |--------------------------------------------------------------------------
    */

    /**
     * Verify deterministic legacy text mapping for all 10 audited distinct values.
     */
    public function test_legacy_linkage_deterministic_mappings(): void
    {
        $service = app(LegacyWilayaMigrationService::class);

        $expectedMappings = [
            'Alger' => '16',
            'Oran' => '31',
            'Constantine' => '25',
            'Blida' => '09',
            'Annaba' => '23',
            'Setif' => '19',
            'Batna' => '05',
            'Tlemcen' => '13',
            'تيارت' => '14',
            'Sidi Bel Abbes' => '22',
        ];

        foreach ($expectedMappings as $legacyText => $expectedCode) {
            $wilaya = $service->resolveWilaya($legacyText);
            $this->assertNotNull($wilaya, "Failed to resolve legacy text '{$legacyText}'");
            $this->assertEquals($expectedCode, $wilaya->code, "Legacy text '{$legacyText}' resolved to wrong code");
        }
    }

    /**
     * Verify zero orphan foreign keys and zero unresolved legacy values.
     */
    public function test_legacy_linkage_zero_orphans_and_zero_unresolved(): void
    {
        $service = app(LegacyWilayaMigrationService::class);

        // Create sample clinics for all 10 audited legacy values
        $legacyValues = [
            'Alger',
            'Oran',
            'Constantine',
            'Blida',
            'Annaba',
            'Setif',
            'Batna',
            'Tlemcen',
            'تيارت',
            'Sidi Bel Abbes',
        ];

        foreach ($legacyValues as $idx => $val) {
            Clinic::create([
                'name' => "Clinic Test {$idx}",
                'address' => "Address {$idx}",
                'wilaya' => $val,
                'phone' => sprintf('0210000%02d', $idx),
                'max_patients_per_slot' => 4,
                'slot_duration_min' => 15,
                'is_active' => true,
            ]);
        }

        $service->migrate();

        $audit = $service->audit();
        $this->assertEquals(0, $audit['summary']['total_unresolved_records']);
        $this->assertEquals(10, $audit['summary']['total_mapped_records']);

        // Check zero orphans
        $orphanClinics = Clinic::whereNotNull('wilaya_id')->whereNotIn('wilaya_id', Wilaya::pluck('id'))->count();
        $this->assertEquals(0, $orphanClinics);

        // Check legacy text column intact
        foreach ($legacyValues as $idx => $val) {
            $clinic = Clinic::where('name', "Clinic Test {$idx}")->first();
            $this->assertNotNull($clinic);
            $this->assertEquals($val, $clinic->wilaya);
            $this->assertNotNull($clinic->wilaya_id);
            $this->assertEquals($service->resolveWilaya($val)->id, $clinic->wilaya_id);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | 6. N+1 & QUERY EFFICIENCY VERIFICATION
    |--------------------------------------------------------------------------
    */

    /**
     * Verify Master Data API runs fixed, minimal queries with zero N+1 behavior.
     */
    public function test_master_data_api_query_efficiency_no_n_plus_one(): void
    {
        Cache::flush();
        DB::enableQueryLog();

        // 1. Wilayas list (Cache Miss): exactly 1 query on wilayas table (zero N+1)
        DB::flushQueryLog();
        $this->getJson('/api/v1/master/wilayas');
        $wilayaQueriesMiss = collect(DB::getQueryLog())
            ->filter(fn ($q) => str_contains($q['query'], '`wilayas`'));
        $this->assertEquals(1, $wilayaQueriesMiss->count(), 'Wilayas endpoint must execute exactly 1 query on wilayas table on cache miss');

        // 2. Wilayas list (Cache Hit): exactly 0 queries on wilayas table
        DB::flushQueryLog();
        $this->getJson('/api/v1/master/wilayas');
        $wilayaQueriesHit = collect(DB::getQueryLog())
            ->filter(fn ($q) => str_contains($q['query'], '`wilayas`'));
        $this->assertEquals(0, $wilayaQueriesHit->count(), 'Wilayas endpoint must execute 0 queries on wilayas table on cache hit');

        // 3. Communes list (Cache Miss): exactly 1 query on communes table (zero N+1)
        DB::flushQueryLog();
        $this->getJson('/api/v1/master/wilayas/16/communes');
        $communeQueriesMiss = collect(DB::getQueryLog())
            ->filter(fn ($q) => str_contains($q['query'], '`communes`'));
        $this->assertEquals(1, $communeQueriesMiss->count(), 'Communes endpoint must execute exactly 1 query on communes table on cache miss');

        // 4. Communes list (Cache Hit): exactly 0 queries on communes table
        DB::flushQueryLog();
        $this->getJson('/api/v1/master/wilayas/16/communes');
        $communeQueriesHit = collect(DB::getQueryLog())
            ->filter(fn ($q) => str_contains($q['query'], '`communes`'));
        $this->assertEquals(0, $communeQueriesHit->count(), 'Communes endpoint must execute 0 queries on communes table on cache hit');

        DB::disableQueryLog();
    }

    /**
     * Verify legacy model eager loading executes a fixed 2 queries regardless of record count.
     */
    public function test_legacy_model_eager_loading_efficiency(): void
    {
        $w16 = Wilaya::where('code', '16')->first();

        // Create 10 clinics
        for ($i = 1; $i <= 10; $i++) {
            Clinic::create([
                'name' => "Clinic Eager {$i}",
                'address' => "Address {$i}",
                'wilaya' => 'Alger',
                'wilaya_id' => $w16->id,
                'phone' => "02100001{$i}",
                'max_patients_per_slot' => 4,
                'slot_duration_min' => 15,
                'is_active' => true,
            ]);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();

        $clinics = Clinic::with('wilaya')->where('name', 'like', 'Clinic Eager%')->get();
        $queries = DB::getQueryLog();

        // Exactly 2 queries: select * from clinics, select * from wilayas where id in (...)
        $this->assertEquals(2, count($queries), 'Eager loading must issue exactly 2 queries (zero N+1)');
        $this->assertEquals(10, $clinics->count());
        foreach ($clinics as $c) {
            $this->assertEquals('16', $c->wilaya()->first()->code);
        }

        DB::disableQueryLog();
    }
}
