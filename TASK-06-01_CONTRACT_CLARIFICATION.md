# AAFIYA V1 — TASK-06-01
# Contract Clarification & Architecture Decision Record

**Document ID:** `ADR-06-01-01`  
**Task ID:** `TASK-06-01`  
**Task Name:** `Implement Global Error Boundaries, Offline Banner & Network Retries`  
**Phase:** `PHASE 6 — SYSTEM INTEGRATION & HARDENING`  
**Workstream:** `Mobile Reliability`  
**Execution Mode:** `DOCUMENTATION ONLY / ZERO IMPLEMENTATION / ARCHITECTURE DECISION RECORD`  
**Status:** `CONTRACT CLARIFIED — HUMAN APPROVED`  

---

## 1. Task Identity

- **Task ID:** `TASK-06-01`
- **Task Name:** Global Error Boundaries, Offline Banner & Network Retries
- **Phase:** Phase 6 — System Integration & Hardening
- **Target Applications:**
  - `mobile/apps/aafiya_patient` (Patient Mobile Application)
  - `mobile/apps/aafiya_pro` (Professional Mobile Application)
- **Target Packages:**
  - `mobile/packages/aafiya_core` (Network client, retry policy, connectivity abstraction, localization)
  - `mobile/packages/aafiya_ui` (Shared offline banner, crash boundary widget, error/empty views)
- **Frozen Boundaries (Zero Mutation Authorized):**
  - `backend/**` (Laravel 12 API controllers, services, database migrations, seeders)
  - `src/**` / `web/**` (Next.js web console)
  - `infrastructure/**`
  - `docs/aafiya_v1/MASTER_PLAN.md`
  - `docs/aafiya_v1/EXECUTION_PLAN.md`
  - `docs/aafiya_v1/VERIFICATION_LOG.md`
  - `docs/aafiya_v1/CHANGELOG.md`
  - `docs/aafiya_v1/DECISION_REGISTER.md`

---

## 2. Previous Audit Result

A Read-Only Pre-Implementation Contract Audit was conducted and issued the following formal verdict:

> **FORMAL VERDICT: REQUIRES CONTRACT CLARIFICATION**  
> *Readiness: ~85%*

The audit identified four critical architectural questions that require authoritative resolution before any implementation code or dependency modification may occur:
1. **Mutation Retry Safety**: Risk of silent duplicate requests on state-changing endpoints (booking, quota, check-in).
2. **Transient HTTP Status Scope**: Precise delineation between retryable status codes (`502`, `503`, `504`) versus non-retryable application crashes (`500`) and client errors (`4xx`).
3. **Connectivity Detection Architecture**: Dependency evaluation (`connectivity_plus`) vs an abstract decoupled `ConnectivityService`.
4. **Scope Bounding for "All Screens"**: Preventing unconstrained blast radius while verifying standard error and empty view adoption.

This document formally records the authoritative architecture decisions resolving each of these points.

---

## 3. Repository Evidence

All decisions recorded herein are grounded directly in read-only forensic inspection of the codebase:

1. **HTTP Client Stack (`mobile/packages/aafiya_core/lib/network/api_client.dart`)**:
   - Uses `http: ^1.2.0` via `_httpClient = httpClient ?? http.Client()`.
   - `get()` sets `allowRetry: true` (line 78).
   - `post()`, `put()`, `delete()` set `allowRetry: false` by default (lines 97, 117, 137).
   - Currently, retries only trigger on `SocketException` and `http.ClientException` (lines 194–225) with exactly 1 immediate retry (`allowRetry = false`).
   - Responses are evaluated in `_handleResponse` (lines 240–268); status codes `5xx` and `4xx` are immediately translated into `ApiException` with **zero status-code-based retries**.
2. **Existing Retry Tests (`mobile/packages/aafiya_core/test/api_client_test.dart`)**:
   - Lines 82–99 explicitly verify that POST requests do **not** retry by default on `SocketException` to protect idempotency.
   - Lines 101–125 contain a legacy test for `POST` with `allowRetry: true` on `/auth/login`.
3. **Empty and Error Views (`mobile/packages/aafiya_ui/lib/widgets/`)**:
   - `AafiyaErrorView` (`aafiya_error_view.dart`) and `AafiyaEmptyView` (`aafiya_empty_view.dart`) are already fully implemented, RTL-compliant, styled to AAFIYA design tokens (`AafiyaColors`, `AafiyaTypography`, `AafiyaSpacing`), and exported via `aafiya_ui.dart`.
   - Grep search confirms their active, systematic utilization in over 20 screens and widgets across `aafiya_patient` and `aafiya_pro` (e.g. `PatientHomeShell`, `DoctorDashboardView`, `DoctorQueueScreen`, `AssistantQueueScreen`, `BcQuotaScreen`, `ClinicDirectorStatsScreen`).
4. **App Bootstraps (`mobile/apps/aafiya_patient/lib/app.dart` & `mobile/apps/aafiya_pro/lib/app.dart`)**:
   - Both apps use `MaterialApp` without a `builder` property; uncaught framework errors currently trigger the default Flutter error widget.
5. **Localization Foundation (`mobile/packages/aafiya_core/lib/localization/localized_strings.dart`)**:
   - Implements Arabic, French, and English translations.
   - Contains general error strings (`serverError`, `errorTitle`, `emptyTitle`, `retry`, `dismiss`), but lacks dedicated strings for offline banners, reconnected state, and global crash recovery.
6. **Workspace Dependencies (`mobile/pubspec.yaml`, package `pubspec.yaml` files)**:
   - Dart SDK constraint is `^3.6.0`.
   - `connectivity_plus` is currently absent from all `pubspec.yaml` files.

---

## 4. Decision D-06-01-R1 — Automatic Retry Safety

### 4.1 Mandated Policy
> **Automatic retry in TASK-06-01 is STRICTLY RESTRICTED to safe, idempotent read operations (`GET`, `HEAD`).**

State-changing operations **MUST NEVER** receive automatic retries:
```text
POST
PUT
PATCH
DELETE
```

### 4.2 AAFIYA-Specific Business-Risk Rationale
In the AAFIYA medical platform, state-changing operations govern clinical appointments, financial quota packages, and live patient queue states:
- `POST /api/v1/appointments` (Patient appointment booking)
- `POST /api/v1/assistant/booking` (Assistant return appointment creation)
- `POST /api/v1/booking-center/packages/purchase` (Booking center package purchase / quota allocation)
- `POST /api/v1/booking-center/appointments` (Booking center direct booking & quota deduction)
- `POST /api/v1/doctor/waiting-room/check-in` (Queue advancement & attendance marking)
- `POST /api/v1/clinic-staff/invite` (Staff invitations)
- `PUT /api/v1/clinic-staff/{id}/status` (Staff suspension / activation)
- `DELETE /api/v1/clinic-staff/{id}` (Staff removal)

If a network timeout occurs after the Laravel backend processes the request and commits the database transaction, but before the HTTP response reaches the mobile client, an automatic retry would cause:
1. Duplicate appointment bookings and slot collisions (409 Conflict).
2. Double quota deductions and financial discrepancies.
3. Inconsistent patient queue states.

**Authoritative Governance Rule:**
> **Flutter MUST NOT become an independent authority for quota mutation, booking mutation, or clinical state changes. The Laravel backend remains the sole authority.**

### 4.3 Prohibited Mechanisms
- The legacy parameter `allowRetry: true` on `post()`, `put()`, and `delete()` in `ApiClient` is **deprecated and prohibited** for business endpoints.
- No client-side idempotency-key generation or mutation replay queue will be introduced in TASK-06-01. Any future mutation retry capability requires an explicit, separate backend/mobile contract specification.

---

## 5. Decision D-06-01-R2 — Transient HTTP Status Policy

### 5.1 Status Code Evaluation Matrix

| HTTP Status | Action in TASK-06-01 | Technical & Business Justification |
| :--- | :---: | :--- |
| **502 Bad Gateway** | **RETRY** *(GET/HEAD only)* | Transient reverse-proxy or upstream gateway failure (e.g. Nginx/PHP-FPM worker restart). Suitable for retry. |
| **503 Service Unavailable** | **RETRY** *(GET/HEAD only)* | Transient backend overload or brief maintenance window. Suitable for retry with backoff. |
| **504 Gateway Timeout** | **RETRY** *(GET/HEAD only)* | Transient gateway timeout waiting for upstream response. Suitable for retry for safe reads. |
| **500 Internal Server Error** | **DO NOT RETRY** | Indicates an unhandled Laravel application exception, database integrity violation, or syntax error. A deterministic server bug will not resolve within milliseconds. Immediate retries waste resources and clutter server logs. |
| **4xx Client Errors** (`400`, `401`, `403`, `404`, `409`, `422`, `429`) | **DO NOT RETRY** | Deterministic domain or authentication rejections. `401`/`403` require re-authentication; `404` means missing resource; `409` denotes state conflict; `422` indicates validation failure; `429` indicates rate limit throttling. Retrying `429` without honoring server headers would exacerbate throttling. |
| **Other 5xx** (`501`, `505`, etc.) | **DO NOT RETRY** | Non-transient protocol or capability errors. |

### 5.2 Network Exception Handling
Transient low-level I/O exceptions remain retry-eligible for `GET` and `HEAD` requests:
- `SocketException` (transient connection abort, network drop)
- `http.ClientException` (transport error)
- `TimeoutException` (connection/read timeout)

---

## 6. Decision D-06-01-R3 — Retry Count and Backoff Contract

### 6.1 Bounded Retry Limits
To eliminate risk of runaway retry storms or thundering herd problems, the retry policy is bounded to:
```text
Maximum Attempts = 3
(1 Initial Request + up to 2 Retries)
```

### 6.2 Backoff Strategy
- **Attempt 1**: Initial invocation.
- **Attempt 2 (Retry #1)**: Delay ≈ 350 ms + bounded random jitter (±50 ms).
- **Attempt 3 (Retry #2)**: Delay ≈ 700 ms + bounded random jitter (±100 ms).
- If Attempt 3 fails, the retry loop terminates immediately and surfaces the typed `ApiException` or `NetworkException` to the caller.

### 6.3 Centralized Architecture
- Logic is centralized in `RetryPolicy` located in `mobile/packages/aafiya_core/lib/network/retry_policy.dart` and integrated into `ApiClient`.
- Individual repository/service classes do **not** implement bespoke retry loops.

### 6.4 Deterministic Test Mode
- `RetryPolicy` must support a `useDelays: false` or `Duration.zero` test configuration.
- Unit and widget test suites must execute without artificial `Future.delayed` delays, guaranteeing sub-second deterministic test runs.

---

## 7. Decision D-06-01-C1 — Connectivity Architecture

### 7.1 Separation of Connectivity vs. Internet Reachability
> **Architectural Principle:**
> Network interface connectivity (e.g. device attached to Wi-Fi) does NOT guarantee end-to-end AAFIYA backend reachability (e.g. captive portal, DNS outage, or backend server unreachable).

- Device connectivity event = `Interface State` (Local OS level).
- API Client response = `Reachability State` (Service level).
- The offline banner reflects local network interface loss immediately, while network failure states in UI components (`AafiyaErrorView`) handle backend reachability failures.

### 7.2 Decoupled Abstraction Contract
To preserve architectural boundaries and testability, `aafiya_core` defines an abstract interface:

```dart
// mobile/packages/aafiya_core/lib/network/connectivity_service.dart
abstract class ConnectivityService {
  Stream<bool> get onConnectivityChanged;
  Future<bool> checkConnectivity();
}
```

### 7.3 Dependency Decision
- **Package:** `connectivity_plus`
- **Version Authorization:** **No specific `connectivity_plus` version is authorized in advance.** A compatible version must be determined during a mandatory dependency compatibility preflight immediately before implementation by inspecting Flutter, Dart, Android SDK, and existing constraints.
- **Target Location:** `mobile/packages/aafiya_core/pubspec.yaml`
- **Implementation Strategy:**
  - `aafiya_core` provides `PlatformConnectivityService implements ConnectivityService` wrapping `connectivity_plus`.
  - In unit and widget tests, a `MockConnectivityService` providing a controllable `StreamController<bool>` is injected, eliminating platform channel dependencies during testing.

### 7.4 Offline Banner Triggers
- **Trigger Offline**: When `ConnectivityService.onConnectivityChanged` emits `false`.
- **Trigger Reconnected**: When `ConnectivityService.onConnectivityChanged` emits `true` following an offline state.
- **Recovery Auto-Dismiss**: Displays a green "Connection Restored" indicator for 2.5 seconds, then auto-dismisses with an animated slide/fade transition.

---

## 8. Decision D-06-01-S1 — Screen Scope & Standardization

### 8.1 Definition of "All Screens" Scope
> **Scope Rule:**
> "Standard empty/error states across all screens" means **verifying and standardizing adherence to the existing `AafiyaErrorView` and `AafiyaEmptyView` components across all primary async data-fetching screens in AAFIYA Patient and AAFIYA Pro, without unrelated UI refactoring or screen rewrites.**

### 8.2 Scope Boundary:
1. **In-Scope Applications**:
   - `mobile/apps/aafiya_patient`
   - `mobile/apps/aafiya_pro`
2. **In-Scope Screens (Verification & Standard Adherence)**:
   - Patient: `PatientHomeShell` (Upcoming/Past appointments), `DoctorDirectoryScreen`, `ClinicDirectoryScreen`, `PrescriptionsScreen`, `EmergencyProfileScreen`.
   - Pro: `DoctorDashboardView`, `DoctorQueueScreen`, `AssistantQueueScreen`, `AssistantBookingScreen`, `BcQuotaScreen`, `BcAppointmentsListScreen`, `ClinicDirectorStatsScreen`, `DoctorStaffScreen`, `PatientSummarySheet`.
3. **Screens Excluded from Empty/Error Refactoring**:
   - Detail screens receiving pre-fetched immutable models (e.g., `AppointmentDetailScreen`, `PrescriptionDetailScreen`).
   - Authentication input screens (`PatientAuthShell`, `ProAuthShell`) which use dedicated form validation and error dialogs.
   - Splash screens (`PatientSplashShell`, `ProSplashShell`).
4. **Explicitly Out of Scope**:
   - Modifying screen layouts, visual styling, or typography unrelated to error/empty states.
   - Modifying business data structures or API contracts.

---

## 9. Global Error Boundary Contract

### 9.1 Multi-Layered Protection

```
┌─────────────────────────────────────────────────────────────┐
│                       Flutter App                           │
│                                                             │
│  1. FlutterError.onError                                    │
│     Catches framework build & layout exceptions             │
│                                                             │
│  2. PlatformDispatcher.instance.onError                     │
│     Catches uncaught async Zone / Future exceptions         │
│                                                             │
│  3. ErrorWidget.builder                                     │
│     Replaces default red/grey screen with AafiyaCrashBoundary│
│                                                             │
│  4. MaterialApp.builder (AafiyaGlobalOverlay)                │
│     Provides top-level recovery & persistent offline banner │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Fallback UI (`AafiyaCrashBoundary`)
- Implemented in `mobile/packages/aafiya_ui/lib/widgets/aafiya_crash_boundary.dart`.
- Renders an elegant, non-technical error view adhering to AAFIYA tokens (`AafiyaColors.error`, `AafiyaSpacing.insetScreen`, `AafiyaTypography.titleLarge`).
- Features a "Return to Home / العودة للرئيسية" primary action button that safely resets the navigation state to the home shell.

### 9.3 Security and PHI Protection
> [!IMPORTANT]
> **Zero PHI & Zero Raw Trace Exposure**:
> - User-facing error screens must NEVER display raw stack traces, SQL error codes, database table names, or patient medical identifiers.
> - In release mode, technical diagnostics are stripped. In debug mode, logs are routed to `debugPrint`.

---

## 10. Offline Banner Contract

### 10.1 UI Component Specification
- **Component:** `AafiyaOfflineBanner`
- **Location:** `mobile/packages/aafiya_ui/lib/widgets/aafiya_offline_banner.dart`
- **Mounting:** Mounted via `MaterialApp.builder` within an `Overlay` or top-level column.
- **Behavior:**
  - Floats non-intrusively below `SafeArea` at the top of the viewport.
  - Does NOT shift screen layout or push navigation controls down.
  - Fully animated entrance and exit (SlideTransition + FadeTransition).
  - RTL-compliant layout with Arabic iconography support.

### 10.2 Security and Storage Constraints
> [!CAUTION]
> **Strict Prohibition on Offline Data Persistence**:
> TASK-06-01 is strictly an **online-first reliability and feedback task**.
> It MUST NOT introduce:
> - Offline SQLite or Hive caching of Protected Health Information (PHI).
> - Local replication of medical records, prescriptions, or clinical notes.
> - Client-side queuing of offline bookings or mutations.
> - Local offline quota calculations.

---

## 11. Localization Contract

### 11.1 Target Repository
All user-facing strings for TASK-06-01 are centralized in:
`mobile/packages/aafiya_core/lib/localization/localized_strings.dart`

### 11.2 Required Translation Keys

| Key | Arabic (`ar`) | French (`fr`) | English (`en`) |
| :--- | :--- | :--- | :--- |
| `offlineBannerTitle` | لا يوجد اتصال بالإنترنت | Aucune connexion Internet | No Internet Connection |
| `offlineBannerMessage` | يرجى التحقق من اتصالك بالشبكة | Veuillez vérifier votre connexion | Please check your network connection |
| `offlineReconnected` | تم استعادة الاتصال بالإنترنت | Connexion Internet rétablie | Internet connection restored |
| `globalErrorTitle` | حدث خطأ غير متوقع | Une erreur inattendue est survenue | An unexpected error occurred |
| `globalErrorMessage` | نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة للرئيسية. | Une erreur est survenue. Veuillez réessayer ou retourner à l’accueil. | Something went wrong. Please retry or return to the main screen. |
| `returnToHome` | العودة للرئيسية | Retour à l’accueil | Return to Home |
| `restartApp` | إعادة التشغيل | Redémarrer | Restart |

---

## 12. Security Constraints

1. **Authentication Integrity**: Token retrieval and Bearer headers remain untouched in `mobile/packages/aafiya_core/lib/auth/`.
2. **Access Control**: Role resolution and clinic context switching established in Phases 4 & 5 remain unchanged.
3. **Data Sanitization**: Network error translation (`ApiException.fromStatusCode`) must continue sanitizing low-level system strings (e.g. raw socket errno 103) before presentation to users.

---

## 13. Testing Contract

The implementation phase must deliver comprehensive automated test coverage satisfying:

### 13.1 Retry Policy Tests (`aafiya_core/test/retry_policy_test.dart`)
- [ ] Safe `GET` request retries on `502`, `503`, and `504` and succeeds on subsequent attempt.
- [ ] Safe `GET` request fails after exactly 2 retries (3 attempts total) on continuous `503`.
- [ ] Mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`) are **never** retried on `503` or network drop.
- [ ] Non-retryable status codes (`500`, `400`, `401`, `403`, `404`, `409`, `422`, `429`) fail immediately on attempt 1 without retry.
- [ ] Backoff delay math operates correctly and jitter is bounded.
- [ ] Deterministic test mode executes without asynchronous delay.

### 13.2 Connectivity & Offline Banner Tests (`aafiya_ui/test/aafiya_offline_banner_test.dart`)
- [ ] Banner is hidden when connectivity stream emits `true`.
- [ ] Banner becomes visible with warning styling when stream emits `false`.
- [ ] Banner displays "Reconnected" green banner when stream transitions `false` -> `true`.
- [ ] Reconnected banner auto-dismisses after 2.5 seconds.
- [ ] Renders properly in RTL (Arabic) and LTR (English/French).

### 13.3 Global Error Boundary Tests (`aafiya_ui/test/aafiya_crash_boundary_test.dart` & App Tests)
- [ ] `AafiyaCrashBoundary` renders localized fallback UI on widget build exception.
- [ ] Tapping "Return to Home" invokes the registered recovery callback.
- [ ] Uncaught errors do not dump stack traces in production configuration.

### 13.4 Regression Invariance
- [ ] All existing mobile test suites in `aafiya_core`, `aafiya_ui`, `aafiya_patient`, and `aafiya_pro` must pass without regressions.

---

## 14. Implementation Scope

When authorized, TASK-06-01 implementation will touch **only** the following designated files:

### Target Files for Creation:
1. `mobile/packages/aafiya_core/lib/network/retry_policy.dart`
2. `mobile/packages/aafiya_core/lib/network/connectivity_service.dart`
3. `mobile/packages/aafiya_core/test/retry_policy_test.dart`
4. `mobile/packages/aafiya_ui/lib/widgets/aafiya_offline_banner.dart`
5. `mobile/packages/aafiya_ui/lib/widgets/aafiya_crash_boundary.dart`
6. `mobile/packages/aafiya_ui/test/aafiya_offline_banner_test.dart`
7. `mobile/packages/aafiya_ui/test/aafiya_crash_boundary_test.dart`

### Target Files for Modification:
1. `mobile/packages/aafiya_core/pubspec.yaml` (Add the compatibility-verified `connectivity_plus` version selected during implementation preflight)
2. `mobile/packages/aafiya_core/lib/aafiya_core.dart` (Exporting new services)
3. `mobile/packages/aafiya_core/lib/network/api_client.dart` (Integrating `RetryPolicy`, restricting retries to GET/HEAD)
4. `mobile/packages/aafiya_core/lib/localization/localized_strings.dart` (Adding 7 required string keys)
5. `mobile/packages/aafiya_ui/lib/aafiya_ui.dart` (Exporting new widgets)
6. `mobile/apps/aafiya_patient/lib/app.dart` & `main.dart` (MaterialApp.builder overlay & FlutterError hooks)
7. `mobile/apps/aafiya_pro/lib/app.dart` & `main.dart` (MaterialApp.builder overlay & FlutterError hooks)

---

## 15. Explicit Out-of-Scope Items

The following are strictly forbidden from implementation in TASK-06-01:
- ❌ Modifying any backend (`backend/**`) Laravel code, controllers, migrations, or database tables.
- ❌ Modifying web frontend (`src/**`, `web/**`) code.
- ❌ Introducing client-side offline booking queues or local mutation caching.
- ❌ Introducing local database storage (SQLite / Hive / ObjectBox) for PHI.
- ❌ Modifying authentication mechanisms, tokens, or role resolution logic.
- ❌ Rewriting or restyling existing screens that already properly use `AafiyaErrorView`.

---

## 16. Dependency Decision

- **Package:** `connectivity_plus`
- **Version:** Compatible version to be selected during mandatory dependency compatibility preflight immediately before implementation. **No specific version is authorized in advance.**
- **Scope:** Added to `mobile/packages/aafiya_core/pubspec.yaml`
- **Execution Note:** Dependency modification is **NOT permitted during this contract phase**. It will be executed strictly during the implementation phase following preflight verification.

---

## 17. Risks and Mitigations

| Identified Risk | Severity | Mitigation Strategy |
| :--- | :---: | :--- |
| **Duplicate Mutating Requests** | **CRITICAL** | Enforced by Decision D-06-01-R1: Automatic retry is hardcoded to allow only `GET` and `HEAD`. Mutating methods (`POST`, `PUT`, `DELETE`, `PATCH`) are rejected by the retry policy. |
| **Server Thrashing (Thundering Herd)** | **HIGH** | Enforced by Decision D-06-01-R3: Hard ceiling of 3 total attempts (2 retries) with exponential backoff and randomized jitter. |
| **Flaky Automated Tests due to Delays** | **MEDIUM** | Enforced by Decision D-06-01-R3: `RetryPolicy` includes a deterministic zero-delay test mode. |
| **App Crash Masking Critical Failures** | **MEDIUM** | Enforced by Section 9: Error boundary safely logs diagnostics via `debugPrint` and notifies the user with a recovery action instead of a silent freeze or raw red screen. |

---

## 18. Open Questions

There are **zero remaining architectural ambiguities**. All four contract questions raised in the Pre-Implementation Audit have been definitively analyzed and resolved within this document.

---

## 19. Final Contract Status

> ### **CONTRACT CLARIFIED — HUMAN APPROVED**

*This document constitutes the authoritative specification for TASK-06-01. Human Approval has been formally granted via the interactive approval gate.*

---

## 20. Human Approval Gate

- **Gate Status:** **PASSED / APPROVED**
- **Approved Decisions:** `D-06-01-R1`, `D-06-01-R2`, `D-06-01-R3`, `D-06-01-C1`, `D-06-01-S1`
- **Next Step:** Generation of the **Official Controlled Implementation Prompt** for TASK-06-01.

*(END OF CONTRACT CLARIFICATION RECORD)*
