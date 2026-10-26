<?php

namespace App\Services;

use App\Models\Commune;
use App\Models\EmergencyContact;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\PatientChronicCondition;
use App\Models\PatientCurrentMedication;
use App\Models\User;
use App\Models\Wilaya;
use App\Services\LegacyWilayaMigrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EhrService
{
    public function __construct(
        protected ?LegacyWilayaMigrationService $wilayaResolver = null
    ) {
        $this->wilayaResolver = $this->wilayaResolver ?? app(LegacyWilayaMigrationService::class);
    }

    /**
     * Register a new patient and assign a sequential unique MRN.
     *
     * @param array<string, mixed> $data
     */
    public function createPatient(array $data, ?User $creator = null): Patient
    {
        return DB::transaction(function () use ($data) {
            $mrn = $this->generateMrn();

            $wilayaStr = $data['wilaya'] ?? null;
            $wilayaCode = $data['wilaya_code'] ?? null;
            $communeCode = $data['commune_code'] ?? null;
            $wilayaId = $data['wilaya_id'] ?? null;
            $communeId = $data['commune_id'] ?? null;

            // Resolve Wilaya via canonical code or legacy resolver
            if (! empty($wilayaCode)) {
                $wilayaModel = Wilaya::where('code', $wilayaCode)->first();
                if ($wilayaModel) {
                    $wilayaId = $wilayaModel->id;
                    $wilayaStr = $wilayaModel->name_ar;
                }
            } elseif ($wilayaId === null && $wilayaStr !== null) {
                $wilayaId = $this->wilayaResolver->resolveWilaya($wilayaStr)?->id;
            }

            // Resolve Commune via canonical code
            if (! empty($communeCode)) {
                $communeQuery = Commune::where('code', $communeCode);
                if ($wilayaId !== null) {
                    $communeQuery->where('wilaya_id', $wilayaId);
                }
                $communeModel = $communeQuery->first();
                if ($communeModel) {
                    $communeId = $communeModel->id;
                    if ($wilayaId === null) {
                        $wilayaId = $communeModel->wilaya_id;
                    }
                }
            }

            return Patient::create([
                'user_id' => $data['user_id'] ?? null,
                'mrn' => $mrn,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'gender' => $data['gender'],
                'date_of_birth' => $data['date_of_birth'],
                'blood_group' => $data['blood_group'] ?? null,
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'address' => $data['address'] ?? null,
                'wilaya' => $wilayaStr,
                'wilaya_id' => $wilayaId,
                'commune_id' => $communeId,
                'is_active' => true,
            ]);
        }, 5);
    }

    /**
     * Update demographic or non-clinical contact details.
     *
     * @param array<string, mixed> $data
     */
    public function updatePatient(Patient $patient, array $data): Patient
    {
        $updateData = [
            'first_name' => $data['first_name'] ?? $patient->first_name,
            'last_name' => $data['last_name'] ?? $patient->last_name,
            'gender' => $data['gender'] ?? $patient->gender,
            'date_of_birth' => $data['date_of_birth'] ?? $patient->date_of_birth,
            'blood_group' => $data['blood_group'] ?? $patient->blood_group,
            'phone' => $data['phone'] ?? $patient->phone,
            'email' => $data['email'] ?? $patient->email,
            'national_id' => $data['national_id'] ?? $patient->national_id,
            'address' => $data['address'] ?? $patient->address,
            'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : $patient->is_active,
        ];

        if (array_key_exists('wilaya_code', $data)) {
            $wilayaModel = ! empty($data['wilaya_code']) ? Wilaya::where('code', $data['wilaya_code'])->first() : null;
            $updateData['wilaya_id'] = $wilayaModel?->id;
            $updateData['wilaya'] = $wilayaModel?->name_ar;
        } elseif (array_key_exists('wilaya', $data)) {
            $wilayaStr = $data['wilaya'];
            $wilayaId = $data['wilaya_id'] ?? ($wilayaStr !== null ? $this->wilayaResolver->resolveWilaya($wilayaStr)?->id : null);
            $updateData['wilaya'] = $wilayaStr;
            $updateData['wilaya_id'] = $wilayaId;
        } elseif (array_key_exists('wilaya_id', $data)) {
            $updateData['wilaya_id'] = $data['wilaya_id'];
        }

        if (array_key_exists('commune_code', $data)) {
            $communeModel = ! empty($data['commune_code']) ? Commune::where('code', $data['commune_code'])->first() : null;
            $updateData['commune_id'] = $communeModel?->id;
        } elseif (array_key_exists('commune_id', $data)) {
            $updateData['commune_id'] = $data['commune_id'];
        }

        $patient->update(array_filter($updateData, fn ($val) => $val !== null));

        return $patient->fresh();
    }

    /**
     * Document an allergy in the patient's EHR.
     *
     * @param array<string, mixed> $data
     */
    public function addAllergy(Patient $patient, array $data): PatientAllergy
    {
        return PatientAllergy::create([
            'patient_id' => $patient->id,
            'allergen' => $data['allergen'],
            'severity' => $data['severity'] ?? 'moderate',
            'reaction' => $data['reaction'] ?? null,
            'diagnosed_at' => $data['diagnosed_at'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function removeAllergy(PatientAllergy $allergy): void
    {
        $allergy->delete();
    }

    /**
     * Document a chronic condition in the patient's EHR.
     *
     * @param array<string, mixed> $data
     */
    public function addChronicCondition(Patient $patient, array $data): PatientChronicCondition
    {
        return PatientChronicCondition::create([
            'patient_id' => $patient->id,
            'condition_name' => $data['condition_name'],
            'icd10_code' => $data['icd10_code'] ?? null,
            'diagnosed_date' => $data['diagnosed_date'] ?? null,
            'status' => $data['status'] ?? 'active',
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Document current medication.
     *
     * @param array<string, mixed> $data
     */
    public function addCurrentMedication(Patient $patient, array $data): PatientCurrentMedication
    {
        return PatientCurrentMedication::create([
            'patient_id' => $patient->id,
            'medication_name' => $data['medication_name'],
            'dosage' => $data['dosage'],
            'frequency' => $data['frequency'],
            'start_date' => $data['start_date'] ?? null,
            'prescribed_by' => $data['prescribed_by'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Add emergency contact.
     *
     * @param array<string, mixed> $data
     */
    public function addEmergencyContact(Patient $patient, array $data): EmergencyContact
    {
        if (! empty($data['is_primary'])) {
            $patient->emergencyContacts()->update(['is_primary' => false]);
        }

        return EmergencyContact::create([
            'patient_id' => $patient->id,
            'name' => $data['name'],
            'relationship' => $data['relationship'],
            'phone' => $data['phone'],
            'is_primary' => $data['is_primary'] ?? true,
        ]);
    }

    /**
     * Generate thread-safe sequential MRN in MRN-YYYY-MM-NNNNN format anchored to Africa/Algiers timezone.
     */
    public function generateMrn(?string $period = null): string
    {
        $period = $period ?: Carbon::now('Africa/Algiers')->format('Y-m');

        // Acquire pessimistic row lock on the dedicated monthly sequence ledger
        $sequenceRow = DB::table('mrn_sequences')
            ->where('period', $period)
            ->lockForUpdate()
            ->first();

        if (! $sequenceRow) {
            throw new \RuntimeException("فترة التسلسل الطبي ({$period}) غير مهيأة في قاعدة البيانات. يرجى تهيئة الفترة أولاً.");
        }

        if ((int) $sequenceRow->current_sequence >= 99999) {
            throw new \RuntimeException("تم استنفاد السعة القصوى المسموحة لأرقام الملفات الطبية الشهرية ({$period} - 99999).");
        }

        $nextSeq = (int) $sequenceRow->current_sequence + 1;

        DB::table('mrn_sequences')
            ->where('period', $period)
            ->update([
                'current_sequence' => $nextSeq,
                'updated_at'       => now(),
            ]);

        return sprintf('MRN-%s-%05d', $period, $nextSeq);
    }
}
