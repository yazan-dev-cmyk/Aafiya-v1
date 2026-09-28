# MEDISERVICES_EHR_CLINICAL_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices
**Phase:** P4 — Electronic Health Records (EHR) & Clinical Workflow
**Status:** 🔒 FROZEN — Approved Business Contract
**Context:** Based on P1-P3 Frozen Contracts

---

## 1. Clinical Privacy & Access Boundary — FROZEN
The fundamental principle of MediServices EHR is the strict separation between institutional management and clinical confidentiality.

**Rule:** A clinic director has institutional management authority but does NOT automatically have access to the confidential clinical content of patients treated by employed doctors.

### 1.1 Visibility Matrix
| Data Point | Treating Doctor | Clinic Director | Assistant | Patient |
| :--- | :---: | :---: | :---: | :---: |
| Identity / Basic Info | ✅ | ✅ | ✅ | ✅ |
| Appointment Meta (Date/Status) | ✅ | ✅ | ✅ | ✅ |
| Vital Signs / Intake | ✅ | ❌ | ✅ | ✅ |
| Symptoms / Complaint | ✅ | ❌ | ❌ | ✅ |
| Physical Exam | ✅ | ❌ | ❌ | ✅ |
| Diagnosis | ✅ | ❌ | ❌ | ✅ |
| Clinical Notes | ✅ | ❌ | ❌ | ✅ |
| Prescriptions / Orders | ✅ | ❌ | ❌ | ✅ |

---

## 2. Clinical Access Logic
Clinical access to a Patient's EHR is NOT granted by role alone. It requires an **Authorized Clinical Relationship**.

### 2.1 Access Triggers:
1. **Active Appointment:** Access granted from the time of booking until 30 days post-visit.
2. **Clinical Referral:** Explicit referral from another doctor within the platform.
3. **Historical Relationship:** The doctor has treated the patient in the past.
4. **Emergency Access (Break-the-Glass):** Temporary access for life-threatening situations (Fully Audited).

---

## 3. Emergency / Exceptional Access Protocol
If a Clinic Director or unauthorized staff requires access for legitimate legal/operational reasons:
1. **Explicit Action:** User must trigger a "Request Emergency Access" action.
2. **Justification:** User must provide a written reason for access.
3. **Audit:** Every field viewed is logged with (UserID, PatientID, Reason, Timestamp, IP).
4. **Notification:** A notification may be sent to the Patient and/or treating Doctor.

---

## 4. Record Immutability & Addendums
Medical records must maintain legal and clinical integrity.

### 4.1 Lifecycle:
- **Draft:** Editable only by the authoring doctor.
- **Finalized / Signed:** Once signed, the record is **Locked**.
- **Immutable:** No direct edits or deletions allowed after finalization.

### 4.2 Addendum Protocol:
If a correction or update is needed:
- A new **Addendum** record is linked to the original visit.
- It must include: Author, Timestamp, Reason for Addendum, and the new information.
- The original record remains visible but flagged with "Addendum Added".

---

## 5. EHR Structure
### 5.1 Static Data
- Blood Group, Allergies (Allergen + Severity), Chronic Conditions, Family History.

### 5.2 Dynamic Data (Visits)
- **Subjective:** Chief complaint, history.
- **Objective:** Physical exam, vital signs.
- **Assessment:** Diagnosis.
- **Plan:** Rx, Lab/Rad orders, follow-up.

---

## 6. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES EHR & CLINICAL SPECIFICATION v1.0   ║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║                                                  ║
║ PRIVACY WALL: ENABLED (MANAGER BLOCKED)          ║
║ ACCESS LOGIC: RELATIONSHIP-BASED                 ║
║ IMMUTABILITY: SIGNED = LOCKED                    ║
║                                                  ║
║ APPROVED FOR P5: PRESCRIPTION SPECIFICATION      ║
╚══════════════════════════════════════════════════╝
