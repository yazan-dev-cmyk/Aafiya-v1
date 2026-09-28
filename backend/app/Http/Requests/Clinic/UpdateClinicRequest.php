<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClinicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
            'wilaya' => ['sometimes', 'required', 'string', 'max:100'],
            'phone' => ['sometimes', 'required', 'string', 'max:25'],
            'max_patients_per_slot' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'slot_duration_min' => ['sometimes', 'integer', 'in:60'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
