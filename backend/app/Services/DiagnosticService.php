<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicalVisit;
use App\Models\DiagnosticCenter;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use App\Models\DiagnosticStaff;
use App\Models\LaboratorySample;
use App\Models\Patient;
use App\Models\RadiologyReport;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DiagnosticService
{
    /**
     * Create a diagnostic order containing one or multiple test items.
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $items
     */
    public function createOrder(array $data, array $items, User $doctorUser): DiagnosticOrder
    {
        return DB::transaction(function () use ($data, $items, $doctorUser) {
            $doctor = $doctorUser->doctor;
            if (! $doctor) {
                throw ValidationException::withMessages([
                    'doctor' => ['يجب أن يكون المستخدم طبيباً مسجلاً لإصدار طلب فحوصات طبية.'],
                ]);
            }

            $clinic = Clinic::findOrFail($data['clinic_id']);
            $membership = $doctor->clinics()->where('clinics.id', $clinic->id)->first();
            if (! $membership) {
                abort(403, 'غير مصرح: الطبيب غير منتسب لهذه العيادة.');
            }
            if (! ($membership->pivot->is_active ?? false)) {
                abort(403, 'غير مصرح: تم تعليق حساب الطبيب في هذه العيادة.');
            }

            $patient = Patient::findOrFail($data['patient_id']);

            $reference = $this->generateOrderReference();
            $secureToken = $this->generateUniqueSecureToken();

            $order = DiagnosticOrder::create([
                'order_reference' => $reference,
                'secure_token' => $secureToken,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'clinical_visit_id' => $data['clinical_visit_id'] ?? null,
                'diagnostic_center_id' => $data['diagnostic_center_id'] ?? null,
                'order_type' => $data['order_type'] ?? 'laboratory',
                'clinical_indication' => $data['clinical_indication'] ?? null,
                'priority' => $data['priority'] ?? 'routine',
                'status' => 'created',
                'ordered_at' => Carbon::parse($data['ordered_at'] ?? now()),
            ]);

            foreach ($items as $item) {
                DiagnosticOrderItem::create([
                    'diagnostic_order_id' => $order->id,
                    'test_name' => $item['test_name'],
                    'test_code' => $item['test_code'] ?? null,
                    'status' => 'pending',
                ]);
            }

            return $order->load(['patient', 'doctor.user', 'clinic', 'items']);
        });
    }

    /**
     * Diagnostic center acknowledges receipt of an order.
     */
    public function receiveOrder(DiagnosticOrder $order, DiagnosticCenter $center, User $user): DiagnosticOrder
    {
        $this->authorizeCenterStaff($center, $user);

        $order->update([
            'diagnostic_center_id' => $center->id,
            'status' => 'received',
        ]);

        return $order->fresh(['patient', 'doctor.user', 'clinic', 'items', 'diagnosticCenter']);
    }

    /**
     * Create physical laboratory sample tracking (Chain of custody - P6 Section 4).
     *
     * @param array<string, mixed> $data
     */
    public function createLaboratorySample(DiagnosticOrder $order, array $data, User $user): LaboratorySample
    {
        if ($order->diagnostic_center_id) {
            $center = DiagnosticCenter::findOrFail($order->diagnostic_center_id);
            $this->authorizeCenterStaff($center, $user);
        }

        $barcode = $this->generateSampleBarcode();

        return LaboratorySample::create([
            'diagnostic_order_id' => $order->id,
            'sample_barcode' => $barcode,
            'sample_type' => $data['sample_type'],
            'collected_at' => now(),
            'collected_by_id' => $user->id,
            'status' => 'collected',
        ]);
    }

    /**
     * Enter/update draft test results (Entered by Assistant - Internal Only).
     *
     * @param array<string, mixed> $resultData
     */
    public function enterOrderItemResult(DiagnosticOrderItem $item, array $resultData, User $staffUser): DiagnosticOrderItem
    {
        if ($item->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => ['لا يمكن تعديل نتيجة فحص معتمدة ومقفلة نهائياً.'],
            ]);
        }

        $order = $item->order;
        if ($order->diagnostic_center_id) {
            $center = DiagnosticCenter::findOrFail($order->diagnostic_center_id);
            $this->authorizeCenterStaff($center, $staffUser);
        }

        $item->update([
            'result_value' => $resultData['result_value'],
            'reference_range' => $resultData['reference_range'] ?? $item->reference_range,
            'unit' => $resultData['unit'] ?? $item->unit,
            'interpretation' => $resultData['interpretation'] ?? null,
            'notes' => $resultData['notes'] ?? $item->notes,
            'status' => 'resulted',
        ]);

        // Update parent order status to processing/resulted if not finalized
        if ($order->status !== 'finalized') {
            $order->update(['status' => 'resulted']);
        }

        return $item->fresh();
    }

    /**
     * Finalize and officially sign laboratory results (Manager sign-off - P6 Section 3 & 7).
     */
    public function finalizeOrderResults(DiagnosticOrder $order, User $managerUser): DiagnosticOrder
    {
        if ($order->isFinalized()) {
            return $order;
        }

        if (! $order->diagnostic_center_id) {
            throw ValidationException::withMessages([
                'diagnostic_center' => ['الطلب غير مسند لمركز تشخيصي بعد.'],
            ]);
        }

        $center = DiagnosticCenter::findOrFail($order->diagnostic_center_id);
        $this->authorizeCenterManager($center, $managerUser);

        DB::transaction(function () use ($order) {
            $order->items()->update(['status' => 'finalized']);
            $order->update(['status' => 'finalized']);
        });

        return $order->fresh(['patient', 'doctor.user', 'clinic', 'items', 'diagnosticCenter']);
    }

    /**
     * Create or update radiology study & report.
     *
     * @param array<string, mixed> $reportData
     */
    public function createRadiologyReport(DiagnosticOrder $order, array $reportData, User $user): RadiologyReport
    {
        if ($order->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => ['تقرير الأشعة معتمد ومقفل ولا يمكن تعديله.'],
            ]);
        }

        if ($order->order_type !== 'radiology') {
            throw ValidationException::withMessages([
                'order_type' => ['طلب الفحوصات ليس من اختصاص الأشعة والتصوير الطبي.'],
            ]);
        }

        if (! $order->diagnostic_center_id) {
            throw ValidationException::withMessages([
                'diagnostic_center' => ['طلب الفحوصات غير مسند لأي مركز أشعة معتمد.'],
            ]);
        }

        $center = DiagnosticCenter::findOrFail($order->diagnostic_center_id);
        if ($center->type !== 'radiology') {
            throw ValidationException::withMessages([
                'center_type' => ['المركز المسند إليه الطلب ليس مركز أشعة معتمد.'],
            ]);
        }
        $this->authorizeCenterStaff($center, $user);

        $report = RadiologyReport::updateOrCreate(
            ['diagnostic_order_id' => $order->id],
            [
                'modality' => $reportData['modality'] ?? 'X-Ray',
                'study_instance_uid' => $reportData['study_instance_uid'] ?? null,
                'image_urls_json' => $reportData['image_urls_json'] ?? null,
                'findings' => $reportData['findings'] ?? null,
                'impression' => $reportData['impression'] ?? null,
                'recommendations' => $reportData['recommendations'] ?? null,
                'status' => 'draft',
            ]
        );

        if ($order->status !== 'finalized') {
            $order->update(['status' => 'processing']);
        }

        return $report->fresh();
    }

    /**
     * Finalize radiology report by Radiologist Manager.
     */
    public function finalizeRadiologyReport(RadiologyReport $report, User $managerUser): RadiologyReport
    {
        if ($report->isFinalized()) {
            return $report;
        }

        $order = $report->order;
        if ($order->diagnostic_center_id) {
            $center = DiagnosticCenter::findOrFail($order->diagnostic_center_id);
            $this->authorizeCenterManager($center, $managerUser);
        }

        if (empty($report->impression)) {
            throw ValidationException::withMessages([
                'impression' => ['يجب تدوين الخلاصة الطبية التشخيصية (Impression) قبل اعتماد التقرير.'],
            ]);
        }

        DB::transaction(function () use ($report, $order, $managerUser) {
            $report->update([
                'status' => 'finalized',
                'reported_by_id' => $managerUser->id,
                'reported_at' => now(),
            ]);

            $order->update(['status' => 'finalized']);
        });

        return $report->fresh(['reporter', 'order.patient', 'order.doctor.user']);
    }

    /**
     * P6 Section 7 Visibility Check: Can actor view internal draft 'resulted' values?
     */
    public function canViewResultedDraft(DiagnosticOrder $order, User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        // Center Manager or Staff can view internal draft
        if ($order->diagnostic_center_id) {
            $center = DiagnosticCenter::find($order->diagnostic_center_id);
            if ($center && $center->user_id === $user->id) {
                return true;
            }
            if (DiagnosticStaff::where('diagnostic_center_id', $order->diagnostic_center_id)->where('user_id', $user->id)->exists()) {
                return true;
            }
        }

        // Lab or Rad Manager/Staff in general
        if ($user->hasRole('lab') || $user->hasRole('radiology') || $user->hasRole('lab_assistant') || $user->hasRole('rad_assistant')) {
            return true;
        }

        // Treating Doctor & Patient: STRICTLY PROHIBITED until finalized (P6 Section 7)
        return false;
    }

    protected function generateOrderReference(): string
    {
        $year = date('Y');
        $prefix = "ORD-{$year}-";

        $latest = DiagnosticOrder::where('order_reference', 'LIKE', "{$prefix}%")
            ->lockForUpdate()
            ->orderBy('order_reference', 'desc')
            ->value('order_reference');

        if (! $latest) {
            return "{$prefix}0001";
        }

        $lastSeq = (int) substr($latest, strlen($prefix));
        $nextSeq = str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);

        return "{$prefix}{$nextSeq}";
    }

    protected function generateSampleBarcode(): string
    {
        $year = date('Y');
        $prefix = "SMP-{$year}-";

        $latest = LaboratorySample::where('sample_barcode', 'LIKE', "{$prefix}%")
            ->lockForUpdate()
            ->orderBy('sample_barcode', 'desc')
            ->value('sample_barcode');

        if (! $latest) {
            return "{$prefix}0001";
        }

        $lastSeq = (int) substr($latest, strlen($prefix));
        $nextSeq = str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);

        return "{$prefix}{$nextSeq}";
    }

    /**
     * Generate a cryptographically secure, collision-safe 64-character token.
     */
    public function generateUniqueSecureToken(): string
    {
        do {
            $token = Str::random(64);
        } while (DiagnosticOrder::where('secure_token', $token)->exists());

        return $token;
    }

    /**
     * Backfill missing secure_token for legacy diagnostic orders (Idempotent & Transaction-safe).
     *
     * @return array{total_checked: int, backfilled: int, unchanged: int}
     */
    public function backfillMissingTokens(): array
    {
        return DB::transaction(function () {
            $missingOrders = DiagnosticOrder::whereNull('secure_token')
                ->lockForUpdate()
                ->get();

            $backfilledCount = 0;

            foreach ($missingOrders as $order) {
                $order->update([
                    'secure_token' => $this->generateUniqueSecureToken(),
                ]);
                $backfilledCount++;
            }

            $totalOrders = DiagnosticOrder::count();

            return [
                'total_checked' => $totalOrders,
                'backfilled' => $backfilledCount,
                'unchanged' => $totalOrders - $backfilledCount,
            ];
        });
    }

    protected function authorizeCenterStaff(DiagnosticCenter $center, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($center->user_id === $user->id) {
            return;
        }

        // Cross-domain role protection
        if ($center->type === 'laboratory' && $user->hasRole('rad_assistant')) {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح: موظف الأشعة لا يملك صلاحية العمل على المخابر الطبية.'],
            ]);
        }

        if ($center->type === 'radiology' && $user->hasRole('lab_assistant')) {
            throw ValidationException::withMessages([
                'authorization' => ['غير مصرح: موظف المخبر لا يملك صلاحية العمل على مراكز الأشعة.'],
            ]);
        }

        $isStaff = DiagnosticStaff::where('diagnostic_center_id', $center->id)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        if (! $isStaff) {
            throw ValidationException::withMessages([
                'authorization' => ['المستخدم غير مصرح له بالعمل على هذا المركز التشخيصي.'],
            ]);
        }
    }

    protected function authorizeCenterManager(DiagnosticCenter $center, User $user): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ($center->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'authorization' => ['الاعتماد النهائي للنتائج والتقارير مقتصر حصراً على مدير المركز الطبي (Manager Sign-Off).'],
            ]);
        }
    }

    /**
     * Determine whether the user is authorized to access the diagnostic order.
     */
    public function canAccessOrder(DiagnosticOrder $order, User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('doctor')) {
            $doctor = $user->doctor;
            if (! $doctor || $doctor->is_verified === false) {
                return false;
            }

            return $order->doctor_id === $doctor->id
                || ($order->clinic_id && $doctor->isDirectorOf($order->clinic_id));
        }

        if ($user->hasRole('doctor_assistant')) {
            $assistantClinicId = $user->clinicAssistant?->clinic_id;

            return (bool) ($assistantClinicId && $order->clinic_id === $assistantClinicId);
        }

        if ($user->hasRole('patient_registered') || $user->hasRole('patient_guest')) {
            return (bool) ($order->patient && $order->patient->user_id === $user->id);
        }

        if ($user->hasRole('lab') || $user->hasRole('radiology')) {
            if (! $order->diagnostic_center_id) {
                return false;
            }

            return $user->managedDiagnosticCenters()
                ->where('is_active', true)
                ->where('id', $order->diagnostic_center_id)
                ->exists();
        }

        if ($user->hasRole('lab_assistant') || $user->hasRole('rad_assistant')) {
            if (! $order->diagnostic_center_id) {
                return false;
            }

            $staff = $user->diagnosticStaffProfile;

            return (bool) (
                $staff &&
                $staff->is_active &&
                ! $staff->trashed() &&
                $staff->center &&
                $staff->center->is_active &&
                $staff->diagnostic_center_id === $order->diagnostic_center_id
            );
        }

        return false;
    }

    /**
     * Authorize access to a diagnostic order or fail closed with HTTP 403.
     */
    public function authorizeOrderAccess(DiagnosticOrder $order, User $user): void
    {
        if (! $this->canAccessOrder($order, $user)) {
            abort(403, 'غير مصرح لك باستعراض طلب الفحوصات الطبية هذا.');
        }
    }
}
