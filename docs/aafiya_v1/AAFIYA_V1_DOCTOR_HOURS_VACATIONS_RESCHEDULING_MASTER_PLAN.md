---
Document: AAFIYA V1 Doctor Working Hours, Vacations & Rescheduling Master Plan
Initiative: Doctor Working Hours, Operating Hours, Vacations & Concurrency Engine
Task ID: PHASE-1-NEW-PLAN-TRACKER-01
Status: PHASE 2 — DESIGN AND PLANNING DOCUMENTATION CLOSED / IMPLEMENTATION PENDING AUTHORIZATION
Created At: 2026-10-09 11:30 CET
Updated At: 2026-10-10 14:15 CET
Source/Basis: Forensic Repository Audit + Approved Business Decisions (DEC-SLOT-01 to DEC-AUTH-01, DEC-GAP-01 to DEC-GAP-04)
Scope: Architectural Specification & Implementation Planning Only
Implementation Authorized: NO (Strictly Zero Mutation)
Target Lifecycle Phase: Phase 2 Closure / Phase 3 Implementation Pending Authorization
---

# AAFIYA V1 — Doctor Working Hours, Vacations & Rescheduling Master Plan

---

## 1. Purpose, Scope, Exclusions, and Governing Principles

### 1.1 Purpose
This document establishes the authoritative, independent Master Implementation Plan for the **Doctor Working Hours, Clinic Operating Hours, Doctor Vacations, Cross-Clinic Concurrency Exclusivity, Automated Rescheduling Engine, and Notification Recovery** initiative in the AAFIYA V1 platform.

### 1.2 In-Scope Work
1. **Fixed Non-Overlapping Hourly Slots & Active Slot Booking**: Enforcement of 10 discrete hourly slots (`08:00`–`17:00`). Booking is permitted within an active slot while `slot_end > now('Africa/Algiers') AND available_capacity > 0` (`DEC-GAP-01`). Daily pending appointments expiring at midnight `00:00 Africa/Algiers` with zero quota refund invariant (`DEC-GAP-02`).
2. **Single Authoritative Capacity Source of Truth**: Unified capacity tracking preserving `appointment_slots.booked_count` as the sole persisted counter and serialization lock anchor for same-clinic capacity (1..10 patients).
3. **Cross-Clinic Time Exclusivity**: Enforcing that a doctor cannot be concurrently scheduled across two different clinics at the same hour via an ownership anchor (`doctor_time_reservations` with NO redundant capacity counter).
4. **Existing Data Inconsistency Strategy**: Audit procedures, safe detection queries, and non-destructive recovery proposals for potential slot/appointment discrepancies (zero automated mutations).
5. **Doctor & Clinic Operating Hours Hierarchy**: Explicit separation between clinic operating hours and doctor working hours, prohibiting unapproved default seeders.
6. **Operating Hours Policy (`DEC-HOURS-03`)**: Strict enforcement requiring full clinic operating hours configuration before accepting new bookings (`CLINIC_SCHEDULE_NOT_CONFIGURED`), with cancellation of grace periods and zero assumed default seeders.
7. **Doctor Vacations with Immediate Effectiveness**: Autonomous vacation registration by doctors taking immediate effect without Clinic Director approval gates.
8. **Automated Rescheduling Engine & 7-Day Restoration Horizon**: Immediate background relocation of occupying appointments within $[D_{\text{end}} + 1\text{ day}, D_{\text{end}} + 30\text{ days}]$ in `Africa/Algiers`. Automated restoration search horizon is strictly $[T_{\text{init}}, T_{\text{end\_local\_midnight}})$ (7 calendar days in `Africa/Algiers`, exclusive of midnight at start of 8th day).
9. **Traceability Ledger, Option B for Failed Restoration & Partial Success Visibility**: Per-appointment outcome tracking in `vacation_appointment_reschedules`. Under Option B, if restoration fails within the 7-day horizon, release alternative slot reservation, record outcome as unresolved in ledger, notify patient to contact booking center, return quota to booking center under verified rules, booking center must provide replacement without new patient fee, retaining complete auditable links (`DEC-GAP-03`).
10. **Crash Recovery & Idempotency**: Atomic database transactions binding appointment transfer, slot counter updates, and ledger outcome records to guarantee safe queue retries.
11. **Transactional Notification Outbox & In-App Delivery Acknowledgment**: Decoupled patient notification dispatching via `notification_outbox`, in-app notifications with read/acknowledgment status and staff operational follow-up (`DEC-GAP-04`). External SMS gateway integration and carrier DLR receipts treated as future external architecture prerequisites.
12. **4D Authorization & Inter-Clinic Isolation**: Tenant isolation via `X-Clinic-ID` header, zero director veto over vacations, and cross-clinic appointment masking.

### 1.3 Out-of-Scope Exclusions & Scope Reconciliations
- **Direct Patient Booking in Mobile (`DISC-01` / `DEC-GAP-D01`)**: Mobile patient application remains view-only for appointments; self-scheduling remains excluded (`fail-closed` production policy).
- **Doctor Mobile EHR Authoring (`DISC-02`)**: Clinical notes, visit charting, and prescription writing remain web-only.
- **Mobile Administrative Tools & Advanced Management (`DISC-03` / `DEC-POL-01`)**: Pursuant to authoritative human decision `DEC-POL-01 = OPTION B`, advanced professional management (Doctor Weekly Working Hours, Doctor Vacations, Unresolved Reschedules Dashboard, and Clinic Operating Hours) is brought into the Flutter Pro scope for Web ↔ Mobile parity. Global platform system administration remains web-only.
- **Patient Appointment Cancellation Policy (`DEC-POL-02`)**: Pursuant to authoritative human decision `DEC-POL-02 = APPROVED`, patient cancellation is permitted until appointment start time in V1 without imposing any new artificial minimum cutoff window.
- **Third-Party SMS Gateway Direct Integrations**: External SMS HTTP integrations inside transactions are strictly prohibited. Notifications route to the outbox table.

### 1.4 Governing Principles
- **Strict Verification Over Invention**: Architectural decisions are grounded in actual repository source code and database migrations.
- **Zero Silent Data Mutations**: Existing database records are never modified, backfilled, or repaired without explicit human sign-off.
- **Canonical Lock Ordering**: Multi-row database locks are ordered deterministically to eliminate deadlocks.
- **Human Verification Gate**: Progression across lifecycle boundaries requires automated test passage and explicit human authorization.

---

## 2. Source-of-Truth Rules and Document Ownership

### 2.1 Independence from Legacy Master Plan
The pre-existing `docs/aafiya_v1/MASTER_PLAN.md` governs earlier platform foundation and mobile workspace scaffolds. It is **not** repurposed or overwritten. This document is the **sole authoritative Master Plan** for the Doctor Working Hours, Vacations, and Rescheduling initiative.

### 2.2 Traceability Hierarchy
```text
┌────────────────────────────────────────────────────────────────────────┐
│  Approved Business Decisions (DEC-SLOT-01 .. DEC-AUTH-01)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Governs
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Initiative Master Plan (This Document)                                │
│  - Architecture Specifications & Work Packages (WP-01 .. WP-16)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Maps to
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Initiative Execution Tracker (EXECUTION_TRACKER.md)                   │
│  - Granular Tasks (TASK-DWH-01 .. TASK-DWH-16)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Verifies via
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Requirement-to-Test Matrix (TC-SLOT-01 .. TC-HOURS-02)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Verified Current-State Baseline and Evidence

The following technical facts have been verified by inspecting the repository:

### 3.1 Slot Capacity & Concurrency Control
- **`appointment_slots` Schema**: Created in [`2026_09_09_170000_create_slot_control_and_appointment_sequences_tables.php:L17-L29`](file:///home/yazan/Downloads/Medi/mediservices/backend/database/migrations/2026_09_09_170000_create_slot_control_and_appointment_sequences_tables.php#L17-L29). Fields: `id`, `clinic_id`, `doctor_id`, `appointment_date`, `time_slot`, `capacity` (default 10), `booked_count` (default 0). Unique constraint: `UNIQUE(clinic_id, doctor_id, appointment_date, time_slot)`.
- **Cross-Clinic Concurrency Vulnerability**: Because `appointment_slots` has `clinic_id` in its unique constraint, separate rows exist for `(Clinic A, Doctor D, Date, Slot)` and `(Clinic B, Doctor D, Date, Slot)`. Two concurrent transactions can lock both rows simultaneously without lock contention, permitting double-booking across clinics.
- **Fixed Hourly Slots Enforcement**:
  - `BookingService::ALLOWED_HOURLY_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']` ([`BookingService.php:L19-L22`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L19-L22)).
  - Enforced in `BookingService::book()` ([`BookingService.php:L107-L111`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L107-L111)) and `BookingService::rescheduleAppointment()` ([`BookingService.php:L517-L521`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L517-L521)).
  - FormRequest layer gap: `CreateAppointmentRequest.php:L29` and `RescheduleAppointmentRequest.php:L21` only validate `'time_slot' => ['required', 'string', 'max:5']`, relying on the service layer for whitelist validation.
- **Appointment Status Occupancy Partitioning**:
  - `Appointment::OCCUPYING_STATUSES = ['pending', 'confirmed', 'attended', 'no_show']` ([`Appointment.php:L42`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Models/Appointment.php#L42)).
  - `Appointment::NON_OCCUPYING_STATUSES = ['cancelled', 'rejected', 'expired', 'rescheduled']` ([`Appointment.php:L43`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Models/Appointment.php#L43)).
  - `BookingService::book()` and `rescheduleAppointment()` increment target slot `booked_count` and decrement old slot `booked_count`.
- **Existing Capacity Calculation**:
  - `BookingService::getAvailableSlots()` calculates occupied count as `max((int) $slotRow->booked_count, $activeCount)` ([`BookingService.php:L709`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L709)).
  - Configured capacity hierarchy: `doctor_clinic.max_patients_per_slot` (1..10) overrides `clinics.max_patients_per_slot` (default 10) ([`BookingService.php:L33-L43`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L33-L43)).
- **Canonical Lock Ordering**:
  - `BookingService::rescheduleAppointment()` sorts composite slot keys lexicographically before locking to prevent deadlocks ([`BookingService.php:L556-L596`](file:///home/yazan/Downloads/Medi/mediservices/backend/app/Services/BookingService.php#L556-L596)).
- **Doctor Working Hours & Vacations**:
  - Completely absent from schema: zero tables exist for `doctor_working_hours`, `clinic_operating_hours`, `doctor_vacations`, or `vacation_appointment_reschedules`.
- **Notification Infrastructure**:
  - Zero SMS packages in `backend/composer.json`. No transactional outbox table exists.

---

## 4. Approved Decision Register

The following 20 decisions have been approved by human authority:

| Decision ID | Classification | Title | Core Rule |
| :--- | :--- | :--- | :--- |
| **`DEC-SLOT-01`** | `USER-APPROVED` | Fixed Hourly Slots | Strict hourly slots (`08:00`..`17:00`). Sliding windows (e.g. `09:30–10:30`) prohibited. Refined by `DEC-GAP-01` for active-slot boundary. |
| **`DEC-CAP-01`** | `USER-APPROVED` | Single Capacity Source of Truth | Exactly ONE authoritative capacity counter (`appointment_slots.booked_count`). No redundant counters. |
| **`DEC-DATA-01`** | `USER-APPROVED` | Zero Automatic Data Mutation | Inconsistencies require audit, proposal, rollback plan, and human approval before running repair SQL. |
| **`DEC-VAC-01`** | `USER-APPROVED` | Immediate Vacation Effectiveness | Vacations take effect immediately upon doctor registration. Clinic Director approval is NOT a prerequisite. Refined with two-stage lifecycle. |
| **`DEC-VAC-02`** | `USER-APPROVED` | Unresolved Reschedules Marked Urgent | Appointments lacking replacement slots are marked `urgent_unresolved`. Vacation stays effective. Zero silent cancellations. |
| **`DEC-VAC-03`** | `USER-APPROVED` | 30-Day Search Horizon & 7-Day Restoration | Initial post-vacation search horizon $[D_{\text{end}} + 1, D_{\text{end}} + 30]$ in `Africa/Algiers`. Automated restoration fallback search horizon strictly 7 calendar days $[T_{\text{init}}, T_{\text{end\_local\_midnight}})$. |
| **`DEC-VAC-04`** | `USER-APPROVED` | Vacation Scope Snapshot | Vacations apply only to clinic affiliations selected at creation. New affiliations do not inherit past vacations. |
| **`DEC-VAC-05`** | `USER-APPROVED` | Preserve Completed Reschedules & Option B | Successfully moved appointments remain at new slots; never auto-reverted if vacation is edited or cancelled. Unresolved cases governed by Option B (`DEC-GAP-03`). |
| **`DEC-VAC-06`** | `USER-APPROVED` | Partial Success Visibility | Rescheduling tracked per-appointment; failed transfers remain visible in operational dashboard. |
| **`DEC-VAC-07`** | `USER-APPROVED` | Worker Crash Recovery & Idempotency | Combined DB transaction for appointment move + slot counter + ledger outcome record ensures safe queue retries. |
| **`DEC-NOT-01`** | `USER-APPROVED` | Transactional Notification Outbox | Notifications written to outbox after DB commit; async retry with admin escalation upon exhaustion. Refined by `DEC-GAP-04`. |
| **`DEC-HOURS-01`**| `USER-APPROVED` | Operating Hours Defaults Rejected | Standard hours (`Sun–Thu 08–12 & 13–17`) rejected as immutable defaults; no automated default seeders. |
| **`DEC-HOURS-02`**| `USER-APPROVED` | Operating vs Working Hours Hierarchy | Clinic operating hours and doctor working hours are distinct; doctor hours must fall within clinic hours. |
| **`DEC-HOURS-03`**| `USER-APPROVED` | Unconfigured Operating Hours Policy (Strict Enforcement) | Approved 2026-10-11: Strict Enforcement. The previously contemplated 30-day grace period and `unconfigured` enum status are cancelled. Clinics without configured operating hours must not accept new bookings (`CLINIC_SCHEDULE_NOT_CONFIGURED`). Automated default seeders prohibited (`DEC-HOURS-01`). Implementation and production deployment timing require separate authorization. |
| **`DEC-CONC-01`** | `USER-APPROVED` | Cross-Clinic Doctor Time Exclusivity| Doctor cannot be scheduled across two different clinics at the same hour. |
| **`DEC-AUTH-01`** | `USER-APPROVED` | Clinic Isolation & Zero Director Veto | Doctor owns vacation; Director has zero veto; Director visibility isolated to own clinic. |
| **`DEC-GAP-01`** | `USER-APPROVED` | Booking Within Active Slot | Supersedes strict `slot_start > now`. Booking permitted after slot start while `slot_end > now('Africa/Algiers') AND available_capacity > 0`. Once `slot_end` reached, booking blocked. |
| **`DEC-GAP-02`** | `USER-APPROVED` | Daily Pending Expiry at Midnight | Daily scheduled task at `00:00 Africa/Algiers` expires pending appointments where slot interval ended (`slot_end <= now('Africa/Algiers')`). Quota refund invariant: zero refund for pending appointments without prior quota deduction. |
| **`DEC-GAP-03`** | `USER-APPROVED` | Atomic Capacity & Quota Accounting (Option B) | If automated restoration fails within 7-day window: release alternative slot reservation, record unresolved status in ledger, notify patient to contact booking center, return quota to booking center, provide replacement without new patient fee, preserve complete auditable links. |
| **`DEC-GAP-04`** | `USER-APPROVED` | In-App Notification Acknowledgment & Future SMS Architecture | In-app notification with read/acknowledgment state and staff operational follow-up is the approved immediate design. Future SMS integration is an open architecture prerequisite (provider selection and external DLR receipt processing remain future work). |

---

## 5. Design Decisions Resolution & Implementation Prerequisites

### 5.1 Formal Resolution of Prior Open Decisions
All prior open architectural decisions have been formally resolved and approved by human authority:
1. **Operating Hours Transition Policy (`DEC-HOURS-03`)**: Resolved — Strict Enforcement approved on 2026-10-11 (cancelling prior Option C 30-day grace period, `unconfigured` enum status, and automatic transitions). Clinics without configured operating hours reject new bookings with `CLINIC_SCHEDULE_NOT_CONFIGURED` without fabricated default seeders (`DEC-HOURS-01`). Implementation and deployment timing subject to separate human authorization.
2. **Capacity & Reservation Architecture (`DEC-CAP-01`)**: Resolved — Single authoritative counter (`appointment_slots.booked_count`) with ownership-only `doctor_time_reservations` anchor approved.
3. **Crash Recovery Transaction Boundary (`DEC-VAC-07`)**: Resolved — Atomic transaction encompassing appointment transfer, slot counter updates, and ledger outcome record approved.
4. **Booking Within Active Slot (`DEC-GAP-01`)**: Resolved — Booking permitted while `slot_end > now('Africa/Algiers') AND available_capacity > 0`.
5. **Daily Pending Expiry at Midnight (`DEC-GAP-02`)**: Resolved — Scheduled task at `00:00 Africa/Algiers` expiring past pending appointments where `slot_end <= now` with zero quota refund invariant.
6. **Failed Restoration Handling (`DEC-GAP-03`)**: Resolved — Option B approved: alternative slot capacity released, ledger records unresolved outcome, patient notified to contact booking center, quota refunded to booking center, replacement guaranteed without extra fee, complete audit trail preserved.
7. **Delivery Verification & SMS Architecture (`DEC-GAP-04`)**: Resolved — In-app notification read/acknowledgment status with staff operational follow-up is approved for immediate implementation. External SMS provider selection and DLR receipts classified as future architecture prerequisite.

### 5.2 Remaining Prerequisites Prior to Phase 3 Implementation
The design phase (Phase 2) is formally closed. Implementation remains blocked until the following explicit prerequisites are satisfied:
1. **SMS Gateway Provider Selection**: Technical evaluation and contract selection for Algerian SMS gateway provider (deferred external architecture work).
2. **Explicit Human Implementation Authorization**: Human project owner must issue explicit command authorizing Phase 3 implementation before any code, migrations, or database mutations may begin.

---

## 6. Target Architecture Alternatives & Recommendations

### 6.1 Capacity Source of Truth & Cross-Clinic Exclusivity Architecture

#### Candidate Options Evaluated:
1. **Option A: Retain `appointment_slots` Counter Only**:
   - `appointment_slots.booked_count` tracks capacity.
   - Enforce cross-clinic exclusivity via a dynamic cross-clinic SQL query with table locks.
   - *Weakness*: MySQL table locks or gap locks across clinics create heavy contention and risk deadlocks.
2. **Option B: Purely Derived Capacity from `appointments`**:
   - Eliminate `booked_count` completely. Derive capacity via `SELECT COUNT(*) FROM appointments WHERE status IN ('pending', 'confirmed', 'attended', 'no_show')`.
   - *Weakness*: Under high concurrency, counting rows without locking a parent row permits phantom reads and over-booking unless the entire doctor or table is locked.
3. **Option C: Dedicated `doctor_time_reservations` Anchor with Second Capacity Counter**:
   - Introduce `doctor_time_reservations` with fields `(doctor_id, date, slot, clinic_id, active_occupying_count)`.
   - *Weakness*: Violates `DEC-CAP-01` by creating two independent authoritative counters that can drift out of sync.
4. **RECOMMENDED: Merged Option A/C (Single Counter + Ownership-Only Doctor Anchor)**:
   - **Single Capacity Counter**: Retain `appointment_slots.booked_count` as the sole authoritative capacity counter and row-lock anchor for same-clinic capacity (1..10).
   - **Doctor Time Ownership Anchor**: Introduce a lightweight table `doctor_time_reservations`:
     ```sql
     CREATE TABLE doctor_time_reservations (
         id CHAR(36) PRIMARY KEY,
         doctor_id CHAR(36) NOT NULL,
         appointment_date DATE NOT NULL,
         time_slot VARCHAR(5) NOT NULL,
         clinic_id CHAR(36) NOT NULL,
         created_at TIMESTAMP NULL,
         updated_at TIMESTAMP NULL,
         CONSTRAINT uniq_doctor_date_slot UNIQUE (doctor_id, appointment_date, time_slot),
         CONSTRAINT fk_dtr_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
         CONSTRAINT fk_dtr_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
     );
     ```
   - **How It Works**:
     - When booking at Clinic A:
       1. Lock/insert `doctor_time_reservations` for `(doctor_id, date, slot)`. If row does not exist, insert with `clinic_id = Clinic A`. If row exists and `clinic_id == Clinic A`, proceed. If row exists and `clinic_id != Clinic A`, throw `doctor_exclusive_clinic_conflict` (HTTP 422).
       2. Lock `appointment_slots` row for `(Clinic A, doctor_id, date, slot)`. Verify `booked_count < capacity`, then increment.
       3. Create `Appointment` record.
     - When appointment transitions to non-occupying status (`cancelled`, `rejected`):
       1. Decrement `appointment_slots.booked_count`.
       2. If `booked_count == 0` for that slot, delete or release `doctor_time_reservations` row.
   - **Why This Is Optimal**:
     - Zero duplicate capacity counters (100% compliant with `DEC-CAP-01`).
     - Absolute database-level cross-clinic exclusivity guaranteed by `UNIQUE(doctor_id, appointment_date, time_slot)`.
     - Preserves existing `appointment_slots` performance and indexing.

---

## 7. Data-Integrity and Recovery Strategy (`DEC-DATA-01`)

### 7.1 Policy: Zero Automated Mutations
In strict compliance with `DEC-DATA-01`, no automated migrations, seeders, or scripts will modify existing appointment or slot data during Phase 1 deployment.

### 7.2 Plausible Inconsistencies & Diagnostic Queries
Before enabling new constraints, the following read-only forensic queries must be run:

1. **Cross-Clinic Overlapping Bookings for Same Doctor**:
   ```sql
   SELECT a1.doctor_id, a1.appointment_date, a1.time_slot, 
          a1.clinic_id AS clinic_1, a1.id AS appt_1,
          a2.clinic_id AS clinic_2, a2.id AS appt_2
   FROM appointments a1
   JOIN appointments a2 ON a1.doctor_id = a2.doctor_id 
       AND a1.appointment_date = a2.appointment_date 
       AND a1.time_slot = a2.time_slot 
       AND a1.clinic_id != a2.clinic_id
       AND a1.status IN ('pending', 'confirmed', 'attended', 'no_show')
       AND a2.status IN ('pending', 'confirmed', 'attended', 'no_show')
       AND a1.id < a2.id
       AND a1.deleted_at IS NULL AND a2.deleted_at IS NULL;
   ```
2. **Slots Exceeding Configured Capacity**:
   ```sql
   SELECT clinic_id, doctor_id, appointment_date, time_slot, COUNT(*) as active_count
   FROM appointments
   WHERE status IN ('pending', 'confirmed', 'attended', 'no_show')
     AND deleted_at IS NULL
   GROUP BY clinic_id, doctor_id, appointment_date, time_slot
   HAVING active_count > 10;
   ```
3. **Drift Between `appointment_slots.booked_count` and Actual Active Appointments**:
   ```sql
   SELECT s.id, s.doctor_id, s.clinic_id, s.appointment_date, s.time_slot, s.booked_count,
          COUNT(a.id) AS actual_occupying
   FROM appointment_slots s
   LEFT JOIN appointments a ON a.clinic_id = s.clinic_id 
       AND a.doctor_id = s.doctor_id 
       AND a.appointment_date = s.appointment_date 
       AND a.time_slot = s.time_slot 
       AND a.status IN ('pending', 'confirmed', 'attended', 'no_show')
       AND a.deleted_at IS NULL
   GROUP BY s.id, s.doctor_id, s.clinic_id, s.appointment_date, s.time_slot, s.booked_count
   HAVING s.booked_count != actual_occupying;
   ```
4. **Appointments with Non-Standard Time Slots**:
   ```sql
   SELECT id, booking_reference, appointment_date, time_slot
   FROM appointments
   WHERE time_slot NOT IN ('08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00')
     AND deleted_at IS NULL;
   ```

### 7.3 Data-Preserving Recovery Proposal (Awaiting User Authorization)
If inconsistencies are identified:
- **Preconditions**: Complete mysqldump backup taken; maintenance window scheduled.
- **Cross-Clinic Overlaps**: Flag overlapping records for human review; do NOT delete. Contact clinic staff to determine which appointment took precedence.
- **Counter Drift**: Reconcile `appointment_slots.booked_count` to match `COUNT(active_occupying)` within a transactional script.
- **Rollback**: Snapshot tables into `_backup_pre_dwh` tables prior to running any approved reconciliation script.

---

## 8. Work Packages, Dependencies, and Execution Gates

Implementation is partitioned into 16 traceable work packages governed by strict dependency gates:

```text
[Investigation & Design]
       │
       ▼
[Gate 1: Human Approval of Design & Schema]
       │
       ▼
[WP-01: DB Migrations & Schema] ──► [WP-02: Concurrency & Exclusivity Engine]
                                           │
                                           ▼
[WP-03: Hours Hierarchy] ◄─────────────────┴────────► [WP-04: Vacation Lifecycle Engine]
       │                                                         │
       ▼                                                         ▼
[WP-05: Rescheduling Engine] ◄───────────────────────────────────┘
       │
       ▼
[WP-06: Outbox Notifications] ──► [WP-07: REST APIs & 4D Auth] ──► [WP-08: Test Suite]
                                                                          │
                                                                          ▼
                                                       [Gate 2: Backend Automated Verification]
                                                                          │
                                                                          ▼
                                                       [WP-09: Web Hours UI] ──► [WP-10: Web Vacation UI]
                                                                                       │
                                                                                       ▼
                                                                     [Gate 3: Human Web Verification]
                                                                                       │
                                                                                       ▼
                                                                     [WP-11: Mobile Read-Only Alignment]
                                                                                       │
                                                                                       ▼
                                                                     [Gate 4: Final Release Gate]
```

### Work Package Definitions:
- **WP-01: Database Schema Migrations (Additive Only)**: Create `doctor_time_reservations`, `clinic_operating_hours`, `doctor_working_hours`, `doctor_vacations`, `doctor_vacation_clinics`, `vacation_appointment_reschedules`, `notification_outbox`.
- **WP-02: Single-Counter & Cross-Clinic Exclusivity Engine**: Implement `DoctorTimeReservationService`; integrate into `BookingService::book()` and `rescheduleAppointment()`.
- **WP-03: Clinic Operating Hours & Doctor Working Hours Hierarchy**: Domain logic validating doctor hours within clinic operating hours; strict enforcement rejecting new bookings for unconfigured clinics with `CLINIC_SCHEDULE_NOT_CONFIGURED` (`DEC-HOURS-03`).
- **WP-04: Vacation Domain Service (Immediate Effectiveness)**: Doctor vacation registration, status machine (`effective`), clinic scope snapshotting.
- **WP-05: Automated Rescheduling Engine, 7-Day Restoration Horizon & Traceability Ledger**: Background relocation logic, $[D_{\text{end}} + 1, D_{\text{end}} + 30]$ search, 7-day $[T_{\text{init}}, T_{\text{end\_local\_midnight}})$ restoration horizon, `vacation_appointment_reschedules` tracking, Option B unresolvable case handling (release alternative reservation, return quota, booking center manual follow-up without extra patient fee) (`DEC-GAP-03`).
- **WP-06: Crash Recovery & Transactional Outbox**: Atomic database transaction encompassing move + slot counter + ledger status; `notification_outbox` recording with in-app delivery acknowledgment and staff escalation (`DEC-GAP-04`).
- **WP-07: REST API Endpoints & FormRequests**: `/api/v1/doctor/working-hours`, `/api/v1/clinic/operating-hours`, `/api/v1/doctor/vacations`, `/api/v1/clinic/unresolved-reschedules`, 4D authorization enforcement, active slot booking rule (`DEC-GAP-01`).
- **WP-08: Backend Automated Feature & Concurrency Test Suite**: Automated execution of `TC-SLOT-01` through `TC-HOURS-02` and `TC-GAP-01` through `TC-GAP-04`.
- **WP-09: Web UI: Clinic & Doctor Schedule Management**: Next.js screens for configuring clinic operating hours and doctor weekly working hours.
- **WP-10: Web UI: Doctor Vacation & Unresolved Reschedules Dashboard**: Next.js screens for doctor vacation submission and clinic staff unresolved case resolution.
- **WP-11: Web Verification Gate**: Official Human Verification of web management workflows.
- **WP-12: Mobile Alignment & Read-Only DTOs**: Verify Flutter `aafiya_pro` and `aafiya_patient` compatibility with new schedule endpoints.
- **WP-13: Mobile Verification Gate**: Flutter automated tests and emulator verification.
- **WP-14: Data Inconsistency Audit & Recovery Preparation**: Read-only audit execution.
- **WP-15: Operational Documentation & Runbooks**: Staff SOPs for handling `urgent_unresolved` cases.
- **WP-16: Final Release Readiness Review**: Comprehensive platform sign-off.

---

## 9. Acceptance Criteria & Test Traceability Matrix

| Test ID | Requirement | Test Objective | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`TC-SLOT-01`** | `DEC-SLOT-01` | Validate booking rejects non-hourly slot (e.g. `09:30`) | `backend/tests/Feature/FixedSlotTest.php` | `VERIFIED` |
| **`TC-CONC-01`** | `DEC-CONC-01` | Concurrent booking of same doctor at Clinic A and Clinic B for 09:00 rejects second request | `backend/tests/Feature/DoctorExclusivityTest.php` | `VERIFIED` |
| **`TC-CONC-02`** | `DEC-CAP-01` | Concurrent bookings of same doctor at same clinic allows up to capacity (e.g. 5) and rejects 6th | `backend/tests/Feature/DoctorExclusivityTest.php` | `VERIFIED` |
| **`TC-CONC-03`** | `DEC-CONC-01` | Booking at Clinic B is blocked while Doctor has an active appointment at Clinic A | `backend/tests/Feature/DoctorExclusivityTest.php` | `VERIFIED` |
| **`TC-CAP-01`** | `DEC-CAP-01` | Cancellation decrements `booked_count` and frees doctor reservation row | `backend/tests/Feature/SlotCapacityTest.php` | `VERIFIED` |
| **`TC-CAP-02`** | `DEC-CAP-01` | In-place rescheduling atomically updates old and new slot `booked_count` without counter drift | `backend/tests/Feature/SlotCapacityTest.php` | `VERIFIED` |
| **`TC-VAC-01`** | `DEC-VAC-01` | Doctor registers vacation; vacation status is immediately `effective` without director intervention | `backend/tests/Feature/DoctorVacationTest.php` | `VERIFIED` |
| **`TC-VAC-02`** | `DEC-VAC-01` | Registering vacation triggers immediate rescheduling of all occupying appointments in range | `backend/tests/Feature/DoctorVacationTest.php` | `VERIFIED` |
| **`TC-VAC-03`** | `DEC-VAC-02` | Appointment with no available slots within 30 days is marked `urgent_unresolved`; vacation remains effective | `backend/tests/Feature/DoctorVacationTest.php` | `VERIFIED` |
| **`TC-VAC-04`** | `DEC-VAC-04` | Vacation only snapshots existing affiliations; newly created affiliations do not inherit vacation | `backend/tests/Feature/DoctorVacationTest.php` | `VERIFIED` |
| **`TC-RES-01`** | `DEC-VAC-03` | Rescheduling searches strictly within $[D_{\text{end}} + 1, D_{\text{end}} + 30]$ in `Africa/Algiers` | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-RES-02`** | `DEC-VAC-05` | Vacation cancellation preserves completed reschedules in their new slots | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-RES-03`** | `DEC-VAC-05` | Shortened vacation preserves completed reschedules; opened days allow new bookings | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-RES-04`** | `DEC-VAC-05` | Extended vacation triggers additional rescheduling for newly covered appointments | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-CRASH-01`**| `DEC-VAC-07` | Worker redelivery after DB commit detects `rescheduled` status and executes idempotently | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-NOT-01`** | `DEC-NOT-01` | Notification outbox record written in DB transaction; external failure triggers retry and admin escalation | `backend/tests/Feature/NotificationOutboxTest.php` | `VERIFIED` |
| **`TC-HOURS-01`**| `DEC-HOURS-02`| Doctor working hours rejected if outside clinic operating hours | `backend/tests/Feature/WorkingHoursTest.php` | `VERIFIED` |
| **`TC-HOURS-02`**| `DEC-HOURS-03`| Unconfigured clinic booking strictly rejected (`CLINIC_SCHEDULE_NOT_CONFIGURED`) without assumed default seeders | `backend/tests/Feature/WorkingHoursTest.php` | `VERIFIED` |
| **`TC-GAP-01`**  | `DEC-GAP-01` | Booking permitted while `now < slot_end` and `available_capacity > 0`; blocked once `now >= slot_end` | `backend/tests/Feature/ActiveSlotBookingTest.php` | `VERIFIED` |
| **`TC-GAP-02`**  | `DEC-GAP-02` | Midnight task expires pending appointments with `slot_end <= now`; zero quota refund invariant verified | `backend/tests/Feature/DailyPendingExpiryTest.php` | `VERIFIED` |
| **`TC-GAP-03`**  | `DEC-GAP-03` | Restoration fallback failure past 7-day window frees alternative slot, records unresolved outcome, refunds quota | `backend/tests/Feature/RescheduleEngineTest.php` | `VERIFIED` |
| **`TC-GAP-04`**  | `DEC-GAP-04` | In-app notification delivery and read acknowledgment tracked; staff escalation triggered on unread status | `backend/tests/Feature/NotificationOutboxTest.php` | `VERIFIED` |

---

## 10. Risks, Blockers, Assumptions, and Rollback Considerations

### 10.1 Technical Risks & Mitigations
- **Risk: Lock Deadlocks between `doctor_time_reservations` and `appointment_slots`**:
  - *Mitigation*: Strictly enforce canonical lock order:
    1. Lock `doctor_time_reservations` row for `(doctor_id, date, slot)`.
    2. Lock `appointment_slots` rows in lexicographical key order.
    3. Lock `appointments` rows.
- **Risk: Worker Thundering Herd during Vacation Declaration**:
  - *Mitigation*: Dispatch batch rescheduling via an asynchronous queue job (`RescheduleVacationAppointmentsJob`) with staggered chunking.
- **Risk: SMS Delivery Failures**:
  - *Mitigation*: In-app notification acknowledgment is primary; decoupled outbox queue ensures zero booking rollback on external SMS delivery failure.

### 10.2 Rollback Strategy
- All migrations are additive. Rollback consists of dropping the newly created tables:
  `doctor_time_reservations`, `clinic_operating_hours`, `doctor_working_hours`, `doctor_vacations`, `doctor_vacation_clinics`, `vacation_appointment_reschedules`, `notification_outbox`.
- Core legacy tables (`appointments`, `appointment_slots`, `clinics`, `doctors`) remain completely intact.

---

## 11. Implementation Sequence & Explicit Human Approval Gates

The implementation sequence requires strict progression through 4 mandatory human approval gates:

1. **GATE 1: Master Plan & Execution Tracker Review (Phase 2 Closure Gate)**:
   - User reviewed and approved Master Plan, Execution Tracker, and decisions `DEC-GAP-01` through `DEC-GAP-04`.
   - All open design questions resolved; 7-day restoration horizon and Option B codified.
   - *Status: CLOSED — DESIGN & PLANNING DOCUMENTATION COMPLETE*.
2. **GATE 2: Backend Implementation & Automated Verification**:
   - Authorized execution of WP-01 through WP-10.
   - All automated unit and feature tests passed on isolated test database (WP-01 schema, WP-02 exclusivity 8/8, WP-03 slots 14/14, WP-04 hours hierarchy 14/14, WP-05/06 vacations & rescheduling, WP-08 outbox, WP-10 comprehensive suite).
   - Formally closed by Human Authority decisions.
   - *Status: FORMALLY CLOSED / VERIFIED*.
3. **GATE 3: Web Implementation & Human Verification Gate**:
   - Implementation and verification of Web management workflows: Clinic Operating Hours (`TASK-DWH-12`), Doctor Vacations & Unresolved Reschedules Dashboard (`TASK-DWH-13`), and Web Human Verification Gate (`TASK-DWH-14`).
   - Browser verification executed with evidence artifacts.
   - *Status: FORMALLY CLOSED ON WEB / VERIFIED*.
4. **GATE 4: Mobile Alignment & Parity Remediation Gate (Active)**:
   - Verification of mobile DTO compatibility (`TASK-DWH-15`) and Final Release Review (`TASK-DWH-16`).
   - Extended under Web ↔ Mobile Parity Plan (`AAFIYA_V1_WEB_MOBILE_PARITY_REMEDIATION_PLAN_REVISED.md`) to resolve cross-platform gaps:
     * `FIX-PAT-01` (Patient cancellation): Closed on Web (5/5 tests), pending Flutter mobile parity.
     * `FIX-PAT-02` (Patient rescheduling): Verified on Web (6/6 tests), pending Flutter mobile parity.
     * `FIX-BC-01` (Booking Center cancellation & quota sync): Closed / Fully Parity Verified across Backend (5/5), Web (6/6), and Flutter Pro (12/12).
     * `DEC-POL-01 = OPTION B`: Authorizes inclusion of advanced professional administration in Flutter Pro.
     * `DEC-POL-02 = APPROVED`: Codifies patient cancellation allowed up to appointment start time in V1 without new cutoff.
   - *Status: ACTIVE — PARITY READINESS AUDIT COMPLETED / AWAITING HUMAN IMPLEMENTATION APPROVAL*.

---

## 12. Change History

| Date / Timestamp | Version | Author | Scope / Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-10-09 11:30 CET | 1.0.0 | Antigravity | Initial creation of dedicated Master Plan for Doctor Working Hours, Vacations & Rescheduling initiative | DRAFT / AWAITING HUMAN DECISIONS |
| 2026-10-10 14:15 CET | 2.0.0 | Antigravity | Integrated DEC-GAP-01 through DEC-GAP-04, 7-day restoration horizon, Option B failure mechanics, in-app notification acknowledgment; formally closed Phase 2 design documentation | PHASE 2 — DESIGN AND PLANNING DOCUMENTATION CLOSED / IMPLEMENTATION PENDING AUTHORIZATION |
| 2026-10-13 23:15 CET | 2.1.0 | Antigravity | Recorded human closure of TASK-DWH-13 as CLOSED / ACCEPTED BY HUMAN DECISION — WITH EXPLICIT VERIFICATION CAVEATS; updated Gate 3 status to Web Implementation Completed / Gate 3 Pending | GATE 3 VERIFICATION PENDING |
| 2026-10-15 14:10 CET | 2.2.0 | Antigravity | Reconciled Master Plan with verified closures of Gate 2 & Gate 3; codified DEC-POL-01 Option B (Advanced Admin in Flutter) & DEC-POL-02 Approved (Cancellation up to start time); recorded Web ↔ Mobile Parity Remediation status (FIX-PAT-01, FIX-PAT-02, FIX-BC-01) | ACTIVE / PARITY READINESS AUDITED |

