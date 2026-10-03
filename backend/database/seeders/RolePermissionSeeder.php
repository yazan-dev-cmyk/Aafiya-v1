<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rolePermissionsMap = [
            'doctor' => [
                'clinical.write_rx',
                'clinical.view_ehr',
                'booking.manage_queue',
                'booking.confirm_quota',
                'booking.create',
                'booking.confirm_attendance',
                'patient.view_contacts',
            ],
            'doctor_assistant' => [
                'booking.manage_queue',
                'booking.confirm_attendance',
                'booking.create',
                'patient.view_contacts',
            ],
            'patient_registered' => [
                'booking.create',
                'clinical.view_ehr',
            ],
            'patient_guest' => [
                'booking.create',
            ],
            'booking_center' => [
                'booking.create',
                'booking.manage_queue',
            ],
            'lab' => [
                'lab.manage_orders',
                'lab.enter_results',
                'lab.finalize_results',
                'diagnostic.approve_result',
            ],
            'lab_assistant' => [
                'lab.manage_orders',
                'lab.enter_results',
            ],
            'radiology' => [
                'radiology.manage_orders',
                'radiology.upload_images',
                'radiology.finalize_report',
                'diagnostic.approve_result',
            ],
            'rad_assistant' => [
                'radiology.manage_orders',
                'radiology.upload_images',
            ],
            'admin_assistant' => [
                'platform.manage_users',
                'platform.manage_ads',
            ],
            'admin' => [
                'clinic.manage_settings',
                'clinic.view_analytics',
                'clinic.create_staff',
                'clinical.write_rx',
                'clinical.view_ehr',
                'clinical.delete_record',
                'booking.create',
                'booking.manage_queue',
                'booking.confirm_attendance',
                'booking.confirm_quota',
                'patient.view_contacts',
                'lab.manage_orders',
                'lab.enter_results',
                'lab.finalize_results',
                'radiology.manage_orders',
                'radiology.upload_images',
                'radiology.finalize_report',
                'diagnostic.approve_result',
                'platform.manage_users',
                'platform.view_audit_logs',
                'platform.manage_ads',
                'platform.manage_master_data',
            ],
        ];

        foreach ($rolePermissionsMap as $roleName => $permissionNames) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id')->toArray();
                $role->permissions()->sync($permissionIds);
            }
        }
    }
}
