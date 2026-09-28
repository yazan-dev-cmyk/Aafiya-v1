---
Document: AAFIYA V1 Security Register
Status: ACTIVE
Created At: 2026-09-11 09:15
Updated At: 2026-09-28 11:25
Source/Basis: AAFIYA V1 Master Plan + Repository Forensic Audit
Scope: Planning Only
Implementation Authorized: NO
---

# AAFIYA / عافية — V1 Security Register

This register identifies security principles, authorization ceilings, potential vulnerabilities, and compliance requirements governing the AAFIYA V1 healthcare platform.

---

## Security Findings Summary

| Security ID | Category | Severity | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Authorization | CRITICAL | Assistant Role Privilege Escalation Risk | Enforce immutable 4D ceiling in backend middleware |
| **SEC-02** | Data Privacy (PHI) | CRITICAL | Unauthenticated Medical File Access | Strictly ephemeral signed URLs; no public disk exposure |
| **SEC-03** | Mobile Storage | HIGH | Plaintext Token / Session Leakage | `flutter_secure_storage` (Keystore / Keychain) |
| **SEC-04** | Concurrency | HIGH | Quota Ledger Race Condition | `DB::transaction()` with `lockForUpdate()` on quota |
| **SEC-05** | Audit & Compliance | MEDIUM | Clinical Data Access Audit Logging | Record all patient profile and record views in `clinical_access_logs` |
| **SEC-06** | Session Hygiene | MEDIUM | Sanctum Token Revocation on Logout | Revoke token on device and call `POST /api/v1/auth/logout` |

---

## Detailed Security Analysis

### SEC-01: Assistant Role Privilege Escalation & 4D Ceiling
- **Risk**: An assistant granted administrative-sounding permissions might attempt to invoke clinic administration or clinical authoring endpoints.
- **Enforcement Principle**: The 4D Authorization framework in `App\Traits\Has4DAuthorization` must enforce a **Hard Ceiling** on the `doctor_assistant` role:
  1. **Layer 1 (Role)**: User must hold `doctor_assistant` role.
  2. **Layer 2 (Context)**: Request must include valid `X-Active-Clinic-ID` header corresponding to a clinic where the assistant is actively employed.
  3. **Layer 3 (Permissions)**: Must possess granular permission (e.g., `booking.create`, `booking.manage_queue`, `booking.confirm_attendance`).
  4. **Layer 4 (Ceiling)**: Regardless of permissions granted in DB, the assistant is **strictly blocked** by code ceiling from:
     - Deleting or modifying clinic profiles.
     - Modifying doctor affiliations or invitation statuses.
     - Authoring or finalizing clinical visit notes (`clinical-visits`).
     - Creating or voiding prescriptions (`prescriptions`).
     - Creating or finalizing diagnostic orders (`diagnostic-orders`).
- **Implementation Status**: Backend policies enforce Layer 1-3. Verification of Layer 4 ceiling code checks must be validated in Phase 2 tests.

---

### SEC-02: Protection of Sensitive Health Information (PHI) & Files
- **Risk**: Prescription PDFs, diagnostic test reports, and lab results being accessible via predictable or unauthenticated URLs.
- **Enforcement Principle**:
  - Medical records and generated documents must NEVER be stored in `public/storage`.
  - All files reside in a non-public disk (`local` or private S3 bucket).
  - Mobile apps download documents exclusively via:
    1. Authenticated streaming endpoints requiring active Sanctum token and clinical authorization.
    2. Ephemeral pre-signed URLs with a maximum lifespan of 5 minutes.
  - Every access to patient files is logged with timestamp, user ID, and IP in `clinical_access_logs`.

---

### SEC-03: Mobile Local Storage & Token Hygiene
- **Risk**: Device theft, backup extraction, or malware accessing authentication tokens stored in plaintext SharedPreferences / UserDefaults.
- **Enforcement Principle**:
  - `aafiya_core` must use hardware-backed secure storage (`flutter_secure_storage`) backed by Android Keystore and iOS Keychain.
  - Ephemeral medical documents (prescriptions, test results) downloaded for viewing must be stored in the app's secure cache directory and cleared upon logout.
  - No sensitive medical data or PII may be printed in console logs or crash reports.

---

### SEC-04: Booking Quota Concurrency & Ledger Integrity
- **Risk**: Parallel API calls from high-volume booking centers could decrement balance below zero if transactions are not locked.
- **Enforcement Principle**:
  - All quota deductions in `AppointmentController@store` must execute within a database transaction.
  - Must use `BookingCenter::where('id', $bcId)->lockForUpdate()->first()` prior to balance check.
  - Deductions must create a corresponding immutable ledger entry in `booking_transactions`.
  - Negative quota balances are strictly prevented at both application and database constraint levels.

---

### SEC-05: Comprehensive Clinical Audit Logging
- **Risk**: HIPAA / local healthcare regulatory non-compliance regarding who accessed patient medical records.
- **Enforcement Principle**:
  - Whenever a doctor or assistant views a patient profile or shared record via `/api/v1/patients/{id}` or `/api/v1/shared-records/{token}`, an asynchronous audit event must write to `clinical_access_logs`.
  - The audit record must capture: `user_id`, `patient_id`, `clinic_id`, `action`, `ip_address`, `user_agent`, `created_at`.

---

### SEC-06: Session Invalidation and Revocation
- **Risk**: Stale tokens remaining active after user logout or device unlinking.
- **Enforcement Principle**:
  - Mobile logout flow must:
    1. Send `POST /api/v1/auth/logout` to delete the current Sanctum personal access token from `personal_access_tokens` table.
    2. Purge tokens, cached user profile, and active clinic context from secure storage.
    3. Reset the application state machine to the unauthenticated Splash/Login shell.

---

## Phase 7 Release Packaging & Binary Security Findings (TASK-07-02)

The following findings were documented during TASK-07-02 binary verification and subsequently remediated:

| Finding ID | Category | Severity | Description | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **FINDING-RELEASE-01** | Android Manifest | HIGH | Missing patient release `INTERNET` permission | **RESOLVED / VERIFIED** |
| **FINDING-CLEARTEXT-01**| Network Security | MEDIUM | `android:usesCleartextTraffic="true"` in pro release manifest | **RESOLVED / VERIFIED** |
| **FINDING-CONFIG-01** | API Endpoint | MED/HIGH | Hardcoded `10.0.2.2:8000` emulator endpoint in release mode | **RESOLVED / VERIFIED** |
| **FINDING-SIGN-01** | Binary Signing | MEDIUM | Release builds fell back to Android debug keystore | **RESOLVED / VERIFIED — FAIL-CLOSED CORRECTION** |

### FINDING-RELEASE-01: Patient Application Missing INTERNET Permission
- **Original Condition**: `apps/aafiya_patient/android/app/src/main/AndroidManifest.xml` lacked `<uses-permission android:name="android.permission.INTERNET"/>` (present only in `src/debug/`), causing release builds to omit network permissions entirely.
- **Remediation**: Added `<uses-permission android:name="android.permission.INTERNET"/>` to main manifest.
- **Verification Evidence**: Disassembled rebuilt release APK merged manifest via `aapt2 dump xmltree`; verified `android.permission.INTERNET` is present.
- **Status**: **RESOLVED / VERIFIED**

---

### FINDING-CLEARTEXT-01: Cleartext HTTP Permitted in Pro Release Binary
- **Original Condition**: `apps/aafiya_pro/android/app/src/main/AndroidManifest.xml` explicitly declared `android:usesCleartextTraffic="true"`, permitting unencrypted HTTP communication in production binaries.
- **Remediation**: Removed `android:usesCleartextTraffic="true"` from main manifest; isolated cleartext permission strictly to `src/debug/AndroidManifest.xml` for local development.
- **Verification Evidence**: Disassembled rebuilt release APK merged manifest via `aapt2 dump xmltree`; confirmed `android:usesCleartextTraffic` is absent (not explicitly enabled in the inspected release manifest).
- **Status**: **RESOLVED / VERIFIED**

---

### FINDING-CONFIG-01: Lack of Authoritative Production API Endpoint Binding
- **Original Condition**: `resolveAppConfig()` unconditionally defaulted Android runtime to `AppConfig.devAndroidEmulator` (`http://10.0.2.2:8000/api/v1`), embedding local emulator endpoints into release binaries.
- **Remediation**: Added `AppConfig.production` pointing to authoritative domain `https://api.aafiya.dz/api/v1` (derived from `.env.production.example` and nginx configuration). Updated `resolveAppConfig()` in both apps to default to `AppConfig.production` in `kReleaseMode` with `--dart-define=API_URL` override support.
- **Verification Evidence**: Inspected strings in disassembled `libapp.so`; verified active release target is `https://api.aafiya.dz/api/v1` and emulator endpoint is excluded from release routing.
- **Status**: **RESOLVED / VERIFIED** (Live production TLS handshake subject to normal deployment validation)

---

### FINDING-SIGN-01: Release Packaging Fallback to Debug Keystore Signing
- **Original Condition**: Release builds fell back to `signingConfig = signingConfigs.getByName("debug")`, creating release binaries signed with the Android debug certificate.
- **Remediation (Fail-Closed Correction)**: Removed debug signing fallback from `buildTypes.release` in both apps. Implemented fail-closed release guard via `gradle.taskGraph.whenReady` that throws `GradleException` and halts release/bundle compilation whenever `key.properties` or keystore credentials are absent or invalid.
- **Verification Evidence**: Executed `flutter build apk --release` and `flutter build appbundle --release` across both `aafiya_patient` and `aafiya_pro`; confirmed all 4 commands fail closed with exit code 1, emitting explicit security blocked errors and producing zero release artifacts. Verified debug builds remain operational (`flutter build apk --debug` succeeded with exit code 0).
- **Status**: **RESOLVED / VERIFIED — FAIL-CLOSED CORRECTION**
- **Mandatory Qualification**: Fail-closed signing configuration is **VERIFIED**. Production-signed artifact certificate verification: **RESOLVED / VERIFIED under TASK-07-04** (all 4 release artifacts cryptographically verified against genuine AAFIYA Production Upload Key).

---

### TASK-07-04: Production Upload Key Signing & Cryptographic Artifact Verification
- **Scope**: Integration of genuine AAFIYA Production Upload Key, fail-closed release signing enforcement, and cryptographic verification of all production artifacts.
- **Verification Evidence**:
  - Validated local `key.properties` for both Patient and Pro apps with restrictive `0600` permissions and Git exclusion, referencing `/home/yazan/Downloads/Medi/AAFIYA-Signing/aafiya-upload-keystore.jks`.
  - Cryptographically verified Patient APK (`apksigner verify` — v2 scheme, RSA 4096-bit).
  - Cryptographically verified Patient AAB (`jarsigner -verify` — `jar verified.`).
  - Cryptographically verified Pro APK (`apksigner verify` — v2 scheme, RSA 4096-bit).
  - Cryptographically verified Pro AAB (`jarsigner -verify` — `jar verified.`).
  - Confirmed 100% SHA-256 certificate fingerprint match against reference PEM (`4A:C5:DC:5F:47:8A:81:74:46:52:63:97:87:BC:E7:4E:73:E4:28:46:C2:A5:DF:EF:D4:E4:B4:1C:BF:46:E2:69`, Subject: `CN=Djedid Lakhdar, OU=Dev, O=Aafiya, L=Medrissa, ST=Tiaret, C=Ti`).
  - Confirmed 100% SHA-256 binary hash match across all four release artifacts.
- **Status**: **RESOLVED / VERIFIED — CRYPTOGRAPHICALLY VERIFIED**
- **Governance Qualification**:
  - Production Upload Key signing: **VERIFIED**.
  - Google Play App Signing: **NOT VERIFIED AND NOT CLAIMED** (managed by Google Play in cloud upon intake).
  - Production Release Approval: **NOT GRANTED**.
  - Deployment: **NOT PERFORMED**.
  - Store Submission: **NOT PERFORMED**.

---

### Phase 7 Technical Security & Verification Gate Formal Closure (TASK-07-03)
- **Scope**: Final human verification gate and Phase 7 technical exit reconciliation.
- **Verification Evidence**:
  - All defined technical acceptance criteria for Phase 7 have been satisfied based on the authoritative evidence reconciled through TASK-07-01, TASK-07-02, TASK-07-03, and TASK-07-04.
  - SEC-01 through SEC-06 audited and verified.
  - FINDING-RELEASE-01, FINDING-CLEARTEXT-01, FINDING-CONFIG-01, and FINDING-SIGN-01 resolved and verified.
  - Production upload key cryptographic verification and fail-closed signing verified under TASK-07-04.
  - Formal human sign-off granted by project sponsor under TASK-07-03.
- **Status**: **FORMALLY CLOSED / TECHNICAL EXIT GATE SATISFIED**
- **Governance Boundary**:
  - Production Release Approval: **NOT GRANTED**.
  - Deployment: **NOT PERFORMED**.
  - Store Submission: **NOT PERFORMED**.
  - Google Play App Signing: **NOT VERIFIED AND NOT CLAIMED**.

