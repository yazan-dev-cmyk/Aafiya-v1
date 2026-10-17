<?php

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;

class SaveDoctorScheduleRequest extends FormRequest
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
        return [
            'days' => ['required', 'array', 'size:7'],
            'days.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'days.*.is_closed' => ['required', 'boolean'],
            'days.*.slots' => ['nullable', 'array'],
            'days.*.slots.*' => [
                'string',
                'in:08:00,09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'days.size' => 'يجب إرسال جدول كامل يشمل جميع الأيام السبعة للأسبوع (من السبت 0 إلى الجمعة 6).',
            'days.*.slots.*.in' => 'فترة الحجز غير صالحة. الفترات المسموحة تبدأ على رأس الساعة من 08:00 حتى 16:00 كحد أقصى (فترة 17:00 مخصصة للإغلاق ومحظورة).',
        ];
    }
}
