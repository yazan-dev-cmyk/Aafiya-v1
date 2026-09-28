# ROLE DOCUMENTATION — AAFIYA

## 1. Overview
Aafiya implements a multi-role simulation system. While backend authentication is pending (P11), the frontend provides distinct dashboard implementations for 11 roles, each with its own navigation, modules, and functional simulators.

## 2. Role Catalog

| Role | Dashboard Component | Route | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Patient** | `PatientDashboard` | `/patient/dashboard` | EHR access, appointment history. |
| **Doctor** | `DoctorDashboard` | `/doctor/dashboard` | EMR, Prescriptions, Diagnostics. |
| **Doctor Assistant** | `DoctorAssistantDashboard` | `/assistant/dashboard` | Queue management, triage. |
| **Booking Center** | `BookingCenterDashboard` | `/booking/dashboard` | Unified hub, 0-deduction booking. |
| **Lab Manager** | `LaboratoryDashboard` | `/laboratory/dashboard` | Test validation, reporting. |
| **Lab Assistant** | `LabAssistantDashboard` | `/laboratory/assistant-dashboard` | Sample collection, intake. |
| **Rad Manager** | `RadiologyDashboard` | `/radiology/dashboard` | Imaging reports, DICOM. |
| **Rad Assistant** | `RadiologyAssistantDashboard` | `/radiology/assistant-dashboard` | Patient intake, scan prep. |
| **Admin Assistant** | `PlatformAssistantDashboard` | `/admin/assistant-dashboard` | Content management, support. |
| **Platform Admin** | `PlatformAdminDashboard` | `/admin/dashboard` | System governance, verification. |

## 3. Implementation Pattern
Every dashboard follows a unified structural pattern:

1. **Shell:** `DashboardLayout.tsx` providing the sidebar and top bar.
2. **State:** Local `activeTab` state manages sub-module visibility.
3. **Mock Data:** Localized data (e.g., `INITIAL_WAITING_QUEUE`) populates the UI.
4. **Interactions:** "Simulators" (Modals) are used to represent cross-role data flow.

## 4. Role Navigation Logic
Roles are currently managed via the `AuthModals.tsx` component, which stores the selected role in local state and redirects to the appropriate route.

---
**Status:** FRONTEND ROLE SIMULATION ONLY. NO BACKEND ENFORCEMENT.
