<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterDoctorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // User identity fields
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],

            // Doctor clinical profile fields
            'specialty_id' => [
                'required_without:specialty',
                'nullable',
                'integer',
                Rule::exists('medical_specialties', 'id')->where('is_active', true),
            ],
            'specialty' => ['required_without:specialty_id', 'nullable', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:100', 'unique:doctors,license_number'],
            'bio' => ['nullable', 'string', 'max:2000'],

            // Optional founding clinic fields
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'wilaya' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'clinic_phone' => ['nullable', 'string', 'max:20'],
        ];
    }
}
