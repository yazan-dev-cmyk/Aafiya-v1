# Aafiya — MASTER ACCOUNT MATRIX RECONCILIATION REPORT

> **Generated on:** 2026-09-07 15:19:45 (Read-Only DB Audit)

## Executive Summary

This report details all discrepancies between the previous `MASTER_ACCOUNT_MATRIX (1).md` reference document and the **Current Live Database (vCURRENT)**.

### Data Integrity Audits Summary
- **Duplicate User IDs:** 0
- **Duplicate Emails:** 0
- **Duplicate Test IDs:** 0
- **Duplicate MRNs:** 0
- **Total Database Accounts:** 160
- **Total Synthetic Accounts:** 146
- **Total Protected Accounts:** 14

---

## Detailed Discrepancy Ledger

| Account Test ID | Attribute | Previous Matrix Value | Current Database Value | Discrepancy Classification | Resolution / Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DOC-001** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-002** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-003** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-004** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-005** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-006** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-007** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-008** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-009** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-010** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-014** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-015** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **DOC-016** | `verification_status` | `unverified (pending)` | `verified` (`is_verified = 1`) | **CHANGED** | Approved during active testing. Database updated. |
| **BC-001** | `verification_status` | `Pending` | `verified` (`is_active = 1`) | **CHANGED** | Approved manually by user. Quota: 17 units. |
| **BC-002** | `verification_status` | `Pending` | `verified` (`is_active = 1`) | **CHANGED** | Approved manually by user. Quota: 0 units. |
| **BC-003** | `verification_status` | `Pending` | `verified` (`is_active = 1`) | **CHANGED** | Approved manually by user. Quota: 500 units. |
| **BC-004** | `verification_status` | `Pending` | `verified` (`is_active = 1`) | **CHANGED** | Approved manually by user. Quota: 1000 units. |
| **BC-005** | `verification_status` | `Pending` | `verified` (`is_active = 1`) | **CHANGED** | Approved manually by user. Quota: 250 units. |
| **Protected Accounts** | Account Count | 14 Protected Accounts | 14 Protected Accounts | **UNCHANGED** | System validation accounts (`val.*@aafiya.dz`) intact. |
| **Patients** | Account Count | 100 Accounts (PAT-001..100) | 100 Accounts (PAT-001..100) | **UNCHANGED** | All 100 patient profiles & MRNs match schema. |

---

## Data Integrity Checks Result

* **User-Profile Mapping Integrity:** 100% PASS (All profiles have corresponding user records).
* **MRN Uniqueness:** 100% PASS (0 duplicate MRNs).
* **Clinic Affiliation Integrity:** 100% PASS (All 10 doctors & 10 assistants attached to valid active clinics).
* **Diagnostic Staff Mapping:** 100% PASS (All 5 laboratory staff members attached to valid laboratory centers).

---

## Final Safety Confirmation

```text
DB_WRITE_ALLOWED = FALSE
CODE_MODIFICATION_ALLOWED = FALSE
CONFIG_MODIFICATION_ALLOWED = FALSE
```