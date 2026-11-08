<?php

namespace App\Http\Requests\Marketing\Ticker;

use App\Models\AdvertisementPlacement;
use App\Rules\SafeDestinationUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateTickerCampaignRequest extends FormRequest
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
            'clinic_id' => ['nullable', 'uuid', 'exists:clinics,id'],
            'doctor_id' => ['nullable', 'uuid', 'exists:doctors,id'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:5000'],
            'banner_image_url' => ['nullable', 'string', 'max:1000'],
            'target_url' => ['nullable', 'string', 'max:1000', new SafeDestinationUrl()],
            'priority' => ['nullable', 'integer', 'between:-1000,1000'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'pending_approval', 'active', 'paused', 'expired', 'rejected'])],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'placements' => ['required', 'array', 'min:1'],
            'placements.*.destination' => ['required', 'string', Rule::in(AdvertisementPlacement::DESTINATIONS)],
            'placements.*.audience' => ['required', 'string', Rule::in(AdvertisementPlacement::AUDIENCES)],
        ];
    }
}
