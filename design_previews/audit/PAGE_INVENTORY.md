# AAFIYA Mobile — Page & Screen Inventory Audit
**Revision Round 2 — Source-Verified Classification**

## 1. Executive Summary & Discrepancy Correction

In the previous revision, an apparent discrepancy was noted:
- Stated totals: Patient 19, Pro 28 (Sum = 47).
- Detailed lists in text: Patient 13 screens + 6 modals = 19; Pro 20 screens + 11 modals = 31 (Sum = 50).

### Root Cause of the Discrepancy:
The discrepancy was caused by mixing three distinct architectural concepts without explicit classification:
1. **Physical Dart files in `lib/screens/` and `lib/shells/`**.
2. **Virtual Navigation Tabs** embedded within bottom navigation shells (e.g. `patient_home_shell.dart` contains 4 tabs, where Tab 2 reuses `patient_shared_records_screen.dart` and Tab 3 reuses `prescriptions_screen.dart`).
3. **Modal Bottom Sheets vs. Embedded Views** (e.g., `patient_summary_sheet.dart` is physically stored in `lib/screens/` but is functionally launched via `showModalBottomSheet()`, whereas `doctor_dashboard_view.dart` is stored in `lib/widgets/` but acts as an entire full-screen tab in `doctor_shell.dart`).

This document provides the definitive, source-verified breakdown categorized by architectural role.

---

## 2. Aafiya Patient — Detailed Inventory

### A. Core Shells & Navigation Containers (3 files)
1. `mobile/apps/aafiya_patient/lib/shells/splash_shell.dart` — App launch & brand splash screen.
2. `mobile/apps/aafiya_patient/lib/shells/auth_shell.dart` — Patient authentication, login, registration.
3. `mobile/apps/aafiya_patient/lib/shells/patient_home_shell.dart` — Root scaffold hosting the 4-tab bottom navigation bar.

### B. Navigation Tabs inside `patient_home_shell.dart` (4 tabs)
1. **Tab 0: Home (`_HomeTab`)** — Greeting hero, next appointment preview, quick directory shortcuts.
2. **Tab 1: Appointments (`_AppointmentsTab`)** — Segmented lists (Upcoming / Past / Cancelled).
3. **Tab 2: Health Records (`_RecordsTab`)** — Displays `PatientSharedRecordsScreen` (Subject to V1 Health Lockdown).
4. **Tab 3: Prescriptions (`_PrescriptionsTab`)** — Displays `PrescriptionsScreen` (Active medications list).

### C. Standalone Screens (7 screens)
1. `mobile/apps/aafiya_patient/lib/screens/appointment_detail_screen.dart` — Full appointment details & actions.
2. `mobile/apps/aafiya_patient/lib/screens/doctor_directory_screen.dart` — Doctor search & booking directory.
3. `mobile/apps/aafiya_patient/lib/screens/clinic_directory_screen.dart` — Clinic facilities directory.
4. `mobile/apps/aafiya_patient/lib/screens/booking_center_directory_screen.dart` — Booking centers directory.
5. `mobile/apps/aafiya_patient/lib/screens/prescriptions_screen.dart` — Dedicated prescription list screen (also used in Tab 3).
6. `mobile/apps/aafiya_patient/lib/screens/prescription_detail_screen.dart` — Detailed prescription view & drug schedule.
7. `mobile/apps/aafiya_patient/lib/screens/emergency_profile_screen.dart` — Emergency profile (Blood group, contacts).
8. `mobile/apps/aafiya_patient/lib/screens/notifications_screen.dart` — Patient clinical notifications feed.
*(Note: `patient_shared_records_screen.dart` exists in code but its route is locked under V1 Health Lockdown).*

### D. Modal Bottom Sheets (3 sheets)
1. `mobile/apps/aafiya_patient/lib/widgets/visit_pass_sheet.dart` — Digital admission pass modal ticket.
2. `mobile/apps/aafiya_patient/lib/widgets/reschedule_appointment_sheet.dart` — Calendar slot reschedule sheet.
3. `mobile/apps/aafiya_patient/lib/widgets/prescription_verification_sheet.dart` — Cryptographic QR seal verification sheet.

### E. Dialogs (2 dialogs)
1. `mobile/apps/aafiya_patient/lib/widgets/patient_qr_dialog.dart` — QR check-in display dialog.
2. `mobile/apps/aafiya_patient/lib/widgets/patient_share_record_dialog.dart` — Temporary OTP share dialog (Locked in V1).
3. `mobile/packages/aafiya_ui/lib/widgets/aafiya_sign_out_dialog.dart` — Sign-out confirmation dialog (Shared).

### F. Internal Reusable Cards & Widgets (Not Standalone Screens)
- `appointment_card.dart`
- `clinic_card.dart`
- `doctor_card.dart`
- `prescription_card.dart`

**Patient Summary Count:**
- Shells: 3
- Full Tabs: 4
- Standalone Screens: 8
- Modal Sheets: 3
- Dialogs: 3
- Internal Components: 4

---

## 3. Aafiya Pro — Detailed Inventory

### A. Core Shells & Role Containers (6 files)
1. `mobile/apps/aafiya_pro/lib/shells/splash_shell.dart` — Pro app launch splash screen.
2. `mobile/apps/aafiya_pro/lib/shells/auth_shell.dart` — Professional authentication & language selector.
3. `mobile/apps/aafiya_pro/lib/shells/role_resolution_shell.dart` — Role-based router/redirector.
4. `mobile/apps/aafiya_pro/lib/shells/doctor_shell.dart` — Doctor workspace hosting 4 tabs & clinic context switcher.
5. `mobile/apps/aafiya_pro/lib/shells/assistant_shell.dart` — Assistant workspace hosting 3 tabs.
6. `mobile/apps/aafiya_pro/lib/shells/booking_center_shell.dart` — Booking center workspace hosting 3 tabs.

### B. Role Tabs (10 tabs across 3 shells)
- **Doctor Shell Tabs (4):**
  1. Tab 0: Queue & Agenda (`doctor_queue_screen.dart`)
  2. Tab 1: Dashboard Analytics (`doctor_dashboard_view.dart`)
  3. Tab 2: Clinic Staff Directory (`doctor_staff_screen.dart`)
  4. Tab 3: Working Hours & Schedule Lock (`doctor_working_hours_screen.dart`)
- **Assistant Shell Tabs (3):**
  1. Tab 0: Reception Queue (`assistant_queue_screen.dart`)
  2. Tab 1: In-Clinic Booking Flow (`assistant_booking_screen.dart`)
  3. Tab 2: Financial Rewards Ledger (`assistant_rewards_screen.dart`)
- **Booking Center Shell Tabs (3):**
  1. Tab 0: Cross-Clinic Booking (`bc_appointment_booking_screen.dart`)
  2. Tab 1: Quota Balances & Packages (`bc_quota_screen.dart`)
  3. Tab 2: Booked Appointments Master List (`bc_appointments_list_screen.dart`)

### C. Standalone Secondary Screens (5 screens)
1. `mobile/apps/aafiya_pro/lib/screens/clinic_director_stats_screen.dart` — Advanced clinic director analytics.
2. `mobile/apps/aafiya_pro/lib/screens/clinic_escalations_screen.dart` — Urgent delayed appointments dashboard.
3. `mobile/apps/aafiya_pro/lib/screens/clinic_operating_hours_screen.dart` — Clinic facility operating hours.
4. `mobile/apps/aafiya_pro/lib/screens/doctor_vacations_screen.dart` — Doctor leave management registry.
5. `mobile/apps/aafiya_pro/lib/screens/unresolved_reschedules_screen.dart` — Reschedule resolution dashboard.

### D. Modal Bottom Sheets (10 sheets)
1. `mobile/apps/aafiya_pro/lib/screens/patient_summary_sheet.dart` — Clinical patient summary sheet (Locked fields in V1).
2. `mobile/apps/aafiya_pro/lib/widgets/qr_scanner_sheet.dart` — Camera reticle scanner sheet (`AAFIYA-APPT:`).
3. `mobile/apps/aafiya_pro/lib/widgets/check_in_sheet.dart` — Arrival verification sheet.
4. `mobile/apps/aafiya_pro/lib/widgets/add_assistant_sheet.dart` — Invite assistant sheet.
5. `mobile/apps/aafiya_pro/lib/widgets/edit_assistant_permissions_sheet.dart` — Assistant permission toggles sheet.
6. `mobile/apps/aafiya_pro/lib/widgets/add_doctor_sheet.dart` — Associate doctor onboarding sheet.
7. `mobile/apps/aafiya_pro/lib/widgets/bc_booking_ticket_sheet.dart` — Call center booking ticket confirmation sheet.
8. `mobile/apps/aafiya_pro/lib/widgets/assistant_patient_search_sheet.dart` — Reception patient lookup sheet.
9. `mobile/apps/aafiya_pro/lib/widgets/register_vacation_sheet.dart` — Vacation date range picker sheet.
10. `mobile/apps/aafiya_pro/lib/widgets/staff_detail_sheet.dart` — Staff member profile sheet.

### E. Dialogs (2 dialogs)
1. `mobile/apps/aafiya_pro/lib/widgets/doctor_onboarding_dialog.dart` — First-time doctor setup wizard.
2. `mobile/apps/aafiya_pro/lib/widgets/schedule_activation_dialog.dart` — Irreversible schedule lock confirmation.

### F. Internal Sub-Components & Tiles (Not Standalone Screens)
- `allergy_badge_list.dart` (Locked in V1)
- `chronic_conditions_list.dart` (Locked in V1)
- `clinic_context_selector.dart`
- `doctor_agenda_tile.dart`
- `doctor_metric_card.dart`
- `doctor_onboarding_session.dart` (Helper class)
- `doctor_setup_reminder_banner.dart`
- `emergency_contact_card.dart`
- `queue_patient_tile.dart`
- `quota_balance_card.dart`
- `slot_selection_grid.dart`

**Pro Summary Count:**
- Shells: 6
- Full Tabs: 10
- Secondary Standalone Screens: 5
- Modal Sheets: 10
- Dialogs: 2
- Internal Components: 11

---

## 4. Master Architectural Matrix

| Category | Aafiya Patient | Aafiya Pro | System Total |
| :--- | :---: | :---: | :---: |
| **Shells / Nav Containers** | 3 | 6 | **9** |
| **Navigation Tabs** | 4 | 10 | **14** |
| **Standalone Screens** | 8 | 5 | **13** |
| **Modal Bottom Sheets** | 3 | 10 | **13** |
| **Dialogs** | 3 | 2 | **5** |
| **Total Navigable View Units** | **21** | **33** | **54** |
| **Internal Sub-Components** | 4 | 11 | **15** |
