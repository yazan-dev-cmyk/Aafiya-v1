<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CreatePackagePurchaseRequest;
use App\Http\Requests\Booking\RejectPackagePurchaseRequest;
use App\Http\Resources\PackagePurchaseRequestResource;
use App\Models\BookingPackage;
use App\Models\PackagePurchaseRequest;
use App\Services\PackagePurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PackagePurchaseRequestController extends Controller
{
    public function __construct(
        protected PackagePurchaseRequestService $service
    ) {}

    /**
     * Submit a new package purchase request by authenticated Booking Center.
     */
    public function store(CreatePackagePurchaseRequest $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center || ! $center->isOperational()) {
            return response()->json([
                'message' => 'غير مصرح لغير مراكز الحجز المعتمدة والنشطة بإنشاء طلبات شراء الباقات.',
            ], 403);
        }

        $package = BookingPackage::where('id', $request->input('package_id'))
            ->where('is_active', true)
            ->firstOrFail();

        $item = $this->service->createRequest($center, $package, $request->validated(), $user);

        return response()->json([
            'message' => 'تم تقديم طلب شراء الباقة بنجاح وهو قيد المراجعة.',
            'data' => new PackagePurchaseRequestResource(
                $item->load(['bookingCenter', 'bookingPackage', 'createdBy'])
            ),
        ], 201);
    }

    /**
     * List purchase requests belonging exclusively to the authenticated Booking Center.
     */
    public function indexOwn(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center) {
            abort(403, 'المستخدم لا يملك حساب مركز حجز.');
        }

        $requests = PackagePurchaseRequest::where('booking_center_id', $center->id)
            ->with(['bookingCenter', 'bookingPackage', 'createdBy', 'reviewedBy', 'bookingTransaction'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return PackagePurchaseRequestResource::collection($requests);
    }

    /**
     * List all package purchase requests for Platform Admin or authorized Admin Assistant.
     */
    public function indexAll(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $this->canReview($user)) {
            abort(403, 'غير مصرح لك باستعراض طلبات شراء الباقات.');
        }

        $query = PackagePurchaseRequest::with([
            'bookingCenter',
            'bookingPackage',
            'createdBy',
            'reviewedBy',
            'bookingTransaction',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('booking_center_id')) {
            $query->where('booking_center_id', $request->input('booking_center_id'));
        }

        $requests = $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->input('per_page', 20));

        return PackagePurchaseRequestResource::collection($requests);
    }

    /**
     * Show details of a specific purchase request.
     */
    public function show(Request $request, PackagePurchaseRequest $packagePurchaseRequest): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        $isOwner = $center && $center->id === $packagePurchaseRequest->booking_center_id;
        $isReviewer = $this->canReview($user);

        if (! $isOwner && ! $isReviewer) {
            abort(403, 'غير مصرح لك بالوصول إلى تفاصيل هذا الطلب.');
        }

        return response()->json([
            'data' => new PackagePurchaseRequestResource(
                $packagePurchaseRequest->load([
                    'bookingCenter',
                    'bookingPackage',
                    'createdBy',
                    'reviewedBy',
                    'bookingTransaction',
                ])
            ),
        ]);
    }

    /**
     * Approve a pending purchase request (Platform Admin or authorized Admin Assistant).
     */
    public function approve(Request $request, PackagePurchaseRequest $packagePurchaseRequest): JsonResponse
    {
        $user = $request->user();
        if (! $this->canReview($user)) {
            return response()->json([
                'message' => 'غير مصرح لك باعتماد طلبات شراء الباقات.',
            ], 403);
        }

        $approved = $this->service->approveRequest($packagePurchaseRequest, $user);

        return response()->json([
            'message' => 'تم اعتماد طلب شراء الباقة وشحن رصيد الحجز بنجاح.',
            'data' => new PackagePurchaseRequestResource($approved),
        ], 200);
    }

    /**
     * Reject a pending purchase request (Platform Admin or authorized Admin Assistant).
     */
    public function reject(
        RejectPackagePurchaseRequest $request,
        PackagePurchaseRequest $packagePurchaseRequest
    ): JsonResponse {
        $user = $request->user();
        if (! $this->canReview($user)) {
            return response()->json([
                'message' => 'غير مصرح لك برفض طلبات شراء الباقات.',
            ], 403);
        }

        $rejected = $this->service->rejectRequest(
            $packagePurchaseRequest,
            $request->input('rejection_reason'),
            $user
        );

        return response()->json([
            'message' => 'تم رفض طلب شراء الباقة.',
            'data' => new PackagePurchaseRequestResource($rejected),
        ], 200);
    }

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
}
