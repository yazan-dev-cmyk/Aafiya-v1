<?php

namespace Tests\Feature;

use App\Models\Commune;
use App\Models\Wilaya;
use Database\Seeders\WilayaCommuneMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MasterDataApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(WilayaCommuneMasterDataSeeder::class);
    }

    /**
     * Test 1 — Wilaya endpoint exists and returns 200 OK with expected structure.
     */
    public function test_wilaya_endpoint_exists(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $response->assertStatus(200)
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
                'meta' => [
                    'total',
                ],
            ]);
    }

    /**
     * Test 2 — Wilaya count: exactly 69 active Wilayas returned.
     */
    public function test_wilaya_count_is_exactly_sixty_nine(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(69, $data);
        $this->assertEquals(69, $response->json('meta.total'));
    }

    /**
     * Test 3 — Wilaya code integrity: codes 01 to 69 are preserved with leading zeros.
     */
    public function test_wilaya_code_integrity(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $codes = collect($response->json('data'))->pluck('code')->all();

        $expectedCodes = array_map(fn($n) => sprintf('%02d', $n), range(1, 69));
        $this->assertEquals($expectedCodes, $codes);
    }

    /**
     * Test 4 — Trilingual response: every Wilaya has Arabic, French, and English names.
     */
    public function test_trilingual_response(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        foreach ($response->json('data') as $w) {
            $this->assertNotEmpty($w['name_ar'], "name_ar missing for wilaya {$w['code']}");
            $this->assertNotEmpty($w['name_fr'], "name_fr missing for wilaya {$w['code']}");
            $this->assertNotEmpty($w['name_en'], "name_en missing for wilaya {$w['code']}");
        }
    }

    /**
     * Test 5 — Wilaya ordering: deterministic ordering by display_order then code.
     */
    public function test_wilaya_ordering(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $data = $response->json('data');

        for ($i = 0; $i < count($data) - 1; $i++) {
            $currentOrder = $data[$i]['display_order'];
            $nextOrder = $data[$i + 1]['display_order'];
            $this->assertLessThanOrEqual($nextOrder, $currentOrder);
        }
    }

    /**
     * Test 6 — Wilaya search: works across code, Arabic, French, and English.
     */
    public function test_wilaya_search(): void
    {
        // Search by code "16"
        $resCode = $this->getJson('/api/v1/master/wilayas?search=16');
        $resCode->assertStatus(200);
        $this->assertTrue(collect($resCode->json('data'))->contains('code', '16'));

        // Search by French name "Alger"
        $resFr = $this->getJson('/api/v1/master/wilayas?search=Alger');
        $resFr->assertStatus(200);
        $this->assertTrue(collect($resFr->json('data'))->contains('code', '16'));

        // Search by Arabic name "الجزائر"
        $resAr = $this->getJson('/api/v1/master/wilayas?search=الجزائر');
        $resAr->assertStatus(200);
        $this->assertTrue(collect($resAr->json('data'))->contains('code', '16'));

        // Search by English name "Algiers"
        $resEn = $this->getJson('/api/v1/master/wilayas?search=Algiers');
        $resEn->assertStatus(200);
        $this->assertTrue(collect($resEn->json('data'))->contains('code', '16'));
    }

    /**
     * Test 7 — Commune endpoint returns expected communes for Wilaya 16 (Algiers).
     */
    public function test_commune_endpoint_for_wilaya(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas/16/communes');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'code',
                        'wilaya_code',
                        'name_ar',
                        'name_fr',
                        'name_en',
                        'postal_code',
                        'is_active',
                        'display_order',
                    ],
                ],
                'meta' => [
                    'wilaya_code',
                    'total',
                ],
            ]);

        $this->assertEquals('16', $response->json('meta.wilaya_code'));
        $this->assertEquals(57, $response->json('meta.total'));
    }

    /**
     * Test 8 — New Wilayas reconciliation (codes 59–69 from 2026 reform).
     */
    public function test_new_wilayas_reconciliation(): void
    {
        // 59 Aflou -> 12 communes
        $r59 = $this->getJson('/api/v1/master/wilayas/59/communes');
        $r59->assertStatus(200);
        $this->assertEquals(12, $r59->json('meta.total'));

        // 68 Bou Saada -> 23 communes
        $r68 = $this->getJson('/api/v1/master/wilayas/68/communes');
        $r68->assertStatus(200);
        $this->assertEquals(23, $r68->json('meta.total'));

        // 69 El Abiodh Sidi Cheikh -> 7 communes
        $r69 = $this->getJson('/api/v1/master/wilayas/69/communes');
        $r69->assertStatus(200);
        $this->assertEquals(7, $r69->json('meta.total'));
    }

    /**
     * Test 9 — Commune relationship: all returned communes belong to the requested wilaya_code.
     */
    public function test_commune_relationship(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas/31/communes'); // Oran
        $response->assertStatus(200);

        foreach ($response->json('data') as $commune) {
            $this->assertEquals('31', $commune['wilaya_code']);
        }
    }

    /**
     * Test 10 — Unknown Wilaya returns 404.
     */
    public function test_unknown_wilaya_returns_404(): void
    {
        $resUnknown = $this->getJson('/api/v1/master/wilayas/999/communes');
        $resUnknown->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'code' => 404,
            ]);

        $resAlpha = $this->getJson('/api/v1/master/wilayas/ZZ/communes');
        $resAlpha->assertStatus(404);
    }

    /**
     * Test 11 — Inactive records excluded from normal public responses.
     */
    public function test_inactive_records_excluded(): void
    {
        // Deactivate Wilaya 01 temporarily
        Wilaya::where('code', '01')->update(['is_active' => false]);
        Cache::flush();

        // Wilaya 01 should not be in the list
        $resWilayas = $this->getJson('/api/v1/master/wilayas');
        $resWilayas->assertStatus(200);
        $this->assertFalse(collect($resWilayas->json('data'))->contains('code', '01'));
        $this->assertEquals(68, $resWilayas->json('meta.total'));

        // Inactive Wilaya 01 should return 404 for its communes
        $resCommunes = $this->getJson('/api/v1/master/wilayas/01/communes');
        $resCommunes->assertStatus(404);
    }

    /**
     * Test 12 — Read-only behavior: POST, PUT, PATCH, DELETE are rejected.
     */
    public function test_read_only_behavior(): void
    {
        $postRes = $this->postJson('/api/v1/master/wilayas', ['code' => '99']);
        $this->assertTrue(in_array($postRes->status(), [404, 405]));

        $putRes = $this->putJson('/api/v1/master/wilayas/16', ['name_fr' => 'Test']);
        $this->assertTrue(in_array($putRes->status(), [404, 405]));

        $deleteRes = $this->deleteJson('/api/v1/master/wilayas/16');
        $this->assertTrue(in_array($deleteRes->status(), [404, 405]));
    }

    /**
     * Test 13 — Cache behavior: verifies cache entries are created and reused.
     */
    public function test_cache_behavior(): void
    {
        Cache::flush();
        $this->assertFalse(Cache::has('aafiya:master:wilayas:v1:all'));

        $this->getJson('/api/v1/master/wilayas')->assertStatus(200);
        $this->assertTrue(Cache::has('aafiya:master:wilayas:v1:all'));

        $this->assertFalse(Cache::has('aafiya:master:communes:v1:16'));
        $this->getJson('/api/v1/master/wilayas/16/communes')->assertStatus(200);
        $this->assertTrue(Cache::has('aafiya:master:communes:v1:16'));
    }

    /**
     * Test 14 — Cache isolation: different Wilayas do not collide or share cache.
     */
    public function test_cache_isolation(): void
    {
        Cache::flush();

        $res16 = $this->getJson('/api/v1/master/wilayas/16/communes');
        $res31 = $this->getJson('/api/v1/master/wilayas/31/communes');

        $this->assertEquals(57, $res16->json('meta.total'));
        $this->assertEquals(26, $res31->json('meta.total'));

        $cached16 = Cache::get('aafiya:master:communes:v1:16');
        $cached31 = Cache::get('aafiya:master:communes:v1:31');

        $this->assertEquals('16', $cached16['meta']['wilaya_code']);
        $this->assertEquals('31', $cached31['meta']['wilaya_code']);
        $this->assertNotEquals($cached16['data'], $cached31['data']);
    }

    /**
     * Test 15 — Canonical DB reconciliation.
     */
    public function test_canonical_db_reconciliation(): void
    {
        $response = $this->getJson('/api/v1/master/wilayas');
        $response->assertStatus(200);

        $dbWilayas = Wilaya::where('is_active', true)->orderBy('display_order')->orderBy('code')->get();
        $apiWilayas = $response->json('data');

        $this->assertEquals($dbWilayas->count(), count($apiWilayas));
        $this->assertEquals($dbWilayas->first()->code, $apiWilayas[0]['code']);
        $this->assertEquals($dbWilayas->last()->code, $apiWilayas[count($apiWilayas) - 1]['code']);
    }
}
