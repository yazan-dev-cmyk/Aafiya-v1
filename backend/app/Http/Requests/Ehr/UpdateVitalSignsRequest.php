<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVitalSignsRequest extends FormRequest
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
            'vital_signs' => ['required', 'array'],
            'vital_signs.blood_pressure' => ['nullable', 'string', 'max:20'],
            'vital_signs.heart_rate' => ['nullable', 'numeric'],
            'vital_signs.temperature' => ['nullable', 'numeric'],
            'vital_signs.respiratory_rate' => ['nullable', 'numeric'],
            'vital_signs.spo2' => ['nullable', 'numeric'],
            'vital_signs.weight' => ['nullable', 'numeric'],
            'vital_signs.height' => ['nullable', 'numeric'],
        ];
    }
}
