# AAFIYA Pro — Functional Inventory: Category 9
## QR Scanner & Remaining Screens (ماسح الاستجابة السريعة والشاشات المتبقية)

**Status:** Verified & Complete  
**Design Aesthetic:** Premium Editorial Medical Aesthetic  
**Policy Compliance:** Medical QR Token Protocol (`AAFIYA-APPT:<64-char-token>`), HMAC Verification, Zero PHI in Pro summary view, Director vs Employed Clinic context gating.

---

### 1. Scope & Component Inventory

#### A. QrScannerSheet (`mobile/apps/aafiya_pro/lib/widgets/qr_scanner_sheet.dart`)
- **Type:** Modal Bottom Sheet (`StatefulWidget`)
- **Visual Design:**
  - Darkened medical viewfinder overlay with rounded corner brackets.
  - Editorial header with badge title and subtle instruction text.
  - Close button and Torch toggle button with minimum $48\times 48\text{dp}$ touch target constraints.
- **Protocol Enforcement:**
  - Integrated with `mobile_scanner` lifecycle.
  - Strict barcode scanning yielding raw token strings to be sanitized.

#### B. CheckInSheet (`mobile/apps/aafiya_pro/lib/widgets/check_in_sheet.dart`)
- **Type:** Modal Bottom Sheet (`StatefulWidget`)
- **Visual & Ergonomics Updates:**
  - Camera Scan Action button (`OutlinedButton.icon`) with explicit `minimumSize: const Size(0, 48)`.
  - Cancel action button with `minimumSize: const Size(0, 52)`.
  - Primary submit check-in CTA button (`AafiyaButton`) with explicit `height: 52.0`.
  - Accessible error and auto-checkin status banners with semantic colors (`healingGreen`, `error`).
- **Functional Integrity:**
  - Dual check-in modes: automatic instant check-in upon valid QR scan, and manual token entry with explicit user submission.
  - Instant sanitization via `QrTokenSanitizer`.

#### C. QrTokenSanitizer (`mobile/apps/aafiya_pro/lib/utils/qr_token_sanitizer.dart`)
- **Type:** Utility class
- **Protocol Verification:**
  - Validates `AAFIYA-APPT:<64-hex-token>` payload prefixes.
  - Strips URL schemes (`https://aafiya.app/pass?token=...`).
  - Rejects malformed strings, length mismatches, and unauthorized schemes.

#### D. ClinicDirectorStatsScreen (`mobile/apps/aafiya_pro/lib/screens/clinic_director_stats_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Features & Parity:**
  - Primary & Secondary KPI decks (5 operational volume metrics, 5 status metrics).
  - Multi-tenant clinic scoping with `X-Clinic-ID` header and in-flight stale response guard.
  - Doctor filtering ("All Doctors" vs Single Doctor) and Date presets ("Today", "Specific Date", "Range").

#### E. ClinicOperatingHoursScreen & ClinicEscalationsScreen
- **Type:** Screens (`StatefulWidget`)
- **Features:**
  - Weekly operating schedule editor with 7 weekdays, opening/closing periods, and holiday overrides.
  - Escalations dashboard with triage badges, patient callbacks, and direct status updates.

#### F. DoctorStaffScreen & StaffDetailSheet (`mobile/apps/aafiya_pro/lib/screens/doctor_staff_screen.dart`)
- **Type:** Screens & Modals
- **Role & Permission Enforcements:**
  - Medical Director gate: 5 navigation tabs for Directors vs 3 tabs for Employed Doctors.
  - Staff management: invitations, permissions assignment, detach/suspend actions with confirmation guards.
  - Destructive actions hidden for Primary Director self-profile.

---

### 2. Test Verification Suite
- `test/check_in_qr_flow_test.dart`
- `test/qr_token_sanitizer_test.dart`
- `test/clinic_director_stats_test.dart`
- `test/clinic_escalations_test.dart`
- `test/clinic_operating_hours_test.dart`
- `test/doctor_staff_test.dart`
- `test/unresolved_reschedules_test.dart`
- **Result:** **70/70 tests passing (100% success)**.
