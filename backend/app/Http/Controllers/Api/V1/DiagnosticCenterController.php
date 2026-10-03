<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Diagnostics\AddDiagnosticStaffRequest;
use App\Http\Requests\Diagnostics\RegisterDiagnosticCenterRequest;
use App\Http\Resources\DiagnosticCenterResource;
use App\Http\Resources\DiagnosticStaffResource;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticStaff;
use App\Services\DiagnosticStaffService;
use App\Services\LegacyWilayaMigrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiagnosticCenterController extends Controller
{
    public function __construct(
        protected DiagnosticStaffService $staffService
    ) {}

    /**
     * List diagnostic centers.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = DiagnosticCenter::with('manager')->where('is_active', true);

        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->has('wilaya')) {
            $query->where('wilaya', $request->input('wilaya'));
        }

        $centers = $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate($request->input('per_page', 20));

        return DiagnosticCenterResource::collection($centers);
    }

    /**
     * Register a new diagnostic center.
     */
    public function store(RegisterDiagnosticCenterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $wilayaStr = $validated['wilaya'] ?? null;
        $wilayaId = $validated['wilaya_id'] ?? ($wilayaStr !== null ? app(LegacyWilayaMigrationService::class)->resolveWilaya($wilayaStr)?->id : null);

        $center = DiagnosticCenter::create(array_merge($validated, [
            'user_id' => $request->user()->id,
            'wilaya_id' => $wilayaId,
            'is_active' => true,
        ]));

        return response()->json([
            'message' => 'تم تسجيل المركز التشخيصي بنجاح.',
            'data' => new DiagnosticCenterResource($center->load('manager')),
        ], 201);
    }

    /**
     * Display the specified diagnostic center.
     */
    public function show(string $id): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);

        return response()->json([
            'data' => new DiagnosticCenterResource($center->load('manager')),
        ]);
    }

    /**
     * List staff of a diagnostic center (Director/Manager only - Security Protected).
     */
    public function staff(Request $request, string $id): AnonymousResourceCollection|JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);

        $user = $request->user();
        if (! $user || ($center->user_id !== $user->id && ! $user->hasRole('admin'))) {
            return response()->json(['message' => 'غير مصرح لك بعرض كوادر هذا المركز التشخيصي.'], 403);
        }

        $staff = $center->staff()->with('user')->get();

        return DiagnosticStaffResource::collection($staff);
    }

    /**
     * Add staff account to diagnostic center (Director only).
     */
    public function addStaff(AddDiagnosticStaffRequest $request, string $id): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);

        $staff = $this->staffService->createStaff($request->user(), $center, $request->validated());

        return response()->json([
            'message' => 'تم إنشاء حساب موظف المركز التشخيصي بنجاح.',
            'data' => new DiagnosticStaffResource($staff->load('user')),
        ], 201);
    }

    /**
     * Show detailed profile and permissions of a single staff member.
     */
    public function showStaff(Request $request, string $id, string $staffId): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);

        $detail = $this->staffService->getStaffDetail($request->user(), $center, $staffId);

        return response()->json([
            'data' => $detail,
        ], 200);
    }

    /**
     * Update delegated permissions of an employee with hard ceiling enforcement.
     */
    public function updateStaffPermissions(Request $request, string $id, string $staffId): JsonResponse
    {
        $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required', 'string'],
        ]);

        $center = DiagnosticCenter::findOrFail($id);
        $staff = DiagnosticStaff::findOrFail($staffId);

        $updated = $this->staffService->updateStaffPermissions(
            $request->user(),
            $center,
            $staff,
            $request->input('permissions')
        );

        return response()->json([
            'message' => 'تم تحديث صلاحيات موظف المركز التشخيصي بنجاح.',
            'data' => new DiagnosticStaffResource($updated),
        ], 200);
    }

    /**
     * Toggle active/suspended status of an employee.
     */
    public function updateStaffStatus(Request $request, string $id, string $staffId): JsonResponse
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $center = DiagnosticCenter::findOrFail($id);
        $staff = DiagnosticStaff::findOrFail($staffId);

        $updated = $this->staffService->toggleStaffStatus(
            $request->user(),
            $center,
            $staff,
            $request->boolean('is_active')
        );

        return response()->json([
            'message' => 'تم تحديث حالة تفعيل موظف المركز التشخيصي بنجاح.',
            'data' => new DiagnosticStaffResource($updated),
        ], 200);
    }

    /**
     * Remove / soft-delete an employee from the diagnostic center.
     */
    public function deleteStaff(Request $request, string $id, string $staffId): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);
        $staff = DiagnosticStaff::findOrFail($staffId);

        $this->staffService->deleteStaff($request->user(), $center, $staff);

        return response()->json([
            'message' => 'تم حذف موظف المركز التشخيصي بنجاح (مع الاحتفاظ بالسجلات والمسؤوليات التاريخية).',
        ], 200);
    }

    /**
     * Get operational analytics for a diagnostic center (Director or Active Center Staff).
     */
    public function analytics(Request $request, string $id): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);
        $user = $request->user();

        $this->staffService->authorizeCenterAccess($user, $center);

        $analytics = $this->staffService->getCenterOperationalAnalytics($center);

        return response()->json([
            'data' => $analytics,
        ]);
    }

    /**
     * Get operational notifications for a diagnostic center & staff.
     */
    public function notifications(Request $request, string $id): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);
        $user = $request->user();

        $this->staffService->authorizeCenterAccess($user, $center);

        $notifications = $this->staffService->getCenterNotifications($center, $user);

        return response()->json([
            'data' => $notifications,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markNotificationRead(Request $request, string $id, string $notificationId): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);
        $user = $request->user();

        $this->staffService->authorizeCenterAccess($user, $center);

        $this->staffService->markNotificationRead($user, $notificationId);

        return response()->json([
            'message' => 'تم تحديد الإشعار كمقروء.',
        ]);
    }

    /**
     * Mark all notifications for this user in this center as read.
     */
    public function markAllNotificationsRead(Request $request, string $id): JsonResponse
    {
        $center = DiagnosticCenter::findOrFail($id);
        $user = $request->user();

        $this->staffService->authorizeCenterAccess($user, $center);

        $count = $this->staffService->markAllNotificationsRead($user, $center);

        return response()->json([
            'message' => 'تم تحديد جميع الإشعارات كمقروءة.',
            'count' => $count,
        ]);
    }

    /**
     * Director sends a directive to center staff.
     */
    public function createDirective(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:2000'],
            'priority' => ['nullable', 'string', 'in:normal,important,stat'],
        ]);

        $center = DiagnosticCenter::findOrFail($id);
        $user = $request->user();

        $directive = $this->staffService->createCenterDirective($user, $center, $validated);

        return response()->json([
            'message' => 'تم تعميم التعليمات التشغيلية على طاقم المركز بنجاح.',
            'data' => $directive,
        ], 201);
    }

    /**
     * Get the authenticated staff member's own profile.
     */
    public function myStaffProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $staff = $user->diagnosticStaffProfile;
        if (! $staff || $staff->trashed()) {
            abort(404, 'لا يوجد ملف موظف تشخيصي مرتبط بهذا الحساب.');
        }

        if (! $staff->is_active || ! $staff->center || ! $staff->center->is_active) {
            abort(403, 'حساب موظف المركز التشخيصي موقوف أو المركز غير نشط.');
        }

        return response()->json([
            'data' => [
                'id' => $staff->id,
                'user_id' => $staff->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role_type' => $staff->role_type,
                'is_active' => (bool) $staff->is_active,
                'permissions' => $staff->getDelegatedPermissions(),
                'created_at' => $staff->created_at?->toISOString(),
                'center' => [
                    'id' => $staff->center->id,
                    'name' => $staff->center->name,
                    'type' => $staff->center->type,
                    'license_number' => $staff->center->license_number,
                    'phone' => $staff->center->phone,
                    'email' => $staff->center->email,
                    'address' => $staff->center->address,
                    'wilaya' => $staff->center->wilaya,
                    'manager' => $staff->center->manager ? [
                        'id' => $staff->center->manager->id,
                        'name' => $staff->center->manager->name,
                        'email' => $staff->center->manager->email,
                    ] : null,
                ],
            ],
        ]);
    }
}
