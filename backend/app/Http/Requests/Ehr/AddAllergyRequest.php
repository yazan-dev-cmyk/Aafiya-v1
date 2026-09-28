<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class AddAllergyRequest extends FormRequest
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
            'allergen' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'string', 'in:mild,moderate,severe,life_threatening'],
            'reaction' => ['nullable', 'string', 'max:1000'],
            'diagnosed_at' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
