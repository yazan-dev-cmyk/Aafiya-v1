<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MedicalSpecialtyResource;
use App\Http\Resources\WilayaResource;
use App\Models\MedicalSpecialty;
use App\Models\User;
use App\Models\Wilaya;
use App\Services\LegacySpecialtyResolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AdminMasterDataController extends Controller
{
    /**
     * Authorize Master Data mutation.
     * Allowed: 'admin' or 'admin_assistant' with 'platform.manage_master_data'.
     */
    protected function authorizeAdmin(?User $user): void
    {
        if (! $user) {
            abort(401, 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.');
        }

        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.manage_master_data')) {
            return;
        }

        abort(403, 'غير مصرح لك بإدارة البيانات المرجعية. هذه العملية مقتصرة على المشرف العام أو المساعد المفوض.');
    }

    /**
     * Clear public master data caches.
     */
    protected function clearSpecialtyCache(): void
    {
        Cache::forget('aafiya:master:specialties:v1:all');
        try {
            app(LegacySpecialtyResolutionService::class)->clearCache();
        } catch (\Throwable $e) {
            // Service instance cache flush fallback
        }
    }

    protected function clearWilayaCache(): void
    {
        Cache::forget('aafiya:master:wilayas:v1:all');
    }

    // ==========================================
    // MEDICAL SPECIALTIES
    // ==========================================

    /**
     * List all specialties for Admin (includes active and inactive).
     *
     * GET /api/v1/admin/master/specialties
     */
    public function indexSpecialties(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $query = MedicalSpecialty::query();

        // Search
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('name_fr', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Status Filter
        $status = $request->query('status', 'all');
        if ($status === 'active' || $status === '1') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive' || $status === '0') {
            $query->where('is_active', false);
        }

        // Sorting
        $sortBy = $request->query('sort_by', 'display_order');
        $sortDir = strtolower($request->query('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['display_order', 'code', 'name_ar', 'name_fr', 'name_en', 'is_active', 'created_at'];
        if (in_array($sortBy, $allowedSort, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('display_order', 'asc')->orderBy('code', 'asc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $perPage = max(1, min($perPage, 100));

        $specialties = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data'   => MedicalSpecialtyResource::collection($specialties->items()),
            'meta'   => [
                'current_page' => $specialties->currentPage(),
                'last_page'    => $specialties->lastPage(),
                'per_page'     => $specialties->perPage(),
                'total'        => $specialties->total(),
            ],
        ]);
    }

    /**
     * Show single specialty.
     *
     * GET /api/v1/admin/master/specialties/{id}
     */
    public function showSpecialty(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $specialty = MedicalSpecialty::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new MedicalSpecialtyResource($specialty),
        ]);
    }

    /**
     * Create a new Medical Specialty.
     *
     * POST /api/v1/admin/master/specialties
     */
    public function storeSpecialty(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $validated = $request->validate([
            'code'          => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', 'unique:medical_specialties,code'],
            'name_ar'       => ['required', 'string', 'max:255'],
            'name_fr'       => ['required', 'string', 'max:255'],
            'name_en'       => ['required', 'string', 'max:255'],
            'is_active'     => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $specialty = MedicalSpecialty::create([
            'code'          => strtoupper($validated['code']),
            'name_ar'       => $validated['name_ar'],
            'name_fr'       => $validated['name_fr'],
            'name_en'       => $validated['name_en'],
            'is_active'     => $validated['is_active'] ?? true,
            'display_order' => $validated['display_order'] ?? 0,
        ]);

        $this->clearSpecialtyCache();

        Log::info('Admin created medical specialty', [
            'actor_id'     => $user->id,
            'specialty_id' => $specialty->id,
            'code'         => $specialty->code,
            'ip'           => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'تم إنشاء التخصص الطبي بنجاح.',
            'data'    => new MedicalSpecialtyResource($specialty),
        ], 201);
    }

    /**
     * Edit an existing Medical Specialty.
     *
     * PUT /api/v1/admin/master/specialties/{id}
     */
    public function updateSpecialty(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $specialty = MedicalSpecialty::findOrFail($id);

        $validated = $request->validate([
            'code'          => ['sometimes', 'required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('medical_specialties', 'code')->ignore($specialty->id)],
            'name_ar'       => ['required', 'string', 'max:255'],
            'name_fr'       => ['required', 'string', 'max:255'],
            'name_en'       => ['required', 'string', 'max:255'],
            'is_active'     => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['code'])) {
            $specialty->code = strtoupper($validated['code']);
        }
        $specialty->name_ar = $validated['name_ar'];
        $specialty->name_fr = $validated['name_fr'];
        $specialty->name_en = $validated['name_en'];
        if (array_key_exists('is_active', $validated)) {
            $specialty->is_active = (bool) $validated['is_active'];
        }
        if (array_key_exists('display_order', $validated)) {
            $specialty->display_order = (int) $validated['display_order'];
        }
        $specialty->save();

        $this->clearSpecialtyCache();

        Log::info('Admin updated medical specialty', [
            'actor_id'     => $user->id,
            'specialty_id' => $specialty->id,
            'code'         => $specialty->code,
            'ip'           => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'تم تحديث التخصص الطبي بنجاح.',
            'data'    => new MedicalSpecialtyResource($specialty),
        ]);
    }

    /**
     * Toggle or set active status of a Medical Specialty.
     *
     * PUT /api/v1/admin/master/specialties/{id}/status
     */
    public function toggleSpecialtyStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $specialty = MedicalSpecialty::findOrFail($id);

        $newStatus = $request->has('is_active')
            ? $request->boolean('is_active')
            : ! $specialty->is_active;

        $specialty->is_active = $newStatus;
        $specialty->save();

        $this->clearSpecialtyCache();

        Log::info('Admin toggled medical specialty status', [
            'actor_id'     => $user->id,
            'specialty_id' => $specialty->id,
            'is_active'    => $newStatus,
            'ip'           => $request->ip(),
        ]);

        $message = $newStatus
            ? 'تم تفعيل التخصص الطبي بنجاح.'
            : 'تم إلغاء تفعيل التخصص الطبي بنجاح.';

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => new MedicalSpecialtyResource($specialty),
        ]);
    }

    /**
     * Safe deletion of a Medical Specialty (blocked if doctors reference it).
     *
     * DELETE /api/v1/admin/master/specialties/{id}
     */
    public function deleteSpecialty(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $specialty = MedicalSpecialty::findOrFail($id);

        // Verification of existing doctor references
        $referencedCount = $specialty->doctors()->count();
        if ($referencedCount > 0) {
            return response()->json([
                'status'  => 'error',
                'code'    => 422,
                'message' => "لا يمكن حذف التخصص الطبي '{$specialty->code}' لأنه مرتبط بـ {$referencedCount} طبيب(أطباء) مسجل(ين). يمكنك إلغاء تفعيله بدلاً من حذفه.",
            ], 422);
        }

        $code = $specialty->code;
        $specialtyId = $specialty->id;
        $specialty->delete();

        $this->clearSpecialtyCache();

        Log::info('Admin deleted unreferenced medical specialty', [
            'actor_id'     => $user->id,
            'specialty_id' => $specialtyId,
            'code'         => $code,
            'ip'           => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "تم حذف التخصص الطبي ({$code}) بنجاح.",
        ]);
    }

    // ==========================================
    // WILAYAS
    // ==========================================

    /**
     * List all Wilayas for Admin (includes active and inactive).
     *
     * GET /api/v1/admin/master/wilayas
     */
    public function indexWilayas(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $query = Wilaya::query();

        // Search
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('name_fr', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Status Filter
        $status = $request->query('status', 'all');
        if ($status === 'active' || $status === '1') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive' || $status === '0') {
            $query->where('is_active', false);
        }

        // Sorting
        $sortBy = $request->query('sort_by', 'code');
        $sortDir = strtolower($request->query('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['code', 'display_order', 'name_ar', 'name_fr', 'name_en', 'is_active', 'created_at'];
        if (in_array($sortBy, $allowedSort, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('code', 'asc');
        }

        $perPage = (int) $request->query('per_page', 60);
        $perPage = max(1, min($perPage, 100));

        $wilayas = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data'   => WilayaResource::collection($wilayas->items()),
            'meta'   => [
                'current_page' => $wilayas->currentPage(),
                'last_page'    => $wilayas->lastPage(),
                'per_page'     => $wilayas->perPage(),
                'total'        => $wilayas->total(),
            ],
        ]);
    }

    /**
     * Show single Wilaya.
     *
     * GET /api/v1/admin/master/wilayas/{id}
     */
    public function showWilaya(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $wilaya = Wilaya::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new WilayaResource($wilaya),
        ]);
    }

    /**
     * Create a new Wilaya.
     *
     * POST /api/v1/admin/master/wilayas
     */
    public function storeWilaya(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $validated = $request->validate([
            'code'          => ['required', 'string', 'max:10', 'unique:wilayas,code'],
            'name_ar'       => ['required', 'string', 'max:255'],
            'name_fr'       => ['required', 'string', 'max:255'],
            'name_en'       => ['required', 'string', 'max:255'],
            'is_active'     => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $wilaya = Wilaya::create([
            'code'          => $validated['code'],
            'name_ar'       => $validated['name_ar'],
            'name_fr'       => $validated['name_fr'],
            'name_en'       => $validated['name_en'],
            'is_active'     => $validated['is_active'] ?? true,
            'display_order' => $validated['display_order'] ?? (int) $validated['code'],
        ]);

        $this->clearWilayaCache();

        Log::info('Admin created wilaya', [
            'actor_id'  => $user->id,
            'wilaya_id' => $wilaya->id,
            'code'      => $wilaya->code,
            'ip'        => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'تم إنشاء الولاية بنجاح.',
            'data'    => new WilayaResource($wilaya),
        ], 201);
    }

    /**
     * Update an existing Wilaya.
     *
     * PUT /api/v1/admin/master/wilayas/{id}
     */
    public function updateWilaya(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $wilaya = Wilaya::findOrFail($id);

        $validated = $request->validate([
            'code'          => ['sometimes', 'required', 'string', 'max:10', Rule::unique('wilayas', 'code')->ignore($wilaya->id)],
            'name_ar'       => ['required', 'string', 'max:255'],
            'name_fr'       => ['required', 'string', 'max:255'],
            'name_en'       => ['required', 'string', 'max:255'],
            'is_active'     => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['code'])) {
            $wilaya->code = $validated['code'];
        }
        $wilaya->name_ar = $validated['name_ar'];
        $wilaya->name_fr = $validated['name_fr'];
        $wilaya->name_en = $validated['name_en'];
        if (array_key_exists('is_active', $validated)) {
            $wilaya->is_active = (bool) $validated['is_active'];
        }
        if (array_key_exists('display_order', $validated)) {
            $wilaya->display_order = (int) $validated['display_order'];
        }
        $wilaya->save();

        $this->clearWilayaCache();

        Log::info('Admin updated wilaya', [
            'actor_id'  => $user->id,
            'wilaya_id' => $wilaya->id,
            'code'      => $wilaya->code,
            'ip'        => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'تم تحديث بيانات الولاية بنجاح.',
            'data'    => new WilayaResource($wilaya),
        ]);
    }

    /**
     * Toggle or set active status of a Wilaya.
     *
     * PUT /api/v1/admin/master/wilayas/{id}/status
     */
    public function toggleWilayaStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $wilaya = Wilaya::findOrFail($id);

        $newStatus = $request->has('is_active')
            ? $request->boolean('is_active')
            : ! $wilaya->is_active;

        $wilaya->is_active = $newStatus;
        $wilaya->save();

        $this->clearWilayaCache();

        Log::info('Admin toggled wilaya status', [
            'actor_id'  => $user->id,
            'wilaya_id' => $wilaya->id,
            'is_active' => $newStatus,
            'ip'        => $request->ip(),
        ]);

        $message = $newStatus
            ? 'تم تفعيل الولاية بنجاح.'
            : 'تم إلغاء تفعيل الولاية بنجاح.';

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => new WilayaResource($wilaya),
        ]);
    }

    /**
     * Safe deletion of a Wilaya (blocked if referenced by clinics, centers, patients, etc.).
     *
     * DELETE /api/v1/admin/master/wilayas/{id}
     */
    public function deleteWilaya(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $wilaya = Wilaya::findOrFail($id);

        // Check for references across all related tables
        $communesCount   = $wilaya->communes()->count();
        $clinicsCount    = DB::table('clinics')->where('wilaya_id', $wilaya->id)->count();
        $centersCount    = DB::table('booking_centers')->where('wilaya_id', $wilaya->id)->count();
        $patientsCount   = DB::table('patients')->where('wilaya_id', $wilaya->id)->count();
        $diagCount       = DB::table('diagnostic_centers')->where('wilaya_id', $wilaya->id)->count();
        $adsCount        = DB::table('advertisements')->where('target_wilaya_id', $wilaya->id)->count();

        $totalReferences = $communesCount + $clinicsCount + $centersCount + $patientsCount + $diagCount + $adsCount;

        if ($totalReferences > 0) {
            $details = [];
            if ($communesCount > 0) $details[] = "{$communesCount} بلدية";
            if ($clinicsCount > 0) $details[] = "{$clinicsCount} عيادة";
            if ($centersCount > 0) $details[] = "{$centersCount} مركز حجز";
            if ($patientsCount > 0) $details[] = "{$patientsCount} مريض";
            if ($diagCount > 0) $details[] = "{$diagCount} مركز تشخيص";
            if ($adsCount > 0) $details[] = "{$adsCount} إعلان";

            $detailsStr = implode('، ', $details);

            return response()->json([
                'status'  => 'error',
                'code'    => 422,
                'message' => "لا يمكن حذف الولاية '{$wilaya->code} - {$wilaya->name_ar}' لوجود سجلات مرتبطة بها ({$detailsStr}). يمكنك إلغاء تفعيلها بدلاً من الحذف.",
            ], 422);
        }

        $code = $wilaya->code;
        $wilayaId = $wilaya->id;
        $wilaya->delete();

        $this->clearWilayaCache();

        Log::info('Admin deleted unreferenced wilaya', [
            'actor_id'  => $user->id,
            'wilaya_id' => $wilayaId,
            'code'      => $code,
            'ip'        => $request->ip(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "تم حذف الولاية ({$code}) بنجاح.",
        ]);
    }
}
