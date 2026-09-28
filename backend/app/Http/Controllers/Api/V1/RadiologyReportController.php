<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Diagnostics\CreateRadiologyReportRequest;
use App\Http\Resources\RadiologyReportResource;
use App\Models\DiagnosticOrder;
use App\Models\RadiologyReport;
use App\Services\DiagnosticService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RadiologyReportController extends Controller
{
    public function __construct(
        protected DiagnosticService $diagnosticService
    ) {}

    /**
     * Show radiology report for an order.
     */
    public function show(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        // 1. Authorize access to parent diagnostic order
        $this->diagnosticService->authorizeOrderAccess($diagnosticOrder, $user);

        // 2. Ensure order belongs to radiology domain
        if ($diagnosticOrder->order_type !== 'radiology') {
            abort(403, 'غير مصرح: طلب الفحوصات ليس من اختصاص الأشعة والتصوير الطبي.');
        }

        $report = $diagnosticOrder->radiologyReport;
        if (! $report) {
            return response()->json(['message' => 'لا يوجد تقرير أشعة مسجل لهذا الطلب.'], 404);
        }

        // 3. Ensure report strictly belongs to this order
        if ($report->diagnostic_order_id !== $diagnosticOrder->id) {
            abort(403, 'تقرير الأشعة غير مطابق لهذا الطلب.');
        }

        return response()->json([
            'data' => new RadiologyReportResource($report->load('reporter')),
        ]);
    }

    /**
     * Create or update draft radiology report.
     */
    public function store(CreateRadiologyReportRequest $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $report = $this->diagnosticService->createRadiologyReport(
            $diagnosticOrder,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'تم حفظ مسودة تقرير الأشعة وتوثيق الدراسة بنجاح.',
            'data' => new RadiologyReportResource($report->load('reporter')),
        ], 201);
    }

    /**
     * Finalize radiology report (Radiologist Manager sign-off).
     */
    public function finalize(Request $request, RadiologyReport $radiologyReport): JsonResponse
    {
        $finalized = $this->diagnosticService->finalizeRadiologyReport(
            $radiologyReport,
            $request->user()
        );

        return response()->json([
            'message' => 'تم اعتماد وقفل تقرير الأشعة بنجاح (Finalized Radiology Report).',
            'data' => new RadiologyReportResource($finalized->load(['reporter', 'order.patient', 'order.doctor.user'])),
        ]);
    }
}
