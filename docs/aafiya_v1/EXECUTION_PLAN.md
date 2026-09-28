---
Document: AAFIYA V1 Execution Plan
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-28 11:25
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: TASK-07-03 FORMALLY CLOSED / VERIFIED (PHASE 7 TECHNICAL EXIT GATE SATISFIED)
---

# AAFIYA / عافية — V1 Execution Plan

This document contains the granular, task-level execution plan for AAFIYA V1. Every task adheres strictly to the required task schema and requires automated test passage plus explicit human authorization before advancing.

---

## Mandatory Execution Principles

1. **Web ↔ Mobile Single Source of Truth**: Neither platform may maintain an independent authoritative copy of quota balances, appointments, or medical data. All mutations and balances must resolve through the backend API.
2. **Strict Verification Over Invention**: Existing backend implementations (e.g. `QuotaService::deductForAppointment` with `lockForUpdate()`, `BookingService::checkInAppointmentByToken`) must be tested and verified before altering code or creating redundant routes.
3. **Preservation of Existing Scaffolds**: Pre-existing foundation files in `mobile/` must be inspected, aligned, and reused—never blindly overwritten.
4. **Human Verification Gate**: Tasks cannot be marked `☑ COMPLETED` without human sign-off. The model must stop and wait after every automated verification.

---

## Phase Roadmap Overview

| Phase | Phase Name | Primary Scope | Task Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PHASE 1** | Foundation & Workspace Setup | Monorepo, `aafiya_core`, `aafiya_ui`, branding, auth session | 4 | ☑ COMPLETED (4/4 = 100%) |
| **PHASE 2** | Backend API Contract Verification & Closure | `GET /stats`, attendance verification, concurrency audit | 4 | ☑ COMPLETED (4/4 = 100%) |
| **PHASE 3** | AAFIYA Patient Mobile Application | Patient splash, auth, appointments view, clinic directory | 4 | ☑ COMPLETED (4/4 = 100%) |
| **PHASE 4** | AAFIYA Pro — Doctor Shell | Agenda, clinic context switcher, queue, attendance | 4 | ☑ COMPLETED (4/4 = 100%) |
| **PHASE 5** | AAFIYA Pro — Assistant & BC Shells | Assistant check-in, BC quota balance, quota booking | 4 | ☑ COMPLETED (4/4 = 100%) |
| **PHASE 6** | System Integration & Hardening | Error boundaries, offline state, network retry, telemetry | 3 | ☑ COMPLETED (3/3 = 100%) |
| **PHASE 7** | Release Readiness & Verification Gate | End-to-end audit, security checks, release bundles, production signing | 4 | ☑ COMPLETED (4/4 = 100%) — TECHNICAL EXIT GATE SATISFIED |

---

# PHASE 1: FOUNDATION & WORKSPACE SETUP

### Task ID: TASK-01-01
Task Name: Verify, Align, and Test Existing Flutter Monorepo Structure & Dependencies
Phase: PHASE 1
Workstream: Mobile Infrastructure

Objective:
Inspect, validate, and align the pre-existing Flutter monorepo workspace structure (`mobile/packages/aafiya_core`, `mobile/packages/aafiya_ui`, `mobile/apps/aafiya_patient`, `mobile/apps/aafiya_pro`), verify `pubspec.yaml` path dependencies, and ensure `flutter pub get` and package resolution succeed cleanly across all packages using the installed Flutter 3.47.3 Stable toolchain.

Why This Task Exists:
A healthy, error-free dependency graph is required before implementing domain logic, design components, or application shells. The task reuses existing scaffolds and ensures zero broken references.

Dependencies:
None (Flutter 3.47.3 Stable verified at `/home/yazan/flutter`).

Preconditions:
Flutter SDK verified; host disk space >= 10 GB.

Files Expected to Change:
`mobile/pubspec.yaml`
`mobile/packages/aafiya_core/pubspec.yaml`
`mobile/packages/aafiya_ui/pubspec.yaml`
`mobile/apps/aafiya_patient/pubspec.yaml`
`mobile/apps/aafiya_pro/pubspec.yaml`

Files That Must NOT Change:
`backend/**`
`src/**`
`docs/aafiya_v1/**` (except execution logs)

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Verifies monorepo dependencies and workspace resolution without recreating existing files.
Database Impact: None.
Infrastructure Impact: None.

API Contracts: None.

Authorization Requirements: None.

Localization Requirements: Enable `flutter_localizations` in apps; support AR (RTL), EN (LTR), FR (LTR).

Security Requirements: Ensure package dependencies have no known vulnerabilities.

Automated Tests:
`/home/yazan/flutter/bin/flutter pub get` in `mobile/`
`/home/yazan/flutter/bin/flutter analyze mobile/`
`/home/yazan/flutter/bin/flutter test mobile/packages/aafiya_core`
`/home/yazan/flutter/bin/flutter test mobile/packages/aafiya_ui`
`/home/yazan/flutter/bin/flutter test mobile/apps/aafiya_patient`
`/home/yazan/flutter/bin/flutter test mobile/apps/aafiya_pro`

Manual Verification:
Inspect terminal output of `flutter analyze` ensuring zero syntax or resolution errors across `mobile/`.

Acceptance Criteria:
All packages resolve dependencies without version conflicts; `flutter analyze` and `flutter test` pass cleanly.

Rollback Consideration:
Revert modified `pubspec.yaml` files via git checkout.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-11 09:46

---

### Task ID: TASK-01-02
Task Name: Implement Core Design System Tokens & Cairo Arabic Typography
Phase: PHASE 1
Workstream: Mobile Design System (`aafiya_ui`)

Objective:
Establish the official AAFIYA design system tokens in `aafiya_ui`, including brand colors (`#0077B6`, `#48C774`), elevation, spacing, radii, Cairo typography, and RTL-compliant component themes.

Why This Task Exists:
To enforce brand consistency, accessibility, and native Arabic visual hierarchy across all mobile applications without duplicate styling.

Dependencies:
`TASK-01-01`

Preconditions:
`aafiya_ui` package dependencies resolved.

Files Expected to Change:
`mobile/packages/aafiya_ui/lib/tokens/aafiya_colors.dart`
`mobile/packages/aafiya_ui/lib/tokens/aafiya_typography.dart`
`mobile/packages/aafiya_ui/lib/tokens/aafiya_spacing.dart`
`mobile/packages/aafiya_ui/lib/theme/aafiya_theme.dart`
`mobile/packages/aafiya_ui/test/aafiya_ui_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Provides reusable theme and styling for patient and professional apps.
Database Impact: None.
Infrastructure Impact: None.

API Contracts: None.

Authorization Requirements: None.

Localization Requirements:
Full RTL support with directional geometry (`EdgeInsetsDirectional`). Cairo font loaded locally.

Security Requirements:
No external font network calls at runtime; fonts bundled in package assets.

Automated Tests:
Unit tests verifying color constants, text theme creation, and RTL directionality in `mobile/packages/aafiya_ui/test/aafiya_ui_test.dart`.

Manual Verification:
Verify widget preview renders correctly in both Arabic (RTL) and English (LTR).

Acceptance Criteria:
Brand colors exactly match `#0077B6` and `#48C774`; `flutter test` in `aafiya_ui` passes.

Rollback Consideration:
Git revert on `aafiya_ui` files.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-13 18:55

---

### Task ID: TASK-01-03
Task Name: Implement Network Client, Error Mapping & Secure Session Storage
Phase: PHASE 1
Workstream: Mobile Core (`aafiya_core`)

Objective:
Implement the resilient HTTP client (`ApiClient`), Sanctum token injection, 4D header injection (`X-Active-Clinic-ID`), standard API error parsing (`ApiErrorResponse`), and `flutter_secure_storage` session manager (`AuthSessionManager`).

Why This Task Exists:
Every authenticated API interaction in AAFIYA depends on robust token management, clinic context switching, and uniform error handling.

Dependencies:
`TASK-01-01`

Preconditions:
`aafiya_core` dependencies resolved.

Files Expected to Change:
`mobile/packages/aafiya_core/lib/network/api_client.dart`
`mobile/packages/aafiya_core/lib/network/api_endpoints.dart`
`mobile/packages/aafiya_core/lib/auth/auth_session_manager.dart`
`mobile/packages/aafiya_core/lib/auth/token_storage.dart`
`mobile/packages/aafiya_core/lib/errors/api_error_response.dart`
`mobile/packages/aafiya_core/test/auth_session_test.dart`
`mobile/packages/aafiya_core/test/api_error_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Implements foundational networking for all mobile shells.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
Injects `Authorization: Bearer <token>`, `Accept: application/json`, and optional `X-Active-Clinic-ID: <id>`.

Authorization Requirements:
Handles HTTP 401 (token expired) and 403 (forbidden/ceiling reached) exceptions.

Localization Requirements:
Translates standard network errors (timeout, connection lost) into localized Arabic/English messages.

Security Requirements:
SEC-03 (Tokens encrypted in Keystore/Keychain). Zero token logging.

Automated Tests:
Unit tests for `ApiClient` interceptor, mock 401 handling, and `AuthSessionManager` token persistence.

Manual Verification:
Verify mocked network requests inject proper headers and handle simulated error responses.

Acceptance Criteria:
Tests pass with 100% coverage on error mapping and session state machine.

Rollback Consideration:
Git revert on `aafiya_core/lib/network` and `aafiya_core/lib/auth`.

Risk: MEDIUM.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-13 19:40

---

### Task ID: TASK-01-04
Task Name: Implement Professional Role Resolution State Machine
Phase: PHASE 1
Workstream: Mobile Core (`aafiya_core`)

Objective:
Implement `RoleResolver` to inspect the user's roles from `/api/v1/auth/me` and determine the exact authorized shell (`doctor`, `doctor_assistant`, `booking_center`), while gracefully rejecting web-only roles (`admin`, `lab`, `radiology`).

Why This Task Exists:
Prevents unauthorized access to professional shells and satisfies `DISC-03` and `DISC-05`.

Dependencies:
`TASK-01-03`

Preconditions:
`AuthSessionManager` implemented.

Files Expected to Change:
`mobile/packages/aafiya_core/lib/role/role_resolver.dart`
`mobile/packages/aafiya_core/lib/models/user_role.dart`
`mobile/packages/aafiya_core/test/role_resolver_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Controls shell routing in `aafiya_pro`.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
Consumes `GET /api/v1/auth/me` user payload (Classification: `VERIFIED`).

Authorization Requirements:
Strictly enforces role segregation.

Localization Requirements:
Localized rejection explanations for web-only roles.

Security Requirements:
SEC-01 (Ceiling validation).

Automated Tests:
Unit tests testing all 11 backend roles against the role resolver.

Manual Verification:
Inspect unit test output verifying `admin` maps to `RoleResolutionResult.webOnly`.

Acceptance Criteria:
All unit tests pass; role resolution is deterministic.

Rollback Consideration:
Git revert on `role_resolver.dart`.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-13 20:30

---

### PHASE 1 EXIT GATE
```text
[x] TASK-01-01 verified (Monorepo & dependencies)
[x] TASK-01-02 verified (Design tokens & Cairo/Amiri typography)
[x] TASK-01-03 verified (Network client & session storage)
[x] TASK-01-04 verified (Role resolution state machine)
[x] All automated Dart tests pass cleanly
[x] Zero static analysis errors in mobile/
[x] CHANGELOG.md & VERIFICATION_LOG.md updated
[x] Explicit human approval received to proceed to Phase 2
```

---

### OPERATIONAL HARDENING: ApiClient Resilience Fix (Android Socket Abort & Single Retry)

- **Status**: ☑ COMPLETE / VERIFIED
- **Human Acceptance Date**: 2026-09-14
- **Context & Scope**:
  - Distinguishes post-Phase 1 operational network resilience hardening from original `TASK-01-03` (which established Android `10.0.2.2:8000` base URL resolution). `TASK-01-03` remains unchanged and closed.
  - Resolves Android Emulator `Software caused connection abort, errno = 103` incident resulting from stale TCP keep-alive sockets in the client connection pool after backend server restart.
- **Files Modified** (strictly 5 files):
  - `mobile/packages/aafiya_core/lib/network/api_client.dart`
  - `mobile/apps/aafiya_patient/lib/shells/auth_shell.dart`
  - `mobile/apps/aafiya_pro/lib/shells/auth_shell.dart`
  - `mobile/packages/aafiya_core/lib/auth/auth_session_manager.dart`
  - `mobile/packages/aafiya_core/test/api_client_test.dart`
- **Official Retry Policy**:
  - `GET` -> retry permitted once for eligible transient connection-level failures (`SocketException`, `http.ClientException`).
  - `POST` -> retry disabled by default (`allowRetry: false`) to strictly safeguard non-idempotent operations (such as appointment booking or payments) against unintended duplication.
  - Explicit `allowRetry: true` is currently enabled strictly for specifically reviewed, safe authentication operations (`login` in patient/pro shells and `logout` in session manager).
  - Future non-idempotent operations MUST NOT enable retry without explicit safety review.
- **Accepted Verification Evidence**:
  - `ApiClient` single retry protection implemented; maximum retry count is exactly one (`allowRetry: false` enforced on retry invocation); no infinite retry loop is possible.
  - Raw OS socket errors (`Software caused connection abort`, `errno = 103`, `Connection refused`) are sanitized before reaching user interface (`'Unable to connect to server. Please check your internet connection.'`); raw error details preserved in internal `cause` field.
  - `10.0.2.2:8000` base URL configuration (`AppConfig.devAndroidEmulator`) remains strictly unchanged.
  - Flutter analyzer: **No issues found** (`flutter analyze mobile/`).
  - Full monorepo tests: **74/74 PASS** (`aafiya_core`: 38/38, `aafiya_patient`: 6/6, `aafiya_pro`: 5/5, `aafiya_ui`: 25/25).
  - Android live verification on `emulator-5554`: PASS.
  - Laravel restart / offline → online recovery scenario: PASS.
  - Login: PASS.
  - Logout: PASS.
  - Laravel backend: unchanged.
  - Database: unchanged.
  - `.env`: unchanged.

---

# PHASE 2: BACKEND API CONTRACT VERIFICATION & CLOSURE

### Task ID: TASK-02-01
Task Name: Implement Doctor Operational Statistics API (`GAP-01`)
Phase: PHASE 2
Workstream: Backend Services

Objective:
Implement `GET /api/v1/doctor/stats` in `DoctorController` to return aggregated counts for today's total appointments, waiting room queue, completed visits, and active clinic context.

Why This Task Exists:
Resolves `GAP-01` (Classification: `BACKEND GAP`) and eliminates expensive client-side appointment aggregation on the mobile doctor dashboard.

Dependencies:
`PHASE 1 EXIT GATE`

Preconditions:
Laravel backend running; Artisan accessible.

Files Expected to Change:
`backend/routes/api.php`
`backend/app/Http/Controllers/Api/V1/DoctorController.php`
`backend/tests/Feature/Api/V1/DoctorStatsTest.php`

Files That Must NOT Change:
`mobile/**`
`src/**`

Backend Impact: Adds 1 controller method and route with 4D authorization.
Frontend Impact: None.
Mobile Impact: Provides endpoint for Doctor dashboard.
Database Impact: Low-latency indexed count queries on `appointments`.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/doctor/stats` (Headers: `Authorization: Bearer <token>`, optional `X-Active-Clinic-ID`).

Authorization Requirements:
User must have role `doctor` and be affiliated with the requested clinic.

Localization Requirements:
Response message headers localized.

Security Requirements:
Ensure doctor cannot query stats for unaffiliated clinics.

Automated Tests:
Pest / PHPUnit feature test `DoctorStatsTest` testing authorized and unauthorized access.

Manual Verification:
Call endpoint via curl with a test doctor token and verify JSON structure.

Acceptance Criteria:
Endpoint returns HTTP 200 with accurate metrics; test suite passes.

Rollback Consideration:
Git revert on `backend/app/Http/Controllers/Api/V1/DoctorController.php` and route file.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 07:40

---

### Task ID: TASK-02-02
Task Name: Concurrency Stress Test & Verification of Quota Row-Locking (`GAP-03` / `SEC-04`)
Phase: PHASE 2
Workstream: Backend Database Integrity

Objective:
Create an automated concurrency stress test (`BookingCenterConcurrencyTest`) to verify that the existing pessimistic row-locking (`lockForUpdate()`) in `QuotaService::deductForAppointment` prevents over-allocation and negative balances under parallel booking load. Do NOT alter production code unless a vulnerability or race condition is proven by test evidence.

Why This Task Exists:
Resolves `GAP-03` (Classification: `REQUIRES VERIFICATION`). Verifies transaction integrity under real concurrent load.

Dependencies:
`PHASE 1 EXIT GATE`

Preconditions:
`backend/` testing environment active.

Files Expected to Change:
`backend/app/Services/BookingService.php` (State-machine guard on `confirmAppointment`)
`backend/app/Http/Controllers/Api/V1/BookingCenterController.php` (Transactional row-lock on `grantQuota`)
`backend/tests/Feature/Api/V1/BookingCenterConcurrencyTest.php` (6-scenario concurrency & lifecycle test suite)

Current Status:
VERIFIED / COMPLETE (All 6 concurrency and lifecycle scenarios executed and passed against medical_db_testing)

Files That Must NOT Change:
`mobile/**`
`src/**`

Backend Impact: Enforces strict `pending`-only confirmation state transition and transactionally protects quota operations.
Frontend Impact: None.
Mobile Impact: Guarantees reliable quota response when booking; prevents invalid status resurrection.
Database Impact: None (zero schema/migration changes; strictly application/transactional layer).
Infrastructure Impact: Concurrency test suite execution requires dedicated test database `medical_db_testing`.

API Contracts:
`POST /api/v1/appointments` (Classification: `EXISTS`).
`POST /api/v1/appointments/{id}/confirm` (Classification: `HARDENED`).
`POST /api/v1/booking-centers/{bookingCenter}/grant-quota` (Classification: `HARDENED`).

Authorization Requirements:
`booking_center` role with valid quota balance.
Doctor or authorized clinic director for confirmation.

Localization Requirements:
Returns localized error if quota exhausted or invalid status transition attempted.

Security Requirements:
SEC-04 (Pessimistic locking, ledger balance integrity, and state-machine protection).

Automated Tests:
`BookingCenterConcurrencyTest`: 6 scenarios covering boundary quota=1, 5-worker contention, duplicate confirmation idempotency, cancel->confirm rejection (HTTP 422), reject->confirm rejection (HTTP 422), and reschedule idempotency. All 6 tests passing (68 assertions) against isolated `medical_db_testing`.

Manual Verification:
Static syntax checks (`php -l`) passed on all modified and created files. Diff strictly confined to approved scope.

Acceptance Criteria:
Negative quota balances are mathematically impossible; resurrection loophole closed; tests pass cleanly once test-db provisioned.

Rollback Consideration:
Git revert test file.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ VERIFIED / COMPLETE

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 09:00

---

### Task ID: TASK-02-03
Task Name: Architectural Verification of Attendance & No-Show Mechanisms (`GAP-06`)
Phase: PHASE 2
Workstream: Backend API

Objective:
Verify whether the existing token-based check-in endpoint (`POST /api/v1/appointments/check-in` invoking `BookingService::checkInAppointmentByToken`) satisfies mobile queue attendance marking, or if a dedicated direct route is required for doctors.

Why This Task Exists:
Resolves `GAP-06` (Classification: `API CONTRACT GAP / REQUIRES ARCHITECTURAL VERIFICATION`). Prevents redundant endpoint sprawl.

Dependencies:
`PHASE 1 EXIT GATE`

Preconditions:
`backend/routes/api.php` accessible.

Files Expected to Change:
`backend/tests/Feature/Api/V1/AppointmentAttendanceTest.php`
(Optionally `backend/routes/api.php` and `AppointmentController.php` only if dedicated route is justified).

Files That Must NOT Change:
`mobile/**`
`src/**`

Backend Impact: Confirms or adds attendance endpoints with 4D authorization.
Frontend Impact: None.
Mobile Impact: Used by Doctor and Assistant queue shells.
Database Impact: Updates `status` in `appointments` table.
Infrastructure Impact: None.

API Contracts:
`POST /api/v1/appointments/check-in` or dedicated `attend` / `no-show`.

Authorization Requirements:
Doctor or Assistant affiliated with the appointment's clinic.

Localization Requirements:
Localized success messages.

Security Requirements:
SEC-01 (Cannot update appointments outside affiliated clinic).

Automated Tests:
Feature test verifying status transitions to `attended` and `no_show`.

Manual Verification:
Execute transitions via test script and inspect database status column.

Acceptance Criteria:
Status transitions verified; tests pass.

Rollback Consideration:
Git revert test or controller adjustments.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ VERIFIED / COMPLETE

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 11:15

---

### Task ID: TASK-02-04
Task Name: Verify Patient Appointments Scoping & Filter Security (`GAP-05`)
Phase: PHASE 2
Workstream: Backend Security Audit

Objective:
Audit and write automated test for `AppointmentController@index` to ensure that when a request is authenticated as `patient_registered`, the query is automatically constrained to `patient_id == auth()->user()->patient->id`.

Why This Task Exists:
Resolves `GAP-05` (Classification: `REQUIRES VERIFICATION`). Guarantees patient medical privacy (PHI).

Dependencies:
`PHASE 1 EXIT GATE`

Preconditions:
`backend/` testing environment available.

Files Expected to Change:
`backend/tests/Feature/Api/V1/PatientAppointmentScopingTest.php`
(Optionally `backend/app/Http/Controllers/Api/V1/AppointmentController.php` if scoping bug found).

Files That Must NOT Change:
`mobile/**`
`src/**`

Backend Impact: Confirms query scoping in appointment listing.
Frontend Impact: None.
Mobile Impact: Guarantees patient app receives only self records.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/appointments` (Classification: `EXISTS`).

Authorization Requirements:
Authenticated patient.

Localization Requirements: None.

Security Requirements:
SEC-02 / SEC-05 (Zero data leakage across patient accounts).

Automated Tests:
Test proving Patient A cannot view Patient B's appointments even if explicitly passing `?patient_id=B`.

Manual Verification:
Inspect query builder logic and test assertions.

Acceptance Criteria:
Patient query is strictly self-scoped; test passes.

Rollback Consideration:
Git revert test.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ VERIFIED / COMPLETE

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 11:45

---

### PHASE 2 EXIT GATE
```text
[x] TASK-02-01 verified (Doctor stats API operational)
[x] TASK-02-02 verified (Quota concurrency lock verified under load)
[x] TASK-02-03 verified (Attendance mechanisms architecturally verified)
[x] TASK-02-04 verified (Patient appointment scoping verified)
[x] All backend automated feature tests pass cleanly
[x] API_GAP_REGISTER.md updated
[x] CHANGELOG.md & VERIFICATION_LOG.md updated
[ ] Explicit human approval received to proceed to Phase 3
```

---

# PHASE 3: AAFIYA PATIENT MOBILE APPLICATION

### Task ID: TASK-03-01
Task Name: Implement Patient Splash, Onboarding & Sanctum Authentication Shell
Phase: PHASE 3
Workstream: Mobile Patient App (`aafiya_patient`)

Objective:
Implement brand splash screen, language selector (AR/EN/FR), login screen, registration flow, and token persistence in `aafiya_patient`.

Why This Task Exists:
Provides secure entry point and credential onboarding for patients.

Dependencies:
`PHASE 2 EXIT GATE`

Preconditions:
`aafiya_core` and `aafiya_ui` ready; backend auth endpoints operational.

Files Expected to Change:
`mobile/apps/aafiya_patient/lib/shells/splash_shell.dart`
`mobile/apps/aafiya_patient/lib/shells/auth_shell.dart`
`mobile/apps/aafiya_patient/lib/app.dart`
`mobile/apps/aafiya_patient/test/patient_auth_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Establishes patient auth experience.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me` (Classification: `VERIFIED`).

Authorization Requirements:
Public access for login/register; stores token upon success.

Localization Requirements:
Arabic primary; instant RTL mirroring upon language toggle.

Security Requirements:
SEC-03 (Token stored in secure storage).

Automated Tests:
Widget tests for splash navigation and login form input validation.

Manual Verification:
Verify smooth transition from splash to login with Arabic Cairo typography.

Acceptance Criteria:
Valid credentials store token and transition to patient home; invalid credentials show localized error dialog.

Rollback Consideration:
Git revert on `aafiya_patient` auth files.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ VERIFIED / COMPLETE

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 12:15

---

### Task ID: TASK-03-02
Task Name: Implement Patient Home Dashboard & Appointments List Shell
Phase: PHASE 3
Workstream: Mobile Patient App (`aafiya_patient`)

Objective:
Build the patient home view showing upcoming appointments, past visit history, and appointment details modal with status indicators (confirmed, pending, attended, cancelled).

Why This Task Exists:
Core patient value proposition: tracking care schedule without direct self-booking (`DISC-01`).

Dependencies:
`TASK-03-01`

Preconditions:
Patient authentication functioning.

Files Expected to Change:
`mobile/apps/aafiya_patient/lib/shells/patient_home_shell.dart`
`mobile/apps/aafiya_patient/lib/widgets/appointment_card.dart`
`mobile/apps/aafiya_patient/lib/screens/appointment_detail_screen.dart`
`mobile/apps/aafiya_patient/test/patient_home_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Primary patient interface.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/appointments` (Classification: `VERIFIED`).

Authorization Requirements:
`patient_registered` token.

Localization Requirements:
Full Arabic RTL layout with Hijri/Gregorian date formatting.

Security Requirements:
SEC-02 (Zero clinical data leakage).

Automated Tests:
Widget tests verifying appointment card rendering, status chip colors, and empty state.

Manual Verification:
Confirm that NO direct booking buttons or slot pickers exist in the UI (`DISC-01`).

Acceptance Criteria:
Appointments display accurately; `flutter test` passes.

Rollback Consideration:
Git revert on `patient_home_shell.dart`.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 12:45

---

### Task ID: TASK-03-03
Task Name: Implement Doctor & Clinic Directory Shell
Phase: PHASE 3
Workstream: Mobile Patient App (`aafiya_patient`)

Objective:
Implement a searchable directory of affiliated clinics and licensed doctors with contact information, working hours, and location guidance.

Why This Task Exists:
Enables patients to discover clinic locations and phone numbers to coordinate appointments via Booking Centers or clinic reception.

Dependencies:
`TASK-03-02`

Preconditions:
Clinic listing endpoints operational.

Files Expected to Change:
`mobile/apps/aafiya_patient/lib/screens/clinic_directory_screen.dart`
`mobile/apps/aafiya_patient/lib/screens/doctor_directory_screen.dart`
`mobile/apps/aafiya_patient/lib/widgets/clinic_card.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Directory screens.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/clinics`, `GET /api/v1/doctors` (Classification: `VERIFIED`).

Authorization Requirements:
Authenticated patient.

Localization Requirements:
Search filter in Arabic and English.

Security Requirements:
Public directory info only; no private staff contact data.

Automated Tests:
Unit tests for clinic search query filtering.

Manual Verification:
Test search by specialty and clinic name.

Acceptance Criteria:
Directory loads smoothly with pull-to-refresh; zero booking action buttons present.

Rollback Consideration:
Git revert directory screens.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 17:25

---

### Task ID: TASK-03-04
Task Name: Implement Patient Prescription Viewer & Emergency Profile
Phase: PHASE 3
Workstream: Mobile Patient App (`aafiya_patient`)

Objective:
Implement screens for viewing authorized digital prescriptions (with verification QR code) and managing emergency contacts and allergy notes.

Why This Task Exists:
Empowers patients to review medications and verify authentic prescriptions at pharmacies.

Dependencies:
`TASK-03-02`

Preconditions:
Prescription verification endpoints available.

Files Expected to Change:
`mobile/apps/aafiya_patient/lib/screens/prescriptions_screen.dart`
`mobile/apps/aafiya_patient/lib/screens/emergency_profile_screen.dart`
`mobile/apps/aafiya_patient/lib/widgets/prescription_card.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Medical summary viewer.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/prescriptions`, `GET /api/v1/patients/{id}/allergies`, `POST /api/v1/patients/{id}/emergency-contacts` (Classification: `VERIFIED`).

Authorization Requirements:
Patient token.

Localization Requirements:
Medical names in Latin/Arabic; UI in Arabic.

Security Requirements:
SEC-02 (Ephemeral document access; no plaintext caching on shared storage).

Automated Tests:
Widget test for prescription card and QR code rendering.

Manual Verification:
Verify QR code resolves to valid verification URL (`/api/v1/v/{token}`).

Acceptance Criteria:
Prescriptions display accurately; emergency contacts can be updated.

Rollback Consideration:
Git revert prescription files.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-14 21:50

---

### PHASE 3 EXIT GATE
```text
[x] TASK-03-01 verified (Patient auth & splash)
[x] TASK-03-02 verified (Patient home & appointment listing - ZERO direct booking)
[x] TASK-03-03 verified (Doctor & clinic directory)
[x] TASK-03-04 verified (Prescriptions & emergency profile)
[x] All automated widget and unit tests pass
[x] No direct booking button or screen exists anywhere in aafiya_patient
[x] CHANGELOG.md & VERIFICATION_LOG.md updated
[x] Explicit human approval received to proceed to Phase 4
```

---

# PHASE 4: AAFIYA PRO — DOCTOR OPERATIONAL MOBILE SHELL

### Task ID: TASK-04-01
Task Name: Implement Professional Authentication & Clinic Context Switcher
Phase: PHASE 4
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Implement auth shell in `aafiya_pro`, execute role resolution (`RoleResolver`), route verified doctors to the Doctor Shell, and provide an active clinic switcher (`X-Active-Clinic-ID`).

Why This Task Exists:
Doctors frequently practice across multiple clinics; the application must bind all requests to their explicitly chosen active clinic context.

Dependencies:
`PHASE 3 EXIT GATE`

Preconditions:
`aafiya_core` role resolver operational; `GET /api/v1/doctor/clinics` endpoint verified.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/shells/auth_shell.dart`
`mobile/apps/aafiya_pro/lib/shells/role_resolution_shell.dart`
`mobile/apps/aafiya_pro/lib/shells/doctor_shell.dart`
`mobile/apps/aafiya_pro/lib/widgets/clinic_context_selector.dart`
`mobile/apps/aafiya_pro/test/doctor_context_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Context selection and header injection.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/doctor/clinics` (Classification: `VERIFIED`). Injects `X-Active-Clinic-ID`.

Authorization Requirements:
`doctor` role.

Localization Requirements:
Arabic RTL clinic names and switcher dropdown.

Security Requirements:
SEC-01 (Cannot select clinics without verified doctor affiliation).

Automated Tests:
Unit test ensuring clinic context selection updates `AuthSessionManager.activeClinicId` and triggers header injection.

Manual Verification:
Switch between clinics and verify subsequent network payloads carry updated clinic ID header.

Acceptance Criteria:
Clinic context is preserved across app sessions; tests pass.

Rollback Consideration:
Git revert on context selector.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-15 09:15

---

### Task ID: TASK-04-02
Task Name: Implement Doctor Today's Agenda & Operational Dashboard
Phase: PHASE 4
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Build the doctor operational dashboard consuming `GET /api/v1/doctor/stats` (`GAP-01`) and showing today's appointment timeline, queue status, and quick filters.

Why This Task Exists:
Provides doctors with immediate situational awareness of today's schedule and patient flow (`DISC-02`).

Dependencies:
`TASK-04-01`, `TASK-02-01`

Preconditions:
`GET /api/v1/doctor/stats` implemented and verified in Phase 2.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/screens/doctor_dashboard_screen.dart`
`mobile/apps/aafiya_pro/lib/widgets/doctor_metric_card.dart`
`mobile/apps/aafiya_pro/lib/widgets/doctor_agenda_timeline.dart`
`mobile/apps/aafiya_pro/test/doctor_dashboard_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Doctor dashboard interface.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/doctor/stats` (Classification: `BACKEND GAP` resolved in Phase 2), `GET /api/v1/appointments` (`VERIFIED`).

Authorization Requirements:
`doctor` role with active clinic context.

Localization Requirements:
Arabic time formatting and localized metric labels.

Security Requirements:
SEC-02 / SEC-05 (Read-only operational view; no EHR editing).

Automated Tests:
Widget tests validating metric card counts and timeline rendering.

Manual Verification:
Verify dashboard reflects changes made in backend appointment records.

Acceptance Criteria:
Dashboard displays real-time metrics; zero prescription/visit authoring UI present (`DISC-02`).

Rollback Consideration:
Git revert dashboard files.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED
Created At: 2026-09-11 09:15
Updated At: 2026-09-15 11:50

---

### Task ID: TASK-04-03
Task Name: Implement Live Waiting Room Queue & Attendance Actions
Phase: PHASE 4
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Build the interactive waiting room queue list allowing doctors to view checked-in patients and update appointment attendance status.

Why This Task Exists:
Enables doctors to progress appointments through their operational lifecycle directly from their phone.

Dependencies:
`TASK-04-02`, `TASK-02-03`

Preconditions:
Attendance mechanisms verified in Task 02-03.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/screens/doctor_queue_screen.dart`
`mobile/apps/aafiya_pro/lib/widgets/queue_patient_tile.dart`
`mobile/apps/aafiya_pro/test/doctor_queue_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Queue management.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
Attendance endpoints verified in Task 02-03.

Authorization Requirements:
`doctor` role.

Localization Requirements:
Arabic confirmation dialogs ("هل حضر المريض؟", "تسجيل عدم حضور").

Security Requirements:
SEC-01 / SEC-05.

Automated Tests:
Unit tests verifying attendance status transition API calls and queue state updates.

Manual Verification:
Mark patient attended in app, verify database reflects status `attended`.

Acceptance Criteria:
Queue updates instantly upon status transition; tests pass.

Rollback Consideration:
Git revert queue screen.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-15 15:40

---

### Task ID: TASK-04-04
Task Name: Implement Read-Only Patient Medical Summary Viewer
Phase: PHASE 4
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Implement a read-only sheet displaying essential medical context (allergies, chronic conditions, emergency contact) for a scheduled patient.

Why This Task Exists:
Allows doctors to quickly check critical health alerts before an examination while strictly adhering to `DISC-02` (no mobile EHR authoring).

Dependencies:
`TASK-04-03`

Preconditions:
Patient profile endpoints active.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/screens/patient_summary_sheet.dart`
`mobile/apps/aafiya_pro/lib/widgets/allergy_badge_list.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Read-only summary sheet.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/patients/{id}` (Classification: `VERIFIED`).

Authorization Requirements:
Doctor with active appointment for patient.

Localization Requirements:
Arabic labels for allergies and conditions.

Security Requirements:
SEC-05 (Access logged in `clinical_access_logs`).

Automated Tests:
Widget test verifying read-only badges and absence of edit inputs.

Manual Verification:
Confirm summary sheet displays allergies in high-visibility warning color (`#EF4444`).

Acceptance Criteria:
Summary displays accurately; strictly read-only; tests pass.

Rollback Consideration:
Git revert summary sheet.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ COMPLETED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-16 06:50

---

### PHASE 4 EXIT GATE
```text
[x] TASK-04-01 verified (Auth & clinic switcher)
[x] TASK-04-02 verified (Doctor dashboard & agenda)
[x] TASK-04-03 verified (Queue & attendance actions)
[x] TASK-04-04 verified (Read-only medical summary - ZERO clinical authoring)
[x] All automated Dart tests pass cleanly (206/206 passing, 0 analyzer issues)
[x] No EHR writing or prescription creation UI exists in Doctor shell (DISC-02, SEC-05 verified)
[x] CHANGELOG.md & VERIFICATION_LOG.md updated
[ ] Explicit human approval received to proceed to Phase 5
```

---

# PHASE 5: AAFIYA PRO — ASSISTANT & BOOKING CENTER SHELLS

### Task ID: TASK-05-01
Task Name: Implement Assistant Patient Queue & Check-In Shell
Phase: PHASE 5
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Build the Assistant shell in `aafiya_pro` enabling clinic receptionists to search registered patients, check in arriving patients, and update waiting room status.

Why This Task Exists:
Streamlines reception workflow while strictly adhering to the 4D assistant security ceiling (`SEC-01`).

Dependencies:
`PHASE 4 EXIT GATE`

Preconditions:
`RoleResolver` maps `doctor_assistant` to Assistant shell.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/shells/assistant_shell.dart`
`mobile/apps/aafiya_pro/lib/screens/assistant_queue_screen.dart`
`mobile/apps/aafiya_pro/lib/screens/patient_checkin_screen.dart`
`mobile/apps/aafiya_pro/test/assistant_shell_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Assistant queue and check-in interface.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/appointments`, `POST /api/v1/appointments/check-in`, `GET /api/v1/patients` (Classification: `VERIFIED`).

Authorization Requirements:
`doctor_assistant` with `booking.manage_queue` and `booking.confirm_attendance` permissions.

Localization Requirements:
Arabic RTL search bar and check-in status indicators.

Security Requirements:
SEC-01 (4D Ceiling: no access to clinical visits, billing packages, or clinic administration).

Automated Tests:
Widget test for patient search and check-in button trigger.

Manual Verification:
Perform check-in in app and verify appointment state moves to `in_waiting_room`.

Acceptance Criteria:
Assistant checks in patient smoothly; ceiling strictly enforced; tests pass.

Rollback Consideration:
Git revert assistant shell files.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: CLOSED
- Implementation: Complete
- Automated Verification: PASSED (149 tests passed across packages; 50 in aafiya_pro, 6 new unit tests, 5 new widget tests)
- Human Verification: PASSED (Android Emulator UI Acceptance: 20 PASS, 6 BLOCKED by read-only data constraints, 2 N/A, 0 FAIL)
- Official Closure: Recorded (Zero code mutations during verification; zero DB/data mutations)

Created At: 2026-09-11 09:15
Updated At: 2026-09-17 06:50

---

### Task ID: TASK-05-02
Task Name: Implement Assistant In-Clinic Appointment Booking Shell
Phase: PHASE 5
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Implement appointment booking flow for clinic assistants to schedule return visits or walk-in appointments for patients within the active clinic context.

Why This Task Exists:
Core clinic reception function authorized under assistant permission `booking.create`.

Dependencies:
`TASK-05-01`

Preconditions:
Doctor schedule and slot queries available.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/screens/assistant_booking_screen.dart`
`mobile/apps/aafiya_pro/lib/widgets/slot_selection_grid.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Assistant booking screen.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/appointments/slots`, `POST /api/v1/appointments` (Classification: `VERIFIED`).

Authorization Requirements:
`doctor_assistant` with `booking.create`.

Localization Requirements:
Arabic calendar widget with localized slot times.

Security Requirements:
SEC-01 (Only book within current active clinic).

Automated Tests:
Unit test validating slot selection and booking payload construction.

Manual Verification:
Book an appointment as assistant and verify creation in database.

Acceptance Criteria:
Appointment booked with proper status; tests pass.

Rollback Consideration:
Git revert booking screen.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ CLOSED / VERIFIED

Implementation: COMPLETE (Pre-existing verified implementation)
Automated Verification: PASSED
  - `flutter test test/assistant_booking_test.dart test/assistant_shell_test.dart` (14/14 tests PASS)
  - `flutter test packages/aafiya_core/test/assistant_booking_service_test.dart` (7/7 tests PASS)
  - Static Analysis: 0 errors, 0 warnings, 0 issues
Human Verification: PASS
  - Device: Pixel 5 emulator (`emulator-5554`, Android 17 / API 37)
  - Live Backend: `http://127.0.0.1:8000` (Laravel 11)
  - Account: `ast001@aafiya.test` / `val.assistant@aafiya.dz` (`AST-001` / `PROT-AST-002`, Role: `doctor_assistant`, Clinic: `عيادة شفاء الاختبارية 01`)
  - Reviewer: Human Verification Protocol & Antigravity Forensic Verification Harness
  - Verified Flows:
    1. Assistant Queue Dashboard loaded (`AssistantQueueScreen`) with role and clinic context.
    2. Patient search entry point accessed (`AssistantPatientSearchSheet`).
    3. Cross-clinic tenant isolation enforced (zero leak of external clinic patients).
    4. In-clinic patient lookup verified (`مريض اختباري 002`, MRN: `MRN-2026-0003`, Phone: `+213550000002`).
    5. Return Appointment entry point triggered from patient card (`book_return_visit_...`).
    6. `AssistantBookingScreen` rendered with Return Visit badge ("زيارة عودة") and prefilled patient details.
    7. Clinic doctors loaded dynamically via `GET /api/v1/clinics/{clinicId}`.
    8. Live hourly slots retrieved and rendered via `GET /api/v1/appointments/slots`.
    9. Interactive slot selection highlighted with green border and background.
    10. Zero-mutation boundary strictly enforced: execution stopped prior to `confirm_booking_button` ("تأكيد حجز الموعد"); no appointment created.
    11. Clean back navigation to dashboard verified.
Governance & Security Compliance:
  - SEC-01: COMPLIANT (Only search and book within current active clinic).
  - Assistant Ceiling: COMPLIANT (No privilege leaks; attendance confirmation gated).
Repository Integrity: PRESERVED (Zero application source mutations; zero database mutations).

Created At: 2026-09-11 09:15
Updated At: 2026-09-24 12:45

---

### Task ID: TASK-05-03
Task Name: Implement Booking Center Quota Dashboard & Purchase Request Shell
Phase: PHASE 5
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Build the Booking Center shell in `aafiya_pro` displaying active quota balance, available packages (100, 250, 500, 1000 bookings), ledger transactions, and package purchase requests (`DISC-04`). Strictly exclude any staff or employee management subsystem.

Why This Task Exists:
Provides Booking Center operators with transparency into their commercial quota balance.

Dependencies:
`PHASE 4 EXIT GATE`

Preconditions:
Booking package and transaction endpoints operational.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/shells/booking_center_shell.dart`
`mobile/apps/aafiya_pro/lib/screens/bc_quota_screen.dart`
`mobile/apps/aafiya_pro/lib/widgets/quota_balance_card.dart`
`mobile/apps/aafiya_pro/test/bc_quota_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Booking center financial overview.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/booking-centers/quota-balance`, `GET /api/v1/booking-packages`, `POST /api/v1/booking-centers/purchase-requests` (Classification: `VERIFIED`).

Authorization Requirements:
`booking_center` role.

Localization Requirements:
Arabic currency format and package descriptions.

Security Requirements:
SEC-04 (Accurate ledger display).

Automated Tests:
Widget tests for quota balance card and package purchase request dialog.

Manual Verification:
Verify quota balance reflects database balance.

Acceptance Criteria:
Quota displays accurately; zero staff management UI present (`DISC-04`).

Rollback Consideration:
Git revert booking center shell.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ CLOSED / VERIFIED

Implementation: COMPLETE (Pre-existing verified implementation)
Automated Verification: PASSED
  - `flutter test mobile/apps/aafiya_pro/test/bc_quota_test.dart` (15/15 tests PASS)
  - Static Analysis: 0 errors, 0 warnings
Human Verification: PASS WITH OBSERVATIONS
  - Device: Pixel 5 emulator (`emulator-5554`, Android 17 / API 37)
  - Live Backend: `http://127.0.0.1:8000` (Laravel 11)
  - Account: `val.booking-1@aafiya.dz` (`PROT-BC-002`, BC Entity: `مركز الحجز للشفاء`, Authoritative Quota: 18 units)
  - Reviewer: Human Verification Protocol & Antigravity Forensic Emulator Verification Harness
  - Verified Flows:
    1. Quota balance card rendered displaying authoritative 18 units accurately.
    2. Available packages list retrieved and rendered from `GET /api/v1/booking-packages`.
    3. Purchase request modal triggered via package selection.
    4. Quantity adjustments, price calculation, and submission flow verified.
    5. Clean dismiss and navigation back to Booking Center shell confirmed.
    6. Non-regression of operational booking wizard (`TASK-05-04`) verified from shell.
Web ↔ Flutter Parity: PARITY CONFIRMED WITH OBSERVATIONS (15/15 functional areas assessed)
Recorded Observations (Non-blocking / Pre-existing architectural and scope realities):
  - FINDING-01: Scope Parity Difference — Web-only desktop modules (Calendar, Invoices/Billing, Reports & Analytics, Legacy Staff Audit) are intentionally absent from Flutter mobile per `DISC-04` and Mobile V1 single-seat operational scope.
  - FINDING-02: State Refresh Semantics — Web interface applies optimistic local state decrement upon booking creation, whereas Flutter mobile strictly adheres to authoritative backend state refresh (`DISC-06` compliant).
  - FINDING-03: Localization Fallback — Secondary modal action labels displayed English fallback in compiled APK under default runtime locale.
Governance Compliance:
  - DISC-04: COMPLIANT (Single-seat operator model; zero staff management UI introduced).
  - DISC-06: COMPLIANT (Authoritative backend balance single-source-of-truth enforced).
Repository Integrity: PRESERVED (Zero application source mutations; documentation update only).

Created At: 2026-09-11 09:15
Updated At: 2026-09-23 19:50

---

### Task ID: TASK-05-04
Task Name: Implement Booking Center Quota-Deducted Appointment Booking Flow
Phase: PHASE 5
Workstream: Mobile Professional (`aafiya_pro`)

Objective:
Implement the end-to-end appointment booking flow for Booking Centers, searching doctor availability across clinics and deducting from quota atomically.

Why This Task Exists:
Primary operational engine of AAFIYA's commercial booking model.

Dependencies:
`TASK-05-03`, `TASK-02-02`

Preconditions:
Backend concurrency locks verified in Phase 2.

Files Expected to Change:
`mobile/apps/aafiya_pro/lib/screens/bc_appointment_booking_screen.dart`
`mobile/apps/aafiya_pro/lib/widgets/doctor_lookup_field.dart`
`mobile/apps/aafiya_pro/test/bc_booking_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: BC booking interface.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`POST /api/v1/appointments`, `GET /api/v1/appointments/slots` (Classification: `VERIFIED`).

Authorization Requirements:
`booking_center` role with quota > 0.

Localization Requirements:
Step-by-step Arabic booking wizard.

Security Requirements:
SEC-04 (Handled by backend atomic transaction).

Automated Tests:
Integration test for full booking wizard state flow.

Manual Verification:
Book appointment via BC shell and verify quota decrements by exactly 1 in `booking_transactions`.

Acceptance Criteria:
Successful booking creates confirmed appointment and decrements quota balance; tests pass.

Rollback Consideration:
Git revert booking wizard.

Risk: MEDIUM.

Estimated Complexity: HIGH.

Status: ☑ COMPLETE / VERIFIED

Implementation: COMPLETE
Automated Verification: PASSED (151/151 tests — 127 core + 9 bc_booking + 15 bc_quota | flutter analyze: 0 issues | debug APK: built)
Human Verification: COMPLETE — READY WITH MINOR OBSERVATION GAP
  - Device: Pixel 5 emulator (emulator-5554, Android 17 / API 37)
  - Account: val.booking-1@aafiya.dz (BC: مركز الحجز التجريبي 001)
  - Flutter ↔ Web Parity: 25/25 MATCH (100%)
  - DISC-04: COMPLIANT (zero staff/employee UI introduced)
  - DISC-06: COMPLIANT (quota backend-authoritative; pending appointment does not decrement quota; balance remained 116 before and after)
  - Runtime: STABLE (zero crashes across all verified flows)
  - Repository Integrity: PRESERVED (zero application source mutations)
  - Observation Gap: Step 3 (calendar/slot picker UI) was functionally traversed and result confirmed on review screen, but no standalone screenshot was captured. Not an implementation failure.
  - Read-Only Limitations: Cancellation and rescheduling mutation execution was blocked by read-only safety contract; UI dialogs for both were verified.
  - Live Booking Evidence: MS-2026-0009 created during HV (مريض 065 / د. 009 / عيادة 07 / 2026-09-22 15:00) — historical verification evidence; quota NOT decremented (DISC-06 confirmed)

Note: Original EXECUTION_PLAN acceptance criterion ("Successful booking creates confirmed appointment and decrements quota by exactly 1") reflects pre-audit wording. Post-audit DISC-06 contract clarifies: quota is decremented only when the clinic/doctor confirms the appointment (not at pending creation). The pending booking flow is the correct implementation per the audited backend contract.

Deferred Item: Deferred Backend Contract Reconciliation — Post Phase 5 (backend quota transaction reconciliation remains deferred; not resolved by TASK-05-04).

Created At: 2026-09-11 09:15
Updated At: 2026-09-22 08:46

---

### PHASE 5 EXIT GATE
```text
[x] TASK-05-01 verified (Assistant queue & check-in)
[x] TASK-05-02 verified (Assistant return appointment booking — CLOSED / VERIFIED | 21/21 Dart tests PASS | Emulator HV PASS | Zero Mutation)
[x] TASK-05-03 verified (BC quota balance & purchase request — CLOSED / VERIFIED | 15/15 Dart tests PASS | Emulator HV PASS WITH OBSERVATIONS | Parity Confirmed)
[x] TASK-05-04 verified (BC operational booking flow — READY WITH MINOR OBSERVATION GAP | 25/25 Flutter↔Web parity | DISC-04 COMPLIANT | DISC-06 COMPLIANT)
[x] All automated Dart tests pass cleanly (158/158 PASS as of 2026-09-24)
[x] Assistant ceiling strictly enforced; no privilege leaks (tenant isolation & RBAC verified)
[x] CHANGELOG.md & VERIFICATION_LOG.md updated (2026-09-24 13:20)
[x] Explicit human approval received to proceed to Phase 6 — GRANTED (Phase 5 is FORMALLY CLOSED / VERIFIED; Phase 6 transition AUTHORIZED as of 2026-09-24 13:20 CET)
```

**Phase 5 Exit Gate Status:** PASS — HUMAN APPROVED  
**Phase 5 Status:** FORMALLY CLOSED / VERIFIED  
**Phase 6 Transition:** AUTHORIZED (Awaiting Phase 6 Pre-Implementation Contract Audit)  
**Implementation Mutation:** NONE (Zero code, test, backend, or database mutations authorized)

---

# PHASE 6: SYSTEM INTEGRATION & HARDENING

### Task ID: TASK-06-01
Task Name: Implement Global Error Boundaries, Offline Banner & Network Retries
Phase: PHASE 6
Workstream: Mobile Reliability

Objective:
Introduce global Flutter error boundaries, persistent offline banners, exponential backoff for transient HTTP errors, and standard empty/error states across all screens.

Why This Task Exists:
Guarantees high reliability and graceful degradation under unstable mobile connectivity.

Dependencies:
`PHASE 5 EXIT GATE`

Preconditions:
All apps functional.

Files Expected to Change:
`mobile/packages/aafiya_ui/lib/widgets/aafiya_offline_banner.dart`
`mobile/packages/aafiya_core/lib/network/retry_interceptor.dart`
`mobile/apps/aafiya_patient/lib/app.dart`
`mobile/apps/aafiya_pro/lib/app.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Enhanced fault tolerance.
Database Impact: None.
Infrastructure Impact: None.

API Contracts: None.

Authorization Requirements: None.

Localization Requirements:
Arabic, English, and French offline warning messages.

Security Requirements:
No caching of PHI on disk while offline without encryption.

Automated Tests:
Unit tests for retry interceptor with mocked 503 responses.

Manual Verification:
Toggle airplane mode and confirm offline banner appears immediately.

Acceptance Criteria:
App recovers cleanly upon network reconnection; tests pass.

Rollback Consideration:
Git revert retry interceptor.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ COMPLETE / VERIFIED

Implementation: COMPLETE
Automated Verification: PASSED (358/358 tests PASS — 139 core + 32 ui + 74 patient + 113 pro | flutter analyze: 0 issues)
Human Verification: PASSED
  - Environment: Pixel 5 emulator & Linux desktop / Monorepo test harness
  - Tests Evaluated: Tests A through I (Section 6–14) ALL PASSED
  - Verification Areas:
    * Offline banner: animates on network drop with amber styling (`AafiyaOfflineBanner`)
    * Connection recovery: transitions to emerald green, auto-dismisses after ~2.5s
    * Global error boundary: intercepts framework/async errors (`AafiyaCrashBoundary`)
    * Recovery action: safely resets navigation to application root
    * Localization: Arabic RTL, English LTR, French LTR with 7 dedicated reliability keys
    * Retry safety contract: strictly idempotent read verbs (`GET`, `HEAD`) on transient `502`, `503`, `504` (max 3 attempts); mutating verbs (`POST`, `PUT`, `PATCH`, `DELETE`) and `500`/`4xx` strictly non-retryable
    * PHI / Storage Safety: zero SQLite/Hive caching, zero offline mutation queues, zero PHI or raw stack traces exposed
    * Phase 5 Regression Smoke: 187/187 tests PASS (0 regressions)
    * Application Stability: rock solid across all screens and navigation states
Defects: 0
Governing ADR: ADR-06-01-01 (`TASK-06-01_CONTRACT_CLARIFICATION.md`)
Closed At: 2026-09-27

Created At: 2026-09-11 09:15
Updated At: 2026-09-27 08:45

---

### Task ID: TASK-06-02
Task Name: Implement Session Expiration (401) Interceptor & Re-Authentication
Phase: PHASE 6
Workstream: Mobile Security (`aafiya_core`)

Objective:
Implement automatic session invalidation interceptor in `ApiClient` that detects 1440-minute Sanctum token expiry, clears secure storage, displays a localized explanation modal, and routes to login shell.

Why This Task Exists:
Resolves `GAP-04` (Classification: `SESSION CONSTRAINT / MOBILE SESSION REQUIREMENT`) and prevents confusing unhandled network exceptions when tokens expire.

Dependencies:
`TASK-06-01`

Preconditions:
`AuthSessionManager` operational.

Files Expected to Change:
`mobile/packages/aafiya_core/lib/network/api_client.dart`
`mobile/packages/aafiya_core/lib/auth/auth_session_manager.dart`
`mobile/packages/aafiya_core/test/auth_expiration_test.dart`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Clean session expiration handling.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
Handles HTTP 401 Unauthenticated.

Authorization Requirements:
Clears authentication state on 401.

Localization Requirements:
"انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."

Security Requirements:
SEC-06 (Purge token from Keystore/Keychain immediately).

Automated Tests:
Unit test asserting that a 401 response sets session state to `unauthenticated` and purges secure storage.

Manual Verification:
Inject simulated 401 response and verify app transitions to login screen.

Acceptance Criteria:
401 handling is smooth and deterministic; tests pass.

Rollback Consideration:
Git revert interceptor logic.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ CLOSED / VERIFIED

Execution Sequence:
```text
ADR-06-02-01 Revision 3 approved
        ↓
Stage 3 Controlled Implementation complete
        ↓
Automated verification passed (377/377 PASS, 0 analyzer issues)
        ↓
Human Verification Gate passed (6/6 Scenarios PASS, AR/EN/FR verified, 0 defects)
        ↓
Formal closure authorized by Human Project Owner
        ↓
TASK-06-02 CLOSED / VERIFIED
```

Automated Verification:
- Commands Executed:
  1. `flutter test mobile/packages/aafiya_core/` → Exited 0 (152/152 tests passed).
  2. `flutter test mobile/packages/aafiya_ui/` → Exited 0 (32/32 tests passed).
  3. `flutter test mobile/apps/aafiya_patient/` → Exited 0 (76/76 tests passed).
  4. `flutter test mobile/apps/aafiya_pro/` → Exited 0 (117/117 tests passed).
  5. `flutter analyze` on modified files → Exited 0 (0 errors, 0 warnings, 0 issues).
- Output Summary: 377/377 automated tests passed across the mobile monorepo (100% pass rate); 0 static analyzer issues.

Human Verification:
- Reviewer: Human Project Owner & Antigravity Verification Harness
- Status: HUMAN VERIFICATION PASSED (6/6 Scenarios PASS, 0 defects)
  * Scenario 01 (Patient Runtime 401): PASS — Pushed sub-route evicted; 1 modal displayed; returned to PatientAuthShell; zero request replay.
  * Scenario 02 (Pro Doctor Runtime 401): PASS — Navigation stack cleared; consultation route evicted; 1 modal displayed; returned to ProAuthShell.
  * Scenario 03A (Pro Assistant Runtime 401): PASS — Triage route evicted; 1 modal displayed; returned to ProAuthShell; Assistant role resolution intact.
  * Scenario 03B (Pro Booking Center Runtime 401): PASS — Quota route evicted; 1 modal displayed; returned to ProAuthShell; BC role resolution intact.
  * Scenario 04 (Startup Expired Session): PASS — /auth/me with notifyUnauthorized: false silently transitions to Unauthenticated; ZERO runtime modals shown.
  * Scenario 05 (Concurrent 401 Coalescing): PASS — 5 concurrent 401s coalesced into exactly 1 invalidation flight; 1 notification; 1 modal.
  * Scenario 06 (PHI / Navigation Isolation): PASS — Sensitive in-flight form state destroyed; no state restoration upon re-authentication.
  * Localization Check: PASS — Verified trilingual modal strings in Arabic RTL, English LTR, and French LTR.
- Defects: 0
- Governing ADR: ADR-06-02-01 Revision 3
- Closed At: 2026-09-27
- Updated At: 2026-09-27 10:25

---

### Task ID: TASK-06-03
Task Name: Implement Deep Linking for Prescription Verification & Appointments
Phase: PHASE 6
Workstream: Mobile Integration

Objective:
Configure deep link handling (`aafiya://prescription/{token}` and `aafiya://appointment/{id}`) in `aafiya_patient`.

Why This Task Exists:
Allows patients to open shared digital prescriptions or appointment reminders directly from SMS or QR codes.

Dependencies:
`TASK-06-02`

Preconditions:
Prescription viewer screen implemented.

Files Expected to Change:
`mobile/apps/aafiya_patient/lib/routes/app_router.dart`
`mobile/apps/aafiya_patient/android/app/src/main/AndroidManifest.xml`

Files That Must NOT Change:
`backend/**`
`src/**`

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: Deep link routing.
Database Impact: None.
Infrastructure Impact: None.

API Contracts:
`GET /api/v1/v/{token}` (Classification: `VERIFIED`).

Authorization Requirements:
Valid prescription token.

Localization Requirements: None.

Security Requirements:
SEC-02 (Validates token with backend before displaying clinical data).

Automated Tests:
Router unit tests for URI parsing and route resolution.

Manual Verification:
Trigger deep link via adb shell and verify prescription screen opens.

Acceptance Criteria:
Deep links resolve correctly; tests pass.

Rollback Consideration:
Git revert router changes.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ CLOSED / VERIFIED

- Automated Verification: PASSED (37/37 deep link tests PASS, 113/113 patient app tests PASS, 414/414 mobile monorepo tests PASS, 0 analyzer issues)
- Human Verification Gate: PASSED (17/17 HV scenarios PASS)
- Governing ADR: ADR-06-03-01 Revision 2.1
- Closed At: 2026-09-27
- Updated At: 2026-09-27 12:00

---

### PHASE 6 EXIT GATE
```text
[x] TASK-06-01 verified (Error boundaries & offline banner — CLOSED / VERIFIED | 358/358 PASS | HV PASS | Zero Defects)
[x] TASK-06-02 verified (Session expiration & re-auth — CLOSED / VERIFIED | 377/377 PASS | 6/6 HV PASS | Zero Defects)
[x] TASK-06-03 verified (Deep linking — CLOSED / VERIFIED | 414/414 PASS | 17/17 HV PASS | Zero Defects | Scope Compliant)
[x] All automated Dart tests pass cleanly (414/414 PASS across core, ui, patient, pro)
[x] No memory leaks or unhandled network exceptions
[x] VERIFICATION_LOG.md updated
[ ] Explicit human approval received to proceed to Phase 7
```

---

# PHASE 7: RELEASE READINESS & VERIFICATION GATE

### Task ID: TASK-07-01
Task Name: End-to-End Forensic Security Audit & Static Analysis Review
Phase: PHASE 7
Workstream: Quality Assurance & Security

Objective:
Execute comprehensive static analysis on mobile (`flutter analyze` using `/home/yazan/Downloads/flutter/bin/flutter`) and web (`npm run lint` / `next lint`), execute existing backend security test suite (`phpunit`), verify PHP code style (`pint --test`), audit SEC-01 through SEC-06 compliance, execute deterministic OWASP Mobile Application Security Top 10 (2024 baseline) audit, verify zero PHI exposure across public/storage/logging surfaces, and evaluate layered localization completeness across web and mobile.

Important Tooling Clarifications (Stage 1 Contract Correction):
- Flutter SDK path: Authoritative path is `/home/yazan/Downloads/flutter/bin/flutter` and Dart is `/home/yazan/Downloads/flutter/bin/dart`.
- Backend Test Suite: Documented `pest` command does not match repository environment; existing backend automated test runner is `backend/vendor/bin/phpunit` (PHPUnit 12.5.33).
- Backend Code Style: `backend/vendor/bin/pint --test` is approved strictly for PHP code-style verification. Pint does NOT replace PHPStan.
- Backend Static Analysis: `phpstan` is NOT installed in the environment, NOT authorized for installation, and constitutes an explicit static-analysis coverage gap to be disclosed in audit reporting.
- TASK-07-01 is strictly AUDIT ONLY: Zero code mutations, zero in-flight defect fixes. Packaging, version bumps, and release APK builds (`flutter build apk --release`, `--obfuscate`) belong exclusively to TASK-07-02.

Why This Task Exists:
Mandatory clinical software compliance and safety gate before production readiness.

Dependencies:
`PHASE 6 EXIT GATE`

Preconditions:
All V1 code complete.

Files Expected to Change:
None (Audit only; fixes logged as findings if found).

Files That Must NOT Change:
All source files (`backend/**`, `src/**`, `mobile/**`, `database/**`).

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: None.
Database Impact: None.
Infrastructure Impact: None.

API Contracts: None.

Authorization Requirements:
All roles audited (Doctor, Doctor Assistant, Booking Center, Patient, Clinic Director, System Admin).

Localization Requirements:
Layered deterministic completeness audit:
- Web: JSON key parity across `messages/{ar,en,fr}.json`, translation value completeness (no empty values), bounded static inspection for hard-coded user-facing strings.
- Mobile: `localized_strings.dart` completeness (no missing/empty/unresolved getters across AR/EN/FR), bounded static inspection for hard-coded user-facing strings.
- Standard: No deterministically detectable missing, empty, unresolved, or unauthorized user-facing localization strings within defined audit scope. Ambiguities reported as `OBSERVATION` or `REQUIRES HUMAN DECISION`.

Security Requirements:
1. Full forensic audit of SEC-01 through SEC-06 against authoritative definitions in `SECURITY_REGISTER.md`.
2. Deterministic OWASP Mobile Application Security Top 10 (2024 baseline) audit matrix:
   `OWASP Category → AAFIYA Security Control → Affected Component → Evidence Source → Verification Method → Observed Result → PASS / FINDING / N/A / DEFERRED`.
3. PHI Non-Exposure Audit: Zero unauthorized clinical data or patient identifiers exposed across public endpoints (`GET /api/v1/v/{token}`), mobile local storage (zero EHR on disk), application logs (`print`/`debugPrint`/`Log::`), or crash boundaries (`AafiyaCrashBoundary`).

Automated Verification Commands (Read-Only):
- Mobile Static Analysis: `export PATH="/home/yazan/Downloads/flutter/bin:$PATH" && flutter analyze`
- Mobile Test Baseline: `export PATH="/home/yazan/Downloads/flutter/bin:$PATH" && flutter test`
- Backend Test Suite: `cd backend && ./vendor/bin/phpunit --testdox`
- Backend Code Style: `cd backend && ./vendor/bin/pint --test`
- Web Static Analysis: `npm run lint` (`npx next lint`)

Manual Verification:
Comprehensive security checklist review with project sponsor.

Acceptance Criteria:
Zero errors in static analysis (`flutter analyze`, `next lint`); backend tests pass cleanly; zero critical/high security vulnerabilities found; zero unauthorized PHI exposure; all findings classified under standard taxonomy.

Rollback Consideration: None.

Risk: LOW.

Estimated Complexity: MEDIUM.

Status: ☑ CLOSED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-27 15:45 (Stage 3 Human Verification & Formal Closure Completed)

---

### Task ID: TASK-07-02
Task Name: Release Packaging, Signing & Binary Security Verification
Phase: PHASE 7
Workstream: Release Engineering & Binary Security

Objective:
Package optimized release binaries (Android APK/AAB) for `aafiya_patient` and `aafiya_pro`, enforce R8/ProGuard code/resource shrinking, enforce Dart symbol obfuscation (`--obfuscate --split-debug-info`), bind authoritative production API endpoints, enforce strict release manifest posture (cleartext traffic not explicitly enabled), and implement fail-closed release signing that strictly refuses debug-keystore fallback.

Completed Stage Sequence:
- Stage 1 — Baseline Audit: Completed (Read-only packaging audit, identified FINDING-RELEASE-01, FINDING-CLEARTEXT-01, FINDING-CONFIG-01, FINDING-SIGN-01).
- Stage 2 — Controlled Remediation: Completed (Remediated 4 findings, rebuilt APK/AAB binaries, verified hashes and symbols).
- Stage 2A — Signing Fail-Closed Correction: Completed (Eliminated debug signing fallback, verified fail-closed build failure when credentials absent, isolated stale artifacts, preserved debug builds).
- Stage 3 — Final Verification & Closure Assessment: Completed (Read-only closure assessment, verified 4 findings resolved, established State B signing classification).
- Stage 4 — Human Closure Decision & Controlled Tracking Reconciliation: Completed (Formal Human Closure Decision recorded).

Production-Signed Artifact Verification:
PENDING / NOT PERFORMED (Genuine production signing material and production-signed artifact verification remain a separate pending release-provisioning prerequisite).

Files Changed (Controlled Remediation):
- `mobile/apps/aafiya_patient/android/app/src/main/AndroidManifest.xml` (Added INTERNET permission)
- `mobile/apps/aafiya_pro/android/app/src/main/AndroidManifest.xml` (Removed usesCleartextTraffic)
- `mobile/apps/aafiya_pro/android/app/src/debug/AndroidManifest.xml` (Added usesCleartextTraffic for debug dev only)
- `mobile/packages/aafiya_core/lib/config/app_config.dart` (Added AppConfig.production)
- `mobile/apps/aafiya_patient/lib/main.dart` (Routed release mode to AppConfig.production)
- `mobile/apps/aafiya_pro/lib/main.dart` (Routed release mode to AppConfig.production)
- `mobile/apps/aafiya_patient/android/app/build.gradle.kts` (Fail-closed release signing)
- `mobile/apps/aafiya_pro/android/app/build.gradle.kts` (Fail-closed release signing)

Automated Tests:
- `flutter test` across all mobile apps (414/414 PASS).
- `flutter build apk --release` (Verified fail-closed exit code 1 when key.properties absent).
- `flutter build appbundle --release` (Verified fail-closed exit code 1 when key.properties absent).
- `flutter build apk --debug` (Verified debug builds succeed with exit code 0).

Status: ☑ CLOSED / TECHNICALLY VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-27 21:30 (Stage 4 Human Closure & Tracking Reconciliation Completed)

---

### Task ID: TASK-07-04
Task Name: Production Signing & Cryptographic Artifact Verification
Phase: PHASE 7
Workstream: Release Engineering, Cryptographic Verification & Signing Security

Objective:
Configure local production upload signing material with strict fail-closed guards, build production release binaries (APK/AAB) for `aafiya_patient` and `aafiya_pro`, and cryptographically verify all resulting artifacts against the genuine AAFIYA Production Upload Key.

Verified Claims:
- **Claim A — Fail-Closed Release Signing Configuration: VERIFIED**
  - Confirmed local `key.properties` present for both apps (`mobile/apps/aafiya_patient/android/key.properties` and `mobile/apps/aafiya_pro/android/key.properties`) with restrictive `0600` permissions and excluded from Git.
  - Confirmed `buildTypes.release` sets `signingConfig = null` if production signing material is missing or invalid.
  - Confirmed `gradle.taskGraph.whenReady` guard throws explicit `GradleException` (`AAFIYA RELEASE BUILD BLOCKED`) if release/bundle builds are executed without valid production signing credentials.
  - Silent fallback to debug signing is strictly prohibited.
- **Claim B — Cryptographic Artifact Verification: VERIFIED**
  - All four production release artifacts cryptographically verified against the genuine AAFIYA Production Upload Key:
    - **Patient APK** (`mobile/apps/aafiya_patient/build/app/outputs/flutter-apk/app-release.apk`): `apksigner verify` — VERIFIED (v2 scheme, RSA 4096-bit). SHA-256: `1bf0ac4a25e9c4fbaa23e3bfc835a6165a998f99c5af21554ca5e6b52de9bf58` (MATCH).
    - **Patient AAB** (`mobile/apps/aafiya_patient/build/app/outputs/bundle/release/app-release.aab`): `jarsigner -verify` — `jar verified.` (RSA 4096-bit, SHA384withRSA). SHA-256: `c2aee860235b950140c1ea39570e58bd85d10b5a054badaadf1793f58c999400` (MATCH).
    - **Pro APK** (`mobile/apps/aafiya_pro/build/app/outputs/flutter-apk/app-release.apk`): `apksigner verify` — VERIFIED (v2 scheme, RSA 4096-bit). SHA-256: `1f92ed8171a1a7ed289e652a0db1b5d3d8581120c37c463cfeedd83c70a864d8` (MATCH).
    - **Pro AAB** (`mobile/apps/aafiya_pro/build/app/outputs/bundle/release/app-release.aab`): `jarsigner -verify` — `jar verified.` (RSA 4096-bit, SHA384withRSA). SHA-256: `294ed9c52b5386e3560df5125f8ec48539192fa4d29038219a603823ddefca93` (MATCH).

Production Upload Key Metadata (Non-Secret):
- Keystore Location: `/home/yazan/Downloads/Medi/AAFIYA-Signing/aafiya-upload-keystore.jks`
- Certificate Subject: `CN=Djedid Lakhdar, OU=Dev, O=Aafiya, L=Medrissa, ST=Tiaret, C=Ti`
- Certificate SHA-256 Fingerprint: `4A:C5:DC:5F:47:8A:81:74:46:52:63:97:87:BC:E7:4E:73:E4:28:46:C2:A5:DF:EF:D4:E4:B4:1C:BF:46:E2:69`
- Key Characteristics: RSA 4096-bit, SHA384withRSA, Validity: 27 September 2026 → 12 February 2054.

Release & Deployment Boundaries:
- **Google Play App Signing**: NOT VERIFIED AND NOT CLAIMED (managed by Google Play Console in cloud upon intake).
- **Release Approval**: NOT GRANTED.
- **Deployment**: NOT PERFORMED.
- **Store Submission**: NOT PERFORMED.

Status: ☑ CLOSED / VERIFIED

Created At: 2026-09-27 22:00
Updated At: 2026-09-27 23:45 (Stage 3 Human Verification & Formal Closure Completed)

---

### Task ID: TASK-07-03
Task Name: Final Human Verification Gate & Master Plan Sign-Off
Phase: PHASE 7
Workstream: Project Governance

Objective:
Conduct final end-to-end walkthrough with human project sponsors, review all verification logs, confirm locked decisions were maintained, and obtain sign-off.

Why This Task Exists:
Fulfills the core governance mandate: human oversight at every gate.

Dependencies:
`TASK-07-02`, `TASK-07-04`

Preconditions:
Release builds ready; all documentation up to date.

Files Expected to Change:
`docs/aafiya_v1/VERIFICATION_LOG.md`
`docs/aafiya_v1/CHANGELOG.md`

Files That Must NOT Change:
Application code.

Backend Impact: None.
Frontend Impact: None.
Mobile Impact: None.
Database Impact: None.
Infrastructure Impact: None.

API Contracts: None.

Authorization Requirements: Formal sign-off.

Localization Requirements: None.

Security Requirements: All security gates closed.

Automated Tests:
Verify all test suites green.

Manual Verification:
Human sponsor review of live apps and documentation.

Acceptance Criteria:
Human sponsor signs off in `VERIFICATION_LOG.md`.

Rollback Consideration: None.

Risk: LOW.

Estimated Complexity: LOW.

Status: ☑ CLOSED / VERIFIED

Created At: 2026-09-11 09:15
Updated At: 2026-09-28 11:25 (Final Human Verification Gate Completed & Formally Closed by Human Authority)

Notes:
- Final human verification performed; all defined technical acceptance criteria for Phase 7 have been satisfied based on the authoritative evidence reconciled through TASK-07-01, TASK-07-02, TASK-07-03, and TASK-07-04.
- Formal Human Authority sign-off granted by project sponsor.
- Documented mobile test baseline (230/230 PASS; 414/414 monorepo suite) and backend/static analysis suites green.
- Strict Governance Separation: Production Release Approval is NOT GRANTED; Deployment is NOT PERFORMED; Store Submission is NOT PERFORMED; Google Play App Signing is NOT VERIFIED AND NOT CLAIMED.

---

### PHASE 7 EXIT GATE
```text
[x] TASK-07-01 verified (Security audit & static analysis clean)
[x] TASK-07-02 technically verified (Release builds & fail-closed signing verified)
[x] TASK-07-04 verified (Production signing configuration fail-closed & 4 release artifacts cryptographically verified)
[x] TASK-07-03 verified (Final human sign-off obtained — HUMAN APPROVED)
[x] All 7 Phases completed under explicit human authorization
[x] All verification logs signed
[ ] V1 READY FOR PRODUCTION RELEASE (Production Release Approval: NOT GRANTED; Deployment / Store Submission: NOT PERFORMED)
```
