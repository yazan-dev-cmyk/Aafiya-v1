<?php

namespace Tests\Feature;

use App\Models\Advertisement;
use App\Models\AdvertisementPlacement;
use App\Models\AdvertisementUserClick;
use App\Models\Role;
use App\Models\SecurityAuditLog;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AdsTickerCacheService;
use Database\Seeders\BookingPackageSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdsTickerFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $doctorUser;
    protected User $patientUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            BookingPackageSeeder::class,
        ]);

        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $doctorRole = Role::where('name', 'doctor')->firstOrFail();
        $patientRole = Role::where('name', 'patient_registered')->firstOrFail();

        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);

        $this->doctorUser = User::factory()->create();
        $this->doctorUser->roles()->attach($doctorRole->id);

        $this->patientUser = User::factory()->create();
        $this->patientUser->roles()->attach($patientRole->id);
    }

    // ==========================================
    // 1. DATABASE SCHEMA & INTEGRITY TESTS
    // ==========================================

    public function test_ticker_clicks_count_defaults_to_zero_and_preserves_clicks_count(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة فحص العيون',
            'content' => 'فحوصات مجانية لضغط العين.',
            'status' => 'active',
        ]);

        $this->assertEquals(0, $ad->clicks_count);
        $this->assertEquals(0, $ad->ticker_clicks_count);
        $this->assertEquals(0, $ad->priority);
    }

    public function test_placement_unique_constraint_prevents_duplicate_pairs(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة فحص العيون',
            'content' => 'فحوصات مجانية لضغط العين.',
            'status' => 'active',
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        $this->expectException(QueryException::class);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);
    }

    public function test_soft_delete_retains_placements_and_force_delete_cascades(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة التبرع بالدم',
            'content' => 'مستشفى مصطفى باشا الجامعي.',
            'status' => 'active',
        ]);

        $placement = AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $click = AdvertisementUserClick::create([
            'advertisement_id' => $ad->id,
            'user_id' => null,
            'guest_fingerprint' => hash('sha256', '127.0.0.1|TestUA'),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'TestUA',
            'clicked_at' => now(),
        ]);

        // Soft delete
        $ad->delete();
        $this->assertSoftDeleted('advertisements', ['id' => $ad->id]);
        $this->assertDatabaseHas('advertisement_placements', ['id' => $placement->id]);
        $this->assertDatabaseHas('advertisement_user_clicks', ['id' => $click->id]);

        // Force delete
        $ad->forceDelete();
        $this->assertDatabaseMissing('advertisements', ['id' => $ad->id]);
        $this->assertDatabaseMissing('advertisement_placements', ['id' => $placement->id]);
        $this->assertDatabaseMissing('advertisement_user_clicks', ['id' => $click->id]);
    }

    // ==========================================
    // 2. LEGACY ISOLATION TESTS (ADS-DEC-01 & ADS-DEC-03)
    // ==========================================

    public function test_legacy_click_never_increments_ticker_clicks_count(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'إعلان تجريبي قديم',
            'content' => 'محتوى الإعلان.',
            'status' => 'active',
            'placement' => 'home_banner',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDays(10)->format('Y-m-d'),
        ]);

        $this->postJson("/api/v1/advertisements/{$ad->id}/click")
            ->assertStatus(200);

        $ad->refresh();
        $this->assertEquals(1, $ad->clicks_count);
        $this->assertEquals(0, $ad->ticker_clicks_count);
    }

    public function test_ticker_click_never_increments_legacy_clicks_count(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'إعلان شريط متحرك',
            'content' => 'محتوى الشريط.',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $this->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click")
            ->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        $ad->refresh();
        $this->assertEquals(0, $ad->clicks_count);
        $this->assertEquals(1, $ad->ticker_clicks_count);
    }

    // ==========================================
    // 3. AUDIENCE DEFAULTS & FAIL-CLOSED (ADS-DEC-02)
    // ==========================================

    public function test_medical_audiences_default_to_false_and_fail_closed(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'مؤتمر أمراض القلب للطب العام',
            'content' => 'دعوة للأطباء لحضور المؤتمر.',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addDay(),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        // Default: setting missing -> fail-closed (returns empty)
        $res1 = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $res1->assertStatus(200)->assertJsonCount(0, 'data');

        // Explicitly set to false -> remains empty
        SystemSetting::setValue('ads.audience.doctor.enabled', 'false', 'boolean', 'advertising');
        $res2 = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $res2->assertStatus(200)->assertJsonCount(0, 'data');

        // Explicitly set to true -> returns ad
        SystemSetting::setValue('ads.audience.doctor.enabled', 'true', 'boolean', 'advertising');
        $res3 = $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $res3->assertStatus(200)->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ad->id);
    }

    // ==========================================
    // 4. PLATFORM HEADER & 3-STATE AUTHENTICATION
    // ==========================================

    public function test_missing_or_invalid_platform_header_returns_422(): void
    {
        // Missing X-Platform
        $this->getJson('/api/v1/ads/ticker')
            ->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422);

        // Invalid X-Platform
        $this->withHeaders(['X-Platform' => 'desktop'])
            ->getJson('/api/v1/ads/ticker')
            ->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 422);
    }

    public function test_public_guest_request_works_with_valid_platform(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'إعلان عام للجمهور',
            'content' => 'خصومات الصيدليات.',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addDay(),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $this->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ad->id);
    }

    public function test_invalid_or_expired_bearer_token_returns_401_without_downgrading_to_guest(): void
    {
        // Empty Bearer token
        $this->withHeaders([
            'X-Platform' => 'web',
            'Authorization' => 'Bearer ',
        ])->getJson('/api/v1/ads/ticker')
            ->assertStatus(401);

        // Invalid / Forged Bearer token
        $this->withHeaders([
            'X-Platform' => 'web',
            'Authorization' => 'Bearer invalid_forged_token_123',
        ])->getJson('/api/v1/ads/ticker')
            ->assertStatus(401)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 401);

        // Unsupported scheme (Basic)
        $this->withHeaders([
            'X-Platform' => 'web',
            'Authorization' => 'Basic dXNlcjpwYXNz',
        ])->getJson('/api/v1/ads/ticker')
            ->assertStatus(401);
    }

    // ==========================================
    // 5. CLICK DEDUPLICATION & CONCURRENCY
    // ==========================================

    public function test_authenticated_clicks_are_deduplicated_within_one_hour_window(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة فحص السكري',
            'content' => 'فحوصات دورية.',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'patient',
        ]);

        // First click: accepted
        $res1 = $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res1->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        // Second click within 1 hour: deduplicated
        $res2 = $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res2->assertStatus(200)
            ->assertJsonPath('recorded', false)
            ->assertJsonPath('reason', 'deduplicated')
            ->assertJsonPath('clicks_count', 1);

        $this->assertEquals(1, $ad->refresh()->ticker_clicks_count);
        $this->assertDatabaseCount('advertisement_user_clicks', 1);
    }

    public function test_guest_clicks_are_deduplicated_by_ip_and_user_agent_fingerprint(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'شريط توعوي',
            'content' => 'إرشادات السلامة.',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        // First guest click
        $res1 = $this->withHeaders([
            'X-Platform' => 'web',
            'User-Agent' => 'Mozilla/5.0 (ClientA)',
        ])->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res1->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        // Same guest clicks again within 1 hour: deduplicated
        $res2 = $this->withHeaders([
            'X-Platform' => 'web',
            'User-Agent' => 'Mozilla/5.0 (ClientA)',
        ])->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res2->assertStatus(200)
            ->assertJsonPath('recorded', false)
            ->assertJsonPath('reason', 'deduplicated')
            ->assertJsonPath('clicks_count', 1);

        // Different guest (different User-Agent): accepted
        $res3 = $this->withHeaders([
            'X-Platform' => 'web',
            'User-Agent' => 'Mozilla/5.0 (ClientB)',
        ])->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res3->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 2);

        $this->assertEquals(2, $ad->refresh()->ticker_clicks_count);
    }

    // ==========================================
    // 6. SAFE DESTINATION URL VALIDATION
    // ==========================================

    public function test_destination_url_security_rules(): void
    {
        // Valid internal path
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة داخلية',
                'content' => 'وصف.',
                'target_url' => '/clinics/pediatrics?tab=reviews#top',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(201);

        // Valid external HTTPS
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة خارجية آمنة',
                'content' => 'وصف.',
                'target_url' => 'https://aafiya.site/doctors',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(201);

        // Insecure HTTP rejected
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة غير آمنة',
                'content' => 'وصف.',
                'target_url' => 'http://insecure.test',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(422)
            ->assertJsonValidationErrors('target_url');

        // Protocol-relative rejected
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة بروتوكول نسبي',
                'content' => 'وصف.',
                'target_url' => '//evil.com/phish',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(422)
            ->assertJsonValidationErrors('target_url');

        // Dangerous scheme rejected
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة جافاسكربت',
                'content' => 'وصف.',
                'target_url' => 'javascript:alert(1)',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(422)
            ->assertJsonValidationErrors('target_url');

        // Private IP literal rejected
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة IP خاص',
                'content' => 'وصف.',
                'target_url' => 'https://192.168.1.1/admin',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(422)
            ->assertJsonValidationErrors('target_url');

        // Path traversal rejected
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/ads/ticker/campaigns', [
                'title' => 'حملة تخطي مسار',
                'content' => 'وصف.',
                'target_url' => '/clinics/../admin/passwords',
                'placements' => [['destination' => 'ticker', 'audience' => 'public']],
            ])->assertStatus(422)
            ->assertJsonValidationErrors('target_url');
    }

    // ==========================================
    // 7. TIMEZONE & LIFECYCLE SEMANTICS
    // ==========================================

    public function test_ticker_lifecycle_boundaries_inclusive_start_and_exclusive_end(): void
    {
        // 1. Future ad (starts_at > now) -> NOT visible
        $futureAd = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة مستقبلية',
            'content' => 'محتوى.',
            'status' => 'active',
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addDays(2),
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $futureAd->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        // 2. Expired ad (ends_at <= now) -> NOT visible
        $expiredAd = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة منتهية',
            'content' => 'محتوى.',
            'status' => 'active',
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subMinute(),
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $expiredAd->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        // 3. Currently active ad -> visible
        $activeAd = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة جارية حالياً',
            'content' => 'محتوى.',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $activeAd->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $res = $this->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activeAd->id);
    }

    // ==========================================
    // 8. ADMIN PLACEMENT ISOLATION
    // ==========================================

    public function test_admin_metadata_update_preserves_child_placements(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'العنوان الأصلي',
            'content' => 'المحتوى الأصلي.',
            'status' => 'active',
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor_assistant',
        ]);

        // Admin updates title and priority
        $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/ads/ticker/campaigns/{$ad->id}", [
                'title' => 'العنوان المحدث والجديد',
                'priority' => 50,
            ])->assertStatus(200)
            ->assertJsonPath('data.title', 'العنوان المحدث والجديد')
            ->assertJsonPath('data.priority', 50);

        // Verify placements were untouched
        $this->assertDatabaseCount('advertisement_placements', 2);
    }

    // ==========================================
    // 9. RETENTION PRUNING COMMAND
    // ==========================================

    public function test_prune_advertisement_clicks_command_removes_old_records_and_preserves_counter(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة الأرشفة',
            'content' => 'محتوى.',
            'status' => 'active',
            'ticker_clicks_count' => 10,
        ]);

        // Click from 95 days ago (eligible for prune)
        AdvertisementUserClick::create([
            'advertisement_id' => $ad->id,
            'user_id' => null,
            'guest_fingerprint' => hash('sha256', '10.0.0.1|OldClient'),
            'ip_address' => '10.0.0.1',
            'user_agent' => 'OldClient',
            'clicked_at' => now()->subDays(95),
        ]);

        // Click from 10 days ago (retained)
        AdvertisementUserClick::create([
            'advertisement_id' => $ad->id,
            'user_id' => null,
            'guest_fingerprint' => hash('sha256', '10.0.0.2|RecentClient'),
            'ip_address' => '10.0.0.2',
            'user_agent' => 'RecentClient',
            'clicked_at' => now()->subDays(10),
        ]);

        $this->assertDatabaseCount('advertisement_user_clicks', 2);

        // Run pruning command
        $this->artisan('ads:prune-clicks --days=90')
            ->assertSuccessful();

        // 1 record deleted, 1 record retained
        $this->assertDatabaseCount('advertisement_user_clicks', 1);

        // Counter strictly preserved
        $ad->refresh();
        $this->assertEquals(10, $ad->ticker_clicks_count);
    }

    // ==========================================
    // 10. CLICK SECURITY & IDOR PREVENTION
    // ==========================================

    public function test_click_on_expired_advertisement_is_rejected(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة منتهية',
            'content' => 'محتوى منتهي.',
            'status' => 'active',
            'starts_at' => now()->subDays(5),
            'ends_at' => now()->subDay(), // Expired
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $this->withHeaders(['X-Platform' => 'mobile'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['advertisement']);

        $this->assertEquals(0, $ad->refresh()->ticker_clicks_count);
        $this->assertDatabaseCount('advertisement_user_clicks', 0);
    }

    public function test_click_by_ineligible_audience_is_rejected_preventing_idor(): void
    {
        // Advertisement placed strictly for doctors
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'مؤتمر طبي للأطباء فقط',
            'content' => 'ندوة تخصصية.',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(5),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        // Patient attempts to record a click on this doctor-targeted ad -> rejected (IDOR prevented)
        $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'mobile'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['destination']);

        // Unauthenticated guest attempts to record a click on doctor ad -> rejected
        $this->withHeaders(['X-Platform' => 'mobile'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['destination']);

        $this->assertEquals(0, $ad->refresh()->ticker_clicks_count);
        $this->assertDatabaseCount('advertisement_user_clicks', 0);
    }

    public function test_mobile_platform_header_can_fetch_and_record_clicks(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'إعلان لتطبيق الهاتف',
            'content' => 'محتوى الهاتف.',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(5),
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'patient',
        ]);

        // 1. Fetch via mobile platform
        $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'mobile'])
            ->getJson('/api/v1/ads/ticker')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ad->id);

        // 2. Click via mobile platform
        $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'mobile'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click")
            ->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        $this->assertEquals(1, $ad->refresh()->ticker_clicks_count);
        $this->assertDatabaseCount('advertisement_user_clicks', 1);
    }

    // ==========================================
    // 7. PHASE 3: AUDIENCE & SETTINGS TESTS
    // ==========================================

    public function test_patient_can_see_patient_public_and_all_audiences(): void
    {
        // 1. Patient targeted ad
        $adPatient = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة للمرضى',
            'content' => 'محتوى للمرضى.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adPatient->id,
            'destination' => 'ticker',
            'audience' => 'patient',
        ]);

        // 2. Public targeted ad
        $adPublic = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة عامة',
            'content' => 'محتوى عام.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adPublic->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        // 3. All audiences ad
        $adAll = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة للجميع',
            'content' => 'محتوى للجميع.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adAll->id,
            'destination' => 'ticker',
            'audience' => 'all',
        ]);

        // 4. Doctor targeted ad (clinical, fail-closed)
        $adDoctor = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة للأطباء',
            'content' => 'محتوى للأطباء فقط.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adDoctor->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        // Patient fetches feed
        $response = $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($adPatient->id, $ids);
        $this->assertContains($adPublic->id, $ids);
        $this->assertContains($adAll->id, $ids);
        $this->assertNotContains($adDoctor->id, $ids);
    }

    public function test_patient_can_record_click_on_public_and_patient_ads(): void
    {
        $adPublic = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'إعلان توعوي عام',
            'content' => 'نص عام.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adPublic->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $this->actingAs($this->patientUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$adPublic->id}/click")
            ->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        $this->assertEquals(1, $adPublic->refresh()->ticker_clicks_count);
    }

    public function test_admin_receives_all_ticker_ads_regardless_of_audience(): void
    {
        $audiences = ['doctor', 'patient', 'public', 'lab', 'booking_center'];
        $createdIds = [];

        foreach ($audiences as $aud) {
            $ad = Advertisement::create([
                'user_id' => $this->adminUser->id,
                'title' => "حملة {$aud}",
                'content' => "محتوى {$aud}.",
                'status' => 'active',
            ]);
            AdvertisementPlacement::create([
                'advertisement_id' => $ad->id,
                'destination' => 'ticker',
                'audience' => $aud,
            ]);
            $createdIds[] = $ad->id;
        }

        // Admin fetches feed
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        foreach ($createdIds as $cid) {
            $this->assertContains($cid, $ids);
        }
    }

    public function test_admin_can_record_click_on_any_audience_ad(): void
    {
        $adDoctor = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة للأطباء فقط',
            'content' => 'إعلان أطباء.',
            'status' => 'active',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $adDoctor->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$adDoctor->id}/click")
            ->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        $this->assertEquals(1, $adDoctor->refresh()->ticker_clicks_count);
    }

    public function test_admin_settings_endpoint_returns_audience_statuses(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/admin/ads/ticker/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'global_enabled',
                    'audiences' => [
                        'public',
                        'patient',
                        'doctor',
                        'doctor_assistant',
                        'booking_center',
                        'lab',
                        'lab_assistant',
                        'radiology',
                        'rad_assistant',
                        'all',
                    ],
                ],
            ]);

        // Clinical audiences must be false by default
        $this->assertFalse($response->json('data.audiences.doctor'));
        $this->assertFalse($response->json('data.audiences.lab'));
        $this->assertTrue($response->json('data.audiences.public'));
        $this->assertTrue($response->json('data.audiences.patient'));
    }

    public function test_admin_can_update_audience_setting_and_creates_audit_log(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->putJson('/api/v1/admin/ads/ticker/settings', [
                'key' => 'ads.audience.doctor.enabled',
                'enabled' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.key', 'ads.audience.doctor.enabled')
            ->assertJsonPath('data.enabled', true);

        $this->assertTrue(filter_var(SystemSetting::getValue('ads.audience.doctor.enabled'), FILTER_VALIDATE_BOOLEAN));

        $this->assertDatabaseHas('security_audit_logs', [
            'actor_id' => $this->adminUser->id,
            'action' => 'toggle_ad_audience',
            'resource_id' => 'ads.audience.doctor.enabled',
        ]);
    }

    public function test_non_admin_cannot_update_audience_setting(): void
    {
        $this->actingAs($this->doctorUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->putJson('/api/v1/admin/ads/ticker/settings', [
                'key' => 'ads.audience.doctor.enabled',
                'enabled' => true,
            ])
            ->assertStatus(403);
    }

    public function test_update_setting_rejects_obsolete_or_invalid_keys(): void
    {
        $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->putJson('/api/v1/admin/ads/ticker/settings', [
                'key' => 'ads.ticker.audience.doctor.enabled',
                'enabled' => true,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid setting key. Only medical audience keys and global ticker toggle are manageable.');
    }

    public function test_admin_can_toggle_campaign_status(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة للتجميد',
            'content' => 'نص الحملة.',
            'status' => 'active',
        ]);

        // Toggle to paused
        $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->patchJson("/api/v1/admin/ads/ticker/{$ad->id}/toggle-status")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'paused');

        $this->assertEquals('paused', $ad->refresh()->status);

        // Toggle back to active
        $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->patchJson("/api/v1/admin/ads/ticker/{$ad->id}/toggle-status")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'active');

        $this->assertEquals('active', $ad->refresh()->status);
    }

    public function test_admin_can_fetch_analytics(): void
    {
        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة إحصائيات',
            'content' => 'نص.',
            'status' => 'active',
            'ticker_clicks_count' => 42,
        ]);

        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'public',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/admin/ads/ticker/analytics')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_campaigns',
                    'active_campaigns',
                    'paused_campaigns',
                    'draft_campaigns',
                    'total_clicks',
                ],
            ]);
    }

    public function test_admin_assistant_identity_is_preserved_as_admin_assistant(): void
    {
        $assistantRole = Role::where('name', 'admin_assistant')->firstOrFail();
        $assistant = User::factory()->create();
        $assistant->roles()->attach($assistantRole->id);

        $service = app(\App\Services\AdsTickerService::class);
        $this->assertEquals('admin_assistant', $service->resolveAudience($assistant));
        $this->assertTrue($service->isAudienceEnabled('admin_assistant'));
    }

    public function test_admin_assistant_retrieves_all_audience_tickers_like_admin(): void
    {
        $assistantRole = Role::where('name', 'admin_assistant')->firstOrFail();
        $assistant = User::factory()->create();
        $assistant->roles()->attach($assistantRole->id);

        // Create ads for diverse audiences
        $audiences = ['doctor', 'patient', 'public', 'lab'];
        foreach ($audiences as $aud) {
            $ad = Advertisement::create([
                'user_id' => $this->adminUser->id,
                'title' => "حملة {$aud}",
                'content' => "محتوى لـ {$aud}",
                'status' => 'active',
            ]);
            AdvertisementPlacement::create([
                'advertisement_id' => $ad->id,
                'destination' => 'ticker',
                'audience' => $aud,
            ]);
        }

        $res = $this->actingAs($assistant, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->getJson('/api/v1/ads/ticker');

        $res->assertStatus(200);
        $this->assertCount(4, $res->json('data'));
    }

    public function test_admin_assistant_can_record_click_on_any_audience_ad(): void
    {
        $assistantRole = Role::where('name', 'admin_assistant')->firstOrFail();
        $assistant = User::factory()->create();
        $assistant->roles()->attach($assistantRole->id);

        $ad = Advertisement::create([
            'user_id' => $this->adminUser->id,
            'title' => 'حملة الأطباء',
            'content' => 'إعلان موجه للأطباء',
            'status' => 'active',
            'target_url' => 'https://aafiya.dz/doctor-guide',
        ]);
        AdvertisementPlacement::create([
            'advertisement_id' => $ad->id,
            'destination' => 'ticker',
            'audience' => 'doctor',
        ]);

        $res = $this->actingAs($assistant, 'sanctum')
            ->withHeaders(['X-Platform' => 'web'])
            ->postJson("/api/v1/ads/ticker/{$ad->id}/click");

        $res->assertStatus(200)
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('clicks_count', 1);

        $this->assertEquals(1, $ad->refresh()->ticker_clicks_count);
    }
}

