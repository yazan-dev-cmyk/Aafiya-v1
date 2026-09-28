---
Document: AAFIYA V1 Master Plan
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-28 11:25
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: NO
---

# AAFIYA / عافية — V1 Implementation Master Plan

---

## 1. Project Identity & Brand Architecture

- **Official Product Name**: AAFIYA / عافية
- **Brand Essence**: Modern, dignified, dependable healthcare operating platform uniting patients, doctors, medical assistants, booking centers, clinics, and diagnostic centers.
- **Legacy Terminology Status**: "MediServices" is strictly internal legacy naming. It must not appear in any user-facing mobile UI, application bundle identifier, client metadata, or future documentation.
- **Brand Assets & Palette**:
  - **Health Blue**: `#0077B6` (Primary Brand & Clinical Trust)
  - **Healing Green**: `#48C774` (Action, Vitality & Confirmation)
  - **Surface Light / Canvas**: `#F8FAFC`
  - **Text Primary**: `#0F172A`
  - **Text Muted**: `#64748B`
  - **Error / Urgent**: `#EF4444`
  - **Warning**: `#F59E0B`
- **Typography**:
  - Arabic (Primary): **Cairo** / **Tajawal**
  - Latin (Secondary): **Inter** / Roboto
  - Full bidirectional mirroring with native Right-to-Left (RTL) layout geometry.

---

## 2. Mandatory Architectural Rule: Web ↔ Mobile Data Consistency (Single Source of Truth)

The AAFIYA Web platform and AAFIYA Mobile applications MUST consume the same authoritative backend/API/database state:

1. **Unified State**: Mobile is NOT a separate business system. Web is NOT a separate business system. Neither platform may maintain an independent authoritative copy of:
   - quota balance
   - booking transactions
   - appointments & appointment status
   - patients, clinics & doctors
   - permissions & 4D authorization ceilings
   - notifications & operational statistics
   - financial/transactional state.
2. **Reconciliation Standard**: Under no circumstances may Booking Center Web show a different quota balance (e.g. 20) than Booking Center Mobile (e.g. 68). Both clients must resolve the exact same backend state.
3. **Cache Policy**: Local mobile caching may be used strictly as a UX and performance mechanism. Cached financial or operational data MUST NOT silently be presented as current authoritative state when it may be stale. Optimistic UI must never become authoritative financial state. Mutations must be confirmed by backend response.
4. **API Contract Integrity**: Web and Mobile share identical backend business rules, status state machines, and authorization policies. Business logic must not be independently duplicated or altered in Flutter.

---

## 3. Product Scope & Delivery Vehicles

AAFIYA V1 is composed of three synchronized delivery vehicles sharing a single backend:

```text
                                  ┌─────────────────────────────────┐
                                  │      LARAVEL 13 BACKEND         │
                                  │   Single Source of Truth        │
                                  │  4D Authorization & Sanctum     │
                                  └──────────────┬──────────────────┘
                                                 │
                  ┌──────────────────────────────┼─────────────────────────────┐
                  │                              │                             │
                  ▼                              ▼                             ▼
   ┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐
   │       AAFIYA PATIENT        ││         AAFIYA PRO          ││      AAFIYA WEB PORTAL      │
   │        (Mobile App)         ││        (Mobile App)         ││     (Next.js 15 Web App)    │
   │                             ││                             ││                             │
   │  • View Appointments        ││  • Doctor Operational Shell ││  • Platform Administration  │
   │  • Appointment History      ││  • Assistant Queue Shell    ││  • Clinic Management        │
   │  • Clinic/Doctor Directory  ││  • Booking Center Shell     ││  • Diagnostic Labs & Rad    │
   │  • View Prescriptions       ││                             ││  • Full Clinical Visits/EHR │
   │  • Profile & Emergency Info ││                             ││  • Financial Settlement     │
   │  • NO Direct Booking        ││  • NO EHR Authoring         ││  • Web Legacy Staff Systems │
   └─────────────────────────────┘└─────────────────────────────┘└─────────────────────────────┘
```

---

## 4. Locked Product Decisions

The following product decisions have been formally locked in `DECISION_REGISTER.md`:

1. **DISC-01 (Direct Patient Booking Prohibited in Mobile)**: The Patient mobile application does NOT include appointment self-booking. Appointments are scheduled exclusively through Booking Centers or direct clinic reception.
2. **DISC-02 (Doctor Mobile Operational-Only Scope)**: Doctor mobile shell is strictly for schedule review, real-time waiting room queue status, and appointment attendance marking. Clinical visit authoring, prescription writing, and diagnostic ordering remain web-only.
3. **DISC-03 (Administration is Strictly Web-Only)**: No mobile application is developed for administrators.
4. **DISC-04 (Booking Center Employee Subsystem Excluded from Mobile V1)**: V1 mobile Booking Center shell provides a focused single-seat operator experience. Multi-tier employee role management within booking centers is excluded from mobile V1. Any existing web staff management is preserved as web legacy only.
5. **DISC-05 (Diagnostic Center Mobile Apps Deferred)**: Lab and Radiology workflows remain web-only.
6. **DISC-06 (Web ↔ Mobile Single Source of Truth & Data Consistency)**: The backend authoritatively governs slot occupancy, ledger quota, authorization ceilings, and record security. Both clients reflect identical reality.
7. **DISC-07 (Brand Migration)**: Complete adoption of AAFIYA branding across mobile code and UI.
8. **DISC-08 (Arabic-First RTL)**: First-class native Arabic layout geometry and typography.

---

## 5. Role Matrix & Mobile Permissions

| Role Identifier | Web Portal | Mobile App | Mobile Shell | Primary Mobile Capabilities |
| :--- | :---: | :---: | :--- | :--- |
| `patient_registered` | Optional | Yes | `aafiya_patient` | View appointments, view prescriptions, view doctors/clinics, manage emergency contacts |
| `doctor` | Yes | Yes | `aafiya_pro` (Doctor) | View daily agenda, switch clinics, view queue, update attendance status |
| `doctor_assistant` | Yes | Yes | `aafiya_pro` (Assistant) | Search patients, manage waiting room queue, check in arrivals, book return appointments |
| `booking_center` | Yes | Yes | `aafiya_pro` (BC) | View package quota balance, purchase quota, book appointments for patients |
| `admin` / `admin_assistant` | Yes | No | None (Blocked) | Web console only (user blocked at mobile role resolution with guidance) |
| `lab` / `radiology` | Yes | No | None (Deferred)| Web console only (diagnostic ordering, sample tracking, report writing) |

---

## 6. Architectural Foundation & Existing Scaffolds

### 6.1 Backend Architecture (Authoritative)
- **Framework**: Laravel 13.26.1 / PHP 8.3.33.
- **Authentication**: Laravel Sanctum 4.0 token-based API authentication (`Bearer <token>`).
- **Authorization Engine**: 4-Dimensional Authorization Model (`App\Traits\Has4DAuthorization`):
  1. *Layer 1 (Global Role)*: Base role assignment via `model_has_roles`.
  2. *Layer 2 (Clinic Context)*: Contextual binding via `clinic_id` / `X-Active-Clinic-ID` header and `EnsureActiveClinicContext` middleware.
  3. *Layer 3 (Scoped Permissions)*: Granular abilities (e.g. `booking.create`, `booking.manage_queue`).
  4. *Layer 4 (Security Ceiling)*: Hardcoded ceiling rules preventing assistants from accessing clinical authoring or clinic administrative mutations.
- **Concurrency & Quotas**: Atomic ledger tracking in `booking_transactions` and quota balance in `booking_centers`. Concurrency row-locking (`lockForUpdate()`) is implemented in `QuotaService::deductForAppointment` and scheduled for automated verification in Phase 2.

### 6.2 Mobile Architecture & Existing Workspace Scaffolds
- **Toolchain**: Flutter 3.47.3 Stable / Dart 3.13.3 at `/home/yazan/flutter`.
- **Existing Scaffolds**: The repository contains initial Phase 1 foundation scaffolds in `mobile/`:
  ```text
  mobile/
  ├── packages/
  │   ├── aafiya_core/     # API client, auth session, models, error handling
  │   └── aafiya_ui/       # Design tokens, themes, Cairo fonts, base widgets
  └── apps/
      ├── aafiya_patient/  # Patient application foundation & shells
      └── aafiya_pro/      # Multi-role professional application & shells
  ```
  *Note*: `TASK-01-01` verifies, tests, and aligns these existing scaffolds. It does not recreate or overwrite authorized scaffolds.

---

## 7. Planning & Implementation Blocker Status

- **Planning Blockers**: `0` (Forensic audit complete; planning fully unblocked).
- **Implementation Blockers / Pending Verification Items**: `3`
  1. `UNK-01`: Doctor Operational Statistics API contract (`GET /api/v1/doctor/stats`) to be implemented in Phase 2.
  2. `UNK-03`: Concurrency quota row-locking verification via automated test in Phase 2.
  3. `UNK-04`: Patient appointments query scoping verification in Phase 2.

---

## 8. Technical Gap Classifications

1. **GAP-01 (Doctor Stats)**: `BACKEND GAP` — Missing `GET /api/v1/doctor/stats` for real-time mobile dashboard metrics.
2. **GAP-02 (Notifications)**: `DB TABLE EXISTS / NOT EXPOSED VIA USER API / DERIVED IN CLIENT` — Web client derives notifications dynamically from appointments/prescriptions; evaluate if mobile should follow or expose dedicated endpoint.
3. **GAP-03 (Quota Concurrency)**: `REQUIRES VERIFICATION` — `QuotaService` already implements `lockForUpdate()`; verify via automated test before touching code.
4. **GAP-04 (Sanctum Session)**: `SESSION CONSTRAINT / MOBILE SESSION REQUIREMENT` — Sanctum 1440m expiration handled via mobile 401 re-authentication interceptor.
5. **GAP-05 (Patient Scoping)**: `REQUIRES VERIFICATION` — Verify self-scoping of `GET /api/v1/appointments` for `patient_registered`.
6. **GAP-06 (Attendance Status)**: `API CONTRACT GAP / REQUIRES ARCHITECTURAL VERIFICATION` — `BookingService::checkInAppointmentByToken` already sets `attended` with `lockForUpdate()`; verify whether doctor queue reuses this.
7. **GAP-07 (BC Doctor Directory)**: `PROPOSED` — Verify if existing `GET /api/v1/doctors` satisfies BC operator needs.

---

## 9. Security Principles

- **Zero Direct Public Storage**: No medical PDFs or lab reports exposed in public directories.
- **Signed Ephemeral URLs**: Prescription downloads served via time-limited, signed URLs (maximum 5 minutes).
- **Hard Ceiling Enforcement**: Code-level assertion of assistant boundaries regardless of database permission tampering.
- **Clinical Access Audit**: Automated logging of every patient profile access into `clinical_access_logs`.
- **Token Invalidation**: Strict client-side purge and backend token revocation upon logout.

---

## 10. Localization Strategy

- **Primary Language**: Modern Standard Arabic (`ar`).
- **Secondary Languages**: English (`en`), French (`fr`).
- **Typography Integration**: Google Fonts `Cairo` embedded locally for zero-latency Arabic rendering.
- **Bidirectional Geometry**: Proper use of directional padding (`EdgeInsetsDirectional`), alignment (`AlignmentDirectional`), and mirroring widgets for RTL/LTR switching without layout breakage.

---

## 11. Phase Roadmap Overview

- **PHASE 1: Workspace Foundation & Core Frameworks** (Align existing scaffolds, design tokens, branding, session manager, test harness).
- **PHASE 2: Backend API Contract Verification & Closure** (Implement GAP-01, verify GAP-03 locking, verify GAP-05 & GAP-06).
- **PHASE 3: AAFIYA Patient Mobile Application** (Splash, Auth, Dashboard, Appointments List, Doctor Directory, Prescription Viewer, Settings).
- **PHASE 4: AAFIYA Pro — Doctor Operational Mobile Shell** (Clinic Switcher, Today's Agenda, Queue Management, Attendance Marking, Stats).
- **PHASE 5: AAFIYA Pro — Doctor Assistant & Booking Center Shells** (Patient Lookup, Check-in, BC Quota Purchase Request, Quota Booking). *Status: CLOSED / VERIFIED — 4/4 tasks verified: TASK-05-01 ☑ CLOSED, TASK-05-02 ☑ CLOSED / VERIFIED (PASS | 21/21 Dart tests PASS | Emulator HV verified | Zero Mutation), TASK-05-03 ☑ CLOSED (PASS WITH OBSERVATIONS | 15/15 Dart tests PASS | Emulator HV verified | Parity confirmed), TASK-05-04 ☑ CLOSED (READY WITH MINOR OBSERVATION GAP | 25/25 Flutter↔Web parity | DISC-04/DISC-06 COMPLIANT). Phase 5 Exit Gate: PASS — HUMAN APPROVED. Phase 5 is FORMALLY CLOSED / VERIFIED; Phase 6 transition AUTHORIZED.*
- **PHASE 6: Cross-Platform Integration & System Hardening** (Deep linking, offline indicators, error telemetry, performance profiling). *Status: CLOSED / VERIFIED — 3/3 tasks verified: TASK-06-01 ☑ CLOSED / VERIFIED (PASS | 358/358 Dart tests PASS | Emulator/Harness HV verified | Zero Defects | Zero Implementation Mutation), TASK-06-02 ☑ CLOSED / VERIFIED (PASS | 377/377 Dart tests PASS | 6/6 HV Scenarios PASS | AR/EN/FR Verified | Zero Defects | Zero Implementation Mutation), TASK-06-03 ☑ CLOSED / VERIFIED (PASS | 414/414 Dart tests PASS | 17/17 HV Scenarios PASS | Zero Defects | Zero Pro/Backend/Web Mutation). Phase 6 Exit Gate: PASS — All tasks verified. Ready for Phase 7 Human Authorization.*
- **PHASE 7: Release Readiness & Production Deployment Gate** (Security review, release builds, store metadata, final sign-off). *Status: FORMALLY CLOSED / TECHNICAL EXIT GATE SATISFIED — 4/4 tasks verified: TASK-07-01 ☑ CLOSED / VERIFIED, TASK-07-02 ☑ CLOSED / TECHNICALLY VERIFIED, TASK-07-04 ☑ CLOSED / VERIFIED, TASK-07-03 ☑ CLOSED / VERIFIED (Final Human Verification Gate approved by Human Authority). Phase 7 Exit Gate: PASS — HUMAN APPROVED. All defined technical acceptance criteria for Phase 7 have been satisfied based on the authoritative evidence reconciled through TASK-07-01, TASK-07-02, TASK-07-03, and TASK-07-04. Phase 7 is FORMALLY CLOSED / VERIFIED from the technical verification/governance perspective. Governance Boundary: Production Release Approval: NOT GRANTED; Deployment: NOT PERFORMED; Store Submission: NOT PERFORMED; Google Play App Signing: NOT VERIFIED AND NOT CLAIMED.*

---

## 12. Human-Controlled Execution Model

Execution of the V1 Master Plan strictly follows the human verification gate model:
1. No task is implemented without explicit user authorization.
2. Every task must pass automated verification (`Automated Verification: PASSED`) and human review (`Human Verification: PASSED`) before status advances to `☑ COMPLETED`.
3. Antigravity must stop and await human instruction after every task.
