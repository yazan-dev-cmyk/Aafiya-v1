# P10/P11 ALIGNMENT — AAFIYA

## 1. Overview
This document aligns the current Frontend Baseline with the approved **P10 Backend Architecture Specification**. It serves as a bridge for the **P11 Laravel Implementation** phase.

## 2. Structural Alignment

### 2.1 Domain Mapping
The frontend directory structure maps directly to the proposed backend service domains:
- `src/components/doctor/` -> **Clinical Service** (EMR, Prescriptions).
- `src/components/booking-center/` -> **Booking Service** (Quota, 0-Deduction).
- `src/components/admin/` -> **Platform Service** (Ads, RBAC).

### 2.2 Data Contract Alignment
Current Types defined in `src/types/` (e.g., `PatientRecord`, `BookingRecord`, `MedicalRecord`) are designed to match the P1 database schemas.

## 3. P11 Integration Preparation

### 3.1 Authentication
- **Current:** `AuthModals.tsx` handles redirection.
- **P11 Plan:** Integrate with Laravel Sanctum/Socialite. Redirects will remain, but `User` context will come from the backend.

### 3.2 Role-Based Access Control (RBAC)
- **Current:** Manual `selectedRole` state.
- **P11 Plan:** Backend will return a `permissions` array. Frontend `Sidebar` and `DashboardLayout` must be updated to filter items based on these real permissions.

### 3.3 The "0-Deduction" Logic
- **Current:** Client-side validation in `NewBookingWizardTab.tsx`.
- **P11 Plan:** Move core logic to Laravel Service Layer. Frontend will call `/api/bookings/validate` before submission.

## 4. API Boundaries
The following API endpoints are expected based on current frontend needs:
- `GET /api/user/profile` (Context for all dashboards).
- `GET /api/booking-center/quota` (Package status).
- `POST /api/clinical/prescribe` (Doctor workflow).
- `GET /api/platform/ads` (Ad system).

## 5. Migration Risks
- **Mock Data Divergence:** Real DB schemas in P11 might include fields not currently in mock data (e.g., `created_at` timestamps, `deleted_at` for soft deletes).
- **Latency:** Frontend currently assumes 0ms latency. P11 must implement skeleton loaders and optimistic updates.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
