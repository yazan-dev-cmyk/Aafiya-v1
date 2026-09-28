<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClinicalVisitRequest extends FormRequest
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
            'visit_date' => ['nullable', 'date_format:Y-m-d'],
            'chief_complaint' => ['nullable', 'string', 'max:2000'],
            'vital_signs_json' => ['nullable', 'array'],
            'physical_examination' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'clinical_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
