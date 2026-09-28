<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClinicController;
use App\Http\Controllers\Api\V1\DoctorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth.register');
    Route::post('/register-doctor', [\App\Http\Controllers\Api\V1\DoctorOnboardingController::class, 'registerDoctor'])->middleware('throttle:auth.register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth.login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

// System Initialization & Setup Routes (First Admin Setup)
Route::prefix('system')->group(function () {
    Route::get('/setup-status', [\App\Http\Controllers\Api\V1\SystemSetupController::class, 'status']);
    Route::post('/setup-admin', [\App\Http\Controllers\Api\V1\SystemSetupController::class, 'setupAdmin'])->middleware('throttle:auth.register');
});

// System Health & Liveness Probes
Route::get('/health', [\App\Http\Controllers\Api\V1\HealthController::class, 'check']);
Route::get('/up', [\App\Http\Controllers\Api\V1\HealthController::class, 'up']);

// Public Directory Routes
Route::get('/doctors', [DoctorController::class, 'index']);
Route::get('/doctors/{id}', [DoctorController::class, 'show'])->whereUuid('id');
Route::get('/clinics', [ClinicController::class, 'index']);
Route::get('/clinics/{id}', [ClinicController::class, 'show'])->whereUuid('id');
Route::get('/booking-packages', [\App\Http\Controllers\Api\V1\BookingPackageController::class, 'index']);
Route::get('/booking-packages/{bookingPackage}', [\App\Http\Controllers\Api\V1\BookingPackageController::class, 'show']);
Route::get('/appointments/slots', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'slots']);
Route::get('/shared-records/{token}', [\App\Http\Controllers\Api\V1\PatientController::class, 'viewSharedRecord']);

// Protected Clinical & Booking Routes
Route::middleware(['auth:sanctum', 'throttle:api.general', 'active.clinic'])->group(function () {
    // Doctor Multi-Clinic Context & Affiliations
    Route::get('/doctor/stats', [DoctorController::class, 'stats']);
    Route::get('/doctor/clinics', [DoctorController::class, 'myClinics']);
    Route::get('/doctor/invitations', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'myInvitations']);
    Route::post('/doctor/invitations/{invitationId}/accept', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'accept']);
    Route::post('/doctor/invitations/{invitationId}/reject', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'reject']);

    // Booking Packages Governance (Admin / Delegated Assistant)
    Route::post('/booking-packages', [\App\Http\Controllers\Api\V1\BookingPackageController::class, 'store']);
    Route::put('/booking-packages/{bookingPackage}', [\App\Http\Controllers\Api\V1\BookingPackageController::class, 'update']);
    Route::delete('/booking-packages/{bookingPackage}', [\App\Http\Controllers\Api\V1\BookingPackageController::class, 'destroy']);

    // Doctor Onboarding & Status
    Route::post('/doctors/onboard', [\App\Http\Controllers\Api\V1\DoctorOnboardingController::class, 'onboard']);
    Route::get('/doctors/onboarding-status', [\App\Http\Controllers\Api\V1\DoctorOnboardingController::class, 'status']);

    // Clinic Director Doctor Statistics
    Route::get('/clinic/doctor-stats', [\App\Http\Controllers\Api\V1\ClinicDoctorStatsController::class, 'index']);

    // Clinics
    Route::post('/clinics', [ClinicController::class, 'store']);
    Route::put('/clinics/{id}', [ClinicController::class, 'update']);
    Route::post('/clinics/{id}/doctors', [ClinicController::class, 'createEmployedDoctor']);
    Route::post('/clinics/{id}/staff/doctor', [ClinicController::class, 'assignDoctor']);
    Route::get('/clinics/{id}/doctors/lookup', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'lookup']);
    Route::get('/clinics/{id}/doctor-invitations', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'clinicInvitations']);
    Route::post('/clinics/{id}/doctor-invitations', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'store']);
    Route::post('/clinics/{id}/doctor-invitations/{invitationId}/cancel', [\App\Http\Controllers\Api\V1\ClinicDoctorInvitationController::class, 'cancel']);
    Route::put('/clinics/{id}/doctors/{doctorId}/status', [ClinicController::class, 'updateDoctorStatus']);
    Route::delete('/clinics/{id}/doctors/{doctorId}', [ClinicController::class, 'detachDoctor']);
    Route::post('/clinics/{id}/assistants', [ClinicController::class, 'createAssistant']);
    Route::put('/clinics/{id}/assistants/{assistantId}/status', [ClinicController::class, 'updateAssistantStatus']);
    Route::delete('/clinics/{id}/assistants/{assistantId}', [ClinicController::class, 'deleteAssistant']);
    Route::put('/clinics/{id}/assistants/{assistantId}/permissions', [ClinicController::class, 'updateAssistantPermissions']);
    Route::get('/clinics/{id}/staff/{staffId}', [ClinicController::class, 'showStaff']);

    // Booking Centers
    Route::get('/booking-centers', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'index']);
    Route::post('/booking-centers', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'store']);
    Route::get('/booking-centers/quota-balance', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'quotaBalance']);
    Route::get('/booking-centers/transactions', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'transactions']);
    Route::post('/booking-centers/purchase-package', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'purchasePackage']);
    Route::post('/booking-centers/purchase-requests', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'store']);
    Route::get('/booking-centers/purchase-requests', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'indexOwn']);
    Route::post('/booking-centers/resubmit', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'resubmit']);
    Route::put('/booking-centers/profile', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'updateSettings']);
    Route::get('/booking-centers/financial-summary', [\App\Http\Controllers\Api\V1\FinancialReportController::class, 'bookingCenterSummary']);
    Route::get('/booking-centers/billing-records', [\App\Http\Controllers\Api\V1\FinancialReportController::class, 'bookingCenterBillingRecords']);
    Route::post('/booking-centers/{bookingCenter}/grant-quota', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'grantQuota']);
    Route::get('/booking-centers/{bookingCenter}', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'show']);
    Route::get('/booking-policies', [\App\Http\Controllers\Api\V1\BookingPolicyController::class, 'index']);

    // Appointments
    Route::get('/appointments', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'index']);
    Route::post('/appointments', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'store']);
    Route::post('/appointments/check-in', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'checkIn']);
    Route::get('/appointments/{appointment}', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'show']);
    Route::post('/appointments/{appointment}/confirm', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'confirm']);
    Route::post('/appointments/{appointment}/attend', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'attend']);
    Route::post('/appointments/{appointment}/no-show', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'noShow']);
    Route::post('/appointments/{appointment}/cancel', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reject', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'reject']);
    Route::post('/appointments/{appointment}/reschedule', [\App\Http\Controllers\Api\V1\AppointmentController::class, 'reschedule']);

    // EHR & Patients
    Route::get('/patients', [\App\Http\Controllers\Api\V1\PatientController::class, 'index']);
    Route::get('/patients/me', [\App\Http\Controllers\Api\V1\PatientController::class, 'me']);
    Route::post('/patients', [\App\Http\Controllers\Api\V1\PatientController::class, 'store']);
    Route::get('/patients/{patient}', [\App\Http\Controllers\Api\V1\PatientController::class, 'show']);
    Route::put('/patients/{patient}', [\App\Http\Controllers\Api\V1\PatientController::class, 'update']);
    Route::post('/patients/{patient}/allergies', [\App\Http\Controllers\Api\V1\PatientController::class, 'addAllergy']);
    Route::delete('/patients/{patient}/allergies/{allergy}', [\App\Http\Controllers\Api\V1\PatientController::class, 'removeAllergy']);
    Route::post('/patients/{patient}/chronic-conditions', [\App\Http\Controllers\Api\V1\PatientController::class, 'addChronicCondition']);
    Route::post('/patients/{patient}/medications', [\App\Http\Controllers\Api\V1\PatientController::class, 'addMedication']);
    Route::delete('/patients/{patient}/medications/{medication}', [\App\Http\Controllers\Api\V1\PatientController::class, 'removeMedication']);
    Route::post('/patients/{patient}/emergency-contacts', [\App\Http\Controllers\Api\V1\PatientController::class, 'addEmergencyContact']);
    Route::post('/patients/share-token', [\App\Http\Controllers\Api\V1\PatientController::class, 'generateShareToken']);

    // Clinical Visits
    Route::get('/clinical-visits', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'index']);
    Route::post('/clinical-visits', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'store']);
    Route::get('/clinical-visits/{clinicalVisit}', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'show']);
    Route::put('/clinical-visits/{clinicalVisit}', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'update']);
    Route::post('/clinical-visits/{clinicalVisit}/vital-signs', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'updateVitalSigns']);
    Route::post('/clinical-visits/{clinicalVisit}/finalize', [\App\Http\Controllers\Api\V1\ClinicalVisitController::class, 'finalize']);

    // Prescriptions
    Route::get('/prescriptions', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'index']);
    Route::post('/prescriptions', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'store']);
    Route::get('/prescriptions/templates', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'templates']);
    Route::post('/prescriptions/templates', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'storeTemplate']);
    Route::get('/prescriptions/{prescription}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'show']);
    Route::post('/prescriptions/{prescription}/void', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'void']);

    // Diagnostic Centers
    Route::get('/diagnostic-centers', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'index']);
    Route::post('/diagnostic-centers', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'store']);
    Route::get('/diagnostic-centers/{id}', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'show']);
    Route::get('/diagnostic-centers/{id}/staff', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'staff']);
    Route::post('/diagnostic-centers/{id}/staff', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'addStaff']);
    Route::get('/diagnostic-centers/{id}/staff/{staffId}', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'showStaff']);
    Route::put('/diagnostic-centers/{id}/staff/{staffId}/permissions', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'updateStaffPermissions']);
    Route::put('/diagnostic-centers/{id}/staff/{staffId}/status', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'updateStaffStatus']);
    Route::delete('/diagnostic-centers/{id}/staff/{staffId}', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'deleteStaff']);
    Route::get('/diagnostic-centers/{id}/analytics', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'analytics']);
    Route::get('/diagnostic-centers/{id}/notifications', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'notifications']);
    Route::post('/diagnostic-centers/{id}/notifications/{notificationId}/read', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'markNotificationRead']);
    Route::post('/diagnostic-centers/{id}/notifications/mark-all-read', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'markAllNotificationsRead']);
    Route::post('/diagnostic-centers/{id}/directives', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'createDirective']);
    Route::get('/diagnostic-staff/me', [\App\Http\Controllers\Api\V1\DiagnosticCenterController::class, 'myStaffProfile']);

    // Diagnostic Orders
    Route::get('/diagnostic-orders', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'index']);
    Route::post('/diagnostic-orders', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'store']);
    Route::get('/diagnostic-orders/{diagnosticOrder}', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'show']);
    Route::post('/diagnostic-orders/{diagnosticOrder}/receive', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'receive']);
    Route::post('/diagnostic-orders/{diagnosticOrder}/finalize', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'finalize']);
    Route::post('/diagnostic-order-items/{item}/result', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'enterResult']);

    // Laboratory Samples
    Route::get('/diagnostic-orders/{diagnosticOrder}/samples', [\App\Http\Controllers\Api\V1\LaboratorySampleController::class, 'index']);
    Route::post('/diagnostic-orders/{diagnosticOrder}/samples', [\App\Http\Controllers\Api\V1\LaboratorySampleController::class, 'store']);
    Route::match(['put', 'patch', 'post'], '/laboratory-samples/{sample}/status', [\App\Http\Controllers\Api\V1\LaboratorySampleController::class, 'updateStatus']);

    // Radiology Reports
    Route::get('/diagnostic-orders/{diagnosticOrder}/radiology-report', [\App\Http\Controllers\Api\V1\RadiologyReportController::class, 'show']);
    Route::post('/diagnostic-orders/{diagnosticOrder}/radiology-report', [\App\Http\Controllers\Api\V1\RadiologyReportController::class, 'store']);
    Route::post('/radiology-reports/{radiologyReport}/finalize', [\App\Http\Controllers\Api\V1\RadiologyReportController::class, 'finalize']);

    // Advertisements (Protected)
    Route::get('/advertisements/my-ads', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'myAds']);
    Route::post('/advertisements', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'store']);
    Route::get('/advertisements/{advertisement}', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'show']);
    Route::put('/advertisements/{advertisement}', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'update']);
    Route::delete('/advertisements/{advertisement}', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'destroy']);
    Route::put('/advertisements/{advertisement}/status', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'updateStatus']);

    // Clinical Access Logs Audit Trail
    Route::get('/audit/clinical-access-logs', [\App\Http\Controllers\Api\V1\ClinicalAccessLogController::class, 'index']);

    // Admin Assistant Management (Admin only)
    Route::get('/admin/assistants', [\App\Http\Controllers\Api\V1\AdminAssistantController::class, 'index']);
    Route::post('/admin/assistants', [\App\Http\Controllers\Api\V1\AdminAssistantController::class, 'store']);
    Route::put('/admin/assistants/{id}/permissions', [\App\Http\Controllers\Api\V1\AdminAssistantController::class, 'updatePermissions']);
    Route::put('/admin/assistants/{id}/status', [\App\Http\Controllers\Api\V1\AdminAssistantController::class, 'toggleStatus']);
    Route::delete('/admin/assistants/{id}', [\App\Http\Controllers\Api\V1\AdminAssistantController::class, 'destroy']);

    // Package Purchase Requests Review & Approval (Admin & Authorized Assistant)
    Route::get('/admin/package-purchase-requests', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'indexAll']);
    Route::get('/admin/package-purchase-requests/{packagePurchaseRequest}', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'show']);
    Route::post('/admin/package-purchase-requests/{packagePurchaseRequest}/approve', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'approve']);
    Route::post('/admin/package-purchase-requests/{packagePurchaseRequest}/reject', [\App\Http\Controllers\Api\V1\PackagePurchaseRequestController::class, 'reject']);

    // Doctor Profile Verification (Admin & Authorized Assistant)
    Route::put('/admin/doctors/{id}/verify', [\App\Http\Controllers\Api\V1\DoctorController::class, 'verifyDoctor'])->whereUuid('id');

    // Booking Center Verification & Review (Admin & Authorized Assistant)
    Route::put('/admin/booking-centers/{id}/verify', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'verify'])->whereUuid('id');
    Route::post('/admin/booking-centers/{id}/reject', [\App\Http\Controllers\Api\V1\BookingCenterController::class, 'reject'])->whereUuid('id');

    // Platform Financial Reports & Payments (Admin & Authorized Assistant)
    Route::get('/admin/financial-reports/summary', [\App\Http\Controllers\Api\V1\FinancialReportController::class, 'platformSummary']);
    Route::get('/admin/financial-reports/payments', [\App\Http\Controllers\Api\V1\FinancialReportController::class, 'platformPayments']);

    // Platform Booking Policies (Admin Only)
    Route::put('/admin/booking-policies', [\App\Http\Controllers\Api\V1\BookingPolicyController::class, 'update']);

    // Platform Admin Dashboard Overview Statistics (Admin & Authorized Assistant)
    Route::get('/admin/dashboard/stats', [\App\Http\Controllers\Api\V1\AdminDashboardController::class, 'stats']);
});

// Public Routes
Route::get('/v/{token}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'verify'])->middleware('throttle:qr.verify');
Route::get('/diagnostics/verify/{token}', [\App\Http\Controllers\Api\V1\DiagnosticOrderController::class, 'verify'])->middleware('throttle:qr.verify');
Route::get('/advertisements', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'index']);
Route::post('/advertisements/{advertisement}/click', [\App\Http\Controllers\Api\V1\AdvertisementController::class, 'recordClick'])->middleware('throttle:ads.click');

