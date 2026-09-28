<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class CreateClinicalVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if ($user && $user->hasRole('doctor') && $user->doctor && $user->doctor->is_verified === false) {
            return false;
        }

        return true;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'clinic_id' => ['required', 'uuid', 'exists:clinics,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'appointment_id' => ['nullable', 'uuid', 'exists:appointments,id'],
            'visit_date' => ['nullable', 'date_format:Y-m-d'],
            'chief_complaint' => ['required', 'string', 'max:2000'],
            'vital_signs_json' => ['nullable', 'array'],
            'vital_signs_json.blood_pressure' => ['nullable', 'string', 'max:20'],
            'vital_signs_json.heart_rate' => ['nullable', 'numeric'],
            'vital_signs_json.temperature' => ['nullable', 'numeric'],
            'vital_signs_json.respiratory_rate' => ['nullable', 'numeric'],
            'vital_signs_json.spo2' => ['nullable', 'numeric'],
            'vital_signs_json.weight' => ['nullable', 'numeric'],
            'vital_signs_json.height' => ['nullable', 'numeric'],
            'physical_examination' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'clinical_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
