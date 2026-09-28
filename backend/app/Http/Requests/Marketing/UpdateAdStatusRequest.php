<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdStatusRequest extends FormRequest
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
            'status' => ['required', 'string', 'in:active,paused,rejected,expired'],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:500'],
        ];
    }
}
