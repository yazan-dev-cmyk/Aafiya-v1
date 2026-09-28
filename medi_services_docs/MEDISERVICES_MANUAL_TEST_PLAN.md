# MediServices Manual Test Plan (Functional & RBAC)

## 1. Introduction
This test plan outlines the manual verification steps required to ensure the MediServices platform adheres to all business requirements and functional specifications.

## 2. Test Environment
- **Platform:** Web Browser (Chrome/Safari/Firefox)
- **Roles:** All 11 defined roles
- **Build Status:** Success required

## 3. Test Suites

### TS-01: Authentication & Onboarding
- **TC-01.1:** Verify self-registration for Patient, Doctor, and Booking Center.
- **TC-01.2:** Verify that assistants (Doctor/Lab/Rad/Admin) cannot self-register.
- **TC-01.3:** Verify role-based redirection after login.

### TS-02: Booking Center Workflow (The 0-Deduction Rule)
- **TC-02.1:** Create a booking as a Booking Center. Check initial quota.
- **TC-02.2:** Confirm booking as a Doctor. Verify quota deduction (-1).
- **TC-02.3:** Reject booking as a Doctor. Verify quota remains unchanged (0 deduction).
- **TC-02.4:** Propose alternative date as a Doctor. Verify quota deduction (-1).

### TS-03: Medical Records (Privacy Wall)
- **TC-03.1:** Verify Booking Center cannot access Patient Medical Files.
- **TC-03.2:** Verify Doctor can access Patient EHR only during/after booking.
- **TC-03.3:** Verify Lab/Radiology can only see relevant order data, not full history.

### TS-04: Assistant RBAC (Delegation)
- **TC-04.1:** Log in as Doctor Assistant. Verify access to "Waiting Room" but restricted "Settings".
- **TC-04.2:** Log in as Lab Assistant. Verify ability to upload results but not manage lab packages.
- **TC-04.3:** Log in as Admin Assistant. Verify access to "User Management" but not "System Settings" or "Security Logs".

### TS-05: Simulation & Specs
- **TC-05.1:** Open "Architecture Spec Viewer". Verify all 30 chapters are listed.
- **TC-05.2:** Open "Business Rules Simulator". Run a full cycle (Booking -> Approval -> Outcome).

## 4. Acceptance Criteria
- 100% of Role-based redirections work as specified.
- Quota deduction logic matches the "0-deduction" business rule.
- Assistant restrictions are strictly enforced.
