<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommuneResource;
use App\Http\Resources\MedicalSpecialtyResource;
use App\Http\Resources\WilayaResource;
use App\Models\MedicalSpecialty;
use App\Models\Wilaya;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MasterDataController extends Controller
{
    /**
     * Cache TTL in seconds (24 hours).
     */
    protected const CACHE_TTL_SECONDS = 86400;

    /**
     * List active Wilayas with optional localized search and HTTP caching.
     *
     * GET /api/v1/master/wilayas
     */
    public function wilayas(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $cacheKey = $search !== ''
            ? 'aafiya:master:wilayas:v1:search:' . md5(mb_strtolower($search))
            : 'aafiya:master:wilayas:v1:all';

        $payload = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($search) {
            $query = Wilaya::active()
                ->orderBy('display_order', 'asc')
                ->orderBy('code', 'asc');

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', "%{$search}%")
                      ->orWhere('name_ar', 'like', "%{$search}%")
                      ->orWhere('name_fr', 'like', "%{$search}%")
                      ->orWhere('name_en', 'like', "%{$search}%");
                });
            }

            $wilayas = $query->get();

            return [
                'status' => 'success',
                'data'   => WilayaResource::collection($wilayas)->resolve(),
                'meta'   => [
                    'total' => $wilayas->count(),
                ],
            ];
        });

        return response()->json($payload);
    }

    /**
     * List active Communes belonging to a specific Wilaya code with HTTP caching.
     *
     * GET /api/v1/master/wilayas/{wilaya}/communes
     */
    public function communes(string $wilaya): JsonResponse
    {
        $formattedCode = (is_numeric($wilaya) && strlen($wilaya) <= 2)
            ? str_pad($wilaya, 2, '0', STR_PAD_LEFT)
            : $wilaya;

        $wilayaModel = Wilaya::where('code', $formattedCode)
            ->where('is_active', true)
            ->first();

        if (!$wilayaModel) {
            return response()->json([
                'status'  => 'error',
                'code'    => 404,
                'message' => 'الولاية المطلوبة غير موجودة أو غير نشطة.',
            ], 404);
        }

        $cacheKey = "aafiya:master:communes:v1:{$wilayaModel->code}";

        $payload = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($wilayaModel) {
            $communes = $wilayaModel->communes()
                ->where('is_active', true)
                ->orderBy('display_order', 'asc')
                ->orderBy('code', 'asc')
                ->get();

            // Bind the already-resolved Wilaya model to eliminate any N+1 queries
            foreach ($communes as $commune) {
                $commune->setRelation('wilaya', $wilayaModel);
            }

            return [
                'status' => 'success',
                'data'   => CommuneResource::collection($communes)->resolve(),
                'meta'   => [
                    'wilaya_code' => $wilayaModel->code,
                    'total'       => $communes->count(),
                ],
            ];
        });

        return response()->json($payload);
    }

    /**
     * List active Medical Specialties with optional localized search and HTTP caching.
     *
     * GET /api/v1/master/specialties
     */
    public function specialties(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $cacheKey = $search !== ''
            ? 'aafiya:master:specialties:v1:search:' . md5(mb_strtolower($search))
            : 'aafiya:master:specialties:v1:all';

        $payload = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($search) {
            $query = MedicalSpecialty::active()
                ->orderBy('display_order', 'asc')
                ->orderBy('code', 'asc');

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', "%{$search}%")
                      ->orWhere('name_ar', 'like', "%{$search}%")
                      ->orWhere('name_fr', 'like', "%{$search}%")
                      ->orWhere('name_en', 'like', "%{$search}%");
                });
            }

            $specialties = $query->get();

            return [
                'status' => 'success',
                'data'   => MedicalSpecialtyResource::collection($specialties)->resolve(),
                'meta'   => [
                    'total' => $specialties->count(),
                ],
            ];
        });

        return response()->json($payload);
    }
}
