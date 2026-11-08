<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Marketing\Ticker\CreateTickerCampaignRequest;
use App\Http\Requests\Marketing\Ticker\ManagePlacementRequest;
use App\Http\Requests\Marketing\Ticker\UpdateTickerCampaignRequest;
use App\Http\Resources\TickerAdvertisementResource;
use App\Models\Advertisement;
use App\Models\AdvertisementPlacement;
use App\Models\SecurityAuditLog;
use App\Models\SystemSetting;
use App\Services\AdsTickerCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAdsTickerController extends Controller
{
    /**
     * List all ticker advertising campaigns with pagination and filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $query = Advertisement::query()
            ->with('placements');

        if ($status = $request->query('status')) {
            if ($status !== 'ALL') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%")
                  ->orWhere('target_url', 'like', "%{$search}%");
            });
        }

        $paginated = $query
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => TickerAdvertisementResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Create a new ticker campaign with child placements.
     */
    public function store(CreateTickerCampaignRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $ad = DB::transaction(function () use ($validated, $user) {
            $advertisement = Advertisement::create([
                'user_id' => $user->id,
                'clinic_id' => $validated['clinic_id'] ?? null,
                'doctor_id' => $validated['doctor_id'] ?? null,
                'title' => $validated['title'],
                'content' => $validated['content'],
                'banner_image_url' => $validated['banner_image_url'] ?? null,
                'target_url' => $validated['target_url'] ?? null,
                'priority' => $validated['priority'] ?? 0,
                'status' => $validated['status'] ?? 'active',
                'starts_at' => $validated['starts_at'] ?? null,
                'ends_at' => $validated['ends_at'] ?? null,
                'placement' => 'ticker', // default legacy fallback tag
            ]);

            foreach ($validated['placements'] as $placementData) {
                AdvertisementPlacement::firstOrCreate([
                    'advertisement_id' => $advertisement->id,
                    'destination' => $placementData['destination'],
                    'audience' => $placementData['audience'],
                ]);
            }

            return $advertisement->load('placements');
        });

        AdsTickerCacheService::invalidate();

        return response()->json([
            'message' => 'تم إنشاء حملة الشريط الإعلاني بنجاح.',
            'data' => new TickerAdvertisementResource($ad),
        ], 201);
    }

    /**
     * Display a specific ticker advertising campaign.
     */
    public function show(Advertisement $advertisement): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => new TickerAdvertisementResource($advertisement->load('placements')),
        ]);
    }

    /**
     * Update parent campaign metadata without touching child placements.
     */
    public function update(UpdateTickerCampaignRequest $request, Advertisement $advertisement): JsonResponse
    {
        $advertisement->update($request->validated());

        AdsTickerCacheService::invalidate();

        return response()->json([
            'message' => 'تم تحديث بيانات الحملة الإعلانية بنجاح.',
            'data' => new TickerAdvertisementResource($advertisement->load('placements')),
        ]);
    }

    /**
     * List placement pairs for an advertisement.
     */
    public function listPlacements(Advertisement $advertisement): JsonResponse
    {
        return response()->json([
            'data' => $advertisement->placements()->get(),
        ]);
    }

    /**
     * Add a single destination/audience placement pair to an advertisement.
     */
    public function addPlacement(ManagePlacementRequest $request, Advertisement $advertisement): JsonResponse
    {
        $validated = $request->validated();

        $existing = AdvertisementPlacement::where('advertisement_id', $advertisement->id)
            ->where('destination', $validated['destination'])
            ->where('audience', $validated['audience'])
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => 'This placement pair is already attached to the advertisement.',
            ], 422);
        }

        $placement = AdvertisementPlacement::create([
            'advertisement_id' => $advertisement->id,
            'destination' => $validated['destination'],
            'audience' => $validated['audience'],
        ]);

        AdsTickerCacheService::invalidate();

        return response()->json([
            'message' => 'تمت إضافة الموضع بنجاح.',
            'data' => $placement,
        ], 201);
    }

    /**
     * Remove a single destination/audience placement pair.
     */
    public function removePlacement(Advertisement $advertisement, AdvertisementPlacement $placement): JsonResponse
    {
        if ($placement->advertisement_id !== $advertisement->id) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'Placement does not belong to this advertisement.',
            ], 403);
        }

        $placement->delete();

        AdsTickerCacheService::invalidate();

        return response()->json([
            'message' => 'تم حذف الموضع بنجاح.',
        ]);
    }

    /**
     * Soft delete an advertising campaign.
     */
    public function destroy(Advertisement $advertisement): JsonResponse
    {
        $advertisement->delete();
        AdsTickerCacheService::invalidate();

        return response()->json([
            'message' => 'تم حذف الحملة الإعلانية بنجاح.',
        ]);
    }

    /**
     * Toggle campaign active/paused status.
     */
    public function toggleStatus(Advertisement $advertisement): JsonResponse
    {
        $newStatus = ($advertisement->status === 'active') ? 'paused' : 'active';
        $advertisement->update(['status' => $newStatus]);
        AdsTickerCacheService::invalidate();

        return response()->json([
            'status' => 'success',
            'message' => 'تم تغيير حالة الحملة الإعلانية بنجاح.',
            'data' => new TickerAdvertisementResource($advertisement->load('placements')),
        ]);
    }

    /**
     * Return operational analytics summary for ticker advertising.
     */
    public function analytics(): JsonResponse
    {
        $total = Advertisement::where('placement', 'ticker')->count();
        $active = Advertisement::where('placement', 'ticker')->where('status', 'active')->count();
        $paused = Advertisement::where('placement', 'ticker')->where('status', 'paused')->count();
        $draft = Advertisement::where('placement', 'ticker')->where('status', 'draft')->count();
        $totalClicks = (int) Advertisement::where('placement', 'ticker')->sum('ticker_clicks_count');

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_campaigns' => $total,
                'active_campaigns' => $active,
                'paused_campaigns' => $paused,
                'draft_campaigns' => $draft,
                'total_clicks' => $totalClicks,
            ],
        ]);
    }

    /**
     * Get feature flags status for all audiences and global ticker toggle.
     */
    public function getSettings(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'global_enabled' => (bool) SystemSetting::getValue('ads.ticker.enabled', true),
                'audiences' => [
                    'doctor' => (bool) SystemSetting::getValue('ads.audience.doctor.enabled', false),
                    'doctor_assistant' => (bool) SystemSetting::getValue('ads.audience.doctor_assistant.enabled', false),
                    'booking_center' => (bool) SystemSetting::getValue('ads.audience.booking_center.enabled', false),
                    'lab' => (bool) SystemSetting::getValue('ads.audience.lab.enabled', false),
                    'lab_assistant' => (bool) SystemSetting::getValue('ads.audience.lab_assistant.enabled', false),
                    'radiology' => (bool) SystemSetting::getValue('ads.audience.radiology.enabled', false),
                    'rad_assistant' => (bool) SystemSetting::getValue('ads.audience.rad_assistant.enabled', false),
                    'public' => true,
                    'patient' => true,
                    'all' => true,
                ],
            ],
        ]);
    }

    /**
     * Update audience feature flag setting (Admin only, logged to SecurityAuditLog).
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json([
                'status' => 'error',
                'code' => 403,
                'message' => 'Unauthorized: Only platform administrators can change advertising audience feature flags.',
            ], 403);
        }

        $validated = $request->validate([
            'key' => ['required', 'string'],
            'enabled' => ['required', 'boolean'],
        ]);

        $allowedKeys = [
            'ads.ticker.enabled',
            'ads.audience.doctor.enabled',
            'ads.audience.doctor_assistant.enabled',
            'ads.audience.booking_center.enabled',
            'ads.audience.lab.enabled',
            'ads.audience.lab_assistant.enabled',
            'ads.audience.radiology.enabled',
            'ads.audience.rad_assistant.enabled',
        ];

        if (!in_array($validated['key'], $allowedKeys, true)) {
            return response()->json([
                'status' => 'error',
                'code' => 422,
                'message' => 'Invalid setting key. Only medical audience keys and global ticker toggle are manageable.',
            ], 422);
        }

        $oldValue = (bool) SystemSetting::getValue($validated['key'], false);

        SystemSetting::setValue(
            $validated['key'],
            $validated['enabled'] ? '1' : '0',
            'boolean',
            'advertising'
        );

        SecurityAuditLog::create([
            'actor_id' => $user->id,
            'actor_role' => 'admin',
            'event_category' => 'system_configuration',
            'action' => 'toggle_ad_audience',
            'resource_type' => 'system_setting',
            'resource_id' => $validated['key'],
            'access_reason' => "Admin {$user->name} toggled {$validated['key']} to " . ($validated['enabled'] ? 'true' : 'false'),
            'ip_address' => $request->ip() ?: '127.0.0.1',
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'details' => [
                'key' => $validated['key'],
                'previous_value' => $oldValue,
                'new_value' => $validated['enabled'],
            ],
        ]);

        AdsTickerCacheService::invalidate();

        return response()->json([
            'status' => 'success',
            'message' => 'تم تحديث إعدادات الجمهور بنجاح.',
            'data' => [
                'key' => $validated['key'],
                'enabled' => (bool) $validated['enabled'],
            ],
        ]);
    }
}
