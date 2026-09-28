# ROUTE DOCUMENTATION — AAFIYA

## 1. Route Map
This table lists all verified routes found in the actual repository.

| Route | Page File | Role | Access | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Public | Public | [LIVE] |
| `/patient/dashboard` | `src/app/patient/dashboard/page.tsx` | Patient | Protected | [LIVE] |
| `/doctor/dashboard` | `src/app/doctor/dashboard/page.tsx` | Doctor | Protected | [LIVE] |
| `/assistant/dashboard` | `src/app/assistant/dashboard/page.tsx` | Doctor Assistant | Protected | [LIVE] |
| `/booking/dashboard` | `src/app/booking/dashboard/page.tsx` | Booking Center | Protected | [LIVE] |
| `/laboratory/dashboard` | `src/app/laboratory/dashboard/page.tsx` | Lab Manager | Protected | [LIVE] |
| `/laboratory/assistant-dashboard` | `src/app/laboratory/assistant-dashboard/page.tsx` | Lab Assistant | Protected | [LIVE] |
| `/radiology/dashboard` | `src/app/radiology/dashboard/page.tsx` | Radiology Manager | Protected | [LIVE] |
| `/radiology/assistant-dashboard` | `src/app/radiology/assistant-dashboard/page.tsx` | Radiology Assistant | Protected | [LIVE] |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Platform Admin | Protected | [LIVE] |
| `/admin/assistant-dashboard` | `src/app/admin/assistant-dashboard/page.tsx` | Admin Assistant | Protected | [LIVE] |

## 2. Route Descriptions

### 2.1 Landing Page (`/`)
- **Purpose:** Primary marketing and entry point.
- **Key Sections:** Hero, Features, Why Us, Faq, Cta.
- **Interactions:** "Join" button triggers `AuthModals.tsx` for role selection.

### 2.2 Patient Dashboard (`/patient/dashboard`)
- **Purpose:** Personal EHR access and appointment tracking.
- **Main View:** Medical file summary, QR code identity, activity log.

### 2.3 Doctor & Assistant Dashboards
- **Routes:** `/doctor/dashboard`, `/assistant/dashboard`.
- **Purpose:** Clinical queue management, EMR access, and prescriptions.
- **Assistant Distinction:** Focuses on queue triage and patient reception.

### 2.4 Booking Center (`/booking/dashboard`)
- **Purpose:** Unified booking hub and quota management.
- **Key Feature:** "0-Deduction" simulator for Algerian healthcare optimization.

### 2.5 Laboratory & Radiology
- **Routes:** `/laboratory/*`, `/radiology/*`.
- **Purpose:** Diagnostic request fulfillment and result reporting.
- **Workflow:** Split between Manager (approval/reporting) and Assistant (intake/testing).

### 2.6 Platform Admin (`/admin/*`)
- **Purpose:** System-wide governance.
- **Modules:** Advertisement management, institutional verification, platform assistant permissions.

---
**Note:** All protected routes currently utilize a **Frontend Role Simulation** via the `AuthModals.tsx` component. Backend authentication middleware is pending P11 implementation.
