<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class CreatePackagePurchaseRequest extends FormRequest
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
            'package_id' => ['required', 'uuid', 'exists:booking_packages,id'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
            'receipt_document_path' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
