---
Document: AAFIYA V1 Decision Register
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-11-07 23:00
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit + TASK-DWH-15 Verification + Assistant Rewards Governance Lockdown + Password Recovery Governance Finalization
Scope: Planning & Architecture Governance
Implementation Authorized: TASK-06-01 FORMALLY CLOSED / VERIFIED; TASK-DWH-15 BACKEND VERIFIED; DEC-ARP SERIES LOCKED (NO IMPLEMENTATION AUTHORIZATION); DEC-PWR SERIES LOCKED (DECISION FINALIZATION & IMPLEMENTATION PLANNING ONLY - NO IMPLEMENTATION AUTHORIZATION)
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
| **DEC-GAP-D01** | Server Patient Booking Policy & Payment-Gated Access | LOCKED / APPROVED | Backend / System-wide | Enforces fail-closed default on patient self-booking; guest rejected; test flag isolated |
| **DEC-ARP-01** | Assistant Reward Eligibility & Booking Center Attribution | LOCKED / AFFIRMED | Backend / Appointments | Re-affirmed by DEC-01; qualifies reward exclusively upon valid assistant confirmation |
| **DEC-ARP-02** | Dynamic Reward Rate Scheduling & Manager Authority | LOCKED / AFFIRMED | Backend / Financial | Re-affirmed by DEC-03; manager schedules rate changes with effective datetime |
| **DEC-ARP-03** | Dynamic Payout Threshold Scheduling & Manager Authority | LOCKED / AFFIRMED | Backend / Payouts | Re-affirmed by DEC-04; manager schedules threshold changes for available balances |
| **DEC-ARP-04** | Reward Program Lifecycle Management (Active/Suspended/Terminated) | LOCKED / AFFIRMED | System-wide / Lifecycle | Re-affirmed by DEC-05; full server-side lifecycle state enforcement at confirmation |
| **DEC-ARP-05** | Variable Program Termination Notice Period & Qualification Impact | AMENDED | Business Policy / Lifecycle | Amended by DEC-06; deadline is explicit DATETIME in Africa/Algiers timezone |
| **DEC-ARP-06** | Strict All-or-Nothing Payout Batch Execution & Ledger Atomicity | SUPERSEDED | Backend / Payouts | Formally SUPERSEDED by DEC-02; Full and Partial Payouts (Rejection & Deferral) mandated |
| **DEC-ARP-07** | Exceptional Batch Preparation, Paper Review & Spending Ceiling Removal | AMENDED | Governance / Payouts | Amended by DEC-12; paper review is strictly external administrative procedure |
| **DEC-ARP-08** | Delegated Transfer Confirmation Authority, Individual Delegation & Revocation | LOCKED / AFFIRMED | 4D Security / Payouts | Re-affirmed by DEC-07; individual delegation verified at moment of execution |
| **DEC-ARP-09** | Bounced Postal Transfer Incident Handling & Post-Settlement Integrity | LOCKED / AFFIRMED | Financial Ledger / Audit | Re-affirmed by DEC-08; independent incident with full and partial bounce support |
| **DEC-ARP-10** | Immutable Append-Only Ledger & Domain Ledger Boundary | LOCKED / AFFIRMED | Financial Architecture | Re-affirmed by DEC-09; ledger append-only; domain isolation; unified GL deferred |
| **DEC-ARP-11** | Assistant & Booking Center Financial Objections Architecture | LOCKED / AFFIRMED | Objections / Disputes | Re-affirmed by DEC-10; extensible objections architecture; manager final authority |
| **DEC-ARP-12** | Unified Correspondence, Inquiries & Grievances Workflow Pipeline | AMENDED | Platform Operations | Amended by DEC-11; assistant manager receives & classifies; sender does not classify |
| **DEC-01** | Actual Reward Deduction on Appointment Cancellation | LOCKED / FINAL | Financial Ledger / Reversals | Deducts actual earned reward amount ($reward->amount); strictly forbids fixed 10 DZD |
| **DEC-02** | Full and Partial Payouts: Rejection, Deferral & Item-wise Tracking | LOCKED / FINAL | Backend / Payouts Engine | Cancels All-or-Nothing; enables item-level payout, rejection with reason, and deferral |
| **DEC-03** | Manager-Scheduled Dynamic Reward Rate | LOCKED / FINAL | Financial Configuration | Scheduled effective datetime; evaluated at confirmation; no retroactive recalculation |
| **DEC-04** | Manager-Scheduled Dynamic Payout Threshold | LOCKED / FINAL | Backend / Payouts Engine | Dynamic threshold evaluated strictly on net cash payout (Pnet); batch context preserved (`applied_threshold_dzd`) |
| **DEC-05** | Authoritative Program Lifecycle (Active / Suspended / Terminated) | LOCKED / FINAL | System-wide Lifecycle | Manager exclusive authority; stops new rewards during suspension; termination is final |
| **DEC-06** | Program Termination Notice Deadline Datetime & Eligibility Boundary | LOCKED / FINAL | Business Policy / Lifecycle | Notice entered as explicit datetime (Africa/Algiers); confirmation time governs |
| **DEC-07** | Delegated Transfer Confirmation Authority & Execution-Time Check | LOCKED / FINAL | 4D Security / Payouts | Named individual delegation without user limit or ceiling; verified at execution |
| **DEC-08** | Post-Settlement Bounced Postal Transfers & Independent Incidents | LOCKED / FINAL | Financial Ledger / Incidents | Original batch preserved; full/partial bounce incident; compensating ledger entry |
| **DEC-09** | Immutable Append-Only Ledger & Domain Isolation | LOCKED / FINAL | Financial Architecture | Append-only ledger; isolated domain; platform-wide General Ledger deferred |
| **DEC-10** | Extensible Financial Objections for Assistants & Booking Centers | LOCKED / FINAL | Disputes / Objections | Extensible objection schema; no auto balance change; manager sole final decision |
| **DEC-11** | Unified Correspondence, Inquiry & Grievance Pipeline | LOCKED / FINAL | Platform Operations | Assistant manager receives & classifies; delegated handling; manager final authority |
| **DEC-12** | Payout Paper Review is External Administrative Procedure | LOCKED / FINAL | Governance / Payouts | Zero software workflow, scanning, or e-signatures for paper review |
| **DEC-PWR-01** | Full 10-Role Scope & Centralized Account Recovery | LOCKED / FINAL | System-wide / Auth | Encompasses Patient, Doctor, Doctor Assistant, BC, Lab, Lab Assistant, Rad, Rad Assistant, Admin, Admin Assistant |
| **DEC-PWR-02** | Email-Only Recovery Channel & Unverified Email Eligibility | LOCKED / FINAL | Backend / Auth | Exclusively registered email; zero SMS/WhatsApp; unverified accounts eligible; email immutability during recovery |
| **DEC-PWR-03** | Strict Uniform Response & Account Enumeration Prevention | LOCKED / FINAL | System-wide / Security | Identical response regardless of email existence; zero timing or HTTP status oracle |
| **DEC-PWR-04** | Single Active Recovery Link & Invalidation on Re-issuance | LOCKED / FINAL | Security / Tokens | Strictly one active token; issuing new link invalidates previous; 60m expiry; single-use atomic consumption |
| **DEC-PWR-05** | Tiered Rate Limiting & Google reCAPTCHA Enforcement | LOCKED / FINAL | Security / Rate Limiting | Attempts 1–3 free; attempts 4–5 require server-verified Google reCAPTCHA; 30m lockout upon 5th failure |
| **DEC-PWR-06** | Universal Web Reset Landing Architecture | LOCKED / FINAL | Web & Mobile UX | Recovery link opens responsive Web reset page; shared by Patient & Pro; mobile deep links deferred in V1 |
| **DEC-PWR-07** | Manual Re-Authentication Post-Reset | LOCKED / FINAL | Security / Auth | Zero auto-login session created; clear success message; manual login required |
| **DEC-PWR-08** | Total Multi-Device Session Invalidation Post-Reset | LOCKED / FINAL | Security / Sessions | Purges all Sanctum tokens, database sessions, and cycles remember_token across all devices |
| **DEC-PWR-09** | Post-Reset Security Alert Notification Email | LOCKED / FINAL | Comms / Security | Automated notification confirming password change; zero credentials/links in body |
| **DEC-PWR-10** | Authoritative Baseline Password Policy Compliance | LOCKED / FINAL | Auth / Validation | Enforces standard AAFIYA password policy (min 8 characters, confirmed); zero alteration |
| **DEC-PWR-11** | Registered Email Immutability During Password Recovery | LOCKED / FINAL | Security / Identity | Strictly prohibits modifying email address during recovery workflow |
| **DEC-PWR-12** | Google reCAPTCHA v2 Checkbox Implementation & Server Verification | LOCKED / FINAL | Security / Anti-Abuse | reCAPTCHA v2 Checkbox on attempts 4 & 5; 3 free; server verification; zero hardcoded secrets |
| **DEC-PWR-13** | Post-Reset Web Redirection & Manual Mobile Re-Authentication | LOCKED / FINAL | Web & Mobile UX | Display clear success & 'Sign In on Web' button; no Custom URL Scheme; no auto-login; manual mobile return |

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

### DEC-GAP-D01: Server-Side Patient Self-Booking Policy & Electronic Payment Gating
- **Decision ID**: `DEC-GAP-D01`
- **Status**: LOCKED / APPROVED (Formally Approved by Human Authority on 2026-10-14)
- **Governing Task**: `TASK-DWH-15`, `WP-15`
- **Related Decisions**: `DISC-01`, `DEC-SLOT-01`, `DEC-AUTH-01`
- **Scope**: Backend API & Platform Booking Policy
- **Context**: 
  `DISC-01` strictly prohibits direct self-booking UI within the mobile patient application (`aafiya_patient`). However, the backend REST endpoint (`POST /api/v1/appointments`) previously lacked server-side rejection for direct patient booking requests and retained permissive logic across test fixtures. This gap (`GAP-D-01`) required explicit architectural reconciliation.
- **Decision Rules**:
  1. **Strict Mobile & Web Direct Booking UI Exclusion**: In compliance with `DISC-01`, no self-booking forms or slot selection wizards are exposed to patients in `aafiya_patient` or the patient web dashboard in V1.
  2. **Permanent Guest Rejection**: Requests from `patient_guest` to `POST /api/v1/appointments` are strictly rejected by the backend server with HTTP `403 Forbidden` (`غير مصرح: حساب المريض الضيف غير مخول بإنشاء مواعيد مباشرة.`) across all environments, regardless of configuration flags.
  3. **Default Fail-Closed Server Policy**: Direct appointment creation by authenticated registered patients (`patient_registered`) via `POST /api/v1/appointments` is disabled by default on the server with HTTP `403 Forbidden` (`غير مصرح: حجز المواعيد الذاتي للمرضى غير مفعّل حالياً بانتظار إطلاق الدفع الإلكتروني. يرجى الحجز عبر العيادة أو مركز الحجز المعتمد.`), pending official electronic payment gateway deployment. (Note: Response uses HTTP 403 with the localized message string; no machine-readable error code is asserted).
  4. **Production Protection & Feature Gate**: The feature flag `FEATURE_PATIENT_BOOKING_ENABLED` (`config('booking.patient_booking_enabled')`) is strictly `false` by default. Enabling this flag in production is strictly forbidden and requires independent human approval following electronic payment release.
  5. **Isolated Test Pathway**: The configuration parameter is authorized for temporary, isolated in-memory overrides within automated feature test environments only (`backend/tests/Feature/PatientBookingPolicyTest.php`).
  6. **Operational Roles Immunity**: Booking permissions for licensed Booking Centers (`booking_center`, `booking_center_staff`), clinic assistants (`doctor_assistant`), doctors (`doctor`), and platform administrators (`admin`) remain fully operational and completely unaffected by patient self-booking restrictions.
  7. **Out of Scope Clarification**: Implementation of self-booking UI on web/mobile and payment gateway integration are strictly excluded from V1 and deferred to a dedicated future release (V2).

---

## Assistant Rewards, Payout Governance & Correspondence Decisions (DEC-ARP Series)

### DEC-ARP-01: Doctor Assistant Reward Eligibility & Booking Center Attribution
- **Decision ID**: `DEC-ARP-01`
- **Title**: Doctor Assistant Reward Eligibility & Booking Center Attribution
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-GAP-D01`, `DISC-04`
- **Scope**: Backend / Appointment Qualification & Attribution
- **Context & Authority**:
  Lockdown of doctor assistant rewards policy. Establishes the authoritative qualification boundaries for booking-center originated appointments.
- **Decision Rules**:
  1. **Source Eligibility**: The appointment must be genuinely created by an active, licensed Booking Center (`booking_center_id` is present and `creator_type == 'booking_center'`). Appointments booked via direct clinic walk-ins or patient portals are strictly excluded.
  2. **Active Membership Constraint**: The assistant performing the confirmation must have an active, non-terminated membership in the clinic at the exact time of confirmation (`clinic_assistants.is_active = true` and `deleted_at IS NULL`).
  3. **First-Confirmation Attribution**: The reward is granted exclusively to the assistant who executes the first valid qualified confirmation of attendance.
  4. **Patient Presence Non-Requirement**: Reward eligibility does not require the patient's physical presence or completed clinical charting at qualification time.
  5. **Single Reward Invariant**: Under no circumstances shall duplicate rewards be minted for the same appointment (`appointment_id` is unique in `assistant_rewards`).
  6. **Disqualification on Non-Assistant Actor**: If the appointment attendance or status is confirmed by a doctor, administrator, booking center staff, or any non-assistant actor, NO assistant is eligible, and no reward record or ledger entry shall be created.
  7. **Default Baseline Rate**: The approved baseline reward value is 10.00 DZD per qualified appointment, subject to manager-scheduled adjustments.
- **System Impact**: Governs `AssistantRewardQualificationService`. Requires no recalculation of existing records.

### DEC-ARP-02: Dynamic Reward Rate Scheduling & Manager Exclusive Authority
- **Decision ID**: `DEC-ARP-02`
- **Title**: Dynamic Reward Rate Scheduling & Manager Exclusive Authority
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-01`, `DEC-ARP-10`
- **Scope**: Backend / Financial Configuration
- **Context & Authority**:
  Removes hardcoded rate values (`10.00` DZD) and vests exclusive authority in the Platform Manager to schedule rate modifications with forward-looking validity.
- **Decision Rules**:
  1. **Manager Exclusive Authority**: Only the Platform Manager (`admin`) possesses the authority to create, update, or schedule reward rate changes.
  2. **Effective Datetime Scheduling**: The manager specifies the exact effective date and time (`effective_from`) for any new rate value.
  3. **Confirmation-Time Rate Resolution**: The system resolves and applies the applicable reward rate based on the qualified confirmation timestamp of the appointment, NOT its creation or booking timestamp.
  4. **Historical Audit Preservation**: The platform maintains an immutable audit trail of all historical rate tiers, effective date intervals, decision references, and creator user IDs.
  5. **Strict Non-Retroactivity**: Rate modifications apply strictly forward. Past earned rewards, existing ledger entries, and historical balances MUST NOT be recalculated or mutated.
  6. **No Automatic Notification**: No automated notification is broadcast to assistants upon scheduling or enacting a reward rate change.
- **System Impact**: Replaces hardcoded values in `AssistantRewardQualificationService` with scheduled rate lookups (`reward_rate_schedules`).

### DEC-ARP-03: Dynamic Payout Threshold Scheduling & Manager Authority
- **Decision ID**: `DEC-ARP-03`
- **Title**: Dynamic Payout Threshold Scheduling & Manager Authority
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-06`, `DEC-ARP-10`
- **Scope**: Backend / Payouts Engine
- **Context & Authority**:
  Vests exclusive authority in the Platform Manager to adjust the payout threshold while preserving historical ledger invariants.
- **Decision Rules**:
  1. **Manager Exclusive Authority**: Only the Platform Manager possesses the authority to modify the payout eligibility threshold. Assistants have zero ability to adjust or schedule thresholds.
  2. **Default Baseline**: The baseline payout threshold is 10,000.00 DZD.
  3. **Effective Datetime Scheduling**: The manager specifies the exact effective date and time for any new threshold schedule.
  4. **Application to Current Available Balances**: Upon taking effect, the new threshold applies immediately to all currently available unbatched ledger balances.
  5. **Ledger Preservation**: Changing the threshold does NOT alter, re-rate, or rewrite existing ledger transactions.
- **System Impact**: Replaces PHP constant `AssistantPayoutService::PAYOUT_THRESHOLD` with a dynamic query against `payout_threshold_schedules`.

### DEC-ARP-04: Reward Program Lifecycle Management (Active / Suspended / Terminated)
- **Decision ID**: `DEC-ARP-04`
- **Title**: Reward Program Lifecycle Management (Active / Suspended / Terminated)
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-01`, `DEC-ARP-05`
- **Scope**: System-wide / Lifecycle Architecture
- **Context & Authority**:
  Establishes explicit lifecycle states for the Assistant Rewards Program to prevent rogue reward generation during operational halts or after retirement.
- **Decision Rules**:
  1. **Authoritative States**: The program operates strictly under three authoritative lifecycle states:
     - `Active`: Normal operational state.
     - `Suspended`: Temporarily halted; no new rewards accrue.
     - `Terminated`: Permanently closed; final settlement workflow triggered.
  2. **Manager Sole Authority**: The Platform Manager alone holds the authority to activate, suspend, reactivate, or terminate the program.
  3. **Suspension Mechanics**: Suspension may be immediate or scheduled with a future effective timestamp. While suspended, zero new rewards are created. Existing earned balances and ledger entries remain fully protected and preserved.
  4. **Confirmation-Moment State Verification**: The backend server MUST evaluate the authoritative lifecycle state at the exact moment of qualified appointment confirmation.
  5. **Termination Principles**: Termination has no pre-fixed mandatory end date. The manager decides termination timing. Accrued balances are settled under approved exit rules. Termination never deletes the program, its audit logs, or its historical ledger records.
- **System Impact**: Requires a new service `AssistantProgramLifecycleService` and lifecycle event store `program_lifecycle_events`.

### DEC-ARP-05: Variable Program Termination Notice Period & Qualification Impact
- **Decision ID**: `DEC-ARP-05`
- **Title**: Variable Program Termination Notice Period & Qualification Impact
- **Status**: AMENDED BY DEC-06 (2026-11-05)
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-04`, `DEC-06`
- **Scope**: Business Policy / Lifecycle Architecture
- **Amendment Note (2026-11-05)**: Formally amended and finalized by `DEC-06`. The notice period is specified strictly as an explicit DATETIME (`deadline_datetime`) in the `Africa/Algiers` timezone, evaluated against the appointment's qualified confirmation timestamp.
- **Context & Authority**:
  Replaces previous arbitrary fixed assumptions (e.g. 30 days) with a case-specific variable notice policy decided upon program termination.
- **Decision Rules**:
  1. **Prohibition of Fixed Defaults**: System architecture and code MUST NOT hardcode or enforce a fixed notice duration (such as 30 days).
  2. **Case-Specific Variable Notice**: The notice period is variable and determined on a case-by-case basis by the Platform Manager upon enacting program termination.
  3. **Eligibility Boundary**: The specified notice window enters directly into the appointment reward qualification criteria. Appointments confirmed within the documented notice window remain eligible; appointments confirmed post-notice window yield zero rewards.
  4. **Documented Traceability**: The specific notice period, effective start, and deadline must be documented and auditable for each termination event.
- **Open / Unresolved Points**: Resolved by `DEC-06`.

### DEC-ARP-06: Strict All-or-Nothing Payout Batch Execution & Ledger Atomicity
- **Decision ID**: `DEC-ARP-06`
- **Title**: Strict All-or-Nothing Payout Batch Execution & Ledger Atomicity
- **Status**: SUPERSEDED BY DEC-02 (2026-11-05)
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-07`, `DEC-ARP-08`, `DEC-ARP-09`, `DEC-02`
- **Scope**: Backend / Payouts Engine & Ledger
- **Superseded Note (2026-11-05)**: Formally SUPERSEDED by `DEC-02`. The All-or-Nothing whole-batch constraint has been explicitly cancelled by project owner directive. The platform mandates Full and Partial Payout support with independent Rejection and Deferral states per item.
- **Context & Authority**:
  Previously locked whole-batch execution model. Retained for historical record.
- **Decision Rules (Historical)**:
  1. **Strict Prohibition of Partial Payout**: Partial batch payout is strictly prohibited. Both monthly and exceptional batches are subject to the `All-or-Nothing` principle.
  2. **Preparation != Money Transfer**: Generating, reviewing, or staging a batch does NOT transfer funds or debit the assistant's ledger balance.
  3. **No Ledger Debit Prior to Transfer Confirmation**: No debit transaction (`payout_settlement`) shall be written to `assistant_reward_transactions` before the manager/authorized signatory confirms the full external money transfer.
  4. **Atomic Batch Settlement**: Confirmation of a payout batch must execute inside an atomic database transaction (`DB::transaction`) that transitions the batch and all constituent items simultaneously and commits corresponding ledger debits in a single round.
  5. **Elimination of Partial States**: The system must NOT maintain or permit `partially_paid` batch states, nor use accumulated fields (`transferred_amount_dzd`) to represent partial execution.
  6. **Irreversibility of Completed Transfers**: An executed, completed transfer batch cannot be cancelled retroactively.
  7. **Safe Batch Cancellation**: Cancelling an unexecuted batch atomically releases all held items back to the assistant's available balance with zero ledger penalties or fees.
  8. **Concurrency & Race Protection**: All confirmation and cancellation operations must use pessimistic row-level locking (`lockForUpdate`) and idempotency keys to prevent race conditions or duplicate execution.

### DEC-ARP-07: Exceptional Batch Preparation, Paper Review & Spending Ceiling Removal
- **Decision ID**: `DEC-ARP-07`
- **Title**: Exceptional Batch Preparation, Paper Review & Spending Ceiling Removal
- **Status**: AMENDED BY DEC-12 (2026-11-05)
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-06`, `DEC-ARP-08`, `DEC-12`
- **Scope**: Governance / Operational Workflows
- **Amendment Note (2026-11-05)**: Formally amended by `DEC-12`. Paper review and manager approval remain strictly an administrative procedure outside the software. Zero software workflows, image scanning, document uploads, or electronic signatures shall be introduced for paper review.
- **Context & Authority**:
  Clarifies the workflow for exceptional payout batches, eliminates arbitrary financial caps on document preparation, and establishes paper-based managerial review.
- **Decision Rules**:
  1. **Removal of Spending Ceiling on Preparation**: The previously proposed condition imposing a spending ceiling on preparing exceptional payout batches is formally CANCELLED.
  2. **Preparation Responsibility**: Authorized administrative assistants prepare the physical and digital payment documentation and recipient rosters without a preset monetary ceiling.
  3. **Mandatory Paper Review by Manager**: Staged exceptional payment dossiers must be presented on physical paper to the Platform Manager for review.
  4. **Managerial Discretion**: The Manager alone possesses the authority to:
     - Approve the batch for execution.
     - Request or execute adjustments to the dossier.
     - Reject the batch.
  5. **Preparation != Approval**: Preparing dossiers confers zero approval authority. The assistant preparing documents has no power to authorize or execute the payment.
- **Open / Unresolved Points**: Operational documentation standards for the paper review packet require final alignment prior to Phase 3 implementation.

### DEC-ARP-08: Delegated Transfer Confirmation Authority, Individual Delegation & Revocation
- **Decision ID**: `DEC-ARP-08`
- **Title**: Delegated Transfer Confirmation Authority, Individual Delegation & Revocation
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-06`, `DEC-ARP-07`
- **Scope**: 4D Authorization Layer / Security Architecture
- **Context & Authority**:
  Establishes individual, revocable delegation for payout transfer confirmation without artificial user limits, dual-signing mandates, or execution ceilings.
- **Decision Rules**:
  1. **Delegation Scope & Multiplicity**: The Manager may delegate one or multiple specific individuals to confirm payout transfers. There is NO fixed maximum limit of 2 persons.
  2. **Individual & Explicit Delegation**: Delegation is granted individually and explicitly to named user accounts. It is NOT granted wholesale to the `admin_assistant` role.
  3. **No Self-Delegation or Expansion**: Assistants have zero ability to delegate permissions to themselves or expand their own authority.
  4. **Immediate Revocation**: Delegation is revocable at will by the Platform Manager at any time with immediate effect.
  5. **Confirmer Audit Trail**: Every confirmation action MUST immutably record the specific user ID of the confirmer, their role, IP address, and the exact timestamp.
  6. **No Dual-Signing Mandate**: There is NO requirement for a dual signature or multi-party sign-off to execute a payout transfer.
  7. **No Execution Financial Ceiling**: There is NO financial ceiling or cap on the authorized confirmation of a full payout batch.
  8. **Strict Separation of Duties**: The permission to confirm payout transfers (`platform.confirm_assistant_payout`) is strictly segregated from batch preparation, batch cancellation, and payout profile management.
- **Supersedes / Amends**: Formally supersedes and cancels earlier proposals that suggested a strict 2-person limit, dual sign-off, or monetary caps on full transfers. Integrates with the 4D model (`Role ∩ Position ∩ Scope ∩ Delegated Permission`).

### DEC-ARP-09: Bounced Postal Transfer Incident Handling & Post-Settlement Integrity
- **Decision ID**: `DEC-ARP-09`
- **Title**: Bounced Postal Transfer Incident Handling & Post-Settlement Integrity
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-06`, `DEC-ARP-10`
- **Scope**: Financial Ledger / Operational Incidents
- **Context & Authority**:
  Establishes the accounting pattern for handling rejected or bounced postal transfers (Algérie Poste) post-batch settlement without compromising batch integrity.
- **Decision Rules**:
  1. **Original Batch Preservation**: When a postal transfer bounces or returns after batch confirmation has completed, the original batch and its settled line items MUST NOT be mutated or deleted.
  2. **Independent Financial Incident**: The bounced transfer must be registered as an independent, documented financial incident (`payout_bounce_incident`).
  3. **Compensating Ledger Entry**: A dedicated, documented compensating transaction (`payout_transfer_reversal`) is written to the assistant's ledger, crediting back the uncollected amount to their available balance.
  4. **Strict Documented Verification**: A mere verbal or casual notification does not justify a reversal; documented proof of the postal return (rejection receipt / official statement) must be attached and audited.
  5. **Traceability Links**: The incident record maintains strict foreign key links to the original payout batch, the specific batch item, and the affected assistant account.
- **System Impact**: Requires adding `payout_transfer_reversal` to `assistant_reward_transactions` and an incident tracking mechanism.

### DEC-ARP-10: Immutable Append-Only Ledger & Domain Ledger Boundary
- **Decision ID**: `DEC-ARP-10`
- **Title**: Immutable Append-Only Ledger & Domain Ledger Boundary
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-01`, `DEC-ARP-02`, `DEC-ARP-06`
- **Scope**: Financial Architecture & Data Integrity
- **Context & Authority**:
  Affirms the mathematical invariant and domain isolation of the assistant rewards ledger.
- **Decision Rules**:
  1. **Strict Append-Only Invariant**: Financial records in `assistant_reward_transactions` are immutable. No `UPDATE` or `DELETE` operations are permitted on historical entries.
  2. **Independent Corrective Transactions**: Any accounting discrepancy or dispute resolution must be executed via an independent, documented corrective ledger entry (`correction_credit` / `correction_debit` / `admin_adjustment`).
  3. **Full Audit Metadata**: Every ledger entry must store its immutable origin, reference type, reference ID, business reason, and creator user ID.
  4. **Domain Ledger Isolation**: The assistant rewards ledger is strictly segregated from Booking Center quota balances and platform commission accounts.
  5. **General Ledger Deferral**: Implementing a unified platform-wide General Ledger is explicitly DEFERRED to a future release.
- **System Impact**: Preserves `AssistantLedgerService` integrity while extending supported entry types for adjustments.

### DEC-ARP-11: Assistant & Booking Center Financial Objections Architecture
- **Decision ID**: `DEC-ARP-11`
- **Title**: Assistant & Booking Center Financial Objections Architecture
- **Status**: LOCKED / APPROVED
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-10`, `DEC-ARP-12`
- **Scope**: Objections & Dispute Resolution
- **Context & Authority**:
  Establishes structured financial objection handling for both doctor assistants and booking centers.
- **Decision Rules**:
  1. **Assistant Objections Scope**: Doctor assistants may lodge structured objections regarding:
     - Missing reward.
     - Erroneous cancellation deduction.
     - Disputed ledger balance.
     - Departure settlement.
     - Payout batch exclusion.
  2. **Booking Center Objections Scope**: Booking Centers may lodge structured objections regarding:
     - Quota balance.
     - Allocation shares.
     - Quota deductions.
     - Transactions.
     - Account settlements.
  3. **No Automatic State Change**: Submitting an objection does NOT alter ledger balances or automatically halt system operations.
  4. **Independent Corrective Entry on Acceptance**: If an objection is upheld, financial adjustment is executed via an independent, documented ledger transaction referencing the objection ID.
  5. **Evidence & Reason Logging**: Every objection must log submission evidence, investigation notes, resolution reasons, and status transitions.
  6. **Tiered Investigation Authority**: An administrative assistant may review and investigate objections if specifically delegated, but the FINAL decision on financial and formal objections is reserved EXCLUSIVELY for the Platform Manager.
  7. **No Arbitrary Deadlines**: The system does NOT enforce arbitrary filing or resolution windows (such as 15 days or 7 business days).
- **System Impact**: Requires a dedicated objections entity `financial_objections` and manager adjudication workflow.

### DEC-ARP-12: Unified Correspondence, Inquiries & Grievances Workflow Pipeline
- **Decision ID**: `DEC-ARP-12`
- **Title**: Unified Correspondence, Inquiries & Grievances Workflow Pipeline
- **Status**: AMENDED BY DEC-11 (2026-11-05)
- **Date**: 2026-11-05
- **Related Decisions**: `DEC-ARP-11`, `DEC-11`
- **Scope**: Platform Operations & Communication
- **Amendment Note (2026-11-05)**: Formally amended and finalized by `DEC-11`. The Assistant Manager receives and classifies submissions; the sender does not choose the final classification.
- **Context & Authority**:
  Provides a comprehensive communication and grievance pipeline extending beyond standalone financial objection forms.
- **Decision Rules**:
  1. **Unified Pipeline Scope**: The system provides a single, structured operational channel for handling:
     - General messages.
     - Inquiries.
     - Operational concerns.
     - Grievances.
     - Formal administrative objections.
     - Financial objections.
  2. **Standard Routing Workflow**:
     - Submissions arrive initially at the Administrative Assistant inbox.
     - The assistant may resolve non-financial inquiries within their delegated authority or forward them to the Manager.
     - The Manager reviews submissions directly or refers them to designated assistants for inquiry.
     - The assigned assistant may resolve and formulate replies for routine matters within their explicit delegated scope.
     - All financial decisions and final formal administrative rulings remain exclusively reserved for the Platform Manager.
  3. **Segregation of Responsibilities**: Strict separation is maintained between:
     - Studying the case / objection.
     - Formulating recommendations.
     - Issuing the authoritative decision.
     - Executing resulting financial ledger entries.
  4. **Referral & Decision Audit Trail**: Every routing event, assignment, status update, resolution note, and decision actor must be logged immutably.
- **Open / Unresolved Points**: Resolved by `DEC-11`.

---

## Final Consolidated Assistant Rewards & Governance Decisions (DEC-01 to DEC-12 Series — 2026-11-05)

### DEC-01: Actual Reward Deduction on Appointment Cancellation
- **Decision ID**: `DEC-01`
- **Title**: Actual Reward Deduction on Appointment Cancellation
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-01`, `DEC-ARP-10`, `DEC-09`
- **Scope**: Financial Ledger / Cancellation & Reversals Engine
- **Context & Authority**:
  Lockdown of cancellation deduction policy. Prevents ledger corruption and ensures exact symmetry between earned rewards and cancellation debits.
- **Decision Rules**:
  1. **Actual Amount Deduction**: When an earned reward is subject to cancellation deduction under the approved cancellation policy, the system MUST deduct the actual monetary reward value recorded on the specific appointment record (`$reward->amount`).
  2. **Prohibition of Fixed Rates**: The use of a fixed hardcoded amount (such as 10.00 DZD) in cancellation deductions or platform operational losses is strictly prohibited.
  3. **Immunity to Future Rate Changes**: The deduction amount for a cancelled appointment is permanently pinned to its historical earned rate and MUST NOT vary or fluctuate if the active reward rate is subsequently modified.
  4. **Appointment History Preservation**: The appointment and reward records MUST permanently retain the original earned reward value that the assistant qualified for.
  5. **Independent Ledger Entry**: The cancellation deduction MUST be posted as an independent, immutable financial transaction (`cancellation_deduction` debit) preserving the complete historical ledger audit trail.
- **System Impact**: Remediates `AssistantRewardReversalService.php:92` and line 58.

### DEC-02: Full and Partial Payouts: Rejection, Deferral & Item-wise Tracking
- **Decision ID**: `DEC-02`
- **Title**: Full and Partial Payouts: Rejection, Deferral & Item-wise Tracking
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-06` (SUPERSEDED), `DEC-07`, `DEC-08`, `DEC-09`
- **Scope**: Backend / Payouts Engine & Batch Settlement
- **Context & Authority**:
  Authoritative reversal and replacement of earlier All-or-Nothing constraints. Mandates comprehensive support for full and partial batch payouts with distinct, independent item-level states.
- **Decision Rules**:
  1. **Cancellation of All-or-Nothing**: The previous strict All-or-Nothing whole-batch execution rule (`DEC-ARP-06`) is formally CANCELLED. The platform officially supports both Full and Partial Payouts.
  2. **Item-Level Rejection (`rejected` / `frozen`) [FINAL APPROVED - DECISION C]**:
     - Specific line items within a payout batch may be explicitly rejected and denied payment (e.g. invalid credentials, unverified profile, compliance violation).
     - Rejected items enter an explicit `frozen` state.
     - A frozen rejected item MUST NOT be included in subsequent payout batches until the relevant administrative review or formal objection process (`DEC-10`) has resolved its status.
     - Rejected items MUST NOT be automatically voided or permanently cancelled upon rejection.
     - The system MUST record and preserve the specific rejection reason, the authenticated responsible deciding authority (`rejected_by_id`), the exact rejection timestamp (`rejected_at`), and the complete audit history.
  3. **Item-Level Deferral (`deferred`) [FINAL APPROVED - DECISION B]**:
     - The system permits paying a subset of batch entitlements while deferring another subset (e.g. liquidity staging, temporary verification holds).
     - Deferred items return directly to the assistant's general available balance and become eligible for inclusion in the next monthly payout batch, subject to the applicable payout rules and thresholds at that future time.
     - The system MUST NOT create a separate supplementary batch for deferred items.
     - The system MUST strictly enforce controls ensuring the original deferred item cannot be paid twice.
  4. **General Financial & Concurrency Controls**:
     - Every batch line item MUST be tracked through an independent lifecycle state (`pending`, `paid`, `rejected` / `frozen`, `deferred`, `cancelled`).
     - Batch-level financial totals must reconcile with mathematical exactness across paid, rejected, and deferred amounts (`total_amount = paid_amount + rejected_amount + deferred_amount`).
     - State transitions must use pessimistic row-level locking (`lockForUpdate`) and idempotency keys to eliminate race conditions and concurrent double-executions.
     - Every state change on any line item MUST generate an immutable security audit log entry.
     - The system MUST NOT rely on a generic `partially_paid` batch status without an explicit, verifiable definition mapped to underlying line item states.
     - Historical ledger entries MUST NEVER be edited or deleted to mask payout executions, deferrals, or rejections.
- **System Impact**: Supersedes `DEC-ARP-06`. Retains item-level confirmation in `AssistantPayoutService.php` while adding formal `deferred` (returning to available balance) and `rejected` (`frozen` hold) tracking, explicit audit fields, and batch reconciliation aggregates.

### DEC-03: Manager-Scheduled Dynamic Reward Rate
- **Decision ID**: `DEC-03`
- **Title**: Manager-Scheduled Dynamic Reward Rate
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-02`, `DEC-01`, `DEC-09`
- **Scope**: Financial Configuration & Qualification Engine
- **Context & Authority**:
  Establishes manager authority over dynamic reward rates with prospective validity scheduling.
- **Decision Rules**:
  1. **Manager Exclusive Authority**: The Platform Manager alone possesses the authority to create, update, or schedule reward rate modifications.
  2. **Scheduled Effective Datetime**: The manager defines the exact effective date and time (`effective_from`) for the activation of a new rate.
  3. **Confirmation-Moment Evaluation**: The system resolves the applicable reward rate strictly based on the qualified confirmation timestamp of the appointment, according to the schedule active at that exact moment.
  4. **Strict Non-Retroactivity**: Past earned rewards and historical ledger transactions MUST NOT be recalculated or mutated upon rate change.
  5. **Conflict Prevention**: The system must enforce validation preventing overlapping or conflicting rate schedules with ambiguous effective intervals.
  6. **Historical Audit Preservation**: An immutable record of all past rates, scheduling decisions, effective windows, and authoring users must be maintained.
  7. **No Automatic Notification**: No automated notification is broadcast to assistants upon scheduling or enacting a reward rate change, unless established by a separate policy.
- **System Impact**: Implemented via `reward_rate_schedules` table and dynamic resolution in `AssistantRewardQualificationService.php`.

### DEC-04: Manager-Scheduled Dynamic Payout Threshold
- **Decision ID**: `DEC-04`
- **Title**: Manager-Scheduled Dynamic Payout Threshold
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-03`, `DEC-02`, `DEC-09`
- **Scope**: Backend / Payouts Engine & Balance Verification
- **Context & Authority**:
  Decouples the payout eligibility threshold from hardcoded code values, giving the manager forward scheduling control while preserving in-progress batch threshold context.
- **Decision Rules**:
  1. **Non-Hardcoded Threshold**: The current baseline threshold of 10,000.00 DZD is an operational setting and is NOT a permanent hardcoded code constant.
  2. **Manager Scheduling Authority**: The Platform Manager alone holds the power to modify and schedule the payout threshold with a specific effective date and time.
  3. **Application to Available Balances**: Upon reaching the scheduled effective datetime, the new threshold applies forward to all currently available, unbatched ledger balances.
  4. **Ledger Preservation**: Existing ledger entries and past payout batch records remain completely unaffected and unwritten.
  5. **Existing In-Progress Batch Invariant [FINAL APPROVED - DECISION A]**:
     - A payout batch retains the payout threshold applicable at the exact moment the batch was created.
     - A subsequent change to the global payout threshold MUST NOT retroactively change the eligibility conditions or roster of an already-created pending or processing batch.
     - The historical threshold context MUST be permanently preserved for each batch record (`applied_threshold_dzd`).
     - This rule is definitively locked as Option A; no open questions or ambiguities remain.
  6. **Net Payout Threshold Basis (`Pnet`) [FINAL APPROVED - 2026-11-05]**:
     - The payout threshold MUST be evaluated exclusively against the net cash payout after debt setoff (`Pnet`), never against gross earned rewards (`G`).
     - Mathematical formulation: `Pnet = G - D_applied`.
     - If `Pnet` is below the applicable threshold, the system MUST NOT execute the cash payout in that cycle.
     - The system MUST NOT cancel, delete, forfeit, or freeze earned rewards merely because `Pnet` is below the threshold.
     - All unpaid earned rewards MUST be preserved in the append-only accounting records and carried forward under the approved accounting rules.
     - Every payout batch MUST persist `applied_threshold_dzd` as the threshold effective when that batch was created.
     - Automated test suites MUST include tests proving that threshold evaluation uses `Pnet`, including edge cases where `G` exceeds the threshold but `Pnet` does not.
- **System Impact**: Implemented via `payout_threshold_schedules` table and dynamic lookup in `AssistantPayoutService.php` with `applied_threshold_dzd` captured on `assistant_payout_batches`, with batch item eligibility evaluated strictly on `Pnet >= applied_threshold_dzd`.

### DEC-05: Authoritative Program Lifecycle (Active / Suspended / Terminated)
- **Decision ID**: `DEC-05`
- **Title**: Authoritative Program Lifecycle (Active / Suspended / Terminated)
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-04`, `DEC-06`
- **Scope**: System-wide Lifecycle Governance
- **Context & Authority**:
  Establishes authoritative operational states for the Assistant Rewards Program.
- **Decision Rules**:
  1. **Program States**: The program operates strictly under three authoritative lifecycle states: `Active`, `Suspended`, and `Terminated`.
  2. **Manager Exclusive Authority**: The Platform Manager alone possesses the authority to transition the program between states.
  3. **Suspension Impact**: Suspension immediately halts the creation of new reward entitlements for appointments confirmed during the suspension period. Pre-existing earned entitlements remain fully protected and preserved.
  4. **Confirmation-Moment State Check**: The server MUST verify the authoritative lifecycle state at the exact moment an appointment's attendance is confirmed.
  5. **Irreversibility of Termination**: Program termination is an administrative final decision executed pursuant to notice and final balance settlement. Re-activating a terminated program without a formal corporate resolution and published policy is strictly prohibited.
- **System Impact**: Implemented via `program_lifecycle_events` and enforced in `AssistantRewardQualificationService.php`.

### DEC-06: Program Termination Notice Deadline Datetime & Eligibility Boundary
- **Decision ID**: `DEC-06`
- **Title**: Program Termination Notice Deadline Datetime & Eligibility Boundary
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-05` (AMENDED), `DEC-05`
- **Scope**: Business Policy / Lifecycle Architecture
- **Context & Authority**:
  Defines the exact technical mechanics of program termination notices and eliminates temporal ambiguities.
- **Decision Rules**:
  1. **Explicit Datetime Specification**: The termination notice deadline MUST be entered and stored as an explicit, authoritative DATETIME (`notice_deadline_at`), NOT as an arbitrary number of days.
  2. **Audit Timestamps**: The platform MUST record both the exact announcement datetime (`announced_at`) and the final deadline datetime (`notice_deadline_at`).
  3. **Confirmation-Time Eligibility**: Appointment qualification during the notice window depends strictly on the **appointment confirmation datetime**, NOT the booking creation datetime.
  4. **Timezone Rigor**: All termination boundary checks must be evaluated strictly within the authoritative platform timezone (`Africa/Algiers`).
  5. **No Automatic Pre-Announcement Eligibility**: An appointment booked prior to the termination announcement does NOT automatically qualify; it qualifies if and only if its attendance is confirmed prior to the exact deadline timestamp.
- **System Impact**: Enforced in `AssistantProgramLifecycleService` and `AssistantRewardQualificationService`.

### DEC-07: Delegated Transfer Confirmation Authority & Execution-Time Check
- **Decision ID**: `DEC-07`
- **Title**: Delegated Transfer Confirmation Authority & Execution-Time Check
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-08`, `DEC-02`
- **Scope**: 4D Authorization Layer / Security Architecture
- **Context & Authority**:
  Defines individual delegation for payout confirmation with execution-time verification and zero role-wide privilege leak.
- **Decision Rules**:
  1. **Original Authority**: The Platform Manager is the sole original authority for payout transfer confirmations.
  2. **Named Individual Delegation**: The Manager may delegate one or more specific individuals by name/user account to confirm transfers. There is NO fixed maximum limit on the number of delegates.
  3. **Individual, Explicit & Revocable**: Delegation is granted individually, explicitly, and is revocable by the Manager at any time with immediate effect.
  4. **Mandatory Audit Trail**: The system MUST immutably record:
     - Delegator Manager user ID (`delegated_by_id`).
     - Delegatee user ID (`user_id`).
     - Specific delegated permission (`platform.confirm_assistant_payout`).
     - Grant datetime (`valid_from`).
     - Revocation datetime (`valid_until` / `revoked_at`).
     - Revoking user ID (`revoked_by_id`).
  5. **No Role-Wide Inheritance**: Users holding the `admin_assistant` role DO NOT receive this authority automatically.
  6. **Prohibition of Self-Delegation**: Self-delegation or unauthorized privilege escalation is strictly blocked.
  7. **Segregation of Duties**: Payout confirmation authority is strictly segregated from batch preparation, batch modification, and batch cancellation.
  8. **No Dual-Signature & No Ceiling**: There is NO requirement for a dual signature, and NO financial ceiling is imposed on the confirmation of payouts.
  9. **Execution-Time Verification**: Active delegation MUST be verified dynamically at the exact moment of execution against the live database, rather than relying on stale cached session claims.
- **System Impact**: Implemented via `payout_signatories_registry` table and 4D evaluation in `Has4DAuthorization.php` and `AssistantPayoutService.php`.

### DEC-08: Post-Settlement Bounced Postal Transfers & Independent Financial Incidents
- **Decision ID**: `DEC-08`
- **Title**: Post-Settlement Bounced Postal Transfers & Independent Financial Incidents
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-09`, `DEC-02`, `DEC-09`
- **Scope**: Financial Ledger / Incident Management
- **Context & Authority**:
  Establishes post-settlement incident handling for returned Algérie Poste transfers without compromising historical batch integrity.
- **Decision Rules**:
  1. **Batch Preservation Invariant**: A postal transfer returned after payout completion MUST NOT cause the original batch to be reopened, edited, or have its historical records modified.
  2. **Independent Financial Incident**: The bounce must be registered as an independent, documented financial incident (`payout_bounce_incident`) linked to the original batch and affected item.
  3. **Verification Prior to Financial Action**: Mere verbal or unconfirmed reports of a bounce DO NOT alter balances; documented verification of the postal return is strictly required.
  4. **Full & Partial Bounce Support**: The system must support both full and partial transfer returns if supported by the payment rail.
  5. **Compensating Ledger Transaction**: Upon verified confirmation of the bounce, an independent compensating transaction (`payout_transfer_reversal`) is created on the assistant's ledger, crediting the actual returned amount back to their available balance.
  6. **Audit Details**: The incident record must capture the returned amount, currency, return reason, confirmation date, verifying user, and original batch reference.
  7. **Deduplication**: Concurrency controls and unique constraints must prevent duplicate processing or duplicate credit entries for the same bounce event.
  8. **Structured Resolution Workflow**: The incident operates under an explicit lifecycle (`reported`, `verified`, `settled`, `dismissed`) with full audit traceability.
- **System Impact**: Implemented via `payout_bounce_incidents` table and new transaction type `payout_transfer_reversal` in `AssistantLedgerService.php`.

### DEC-09: Immutable Append-Only Ledger & Domain Isolation
- **Decision ID**: `DEC-09`
- **Title**: Immutable Append-Only Ledger & Domain Isolation
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-10`, `DEC-01`, `DEC-08`
- **Scope**: Financial Architecture & Data Integrity
- **Context & Authority**:
  Affirms the mathematical invariant and domain isolation of the assistant rewards ledger.
- **Decision Rules**:
  1. **Append-Only Invariant**: Financial records in `assistant_reward_transactions` are strictly immutable. No `UPDATE` or `DELETE` operations are permitted on historical ledger entries.
  2. **Independent Corrective Transactions**: All corrections must be executed via independent, documented compensating entries (`correction_credit`, `correction_debit`, `admin_adjustment`, `payout_transfer_reversal`).
  3. **Domain Ledger Isolation**: The assistant rewards ledger operates strictly within its designated domain and is completely segregated from Booking Center quota balances and platform commission accounts.
  4. **General Ledger Deferral**: Implementing a unified platform-wide General Ledger is explicitly DEFERRED to a future release.
- **System Impact**: Preserves `AssistantLedgerService` integrity while extending supported entry types.

### DEC-10: Extensible Financial Objections for Assistants & Booking Centers
- **Decision ID**: `DEC-10`
- **Title**: Extensible Financial Objections for Assistants & Booking Centers
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-11`, `DEC-09`, `DEC-11`
- **Scope**: Objections & Dispute Resolution Subsystem
- **Context & Authority**:
  Establishes an extensible financial objections architecture for both doctor assistants and booking centers.
- **Decision Rules**:
  1. **Assistant Objections Scope**: Doctor assistants may lodge objections concerning missing rewards, incorrect deductions, disputed balances, departure settlements, or payout batches.
  2. **Booking Center Objections Scope**: Booking Centers may lodge objections concerning quota balances, package allocations, quota deductions, transactions, or account settlements.
  3. **Non-Disruptive Submission**: Filing an objection does NOT alter ledger balances or automatically halt platform operations.
  4. **Complete Audit Record**: The system MUST capture claimant identity, subject, detailed reasons, attached evidence, status, assigned reviewer, and official resolution.
  5. **Delegated Investigation**: Administrative assistants may investigate and review objections within their delegated scope.
  6. **Manager Sole Financial Decision**: The FINAL decision on any financial or formal objection is reserved EXCLUSIVELY for the Platform Manager.
  7. **Compensating Entry on Upholding**: Upholding a financial objection triggers an independent compensating ledger entry (`admin_adjustment`) with full cross-referencing.
  8. **No Mandatory Deadlines**: The platform imposes zero arbitrary filing or resolution deadlines.
  9. **Extensibility**: The subsystem architecture must accommodate new objection categories, statuses, or business rules without requiring core redesign.
- **System Impact**: Implemented via `financial_objections` table, `FinancialObjectionService`, and Manager adjudication endpoints.

### DEC-11: Unified Correspondence, Inquiry & Grievance Pipeline
- **Decision ID**: `DEC-11`
- **Title**: Unified Correspondence, Inquiry & Grievance Pipeline
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-12` (AMENDED), `DEC-10`
- **Scope**: Platform Operations & Unified Correspondence
- **Context & Authority**:
  Establishes a unified communication and grievance management pipeline.
- **Decision Rules**:
  1. **Unified Pipeline Scope**: Users may submit general messages, inquiries, operational concerns, grievances, formal administrative objections, or financial objections through a unified channel.
  2. **Intake & Classification by Assistant Manager**: Incoming messages are received initially by the Assistant Manager, who performs intake and assigns the official classification. The sender does NOT choose the final classification.
  3. **Delegated Resolution & Escalation**:
     - The Assistant Manager may resolve non-financial routine inquiries within their delegated authority and reply authoritatively.
     - The Assistant Manager may escalate or refer complex matters to the Platform Manager.
  4. **Manager Referral**: The Manager may review submissions directly or refer them to a designated assistant for investigation.
  5. **Assigned Assistant Reply**: An assigned assistant may investigate and formulate final replies for routine matters within their explicit delegated scope.
  6. **Manager Exclusive Financial Authority**: All financial questions, formal grievances, and final financial rulings remain exclusively reserved for the Platform Manager.
  7. **Comprehensive Audit Trail**: The platform MUST log receipt, classification, referral, investigation, replies, actor IDs, and timestamps at each step.
  8. **Referral != Final Authority**: Referring a message to an assistant confers investigation and communication authority only; it does NOT grant final decision-making power over financial matters.
- **System Impact**: Implemented via `correspondence_messages` and `correspondence_routing_logs` tables and services.

### DEC-12: Payout Paper Review is an External Administrative Procedure
- **Decision ID**: `DEC-12`
- **Title**: Payout Paper Review is an External Administrative Procedure
- **Status**: LOCKED / FINAL APPROVED (2026-11-05)
- **Related Decisions**: `DEC-ARP-07` (AMENDED), `DEC-02`, `DEC-07`
- **Scope**: Governance / Operational Workflows
- **Context & Authority**:
  Clarifies system boundaries regarding administrative paper reviews and prevents unnecessary software overhead.
- **Decision Rules**:
  1. **External Administrative Procedure**: Reviewing physical payout documents, printed dossiers, and managerial approval remains an administrative procedure strictly OUTSIDE the software system.
  2. **Zero Software Workflow**: The platform will NOT implement software workflows, document scanning, image uploading, or electronic signatures for paper reviews in this phase.
  3. **Authoritative Execution Logging**: The system's responsibility is confined to verifying individual delegation and recording the final transfer confirmation results according to authorized permissions and immutable audit logs.
- **System Impact**: Keeps batch controllers and services streamlined; eliminates requirements for file upload or e-signature mechanisms for paper review.

### DEC-PWR-01: Full 10-Role Scope & Centralized Account Recovery
- **Decision ID**: `DEC-PWR-01`
- **Title**: Full 10-Role Scope & Centralized Account Recovery
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DISC-03`, `DISC-06`
- **Scope**: Platform Authentication & Identity Architecture
- **Context & Authority**:
  Establishes complete role eligibility and centralized identity resolution for password recovery.
- **Decision Rules**:
  1. **Universal Role Eligibility**: Password recovery MUST support all ten account categories across the platform:
     - (1) Patient (`patient_registered`, `patient_guest`)
     - (2) Doctor (`doctor`)
     - (3) Doctor Assistant (`doctor_assistant`)
     - (4) Booking Center (`booking_center`)
     - (5) Laboratory Manager (`lab`)
     - (6) Laboratory Assistant (`lab_assistant`)
     - (7) Radiology Manager (`radiology`)
     - (8) Radiology Assistant (`rad_assistant`)
     - (9) Platform Administrator (`admin`)
     - (10) Admin Assistant (`admin_assistant`)
  2. **Centralized Identity Core**: Recovery operates strictly through AAFIYA's centralized user system (`users` table). Creating divergent, role-specific recovery pipelines or fragmented database schemas is prohibited.
- **System Impact**: Unified API endpoints serve all ten roles via the core `User` model.

### DEC-PWR-02: Email-Only Recovery Channel & Unverified Email Eligibility
- **Decision ID**: `DEC-PWR-02`
- **Title**: Email-Only Recovery Channel & Unverified Email Eligibility
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-GAP-04`, `DEC-PWR-11`
- **Scope**: Communication & Security Transport
- **Context & Authority**:
  Locks the transmission medium for recovery links to prevent phone channel fraud and channel sprawl.
- **Decision Rules**:
  1. **Sole Communication Medium**: The registered account email address is the EXCLUSIVE recovery channel for AAFIYA V1.
  2. **Zero Secondary Transports**: SMS recovery, WhatsApp recovery, and alternative delivery mechanisms are strictly PROHIBITED in this phase.
  3. **Unverified Email Eligibility**: An account is fully eligible for recovery even if its email address has not been previously verified (`email_verified_at IS NULL`). Verification enforcement is deferred to avoid user friction at launch.
  4. **Strict Recipient Binding**: The recovery link MUST be dispatched exclusively to the email address recorded in the database for that account.
- **System Impact**: Simplifies delivery pipeline to transactional SMTP; removes SMS provider dependency for auth recovery.

### DEC-PWR-03: Strict Uniform Response & Account Enumeration Prevention
- **Decision ID**: `DEC-PWR-03`
- **Title**: Strict Uniform Response & Account Enumeration Prevention
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-05`
- **Scope**: Information Disclosure & Privacy Defense
- **Context & Authority**:
  Protects healthcare professionals and patients from malicious reconnaissance and account existence discovery.
- **Decision Rules**:
  1. **Canonical Public Message**: Regardless of whether the submitted email matches an active account, inactive account, or does not exist, the API response body and UI presentation MUST return the identical localized response:
     - Arabic: «إذا كان هذا البريد مرتبطاً بحساب، فستصلك رسالة استعادة كلمة المرور»
     - French: « Si cette adresse e-mail est associée à un compte, un message de récupération vous sera envoyé. »
     - English: "If this email address is associated with an account, a password recovery message will be sent."
  2. **Zero Distinguishing Oracles**: The system MUST NOT reveal account existence through:
     - HTTP status codes (always 200 OK for valid request format).
     - Response JSON payload structure.
     - Observable network or database timing variations (constant-time evaluation simulation).
     - Differential client-side routing or UI states.
     - Specific validation error messages.
- **System Impact**: Guarantees zero account enumeration vectors across all public endpoints.

### DEC-PWR-04: Single Active Recovery Link & Automatic Invalidation on Re-issuance
- **Decision ID**: `DEC-PWR-04`
- **Title**: Single Active Recovery Link & Automatic Invalidation on Re-issuance
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-08`
- **Scope**: Token Storage & Lifecycle Integrity
- **Context & Authority**:
  Supersedes previous multi-link exploratory proposals and affirms a strict single active link policy.
- **Decision Rules**:
  1. **Single Active Token Invariant**: Exactly ONE active recovery link may exist per account at any moment.
  2. **Immediate Prior Invalidation**: Requesting a new recovery link immediately and unconditionally revokes and deletes any previously issued token for that account.
  3. **Strict 60-Minute Lifespan**: Recovery links expire exactly 60 minutes after generation. Expired links are rejected fail-closed.
  4. **Single-Use Atomic Consumption**: A recovery link can be used exactly once. Successful password reset immediately consumes and deletes the link.
  5. **Total Invalidation on Reset**: After a successful reset, all outstanding tokens for the account are completely invalidated.
  6. **Concurrency & Replay Defense**: Replaying a consumed, cancelled, or expired link is strictly rejected. Atomic database operations prevent race conditions.
  7. **Cryptographic Hashing**: Raw reset tokens are NEVER stored in plaintext in the database; storage uses standard cryptographic hashing.
- **System Impact**: Aligns with Laravel's `DatabaseTokenRepository` core model, reinforced with atomic consumption locks.

### DEC-PWR-05: Tiered Rate Limiting & Google reCAPTCHA Enforcement
- **Decision ID**: `DEC-PWR-05`
- **Title**: Tiered Rate Limiting & Google reCAPTCHA Enforcement
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-03`
- **Scope**: Anti-Abuse & Bot Mitigation Architecture
- **Context & Authority**:
  Establishes progressive anti-automation defense balancing user convenience and platform security.
- **Decision Rules**:
  1. **Tier 1 (Attempts 1, 2, 3)**: Unrestricted by CAPTCHA; standard submission permitted.
  2. **Tier 2 (Attempts 4 & 5)**: Google reCAPTCHA verification is MANDATORY. The backend must independently verify the CAPTCHA response token against Google's verification API.
  3. **Tier 2 Failure Rule**: If the user fails CAPTCHA on Attempt 4, the 30-minute lockout is NOT triggered yet; Attempt 5 remains available subject to valid CAPTCHA.
  4. **Tier 3 (Lockout Trigger)**: Failing the CAPTCHA on Attempt 5 immediately enforces a 30-minute lockout on recovery requests for that email key.
  5. **Cycle Reset**: Following the expiration of the 30-minute lockout, the attempt counter resets completely to zero.
  6. **Server-Side Authority**: Counters, tiers, and lockouts MUST be managed exclusively by the backend (Redis/Database cache); client-side state cannot bypass or reset counters.
  7. **Instance Consistency**: Counter state must remain coherent across multi-instance server deployments. Device switching, cookie clearance, or page reloads must NOT circumvent the lockout.
- **System Impact**: Requires server-side verification service and rate-limit state machine in `AuthService`.

### DEC-PWR-06: Universal Web Reset Landing Architecture
- **Decision ID**: `DEC-PWR-06`
- **Title**: Universal Web Reset Landing Architecture
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DISC-06`, `DEC-PWR-01`
- **Scope**: Client Experience & Mobile/Web Integration
- **Context & Authority**:
  Streamlines reset form presentation and avoids fragile mobile app URL deep-linking schemes in V1.
- **Decision Rules**:
  1. **Web Landing Destination**: The URL dispatched in the recovery email opens the dedicated reset password page on the AAFIYA web application (`https://aafiya.site/...`).
  2. **Unified Route for All Clients**: The same web destination handles password resets initiated from Web, Patient Flutter, and Pro Flutter clients.
  3. **Deep Links Excluded in V1**: Mobile app deep linking (`aafiya://` or App Links / Universal Links) is explicitly DEFERRED.
  4. **Full Responsive & Trilingual Support**: The web reset landing page must be fully responsive on mobile viewports and support Arabic (RTL), French (LTR), and English (LTR).
- **System Impact**: Implemented via Next.js route `/[locale]/reset-password`; zero deep-link configuration required in Flutter shells.

### DEC-PWR-07: Manual Re-Authentication Post-Reset
- **Decision ID**: `DEC-PWR-07`
- **Title**: Manual Re-Authentication Post-Reset
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-08`
- **Scope**: Authentication State & Credential Hygiene
- **Context & Authority**:
  Eliminates automatic credential assumption following recovery to ensure explicit user authentication.
- **Decision Rules**:
  1. **Zero Auto-Login**: Successfully resetting a password MUST NOT generate an automatic authenticated session or issue a new access token.
  2. **Explicit User Login**: The interface displays a clear success confirmation and redirects the user to the standard login interface to log in manually using the new password.
- **System Impact**: Ensures unambiguous separation between the public recovery workflow and authenticated sessions.

### DEC-PWR-08: Total Multi-Device Session Invalidation Post-Reset
- **Decision ID**: `DEC-PWR-08`
- **Title**: Total Multi-Device Session Invalidation Post-Reset
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-07`
- **Scope**: Session Security & Compromise Remediation
- **Context & Authority**:
  Guarantees that a password reset evicts all potential account hijackers and stale devices across all platforms.
- **Decision Rules**:
  1. **Total Invalidation Scope**: Upon successful password reset, ALL existing user sessions on all devices MUST be immediately invalidated, INCLUDING any session on the current device.
  2. **Sanctum Personal Access Tokens**: All issued personal access tokens for the user in `personal_access_tokens` are deleted:
     `$user->tokens()->delete();`
  3. **Database Sessions**: All active web session rows in the `sessions` table are deleted:
     `DB::table('sessions')->where('user_id', $user->id)->delete();`
  4. **Remember Me Tokens**: The user's `remember_token` is cycled to a new cryptographically random string:
     `$user->setRememberToken(Str::random(60));`
  5. **Client Eviction**: Any subsequent API request using an old token or session is rejected with HTTP 401 Unauthorized.
- **System Impact**: Comprehensive security hygiene executing within the atomic reset transaction.

### DEC-PWR-09: Post-Reset Security Alert Notification Email
- **Decision ID**: `DEC-PWR-09`
- **Title**: Post-Reset Security Alert Notification Email
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-02`
- **Scope**: Audit Transparency & User Alerting
- **Context & Authority**:
  Alerts account holders immediately if their password was changed maliciously or unexpectedly.
- **Decision Rules**:
  1. **Automated Dispatch**: Immediately following a successful password reset, the platform queues a security notification email to the account's registered address.
  2. **Zero Sensitive Data**: The security email MUST NOT contain the new password, the reset token, or any usable authentication links.
  3. **Actionable Context**: The notification confirms that the password was changed, provides the timestamp, and advises contacting support immediately if the user did not authorize the change.
  4. **Queued Execution**: Dispatch occurs asynchronously via Laravel's queue worker to prevent SMTP latency from stalling the client HTTP response.
- **System Impact**: Implemented via `App\Mail\PasswordChangedSecurityAlertMail` queued Mailable.

### DEC-PWR-10: Authoritative Baseline Password Policy Compliance
- **Decision ID**: `DEC-PWR-10`
- **Title**: Authoritative Baseline Password Policy Compliance
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DISC-06`
- **Scope**: Password Validation Integrity
- **Context & Authority**:
  Preserves existing platform validation rules without uncoordinated policy drift.
- **Decision Rules**:
  1. **Policy Preservation**: Password recovery MUST enforce the exact password validation rules currently established across AAFIYA:
     - Minimum length: 8 characters (`string`, `min:8`).
     - Required confirmation: must match confirmation field (`confirmed`).
  2. **Zero Arbitrary Drift**: No additional arbitrary regex complexity rules (e.g. forced symbols/uppercase) shall be added, nor shall existing rules be weakened, without explicit separate owner authorization.
- **System Impact**: Validated via `ResetPasswordRequest` mirroring `RegisterRequest` and `ChangePasswordRequest`.

### DEC-PWR-11: Registered Email Immutability During Password Recovery
- **Decision ID**: `DEC-PWR-11`
- **Title**: Registered Email Immutability During Password Recovery
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-02`, `DEC-PWR-04`
- **Scope**: Identity Binding & Account Takeover Defense
- **Context & Authority**:
  Prevents account takeover vectors where an attacker attempts to redirect recovery tokens to an arbitrary email.
- **Decision Rules**:
  1. **Strict Immutability**: The recovery workflow CANNOT be used to alter, update, or substitute the account's registered email address.
  2. **Token-to-Email Binding**: Reset tokens are cryptographically and relationally bound to the single email address stored in `users.email`.
- **System Impact**: Rejects any attempt to pass modified email payloads during token verification or password reset.

### DEC-PWR-12: Google reCAPTCHA v2 Checkbox Implementation & Server Verification
- **Decision ID**: `DEC-PWR-12`
- **Title**: Google reCAPTCHA v2 Checkbox Implementation & Server Verification
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-05`
- **Scope**: Security / Anti-Abuse Architecture
- **Context & Authority**:
  Locks Google reCAPTCHA v2 Checkbox ("I'm not a robot") as the authoritative anti-bot verification challenge for password recovery.
- **Decision Rules**:
  1. **Standard Mechanism**: Adoption of Google reCAPTCHA v2 Checkbox ("I'm not a robot") challenge.
  2. **Tiered Visibility**: The reCAPTCHA widget is presented to the user strictly upon Attempt 4 and Attempt 5.
  3. **Initial Tier Freedom**: The initial three attempts (Attempts 1, 2, 3) are completely free of CAPTCHA.
  4. **Non-Blocking Fourth Attempt**: Failing the CAPTCHA on Attempt 4 does NOT trigger an immediate lockout; Attempt 5 remains available subject to valid CAPTCHA.
  5. **Fifth Attempt Lockout**: Failing the CAPTCHA on Attempt 5 immediately triggers an authoritative 30-minute lockout on recovery requests for that email key.
  6. **Server-Side Verification**: Verification MUST be executed on the backend server against Google's official verification API (`https://www.google.com/recaptcha/api/siteverify`). Client-only validation is prohibited.
  7. **Credential Hygiene**: Zero Google secrets in repository code; values must be dynamically read from `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` environment variables.
- **System Impact**: Implemented via `App\Services\Security\RecaptchaVerificationService` and client widget on web reset forms.

### DEC-PWR-13: Post-Reset Web Redirection & Manual Mobile Re-Authentication
- **Decision ID**: `DEC-PWR-13`
- **Title**: Post-Reset Web Redirection & Manual Mobile Re-Authentication
- **Status**: LOCKED / FINAL APPROVED (2026-11-07)
- **Related Decisions**: `DEC-PWR-06`, `DEC-PWR-07`
- **Scope**: Web & Mobile UX / Post-Reset Flow
- **Context & Authority**:
  Clarifies user transition and login requirements following successful password reset.
- **Decision Rules**:
  1. **Clear Success Notification**: After successful password reset, display an explicit confirmation message.
  2. **Web Sign-In Action**: Display a prominent action button: "Sign In on Web" («تسجيل الدخول على الويب») opening the standard login modal.
  3. **No Custom URL Scheme**: Zero custom schemes (e.g. `aafiya://`) or protocol handlers.
  4. **No Deep Links / App Links**: Deep links and universal links remain deferred in V1.
  5. **No Auto-Login**: The session is terminated; no automatic authentication takes place.
  6. **Manual Mobile Re-Authentication**: Mobile app users return manually to their installed AAFIYA Patient or AAFIYA Pro app and sign in using the newly updated password.
- **System Impact**: Implemented on `src/app/[locale]/reset-password/page.tsx`; keeps mobile shells decoupled from web redirects.




