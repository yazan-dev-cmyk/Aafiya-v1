# FRONTEND-BACKEND BOUNDARY — AAFIYA

## 1. Current State: Frontend Simulation
As of the current Freeze Baseline, Aafiya is a **high-fidelity frontend simulation**. All complex healthcare logic is implemented on the client-side to demonstrate the user experience and architectural feasibility.

## 2. Mock vs. Real Boundaries

| Domain | Frontend Implementation (Real) | Backend Requirement (Pending P11) |
| :--- | :--- | :--- |
| **Authentication** | UI Modals, Role Redirection logic. | Laravel Breeze/Fortify, JWT/Session tokens. |
| **Authorization** | Conditional tab rendering based on `role`. | RBAC middleware, Spanner-based permission checks. |
| **Booking Engine** | 0-Deduction UI logic, Quota decrement simulation. | Transactional booking logic, Quota DB locks. |
| **Clinical Records** | EHR Display, QR Code generation (Client). | Document storage, Audit logging, Spanner queries. |
| **Search** | Filtered array methods on mock data. | Full-text search (Elasticsearch or Database indexing). |
| **Notifications** | Local array of alerts. | Real-time events (WebSockets/Pusher), DB persistence. |
| **Ad System** | Random/Priority selection from mock ads. | Ad performance tracking, Billing, Targeting logic. |

## 3. Data Flow Simulation
- **Current:** Component -> Local State -> Mock Data import.
- **P11 Target:** Component -> React Query/Fetch -> Laravel API -> Cloud Spanner.

## 4. Key Simulated Processes
- **`MEDI://` Protocol:** Decoded locally in `DocumentScanner.tsx` using hardcoded string mapping.
- **Institutional Billing:** Quota depletion is calculated in `BookingCenterDashboard` but reset on refresh.
- **Reception Queue:** Triage status shifts (Waiting -> In Progress) are local state transitions.

## 5. Security & Persistence
- **Security:** There is currently **no backend validation**. All dashboard routes are accessible if the URL is known.
- **Persistence:** No data is saved to a database. All changes are transient.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
