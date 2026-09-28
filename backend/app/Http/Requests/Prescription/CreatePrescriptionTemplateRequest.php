<?php

namespace App\Http\Requests\Prescription;

use Illuminate\Foundation\Http\FormRequest;

class CreatePrescriptionTemplateRequest extends FormRequest
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
            'clinic_id' => ['nullable', 'uuid', 'exists:clinics,id'],
            'template_name' => ['required', 'string', 'max:255'],
            'items_json' => ['required', 'array', 'min:1'],
            'is_shared' => ['nullable', 'boolean'],
        ];
    }
}
