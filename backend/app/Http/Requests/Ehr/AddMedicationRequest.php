<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class AddMedicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'medication_name' => ['required', 'string', 'max:255'],
            'dosage' => ['required', 'string', 'max:100'],
            'frequency' => ['required', 'string', 'max:100'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'prescribed_by' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
