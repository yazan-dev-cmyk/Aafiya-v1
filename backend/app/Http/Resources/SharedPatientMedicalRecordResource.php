<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SharedPatientMedicalRecordResource extends JsonResource
{
    protected ?string $accessGrantedAt;
    protected ?string $expiresAt;

    public function __construct($resource, ?string $accessGrantedAt = null, ?string $expiresAt = null)
    {
        parent::__construct($resource);
        $this->accessGrantedAt = $accessGrantedAt ?: now()->toIso8601String();
        $this->expiresAt = $expiresAt;
    }

    /**
     * Transform the resource into an array with strict data minimization (DEC-P05-04).
     *
     * EXCLUDED PROHIBITED FIELDS:
     * - phone
     * - email
     * - national_id
     * - address
     * - wilaya_id
     * - user_id
     *
     * INCLUDED CLINICAL FIELDS:
     * - id, mrn, first_name, last_name, full_name, gender, date_of_birth, blood_group
     * - allergies, chronic_conditions, current_medications
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'scope' => 'all_emr',
            'patient' => [
                'id' => $this->id,
                'mrn' => $this->mrn,
                'first_name' => $this->first_name,
                'last_name' => $this->last_name,
                'full_name' => $this->full_name,
                'gender' => $this->gender,
                'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
                'blood_group' => $this->blood_group,
                'allergies' => PatientAllergyResource::collection($this->whenLoaded('allergies')),
                'chronic_conditions' => PatientChronicConditionResource::collection($this->whenLoaded('chronicConditions')),
                'current_medications' => PatientCurrentMedicationResource::collection($this->whenLoaded('currentMedications')),
            ],
            'share_metadata' => [
                'scope' => 'all_emr',
                'access_granted_at' => $this->accessGrantedAt,
                'expires_at' => $this->expiresAt,
                'authorized_clinical_scope' => 'ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)',
            ],
        ];
    }
}
