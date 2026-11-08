<?php

namespace App\Http\Requests\Marketing\Ticker;

use App\Rules\SafeDestinationUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTickerCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->hasRole('admin');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string', 'max:5000'],
            'banner_image_url' => ['nullable', 'string', 'max:1000'],
            'target_url' => ['nullable', 'string', 'max:1000', new SafeDestinationUrl()],
            'priority' => ['nullable', 'integer', 'between:-1000,1000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(['draft', 'pending_approval', 'active', 'paused', 'expired', 'rejected'])],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];
    }
}
