---
Document: AAFIYA V1 Decision Register
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-27 08:45
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: TASK-06-01 FORMALLY CLOSED / VERIFIED
---

# AAFIYA / عافية — V1 Decision Register

This register documents all architectural, product, and technical decisions locked for AAFIYA V1. Decisions recorded here are binding and cannot be reopened without formal review and approval.

---

## Decision Summary Table

| Decision ID | Title | Status | Scope | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **DISC-01** | Direct Patient Booking Prohibited in Mobile | LOCKED | Mobile (Patient) | Eliminates booking UI/workflows from Patient app |
| **DISC-02** | Doctor Mobile Operational-Only Scope | LOCKED | Mobile (Doctor) | Eliminates clinical charting, prescriptions, lab orders from mobile |
| **DISC-03** | System Administration is Strictly Web-Only | LOCKED | Mobile / Web Admin | No mobile admin app; admin console remains on web |
| **DISC-04** | Booking Center Employee/Staff Subsystem Excluded | LOCKED | Mobile (Booking Center) | Single-seat / manager model only; no staff management in V1 |
| **DISC-05** | Lab/Radiology Management Mobile Apps Deferred | LOCKED | Mobile (Diagnostics) | Diagnostic order entry and reporting remains on web |
| **DISC-06** | Web ↔ Mobile Single Source of Truth & Consistency | LOCKED | System-wide | Mobile and Web must strictly consume identical authoritative backend state |
| **DISC-07** | Brand Identity & Terminology Migration | LOCKED | System-wide | Brand name is AAFIYA / عافية; "MediServices" is legacy internal only |
| **DISC-08** | Arabic-First Bidirectional UI Architecture | LOCKED | Mobile / Web | Native RTL layout mirroring, Cairo typography, EN/AR toggle |
| **TASK-05-01-CLOSURE** | Task Closure: Assistant Patient Queue & Check-In Shell | CLOSED | Mobile (Assistant) | Formal closure of TASK-05-01 following successful Human Verification |
| **TASK-05-03-CLOSURE** | Task Closure: BC Quota Dashboard & Purchase Request Shell | CLOSED | Mobile (Booking Center) | Formal closure of TASK-05-03 — PASS WITH OBSERVATIONS |
| **TASK-05-04-CLOSURE** | Task Closure: BC Operational Booking Flow & Flutter Parity | CLOSED | Mobile (Booking Center) | Formal closure of TASK-05-04 — READY WITH MINOR OBSERVATION GAP |
| **ADR-06-01-01** | Global Error Boundaries, Offline Banner & Network Retries | CLOSED / VERIFIED | Mobile Reliability | Governs D-06-01-R1/R2/R3/C1/S1; verified & closed |

---

## Detailed Decision Records

### DISC-01: Direct Patient Booking Prohibited in Mobile App
- **Status**: LOCKED
- **Context**: The backend contains endpoints (`POST /api/v1/appointments`) that theoretically permit direct appointment creation.
- **Decision**: The AAFIYA business model strictly mandates that appointment bookings originate through licensed Booking Centers or direct clinic coordination. The AAFIYA Patient mobile app MUST NOT expose any appointment booking or self-scheduling workflow.
- **Allowed Patient Mobile Scope**:
  - View existing and past appointments.
  - View appointment status (confirmed, pending, attended, cancelled, no-show).
  - Cancel or request reschedule of an existing appointment (subject to policy).
  - View clinic and doctor directories and contact information.
- **Prohibited**:
  - Slot selection for new booking.
  - Creating new appointments from the patient interface.
- **Enforcement**: Zero booking UI components in `aafiya_patient`.

### DISC-02: Doctor Mobile Scope is Operational-Only
- **Status**: LOCKED
- **Context**: Full Electronic Health Record (EHR) authoring, prescribing, and diagnostic ordering require complex multi-step validations, audit logs, and substantial screen real estate.
- **Decision**: The Doctor mobile experience in `aafiya_pro` is strictly operational.
- **Allowed Doctor Mobile Scope**:
  - View daily and upcoming appointment schedules across affiliated clinics.
  - View patient queue status in real time.
  - Update appointment status (confirm, mark attended, mark no-show).
  - View read-only clinical summaries and patient profile summaries.
- **Prohibited**:
  - Writing or updating clinical visit notes / diagnoses.
  - Creating or voiding prescriptions.
  - Ordering laboratory or radiology diagnostics.
- **Enforcement**: Prescriptions and Clinical Visit writing endpoints are blocked from invocation in Doctor mobile shell.

### DISC-03: System Administration is Strictly Web-Only
- **Status**: LOCKED
- **Context**: Platform administration involves package management, tenant management, audit reviews, and financial oversight.
- **Decision**: No mobile application or mobile shell shall be created for the `admin` or `admin_assistant` roles. All administrative functions remain exclusively within the Next.js web application.
- **Enforcement**: Role resolution in `aafiya_pro` explicitly rejects administrative roles with a clear message: "Administrative functions must be accessed via the web console."

### DISC-04: Booking Center Employee Subsystem Excluded from V1 Mobile
- **Status**: LOCKED
- **Context**: The web application contains scaffolding for multi-staff booking center management.
- **Decision**: V1 mobile simplifies the Booking Center experience to an operational single-seat manager interface. Multi-tier employee role management within booking centers is excluded from V1 mobile.
- **Allowed Booking Center Mobile Scope**:
  - View available quota packages and current quota balance.
  - View booking history and ledger transactions.
  - Book appointments on behalf of patients using available quota.
  - Request quota package purchase.
- **Prohibited**:
  - Managing internal booking center staff, operators, or sub-accounts.
- **Legacy Web Preservation**: Any existing Web employee management functionality remains preserved as web legacy; it must not be ported to or duplicated in Mobile V1.

### DISC-05: Diagnostic Center (Lab/Radiology) Mobile Apps Deferred
- **Status**: LOCKED
- **Context**: Laboratory and Radiology workflows involve sample processing, analyzer integration, image review, and structured report finalization.
- **Decision**: No dedicated mobile application or shell is authorized for Lab or Radiology managers/assistants in V1. These workflows remain web-only.

### DISC-06: Web ↔ Mobile Single Source of Truth & Data Consistency
- **Status**: LOCKED
- **Mandatory Architectural Rule**:
  - The AAFIYA Web platform and AAFIYA Mobile applications MUST consume the same authoritative backend/API/database state.
  - Mobile is NOT a separate business system. Web is NOT a separate business system.
  - Neither platform may maintain an independent authoritative copy of:
    * quota balance
    * booking transactions
    * appointments & appointment status
    * patients, clinics & doctors
    * permissions & 4D ceilings
    * notifications & operational stats
    * financial/transactional state.
  - **Reconciliation Requirement**: Under no circumstances may Booking Center Web show a different quota balance (e.g. 20) than Booking Center Mobile (e.g. 68). Both must query and resolve the same backend state.
  - **Cache Rule**: Local mobile caching may be used only as a UX/performance mechanism. Cached financial or operational data MUST NOT silently be presented as current authoritative state when it may be stale. Optimistic UI must never become the authoritative financial state. Mutations must be confirmed by backend response.
  - **API Contract Rule**: Web and Mobile must share identical backend business rules and authorization policies without duplicating divergent business logic in Flutter or Next.js.

### DISC-07: Brand Identity & Terminology Migration
- **Status**: LOCKED
- **Context**: Legacy codebase references `MediServices`. Brand Kit establishes `AAFIYA / عافية`.
- **Decision**: All mobile user-facing assets, bundle identifiers, titles, and copy must strictly use `AAFIYA / عافية`. Primary brand colors are `Health Blue (#0077B6)` and `Healing Green (#48C774)`.

### DISC-08: Arabic-First Bidirectional UI Architecture
- **Status**: LOCKED
- **Context**: Primary target demographic is Arabic-speaking healthcare users in the MENA region.
- **Decision**: Mobile apps must support full RTL mirroring natively with Cairo/Tajawal typography, with English (LTR) and French (LTR) as selectable secondary languages.

### TASK-05-01-CLOSURE: Assistant Patient Queue & Check-In Shell Formal Closure
- **Status**: CLOSED
- **Context**: Implementation and automated testing completed; Human Verification executed on Android emulator against live Laravel backend.
- **Decision**:
  - Human verification completed (PASS: 20, BLOCKED: 6, N/A: 2, FAIL: 0).
  - Task officially closed: `TASK-05-01 — CLOSED`.
  - Blocked scenarios were retained as BLOCKED because resolving them would require prohibited DB/data mutation.

### PHASE-05-EXIT-GATE-APPROVAL: Phase 5 Exit Gate Approval, Phase Closure & Phase 6 Transition Authorization
- **Status**: APPROVED / CLOSED
- **Context**: All four Phase 5 tasks (`TASK-05-01`, `TASK-05-02`, `TASK-05-03`, `TASK-05-04`) are formally closed and verified. 158/158 automated Dart tests pass cleanly with 0 analyzer issues. Complete user journeys verified via live Android emulator (Pixel 5) against backend. Forensic Web ↔ Flutter operational parity confirmed across all relevant functional areas. Zero technical blockers identified. Formal Phase 5 Exit Gate evaluation returned PASS.
- **Decision**:
  - Phase 5 Exit Gate: `PASS — HUMAN APPROVED`.
  - Authoritative Human Approval Decision:
    > "I approve the AAFIYA V1 Phase 5 Exit Gate. Phase 5 is formally CLOSED / VERIFIED. I authorize transition to Phase 6. This approval does not authorize any retrospective mutation to Phase 5 implementation or tracking evidence."
  - Phase Status: `FORMALLY CLOSED / VERIFIED`.
  - Phase 6 Transition: `AUTHORIZED` (Execution begins with Phase 6 Pre-Implementation Contract Audit under Read-Only / Zero Mutation mode).
  - Scope Governance: Non-blocking observations (`DISC-04` single-seat operator boundary, `DISC-06` single source of truth balance refresh, minor cosmetic localization fallbacks) maintained without retrospective implementation mutation.
  - Zero Mutation: Strictly zero source code, test, backend, or database mutations authorized or performed during this closure.

### TASK-05-02-CLOSURE: Doctor Assistant Return Appointment Booking Flow — Formal Closure
- **Status**: CLOSED
- **Context**: Pre-existing implementation in `aafiya_pro` validated via automated tests (`assistant_booking_test.dart` & `assistant_shell_test.dart` 14/14 PASS, `assistant_booking_service_test.dart` 7/7 PASS, 0 analyzer issues) and live Android emulator verification on Pixel 5 (`emulator-5554`) against live Laravel backend (`http://127.0.0.1:8000`) using designated authoritative account `ast001@aafiya.test` / `val.assistant@aafiya.dz` (`AST-001` / `PROT-AST-002`, `doctor_assistant`, `عيادة شفاء الاختبارية 01`).
- **Decision**:
  - Human Verification status: `PASS`.
    - Assistant Queue Dashboard loaded (`AssistantQueueScreen`) with role and clinic context.
    - Patient lookup accessed via `AssistantPatientSearchSheet`.
    - Multi-clinic tenant isolation verified: searching external patients returned 0 results; searching in-clinic patient (`0002`) successfully returned clinic patient (`مريض اختباري 002`, MRN: `MRN-2026-0003`, Phone: `+213550000002`).
    - Dedicated return-visit booking button (`book_return_visit_${patient.id}`) launched return appointment flow.
    - `AssistantBookingScreen` rendered with Return Visit badge ("زيارة عودة") and prefilled patient details.
    - Clinic doctors dynamically loaded from backend (`GET /api/v1/clinics/{clinicId}`).
    - Available hourly slots (08:00 - 17:00) retrieved live via `GET /api/v1/appointments/slots` with accurate capacity counts ("متاح 10 من 10").
    - Slot interactive selection verified with green highlight styling.
    - Read-only safety boundary strictly honored: execution stopped before mutation action (`confirm_booking_button` / "تأكيد حجز الموعد"); zero appointments created.
    - Clean back navigation to dashboard confirmed.
  - Automated verification: 21/21 PASS across widget, shell, and core service test suites; static analysis clean.
  - Governance Compliance:
    - `SEC-01`: COMPLIANT — Clinic isolation enforced; zero cross-clinic data leak.
    - Assistant Ceiling: COMPLIANT — Role-based limits and permissions verified without privilege leaks.
  - Phase 5 State: All four Phase 5 tasks (`TASK-05-01`, `TASK-05-02`, `TASK-05-03`, `TASK-05-04`) are now `CLOSED / VERIFIED`. Phase 5 Exit Gate is pending formal evaluation/approval.
  - Task officially closed: `TASK-05-02 — CLOSED / VERIFIED`.
  - Zero application source code, test, backend, or database mutations performed as part of closure.

### TASK-05-03-CLOSURE: Booking Center Quota Dashboard & Purchase Request Shell — Formal Closure
- **Status**: CLOSED
- **Context**: Existing implementation in `aafiya_pro` validated via automated tests (`bc_quota_test.dart` 15/15 PASS), live Android emulator verification on Pixel 5 (`emulator-5554`) using designated account `val.booking-1@aafiya.dz` (`PROT-BC-002`, `مركز الحجز للشفاء`, 18 units quota), and forensic Web ↔ Flutter parity audit across 15 operational areas.
- **Decision**:
  - Human Verification status: `PASS WITH OBSERVATIONS`.
    - Quota balance card rendered accurately displaying authoritative 18 units.
    - Packages loaded and displayed from `GET /api/v1/booking-packages`.
    - Purchase request modal rendered, interacted with (quantity & price calculations), and submitted successfully.
    - Clean dismiss and navigation back to BC shell verified.
    - Non-regression of operational booking wizard (`TASK-05-04`) confirmed.
  - Automated verification: 15/15 PASS in `bc_quota_test.dart`; static analysis clean.
  - Web ↔ Flutter Parity: `PARITY CONFIRMED WITH OBSERVATIONS` (15/15 areas audited).
  - Recorded Observations (Non-blocking / architectural scope boundaries):
    1. *FINDING-01*: Desktop-only Web modules (Calendar, Invoices/Billing, Reports & Analytics, Legacy Staff Audit) are intentionally absent from Flutter mobile under `DISC-04` and Mobile V1 single-seat operational scope.
    2. *FINDING-02*: Quota state refresh semantics differ between platforms: Web applies optimistic local state decrement on booking creation, whereas Flutter strictly adheres to authoritative backend state refresh (`DISC-06` compliant).
    3. *FINDING-03*: Secondary modal action buttons exhibited English fallback labels ("Cancel" / "Confirm") in compiled APK under default runtime locale.
  - Governance Compliance:
    - `DISC-04`: COMPLIANT — Single-seat operator shell; zero staff management UI.
    - `DISC-06`: COMPLIANT — Authoritative backend balance single source of truth; zero client-side balance drift.
  - Phase 5 State: Strictly maintained as `IN PROGRESS (3/4 = 75%)`. Phase 5 is NOT complete; TASK-05-02 remains pending formal HV.
  - Task officially closed: `TASK-05-03 — CLOSED / VERIFIED`.
  - Zero application source code, test, backend, or database mutations performed as part of closure.

### TASK-05-04-CLOSURE: Booking Center Operational Booking Flow & Flutter Parity — Formal Closure
- **Status**: CLOSED
- **Context**: Implementation and automated testing completed; Human Verification executed on Android emulator (Pixel 5, Android 17) against live Laravel backend (`http://127.0.0.1:8000`) using account `val.booking-1@aafiya.dz`.
- **Decision**:
  - Human verification status: `READY WITH MINOR OBSERVATION GAP`.
    - 30 HV steps: 30 PASS.
    - Observation Gap: Step 3 calendar/slot UI was functionally traversed (result confirmed on Step 4 review screen) but no standalone screenshot captured. Not an implementation failure.
    - Read-Only Limitations: Cancellation and rescheduling API mutations were not executed (blocked by HV safety contract). UI dialogs for both were verified visually.
  - Automated verification: 151/151 PASS (127 core + 9 bc_booking + 15 bc_quota). Analyzer: 0 issues. APK: built.
  - Flutter ↔ Web Parity: 25/25 MATCH (100%).
  - DISC-04: COMPLIANT — Zero staff/employee UI introduced.
  - DISC-06: COMPLIANT — Pending appointment creation does not decrement quota optimistically. Quota remained 116 before and after booking flow. DISC-06 notice displayed explicitly in Step 4 review screen.
  - Task officially closed: `TASK-05-04 — CLOSED`.
  - No application behavior, backend, or database was changed as part of closure.
  - Deferred Item: Backend quota transaction reconciliation (Post Phase 5) remains deferred — NOT resolved by this task.

### ADR-06-01-01: Global Error Boundaries, Offline Banner & Network Retries — Implementation & Verification Outcome
- **ADR ID**: `ADR-06-01-01`
- **Task ID**: `TASK-06-01`
- **Phase**: `PHASE 6 — SYSTEM INTEGRATION & HARDENING`
- **Workstream**: Mobile Reliability
- **Governing Specification**: `TASK-06-01_CONTRACT_CLARIFICATION.md`
- **Status**: CLOSED / VERIFIED
- **Context**: Contract clarification and architectural decision record established prior to implementation. Implementation and automated test suite validation completed (358/358 PASS). Official Human Verification Gate completed (Tests A–I PASS, 0 defects, 187/187 Phase 5 regression smoke PASS).
- **Implementation & Verification Confirmation**:
  - **`D-06-01-R1` (Automatic Retry Safety)**: COMPLIANT & VERIFIED.
    * Automatic retries strictly restricted to safe, idempotent read operations: `GET`, `HEAD`.
    * State-changing operations (`POST`, `PUT`, `PATCH`, `DELETE`) are strictly single-attempt non-retryable to prevent duplicate bookings, quota deductions, or queue desynchronization.
    * Flutter client never acts as an independent authority for appointment bookings, queue state, or quota deductions. Single source of truth preserved on Laravel backend.
  - **`D-06-01-R2` (Transient HTTP Status Policy)**: COMPLIANT & VERIFIED.
    * Statuses eligible for retry: strictly `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` (for safe reads only).
    * Statuses strictly non-retryable: `500 Internal Server Error`, all `4xx` client errors, and non-transient 5xx.
  - **`D-06-01-R3` (Retry Count & Backoff Contract)**: COMPLIANT & VERIFIED.
    * Maximum attempts bounded to 3 (1 initial + up to 2 retries).
    * Exponential backoff with bounded jitter (Attempt 2: ~350ms, Attempt 3: ~700ms).
    * Centralized in `RetryPolicy` in `mobile/packages/aafiya_core/lib/network/retry_policy.dart`; supports zero-delay deterministic test mode.
  - **`D-06-01-C1` (Connectivity Architecture)**: COMPLIANT & VERIFIED.
    * Decoupled `ConnectivityService` abstraction in `mobile/packages/aafiya_core/lib/network/connectivity_service.dart`.
    * Preflight-selected `connectivity_plus: ^6.1.5` wrapped by `PlatformConnectivityService`.
    * `AafiyaOfflineBanner` provides amber alert on offline state, switches to emerald green on reconnection, and auto-dismisses after ~2.5 seconds.
  - **`D-06-01-S1` (Screen Scope & Standardization)**: COMPLIANT & VERIFIED.
    * Multi-layered error boundary protection: `FlutterError.onError`, `PlatformDispatcher.instance.onError`, `ErrorWidget.builder`, and `MaterialApp.builder` overlay.
    * Root fallback UI `AafiyaCrashBoundary` provides compassionate, non-technical error view with "Return to Home / العودة للرئيسية" recovery action.
    * Zero exposure of Dart stack traces, SQL, internal URLs, or PHI.
- **Automated Verification**: 358/358 PASS across core, ui, patient, and pro test suites.
- **Human Verification**: `HUMAN VERIFICATION PASSED` (Tests A through I verified, 0 defects).
- **Task Closure Status**: `TASK-06-01 — CLOSED / VERIFIED`.
- **Zero Implementation Mutation**: Strictly zero code, database, web, or backend mutations during closure synchronization.
