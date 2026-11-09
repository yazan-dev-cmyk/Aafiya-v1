# AAFIYA Pro — Functional Inventory: Category 6
## Doctor Dashboard & Live Queue (لوحة تحكم الطبيب وقائمة الانتظار المباشرة)

**Status:** In Progress / Verified  
**Design Aesthetic:** Premium Editorial Medical Aesthetic  
**Security & Privacy:** Strictly whitelisted patient identity (DISC-02, zero personal phone/email exposure in queue), stale clinic response protection.

---

### 1. Scope & Component Inventory

#### A. DoctorShell (`mobile/apps/aafiya_pro/lib/shells/doctor_shell.dart`)
- **Type:** Primary Navigation Shell (`StatefulWidget`)
- **Key Navigation Tabs:**
  - Tab 0: Dashboard (`DoctorDashboardView`)
  - Tab 1: Live Queue (`DoctorQueueScreen`)
  - Tab 2: Working Hours / Consultation Schedule (`DoctorWorkingHoursScreen`)
  - Tab 3: Staff Management (Clinical Director role only: `DoctorStaffScreen`)
  - Tab 4: Profile / Settings
- **Clinic Context Switcher:** `ClinicContextSelector` dropdown in AppBar with instant authoritative reload.
- **Onboarding Banner:** `DoctorSetupReminderBanner` with `DoctorOnboardingDialog`.

#### B. DoctorDashboardView (`mobile/apps/aafiya_pro/lib/widgets/doctor_dashboard_view.dart`)
- **Type:** Screen Component (`StatefulWidget`)
- **Key Sections:**
  - Responsive KPI Metrics Grid (`DoctorMetricCard` with 2+2+1, 2+3, or 1x5 layout according to viewport width).
  - Metrics: Total Today, Attended, In-Consultation, Expected, No-Show.
  - Today's Agenda: List of scheduled time slots with `DoctorAgendaTile`.
  - Empty state (`AafiyaEmptyView`), pull-to-refresh (`RefreshIndicator`).

#### C. DoctorQueueScreen (`mobile/apps/aafiya_pro/lib/screens/doctor_queue_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Sub-Tabs:**
  - `Waiting Room` (`status = attended`): Arrived patients waiting in clinic.
  - `Expected Check-In` (`status = confirmed`): Expected arrivals.
- **Operational Actions:**
  - Mark Attended (`POST /api/v1/appointments/{id}/attend`) with in-flight lock.
  - Mark No-Show (`POST /api/v1/appointments/{id}/no-show`) with confirmation modal and optional clinical reason.
  - Confirm pending appointment (`/confirm`).
  - View Patient Medical Summary modal (`PatientSummarySheet.show`).
  - Stale clinic response guard.

#### D. PatientSummarySheet (`mobile/apps/aafiya_pro/lib/screens/patient_summary_sheet.dart`)
- **Type:** Modal Bottom Sheet (`StatefulWidget`)
- **Strict Read-Only & Privacy:**
  - Displays patient full name, MRN, blood group, allergies (with severity badge), chronic illnesses, emergency contact.
  - Zero exposure of private phone, email, national ID, or home address.
  - Zero mutation/edit buttons (DISC-02).
  - Close button with 48dp touch target constraint.

---

### 2. Test Verification Suite
- `test/doctor_dashboard_test.dart`
- `test/doctor_queue_test.dart`
- `test/doctor_responsive_dashboard_test.dart`
- `test/doctor_onboarding_test.dart`
- `test/patient_summary_test.dart`
- **Result:** **51/51 tests passing (100% success)**.
