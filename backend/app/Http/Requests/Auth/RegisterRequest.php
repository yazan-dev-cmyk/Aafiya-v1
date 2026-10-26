<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', 'string', Rule::in(['patient_registered', 'booking_center'])],
            'specialty' => ['nullable', 'string', 'max:255'],
            'specialty_id' => ['nullable', 'integer', 'exists:medical_specialties,id'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'clinic_name' => ['nullable', 'string', 'max:255'],
            'clinic_phone' => ['nullable', 'string', 'max:20'],
            'commercial_register' => ['nullable', 'string', 'max:100'],
            'manager_name' => ['nullable', 'string', 'max:255'],

            // Location parameters: Canonical Master Data Codes (Primary contract)
            'wilaya_code' => [
                'nullable',
                'string',
                'max:10',
                'required_with:commune_code',
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

            // Location parameters: Legacy / direct ID fallbacks
            'wilaya' => ['nullable', 'string', 'max:100'],
            'commune' => ['nullable', 'string', 'max:100'],
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

            'accepted_terms' => ['required', 'accepted'],
            'terms_version' => ['nullable', 'string', 'max:50'],
            'optional_analytics_consent' => ['nullable', 'boolean'],
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
            'role.in' => 'الدور المحدد غير مصرح به للتسجيل العام.',
            'accepted_terms.required' => 'يجب إقرار وقبول شروط الخدمة والاطلاع على إشعار الخصوصية لإتمام إنشاء الحساب.',
            'accepted_terms.accepted' => 'يجب إقرار وقبول شروط الخدمة والاطلاع على إشعار الخصوصية لإتمام إنشاء الحساب.',
            'wilaya_code.exists' => 'الولاية المحددة غير صالحة أو غير مفعلة.',
            'wilaya_code.required_with' => 'يجب تحديد رمز الولاية عند إدخال البلدية.',
            'commune_code.exists' => 'البلدية المحددة غير صالحة، أو لا تنتمي إلى الولاية المختارة.',
            'latitude.between' => 'خط العرض الجغرافي يجب أن يكون بين -90 و 90 درجة.',
            'longitude.between' => 'خط الطول الجغرافي يجب أن يكون بين -180 و 180 درجة.',
            'latitude.required_with' => 'يجب توفير خط العرض مع خط الطول.',
            'longitude.required_with' => 'يجب توفير خط الطول مع خط العرض.',
        ];
    }
}
