---
Document: AAFIYA V1 API Gap Register
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-11 09:35
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: NO
---

# AAFIYA / عافية — V1 API Gap Register

This register details all API endpoints, contracts, and backend mechanisms that are missing, incomplete, or require explicit verification to fulfill the AAFIYA V1 mobile and web workflows.

---

## Gap Summary Table

| Gap ID | Workflow / Capability | Endpoint | Classification | Impact | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Doctor Operational Dashboard | `GET /api/v1/doctor/stats` | RESOLVED (TASK-02-01) | Doctor Mobile Dashboard metrics | Phase 2 |
| **GAP-02** | User System Notifications | `GET /api/v1/notifications` | DB TABLE EXISTS / NOT EXPOSED VIA USER API | Standard alerts for mobile users | Phase 2 / Phase 5 |
| **GAP-03** | Concurrency Quota Row-Locking | `POST /api/v1/appointments` | RESOLVED (TASK-02-02) | Quota balance race-condition audit & state machine guard | Phase 2 |
| **GAP-04** | Sanctum Session Refresh | `POST /api/v1/auth/refresh` | SESSION CONSTRAINT / MOBILE SESSION REQUIREMENT | Mobile 401 re-authentication flow | Phase 1 / Phase 2 |
| **GAP-05** | Patient Appointments Scoping | `GET /api/v1/appointments` | RESOLVED (TASK-02-04) | Patient appointments listing security | Phase 2 |
| **GAP-06** | Appointment Attendance & No-Show | `POST /api/v1/appointments/{id}/attend` | RESOLVED (TASK-02-03) | Doctor / Assistant queue updates & No-Show marking | Phase 2 |
| **GAP-07** | Booking Center Doctor Directory | `GET /api/v1/booking-centers/doctors` | PROPOSED | Fast doctor search for BC booking | Phase 2 |

---

## Detailed API Gap Records

### GAP-01: Doctor Operational Dashboard Statistics
- **Endpoint**: `GET /api/v1/doctor/stats`
- **Classification**: RESOLVED (TASK-02-01)
- **Context**: The Doctor Mobile app (`aafiya_pro`) requires summary figures on its primary dashboard:
  - Today's appointment count.
  - Number of pending check-ins.
  - Number of completed/attended appointments.
  - Next queued patient information.
- **Current State**: Implemented in `DoctorController::stats()` with 4D authorization scoping, database-side aggregation, active clinic context resolution, zero IDOR, and full distinction between waiting room queue and completed consultations.
- **Contract Implemented**:
  - Method: `GET`
  - Auth: `auth:sanctum` (Role: `doctor`, verified)
  - Middleware: `active.clinic` (`EnsureActiveClinicContext`)
  - Parameters: Optional `?date=YYYY-MM-DD` (defaults to Africa/Algiers current date)
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "today_total": 0,
        "pending_check_in": 0,
        "in_waiting_room": 0,
        "completed_today": 0,
        "no_show_today": 0,
        "active_clinic_id": "01a081ea-2e14-72d8-b97d-29026efc4bf4",
        "active_clinic_name": "عيادة الأمل",
        "date": "2026-09-14"
      }
    }
    ```
- **Status**: RESOLVED & VERIFIED in TASK-02-01 (2026-09-14).

---

### GAP-02: User System Notifications
- **Endpoint**: `GET /api/v1/notifications`
- **Classification**: DB TABLE EXISTS / NOT EXPOSED VIA USER API / DERIVED IN CLIENT
- **Context**: Users (Patients, Doctors, Booking Centers) require alerts when appointments are confirmed, rescheduled, or cancelled.
- **Forensic Evidence**:
  - Database table `notifications` exists via migration `2026_09_02_000002_create_notifications_table.php` (standard UUID morphs table).
  - Diagnostic centers have notification endpoints (`GET /api/v1/diagnostic-centers/{id}/notifications`).
  - Web `PatientDashboard.tsx` dynamically derives user notifications from client appointment/prescription records rather than hitting a dedicated API endpoint.
- **Status**: Not a defect, but an architectural choice. In Phase 2, determine whether Mobile V1 should also derive notifications locally from appointment status changes or expose a unified `GET /api/v1/notifications` endpoint backed by Laravel's database notifications table.

---

### GAP-03: Concurrency Quota Row-Locking in Appointments
- **Endpoint**: `POST /api/v1/appointments` and `POST /api/v1/appointments/{id}/confirm`
- **Classification**: RESOLVED (TASK-02-02)
- **Context**: Ensure that when a Booking Center books or confirms an appointment, quota is decremented from their active balance atomically and cannot be overdrawn by simultaneous parallel requests or bypassed via lifecycle resurrection.
- **Forensic Audit & Remediation Evidence**:
  - Code inspection confirmed `QuotaService::deductForAppointment` already executed inside `DB::transaction(...)` with `BookingCenter::where('id', $center->id)->lockForUpdate()->firstOrFail()` and atomic ledger writes.
  - A lifecycle state-machine vulnerability (`cancelled/rejected -> confirmed` re-confirmation loophole) was identified where cancelled appointments could be re-confirmed without quota deduction.
  - **Remediation Implemented**:
    1. Added strict state-transition guard in `BookingService::confirmAppointment`: only appointments with status `pending` can be confirmed; non-pending states (`cancelled`, `rejected`, `expired`, etc.) are rejected with HTTP 422.
    2. Hardened `BookingCenterController::grantQuota` with `DB::transaction` and `BookingCenter::lockForUpdate()` to eliminate admin/concurrent lost-update race.
    3. Implemented 6-scenario feature test suite in `backend/tests/Feature/Api/V1/BookingCenterConcurrencyTest.php`.
- **Status**: RESOLVED & VERIFIED in TASK-02-02 (2026-09-14). Executed all 6 concurrency and lifecycle scenarios against isolated test database `medical_db_testing` (6 tests, 68 assertions, 0 failures, 0 errors). Development database `medical_db` remained 100% untouched.

---

### GAP-04: Sanctum Session Expiration
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Classification**: SESSION CONSTRAINT / MOBILE SESSION REQUIREMENT
- **Context**: Laravel Sanctum tokens expire at 1440 minutes (24 hours). Sanctum by design does not issue sliding refresh tokens without re-authenticating credentials.
- **Clarification**: This is NOT a backend defect. It is a deliberate architectural characteristic of Sanctum.
- **Mobile Resolution Strategy**:
  - Mobile client (`AuthSessionManager`) securely stores credentials or biometric keys.
  - `ApiClient` catches HTTP 401 Unauthenticated responses.
  - When a 401 is received, the app invalidates the expired session, clears secure storage, and gracefully routes the user to re-authenticate or unlock via biometrics without crashing.

---

### GAP-05: Patient Appointments Scoping Verification
- **Endpoint**: `GET /api/v1/appointments` & `GET /api/v1/appointments/{id}`
- **Classification**: RESOLVED (TASK-02-04)
- **Context**: Patient mobile app lists and views past and future appointments for the authenticated patient.
- **Resolution**:
  - Implemented dedicated security feature test suite `backend/tests/Feature/Api/V1/PatientAppointmentScopingTest.php`.
  - Verified role-based scoping strictly restrains queries to `patient_id == $user->patient->id` or fallback `created_by_id == $user->id`.
  - Verified query parameter tampering (`?patient_id={PatientB.id}`) is completely ignored and cannot override scoping.
  - Verified filter tampering (`clinic_id`, `doctor_id`, `booking_center_id`) cannot expand scope or leak records across accounts.
  - Verified valid filters (`status`, `appointment_date`, `from_date`, `to_date`, sorting) operate strictly within patient's own scope.
  - Verified direct IDOR lookup (`GET /api/v1/appointments/{appointment_B_id}`) fails closed with HTTP 403 Forbidden and exact Arabic message (`"غير مصرح لك باستعراض تفاصيل هذا الموعد."`).
  - Verified appointments booked on behalf of the patient by clinic staff or booking centers are properly visible to the patient.
  - Verified unauthenticated requests fail closed with HTTP 401 Unauthorized.
  - 14/14 automated tests passed cleanly with 139 assertions. Zero regressions across existing test suites.

---

### GAP-06: Appointment Attendance and No-Show Status Transitions
- **Endpoint**: `POST /api/v1/appointments/{id}/attend` and `POST /api/v1/appointments/{id}/no-show` (along with hardened `POST /api/v1/appointments/check-in`)
- **Classification**: RESOLVED (TASK-02-03)
- **Context**: Doctors and Assistants update queue status and mark no-shows.
- **Resolution**:
  - Implemented dedicated routes `POST /api/v1/appointments/{appointment}/attend` and `POST /api/v1/appointments/{appointment}/no-show` in `routes/api.php`.
  - Added controller actions `attend` and `noShow` in `AppointmentController.php`.
  - Implemented `BookingService::attendAppointment`, `markAppointmentNoShow`, and `authorizeOperationalStaff` with pessimistic row locking (`lockForUpdate`), strict clinic affiliation checks, and full idempotency.
  - Enforced critical state machine invariants: `pending -> attended` is strictly prohibited (422); only `confirmed -> attended` is permitted; only `confirmed -> no_show` is permitted; terminal statuses return 422.
  - Hardened existing QR token endpoint `POST /api/v1/appointments/check-in` with identical validation and clinic isolation rules.
  - Quota ledger verified: attendance does not consume/deduct quota; no-show does not refund quota.
  - Verified via 32/32 tests in `AppointmentAttendanceTest` and 6/6 tests in `AppointmentCheckInQrTest`.

---

### GAP-07: Booking Center Doctor Directory
- **Endpoint**: `GET /api/v1/booking-centers/doctors`
- **Classification**: PROPOSED
- **Context**: Booking Center operators require rapid lookup of doctors and clinic working hours across all clinics. Existing `GET /api/v1/doctors` already provides filtering.
- **Action Required in Phase 2**: Verify whether `GET /api/v1/doctors` with query parameters (`?clinic_id=...&specialty=...`) satisfies mobile BC booking needs or if an aggregated endpoint is required.
