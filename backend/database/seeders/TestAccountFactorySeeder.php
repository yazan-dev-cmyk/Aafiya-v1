<?php

namespace Database\Seeders;

use App\Models\BookingCenter;
use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticStaff;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestAccountFactorySeeder extends Seeder
{
    /**
     * Run the Master Test Account Factory.
     * Generates exactly 143 real database accounts across 8 roles.
     * Idempotent & non-destructive to existing 14 protected accounts.
     */
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedPatients();
            $this->seedDoctorsAndClinics();
            $this->seedBookingCenters();
            $this->seedBookingCenterAssistants();
            $this->seedLaboratories();
            $this->seedLaboratoryAssistants();
            $this->seedRadiologyCenters();
        });
    }

    /**
     * Helper to retrieve or assign role.
     */
    protected function attachRole(User $user, string $roleName): void
    {
        $role = Role::where('name', $roleName)->first();
        if ($role && ! $user->roles()->where('roles.id', $role->id)->exists()) {
            $user->roles()->attach($role->id);
        }
    }

    /**
     * Dynamically generate next available MRN using canonical EhrService.
     */
    protected function generateNextMrn(): string
    {
        return app(\App\Services\EhrService::class)->generateMrn();
    }

    /**
     * 1. Seed 100 Patients (PAT-001 -> PAT-100)
     */
    protected function seedPatients(): void
    {
        $wilayas = ['Alger', 'Oran', 'Constantine', 'Blida', 'Annaba', 'Setif', 'Batna', 'Tlemcen'];

        for ($i = 1; $i <= 100; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "patient{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-PAT-{$numStr}";
            $phone = "+213550" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مريض اختباري {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'patient_registered');

            $patient = Patient::where('user_id', $user->id)->first();
            if (! $patient) {
                $mrn = $this->generateNextMrn();
                $gender = ($i % 2 === 0) ? 'female' : 'male';
                $wilaya = $wilayas[($i - 1) % count($wilayas)];

                Patient::create([
                    'user_id' => $user->id,
                    'mrn' => $mrn,
                    'first_name' => 'مريض',
                    'last_name' => "اختباري {$numStr}",
                    'gender' => $gender,
                    'date_of_birth' => '1990-01-15',
                    'blood_group' => 'O+',
                    'phone' => $phone,
                    'email' => $email,
                    'address' => "شارع الاختبار {$numStr}",
                    'wilaya' => $wilaya,
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * 2. Seed 10 Doctors across 7 Clinics & 10 Doctor Assistants
     */
    protected function seedDoctorsAndClinics(): void
    {
        $specialties = [
            'Cardiology', 'General Practice', 'Pediatrics', 'Dermatology', 'Neurology',
            'Orthopedics', 'Ophthalmology', 'Internal Medicine', 'ENT', 'Urology'
        ];

        $doctors = [];

        // Create 10 Doctor User & Doctor Profiles
        for ($i = 1; $i <= 10; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "doctor{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-DOC-{$numStr}";
            $phone = "+213551" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "د. طبيب اختباري {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'doctor');

            $doc = Doctor::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'specialty' => $specialties[$i - 1],
                    'license_number' => "LIC-DOC-{$numStr}",
                    'bio' => "طبيب مختص في {$specialties[$i - 1]} - بيئة الاختبار التشغيلية.",
                    'is_verified' => false, // Default initial system state
                ]
            );

            $doctors[$i] = ['user' => $user, 'doctor' => $doc];
        }

        // Create 7 Clinics and establish Doctor affiliations
        // Clinic-01 -> DOC-001 (Director)
        // Clinic-02 -> DOC-002 (Director)
        // Clinic-03 -> DOC-003 (Director)
        // Clinic-04 -> DOC-004 (Director)
        // Clinic-05 -> DOC-005 (Director)
        // Clinic-06 -> DOC-006 (Director), DOC-007 (Doctor position)
        // Clinic-07 -> DOC-008 (Director), DOC-009 (Doctor position), DOC-010 (Doctor position)

        $clinicConfigs = [
            1 => ['director' => 1, 'employed' => []],
            2 => ['director' => 2, 'employed' => []],
            3 => ['director' => 3, 'employed' => []],
            4 => ['director' => 4, 'employed' => []],
            5 => ['director' => 5, 'employed' => []],
            6 => ['director' => 6, 'employed' => [7]],
            7 => ['director' => 8, 'employed' => [9, 10]],
        ];

        $clinics = [];

        foreach ($clinicConfigs as $cIdx => $cfg) {
            $cNumStr = str_pad((string) $cIdx, 2, '0', STR_PAD_LEFT);
            $dirDoc = $doctors[$cfg['director']]['doctor'];

            $clinic = Clinic::firstOrCreate(
                ['name' => "عيادة شفاء الاختبارية {$cNumStr}"],
                [
                    'address' => "شارع المستشفى {$cNumStr}، الجزائر",
                    'wilaya' => 'Alger',
                    'phone' => "+21321" . str_pad((string) $cIdx, 6, '0', STR_PAD_LEFT),
                    'director_doctor_id' => $dirDoc->id,
                    'max_patients_per_slot' => 4,
                    'slot_duration_min' => 15,
                    'is_active' => true,
                ]
            );

            $clinics[$cIdx] = $clinic;

            // Attach Director Doctor to clinic pivot
            if (! $clinic->doctors()->where('doctors.id', $dirDoc->id)->exists()) {
                $clinic->doctors()->attach($dirDoc->id, [
                    'position' => 'director',
                    'is_primary' => true,
                    'is_active' => true,
                    'joined_at' => now(),
                ]);
            }

            // Attach Employed Doctors to clinic pivot with enum 'doctor'
            foreach ($cfg['employed'] as $empDocIdx) {
                $empDoc = $doctors[$empDocIdx]['doctor'];
                if (! $clinic->doctors()->where('doctors.id', $empDoc->id)->exists()) {
                    $clinic->doctors()->attach($empDoc->id, [
                        'position' => 'doctor',
                        'is_primary' => true,
                        'is_active' => true,
                        'joined_at' => now(),
                    ]);
                }
            }
        }

        // Seed 10 Doctor Assistants (AST-001 -> AST-010)
        // AST-001..005 -> Clinic 1..5
        // AST-006, AST-007 -> Clinic 6
        // AST-008, AST-009, AST-010 -> Clinic 7
        $astClinicMap = [
            1 => 1, 2 => 2, 3 => 3, 4 => 4, 5 => 5,
            6 => 6, 7 => 6, 8 => 7, 9 => 7, 10 => 7,
        ];

        for ($i = 1; $i <= 10; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "ast{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-AST-{$numStr}";
            $phone = "+213552" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مساعد طبيب اختباري {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'doctor_assistant');

            $cIdx = $astClinicMap[$i];
            $targetClinic = $clinics[$cIdx];
            $dirUser = $targetClinic->director->user;

            ClinicAssistant::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'clinic_id' => $targetClinic->id,
                    'created_by_id' => $dirUser->id,
                    'permissions_json' => [
                        'booking.manage_queue',
                        'booking.confirm_attendance',
                        'booking.create',
                        'patient.view_contacts',
                    ],
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * 3. Seed 5 Booking Centers (BC-001 -> BC-005)
     */
    protected function seedBookingCenters(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "bc{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-BC-{$numStr}";
            $phone = "+213553" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مركز الحجز التجريبي {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'booking_center');

            BookingCenter::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => "مركز الحجز التجريبي {$numStr}",
                    'commercial_register' => "CR-BC-{$numStr}",
                    'license_number' => "LIC-BC-{$numStr}",
                    'phone' => $phone,
                    'email' => $email,
                    'address' => "شارع مركز الحجز {$numStr}، الجزائر",
                    'wilaya' => 'Alger',
                    'quota_balance' => 0,
                    'verification_status' => BookingCenter::STATUS_PENDING, // Default unverified initial state
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * 4. Seed 3 Booking Center Assistants (BCA-001 -> BCA-003)
     */
    protected function seedBookingCenterAssistants(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "bca{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-BCA-{$numStr}";
            $phone = "+213554" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مساعد مركز حجز اختباري {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'booking_center');
        }
    }

    /**
     * 5. Seed 5 Laboratories (LAB-001 -> LAB-005)
     */
    protected function seedLaboratories(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "lab{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-LAB-{$numStr}";
            $phone = "+213555" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مخبر التحاليل التجريبي {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'lab');

            DiagnosticCenter::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => "مخبر التحاليل التجريبي {$numStr}",
                    'type' => 'laboratory',
                    'license_number' => "LIC-LAB-{$numStr}",
                    'phone' => $phone,
                    'email' => $email,
                    'address' => "شارع المختبر {$numStr}، الجزائر",
                    'wilaya' => 'Alger',
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * 6. Seed 5 Laboratory Assistants (LABA-001 -> LABA-005)
     */
    protected function seedLaboratoryAssistants(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "laba{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-LABA-{$numStr}";
            $phone = "+213556" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "فني مخبر اختباري {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'lab_assistant');

            $labEmail = "lab{$numStr}@aafiya.test";
            $labUser = User::where('email', $labEmail)->first();
            $labCenter = $labUser ? DiagnosticCenter::where('user_id', $labUser->id)->first() : null;

            if ($labCenter) {
                DiagnosticStaff::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'diagnostic_center_id' => $labCenter->id,
                        'role_type' => 'assistant',
                        'created_by_id' => $labUser->id,
                        'permissions_json' => [
                            'lab.manage_orders',
                            'lab.enter_results',
                        ],
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    /**
     * 7. Seed 5 Radiology Centers (RAD-001 -> RAD-005)
     */
    protected function seedRadiologyCenters(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $numStr = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $email = "rad{$numStr}@aafiya.test";
            $passwordStr = "MediTest!2026-RAD-{$numStr}";
            $phone = "+213557" . str_pad((string) $i, 6, '0', STR_PAD_LEFT);

            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "مركز الأشعة التجريبي {$numStr}",
                    'phone' => $phone,
                    'password' => Hash::make($passwordStr),
                    'is_active' => true,
                ]
            );

            $this->attachRole($user, 'radiology');

            DiagnosticCenter::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => "مركز الأشعة التجريبي {$numStr}",
                    'type' => 'radiology',
                    'license_number' => "LIC-RAD-{$numStr}",
                    'phone' => $phone,
                    'email' => $email,
                    'address' => "شارع الأشعة {$numStr}، الجزائر",
                    'wilaya' => 'Alger',
                    'is_active' => true,
                ]
            );
        }
    }
}
