<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Diagnostics\CreateLaboratorySampleRequest;
use App\Http\Resources\LaboratorySampleResource;
use App\Models\DiagnosticOrder;
use App\Models\LaboratorySample;
use App\Services\DiagnosticService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LaboratorySampleController extends Controller
{
    public function __construct(
        protected DiagnosticService $diagnosticService
    ) {}

    /**
     * List samples for an order.
     */
    public function index(Request $request, DiagnosticOrder $diagnosticOrder): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        // 1. Authorize access to parent diagnostic order
        $this->diagnosticService->authorizeOrderAccess($diagnosticOrder, $user);

        // 2. Ensure order belongs to laboratory domain
        if ($diagnosticOrder->order_type !== 'laboratory') {
            abort(403, 'غير مصرح: طلب الفحوصات ليس من اختصاص التحاليل المخبرية.');
        }

        $samples = $diagnosticOrder->samples()->with(['collector', 'receiver'])->get();

        return LaboratorySampleResource::collection($samples);
    }

    /**
     * Create/collect a new laboratory sample.
     */
    public function store(CreateLaboratorySampleRequest $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        // 1. Ensure order belongs to laboratory domain
        if ($diagnosticOrder->order_type !== 'laboratory') {
            abort(403, 'غير مصرح: طلب الفحوصات ليس من اختصاص التحاليل المخبرية.');
        }

        // 2. Fail closed if order is not assigned to a diagnostic center
        if (! $diagnosticOrder->diagnostic_center_id) {
            abort(403, 'غير مصرح: طلب الفحوصات غير مسند لأي مخبر طبي معتمد.');
        }

        $center = $diagnosticOrder->diagnosticCenter;
        if ($center && $center->type !== 'laboratory') {
            abort(403, 'غير مصرح: سحب وتسجيل العينات مخصص للمخابر الطبية فقط.');
        }

            if (! $user->hasRole('admin') && $center && $center->user_id !== $user->id) {
                if (! $user->hasRole('lab_assistant')) {
                    abort(403, 'غير مصرح: هذه العملية مخصصة لطاقم المخبر الطبي فقط.');
                }

                $staff = $user->diagnosticStaffProfile;
                if (! $staff || $staff->diagnostic_center_id !== $center->id || ! $staff->is_active || $staff->trashed()) {
                    abort(403, 'غير مصرح: حساب موظف المخبر غير نشط أو غير مسجل في هذا المركز.');
                }

                if (! $user->has4DAccess('lab.manage_orders', scope: ['diagnostic_center_id' => $center->id])) {
                    abort(403, 'غير مصرح: لا تملك صلاحية إدارة عينات المخبر (lab.manage_orders).');
                }
            }

        $sample = $this->diagnosticService->createLaboratorySample(
            $diagnosticOrder,
            $request->validated(),
            $user
        );

        return response()->json([
            'message' => 'تم تسجيل وسحب العينة المخبرية وتوليد الباركود بنجاح.',
            'data' => new LaboratorySampleResource($sample->load('collector')),
        ], 201);
    }

    /**
     * Update sample reception / status.
     */
    public function updateStatus(Request $request, LaboratorySample $sample): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $order = $sample->diagnosticOrder;
        if (! $order || ! $order->diagnostic_center_id) {
            abort(403, 'غير مصرح: العينة غير مرتبطة بمركز تشخيصي معتمد.');
        }

        $center = $order->diagnosticCenter;
        if (! $center || $center->type !== 'laboratory') {
            abort(403, 'غير مصرح: هذه العملية مخصصة للمخابر الطبية فقط.');
        }

        // Authorization check: User must be Admin, Lab Center Director, or Active Lab Staff of THIS center
        if (! $user->hasRole('admin')) {
            if ($center->user_id !== $user->id) {
                if (! $user->hasRole('lab_assistant')) {
                    abort(403, 'غير مصرح: هذه العملية مخصصة لطاقم المخبر الطبي فقط.');
                }

                $staff = $user->diagnosticStaffProfile;
                if (! $staff || $staff->diagnostic_center_id !== $center->id || ! $staff->is_active || $staff->trashed()) {
                    abort(403, 'غير مصرح: حساب موظف المخبر غير نشط أو غير مسجل في هذا المركز.');
                }

                // Check permission: lab.manage_orders
                if (! $user->has4DAccess('lab.manage_orders', scope: ['diagnostic_center_id' => $center->id])) {
                    abort(403, 'غير مصرح: لا تملك صلاحية إدارة عينات المخبر (lab.manage_orders).');
                }
            }
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:collected,received,rejected,processed'],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $updateData = ['status' => $data['status']];
        if ($data['status'] === 'received') {
            $updateData['received_at'] = now();
            $updateData['received_by_id'] = $user->id;
        }
        if (isset($data['rejection_reason'])) {
            $updateData['rejection_reason'] = $data['rejection_reason'];
        }

        $sample->update($updateData);

        return response()->json([
            'message' => 'تم تحديث حالة العينة بنجاح.',
            'data' => new LaboratorySampleResource($sample->fresh(['collector', 'receiver'])),
        ]);
    }
}
