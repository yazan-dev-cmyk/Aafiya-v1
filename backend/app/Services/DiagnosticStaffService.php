<?php

namespace App\Services;

use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\DiagnosticStaff;
use App\Models\LaboratorySample;
use App\Models\RadiologyReport;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DiagnosticStaffService
{
    public function __construct(
        protected AuthorizationService $authorizationService
    ) {}

    /**
     * Authorize that the actor is the active manager/director of this diagnostic center or platform admin.
     *
     * @throws AuthorizationException
     */
    public function authorizeManager(User $actor, DiagnosticCenter $center): void
    {
        if ($actor->hasRole('admin')) {
            return;
        }

        if ($center->user_id !== $actor->id) {
            throw new AuthorizationException('غير مصرح: هذه العملية مخصصة لمدير هذا المركز التشخيصي فقط.');
        }

        if (! $actor->is_active) {
            throw new AuthorizationException('غير مصرح: حساب مدير المركز التشخيصي معطل.');
        }
    }

    /**
     * Verify that target staff belongs to the diagnostic center.
     *
     * @throws AuthorizationException
     */
    public function verifyStaffBelongsToCenter(DiagnosticCenter $center, DiagnosticStaff $staff): void
    {
        if ($staff->diagnostic_center_id !== $center->id) {
            throw new AuthorizationException('غير مصرح: الموظف غير مسجل ضمن هذا المركز التشخيصي.');
        }
    }

    /**
     * Create a new diagnostic employee (Single-Institution Invariant enforced).
     *
     * @throws AuthorizationException|ValidationException
     */
    public function createStaff(User $manager, DiagnosticCenter $center, array $data): DiagnosticStaff
    {
        $this->authorizeManager($manager, $center);

        // Determine appropriate role based on center type
        $roleName = ($center->type === 'radiology') ? 'rad_assistant' : 'lab_assistant';

        // Check if user with this email already exists
        $existingUser = User::where('email', $data['email'])->first();
        if ($existingUser) {
            throw ValidationException::withMessages([
                'email' => ['البريد الإلكتروني مسجل مسبقاً في المنظومة.'],
            ]);
        }

        // Sanitize requested permissions against the Hard Permission Ceiling
        $requestedPermissions = $data['permissions_json'] ?? null;
        if ($requestedPermissions === null) {
            // Default permissions based on role
            $requestedPermissions = ($roleName === 'rad_assistant')
                ? ['radiology.manage_orders', 'radiology.upload_images']
                : ['lab.manage_orders', 'lab.enter_results'];
        }

        $sanitizedPermissions = $this->authorizationService->sanitizeDelegatedPermissions(
            $roleName,
            $requestedPermissions
        );

        return DB::transaction(function () use ($manager, $center, $data, $roleName, $sanitizedPermissions) {
            // Create user account
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? '+213550000000',
                'is_active' => true,
            ]);

            $user->assignRole($roleName);

            // Single-Institution Defense in Depth: Verify user does not already have a staff profile
            if (DiagnosticStaff::where('user_id', $user->id)->exists()) {
                throw new \RuntimeException('Single-institution invariant violation: user already attached to diagnostic staff profile.');
            }

            // Sync relational scoped permission assignments
            $this->authorizationService->delegatePermissions(
                $manager,
                $user,
                'diagnostic_center',
                $center->id,
                $sanitizedPermissions
            );

            return DiagnosticStaff::create([
                'diagnostic_center_id' => $center->id,
                'user_id' => $user->id,
                'role_type' => $data['role_type'] ?? 'technician',
                'permissions_json' => $sanitizedPermissions,
                'created_by_id' => $manager->id,
                'is_active' => true,
            ]);
        });
    }

    /**
     * Update an employee's delegated permissions with Hard Permission Ceiling enforcement.
     *
     * @throws AuthorizationException
     */
    public function updateStaffPermissions(
        User $manager,
        DiagnosticCenter $center,
        DiagnosticStaff $staff,
        array $permissions
    ): DiagnosticStaff {
        $this->authorizeManager($manager, $center);
        $this->verifyStaffBelongsToCenter($center, $staff);

        $roleName = ($center->type === 'radiology') ? 'rad_assistant' : 'lab_assistant';

        // Enforce hard ceiling
        $sanitized = $this->authorizationService->sanitizeDelegatedPermissions(
            $roleName,
            $permissions
        );

        return DB::transaction(function () use ($manager, $center, $staff, $sanitized) {
            $staffUser = $staff->user;
            if ($staffUser) {
                $this->authorizationService->delegatePermissions(
                    $manager,
                    $staffUser,
                    'diagnostic_center',
                    $center->id,
                    $sanitized
                );
            }

            $staff->update([
                'permissions_json' => $sanitized,
            ]);

            return $staff->fresh(['user', 'center']);
        });
    }

    /**
     * Toggle active/suspended status of an employee (Director only).
     *
     * @throws AuthorizationException
     */
    public function toggleStaffStatus(
        User $manager,
        DiagnosticCenter $center,
        DiagnosticStaff $staff,
        bool $isActive
    ): DiagnosticStaff {
        $this->authorizeManager($manager, $center);
        $this->verifyStaffBelongsToCenter($center, $staff);

        $staff->update(['is_active' => $isActive]);

        return $staff->fresh(['user', 'center']);
    }

    /**
     * Remove / soft-delete an employee from the diagnostic center (Director only).
     * The User account is strictly preserved for historical attribution.
     *
     * @throws AuthorizationException
     */
    public function deleteStaff(User $manager, DiagnosticCenter $center, DiagnosticStaff $staff): bool
    {
        $this->authorizeManager($manager, $center);
        $this->verifyStaffBelongsToCenter($center, $staff);

        return DB::transaction(function () use ($staff) {
            return (bool) $staff->delete(); // Soft delete via SoftDeletes trait
        });
    }

    /**
     * Retrieve unified details of a single staff member in the diagnostic center.
     *
     * @throws AuthorizationException
     */
    public function getStaffDetail(User $manager, DiagnosticCenter $center, string $staffId): array
    {
        $this->authorizeManager($manager, $center);

        $staff = $center->staff()
            ->with(['user', 'creator'])
            ->where(function ($q) use ($staffId) {
                $q->where('diagnostic_staff.id', $staffId)
                    ->orWhere('diagnostic_staff.user_id', $staffId);
            })
            ->first();

        if (! $staff) {
            abort(404, 'الموظف المطلوب غير مسجل ضمن كوادر هذا المركز التشخيصي.');
        }

        $delegatedPermissions = $staff->getDelegatedPermissions();

        return [
            'id' => $staff->id,
            'user_id' => $staff->user_id,
            'diagnostic_center_id' => $staff->diagnostic_center_id,
            'name' => $staff->user?->name,
            'email' => $staff->user?->email,
            'phone' => $staff->user?->phone,
            'role_type' => $staff->role_type,
            'is_active' => (bool) $staff->is_active,
            'created_at' => $staff->created_at?->toISOString(),
            'delegated_permissions' => $delegatedPermissions,
            'permissions' => $delegatedPermissions,
            'center' => [
                'id' => $center->id,
                'name' => $center->name,
                'type' => $center->type,
            ],
        ];
    }

    /**
     * Authorize that the user has operational access to this center:
     * - Platform Admin
     * - Center Director (user_id === center.user_id)
     * - Active, non-deleted Staff assigned to this center with domain compatibility.
     *
     * @throws AuthorizationException
     */
    public function authorizeCenterAccess(User $user, DiagnosticCenter $center): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($center->user_id === $user->id) {
            if (! $user->is_active) {
                throw new AuthorizationException('غير مصرح: حساب مدير المركز التشخيصي معطل.');
            }
            return;
        }

        // Cross-domain role protection
        if ($center->type === 'laboratory' && $user->hasRole('rad_assistant')) {
            throw new AuthorizationException('غير مصرح: موظف الأشعة لا يملك صلاحية العمل على المخابر الطبية.');
        }

        if ($center->type === 'radiology' && $user->hasRole('lab_assistant')) {
            throw new AuthorizationException('غير مصرح: موظف المخبر لا يملك صلاحية العمل على مراكز الأشعة.');
        }

        if (! $center->is_active) {
            throw new AuthorizationException('غير مصرح: المركز التشخيصي غير نشط.');
        }

        $staff = $user->diagnosticStaffProfile;
        if (! $staff || $staff->diagnostic_center_id !== $center->id || ! $staff->is_active || $staff->trashed()) {
            throw new AuthorizationException('غير مصرح: حساب موظف المركز غير نشط أو غير مسجل في هذا المركز.');
        }
    }

    /**
     * Compute operational metrics for the diagnostic center.
     *
     * @return array<string, mixed>
     */
    public function getCenterOperationalAnalytics(DiagnosticCenter $center): array
    {
        $centerId = $center->id;
        $isLab = ($center->type === 'laboratory');

        $orderTypes = $isLab ? ['laboratory', 'both'] : ['radiology', 'both'];

        $ordersBase = DiagnosticOrder::where('diagnostic_center_id', $centerId)
            ->whereIn('order_type', $orderTypes);

        $totalOrders = (clone $ordersBase)->count();
        $pendingOrders = (clone $ordersBase)->where('status', 'pending')->count();
        $processingOrders = (clone $ordersBase)->whereIn('status', ['received', 'processing'])->count();
        $completedOrders = (clone $ordersBase)->whereIn('status', ['resulted', 'finalized'])->count();
        $statOrders = (clone $ordersBase)->where('priority', 'stat')->count();
        $urgentOrders = (clone $ordersBase)->where('priority', 'urgent')->count();

        if ($isLab) {
            $samplesReceived = LaboratorySample::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
                ->where('status', '!=', 'rejected')
                ->count();

            $samplesRejected = LaboratorySample::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
                ->where('status', 'rejected')
                ->count();

            $testsCompleted = DiagnosticOrderItem::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
                ->whereIn('status', ['resulted', 'finalized'])
                ->count();

            // Calculate average TAT in minutes for completed orders
            $completedOrderDates = (clone $ordersBase)
                ->whereIn('status', ['resulted', 'finalized'])
                ->whereNotNull('ordered_at')
                ->select(['ordered_at', 'updated_at'])
                ->get();

            $avgTatMinutes = null;
            if ($completedOrderDates->isNotEmpty()) {
                $totalMinutes = $completedOrderDates->sum(function ($ord) {
                    $start = $ord->ordered_at;
                    $end = $ord->updated_at ?? now();
                    return max(1, (int) $start->diffInMinutes($end));
                });
                $avgTatMinutes = round($totalMinutes / $completedOrderDates->count(), 1);
            }

            $totalSampleInteractions = $samplesReceived + $samplesRejected;
            $acceptanceRate = ($totalSampleInteractions > 0)
                ? round(($samplesReceived / $totalSampleInteractions) * 100, 1)
                : null;

            // Categories breakdown
            $categoriesRaw = DiagnosticOrderItem::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
                ->selectRaw('COALESCE(test_name, "General") as cat, count(*) as count')
                ->groupBy('cat')
                ->pluck('count', 'cat')
                ->toArray();

            $totalCatItems = array_sum($categoriesRaw);
            $categoryDistribution = [];
            foreach ($categoriesRaw as $catName => $cnt) {
                $pct = ($totalCatItems > 0) ? round(($cnt / $totalCatItems) * 100, 1) : 0;
                $categoryDistribution[] = [
                    'name' => $catName,
                    'count' => $cnt,
                    'percentage' => $pct,
                ];
            }

            return [
                'center_id' => $centerId,
                'center_type' => 'laboratory',
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'processing_orders' => $processingOrders,
                'completed_orders' => $completedOrders,
                'stat_orders' => $statOrders,
                'urgent_orders' => $urgentOrders,
                'samples_received' => $samplesReceived,
                'samples_rejected' => $samplesRejected,
                'tests_completed' => $testsCompleted,
                'average_tat_minutes' => $avgTatMinutes,
                'acceptance_rate' => $acceptanceRate,
                'distribution' => $categoryDistribution,
            ];
        }

        // Radiology analytics
        $totalScans = RadiologyReport::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))->count();

        $uploadedImagesCount = RadiologyReport::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
            ->get()
            ->sum(fn ($r) => count($r->image_urls_json ?? []));

        $completedReports = RadiologyReport::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
            ->whereNotNull('reported_at')
            ->with('order')
            ->get();

        $avgTatMinutes = null;
        if ($completedReports->isNotEmpty()) {
            $totalMins = $completedReports->sum(function ($r) {
                $start = $r->order?->ordered_at ?? $r->created_at;
                $end = $r->reported_at ?? now();
                return max(1, (int) $start->diffInMinutes($end));
            });
            $avgTatMinutes = round($totalMins / $completedReports->count(), 1);
        }

        $modalitiesRaw = RadiologyReport::whereHas('order', fn ($q) => $q->where('diagnostic_center_id', $centerId))
            ->selectRaw('COALESCE(modality, "X-Ray") as mod_name, count(*) as count')
            ->groupBy('mod_name')
            ->pluck('count', 'mod_name')
            ->toArray();

        $totalModScans = array_sum($modalitiesRaw);
        $modalityDistribution = [];
        foreach ($modalitiesRaw as $modName => $cnt) {
            $pct = ($totalModScans > 0) ? round(($cnt / $totalModScans) * 100, 1) : 0;
            $modalityDistribution[] = [
                'modality' => $modName,
                'count' => $cnt,
                'percentage' => $pct,
            ];
        }

        return [
            'center_id' => $centerId,
            'center_type' => 'radiology',
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'processing_orders' => $processingOrders,
            'completed_orders' => $completedOrders,
            'stat_orders' => $statOrders,
            'urgent_orders' => $urgentOrders,
            'total_scans' => $totalScans,
            'uploaded_images_count' => $uploadedImagesCount,
            'average_tat_minutes' => $avgTatMinutes,
            'distribution' => $modalityDistribution,
        ];
    }

    /**
     * Retrieve notifications for this center and user.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getCenterNotifications(DiagnosticCenter $center, User $user): array
    {
        $raw = DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return $raw->map(function ($n) {
            $data = is_string($n->data) ? json_decode($n->data, true) : (array) $n->data;
            return [
                'id' => $n->id,
                'type' => $data['type'] ?? 'info',
                'title' => $data['title'] ?? 'إشعار جديد',
                'content' => $data['content'] ?? $data['body'] ?? '',
                'severity' => $data['severity'] ?? 'normal',
                'author' => $data['author'] ?? null,
                'created_at' => $n->created_at,
                'read' => ($n->read_at !== null),
                'order_id' => $data['order_id'] ?? null,
            ];
        })->toArray();
    }

    /**
     * Mark a single notification as read.
     */
    public function markNotificationRead(User $user, string $notificationId): bool
    {
        return (bool) DB::table('notifications')
            ->where('id', $notificationId)
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);
    }

    /**
     * Mark all notifications for the user as read.
     */
    public function markAllNotificationsRead(User $user, DiagnosticCenter $center): int
    {
        return DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);
    }

    /**
     * Create and broadcast an operational directive from Center Director to staff.
     */
    public function createCenterDirective(User $manager, DiagnosticCenter $center, array $data): array
    {
        $this->authorizeManager($manager, $center);

        $staffUsers = $center->staff()
            ->where('is_active', true)
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter();

        $notificationId = (string) Str::uuid();
        $now = now();

        $notificationsToInsert = [];
        // Add to staff
        foreach ($staffUsers as $sUser) {
            $notificationsToInsert[] = [
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\OperationalDirectiveNotification',
                'notifiable_type' => User::class,
                'notifiable_id' => $sUser->id,
                'data' => json_encode([
                    'type' => 'directive',
                    'title' => $data['title'],
                    'content' => $data['content'],
                    'severity' => $data['priority'] ?? 'important',
                    'author' => $manager->name,
                    'center_id' => $center->id,
                ]),
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Also add to manager for their own record
        $notificationsToInsert[] = [
            'id' => $notificationId,
            'type' => 'App\\Notifications\\OperationalDirectiveNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $manager->id,
            'data' => json_encode([
                'type' => 'directive',
                'title' => $data['title'],
                'content' => $data['content'],
                'severity' => $data['priority'] ?? 'important',
                'author' => $manager->name,
                'center_id' => $center->id,
            ]),
            'read_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        DB::table('notifications')->insert($notificationsToInsert);

        return [
            'id' => $notificationId,
            'title' => $data['title'],
            'content' => $data['content'],
            'priority' => $data['priority'] ?? 'important',
            'recipients_count' => count($staffUsers),
            'created_at' => $now->toISOString(),
        ];
    }
}
