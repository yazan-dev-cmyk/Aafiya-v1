# MOCK DATA DOCUMENTATION — AAFIYA

## 1. Overview
The Aafiya frontend currently operates using a comprehensive set of mock data located in `src/data/`. This data simulates real-world healthcare entities and relationships, enabling full role-based dashboard functionality without a live backend.

## 2. Core Data Files & Entities

### 2.1 Doctor Dashboard Data (`src/data/doctorDashboardData.ts`)
Simulates the clinical environment for doctors and their assistants.
- **`INITIAL_WAITING_QUEUE`**: List of patients currently in the clinic, with status (Waiting, In Progress, Completed, Cancelled).
- **`INITIAL_APPOINTMENTS`**: Scheduled consultations for the day.
- **`INITIAL_NOTIFICATIONS`**: Clinical and system alerts (e.g., "Lab results ready").
- **`INITIAL_EPRIZES` / `INITIAL_LAB_REQUESTS`**: Historical data for prescriptions and diagnostics.

### 2.2 Booking Center Data (`src/data/bookingCenterData.ts`)
Simulates the administrative hub for third-party booking centers.
- **`INITIAL_PACKAGE_DETAILS`**: Quota management for "0-Deduction" Algeria-specific institutional billing.
- **`INITIAL_BOOKINGS`**: Global booking log with cross-wilaya and cross-specialty tracking.
- **`INITIAL_PATIENTS`**: Unified patient directory (UUID-based).
- **`INITIAL_EMPLOYEES`**: Staff management for the booking center.
- **`INITIAL_AUDIT_LOGS`**: Administrative transparency logs.
- **`INITIAL_INVOICES`**: Financial records for package purchases.
- **`MOCK_DOCTORS_SEARCH`**: Searchable index of doctors available for external booking.

### 2.3 Advertisement Data (`src/data/advertisementData.ts`)
Simulates the platform-wide advertisement system.
- **`ADVERTISEMENT_CATEGORIES`**: Classification (Pharma, Devices, Insurance, Clinics, Wellness).
- **`MOCK_ADS`**: Ad entities with placement rules (Dashboard, Sidebar, Header), priority, and performance metrics (Views, Clicks).

### 2.4 Marketing Content (`src/data/content.ts`)
- Static text, landing section descriptions, FAQs, and stakeholder benefit matrices.

## 3. Data Relationships (Simulated)
- **Patient UUID:** Used as a foreign key across `BookingRecord`, `PatientDashboard`, and `MedicalRecord`.
- **Doctor ID:** Links bookings to specific clinic schedules and clinical queues.
- **Role Redirection:** Maps user selection to specific dashboard routes.

## 4. Entity Structure Example
```typescript
interface BookingRecord {
  id: string;
  refNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected' | 'rescheduled';
  // ... other fields
}
```

## 5. Implementation Status
- **Status:** **STATIC MOCK**
- **Persistence:** None (State is held in local React state, reset on refresh).
- **Backend Replacement:** All imports from `src/data/` must be replaced by API calls to the Laravel backend in P11.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
