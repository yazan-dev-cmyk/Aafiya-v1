<?php

namespace App\Traits;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

trait Has4DAuthorization
{
    /**
     * The roles that belong to the user.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user')->withTimestamps();
    }

    /**
     * Check if user has a specific role or any role in array.
     */
    public function hasRole(string|array $roles): bool
    {
        $roleList = is_string($roles) ? [$roles] : $roles;

        if ($this->relationLoaded('roles')) {
            return $this->roles->pluck('name')->intersect($roleList)->isNotEmpty();
        }

        return $this->roles()->whereIn('roles.name', $roleList)->exists();
    }

    /**
     * Assign one or multiple roles to user.
     */
    public function assignRole(Role|string ...$roles): self
    {
        foreach ($roles as $role) {
            if (is_string($role)) {
                $roleModel = Role::where('name', $role)->firstOrFail();
                $this->roles()->syncWithoutDetaching([$roleModel->id]);
            } elseif ($role instanceof Role) {
                $this->roles()->syncWithoutDetaching([$role->id]);
            }
        }

        $this->load('roles.permissions');

        return $this;
    }

    /**
     * Get all unique permissions across all user roles.
     */
    public function getAllPermissions(): Collection
    {
        return $this->roles->flatMap(function (Role $role) {
            return $role->permissions;
        })->unique('name')->values();
    }

    /**
     * Check if user has a specific direct role-level permission.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->getAllPermissions()->contains('name', $permission);
    }

    /**
     * Normalize legacy doctor assistant permission aliases to standard names.
     */
    public static function normalizeAssistantPermission(string $permission): string
    {
        return match ($permission) {
            'appointments.view' => 'booking.manage_queue',
            'appointments.create' => 'booking.create',
            'patients.view' => 'patient.view_contacts',
            'booking.confirm_quota' => 'booking.confirm',
            default => $permission,
        };
    }

    /**
     * Layer 4: Permission Ceiling Rule (P2 Frozen Hard Constraint)
     * Returns true if permission can be legally delegated to the given role.
     */
    public static function canDelegatePermissionToRole(string $role, string $permission): bool
    {
        if ($role === 'doctor_assistant') {
            $allowedDelegations = [
                'booking.manage_queue',
                'booking.confirm_attendance',
                'booking.create',
                'patient.view_contacts',
                'booking.confirm',
            ];

            return in_array(self::normalizeAssistantPermission($permission), $allowedDelegations, true);
        }

        if ($role === 'admin_assistant') {
            $allowedDelegations = [
                'platform.manage_users',
                'platform.manage_ads',
                'platform.view_audit_logs',
                'platform.view_dashboard',
                'platform.view_statistics',
                'platform.view_tasks',
                'platform.view_requests',
                'platform.review_requests',
                'platform.approve_requests',
                'platform.reject_requests',
                'platform.request_more_info',
                'platform.view_docs',
                'platform.review_docs',
                'platform.approve_docs',
                'platform.request_info_docs',
                'platform.view_tickets',
                'platform.reply_tickets',
                'platform.close_tickets',
                'platform.escalate_tickets',
                'platform.view_notifications',
                'platform.create_notifications',
                'platform.edit_notifications',
                'platform.delete_notifications',
                'platform.publish_notifications',
                'platform.view_operational_reports',
                'platform.export_reports',
                'platform.print_reports',
                'platform.view_financial_reports',
                'platform.edit_users',
                'platform.suspend_users',
                'platform.delete_users',
            ];

            return in_array($permission, $allowedDelegations, true);
        }

        if ($role === 'lab_assistant') {
            $allowedDelegations = [
                'lab.manage_orders',
                'lab.enter_results',
            ];

            return in_array($permission, $allowedDelegations, true);
        }

        if ($role === 'rad_assistant') {
            $allowedDelegations = [
                'radiology.manage_orders',
                'radiology.upload_images',
            ];

            return in_array($permission, $allowedDelegations, true);
        }

        // Default: only allowed if defined
        return true;
    }

    /**
     * 4-Layer Authorization Evaluation Formula (P2 / P10):
     * Effective Permission = Role Permissions ∩ Position Constraints ∩ Scope Constraints ∩ Delegated Permissions
     *
     * @param string $permission Required permission key (e.g. 'clinical.write_rx')
     * @param string|null $position Position in clinic (e.g. 'director', 'doctor')
     * @param array|null $scope Scope parameters (e.g. ['clinic_id' => ..., 'doctor_id' => ...])
     * @param array|null $delegatedPermissions Explicit delegated permissions list for assistants
     * @return bool
     */
    public function has4DAccess(
        string $permission,
        ?string $position = null,
        ?array $scope = null,
        ?array $delegatedPermissions = null
    ): bool {
        // Admin override for global platform capabilities
        if ($this->hasRole('admin')) {
            return true;
        }

        // Layer 1: Identity Role check
        if ($this->hasRole('doctor')) {
            // Unverified doctor cannot execute clinical, administrative, or booking operations
            if ($this->doctor && $this->doctor->is_verified === false) {
                return false;
            }

            // Layer 2: Position check (Director vs Employed Doctor)
            if ($position === 'director') {
                // Director has full clinical and administrative authority within clinic
                return in_array($permission, [
                    'clinic.manage_settings',
                    'clinic.view_analytics',
                    'clinic.create_staff',
                    'clinical.write_rx',
                    'clinical.view_ehr',
                    'booking.manage_queue',
                    'booking.confirm_quota',
                    'booking.create',
                    'booking.confirm_attendance',
                    'patient.view_contacts',
                ], true);
            }

            // Employed doctor
            if ($position === 'doctor' || $position === null) {
                // Administrative permissions are strictly forbidden for employed doctor
                $adminPermissions = [
                    'clinic.manage_settings',
                    'clinic.view_analytics',
                    'clinic.create_staff',
                ];

                if (in_array($permission, $adminPermissions, true)) {
                    return false;
                }

                // Clinical permissions
                return $this->hasPermission($permission);
            }
        }

        // Assistant evaluation with Hard Permission Ceiling
        if ($this->hasRole('doctor_assistant')) {
            // Verify permission is not beyond the ceiling
            if (! self::canDelegatePermissionToRole('doctor_assistant', $permission)) {
                return false;
            }

            $normalizedCheck = self::normalizeAssistantPermission($permission);
            $permNames = array_unique([
                $permission,
                $normalizedCheck,
                ($normalizedCheck === 'booking.confirm' ? 'booking.confirm_quota' : $normalizedCheck),
            ]);

            // If scope is provided, check relational scoped permissions first
            if (isset($scope['clinic_id'])) {
                $scopedQuery = $this->scopedPermissions()
                    ->where('scope_type', 'clinic')
                    ->where('scope_id', $scope['clinic_id']);

                if ($scopedQuery->exists()) {
                    return (clone $scopedQuery)
                        ->where('is_active', true)
                        ->whereHas('permission', fn ($q) => $q->whereIn('name', $permNames))
                        ->exists();
                }
            }

            // If delegated permissions list is provided, verify it is included
            if ($delegatedPermissions !== null) {
                $normalizedDelegated = array_map([self::class, 'normalizeAssistantPermission'], $delegatedPermissions);
                return in_array($normalizedCheck, $normalizedDelegated, true);
            }

            return false;
        }

        // Admin Assistant evaluation with Hard Permission Ceiling & Scoped Relational Delegation
        if ($this->hasRole('admin_assistant')) {
            if (!self::canDelegatePermissionToRole('admin_assistant', $permission)) {
                return false;
            }

            // Check relational scoped permission assignments for platform scope
            $hasPlatformScoped = $this->scopedPermissions()
                ->where('scope_type', 'platform')
                ->where('is_active', true)
                ->whereHas('permission', fn ($q) => $q->where('name', $permission))
                ->exists();

            if ($hasPlatformScoped) {
                return true;
            }

            // If explicit delegated permissions list provided
            if ($delegatedPermissions !== null) {
                return in_array($permission, $delegatedPermissions, true);
            }

            return $this->hasPermission($permission);
        }

        // Lab Assistant evaluation with Hard Permission Ceiling & Scoped Delegation
        if ($this->hasRole('lab_assistant')) {
            if (! self::canDelegatePermissionToRole('lab_assistant', $permission)) {
                return false;
            }

            if (isset($scope['diagnostic_center_id'])) {
                $hasRelational = $this->scopedPermissions()
                    ->where('scope_type', 'diagnostic_center')
                    ->where('scope_id', $scope['diagnostic_center_id'])
                    ->where('is_active', true)
                    ->whereHas('permission', fn ($q) => $q->where('name', $permission))
                    ->exists();

                if ($hasRelational) {
                    return true;
                }
            }

            if ($delegatedPermissions !== null) {
                return in_array($permission, $delegatedPermissions, true);
            }

            return $this->hasPermission($permission);
        }

        // Radiology Assistant evaluation with Hard Permission Ceiling & Scoped Delegation
        if ($this->hasRole('rad_assistant')) {
            if (! self::canDelegatePermissionToRole('rad_assistant', $permission)) {
                return false;
            }

            if (isset($scope['diagnostic_center_id'])) {
                $hasRelational = $this->scopedPermissions()
                    ->where('scope_type', 'diagnostic_center')
                    ->where('scope_id', $scope['diagnostic_center_id'])
                    ->where('is_active', true)
                    ->whereHas('permission', fn ($q) => $q->where('name', $permission))
                    ->exists();

                if ($hasRelational) {
                    return true;
                }
            }

            if ($delegatedPermissions !== null) {
                return in_array($permission, $delegatedPermissions, true);
            }

            return $this->hasPermission($permission);
        }

        // Standard role permission check for other roles (patient, lab, radiology, etc.)
        return $this->hasPermission($permission);
    }

    /**
     * Evaluate 4D authorization within the context of a specific Clinic entity.
     */
    public function hasClinicAccess(string $permission, string $clinicId): bool
    {
        if ($this->hasRole('admin')) {
            return true;
        }

        if ($this->hasRole('doctor')) {
            $position = $this->doctor?->getPositionInClinic($clinicId);
            if (! $position) {
                // Doctor is not affiliated with this clinic
                return false;
            }

            // Suspended employed doctor cannot execute operations in this clinic
            if ($position !== 'director' && ! $this->doctor?->isDoctorActiveInClinic($clinicId)) {
                return false;
            }

            return $this->has4DAccess($permission, position: $position, scope: ['clinic_id' => $clinicId]);
        }

        if ($this->hasRole('doctor_assistant')) {
            $assistant = $this->clinicAssistant;
            if (! $assistant || $assistant->clinic_id !== $clinicId || ! $assistant->is_active) {
                return false;
            }

            // Verify permission is within Hard Permission Ceiling
            if (! self::canDelegatePermissionToRole('doctor_assistant', $permission)) {
                return false;
            }

            $normalizedCheck = self::normalizeAssistantPermission($permission);
            $permNames = array_unique([
                $permission,
                $normalizedCheck,
                ($normalizedCheck === 'booking.confirm' ? 'booking.confirm_quota' : $normalizedCheck),
            ]);

            // Authoritative check: If scoped records exist for this clinic, evaluate solely against active scoped assignments
            $scopedQuery = $this->scopedPermissions()
                ->where('scope_type', 'clinic')
                ->where('scope_id', $clinicId);

            if ($scopedQuery->exists()) {
                return (clone $scopedQuery)
                    ->where('is_active', true)
                    ->whereHas('permission', fn ($q) => $q->whereIn('name', $permNames))
                    ->exists();
            }

            // Fallback for legacy records without scoped_permission_assignments table rows
            if ($assistant->permissions_json !== null) {
                $normalizedJson = array_map([self::class, 'normalizeAssistantPermission'], $assistant->permissions_json);
                return in_array($normalizedCheck, $normalizedJson, true);
            }

            $normalizedDelegated = array_map([self::class, 'normalizeAssistantPermission'], $assistant->getDelegatedPermissions());
            return in_array($normalizedCheck, $normalizedDelegated, true);
        }

        return $this->has4DAccess($permission, scope: ['clinic_id' => $clinicId]);
    }

    /**
     * Evaluate 4D authorization within the context of a specific Diagnostic Center entity.
     */
    public function hasDiagnosticCenterAccess(string $permission, string $centerId): bool
    {
        if ($this->hasRole('admin')) {
            return true;
        }

        // Diagnostic Center Manager/Director
        if ($this->hasRole('lab') || $this->hasRole('radiology')) {
            $isManager = $this->managedDiagnosticCenters()
                ->where('id', $centerId)
                ->where('is_active', true)
                ->exists();

            if (! $isManager) {
                return false;
            }

            return $this->has4DAccess(
                $permission,
                position: 'director',
                scope: ['diagnostic_center_id' => $centerId]
            );
        }

        // Diagnostic Staff (Lab or Rad Assistant)
        if ($this->hasRole('lab_assistant') || $this->hasRole('rad_assistant')) {
            $staff = $this->diagnosticStaffProfile;
            if (! $staff || $staff->diagnostic_center_id !== $centerId || ! $staff->is_active || $staff->trashed()) {
                return false;
            }

            // Check relational scoped permissions first
            $hasRelational = $this->scopedPermissions()
                ->where('scope_type', 'diagnostic_center')
                ->where('scope_id', $centerId)
                ->where('is_active', true)
                ->whereHas('permission', fn ($q) => $q->where('name', $permission))
                ->exists();

            if ($hasRelational) {
                return true;
            }

            return $this->has4DAccess(
                $permission,
                position: $staff->role_type,
                scope: ['diagnostic_center_id' => $centerId],
                delegatedPermissions: $staff->getDelegatedPermissions()
            );
        }

        return false;
    }
}
