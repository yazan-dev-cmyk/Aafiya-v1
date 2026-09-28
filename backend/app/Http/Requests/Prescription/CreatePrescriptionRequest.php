<?php

namespace App\Http\Requests\Prescription;

use Illuminate\Foundation\Http\FormRequest;

class CreatePrescriptionRequest extends FormRequest
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
            'clinical_visit_id' => ['nullable', 'uuid', 'exists:clinical_visits,id'],
            'issue_date' => ['nullable', 'date_format:Y-m-d'],
            'validity_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medication_name' => ['required', 'string', 'max:255'],
            'items.*.dosage' => ['required', 'string', 'max:100'],
            'items.*.frequency' => ['required', 'string', 'max:100'],
            'items.*.duration' => ['required', 'string', 'max:100'],
            'items.*.instructions' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
