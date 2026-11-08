<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TickerAdvertisementResource;
use App\Models\Advertisement;
use App\Services\AdsTickerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdsTickerController extends Controller
{
    public function __construct(
        protected AdsTickerService $tickerService
    ) {}

    /**
     * Get active targeted ticker feed.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $platform = (string) $request->attributes->get('platform', 'web');
        $destination = (string) $request->query('destination', 'ticker');

        $ads = $this->tickerService->getEligibleAds(
            $request->user(),
            $platform,
            $destination
        );

        return TickerAdvertisementResource::collection($ads);
    }

    /**
     * Record a unique, deduplicated ticker click.
     */
    public function recordClick(Request $request, Advertisement $advertisement): JsonResponse
    {
        $ip = $request->ip();
        if (!$ip) {
            return response()->json([
                'status' => 'error',
                'code' => 400,
                'message' => 'Missing client network telemetry for click registration.',
            ], 400);
        }

        $destination = (string) $request->input('destination', 'ticker');

        $result = $this->tickerService->recordTickerClick(
            $advertisement,
            $request->user(),
            $ip,
            $request->userAgent(),
            $destination
        );

        return response()->json([
            'success' => true,
            'recorded' => $result['recorded'],
            'clicks_count' => $result['clicks_count'],
            'target_url' => $result['target_url'],
            'reason' => $result['reason'] ?? null,
        ]);
    }
}
