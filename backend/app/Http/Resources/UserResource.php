<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $scopedPerms = $this->relationLoaded('scopedPermissions')
            ? $this->scopedPermissions->where('is_active', true)->pluck('permission.name')->filter()->values()
            : $this->scopedPermissions()->where('is_active', true)->with('permission')->get()->pluck('permission.name')->filter()->values();

        $doctor = $this->doctor;
        $activeClinicId = $request->header('X-Clinic-ID') ?? $request->input('clinic_id');

        $selectedClinic = null;
        if ($doctor && $activeClinicId && $doctor->clinics) {
            $selectedClinic = $doctor->clinics->where('id', $activeClinicId)->first();
        }

        if (! $selectedClinic && $doctor && $doctor->clinics && $doctor->clinics->isNotEmpty()) {
            $selectedClinic = $doctor->clinics->where('pivot.is_primary', true)->first() ?? $doctor->clinics->first();
        }

        $isDirector = false;
        $position = null;

        if ($doctor && $selectedClinic) {
            $position = $selectedClinic->pivot->position ?? ($doctor->isDirectorOf($selectedClinic->id) ? 'director' : 'doctor');
            $isDirector = ($position === 'director') || $doctor->isDirectorOf($selectedClinic->id);
        } elseif (! $doctor && $this->hasRole('doctor_assistant')) {
            $assistant = $this->clinicAssistant;
            if ($assistant && $assistant->is_active && ! $assistant->trashed()) {
                $clinic = $assistant->clinic;
                if ($clinic && $clinic->is_active && ! $clinic->trashed()) {
                    $selectedClinic = $clinic;
                    $position = 'assistant';
                    $isDirector = false;
                }
            }
        }

        $directorPerms = $isDirector ? collect([
            'clinic.manage_settings',
            'clinic.create_staff',
            'clinic.view_analytics',
        ]) : collect();

        $staffProfile = $this->diagnosticStaffProfile;
        $diagnosticStaffData = null;
        if ($staffProfile && ! $staffProfile->trashed()) {
            $center = $staffProfile->center;
            $diagnosticStaffData = [
                'id' => $staffProfile->id,
                'diagnostic_center_id' => $staffProfile->diagnostic_center_id,
                'role_type' => $staffProfile->role_type,
                'is_active' => (bool) $staffProfile->is_active,
                'permissions' => $staffProfile->getDelegatedPermissions(),
                'created_at' => $staffProfile->created_at?->toISOString(),
                'center' => $center ? [
                    'id' => $center->id,
                    'name' => $center->name,
                    'type' => $center->type,
                    'license_number' => $center->license_number,
                    'phone' => $center->phone,
                    'email' => $center->email,
                    'address' => $center->address,
                    'wilaya' => $center->wilaya,
                    'is_active' => (bool) $center->is_active,
                    'manager' => $center->manager ? [
                        'id' => $center->manager->id,
                        'name' => $center->manager->name,
                        'email' => $center->manager->email,
                    ] : null,
                ] : null,
            ];
        }

        $managedCenterData = null;
        if ($this->hasRole('lab') || $this->hasRole('radiology')) {
            $mCenter = $this->managedDiagnosticCenters()->where('is_active', true)->first();
            if ($mCenter) {
                $managedCenterData = [
                    'id' => $mCenter->id,
                    'name' => $mCenter->name,
                    'type' => $mCenter->type,
                    'license_number' => $mCenter->license_number,
                    'phone' => $mCenter->phone,
                    'email' => $mCenter->email,
                    'address' => $mCenter->address,
                    'wilaya' => $mCenter->wilaya,
                    'is_active' => (bool) $mCenter->is_active,
                ];
            }
        }

        $staffPerms = ($staffProfile && ! $staffProfile->trashed() && $staffProfile->is_active)
            ? collect($staffProfile->getDelegatedPermissions())
            : collect();

        $assistantDelegatedPerms = null;
        if ($this->hasRole('doctor_assistant')) {
            $assistant = $this->clinicAssistant;
            $assistantClinicId = $assistant?->clinic_id;

            if ($assistantClinicId && $assistant->is_active) {
                $hasScopedRows = $this->scopedPermissions()
                    ->where('scope_type', 'clinic')
                    ->where('scope_id', $assistantClinicId)
                    ->exists();

                if ($hasScopedRows) {
                    $assistantDelegatedPerms = $this->scopedPermissions()
                        ->where('scope_type', 'clinic')
                        ->where('scope_id', $assistantClinicId)
                        ->where('is_active', true)
                        ->with('permission')
                        ->get()
                        ->pluck('permission.name')
                        ->filter(fn ($p) => \App\Traits\Has4DAuthorization::canDelegatePermissionToRole('doctor_assistant', $p))
                        ->values();
                } elseif ($assistant->permissions_json !== null) {
                    $assistantDelegatedPerms = collect($assistant->permissions_json)
                        ->map(fn ($p) => \App\Traits\Has4DAuthorization::normalizeAssistantPermission($p))
                        ->filter(fn ($p) => \App\Traits\Has4DAuthorization::canDelegatePermissionToRole('doctor_assistant', $p))
                        ->values();
                } else {
                    $assistantDelegatedPerms = collect($assistant->getDelegatedPermissions())
                        ->filter(fn ($p) => \App\Traits\Has4DAuthorization::canDelegatePermissionToRole('doctor_assistant', $p))
                        ->values();
                }
            } else {
                $assistantDelegatedPerms = collect();
            }

            $effectivePermissions = $assistantDelegatedPerms;
        } else {
            $effectivePermissions = $this->getAllPermissions()->pluck('name')
                ->merge($scopedPerms)
                ->merge($directorPerms)
                ->merge($staffPerms)
                ->unique()
                ->values();
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => (bool) $this->is_active,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'roles' => $this->roles->pluck('name')->values(),
            'permissions' => $effectivePermissions,
            'scoped_permissions' => $scopedPerms,
            'delegated_permissions' => $assistantDelegatedPerms ?? $scopedPerms,
            'doctor' => $doctor ? [
                'id' => $doctor->id,
                'specialty' => $doctor->specialty,
                'license_number' => $doctor->license_number,
                'bio' => $doctor->bio,
                'is_verified' => (bool) $doctor->is_verified,
            ] : null,
            'clinic' => $selectedClinic ? [
                'id' => $selectedClinic->id,
                'name' => $selectedClinic->name,
                'position' => $position,
                'is_director' => (bool) $isDirector,
            ] : null,
            'clinics' => ($doctor && $doctor->clinics) ? $doctor->clinics->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'wilaya' => $c->wilaya,
                'address' => $c->address,
                'phone' => $c->phone,
                'position' => $c->pivot->position ?? ($doctor->isDirectorOf($c->id) ? 'director' : 'doctor'),
                'is_director' => ($c->pivot->position === 'director') || $doctor->isDirectorOf($c->id),
                'is_active' => (bool) ($c->pivot->is_active ?? false),
                'is_primary' => (bool) ($c->pivot->is_primary ?? false),
            ])->values() : ($this->hasRole('doctor_assistant') ? ($selectedClinic ? collect([[
                'id' => $selectedClinic->id,
                'name' => $selectedClinic->name,
                'wilaya' => $selectedClinic->wilaya,
                'address' => $selectedClinic->address,
                'phone' => $selectedClinic->phone,
                'position' => 'assistant',
                'is_director' => false,
                'is_active' => (bool) $selectedClinic->is_active,
                'is_primary' => true,
            ]]) : collect()) : null),
            'diagnostic_staff' => $diagnosticStaffData,
            'managed_diagnostic_center' => $managedCenterData,
            'booking_center' => $this->bookingCenter ? [
                'id' => $this->bookingCenter->id,
                'name' => $this->bookingCenter->name,
                'commercial_register' => $this->bookingCenter->commercial_register,
                'phone' => $this->bookingCenter->phone,
                'email' => $this->bookingCenter->email,
                'wilaya' => $this->bookingCenter->wilaya,
                'address' => $this->bookingCenter->address,
                'quota_balance' => (int) $this->bookingCenter->quota_balance,
                'verification_status' => $this->bookingCenter->verification_status,
                'verified_at' => $this->bookingCenter->verified_at?->toISOString(),
                'rejection_reason' => $this->bookingCenter->rejection_reason,
                'is_active' => (bool) $this->bookingCenter->is_active,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
