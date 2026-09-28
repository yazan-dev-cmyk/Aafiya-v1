<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class AssignDoctorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'position' => ['required', 'in:director,doctor'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
