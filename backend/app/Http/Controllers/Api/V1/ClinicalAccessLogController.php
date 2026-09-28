<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClinicalAccessLogResource;
use App\Services\ClinicalAccessLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClinicalAccessLogController extends Controller
{
    public function __construct(
        protected ClinicalAccessLogService $auditService
    ) {}

    /**
     * List clinical access audit trail.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'patient_id' => ['nullable', 'string'],
            'resource_type' => ['nullable', 'string'],
            'action' => ['nullable', 'string'],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'sort_by' => ['nullable', 'string', 'in:created_at,action,resource_type'],
            'sort_order' => ['nullable', 'string', 'in:asc,desc,ASC,DESC'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = $this->auditService->getLogs(
            $validated,
            $request->user()
        );

        return ClinicalAccessLogResource::collection($logs);
    }
}
