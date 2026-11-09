# AAFIYA Pro — Functional Inventory: Category 7
## Booking & Appointment Management (الحجز وإدارة المواعيد)

**Status:** In Progress / Verified  
**Design Aesthetic:** Premium Editorial Medical Aesthetic  
**Role Scope:** Doctor Assistant & Booking Center roles (with fail-closed permission gating).

---

### 1. Scope & Component Inventory

#### A. AssistantBookingScreen (`mobile/apps/aafiya_pro/lib/screens/assistant_booking_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Features:**
  - Strict role permission gating on `booking.create` (fails closed with unauthorized error view).
  - Patient Mode Selector (Walk-in vs Registered/Return visit).
  - Return-visit auto-fill with return badge.
  - Doctor selector, clinic context picker, date picker, slot selection grid (`SlotSelectionGrid`).
  - Primary CTA button `AafiyaButton(height: 52.0)` with loading state.
  - Leading BackButton with 48dp touch target constraint.

#### B. AssistantQueueScreen (`mobile/apps/aafiya_pro/lib/screens/assistant_queue_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Permissions Enforced:**
  - `booking.manage_queue`: Queue visibility.
  - `booking.create`: New Booking action button visibility.
  - `booking.confirm_attendance`: Quick check-in & attend actions.
  - `booking.confirm`: Confirm pending appointments.
  - `patient.view_contacts`: Phone number masking/unmasking parity.
- **3 Sub-Tabs:** Waiting Room, Expected Check-In, Pending Confirmation.
- **Action Buttons:** `ElevatedButton` and `OutlinedButton` with 52dp minimum height.

#### C. BcAppointmentBookingScreen (`mobile/apps/aafiya_pro/lib/screens/bc_appointment_booking_screen.dart`)
- **Type:** Screen / 4-Step Wizard (`StatefulWidget`)
- **Steps:**
  - Step 1: Patient (Registered search vs Guest creation).
  - Step 2: Doctor & Clinic selection with capacity indicators.
  - Step 3: Date & Slot selection.
  - Step 4: Review & Quota Notice (transparent quota balance deduction warning).
- **Navigation Controls:** Previous Step (`OutlinedButton` 52dp), Next/Confirm (`ElevatedButton` 52dp).
- **Zero Quota Guard:** Blocks submission and warns user if balance is insufficient.

---

### 2. Test Verification Suite
- `test/assistant_booking_test.dart`
- `test/assistant_confirmation_test.dart`
- `test/assistant_cancellation_test.dart`
- `test/bc_booking_test.dart`
- `test/assistant_parity_test.dart`
- **Result:** **62/62 tests passing (100% success)**.
