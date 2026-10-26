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
            'commune' => ['nullable', 'string', 'max:100'],
            'wilaya_code' => [
                'nullable',
                'string',
                'max:10',
                Rule::exists('wilayas', 'code')->where('is_active', true),
            ],
            'commune_code' => [
                'nullable',
                'string',
                'max:20',
                Rule::exists('communes', 'code')->where(function ($query) {
                    $query->where('is_active', true);
                    if ($this->filled('wilaya_code')) {
                        $wilayaId = \App\Models\Wilaya::where('code', $this->input('wilaya_code'))->value('id');
                        $query->where('wilaya_id', $wilayaId ?? 0);
                    }
                }),
            ],
            'wilaya_id' => ['nullable', 'integer', 'exists:wilayas,id'],
            'commune_id' => [
                'nullable',
                'integer',
                Rule::exists('communes', 'id')->where(function ($query) {
                    $query->where('is_active', true);
                    if ($this->filled('wilaya_id')) {
                        $query->where('wilaya_id', $this->input('wilaya_id'));
                    }
                }),
            ],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'google_maps_link' => ['nullable', 'string', 'max:500'],
            'clinic_phone' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'wilaya_code.exists' => 'الولاية المحددة غير صالحة أو غير مفعلة.',
            'commune_code.exists' => 'البلدية المحددة غير صالحة، أو لا تنتمي إلى الولاية المختارة.',
            'latitude.between' => 'خط العرض الجغرافي يجب أن يكون بين -90 و 90 درجة.',
            'longitude.between' => 'خط الطول الجغرافي يجب أن يكون بين -180 و 180 درجة.',
            'latitude.required_with' => 'يجب توفير خط العرض مع خط الطول.',
            'longitude.required_with' => 'يجب توفير خط الطول مع خط العرض.',
        ];
    }
}
