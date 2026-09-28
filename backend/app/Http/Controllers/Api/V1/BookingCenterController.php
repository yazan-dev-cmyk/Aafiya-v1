<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\PurchasePackageRequest;
use App\Http\Requests\Booking\RejectBookingCenterRequest;
use App\Http\Requests\Booking\ResubmitBookingCenterRequest;
use App\Http\Requests\Booking\UpdateBookingCenterSettingsRequest;
use App\Http\Resources\BookingCenterResource;
use App\Http\Resources\BookingTransactionResource;
use App\Http\Resources\PackagePurchaseRequestResource;
use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Services\BookingCenterService;
use App\Services\PackagePurchaseRequestService;
use App\Services\QuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class BookingCenterController extends Controller
{
    public function __construct(
        protected QuotaService $quotaService,
        protected PackagePurchaseRequestService $purchaseRequestService,
        protected BookingCenterService $bookingCenterService
    ) {}

    /**
     * Check if user is Platform Admin or Admin Assistant with 4D delegated permission platform.approve_requests.
     */
    protected function canReview($user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.approve_requests')) {
            return true;
        }

        return false;
    }

    /**
     * List booking centers with status filtering.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $isAdminOrAssistant = $user && ($user->hasRole('admin') || $user->hasRole('admin_assistant'));

        $query = BookingCenter::with(['user', 'reviewedBy']);

        if ($isAdminOrAssistant) {
            $status = $request->query('status', 'all');
            if (in_array($status, BookingCenter::VALID_STATUSES, true)) {
                $query->where('verification_status', $status);
            }
        } else {
            // Non-admin / public view only sees verified and active centers
            $query->where('verification_status', BookingCenter::STATUS_VERIFIED)
                  ->where('is_active', true);
        }

        $centers = $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->input('per_page', 20));

        return BookingCenterResource::collection($centers);
    }

    /**
     * Store / register a new booking center (Guarded against duplicate provisioning).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->bookingCenter()->exists()) {
            return response()->json(['message' => 'المستخدم يملك حساب مركز حجز بالفعل.'], 422);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'commercial_register' => ['nullable', 'string', 'max:100'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'wilaya' => ['required', 'string', 'max:100'],
        ]);

        $center = $this->bookingCenterService->provisionCenter($data, $user);

        return response()->json([
            'message' => 'تم تسجيل مركز الحجز بنجاح وهو قيد المراجعة والتحقق.',
            'data' => new BookingCenterResource($center->load(['user', 'reviewedBy'])),
        ], 201);
    }

    /**
     * Approve / verify a pending booking center (Platform Admin or authorized Assistant).
     */
    public function verify(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $this->canReview($user)) {
            return response()->json(['message' => 'غير مصرح لك باعتماد مراكز الحجز.'], 403);
        }

        $center = BookingCenter::findOrFail($id);
        $verifiedCenter = $this->bookingCenterService->approveCenter($center, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'تم اعتماد وتوثيق مركز الحجز وتفعيل لوحة التحكم بنجاح.',
            'data' => new BookingCenterResource($verifiedCenter),
        ]);
    }

    /**
     * Reject a pending booking center with documented reason (Platform Admin or authorized Assistant).
     */
    public function reject(RejectBookingCenterRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $this->canReview($user)) {
            return response()->json(['message' => 'غير مصرح لك برفض مراكز الحجز.'], 403);
        }

        $center = BookingCenter::findOrFail($id);
        $reason = $request->validated('rejection_reason');
        $rejectedCenter = $this->bookingCenterService->rejectCenter($center, $reason, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'تم رفض طلب تسجيل مركز الحجز وتوثيق سبب الرفض.',
            'data' => new BookingCenterResource($rejectedCenter),
        ]);
    }

    /**
     * Resubmit a rejected booking center back to pending review.
     */
    public function resubmit(ResubmitBookingCenterRequest $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;
        if (! $center) {
            return response()->json(['message' => 'حساب مركز الحجز غير موجود.'], 404);
        }

        $resubmittedCenter = $this->bookingCenterService->resubmitCenter($center, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => 'تم إعادة إرسال طلب مركز الحجز للمراجعة والتحقق بنجاح.',
            'data' => new BookingCenterResource($resubmittedCenter),
        ]);
    }

    /**
     * Update settings and official contact details of authenticated user's booking center.
     */
    public function updateSettings(UpdateBookingCenterSettingsRequest $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center) {
            return response()->json([
                'message' => 'حساب مركز الحجز غير موجود.',
            ], 404);
        }

        $validated = $request->validated();
        $allowed = ['name', 'phone', 'email', 'wilaya', 'address'];
        $updateData = array_intersect_key($validated, array_flip($allowed));

        $center->update($updateData);

        return response()->json([
            'status'  => 'success',
            'message' => 'تم تحديث بيانات مركز الحجز بنجاح.',
            'data'    => new BookingCenterResource($center->fresh(['user', 'reviewedBy'])),
        ]);
    }

    /**
     * Show booking center.
     */
    public function show(BookingCenter $bookingCenter): JsonResponse
    {
        return response()->json([
            'data' => new BookingCenterResource($bookingCenter->load('user')),
        ]);
    }

    /**
     * Get quota balance for authenticated user's booking center.
     */
    public function quotaBalance(Request $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center) {
            return response()->json(['message' => 'المستخدم لا يملك حساب مركز حجز.'], 404);
        }

        return response()->json([
            'data' => [
                'booking_center_id' => $center->id,
                'name' => $center->name,
                'quota_balance' => (int) $center->quota_balance,
            ],
        ]);
    }

    /**
     * Get transaction ledger history for authenticated user's booking center.
     */
    public function transactions(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        $validated = $request->validate([
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'sort_by' => ['nullable', 'string', 'in:created_at,units,balance_after'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = BookingTransaction::with(['appointment', 'package', 'creator']);

        if ($center && ! $user->hasRole('admin')) {
            $query->where('booking_center_id', $center->id);
        }

        if (! empty($validated['from_date'])) {
            $query->where('created_at', '>=', $validated['from_date'] . ' 00:00:00');
        }

        if (! empty($validated['to_date'])) {
            $query->where('created_at', '<=', $validated['to_date'] . ' 23:59:59');
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortOrder = strtolower($validated['sort_order'] ?? 'desc');

        $query->orderBy($sortBy, $sortOrder)->orderBy('id', 'desc');

        $perPage = (int) ($validated['per_page'] ?? 20);
        $transactions = $query->paginate($perPage);

        return BookingTransactionResource::collection($transactions);
    }

    /**
     * Submit a package purchase request (Option B Compatibility Route).
     * Creates a pending purchase request for admin review instead of immediate self-credit.
     */
    public function purchasePackage(PurchasePackageRequest $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center || ! $center->isOperational()) {
            return response()->json(['message' => 'غير مصرح لغير مراكز الحجز المعتمدة والنشطة بطلب شراء الباقات.'], 403);
        }

        $package = BookingPackage::where('id', $request->input('package_id'))
            ->where('is_active', true)
            ->firstOrFail();

        $purchaseRequest = $this->purchaseRequestService->createRequest($center, $package, $request->validated(), $user);

        return response()->json([
            'message' => 'تم تقديم طلب شراء الباقة بنجاح وهو قيد المراجعة.',
            'data' => new PackagePurchaseRequestResource($purchaseRequest->load(['bookingCenter', 'bookingPackage', 'createdBy'])),
        ], 201);
    }

    /**
     * Grant quota to a booking center (Platform Admin or authorized Admin Assistant).
     */
    public function grantQuota(Request $request, BookingCenter $bookingCenter): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.');
        }

        $canGrant = $user->hasRole('admin') || ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.approve_requests'));
        if (! $canGrant) {
            return response()->json(['message' => 'غير مصرح لك بمنح رصيد حجز لمركز الحجز.'], 403);
        }

        $request->validate([
            'units' => ['required', 'integer', 'min:1'],
            'reference_note' => ['nullable', 'string', 'max:255'],
        ]);

        $units = (int) $request->input('units');
        $referenceNote = $request->input('reference_note', "منح رصيد إداري (+{$units} وحدة)");

        $result = DB::transaction(function () use ($bookingCenter, $units, $referenceNote, $user) {
            /** @var BookingCenter $lockedCenter */
            $lockedCenter = BookingCenter::where('id', $bookingCenter->id)->lockForUpdate()->firstOrFail();

            $newBalance = $lockedCenter->quota_balance + $units;
            $lockedCenter->update(['quota_balance' => $newBalance]);

            $tx = BookingTransaction::create([
                'booking_center_id' => $lockedCenter->id,
                'transaction_type' => 'purchase',
                'units' => $units,
                'balance_after' => $newBalance,
                'reference_note' => $referenceNote,
                'created_by_id' => $user->id,
            ]);

            return [
                'booking_center_id' => $lockedCenter->id,
                'quota_balance' => $newBalance,
                'transaction' => $tx,
            ];
        });

        return response()->json([
            'message' => 'تم منح الرصيد لمركز الحجز بنجاح.',
            'data' => [
                'booking_center_id' => $result['booking_center_id'],
                'quota_balance' => $result['quota_balance'],
                'transaction' => new BookingTransactionResource($result['transaction']),
            ],
        ]);
    }
}
