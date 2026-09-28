<?php

namespace App\Http\Resources;

use App\Services\DiagnosticService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticOrderItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $diagService = app(DiagnosticService::class);
        $order = $this->order;

        // P6 Section 7 Invariant: draft 'resulted' values are invisible to treating doctor & patient until 'finalized'!
        $canSeeDraftResult = $user ? $diagService->canViewResultedDraft($order, $user) : false;
        $isReleased = ($this->status === 'finalized') || $canSeeDraftResult;

        return [
            'id' => $this->id,
            'diagnostic_order_id' => $this->diagnostic_order_id,
            'test_name' => $this->test_name,
            'test_code' => $this->test_code,
            'status' => $this->status,
            'is_finalized' => $this->isFinalized(),
            'result_value' => $isReleased ? $this->result_value : null,
            'reference_range' => $isReleased ? $this->reference_range : null,
            'unit' => $isReleased ? $this->unit : null,
            'interpretation' => $isReleased ? $this->interpretation : null,
            'notes' => $isReleased ? $this->notes : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
