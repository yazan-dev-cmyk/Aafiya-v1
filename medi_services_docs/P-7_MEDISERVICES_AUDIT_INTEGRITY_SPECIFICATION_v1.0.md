# MEDISERVICES_AUDIT_INTEGRITY_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices
**Phase:** P7 — Audit, Logging & System Integrity
**Status:** 🔒 FROZEN — Approved Business Contract
**Context:** Final Authorization & Control Framework

---

## 1. Dual Audit System (Separated Logical Streams)
To ensure clarity and high-performance auditing, the system maintains two distinct streams:

### 1.1 Activity Audit (Who changed what?)
Records every state-changing action (Create, Update, Delete, Status Change).
- **Attributes:** `actor_id`, `actor_role`, `actor_position`, `clinic_id`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, `request_id`, `timestamp`.

### 1.2 Clinical Access Audit (Who viewed what?)
Records every instance where a clinical record (EHR, Prescription, Result) was accessed for viewing.
- **Mandatory Reason Field:** Every clinical access must log a `access_reason` (e.g., `active_appointment`, `clinical_care`, `emergency_access`, `patient_request`).
- **Attributes:** `viewer_id`, `patient_id`, `resource_type`, `resource_id`, `access_reason`, `request_id`, `timestamp`.

---

## 2. Immutable Log Rule (Append-Only)
- **Hard Constraint:** Audit logs are **Immutable**. No `Update`, `Delete`, or `Soft Delete` operations are allowed on audit tables.
- **Integrity:** Even Global Admins cannot delete logs via the UI. Corrections are made via new log entries, never by modifying the old ones.

---

## 3. Backend Authority & Zero Trust (The "UI is a Mirror" Rule)
- **Single Source of Truth:** All validation, authorization, and business logic must reside in the Backend.
- **Rule:** UI Visibility ≠ Authorization. Hiding a button in the frontend is a UX choice; the Backend must independently verify every request (Role + Position + Clinic Scope + Permission).
- **Authority:** The Backend defines the state of slots, capacity, and permissions. Frontend only displays what the Backend permits.

---

## 4. Quota & Financial Integrity Ledger
- **Append-Only Ledger:** No direct modification of `booking_transactions`.
- **Transaction Flow:** All quota changes must go through the `QuotaService` within a Database Transaction.
- **No Overwrites:** Errors are corrected via `adjustment` transactions, preserving the historical chain of events.
- **Integrity Check:** `Sum(Purchases) - Sum(Consumed) + Sum(Refunds) == Current Balance` is the invariant.

---

## 5. Metadata & Correlation
To ensure end-to-end traceability:
- **Request ID:** A unique ID generated per request to link HTTP logs, application logs, and database transactions.
- **Actor Metadata:** Logs must record the actor's context (Role, Position, ClinicID) at the time of the action to understand why they had the authority to perform it.

---

## 6. Retention & Legal Compliance
- **Policy:** Retention periods shall be **Configurable** and must comply with applicable local legal, regulatory, contractual, and organizational requirements.
- **Default Baseline:** System defaults to 5 years for clinical/audit and 10 years for financial, unless overridden by local laws.

---

## 7. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES AUDIT & INTEGRITY SPECIFICATION v1.0║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║                                                  ║
║ AUDIT TYPE: DUAL (ACTIVITY + ACCESS)             ║
║ LOG INTEGRITY: IMMUTABLE / APPEND-ONLY           ║
║ AUTHORITY: BACKEND-ONLY (ZERO TRUST)             ║
║ QUOTA LEDGER: TRANSACTION-BASED                  ║
║                                                  ║
║ 🏁 END OF SPECIFICATION — READY FOR BUILD        ║
╚══════════════════════════════════════════════════╝
