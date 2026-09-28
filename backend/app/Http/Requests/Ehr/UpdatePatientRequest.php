<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
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
        $patientId = $this->route('patient')?->id ?? $this->route('id');

        return [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'gender' => ['sometimes', 'string', 'in:male,female'],
            'date_of_birth' => ['sometimes', 'date_format:Y-m-d', 'before:today'],
            'blood_group' => ['nullable', 'string', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-,unknown'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'national_id' => ['nullable', 'string', 'max:50', "unique:patients,national_id,{$patientId},id"],
            'address' => ['nullable', 'string', 'max:255'],
            'wilaya' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
