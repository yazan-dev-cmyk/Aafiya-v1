<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PackagePurchaseRequestResource;
use App\Services\FinancialReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FinancialReportController extends Controller
{
    public function __construct(
        protected FinancialReportingService $reportingService
    ) {}

    /**
     * Get platform-wide financial summary and revenue by package type (Admin & Authorized Assistant).
     */
    public function platformSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->canReviewFinancials($user)) {
            return response()->json([
                'message' => 'غير مصرح لك باستعراض التقارير المالية للمنصة.',
            ], 403);
        }

        $summary = $this->reportingService->getPlatformFinancialSummary();
        $revenueByPackage = $this->reportingService->getRevenueByPackageType();

        return response()->json([
            'data' => array_merge($summary, [
                'revenue_by_package' => $revenueByPackage,
            ]),
        ]);
    }

    /**
     * Get paginated platform financial activity / payments (Admin & Authorized Assistant).
     */
    public function platformPayments(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $this->canReviewFinancials($user)) {
            abort(403, 'غير مصرح لك باستعراض سجل المدفوعات المالية للمنصة.');
        }

        $filters = $request->only(['booking_center_id', 'package_code', 'current_month', 'date_from', 'date_to']);
        $perPage = (int) $request->input('per_page', 20);

        $payments = $this->reportingService->getPlatformPayments($filters, $perPage);

        return PackagePurchaseRequestResource::collection($payments);
    }

    /**
     * Get financial spending and quota summary for the authenticated Booking Center.
     */
    public function bookingCenterSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center) {
            return response()->json([
                'message' => 'المستخدم الحالي لا يملك حساب مركز حجز.',
            ], 403);
        }

        $summary = $this->reportingService->getBookingCenterFinancialSummary($center);

        return response()->json([
            'data' => $summary,
        ]);
    }

    /**
     * Get paginated approved billing / purchase records for the authenticated Booking Center.
     */
    public function bookingCenterBillingRecords(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $center = $user->bookingCenter;

        if (! $center) {
            abort(403, 'المستخدم الحالي لا يملك حساب مركز حجز.');
        }

        $perPage = (int) $request->input('per_page', 20);
        $records = $this->reportingService->getBookingCenterBillingRecords($center, $perPage);

        return PackagePurchaseRequestResource::collection($records);
    }

    /**
     * Check if user is Platform Admin or Authorized Admin Assistant.
     */
    protected function canReviewFinancials($user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.view_financials')) {
            return true;
        }

        if ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.approve_requests')) {
            return true;
        }

        return false;
    }
}
