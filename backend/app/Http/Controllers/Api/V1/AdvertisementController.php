<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Marketing\CreateAdvertisementRequest;
use App\Http\Requests\Marketing\UpdateAdStatusRequest;
use App\Http\Requests\Marketing\UpdateAdvertisementRequest;
use App\Http\Resources\AdvertisementResource;
use App\Models\Advertisement;
use App\Services\AdvertisementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdvertisementController extends Controller
{
    public function __construct(
        protected AdvertisementService $adService
    ) {}

    /**
     * Public list of active targeted advertisements.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $ads = $this->adService->getActiveAds($request->only([
            'placement',
            'target_role',
            'target_specialty',
            'target_wilaya',
        ]));

        // Record impressions
        foreach ($ads as $ad) {
            $this->adService->recordImpression($ad);
        }

        return AdvertisementResource::collection($ads);
    }

    /**
     * Create a new advertisement.
     */
    public function store(CreateAdvertisementRequest $request): JsonResponse
    {
        $ad = $this->adService->createAdvertisement(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم إنشاء الحملة الإعلانية بنجاح وإرسالها للمراجعة.',
            'data' => new AdvertisementResource($ad),
        ], 201);
    }

    /**
     * List current user's advertisements.
     */
    public function myAds(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = $user->hasRole('admin')
            ? Advertisement::query()
            : Advertisement::where('user_id', $user->id);

        $ads = $query->with(['clinic', 'doctor.user'])->latest()->paginate($request->input('per_page', 20));

        return AdvertisementResource::collection($ads);
    }

    /**
     * Show single advertisement.
     */
    public function show(Advertisement $advertisement): JsonResponse
    {
        return response()->json([
            'data' => new AdvertisementResource($advertisement->load(['clinic', 'doctor.user'])),
        ]);
    }

    /**
     * Update advertisement campaign.
     */
    public function update(UpdateAdvertisementRequest $request, Advertisement $advertisement): JsonResponse
    {
        $updated = $this->adService->updateAdvertisement(
            $advertisement,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تحديث الحملة الإعلانية بنجاح.',
            'data' => new AdvertisementResource($updated),
        ]);
    }

    /**
     * Delete advertisement (soft delete).
     */
    public function destroy(Request $request, Advertisement $advertisement): JsonResponse
    {
        $user = $request->user();
        if ($advertisement->user_id !== $user->id && ! $user->hasRole('admin')) {
            return response()->json(['message' => 'غير مصرح لك بحذف هذا الإعلان.'], 403);
        }

        $advertisement->delete();

        return response()->json([
            'message' => 'تم حذف الحملة الإعلانية بنجاح.',
        ]);
    }

    /**
     * Admin review: approve, reject, or pause advertisement.
     */
    public function updateStatus(UpdateAdStatusRequest $request, Advertisement $advertisement): JsonResponse
    {
        $updated = $this->adService->updateStatus(
            $advertisement,
            $request->input('status'),
            $request->user(),
            $request->input('rejection_reason')
        );

        return response()->json([
            'message' => 'تم تحديث حالة الإعلان بنجاح بواسطة المشرف العام.',
            'data' => new AdvertisementResource($updated),
        ]);
    }

    /**
     * Public endpoint to record an ad click.
     */
    public function recordClick(Advertisement $advertisement): JsonResponse
    {
        $this->adService->recordClick($advertisement);

        return response()->json([
            'message' => 'تم تسجيل النقرة الإعلانية بنجاح.',
            'target_url' => $advertisement->target_url,
        ]);
    }
}
