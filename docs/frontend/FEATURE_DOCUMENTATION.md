# FEATURE DOCUMENTATION — AAFIYA

## 1. Feature Matrix
This matrix maps implemented frontend features to their routes, components, and current simulation status.

| Feature | Route | Key Component | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **RBAC Simulation** | Global | `AuthModals.tsx` | IMPLEMENTED | 11 roles supported. |
| **Booking Engine** | `/booking/dashboard` | `NewBookingWizardTab.tsx` | SIMULATED | 0-Deduction logic. |
| **Quota Management** | `/booking/dashboard` | `PackagesQuotaTab.tsx` | SIMULATED | Quota bar & depletion info. |
| **EHR Patient Identity** | `/patient/dashboard` | `PatientDashboard.tsx` | IMPLEMENTED | QR/UUID generation. |
| **Clinical Queue** | `/doctor/dashboard` | `DoctorDashboard.tsx` | SIMULATED | Triage status transitions. |
| **E-Prescription** | `/doctor/dashboard` | `EPrescriptionsTab.tsx` | SIMULATED | Digital signature UI. |
| **Ad Management** | `/admin/dashboard` | `AdvertisementManagement.tsx` | IMPLEMENTED | Category & placement UI. |
| **Institutional ROI** | `/` | `PackageCalculator.tsx` | IMPLEMENTED | Cost/Benefit math on client. |
| **QR Scan/Verify** | Shared | `DocumentScanner.tsx` | SIMULATED | `MEDI://` protocol decoding. |
| **Lab/Rad Workflow** | `/laboratory/*` | `LaboratoryDashboard.tsx` | SIMULATED | Intake & Reporting views. |

## 2. Feature Descriptions

### 2.1 0-Deduction Booking Engine
A core Algerina healthcare optimization feature.
- **Logic:** Allows booking centers to reserve slots without immediate quota deduction if certain institutional criteria are met.
- **Implementation:** Multistep wizard with validation checks.

### 2.2 MEDI:// Protocol
A standardized clinical link format.
- **Purpose:** Securely link physical QR codes to digital medical records.
- **Implementation:** Decoded via a dedicated utility that maps protocol strings to mock data entities.

### 2.3 ROI Package Calculator
Marketing tool for institutional stakeholders.
- **Purpose:** Calculate savings and efficiency gains from Algerian health packages.
- **Implementation:** Dynamic inputs triggering client-side math.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
