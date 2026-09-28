<?php

namespace App\Services;

use App\Models\User;

class AuthorizationService
{
    /**
     * Evaluate 4D Authorization for a given user on a permission within context.
     *
     * @param User $user The authenticated user
     * @param string $permission The required permission key
     * @param string|null $position Position context (e.g. 'director', 'doctor')
     * @param array|null $scope Scope context (e.g. ['clinic_id' => ..., 'doctor_id' => ...])
     * @param array|null $delegatedPermissions Delegated permissions list for assistant
     * @return bool
     */
    public function authorize(
        User $user,
        string $permission,
        ?string $position = null,
        ?array $scope = null,
        ?array $delegatedPermissions = null
    ): bool {
        return $user->has4DAccess($permission, $position, $scope, $delegatedPermissions);
    }

    /**
     * Check if a permission exceeds the permission ceiling for a role.
     */
    public function canDelegate(string $role, string $permission): bool
    {
        return User::canDelegatePermissionToRole($role, $permission);
    }

    /**
     * Validate and filter a proposed delegation list against the hard permission ceiling.
     *
     * @param string $role
     * @param array<string> $requestedPermissions
     * @return array<string>
     */
    public function sanitizeDelegatedPermissions(string $role, array $requestedPermissions): array
    {
        return array_values(array_filter($requestedPermissions, function (string $permission) use ($role) {
            return $this->canDelegate($role, $permission);
        }));
    }

    /**
     * Atomically delegate individual permissions to an assistant within a specified scope.
     * Enforces Hard Permission Ceiling, records P7 Grant/Revoke audit trail, and prevents duplicate active assignments.
     *
     * @param User $actor The authorized manager/director/admin
     * @param User $targetUser The assistant receiving delegations
     * @param string $scopeType 'clinic', 'diagnostic_center', 'platform'
     * @param string $scopeId Clinic UUID, diagnostic center UUID, or 'global'
     * @param array<string> $permissionNames
     * @return array<string> The effective saved permission names
     */
    public function delegatePermissions(
        User $actor,
        User $targetUser,
        string $scopeType,
        string $scopeId,
        array $permissionNames
    ): array {
        $primaryRole = $targetUser->roles->first()?->name ?? 'doctor_assistant';
        $sanitizedNames = $this->sanitizeDelegatedPermissions($primaryRole, $permissionNames);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($actor, $targetUser, $scopeType, $scopeId, $sanitizedNames) {
            // 1. Fetch or create Permission models
            $permissions = collect($sanitizedNames)->map(function ($name) {
                return \App\Models\Permission::firstOrCreate(
                    ['name' => $name],
                    [
                        'display_name' => match ($name) {
                            'booking.confirm' => 'Confirm Booking',
                            default => $name,
                        },
                        'category' => 'booking',
                        'description' => 'Delegated operational permission',
                    ]
                );
            });
            $targetPermissionIds = $permissions->pluck('id')->all();

            // 2. Fetch existing active scoped assignments
            $existingAssignments = \App\Models\ScopedPermissionAssignment::forUserAndScope($targetUser->id, $scopeType, $scopeId)
                ->where('is_active', true)
                ->get();

            $existingPermissionIds = $existingAssignments->pluck('permission_id')->all();

            // 3. P7 Revoke: Mark removed permissions as inactive with audit trail (no DELETE)
            $toRevoke = $existingAssignments->filter(fn ($a) => ! in_array($a->permission_id, $targetPermissionIds, true));
            foreach ($toRevoke as $assignment) {
                $assignment->update([
                    'is_active' => false,
                    'revoked_by_id' => $actor->id,
                    'revoked_at' => now(),
                ]);
            }

            // 4. P7 Grant: Insert or re-activate granted permissions
            foreach ($permissions as $permission) {
                $assignment = \App\Models\ScopedPermissionAssignment::forUserAndScope($targetUser->id, $scopeType, $scopeId)
                    ->where('permission_id', $permission->id)
                    ->first();

                if ($assignment) {
                    if (! $assignment->is_active) {
                        $assignment->update([
                            'is_active' => true,
                            'granted_by_id' => $actor->id,
                            'revoked_by_id' => null,
                            'revoked_at' => null,
                        ]);
                    }
                } else {
                    \App\Models\ScopedPermissionAssignment::create([
                        'user_id' => $targetUser->id,
                        'permission_id' => $permission->id,
                        'scope_type' => $scopeType,
                        'scope_id' => $scopeId,
                        'granted_by_id' => $actor->id,
                        'is_active' => true,
                    ]);
                }
            }

            return $permissions->pluck('name')->values()->all();
        });
    }

    /**
     * Retrieve all active delegated permission names for a user within a scope.
     *
     * @return array<string>
     */
    public function getActiveDelegatedPermissions(User $user, string $scopeType, string $scopeId): array
    {
        return \App\Models\ScopedPermissionAssignment::forUserAndScope($user->id, $scopeType, $scopeId)
            ->where('is_active', true)
            ->with('permission')
            ->get()
            ->pluck('permission.name')
            ->filter()
            ->values()
            ->all();
    }
}
