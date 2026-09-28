<?php

namespace App\Http\Requests\Ehr;

use Illuminate\Foundation\Http\FormRequest;

class AddEmergencyContactRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'relationship' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:50'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
