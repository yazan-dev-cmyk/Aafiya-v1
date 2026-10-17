<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDoctorProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->hasRole('doctor');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            // Permitted self-service fields
            'name'           => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'phone'          => ['sometimes', 'required', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($userId)],
            'specialty_id'   => ['sometimes', 'required', 'integer', Rule::exists('medical_specialties', 'id')->where('is_active', true)],
            'bio'            => ['sometimes', 'nullable', 'string', 'max:2000'],

            // Strictly prohibited fields (Immutable / Regulatory / Identity sensitive)
            'email'          => ['prohibited'],
            'license_number' => ['prohibited'],
            'is_verified'    => ['prohibited'],
            'id'             => ['prohibited'],
            'user_id'        => ['prohibited'],
            'doctor_id'      => ['prohibited'],
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
            'name.required'             => 'الاسم الكامل مطلوب ولا يمكن تركه فارغاً.',
            'name.min'                  => 'يجب ألا يقل الاسم عن حرفين.',
            'phone.required'            => 'رقم الهاتف مطلوب ولا يمكن تركه فارغاً.',
            'phone.unique'              => 'رقم الهاتف مستخدم بالفعل من قبل حساب آخر.',
            'specialty_id.exists'       => 'التخصص الطبي المحدد غير صالح أو غير نشط في دليل التخصصات المعتمدة.',
            'email.prohibited'          => 'لا يمكن تعديل البريد الإلكتروني من خلال إعدادات الملف الشخصي.',
            'license_number.prohibited' => 'رقم الترخيص الطبي معتمد ولا يمكن تعديله ذاتياً لحماية التوثيق المهني.',
            'is_verified.prohibited'    => 'حالة التوثيق تخضع لإدارة المنصة حصراً.',
            'id.prohibited'             => 'لا يمكن تعديل المعرف الأساسي.',
            'user_id.prohibited'        => 'لا يمكن تمرير معرف المستخدم.',
            'doctor_id.prohibited'      => 'لا يمكن تمرير معرف الطبيب.',
        ];
    }
}
