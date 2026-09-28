# MediServices Final Business Rules (Frontend Freeze)

This document represents the official business logic implemented and verified in the MediServices Frontend. These rules must be strictly followed during Backend implementation.

## 1. Global Platform Rules
- **Language:** Default language is Arabic (RTL). English support is secondary.
- **Branding:** Strict adherence to the Slate/Blue/Teal palette.
- **Access Control:** 11 distinct roles are supported via state-based RBAC simulation.

## 2. Advertising Rules (Phase 1)
- **Rule AD-01:** Only Platform Admins can create or manage advertisements.
- **Rule AD-02:** Ads MUST have a start date and end date.
- **Rule AD-03:** Ads target specific audiences: Patients, Doctors, Lab Staff, Rad Staff, or Booking Agents.
- **Rule AD-04:** Doctor-facing ads can be targeted by medical specialty.
- **Rule AD-05:** Placement is restricted to non-clinical areas (Dashboards, Home, Booking Center) to maintain clinical focus.
- **Rule AD-06 (New Privilege):** Upon official approval of a new Doctor/Clinic account, the platform automatically grants a "Free Welcome Ad" for 14 days targeted at Patients in the same city/specialty domain.

## 3. Booking & Financial Rules
- **Rule BK-01:** Quota deduction only occurs upon **Doctor Confirmation**.
- **Rule BK-02:** Booking Centers cannot see cross-platform doctor statistics; only their own institutional performance.
- **Rule BK-03:** "Alternative Date" proposals by doctors require patient re-confirmation before finalizing.
- **Rule BK-04:** Package status (Active/Suspended) is determined by remaining units vs. minimum threshold.

## 4. Medical Workflow Rules (Medi-Protocol)
- **Rule MED-01:** Every prescription/order MUST have a valid QR code following `MEDI://{TYPE}/{ID}`.
- **Rule MED-02:** Lab/Radiology Assistants can enter data but CANNOT perform "Final Approval" (reserved for Managers).
- **Rule MED-03:** DICOM viewers are mandatory for Radiology workflows.
- **Rule MED-04:** Digital signatures are simulated via a "SECURE VERIFIED" stamp on all medical documents.

## 5. Security & Audit Rules
- **Rule SEC-01:** Assistant accounts are linked to a parent institution/doctor and cannot exist independently.
- **Rule SEC-02:** All sensitive actions (e.g., deleting a patient, approving a report) must be logged in the "Activity Logs" tab.
