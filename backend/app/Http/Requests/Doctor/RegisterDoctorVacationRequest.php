<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use Illuminate\Foundation\Http\FormRequest;

class RegisterDoctorVacationRequest extends FormRequest
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
            'vacation_start' => ['required', 'date_format:Y-m-d'],
            'vacation_end'   => ['required', 'date_format:Y-m-d', 'after_or_equal:vacation_start'],
            'clinic_ids'     => ['nullable', 'array'],
            'clinic_ids.*'   => ['uuid'],
            'reason'         => ['nullable', 'string', 'max:255'],
            'notes'          => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vacation_start.required'    => 'تاريخ بداية الإجازة مطلوب (YYYY-MM-DD).',
            'vacation_end.required'      => 'تاريخ نهاية الإجازة مطلوب (YYYY-MM-DD).',
            'vacation_end.after_or_equal' => 'تاريخ نهاية الإجازة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
        ];
    }
}
