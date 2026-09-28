<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class AddChronicConditionRequest extends FormRequest
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
            'condition_name' => ['required', 'string', 'max:255'],
            'icd10_code' => ['nullable', 'string', 'max:20'],
            'diagnosed_date' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['required', 'string', 'in:active,managed,remission,resolved'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
