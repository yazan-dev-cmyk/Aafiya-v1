<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminAssistantLedgerTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assistant_id' => $this->assistant_id,
            'transaction_type' => $this->transaction_type,
            'direction' => $this->direction,
            'amount' => (float) $this->amount,
            'balance_after' => (float) $this->balance_after,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'notes' => $this->notes,
            'idempotency_key' => $this->idempotency_key,
            'created_at' => $this->created_at?->toIso8601String(),
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ] : null;
            }),
        ];
    }
}
