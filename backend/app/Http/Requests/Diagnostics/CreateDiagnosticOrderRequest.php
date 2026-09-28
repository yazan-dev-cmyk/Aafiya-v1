<?php

namespace App\Http\Requests\Diagnostics;

use Illuminate\Foundation\Http\FormRequest;

class CreateDiagnosticOrderRequest extends FormRequest
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
            'diagnostic_center_id' => ['nullable', 'uuid', 'exists:diagnostic_centers,id'],
            'order_type' => ['required', 'string', 'in:laboratory,radiology'],
            'clinical_indication' => ['nullable', 'string', 'max:2000'],
            'priority' => ['nullable', 'string', 'in:routine,urgent,stat'],
            'ordered_at' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.test_name' => ['required', 'string', 'max:255'],
            'items.*.test_code' => ['nullable', 'string', 'max:50'],
        ];
    }
}
