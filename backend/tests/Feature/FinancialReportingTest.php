<?php

namespace Tests\Feature;

use App\Models\BookingCenter;
use App\Models\BookingPackage;
use App\Models\BookingTransaction;
use App\Models\PackagePurchaseRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\ScopedPermissionAssignment;
use App\Models\User;
use App\Services\FinancialReportingService;
use App\Services\PackagePurchaseRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportingTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $authorizedAssistantUser;
    protected User $unauthorizedAssistantUser;
    protected User $centerUserA;
    protected BookingCenter $centerA;
    protected User $centerUserB;
    protected BookingCenter $centerB;
    protected BookingPackage $pkg100;
    protected BookingPackage $pkg500;
    protected FinancialReportingService $reportingService;
    protected PackagePurchaseRequestService $workflowService;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Platform Admin']);
        $assistantRole = Role::firstOrCreate(['name' => 'admin_assistant'], ['display_name' => 'Admin Assistant']);
        $bcRole = Role::firstOrCreate(['name' => 'booking_center'], ['display_name' => 'Booking Center']);

        // 2. Permission
        $approvePerm = Permission::firstOrCreate(
            ['name' => 'platform.approve_requests'],
            ['display_name' => 'Approve Registration & Purchase Requests', 'category' => 'platform']
        );

        // 3. Admin User
        $this->adminUser = User::factory()->create(['name' => 'Super Admin', 'email' => 'admin@aafiya.dz']);
        $this->adminUser->roles()->attach($adminRole->id);

        // 4. Authorized Assistant with Scoped Permission
        $this->authorizedAssistantUser = User::factory()->create(['name' => 'Authorized Assistant']);
        $this->authorizedAssistantUser->roles()->attach($assistantRole->id);
        ScopedPermissionAssignment::create([
            'user_id' => $this->authorizedAssistantUser->id,
            'permission_id' => $approvePerm->id,
            'scope_type' => 'platform',
            'scope_id' => 'global',
            'is_active' => true,
            'granted_by_id' => $this->adminUser->id,
        ]);

        // 5. Unauthorized Assistant
        $this->unauthorizedAssistantUser = User::factory()->create(['name' => 'Basic Assistant']);
        $this->unauthorizedAssistantUser->roles()->attach($assistantRole->id);

        // 6. Booking Center A
        $this->centerUserA = User::factory()->create(['name' => 'Center Manager A']);
        $this->centerUserA->roles()->attach($bcRole->id);
        $this->centerA = BookingCenter::create([
            'user_id' => $this->centerUserA->id,
            'name' => 'Centre Médical Alger',
            'phone' => '0555112233',
            'address' => 'Didouche Mourad, Alger',
            'wilaya' => 'الجزائر',
            'quota_balance' => 50,
            'is_active' => true,
        ]);

        // 7. Booking Center B
        $this->centerUserB = User::factory()->create(['name' => 'Center Manager B']);
        $this->centerUserB->roles()->attach($bcRole->id);
        $this->centerB = BookingCenter::create([
            'user_id' => $this->centerUserB->id,
            'name' => 'Centre Médical Oran',
            'phone' => '0555445566',
            'address' => 'Front de Mer, Oran',
            'wilaya' => 'وهران',
            'quota_balance' => 20,
            'is_active' => true,
        ]);

        // 8. Booking Packages
        $this->pkg100 = BookingPackage::create([
            'name' => 'باقة الانطلاق 100',
            'package_code' => 'PKG-100',
            'quota_units' => 100,
            'price_dzd' => 5000.00,
            'is_active' => true,
        ]);

        $this->pkg500 = BookingPackage::create([
            'name' => 'باقة الاحتراف 500',
            'package_code' => 'PKG-500',
            'quota_units' => 500,
            'price_dzd' => 20000.00,
            'is_active' => true,
        ]);

        $this->reportingService = app(FinancialReportingService::class);
        $this->workflowService = app(PackagePurchaseRequestService::class);
    }

    /** 1. Approved purchase requests enter official revenue. */
    public function test_approved_purchase_enters_revenue(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, ['payment_method' => 'baridimob'], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(5000.00, $summary['total_revenue_dzd']);
        $this->assertEquals(5000.00, $summary['revenue_sources']['package_sales']['total_amount_dzd']);
        $this->assertEquals(1, $summary['metrics']['total_approved_sales_count']);
        $this->assertEquals(100, $summary['metrics']['total_quota_units_sold']);
    }

    /** 2. Pending purchase requests contribute zero to revenue. */
    public function test_pending_purchase_contributes_zero_revenue(): void
    {
        $this->workflowService->createRequest($this->centerA, $this->pkg100, ['payment_method' => 'baridimob'], $this->centerUserA);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(0.00, $summary['total_revenue_dzd']);
        $this->assertEquals(0, $summary['metrics']['total_approved_sales_count']);
    }

    /** 3. Rejected purchase requests contribute zero to revenue. */
    public function test_rejected_purchase_contributes_zero_revenue(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, ['payment_method' => 'baridimob'], $this->centerUserA);
        $this->workflowService->rejectRequest($req, 'Invalid payment receipt', $this->adminUser);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(0.00, $summary['total_revenue_dzd']);
        $this->assertEquals(0, $summary['metrics']['total_approved_sales_count']);
    }

    /** 4. Approved purchase request WITHOUT ledger transaction is excluded from revenue. */
    public function test_approved_without_ledger_transaction_is_excluded(): void
    {
        // Manually created approved request without booking_transaction_id
        PackagePurchaseRequest::create([
            'request_reference' => 'REQ-PKG-CORRUPT-001',
            'booking_center_id' => $this->centerA->id,
            'booking_package_id' => $this->pkg100->id,
            'package_name' => $this->pkg100->name,
            'package_code' => $this->pkg100->package_code,
            'quota_units' => 100,
            'price_dzd' => 5000.00,
            'status' => PackagePurchaseRequest::STATUS_APPROVED,
            'booking_transaction_id' => null, // Missing ledger link!
            'created_by_id' => $this->centerUserA->id,
        ]);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(0.00, $summary['total_revenue_dzd']);
        $this->assertEquals(0, $summary['metrics']['total_approved_sales_count']);
    }

    /** 5. Revenue by Package Type works and groups correctly by package code. */
    public function test_revenue_by_package_type_grouping(): void
    {
        // 2 approved sales for pkg100 (5000 * 2 = 10000)
        $r1 = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($r1, $this->adminUser);

        $r2 = $this->workflowService->createRequest($this->centerB, $this->pkg100, [], $this->centerUserB);
        $this->workflowService->approveRequest($r2, $this->adminUser);

        // 1 approved sale for pkg500 (20000)
        $r3 = $this->workflowService->createRequest($this->centerA, $this->pkg500, [], $this->centerUserA);
        $this->workflowService->approveRequest($r3, $this->adminUser);

        $breakdown = $this->reportingService->getRevenueByPackageType();

        $this->assertCount(2, $breakdown);

        $pkg500Row = $breakdown->firstWhere('package_code', 'PKG-500');
        $this->assertEquals(20000.00, $pkg500Row['total_revenue_dzd']);
        $this->assertEquals(1, $pkg500Row['sales_count']);
        $this->assertEquals(500, $pkg500Row['total_quota_units']);

        $pkg100Row = $breakdown->firstWhere('package_code', 'PKG-100');
        $this->assertEquals(10000.00, $pkg100Row['total_revenue_dzd']);
        $this->assertEquals(2, $pkg100Row['sales_count']);
        $this->assertEquals(200, $pkg100Row['total_quota_units']);
    }

    /** 6. Snapshot Integrity: Catalog price changes do not modify historical sales revenue. */
    public function test_catalog_price_update_does_not_change_historical_revenue(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        // Update catalog price from 5,000 to 12,000 DZD
        $this->pkg100->update(['price_dzd' => 12000.00]);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        // Must remain 5,000 DZD based on immutable snapshot
        $this->assertEquals(5000.00, $summary['total_revenue_dzd']);
    }

    /** 7. Monthly Revenue calculates only sales approved in the current month. */
    public function test_monthly_revenue_calculation(): void
    {
        $req1 = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req1, $this->adminUser);

        // Historical approved sale from last month
        $reqOld = $this->workflowService->createRequest($this->centerA, $this->pkg500, [], $this->centerUserA);
        $approvedOld = $this->workflowService->approveRequest($reqOld, $this->adminUser);
        $approvedOld->update(['reviewed_at' => now()->subMonths(2)]);

        $summary = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(25000.00, $summary['total_revenue_dzd']);
        $this->assertEquals(5000.00, $summary['current_month_revenue_dzd']);
    }

    /** 8. Platform Admin API Endpoint returns full financial summary and payments list. */
    public function test_admin_api_access_to_financial_reports(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, ['transaction_reference' => 'TX-ADM-001'], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/summary');

        $response->assertStatus(200)
            ->assertJsonPath('data.total_revenue_dzd', 5000)
            ->assertJsonPath('data.revenue_sources.package_sales.total_amount_dzd', 5000);

        $paymentsRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/payments');

        $paymentsRes->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** 9. Authorized Assistant with scoped permission can view admin financial summary. */
    public function test_authorized_assistant_can_view_financial_summary(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $response = $this->actingAs($this->authorizedAssistantUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/summary');

        $response->assertStatus(200)
            ->assertJsonPath('data.total_revenue_dzd', 5000);
    }

    /** 10. Unauthorized Assistant is forbidden from viewing admin financial summary. */
    public function test_unauthorized_assistant_is_forbidden(): void
    {
        $response = $this->actingAs($this->unauthorizedAssistantUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/summary');

        $response->assertStatus(403);
    }

    /** 11. Booking Center can access its own financial summary and billing records. */
    public function test_booking_center_api_access_to_financial_summary(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $response = $this->actingAs($this->centerUserA, 'sanctum')
            ->getJson('/api/v1/booking-centers/financial-summary');

        $response->assertStatus(200)
            ->assertJsonPath('data.total_amount_spent_dzd', 5000)
            ->assertJsonPath('data.total_quota_purchased', 100)
            ->assertJsonPath('data.approved_purchases_count', 1);

        $billingRes = $this->actingAs($this->centerUserA, 'sanctum')
            ->getJson('/api/v1/booking-centers/billing-records');

        $billingRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.request_reference', $req->request_reference);
    }

    /** 12. Cross-center isolation: Center B cannot see Center A's financial billing records. */
    public function test_center_b_cannot_see_center_a_billing_records(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        // Center B queries billing records -> must be empty
        $response = $this->actingAs($this->centerUserB, 'sanctum')
            ->getJson('/api/v1/booking-centers/billing-records');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 13. Read-Only Invariant: Reporting queries never alter quota_balance or transactions. */
    public function test_reporting_is_strictly_read_only_with_zero_side_effects(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $initialQuotaA = $this->centerA->fresh()->quota_balance;
        $initialTxCount = BookingTransaction::count();
        $initialReqCount = PackagePurchaseRequest::count();

        // Perform multiple reporting API requests
        $this->actingAs($this->adminUser, 'sanctum')->getJson('/api/v1/admin/financial-reports/summary');
        $this->actingAs($this->adminUser, 'sanctum')->getJson('/api/v1/admin/financial-reports/payments');
        $this->actingAs($this->centerUserA, 'sanctum')->getJson('/api/v1/booking-centers/financial-summary');
        $this->actingAs($this->centerUserA, 'sanctum')->getJson('/api/v1/booking-centers/billing-records');

        $this->assertEquals($initialQuotaA, $this->centerA->fresh()->quota_balance);
        $this->assertEquals($initialTxCount, BookingTransaction::count());
        $this->assertEquals($initialReqCount, PackagePurchaseRequest::count());
    }

    /** 14. No double counting of the same approved transaction. */
    public function test_no_double_counting_of_approved_transactions(): void
    {
        $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
        $this->workflowService->approveRequest($req, $this->adminUser);

        $summary1 = $this->reportingService->getPlatformFinancialSummary();
        $summary2 = $this->reportingService->getPlatformFinancialSummary();

        $this->assertEquals(5000.00, $summary1['total_revenue_dzd']);
        $this->assertEquals(5000.00, $summary2['total_revenue_dzd']);
        $this->assertEquals(1, $summary1['metrics']['total_approved_sales_count']);
    }

    public function test_platform_payments_pagination_contract_and_page_isolation(): void
    {
        for ($i = 0; $i < 25; $i++) {
            $req = $this->workflowService->createRequest($this->centerA, $this->pkg100, [], $this->centerUserA);
            $this->workflowService->approveRequest($req, $this->adminUser);
        }

        $resPage1 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/payments?page=1&per_page=10');

        $resPage1->assertStatus(200)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10);

        $data1 = $resPage1->json('data');
        $this->assertCount(10, $data1);
        $page1Ids = array_column($data1, 'id');

        $resPage2 = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/financial-reports/payments?page=2&per_page=10');

        $resPage2->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10);

        $data2 = $resPage2->json('data');
        $this->assertCount(10, $data2);
        $page2Ids = array_column($data2, 'id');

        $overlap = array_intersect($page1Ids, $page2Ids);
        $this->assertEmpty($overlap, 'Platform Payments Page 1 and Page 2 must not overlap.');
    }
}
