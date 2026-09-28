<?php

namespace App\Http\Requests\Diagnostics;

use Illuminate\Foundation\Http\FormRequest;

class EnterDiagnosticResultRequest extends FormRequest
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
            'result_value' => ['required', 'string', 'max:2000'],
            'reference_range' => ['nullable', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:50'],
            'interpretation' => ['nullable', 'string', 'in:normal,abnormal,critical'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
