# MEDISERVICES_PRESCRIPTION_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices
**Phase:** P5 — Digital Prescriptions & Verification QR
**Status:** 🔒 FROZEN — Approved Business Contract
**Context:** Based on P1-P4 Frozen Contracts

---

## 1. Scope Declaration (Pharmacy Exclusion)
**MediServices does NOT integrate with pharmacies in the current release.** 
Pharmacy dispensing, pharmacist accounts, pharmacy APIs, and dispensing workflows are explicitly **OUT OF SCOPE**. This specification focuses on clinical documentation and integrity verification.

---

## 2. Prescription Structure
A digital prescription is an official clinical document generated during an authorized visit.

### 2.1 Medication Items
- **Drug Name:** (Generic or Brand).
- **Dosage, Frequency, Duration, Instructions.**

### 2.2 Metadata
- **Prescription ID (UUID).**
- **Doctor ID, Patient ID, Visit ID.**
- **Issue Date & Expiry Date** (Defaulting to 30 days unless specified by the doctor).

---

## 3. Secure Verification QR (Opaque Token)
The QR code serves as a **Prescription Verification Tool** to ensure document authenticity and prevent tampering.

### 3.1 Logic:
- **Opaque Token:** A long, random, non-guessable string stored in `prescriptions.secure_token`.
- **QR Content:** Contains a secure verification URL: `https://mediservices.app/v/{secure_token}`.
- **Verification Rule:** Accessing the URL triggers an authorization check. Only authorized actors (Patient, Authoring Doctor) or those with temporary verified access can view the clinical content.

---

## 4. Prescription Lifecycle
| Status | Meaning |
| :--- | :--- |
| `draft` | Under preparation by the doctor. |
| `active` | Signed, issued, and valid for verification/use. |
| `expired` | Past the validity date; clinical integrity remains but status is invalid. |
| `voided` | Cancelled/Invalidated by the authoring doctor. |

---

## 5. Prescription Templates (Protocols)
Personal productivity tool for doctors to save common drug combinations.
- **Scope:** Personal to the doctor or shared with the clinic (Manager's choice).
- **Integrity:** Applying a template generates a new set of `prescription_items` linked to the current visit.

---

## 6. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES PRESCRIPTION SPECIFICATION v1.0     ║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║                                                  ║
║ PHARMACY INTEGRATION: OUT OF SCOPE               ║
║ QR PURPOSE: AUTHENTICITY VERIFICATION            ║
║ TOKEN TYPE: OPAQUE SECURE TOKEN                  ║
║                                                  ║
║ APPROVED FOR P6: DIAGNOSTICS SPECIFICATION       ║
╚══════════════════════════════════════════════════╝
