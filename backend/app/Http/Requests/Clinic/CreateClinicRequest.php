<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'wilaya' => ['required_without:wilaya_code', 'nullable', 'string', 'max:100'],
            'commune' => ['nullable', 'string', 'max:100'],
            'wilaya_code' => [
                'required_without:wilaya',
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
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'google_maps_link' => ['nullable', 'string', 'max:500'],
            'phone' => ['required', 'string', 'max:25'],
            'max_patients_per_slot' => ['nullable', 'integer', 'min:1', 'max:10'],
            'slot_duration_min' => ['nullable', 'integer', 'in:60'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

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
