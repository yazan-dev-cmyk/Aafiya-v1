<?php

namespace Tests\Feature;

use App\Models\Commune;
use App\Models\Wilaya;
use Database\Seeders\WilayaCommuneMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WilayaCommuneSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WilayaCommuneMasterDataSeeder::class);
    }

    /**
     * Test 1 — Full Wilaya count: exactly 69 records.
     */
    public function test_full_wilaya_count_is_sixty_nine(): void
    {
        $this->assertEquals(69, Wilaya::count());
    }

    /**
     * Test 2 — Full Commune count: exactly 1,541 records.
     */
    public function test_full_commune_count_is_one_thousand_five_hundred_forty_one(): void
    {
        $this->assertEquals(1541, Commune::count());
    }

    /**
     * Test 3 — Wilaya code uniqueness and sequence 01–69.
     */
    public function test_wilaya_code_uniqueness_and_sequence(): void
    {
        $codes = Wilaya::pluck('code')->sort()->values()->all();
        $this->assertCount(69, array_unique($codes));

        $expectedCodes = array_map(fn($n) => sprintf('%02d', $n), range(1, 69));
        $this->assertEquals($expectedCodes, $codes);
    }

    /**
     * Test 4 — Commune code uniqueness.
     */
    public function test_commune_code_uniqueness(): void
    {
        $codes = Commune::pluck('code')->all();
        $this->assertCount(1541, $codes);
        $this->assertCount(1541, array_unique($codes));
    }

    /**
     * Test 5 — Referential integrity (0 orphan communes).
     */
    public function test_referential_integrity_zero_orphans(): void
    {
        $wilayaIds = Wilaya::pluck('id')->all();
        $orphanCount = Commune::whereNotIn('wilaya_id', $wilayaIds)->count();
        $this->assertSame(0, $orphanCount);
    }

    /**
     * Test 6 — Multilingual completeness.
     */
    public function test_multilingual_completeness(): void
    {
        $missingWilayaNames = Wilaya::whereNull('name_ar')
            ->orWhereNull('name_fr')
            ->orWhereNull('name_en')
            ->orWhere('name_ar', '')
            ->orWhere('name_fr', '')
            ->orWhere('name_en', '')
            ->count();
        $this->assertSame(0, $missingWilayaNames);

        $missingCommuneNames = Commune::whereNull('name_ar')
            ->orWhereNull('name_fr')
            ->orWhereNull('name_en')
            ->orWhere('name_ar', '')
            ->orWhere('name_fr', '')
            ->orWhere('name_en', '')
            ->count();
        $this->assertSame(0, $missingCommuneNames);
    }

    /**
     * Test 7 — Postal-code reconciliation (1,405 populated, 136 null).
     */
    public function test_postal_code_reconciliation(): void
    {
        $populated = Commune::whereNotNull('postal_code')->count();
        $nullCount = Commune::whereNull('postal_code')->count();

        $this->assertSame(1405, $populated);
        $this->assertSame(136, $nullCount);
    }

    /**
     * Test 8 — Idempotency: re-running seeder does not create duplicates.
     */
    public function test_seeder_is_idempotent(): void
    {
        $seeder = new WilayaCommuneMasterDataSeeder();
        $seeder->run();

        $this->assertEquals(69, Wilaya::count());
        $this->assertEquals(1541, Commune::count());
    }

    /**
     * Test 9 — Legacy protection: legacy tables and wilaya fields remain untouched.
     */
    public function test_legacy_tables_protection(): void
    {
        // Insert a sample legacy clinic with free-text wilaya
        $clinicId = (string) \Illuminate\Support\Str::uuid();
        DB::table('clinics')->insert([
            'id' => $clinicId,
            'name' => 'Clinique El Chifa',
            'address' => '12 Rue Didouche Mourad',
            'wilaya' => 'Alger',
            'phone' => '+21321000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Re-run the master data seeder
        $this->seed(WilayaCommuneMasterDataSeeder::class);

        // Verify the legacy record is 100% untouched
        $clinic = DB::table('clinics')->where('id', $clinicId)->first();
        $this->assertNotNull($clinic);
        $this->assertEquals('Alger', $clinic->wilaya);
        $this->assertEquals('Clinique El Chifa', $clinic->name);
    }

    /**
     * Test 10 — Canonical reconciliation against MD-01 JSON files.
     */
    public function test_canonical_reconciliation(): void
    {
        $wPath = base_path('../docs/aafiya_v1/master_data/wilaya_commune/wilayas.json');
        $cPath = base_path('../docs/aafiya_v1/master_data/wilaya_commune/communes.json');

        if (!file_exists($wPath)) {
            $wPath = base_path('docs/aafiya_v1/master_data/wilaya_commune/wilayas.json');
            $cPath = base_path('docs/aafiya_v1/master_data/wilaya_commune/communes.json');
        }

        $canonicalWilayas = json_decode(file_get_contents($wPath), true);

        // Verify all 69 Wilayas match canonical JSON
        foreach ($canonicalWilayas as $cw) {
            $dbW = Wilaya::where('code', $cw['code'])->first();
            $this->assertNotNull($dbW, "Wilaya code {$cw['code']} missing from database.");
            $this->assertEquals($cw['name_ar'], $dbW->name_ar);
            $this->assertEquals($cw['name_fr'], $dbW->name_fr);
            $this->assertEquals($cw['name_en'], $dbW->name_en);
            $this->assertEquals($cw['communes_count'], $dbW->communes()->count());
        }

        // Spot check transferred communes in Wilayas 59-69 (2026 reform)
        $this->assertEquals(12, Wilaya::where('code', '59')->first()->communes()->count());
        $this->assertEquals(8, Wilaya::where('code', '60')->first()->communes()->count());
        $this->assertEquals(5, Wilaya::where('code', '61')->first()->communes()->count());
        $this->assertEquals(4, Wilaya::where('code', '62')->first()->communes()->count());
        $this->assertEquals(4, Wilaya::where('code', '63')->first()->communes()->count());
        $this->assertEquals(6, Wilaya::where('code', '64')->first()->communes()->count());
        $this->assertEquals(10, Wilaya::where('code', '65')->first()->communes()->count());
        $this->assertEquals(8, Wilaya::where('code', '66')->first()->communes()->count());
        $this->assertEquals(21, Wilaya::where('code', '67')->first()->communes()->count());
        $this->assertEquals(23, Wilaya::where('code', '68')->first()->communes()->count());
        $this->assertEquals(7, Wilaya::where('code', '69')->first()->communes()->count());
    }
}
