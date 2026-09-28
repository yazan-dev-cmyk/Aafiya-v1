<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class CreateClinicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['doctor', 'admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'wilaya' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:25'],
            'max_patients_per_slot' => ['nullable', 'integer', 'min:1', 'max:10'],
            'slot_duration_min' => ['nullable', 'integer', 'in:60'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
