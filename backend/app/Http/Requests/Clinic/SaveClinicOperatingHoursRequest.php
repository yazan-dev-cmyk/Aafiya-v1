<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class SaveClinicOperatingHoursRequest extends FormRequest
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
            'days.*.periods' => ['nullable', 'array'],
            'days.*.periods.*.open_time' => ['required_with:days.*.periods.*.close_time', 'date_format:H:i'],
            'days.*.periods.*.close_time' => ['required_with:days.*.periods.*.open_time', 'date_format:H:i'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'days.size' => 'يجب إرسال جدول تشغيل العيادة لجميع الأيام السبعة (0 إلى 6).',
        ];
    }
}
