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
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'google_maps_link' => ['sometimes', 'nullable', 'string', 'max:500'],
            'max_patients_per_slot' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'slot_duration_min' => ['sometimes', 'integer', 'in:60'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'latitude.between' => 'خط العرض الجغرافي يجب أن يكون بين -90 و 90 درجة.',
            'longitude.between' => 'خط الطول الجغرافي يجب أن يكون بين -180 و 180 درجة.',
            'latitude.required_with' => 'يجب توفير خط العرض مع خط الطول.',
            'longitude.required_with' => 'يجب توفير خط الطول مع خط العرض.',
        ];
    }
}
