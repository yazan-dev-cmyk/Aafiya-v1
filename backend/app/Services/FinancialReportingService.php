<?php

namespace App\Services;

use App\Models\BookingCenter;
use App\Models\PackagePurchaseRequest;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialReportingService
{
    /**
     * Helper base query for official revenue-generating purchase requests.
     * Strict Rule: Must be status = 'approved' AND have a valid linked ledger transaction (booking_transaction_id IS NOT NULL).
     */
    protected function approvedPurchasesQuery(): Builder
    {
        return PackagePurchaseRequest::query()
            ->where('status', PackagePurchaseRequest::STATUS_APPROVED)
            ->whereNotNull('booking_transaction_id');
    }

    /**
     * Get platform-wide financial summary with conceptual revenue source separation.
     * Single Source of Truth: approved package purchase requests backed by ledger transactions.
     *
     * @return array<string, mixed>
     */
    public function getPlatformFinancialSummary(): array
    {
        $packageSalesQuery = $this->approvedPurchasesQuery();

        $totalPackageSales = (float) $packageSalesQuery->sum('price_dzd');
        $approvedCount = $packageSalesQuery->count();
        $totalQuotaUnits = (int) $packageSalesQuery->sum('quota_units');

        $currentMonthSales = (float) $this->approvedPurchasesQuery()
            ->where('reviewed_at', '>=', now()->startOfMonth())
            ->sum('price_dzd');

        // Revenue sources architecture: Package Sales is active; others reserved for future
        $revenueSources = [
            'package_sales' => [
                'name' => 'Package Sales',
                'active' => true,
                'total_amount_dzd' => $totalPackageSales,
                'current_month_amount_dzd' => $currentMonthSales,
                'approved_requests_count' => $approvedCount,
                'total_quota_units_sold' => $totalQuotaUnits,
            ],
            'advertising' => [
                'name' => 'Advertising',
                'active' => false,
                'total_amount_dzd' => 0.0,
            ],
            'contracts' => [
                'name' => 'Contracts',
                'active' => false,
                'total_amount_dzd' => 0.0,
            ],
            'other' => [
                'name' => 'Other',
                'active' => false,
                'total_amount_dzd' => 0.0,
            ],
        ];

        // Total Revenue = Sum of active revenue sources
        $totalRevenueDzd = $totalPackageSales;

        return [
            'total_revenue_dzd' => $totalRevenueDzd,
            'current_month_revenue_dzd' => $currentMonthSales,
            'revenue_sources' => $revenueSources,
            'metrics' => [
                'total_approved_sales_count' => $approvedCount,
                'total_quota_units_sold' => $totalQuotaUnits,
                'average_sale_amount_dzd' => $approvedCount > 0 ? round($totalPackageSales / $approvedCount, 2) : 0.0,
            ],
        ];
    }

    /**
     * Get revenue breakdown grouped by package type/code using immutable snapshot fields.
     * Guarantees that catalog price updates do NOT alter historical revenue calculations.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function getRevenueByPackageType(): Collection
    {
        $breakdown = $this->approvedPurchasesQuery()
            ->select(
                'package_code',
                'package_name',
                'quota_units',
                DB::raw('SUM(price_dzd) as total_revenue_dzd'),
                DB::raw('COUNT(*) as sales_count'),
                DB::raw('SUM(quota_units) as total_quota_units')
            )
            ->groupBy('package_code', 'package_name', 'quota_units')
            ->orderByDesc('total_revenue_dzd')
            ->get();

        return $breakdown->map(function ($item) {
            return [
                'package_code' => $item->package_code,
                'package_name' => $item->package_name,
                'quota_units' => (int) $item->quota_units,
                'sales_count' => (int) $item->sales_count,
                'total_quota_units' => (int) $item->total_quota_units,
                'total_revenue_dzd' => (float) $item->total_revenue_dzd,
            ];
        });
    }

    /**
     * Get paginated platform financial activity / payments for approved package purchases.
     *
     * @param array<string, mixed> $filters
     */
    public function getPlatformPayments(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = $this->approvedPurchasesQuery()
            ->with([
                'bookingCenter:id,name,phone,email,quota_balance',
                'bookingPackage:id,name,package_code',
                'reviewedBy:id,name,email',
                'bookingTransaction:id,transaction_type,units,balance_after,created_at',
            ]);

        if (! empty($filters['booking_center_id'])) {
            $query->where('booking_center_id', $filters['booking_center_id']);
        }

        if (! empty($filters['package_code'])) {
            $query->where('package_code', $filters['package_code']);
        }

        if (! empty($filters['current_month'])) {
            $query->where('reviewed_at', '>=', now()->startOfMonth());
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('reviewed_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('reviewed_at', '<=', $filters['date_to']);
        }

        return $query->orderBy('reviewed_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get financial spending and quota summary for a specific authenticated Booking Center.
     *
     * @return array<string, mixed>
     */
    public function getBookingCenterFinancialSummary(BookingCenter $center): array
    {
        $centerApprovedQuery = $this->approvedPurchasesQuery()
            ->where('booking_center_id', $center->id);

        $totalSpent = (float) $centerApprovedQuery->sum('price_dzd');
        $approvedCount = $centerApprovedQuery->count();
        $totalQuotaPurchased = (int) $centerApprovedQuery->sum('quota_units');

        $currentMonthSpent = (float) $this->approvedPurchasesQuery()
            ->where('booking_center_id', $center->id)
            ->where('reviewed_at', '>=', now()->startOfMonth())
            ->sum('price_dzd');

        return [
            'booking_center_id' => $center->id,
            'booking_center_name' => $center->name,
            'current_quota_balance' => (int) $center->quota_balance,
            'total_amount_spent_dzd' => $totalSpent,
            'current_month_spent_dzd' => $currentMonthSpent,
            'total_quota_purchased' => $totalQuotaPurchased,
            'approved_purchases_count' => $approvedCount,
        ];
    }

    /**
     * Get paginated approved financial records / receipts for a specific Booking Center.
     */
    public function getBookingCenterBillingRecords(BookingCenter $center, int $perPage = 20): LengthAwarePaginator
    {
        return $this->approvedPurchasesQuery()
            ->where('booking_center_id', $center->id)
            ->with([
                'bookingPackage:id,name,package_code',
                'reviewedBy:id,name',
                'bookingTransaction:id,transaction_type,units,balance_after,created_at',
            ])
            ->orderBy('reviewed_at', 'desc')
            ->paginate($perPage);
    }
}
