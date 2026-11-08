<?php

namespace Database\Seeders;

use App\Models\AssistantRewardBalance;
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

class MasterAccountMatrixSeeder extends Seeder
{
    /**
     * Run the Master Account Matrix Seeder.
     * Seeds exactly 160 canonical accounts (14 protected + 146 synthetic).
     */
    public function run(): void
    {
        $matrixPath = base_path('../MASTER_ACCOUNT_MATRIX.md');
        if (! file_exists($matrixPath)) {
            $matrixPath = base_path('MASTER_ACCOUNT_MATRIX.md');
        }

        if (! file_exists($matrixPath)) {
            throw new \RuntimeException("MASTER_ACCOUNT_MATRIX.md not found at {$matrixPath}");
        }

        $this->command?->info("Parsing Master Account Matrix from: {$matrixPath}");
        $sections = $this->parseMatrix($matrixPath);

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Clean operational tables to ensure strict 160 account canonical state
        $tablesToClean = [
            'users',
            'patients',
            'doctors',
            'clinics',
            'doctor_clinic',
            'clinic_assistants',
            'booking_centers',
            'diagnostic_centers',
            'diagnostic_staff',
            'role_user',
            'appointments',
            'appointment_slots',
            'appointment_status_history',
            'appointment_sequences',
            'booking_transactions',
            'clinic_operating_hours',
            'doctor_working_slots',
            'doctor_day_schedules',
            'doctor_time_reservations',
            'clinical_access_logs',
            'package_purchase_requests',
            'scoped_permission_assignments',
            'user_consents',
            'personal_access_tokens',
            'assistant_reward_balances',
            'assistant_reward_transactions',
            'assistant_rewards',
            'assistant_payout_profiles',
            'assistant_payout_batches',
            'assistant_payout_batch_items',
        ];

        foreach ($tablesToClean as $table) {
            DB::table($table)->truncate();
        }

        // Cache role IDs
        $roleMap = Role::pluck('id', 'name')->toArray();

        // 1. Seed Clinics
        $this->seedClinics();

        // 2. Seed Diagnostic Centers
        $this->seedDiagnosticCenters();

        // 3. Seed 00 — PROTECTED / SYSTEM (14 Accounts)
        $this->seedProtectedAccounts($sections['00 — PROTECTED / SYSTEM (14 Accounts)'], $roleMap);

        // 4. Seed 01 — PATIENTS (100 Accounts)
        $this->seedPatients($sections['01 — PATIENTS (100 Accounts)'], $roleMap);

        // 5. Seed 02 — DOCTORS (13 Accounts)
        $this->seedDoctors($sections['02 — DOCTORS (13 Accounts)'], $roleMap);

        // 6. Seed 03 — CLINIC ASSISTANTS (10 Accounts)
        $this->seedClinicAssistants($sections['03 — CLINIC ASSISTANTS (10 Accounts)'], $roleMap);

        // 7. Seed 04 — BOOKING CENTERS (8 Accounts: 5 Centers + 3 Staff)
        $this->seedBookingCenters($sections['04 — BOOKING CENTERS (8 Accounts)'], $roleMap);

        // 8. Seed 05 — LABORATORIES (5 Accounts)
        $this->seedLaboratories($sections['05 — LABORATORIES (5 Accounts)'], $roleMap);

        // 9. Seed 06 — LABORATORY STAFF (5 Accounts)
        $this->seedLaboratoryStaff($sections['06 — LABORATORY STAFF (5 Accounts)'], $roleMap);

        // 10. Seed 07 — RADIOLOGY CENTERS (5 Accounts)
        $this->seedRadiologyCenters($sections['07 — RADIOLOGY CENTERS (5 Accounts)'], $roleMap);

        // 11. Establish Clinic Affiliations (Director & Employed)
        $this->seedClinicAffiliations();

        // 12. Establish Assistant Reward Balances for all assistants
        $this->seedAssistantRewardBalances();

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->printSummary();
    }

    /**
     * Parse markdown tables by section.
     */
    protected function parseMatrix(string $path): array
    {
        $content = file_get_contents($path);
        $lines = explode("\n", $content);
        $currentSection = '';
        $sections = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match('/^### ([0-9]{2} — [^\n]+)/', $line, $m)) {
                $currentSection = $m[1];
                $sections[$currentSection] = [];
            } elseif (preg_match('/^## /', $line) || preg_match('/^---/', $line)) {
                $currentSection = '';
            } elseif ($currentSection && str_starts_with($trimmed, '| **')) {
                $cols = array_map(function ($c) {
                    return trim(trim($c), "*` \t");
                }, explode('|', trim($trimmed, '|')));
                $sections[$currentSection][] = $cols;
            }
        }

        return $sections;
    }

    /**
     * Resolve Wilaya ID by Name.
     */
    protected function getWilayaId(?string $wilayaName): ?int
    {
        if (! $wilayaName || $wilayaName === 'N/A') {
            return 16; // Default to Alger
        }

        $w = DB::table('wilayas')
            ->where('name_fr', 'LIKE', "%{$wilayaName}%")
            ->orWhere('name_ar', 'LIKE', "%{$wilayaName}%")
            ->first();

        return $w?->id ?? 16;
    }

    /**
     * Resolve Specialty ID by Name.
     */
    protected function getSpecialtyId(?string $specialty): ?int
    {
        if (! $specialty || $specialty === 'N/A') {
            return 1;
        }

        if (str_contains($specialty, 'Cardio')) return 2;
        if (str_contains($specialty, 'Pediatric')) return 3;
        if (str_contains($specialty, 'Dermatol')) return 4;
        if (str_contains($specialty, 'Neurolog')) return 5;
        if (str_contains($specialty, 'Orthoped')) return 9;
        if (str_contains($specialty, 'Ophthalmol')) return 7;
        if (str_contains($specialty, 'Internal')) return 10;
        if (str_contains($specialty, 'ENT') || str_contains($specialty, 'الأذن')) return 8;
        if (str_contains($specialty, 'Urolog')) return 12;
        if (str_contains($specialty, 'Gastro')) return 11;
        if (str_contains($specialty, 'العظام')) return 9;

        return 1; // General Practice
    }

    /**
     * Helper to insert a user and assign role.
     */
    protected function insertUser(string $id, string $name, string $email, string $plainPassword, string $roleName, array $roleMap, string $phone = '+213550000000'): void
    {
        $hashed = Hash::make($plainPassword === 'NOT_VERIFIABLE' ? 'Shifae#Pass2026!' : $plainPassword);

        DB::table('users')->insert([
            'id' => $id,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => $hashed,
            'is_active' => true,
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (isset($roleMap[$roleName])) {
            DB::table('role_user')->insert([
                'user_id' => $id,
                'role_id' => $roleMap[$roleName],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 9 Clinics.
     */
    protected function seedClinics(): void
    {
        $clinics = [
            [
                'id' => '01a056bf-ece2-70f7-9b7c-c8355ded4529',
                'name' => 'عيادة الأمل',
                'address' => 'شارع الشهداء، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000001',
                'director_doctor_id' => '01a056bf-ece0-7053-a7c1-3f8334dfffc4',
            ],
            [
                'id' => '01a05c2b-0e30-7252-8fc9-480512074ea3',
                'name' => 'عيادة الشفاء من عند الله',
                'address' => 'شارع الاستقلال، وهران',
                'wilaya' => 'Oran',
                'wilaya_id' => 31,
                'phone' => '+21341000002',
                'director_doctor_id' => '01a05c2b-0e2e-7361-9de0-5187fb93cc3e',
            ],
            [
                'id' => '01a06b59-6020-72f9-b1a5-92420ee2f948',
                'name' => 'عيادة شفاء الاختبارية 01',
                'address' => 'شارع المستشفى 01، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000011',
                'director_doctor_id' => '01a06b59-587f-72e5-bcc6-df39bf1ac1af',
            ],
            [
                'id' => '01a06b59-6022-7250-9e9a-3907b0edb958',
                'name' => 'عيادة شفاء الاختبارية 02',
                'address' => 'شارع المستشفى 02، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000012',
                'director_doctor_id' => '01a06b59-5959-7052-adfb-643062f513d3',
            ],
            [
                'id' => '01a06b59-6028-705b-b221-3502a501129f',
                'name' => 'عيادة شفاء الاختبارية 03',
                'address' => 'شارع المستشفى 03، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000013',
                'director_doctor_id' => '01a06b59-5a31-73ad-ae74-aead5264a00e',
            ],
            [
                'id' => '01a06b59-602a-7143-92d7-c45af8afbb40',
                'name' => 'عيادة شفاء الاختبارية 04',
                'address' => 'شارع المستشفى 04، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000014',
                'director_doctor_id' => '01a06b59-5b0a-71ad-9eb9-49456e09aea0',
            ],
            [
                'id' => '01a06b59-602d-73ac-8def-61e2b847bc2b',
                'name' => 'عيادة شفاء الاختبارية 05',
                'address' => 'شارع المستشفى 05، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000015',
                'director_doctor_id' => '01a06b59-5be3-715c-aa8c-3500df12f247',
            ],
            [
                'id' => '01a06b59-602f-7177-944c-5234e59b77ce',
                'name' => 'عيادة شفاء الاختبارية 06',
                'address' => 'شارع المستشفى 06، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000016',
                'director_doctor_id' => '01a06b59-5cbb-717b-8ec6-ee25b97523c2',
            ],
            [
                'id' => '01a06b59-6032-72d8-a56d-504880eae302',
                'name' => 'عيادة شفاء الاختبارية 07',
                'address' => 'شارع المستشفى 07، الجزائر',
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'phone' => '+21321000017',
                'director_doctor_id' => '01a06b59-5e6f-72dd-a89d-cf2049f34e72',
            ],
        ];

        foreach ($clinics as $c) {
            DB::table('clinics')->insert([
                'id' => $c['id'],
                'name' => $c['name'],
                'address' => $c['address'],
                'wilaya' => $c['wilaya'],
                'wilaya_id' => $c['wilaya_id'],
                'phone' => $c['phone'],
                'director_doctor_id' => $c['director_doctor_id'],
                'max_patients_per_slot' => 4,
                'slot_duration_min' => 15,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed Diagnostic Centers (6 Labs + 6 Radiology Centers).
     */
    protected function seedDiagnosticCenters(): void
    {
        $centers = [
            // Labs
            ['id' => '01a05d4a-84dc-7047-9644-d2f1d68a7077', 'user_id' => '01a05d48-b111-714d-b997-d2908e4bdacc', 'name' => 'مخبر مخبر العافية', 'type' => 'laboratory', 'license' => 'LIC-LAB-PROT-001', 'email' => 'val.lab.mgr@aafiya.dz', 'phone' => '+21321770001'],
            ['id' => '01a06b59-704d-73c3-b197-1150bae1b63e', 'user_id' => '01a06b59-7049-7162-ba5a-41ed3ac5ed6d', 'name' => 'مخبر التحاليل التجريبي 001', 'type' => 'laboratory', 'license' => 'LIC-LAB-001', 'email' => 'lab001@aafiya.test', 'phone' => '+213555000001'],
            ['id' => '01a06b59-7125-73d4-a111-db8b553f38dd', 'user_id' => '01a06b59-7122-7343-b7dc-4b08ab16f1d8', 'name' => 'مخبر التحاليل التجريبي 002', 'type' => 'laboratory', 'license' => 'LIC-LAB-002', 'email' => 'lab002@aafiya.test', 'phone' => '+213555000002'],
            ['id' => '01a06b59-71fd-710b-98fb-2cba62206502', 'user_id' => '01a06b59-71fa-7317-a9ca-9ed7e1035bc2', 'name' => 'مخبر التحاليل التجريبي 003', 'type' => 'laboratory', 'license' => 'LIC-LAB-003', 'email' => 'lab003@aafiya.test', 'phone' => '+213555000003'],
            ['id' => '01a06b59-72d8-71e0-8283-51fcb03d5697', 'user_id' => '01a06b59-72d5-72f7-ad2f-c6646881dd2e', 'name' => 'مخبر التحاليل التجريبي 004', 'type' => 'laboratory', 'license' => 'LIC-LAB-004', 'email' => 'lab004@aafiya.test', 'phone' => '+213555000004'],
            ['id' => '01a06b59-73b0-7084-87ec-ca26cf7705c6', 'user_id' => '01a06b59-73ae-7172-bd94-25e154661541', 'name' => 'مخبر التحاليل التجريبي 005', 'type' => 'laboratory', 'license' => 'LIC-LAB-005', 'email' => 'lab005@aafiya.test', 'phone' => '+213555000005'],

            // Radiology
            ['id' => '01a05d4f-464b-7206-96b6-9bff5b0921f4', 'user_id' => '01a05d4e-3fc2-7389-a056-22790c768684', 'name' => 'مركز مركز الأشعة الخالصة', 'type' => 'radiology', 'license' => 'LIC-RAD-PROT-001', 'email' => 'val.rad.mgr@aafiya.dz', 'phone' => '+21321770002'],
            ['id' => '01a06b59-78ea-703e-b553-45103034e6ca', 'user_id' => '01a06b59-78e8-71bd-949c-cef770a4b89e', 'name' => 'مركز الأشعة التجريبي 001', 'type' => 'radiology', 'license' => 'LIC-RAD-001', 'email' => 'rad001@aafiya.test', 'phone' => '+213557000001'],
            ['id' => '01a06b59-79c3-71bd-b0ff-dbd01a473d56', 'user_id' => '01a06b59-79c1-7294-a88f-022f4ac6cb21', 'name' => 'مركز الأشعة التجريبي 002', 'type' => 'radiology', 'license' => 'LIC-RAD-002', 'email' => 'rad002@aafiya.test', 'phone' => '+213557000002'],
            ['id' => '01a06b59-7a9d-735b-92ff-dd6489c0efb7', 'user_id' => '01a06b59-7a9a-70ac-b7c1-eb2a68d9aedc', 'name' => 'مركز الأشعة التجريبي 003', 'type' => 'radiology', 'license' => 'LIC-RAD-003', 'email' => 'rad003@aafiya.test', 'phone' => '+213557000003'],
            ['id' => '01a06b59-7b7a-71ba-b8e3-d3b80b1fb251', 'user_id' => '01a06b59-7b74-73a4-a3aa-a28ff6526063', 'name' => 'مركز الأشعة التجريبي 004', 'type' => 'radiology', 'license' => 'LIC-RAD-004', 'email' => 'rad004@aafiya.test', 'phone' => '+213557000004'],
            ['id' => '01a06b59-7c56-70fe-8c85-b1bc3b856afe', 'user_id' => '01a06b59-7c53-70df-8b76-babfff75d59c', 'name' => 'مركز الأشعة التجريبي 005', 'type' => 'radiology', 'license' => 'LIC-RAD-005', 'email' => 'rad005@aafiya.test', 'phone' => '+213557000005'],
        ];

        foreach ($centers as $dc) {
            DB::table('diagnostic_centers')->insert([
                'id' => $dc['id'],
                'user_id' => $dc['user_id'],
                'name' => $dc['name'],
                'type' => $dc['type'],
                'license_number' => $dc['license'],
                'phone' => $dc['phone'],
                'email' => $dc['email'],
                'address' => "شارع المركز الطبي، الجزائر",
                'wilaya' => 'Alger',
                'wilaya_id' => 16,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 14 Protected / System Accounts.
     */
    protected function seedProtectedAccounts(array $rows, array $roleMap): void
    {
        foreach ($rows as $idx => $r) {
            // [0] Test ID, [1] User ID, [2] Name, [3] Email, [4] Password, [5] Role, [6] Entity ID, [7] Status
            $testId = $r[0];
            $userId = $r[1];
            $name = $r[2];
            $email = $r[3];
            $pass = $r[4];
            $role = $r[5];
            $entityId = $r[6];

            $phone = sprintf('+21355099%04d', $idx + 1);
            $this->insertUser($userId, $name, $email, $pass, $role, $roleMap, $phone);

            // Specific entity attachments
            if ($testId === 'PROT-DOC-001') {
                DB::table('doctors')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'specialty' => 'Cardiology',
                    'specialty_id' => 2,
                    'license_number' => 'LIC-PROT-DOC-001',
                    'bio' => 'طبيب مرجعي مختص في أمراض القلب والشرايين.',
                    'is_verified' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-DOC-002') {
                DB::table('doctors')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'specialty' => 'General Practice',
                    'specialty_id' => 1,
                    'license_number' => 'LIC-PROT-DOC-002',
                    'bio' => 'طبيب مرجعي مختص في الطب العام.',
                    'is_verified' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-DOC-003') {
                DB::table('doctors')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'specialty' => 'Pediatrics',
                    'specialty_id' => 3,
                    'license_number' => 'LIC-PROT-DOC-003',
                    'bio' => 'طبيب مرجعي مختص في طب الأطفال.',
                    'is_verified' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-AST-002') {
                DB::table('clinic_assistants')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'clinic_id' => '01a056bf-ece2-70f7-9b7c-c8355ded4529', // عيادة الأمل
                    'permissions_json' => json_encode([
                        'booking.manage_queue',
                        'booking.confirm_attendance',
                        'booking.create',
                        'patient.view_contacts',
                    ]),
                    'created_by_id' => '01a056bf-ecda-72ad-a0f3-892affe6adb2',
                    'is_active' => true,
                    'active_membership_user_id' => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-AST-003') {
                DB::table('clinic_assistants')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'clinic_id' => '01a056bf-ece2-70f7-9b7c-c8355ded4529', // عيادة الأمل
                    'permissions_json' => json_encode([
                        'booking.manage_queue',
                        'booking.confirm_attendance',
                        'booking.create',
                    ]),
                    'created_by_id' => '01a056bf-ecda-72ad-a0f3-892affe6adb2',
                    'is_active' => true,
                    'active_membership_user_id' => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-LABA-001') {
                DB::table('diagnostic_staff')->insert([
                    'id' => $entityId,
                    'diagnostic_center_id' => '01a05d4a-84dc-7047-9644-d2f1d68a7077',
                    'user_id' => $userId,
                    'role_type' => 'assistant',
                    'permissions_json' => json_encode(['lab.manage_orders', 'lab.enter_results']),
                    'created_by_id' => '01a05d48-b111-714d-b997-d2908e4bdacc',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-RADA-001') {
                DB::table('diagnostic_staff')->insert([
                    'id' => $entityId,
                    'diagnostic_center_id' => '01a05d4f-464b-7206-96b6-9bff5b0921f4',
                    'user_id' => $userId,
                    'role_type' => 'assistant',
                    'permissions_json' => json_encode(['radiology.manage_orders', 'radiology.upload_reports']),
                    'created_by_id' => '01a05d4e-3fc2-7389-a056-22790c768684',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-PAT-001') {
                DB::table('patients')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'mrn' => 'MRN-2026-0001',
                    'first_name' => 'ريان',
                    'last_name' => 'شرقي',
                    'gender' => 'male',
                    'date_of_birth' => '1995-05-15',
                    'blood_group' => 'O+',
                    'phone' => '+213550999001',
                    'email' => $email,
                    'address' => 'شارع المرجعية، سيدي بلعباس',
                    'wilaya' => 'سيدي بلعباس',
                    'wilaya_id' => 22,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($testId === 'PROT-BC-002') {
                DB::table('booking_centers')->insert([
                    'id' => $entityId,
                    'user_id' => $userId,
                    'name' => $name,
                    'commercial_register' => 'CR-PROT-BC-002',
                    'license_number' => 'LIC-PROT-BC-002',
                    'phone' => '+213553999002',
                    'email' => $email,
                    'address' => 'شارع مركز الحجز، الجزائر',
                    'wilaya' => 'Alger',
                    'wilaya_id' => 16,
                    'quota_balance' => 18,
                    'verification_status' => BookingCenter::STATUS_VERIFIED,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Seed 100 Patients (PAT-001 -> PAT-100).
     */
    protected function seedPatients(array $rows, array $roleMap): void
    {
        foreach ($rows as $i => $r) {
            // [0] Test ID, [1] User ID, [2] Patient Profile ID, [3] Name, [4] Email, [5] Password, [6] Phone, [7] MRN, [8] Wilaya, [9] Status
            $testId = $r[0];
            $userId = $r[1];
            $patientId = $r[2];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];
            $phone = $r[6];
            $mrn = $r[7];
            $wilaya = $r[8];

            $this->insertUser($userId, $name, $email, $pass, 'patient_registered', $roleMap, $phone);

            $parts = explode(' ', $name);
            $firstName = $parts[0] ?? 'مريض';
            $lastName = implode(' ', array_slice($parts, 1));
            $gender = (($i + 1) % 2 === 0) ? 'female' : 'male';
            $wilayaId = $this->getWilayaId($wilaya);

            DB::table('patients')->insert([
                'id' => $patientId,
                'user_id' => $userId,
                'mrn' => $mrn,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'gender' => $gender,
                'date_of_birth' => '1990-01-15',
                'blood_group' => 'O+',
                'phone' => $phone,
                'email' => $email,
                'address' => "شارع الاختبار {$testId}، {$wilaya}",
                'wilaya' => $wilaya,
                'wilaya_id' => $wilayaId,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 13 Doctors (DOC-001 -> DOC-010, DOC-014 -> DOC-016).
     */
    protected function seedDoctors(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            // [0] Test ID, [1] User ID, [2] Doctor Profile ID, [3] Name, [4] Email, [5] Password, [6] Specialty, [7] License No, [8] Verification Status, [9] Clinic Affiliation, [10] Status
            $testId = $r[0];
            $userId = $r[1];
            $doctorId = $r[2];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];
            $specialty = $r[6];
            $license = $r[7];

            $phone = '+213551' . substr($testId, -3);
            $this->insertUser($userId, $name, $email, $pass, 'doctor', $roleMap, $phone);

            $specialtyId = $this->getSpecialtyId($specialty);

            DB::table('doctors')->insert([
                'id' => $doctorId,
                'user_id' => $userId,
                'specialty' => $specialty,
                'specialty_id' => $specialtyId,
                'license_number' => $license,
                'bio' => "طبيب مختص في {$specialty} - بيئة الاختبار التشغيلية.",
                'is_verified' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 10 Clinic Assistants (AST-001 -> AST-010).
     */
    protected function seedClinicAssistants(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            // [0] Test ID, [1] User ID, [2] Assistant Profile ID, [3] Name, [4] Email, [5] Password, [6] Clinic ID, [7] Clinic Name, [8] Status
            $testId = $r[0];
            $userId = $r[1];
            $astId = $r[2];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];
            $clinicId = $r[6];

            $phone = '+213552' . substr($testId, -3);
            $this->insertUser($userId, $name, $email, $pass, 'doctor_assistant', $roleMap, $phone);

            // Get director user id of the target clinic
            $clinic = DB::table('clinics')->where('id', $clinicId)->first();
            $directorDoc = $clinic ? DB::table('doctors')->where('id', $clinic->director_doctor_id)->first() : null;
            $creatorUserId = $directorDoc?->user_id ?? $userId;

            DB::table('clinic_assistants')->insert([
                'id' => $astId,
                'user_id' => $userId,
                'clinic_id' => $clinicId,
                'permissions_json' => json_encode([
                    'booking.manage_queue',
                    'booking.confirm_attendance',
                    'booking.create',
                    'patient.view_contacts',
                ]),
                'created_by_id' => $creatorUserId,
                'is_active' => true,
                'active_membership_user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 8 Booking Centers & Staff (BC-001 -> BC-005, BCA-001 -> BCA-003).
     */
    protected function seedBookingCenters(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            $testId = $r[0];
            $userId = $r[1];

            if (str_starts_with($testId, 'BC-')) {
                // [0] Test ID, [1] User ID, [2] Booking Center ID, [3] Name, [4] Email, [5] Password, [6] License No, [7] Verification Status, [8] Quota Balance, [9] Tx Count, [10] Latest Tx, [11] Status
                $bcId = $r[2];
                $name = $r[3];
                $email = $r[4];
                $pass = $r[5];
                $license = $r[6];
                $quota = (int) $r[8];

                $phone = '+213553' . substr($testId, -3);
                $this->insertUser($userId, $name, $email, $pass, 'booking_center', $roleMap, $phone);

                DB::table('booking_centers')->insert([
                    'id' => $bcId,
                    'user_id' => $userId,
                    'name' => $name,
                    'commercial_register' => "CR-{$testId}",
                    'license_number' => $license,
                    'phone' => $phone,
                    'email' => $email,
                    'address' => "شارع مركز الحجز {$testId}، الجزائر",
                    'wilaya' => 'Alger',
                    'wilaya_id' => 16,
                    'quota_balance' => $quota,
                    'verification_status' => BookingCenter::STATUS_VERIFIED,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                // BCA staff: [0] BCA-001, [1] User ID, [2] N/A, [3] Name, [4] Email, [5] Password, ...
                $name = $r[3];
                $email = $r[4];
                $pass = $r[5];
                $phone = '+213554' . substr($testId, -3);

                $this->insertUser($userId, $name, $email, $pass, 'booking_center', $roleMap, $phone);
            }
        }
    }

    /**
     * Seed 5 Laboratories (LAB-001 -> LAB-005).
     */
    protected function seedLaboratories(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            // [0] Test ID, [1] User ID, [2] Diagnostic Center ID, [3] Name, [4] Email, [5] Password, [6] License No, [7] Type, [8] Status
            $testId = $r[0];
            $userId = $r[1];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];

            $phone = '+213555' . substr($testId, -3);
            $this->insertUser($userId, $name, $email, $pass, 'lab', $roleMap, $phone);
        }
    }

    /**
     * Seed 5 Laboratory Staff (LABA-001 -> LABA-005).
     */
    protected function seedLaboratoryStaff(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            // [0] Test ID, [1] User ID, [2] Staff Profile ID, [3] Name, [4] Email, [5] Password, [6] Center ID, [7] Center Name, [8] Role Type, [9] Status
            $testId = $r[0];
            $userId = $r[1];
            $staffId = $r[2];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];
            $centerId = $r[6];
            $roleType = $r[8];

            $phone = '+213556' . substr($testId, -3);
            $this->insertUser($userId, $name, $email, $pass, 'lab_assistant', $roleMap, $phone);

            $dc = DB::table('diagnostic_centers')->where('id', $centerId)->first();
            $creatorUserId = $dc?->user_id ?? $userId;

            DB::table('diagnostic_staff')->insert([
                'id' => $staffId,
                'diagnostic_center_id' => $centerId,
                'user_id' => $userId,
                'role_type' => $roleType,
                'permissions_json' => json_encode(['lab.manage_orders', 'lab.enter_results']),
                'created_by_id' => $creatorUserId,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Seed 5 Radiology Centers (RAD-001 -> RAD-005).
     */
    protected function seedRadiologyCenters(array $rows, array $roleMap): void
    {
        foreach ($rows as $r) {
            // [0] Test ID, [1] User ID, [2] Diagnostic Center ID, [3] Name, [4] Email, [5] Password, [6] License No, [7] Type, [8] Status
            $testId = $r[0];
            $userId = $r[1];
            $name = $r[3];
            $email = $r[4];
            $pass = $r[5];

            $phone = '+213557' . substr($testId, -3);
            $this->insertUser($userId, $name, $email, $pass, 'radiology', $roleMap, $phone);
        }
    }

    /**
     * Seed Clinic Affiliations (doctor_clinic pivot).
     */
    protected function seedClinicAffiliations(): void
    {
        $affiliations = [
            // عيادة الأمل
            ['clinic_id' => '01a056bf-ece2-70f7-9b7c-c8355ded4529', 'doctor_id' => '01a056bf-ece0-7053-a7c1-3f8334dfffc4', 'position' => 'director', 'is_primary' => true],
            ['clinic_id' => '01a056bf-ece2-70f7-9b7c-c8355ded4529', 'doctor_id' => '01a05821-6a78-7038-9eda-0d44243054db', 'position' => 'doctor', 'is_primary' => true],

            // عيادة الشفاء من عند الله
            ['clinic_id' => '01a05c2b-0e30-7252-8fc9-480512074ea3', 'doctor_id' => '01a05c2b-0e2e-7361-9de0-5187fb93cc3e', 'position' => 'director', 'is_primary' => true],
            ['clinic_id' => '01a05c2b-0e30-7252-8fc9-480512074ea3', 'doctor_id' => '01a05821-6a78-7038-9eda-0d44243054db', 'position' => 'doctor', 'is_primary' => false],

            // عيادة شفاء الاختبارية 01
            ['clinic_id' => '01a06b59-6020-72f9-b1a5-92420ee2f948', 'doctor_id' => '01a06b59-587f-72e5-bcc6-df39bf1ac1af', 'position' => 'director', 'is_primary' => true],
            ['clinic_id' => '01a06b59-6020-72f9-b1a5-92420ee2f948', 'doctor_id' => '01a06b59-5f48-7090-97b9-d93e9fd5943c', 'position' => 'doctor', 'is_primary' => false],
            ['clinic_id' => '01a06b59-6020-72f9-b1a5-92420ee2f948', 'doctor_id' => '01a07a79-77d6-73ac-a58d-040029e12254', 'position' => 'doctor', 'is_primary' => true],
            ['clinic_id' => '01a06b59-6020-72f9-b1a5-92420ee2f948', 'doctor_id' => '01a07a7a-c6a8-7136-b9d6-5368a2524a0c', 'position' => 'doctor', 'is_primary' => true],
            ['clinic_id' => '01a06b59-6020-72f9-b1a5-92420ee2f948', 'doctor_id' => '01a07a7c-0a98-70bb-9c5a-61c9c1ec0701', 'position' => 'doctor', 'is_primary' => true],

            // عيادة شفاء الاختبارية 02
            ['clinic_id' => '01a06b59-6022-7250-9e9a-3907b0edb958', 'doctor_id' => '01a06b59-5959-7052-adfb-643062f513d3', 'position' => 'director', 'is_primary' => true],

            // عيادة شفاء الاختبارية 03
            ['clinic_id' => '01a06b59-6028-705b-b221-3502a501129f', 'doctor_id' => '01a06b59-5a31-73ad-ae74-aead5264a00e', 'position' => 'director', 'is_primary' => true],

            // عيادة شفاء الاختبارية 04
            ['clinic_id' => '01a06b59-602a-7143-92d7-c45af8afbb40', 'doctor_id' => '01a06b59-5b0a-71ad-9eb9-49456e09aea0', 'position' => 'director', 'is_primary' => true],

            // عيادة شفاء الاختبارية 05
            ['clinic_id' => '01a06b59-602d-73ac-8def-61e2b847bc2b', 'doctor_id' => '01a06b59-5be3-715c-aa8c-3500df12f247', 'position' => 'director', 'is_primary' => true],

            // عيادة شفاء الاختبارية 06
            ['clinic_id' => '01a06b59-602f-7177-944c-5234e59b77ce', 'doctor_id' => '01a06b59-5cbb-717b-8ec6-ee25b97523c2', 'position' => 'director', 'is_primary' => true],
            ['clinic_id' => '01a06b59-602f-7177-944c-5234e59b77ce', 'doctor_id' => '01a06b59-5d96-72b4-b910-5354f37576a4', 'position' => 'doctor', 'is_primary' => true],

            // عيادة شفاء الاختبارية 07
            ['clinic_id' => '01a06b59-6032-72d8-a56d-504880eae302', 'doctor_id' => '01a06b59-5e6f-72dd-a89d-cf2049f34e72', 'position' => 'director', 'is_primary' => true],
            ['clinic_id' => '01a06b59-6032-72d8-a56d-504880eae302', 'doctor_id' => '01a06b59-5f48-7090-97b9-d93e9fd5943c', 'position' => 'doctor', 'is_primary' => true],
            ['clinic_id' => '01a06b59-6032-72d8-a56d-504880eae302', 'doctor_id' => '01a06b59-601f-70e6-961b-33a68a16cb50', 'position' => 'doctor', 'is_primary' => true],
        ];

        foreach ($affiliations as $aff) {
            DB::table('doctor_clinic')->insert([
                'clinic_id' => $aff['clinic_id'],
                'doctor_id' => $aff['doctor_id'],
                'position' => $aff['position'],
                'is_primary' => $aff['is_primary'],
                'is_active' => true,
                'max_patients_per_slot' => 4,
                'joined_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Initialize Assistant Reward Balances.
     */
    protected function seedAssistantRewardBalances(): void
    {
        $assistants = DB::table('clinic_assistants')->get();
        foreach ($assistants as $ast) {
            DB::table('assistant_reward_balances')->insert([
                'assistant_id' => $ast->id,
                'current_balance' => 0.00,
                'total_earned' => 0.00,
                'total_reversed' => 0.00,
                'total_deducted' => 0.00,
                'total_paid' => 0.00,
                'total_relieved' => 0.00,
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Print verification summary matching the Master Account Matrix Executive Summary.
     */
    protected function printSummary(): void
    {
        $patientCount = DB::table('users')->where('email', 'REGEXP', '^patient[0-9]{3}@aafiya\\.test$')->count();
        $doctorCount = DB::table('users')->where('email', 'REGEXP', '^doctor[0-9]{3}@aafiya\\.test$')->count();
        $astCount = DB::table('users')->where('email', 'REGEXP', '^ast[0-9]{3}@aafiya\\.test$')->count();
        $bcCount = DB::table('users')->where('email', 'REGEXP', '^bc[0-9]{3}@aafiya\\.test$')->count();
        $bcaCount = DB::table('users')->where('email', 'REGEXP', '^bca[0-9]{3}@aafiya\\.test$')->count();
        $labCount = DB::table('users')->where('email', 'REGEXP', '^lab[0-9]{3}@aafiya\\.test$')->count();
        $labaCount = DB::table('users')->where('email', 'REGEXP', '^laba[0-9]{3}@aafiya\\.test$')->count();
        $radCount = DB::table('users')->where('email', 'REGEXP', '^rad[0-9]{3}@aafiya\\.test$')->count();
        $protectedCount = DB::table('users')->where('email', 'LIKE', '%@aafiya.dz')->count();

        $totalSynthetic = $patientCount + $doctorCount + $astCount + $bcCount + $bcaCount + $labCount + $labaCount + $radCount;
        $totalAll = DB::table('users')->count();

        $this->command?->info('');
        $this->command?->info('================================================================');
        $this->command?->info('        AAFIYA MASTER ACCOUNT MATRIX SEEDING COMPLETE           ');
        $this->command?->info('================================================================');
        $this->command?->info(sprintf('| %-35s | Target | Actual | Status |', 'Account Category'));
        $this->command?->info('|-------------------------------------+--------+--------+--------|');
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Patients (PAT-001..100)', 100, $patientCount, $patientCount === 100 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Doctors (DOC-001..010, 014..016)', 13, $doctorCount, $doctorCount === 13 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Clinic Assistants (AST-001..010)', 10, $astCount, $astCount === 10 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Booking Centers & Staff (BC+BCA)', 8, $bcCount + $bcaCount, ($bcCount + $bcaCount) === 8 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Laboratories (LAB-001..005)', 5, $labCount, $labCount === 5 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Laboratory Staff (LABA-001..005)', 5, $labaCount, $labaCount === 5 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Radiology Centers (RAD-001..005)', 5, $radCount, $radCount === 5 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'Protected / System Accounts', 14, $protectedCount, $protectedCount === 14 ? 'PASS' : 'FAIL'));
        $this->command?->info('|-------------------------------------+--------+--------+--------|');
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'TOTAL SYNTHETIC ACCOUNTS', 146, $totalSynthetic, $totalSynthetic === 146 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'PROTECTED SYSTEM ACCOUNTS', 14, $protectedCount, $protectedCount === 14 ? 'PASS' : 'FAIL'));
        $this->command?->info(sprintf('| %-35s | %6d | %6d | %-6s |', 'TOTAL DATABASE ACCOUNTS', 160, $totalAll, $totalAll === 160 ? 'PASS' : 'FAIL'));
        $this->command?->info('================================================================');
    }
}