# MediServices Frontend Final State (Ground Truth)

**Date:** August 11, 2026
**Version:** 1.0.0
**Project:** MediServices - Pre-Backend Final Verification

---

## 1. Phase 4: Final Role & Page Matrix

This matrix defines all supported roles and their corresponding primary UI entry points.

| Role ID | Role Name (Ar) | Dashboard Component | Description |
| :--- | :--- | :--- | :--- |
| `patient_registered` | مريض مسجل | `PatientDashboard` | Full health record, history, and booking |
| `patient_guest` | مريض زائر | `PatientDashboard` | Limited view, booking via codes only |
| `doctor` | طبيب / عيادة | `DoctorDashboard` | Patient management, e-prescribing, lab/rad requests |
| `doctor_assistant` | مساعد طبيب | `DoctorAssistantDashboard` | Queue management, scheduling, document scanning |
| `booking_center` | مركز حجز | `BookingCenterDashboard` | Institutional booking, quota management, ROI stats |
| `lab` | مدير مختبر | `LaboratoryDashboard` | Lab management, results approval, audit logs |
| `lab_assistant` | مساعد مختبر | `LabAssistantDashboard` | Sample reception, results entry, operational tasks |
| `radiology` | مركز أشعة | `RadiologyDashboard` | Imaging management, report approval, DICOM logs |
| `rad_assistant` | مساعد أشعة | `RadiologyAssistantDashboard` | Patient prep, safety checks, image/DICOM upload |
| `admin` | مدير المنصة | `PlatformAdminDashboard` | Platform configuration, ads, role management |
| `admin_assistant` | مساعد مدير المنصة | `PlatformAssistantDashboard` | Restricted RBAC-simulated administrative tasks |

---

## 2. Phase 5: Final Route Matrix

MediServices uses a state-driven navigation model (Next.js App Router). All major dashboards are implemented as standalone client-side applications within the `/app` structure or routed via `AuthModals`.

| Virtual Route | Component Path | Visibility |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Public |
| `/patient/dashboard` | `src/components/patient/PatientDashboard.tsx` | Patient Role |
| `/doctor/dashboard` | `src/components/doctor/DoctorDashboard.tsx` | Doctor Role |
| `/assistant/dashboard` | `src/components/assistant/DoctorAssistantDashboard.tsx` | Doctor Assistant |
| `/booking/dashboard` | `src/components/booking-center/BookingCenterDashboard.tsx` | Booking Center |
| `/laboratory/dashboard` | `src/components/laboratory/LaboratoryDashboard.tsx` | Lab Manager |
| `/laboratory/assistant-dashboard` | `src/components/laboratory/LabAssistantDashboard.tsx` | Lab Assistant |
| `/radiology/dashboard` | `src/components/radiology/RadiologyDashboard.tsx` | Radiology Manager |
| `/radiology/assistant-dashboard` | `src/components/radiology/RadiologyAssistantDashboard.tsx` | Radiology Assistant |
| `/admin/dashboard` | `src/components/admin/PlatformAdminDashboard.tsx` | Platform Admin |
| `/admin/assistant-dashboard` | `src/components/admin/PlatformAssistantDashboard.tsx` | Admin Assistant |

---

## 3. Phase 6: Final Business Rules Freeze

The following core business rules are strictly implemented in the Frontend logic:

### 3.1 Booking & Quota Engine (The 0-Deduction Rule)
- **Rule:** Quota is only deducted when the **Doctor** confirms the booking.
- **Rule:** If a booking is rejected by the center or doctor, 0 units are deducted.
- **Rule:** "Alternative Date" proposals do not deduct quota until accepted by the patient and confirmed.
- **Rule:** Package exhaustion results in a "Service Suspended" state for Booking Centers.

### 3.2 Assistant Delegation (RBAC Simulation)
- **Rule:** Assistants cannot approve final medical reports (Lab/Radiology).
- **Rule:** Assistants cannot modify platform-wide financial settings.
- **Rule:** Assistant accounts are institution-scoped (linked to a Manager/Doctor).

### 3.3 Document Integrity (Medi-Protocol)
- **Rule:** All generated documents (Prescriptions, Lab Orders, Rad Orders) must include a QR Code following the `MEDI://TYPE/ID` protocol.
- **Rule:** Document Scanner (`DocumentScanner.tsx`) must support real-time validation of these protocols.

### 3.4 Advertising System Rules
- **Rule:** Ads are categorized by `Audience` (Public, Professional, Institutional).
- **Rule:** Ad placement is dynamic (Header, Sidebar, Dashboard Top).
- **Rule:** Only Platform Admins can create/manage advertisements.
- **Rule (Privilege):** Automated 14-day free campaign for newly approved doctors/clinics.

---

## 4. Phase 1: Advertising System Implementation Status

- **Status:** COMPLETED
- **Interfaces:** `src/types/advertisement.ts`
- **Mock Data:** `src/data/advertisementData.ts`
- **Management UI:** `src/components/admin/AdvertisementManagement.tsx`
- **Integration:** Integrated into `PlatformAdminDashboard.tsx`.

---

## 5. Final Audit Summary

- **UI/UX Consistency:** Verified (Slate/Blue/Teal palette).
- **Responsiveness:** Verified (Tailwind Grid/Flex).
- **Functional Completeness:** 100% (All 11 roles verified).
- **Navigation Integrity:** Fixed (Assistant redirections corrected in turn 3).

**APPROVED FOR BACKEND TRANSITION**
