<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'patient_registered',
                'display_name' => 'Registered Patient',
                'description' => 'Patient with a fully registered account and medical record access.',
            ],
            [
                'name' => 'patient_guest',
                'display_name' => 'Guest Patient',
                'description' => 'Temporary patient with booking code access.',
            ],
            [
                'name' => 'doctor',
                'display_name' => 'Doctor / Clinician',
                'description' => 'Licensed physician with clinical and diagnostic authority.',
            ],
            [
                'name' => 'doctor_assistant',
                'display_name' => 'Doctor Assistant',
                'description' => 'Clinical support staff operating under clinic director delegation.',
            ],
            [
                'name' => 'booking_center',
                'display_name' => 'Booking Center',
                'description' => 'Institutional booking agent managing bulk appointment requests.',
            ],
            [
                'name' => 'lab',
                'display_name' => 'Laboratory Manager',
                'description' => 'Medical analysis laboratory manager and validator.',
            ],
            [
                'name' => 'lab_assistant',
                'display_name' => 'Laboratory Assistant',
                'description' => 'Laboratory technician and sample processing operator.',
            ],
            [
                'name' => 'radiology',
                'display_name' => 'Radiology Manager',
                'description' => 'Radiology center manager and radiologist.',
            ],
            [
                'name' => 'rad_assistant',
                'display_name' => 'Radiology Assistant',
                'description' => 'Radiology imaging technician and operational assistant.',
            ],
            [
                'name' => 'admin',
                'display_name' => 'Platform Administrator',
                'description' => 'Superuser with full platform management and audit access.',
            ],
            [
                'name' => 'admin_assistant',
                'display_name' => 'Admin Assistant',
                'description' => 'Delegated platform operator for support and content moderation.',
            ],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name']],
                [
                    'display_name' => $roleData['display_name'],
                    'description' => $roleData['description'],
                ]
            );
        }
    }
}
