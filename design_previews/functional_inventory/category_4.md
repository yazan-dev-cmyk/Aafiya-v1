# AAFIYA Patient — Functional Inventory: Category 4
## Profile, Notifications & Booking Centers (الملف الشخصي، الإشعارات، ومراكز الحجز)

**Status:** Verified & Complete  
**Design Aesthetic:** Premium Editorial Medical Aesthetic  
**Policy Compliance:** Health Lockdown (2026-10-29) - Medical records strictly read-only, Booking Center directory discoverability with zero direct patient booking.

---

### 1. Scope & Component Inventory

#### A. PatientProfileTab (`mobile/apps/aafiya_patient/lib/shells/patient_home_shell.dart`)
- **Type:** Navigation Tab
- **Components:**
  - Patient Identification & MRN display.
  - Emergency contact and profile status badges.
  - Direction to Aafiya Pro guidance text for healthcare professionals.

#### B. NotificationsScreen (`mobile/apps/aafiya_patient/lib/screens/notifications_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Features:**
  - Notification items with categorized badge styling (`appointment`, `reminder`, `update`).
  - Read/unread acknowledgment and optimistic cache refresh.
  - Multi-tenant and session-switching isolation guard (stale notification from previous session discarded).

#### C. BookingCenterDirectoryScreen & ClinicDirectoryScreen
- **Type:** Screens (`StatefulWidget`)
- **Features:**
  - Discoverable directory of licensed Booking Centers with contact numbers, wilayas, and addresses.
  - Strictly non-booking: direct phone calling and map redirection only, enforcing DISC-01 compliance.

---

### 2. Test Verification Suite
- `test/notifications_screen_test.dart`
- `test/booking_center_directory_test.dart`
- `test/patient_auth_test.dart`
- **Result:** **34/34 tests passing (100% success)**.
