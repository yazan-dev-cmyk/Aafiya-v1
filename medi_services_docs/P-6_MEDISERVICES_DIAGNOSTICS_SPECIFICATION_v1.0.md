# MEDISERVICES_DIAGNOSTICS_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices
**Phase:** P6 — Diagnostics (Lab & Radiology) Workflow
**Status:** 🔒 FROZEN — Approved Business Contract
**Context:** Based on P1-P5 Frozen Contracts

---

## 1. Institutional Model & Hierarchy
Diagnostic centers (Laboratories & Radiology Centers) are independent institutional entities.

### 1.1 Management Structure
- **Manager (Lab/Rad Manager):** Has institutional and clinical authority. Responsible for creating assistant accounts and final medical sign-offs.
- **Assistants:** Operational staff linked to the institution. They handle data entry, sample collection, and imaging but have NO clinical finalization authority.

---

## 2. Order & Item Structure
To support complex requests, a diagnostic order is decoupled from its specific items.
- **Diagnostic Order:** The container for the request (Linked to Visit, Doctor, and Institution).
- **Order Items:** Specific tests or studies (e.g., CBC, MRI Brain).
- **Rule:** A single order can contain multiple items, each with its own result state.

---

## 3. Strict Workflow Lifecycle
Every diagnostic item must follow this sequence:

1. **`created`:** Issued by the doctor.
2. **`received`:** Patient has arrived; order acknowledged by the center.
3. **`processing`:** Sample is being analyzed or imaging is underway.
4. **`resulted`:** Data/Images entered by an Assistant. **INTERNAL ONLY.**
5. **`finalized`:** Reviewed and signed by the Manager. **OFFICIAL RESULT.**
6. **`cancelled`:** Terminated before finalization.

---

## 4. Laboratory Sample Management (Chain of Custody)
The system tracks physical samples as independent entities via `laboratory_samples`.
- **Attributes:** `sample_id`, `order_id`, `sample_type`, `collected_at`, `received_at`, `status`.
- **Rule:** Tracking starts from collection to reception at the lab, ensuring the integrity of the specimen.

---

## 5. Radiology: Study vs Report
- **Radiology Study:** The digital assets (Images/DICOM) uploaded during `processing/resulted`.
- **Radiology Report:** The formal medical interpretation written by the Radiologist/Manager during `finalized`.

---

## 6. Immutability & Addendum Protocol
- **Finalized = Locked:** Once a result is `finalized`, it cannot be edited or deleted.
- **Corrections:** Any error discovered post-finalization must be addressed via an **Addendum** or a **New Version** record.
- **Audit:** All corrections must log the original value, the new value, the author, and the reason.

---

## 7. Backend Visibility & Authorization Rules (Scoping)
Access is enforced at the API/Service level:

| Actor | `created` | `processing` | `resulted` | `finalized` |
| :--- | :---: | :---: | :---: | :---: |
| **Lab/Rad Assistant** | ✅ | ✅ | ✅ | ❌ (View Only) |
| **Lab/Rad Manager** | ✅ | ✅ | ✅ | ✅ |
| **Treating Doctor** | Metadata | Metadata | ❌ | ✅ |
| **Patient** | ❌ | ❌ | ❌ | ✅ |

**Rule:** Treating doctors and patients are strictly prohibited from seeing results in the `resulted` (draft) state.

---

## 8. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES DIAGNOSTICS SPECIFICATION v1.0      ║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║                                                  ║
║ HIERARCHY: MANAGER-LED INSTITUTION               ║
║ LIFECYCLE: FINALIZED = OFFICIAL                  ║
║ DATA SCOPING: BACKEND ENFORCED                   ║
║ SAMPLE TRACKING: ENABLED                         ║
║                                                  ║
║ APPROVED FOR P7: AUDIT & INTEGRITY               ║
╚══════════════════════════════════════════════════╝
