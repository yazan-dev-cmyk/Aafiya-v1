---
Document: AAFIYA V1 Unknown Register
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-14 11:15
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: NO
---

# AAFIYA / عافية — V1 Unknown Register

This register tracks unresolved facts, technical ambiguities, and open questions identified during forensic repository analysis. 

### Planning Blockers: 0
Planning is fully unblocked and verified.

### Implementation Blockers / Pending Verification Items: 0
All Phase 2 implementation unknowns (UNK-01, UNK-03, UNK-04) are now fully verified and resolved.

---

## Unknowns Summary Table

| Unknown ID | Summary | Classification | Target Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UNK-01** | Doctor Operational Statistics Contract | Implementation Blocker (Doctor Dash) | Phase 2 | RESOLVED (TASK-02-01) |
| **UNK-02** | User-Facing System Notifications Architecture | Non-blocking (can derive in client) | Phase 2 / Phase 5 | OPEN |
| **UNK-03** | Concurrency Quota Deductions Row-Locking Level | Pending Verification (BC Load) | Phase 2 | RESOLVED (TASK-02-02) |
| **UNK-04** | Patient Appointments Endpoint Scope & Filtering | Pending Verification (Patient App) | Phase 2 | RESOLVED (TASK-02-04) |
| **UNK-05** | Push Notification Service Gateway Provider | Non-blocking (in-app polling fallback)| Phase 6 | OPEN |
| **UNK-06** | Ephemeral File Storage Adapter in Production | Non-blocking (local disk in dev) | Phase 2 | OPEN |

---

## Detailed Unknown Records

### UNK-01: Doctor Operational Statistics Contract Missing
- **Question**: Does an existing endpoint provide aggregated stats (e.g. today's total appointments, pending check-ins, attended count, revenue share) for a doctor, or must the mobile app calculate them by querying `/api/v1/appointments`?
- **Why It Matters**: Client-side calculation requires fetching all appointment records for the day/week, which is inefficient, leaks unnecessary data, and increases mobile battery/data usage.
- **Resolution**: Dedicated `GET /api/v1/doctor/stats` implemented in `DoctorController::stats()` with database-side aggregation, active clinic context resolution, zero IDOR, and full distinction between waiting room queue and completed consultations. Verified via 5 HTTP integration tests and 9-scenario feature suite.
- **Classification**: Resolved Blocker.
- **Target Phase**: Phase 2 (Backend Contract Gap Closure).
- **Status**: RESOLVED (TASK-02-01).

### UNK-02: User-Facing System Notifications Architecture
- **Question**: How are real-time alerts delivered to Patients, Doctors, and Booking Centers?
- **Why It Matters**: Only diagnostic centers have a notifications table and endpoint (`GET /api/v1/diagnostic-centers/{id}/notifications`). There is no generic `GET /api/v1/notifications` for individual `users`.
- **Current Evidence**: Forensic check of database migrations shows `notifications` table exists (standard UUID morphs table). Web `PatientDashboard.tsx` derives alerts dynamically on the client side from appointments/prescriptions.
- **What Must Be Checked**: Whether V1 mobile should follow Web and derive alerts dynamically on the client side, or if exposing a standardized `GET /api/v1/notifications` endpoint is required.
- **Owner**: Backend Lead
- **Classification**: Non-blocking (Client-side derived alerts provide complete functional parity with Web).
- **Target Phase**: Phase 2 / Phase 5.
- **Status**: OPEN.

### UNK-03: Concurrent Quota Deductions Row-Locking Level
- **Question**: Does `BookingCenterController` or the underlying appointment booking service employ pessimistic locking (`lockForUpdate()`) when deducting quota during simultaneous bookings?
- **Why It Matters**: High-volume booking centers booking simultaneously could cause race conditions, resulting in negative quota balances or over-booking.
- **Current Evidence**: Forensic audit confirms `backend/app/Services/QuotaService.php` already contains `$lockedCenter = BookingCenter::where('id', $center->id)->lockForUpdate()->firstOrFail();` inside `DB::transaction(...)`. In addition, audit identified a state-machine loophole where cancelled appointments could be confirmed without quota deduction, and `grantQuota` lacked row locking.
- **Remediation Implemented (TASK-02-02)**:
  1. Strict state machine transition guard added in `BookingService::confirmAppointment`: only `pending` appointments can transition to `confirmed`; non-pending states rejected with HTTP 422.
  2. Transaction and row-locking added in `BookingCenterController::grantQuota`.
  3. 6-scenario feature test suite implemented in `BookingCenterConcurrencyTest.php`.
- **Resolution**: All 6 concurrency and lifecycle scenarios executed and passed against isolated test database `medical_db_testing`. Negative quota balances are mathematically prevented; appointment resurrection loophole closed. Pilot database `medical_db` remained 100% untouched.
- **Classification**: Resolved Blocker.
- **Target Phase**: Phase 2.
- **Status**: RESOLVED (TASK-02-02).

### UNK-04: Patient Appointments Endpoint Scope & Filtering
- **Question**: When a patient calls `GET /api/v1/appointments`, does the backend automatically scope results to the authenticated user's `patient_id`?
- **Why It Matters**: A patient must never be able to view or filter appointments belonging to other patients.
- **Evidence & Verification (TASK-02-04)**:
  - Forensic audit verified `AppointmentController@index` explicitly binds patient scoping to `$user->patient?->id` (or fallback `$user->id`) and ignores any incoming `patient_id` query parameter.
  - `AppointmentController@show` validates patient ownership and aborts with HTTP 403 Forbidden.
  - Implemented 14 automated tests (139 assertions) in `backend/tests/Feature/Api/V1/PatientAppointmentScopingTest.php`.
  - All 14 tests pass cleanly against `medical_db_testing`. Zero data leakage across patient accounts.
- **Owner**: Backend Security Lead
- **Classification**: Resolved Verification Item.
- **Target Phase**: Phase 2.
- **Status**: RESOLVED (TASK-02-04).

### UNK-05: Push Notification Service Gateway Provider
- **Question**: Which FCM / APNs gateway provider credentials and service account are provisioned for staging and production?
- **Why It Matters**: Firebase Cloud Messaging configuration files (`google-services.json`, `GoogleService-Info.plist`) are needed for native background push notifications.
- **Current Evidence**: No `firebase` packages currently initialized in `mobile/`.
- **What Must Be Checked**: Confirm if Firebase Project is configured or if V1 mobile launches with in-app periodic sync.
- **Owner**: DevOps / Mobile Lead
- **Classification**: Non-blocking (V1 core operational flows do not hard-depend on push).
- **Target Phase**: Phase 6.
- **Status**: OPEN.

### UNK-06: Ephemeral File Storage Adapter in Production
- **Question**: Are prescription PDFs and diagnostic attachments served via direct S3 pre-signed URLs or local Laravel streaming controller?
- **Why It Matters**: Direct S3 signed URLs expire automatically and offload bandwidth from Laravel, while streaming routes consume PHP workers.
- **Current Evidence**: `PrescriptionController@verify` and shared tokens use token lookup.
- **What Must Be Checked**: Storage disk configuration in `backend/config/filesystems.php`.
- **Owner**: Backend Architect
- **Classification**: Non-blocking (Local public/private disk functions in development).
- **Target Phase**: Phase 2.
- **Status**: OPEN.
