<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Diagnostics\CreateDiagnosticOrderRequest;
use App\Http\Requests\Diagnostics\EnterDiagnosticResultRequest;
use App\Http\Resources\DiagnosticOrderItemResource;
use App\Http\Resources\DiagnosticOrderResource;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Services\DiagnosticService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiagnosticOrderController extends Controller
{
    public function __construct(
        protected DiagnosticService $diagnosticService
    ) {}

    /**
     * List diagnostic orders according to authorized scope.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'order_type' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'sort_by' => ['nullable', 'string', 'in:ordered_at,created_at,priority,status'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = DiagnosticOrder::with(['patient', 'doctor.user', 'clinic', 'items', 'diagnosticCenter', 'samples', 'radiologyReport']);

        $activeClinicId = $request->attributes->get('active_clinic_id') ?? $request->header('X-Clinic-ID') ?? $request->input('clinic_id');
        $doctorPosition = $request->attributes->get('doctor_position') ?? ($activeClinicId ? $user->doctor?->getPositionInClinic($activeClinicId) : null);

        if ($user->hasRole('doctor')) {
            if ($activeClinicId) {
                $query->where('clinic_id', $activeClinicId);
                if ($doctorPosition !== 'director' && ! $user->doctor?->isDirectorOf($activeClinicId)) {
                    $query->where('doctor_id', $user->doctor?->id);
                }
            } else {
                $query->where('doctor_id', $user->doctor?->id);
            }
        } elseif ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            $query->whereHas('patient', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($user->hasRole('lab') || $user->hasRole('radiology')) {
            $centerIds = $user->managedDiagnosticCenters()->where('is_active', true)->pluck('id');
            $query->whereIn('diagnostic_center_id', $centerIds);
        } elseif ($user->hasRole('lab_assistant') || $user->hasRole('rad_assistant')) {
            $staff = $user->diagnosticStaffProfile;
            if ($staff && $staff->is_active && ! $staff->trashed() && $staff->center && $staff->center->is_active) {
                $query->where('diagnostic_center_id', $staff->diagnostic_center_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif (! $user->hasRole('admin')) {
            $query->whereRaw('1 = 0');
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $orderType = $validated['order_type'] ?? $validated['type'] ?? null;
        if (! empty($orderType)) {
            $query->where('order_type', $orderType);
        }

        if (! empty($validated['from_date'])) {
            $query->where('ordered_at', '>=', $validated['from_date'] . ' 00:00:00');
        }

        if (! empty($validated['to_date'])) {
            $query->where('ordered_at', '<=', $validated['to_date'] . ' 23:59:59');
        }

        if (! empty($validated['search'])) {
            $searchTerm = trim($validated['search']);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('order_reference', 'LIKE', "%{$searchTerm}%")
                    ->orWhereHas('patient', function ($pq) use ($searchTerm) {
                        $pq->where('first_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('mrn', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('phone', 'LIKE', "%{$searchTerm}%");
                    })
                    ->orWhereHas('doctor.user', function ($dq) use ($searchTerm) {
                        $dq->where('name', 'LIKE', "%{$searchTerm}%");
                    });
            });
        }

        $sortBy = $validated['sort_by'] ?? 'ordered_at';
        $sortOrder = strtolower($validated['sort_order'] ?? 'desc');

        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) ($validated['per_page'] ?? 20);
        $orders = $query->paginate($perPage);

        return DiagnosticOrderResource::collection($orders);
    }

    /**
     * Issue a new diagnostic order.
     */
    public function store(CreateDiagnosticOrderRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            abort(403, 'حساب الطبيب قيد المراجعة والتحقق من قبل إدارة المنصة.');
        }

        $order = $this->diagnosticService->createOrder(
            $request->validated(),
            $request->input('items'),
            $user
        );

        return response()->json([
            'message' => 'تم إنشاء طلب الفحوصات الطبية بنجاح.',
            'data' => new DiagnosticOrderResource($order),
        ], 201);
    }

    /**
     * Show single diagnostic order.
     */
    public function show(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $this->diagnosticService->authorizeOrderAccess($diagnosticOrder, $user);

        if ($diagnosticOrder->patient) {
            $reason = ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) ? 'patient_self_view' : 'diagnostic_fulfillment';
            app(\App\Services\ClinicalAccessLogService::class)->logAccess(
                $user,
                $diagnosticOrder->patient,
                'diagnostic_order',
                $diagnosticOrder->id,
                'view_diagnostic_result',
                $reason,
                $request
            );
        }

        return response()->json([
            'data' => new DiagnosticOrderResource($diagnosticOrder->load(['patient', 'doctor.user', 'clinic', 'items.order', 'diagnosticCenter', 'samples', 'radiologyReport'])),
        ]);
    }

    /**
     * Center acknowledges order reception.
     */
    public function receive(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $request->validate(['diagnostic_center_id' => ['required', 'uuid', 'exists:diagnostic_centers,id']]);

        $center = DiagnosticCenter::findOrFail($request->input('diagnostic_center_id'));
        $received = $this->diagnosticService->receiveOrder($diagnosticOrder, $center, $request->user());

        return response()->json([
            'message' => 'تم استلام وتأكيد الطلب في المركز التشخيصي.',
            'data' => new DiagnosticOrderResource($received),
        ]);
    }

    /**
     * Enter/update draft test result for an item (Assistant).
     */
    public function enterResult(EnterDiagnosticResultRequest $request, DiagnosticOrderItem $item): JsonResponse
    {
        $updatedItem = $this->diagnosticService->enterOrderItemResult(
            $item,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم تسجيل نتيجة الفحص كمسودة بنجاح.',
            'data' => new DiagnosticOrderItemResource($updatedItem),
        ]);
    }

    /**
     * Finalize and sign all order results (Manager Sign-Off).
     */
    public function finalize(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $finalized = $this->diagnosticService->finalizeOrderResults(
            $diagnosticOrder,
            $request->user()
        );

        return response()->json([
            'message' => 'تم اعتماد ونشر النتائج الطبية بنجاح (Official Finalized Results).',
            'data' => new DiagnosticOrderResource($finalized),
        ]);
    }

    /**
     * Public QR verification endpoint for diagnostic orders.
     */
    public function verify(string $token): JsonResponse
    {
        $trimmed = trim($token);
        if (strlen($trimmed) !== 64 || ! preg_match('/^[A-Za-z0-9]{64}$/', $trimmed)) {
            return response()->json([
                'message' => 'رمز التحقق غير صالح أو غير موجود في منظومة عافية.',
            ], 404);
        }

        $order = DiagnosticOrder::with(['patient', 'doctor.user', 'clinic', 'diagnosticCenter', 'items', 'radiologyReport.reporter'])
            ->where('secure_token', $trimmed)
            ->first();

        if (! $order) {
            return response()->json([
                'message' => 'رمز التحقق غير صالح أو غير موجود في منظومة عافية.',
            ], 404);
        }

        return response()->json([
            'data' => new \App\Http\Resources\DiagnosticOrderPublicResource($order),
        ], 200);
    }
}
