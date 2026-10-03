<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OnboardDoctorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $existingDoctorId = $this->user()?->doctor?->id;

        return [
            'specialty_id' => [
                'required_without:specialty',
                'nullable',
                'integer',
                Rule::exists('medical_specialties', 'id')->where('is_active', true),
            ],
            'specialty' => ['required_without:specialty_id', 'nullable', 'string', 'max:255'],
            'license_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('doctors', 'license_number')->ignore($existingDoctorId),
            ],
            'bio' => ['nullable', 'string', 'max:2000'],
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'wilaya' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'clinic_id' => ['nullable', 'uuid', 'exists:clinics,id'],
            'position' => ['nullable', 'string', 'in:director,doctor'],
        ];
    }
}
