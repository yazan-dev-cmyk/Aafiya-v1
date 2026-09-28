# MEDISERVICES_RBAC_PERMISSION_SPECIFICATION_v1.0 — FINAL REVIEW

**Project:** MediServices
**Phase:** P2 — Authorization & Access Control
**Status:** Frozen Alignment (Phase P2)
**Context:** Based on P1 Frozen Database Architecture

---

## 1. The 4-Layer Authorization Model
To ensure security and flexibility, authorization is evaluated in four sequential layers:

| Layer | Type | Logic | Example |
| :--- | :--- | :--- | :--- |
| **L1** | **Role** | What can this account type do globally? | `doctor` can write prescriptions. |
| **L2** | **Position** | What is the user's role inside this Clinic? | `director` can manage staff. |
| **L3** | **Scope** | Which specific resources can be accessed? | Doctor can only see *their* patients. |
| **L4** | **Permission** | What specific action is being performed? | `issue_prescription`, `manage_queue`. |

---

## 2. Layer 1: Identity Roles (The 11 Roles)
These roles define the user's identity in the system. **No new roles (like clinic_director) are created.**

1. `patient_registered`: Full medical record access.
2. `patient_guest`: Temporary, code-based access.
3. `doctor`: Clinical authority.
4. `doctor_assistant`: Clinical operations support.
5. `booking_center`: Institutional booking management.
6. `lab`: Laboratory management (Manager).
7. `lab_assistant`: Laboratory operations.
8. `radiology`: Radiology management (Manager).
9. `rad_assistant`: Radiology operations.
10. `admin`: Global platform administration.
11. `admin_assistant`: Delegated platform tasks.

---

## 3. Layer 2: Position Logic (Doctor Context)
Derived from `doctor_clinic.position` as defined in P1.

### Position: Director (Clinic Manager)
- **Authority:** Administrative & Financial.
- **Permissions:** `create_staff_account`, `manage_clinic_settings`, `view_clinic_analytics`, `edit_clinic_schedule`.

### Position: Doctor (Employed)
- **Authority:** Purely Clinical.
- **Permissions:** `view_own_analytics`, `manage_own_slots` (if delegated).

---

## 4. Layer 3: Resource Scoping Rules (Data Visibility)
Visibility is NOT based on Role alone, but on a documented relationship.

- **Clinic Scope:** Access to resources linked to `clinic_id`. (Director & Assistant).
- **Personal Scope:** Access to resources linked to `doctor_id` AND `clinic_id`. (Employed Doctor).
- **Patient Relationship Scope:** Access to EHR only if an active appointment or past visit exists.

---

## 5. Layer 4: Permission Matrix (Action Authorization)
The `doctor_assistant` permissions are toggled by the `Clinic Director` via `permissions_json`.

### 🔒 Permission Ceiling Rule (Hard Constraint)
The `permissions_json` field CANNOT grant authority that exceeds the predefined limits of the `doctor_assistant` role.
**Logic:** `Effective Permission = Role Permissions ∩ Position/Scope Constraints ∩ Delegated Permissions`.

| Action | Allowed to Delegate? | Default |
| :--- | :---: | :---: |
| `manage_waiting_room` | ✅ | Yes |
| `confirm_attendance` | ✅ | Yes |
| `create_booking` | ✅ | Yes |
| `view_patient_contacts`| ✅ | Yes |
| `issue_prescription` | ❌ | No |
| `view_clinic_revenue` | ❌ | No |
| `delete_medical_record` | ❌ | No |
| `create_doctor_account` | ❌ | No |
| `approve_medical_result`| ❌ | No |

---

## 6. Global Permission Matrix

| Permission Key | Director | Employed Doctor | Assistant |
| :--- | :---: | :---: | :---: |
| `clinic.manage_settings` | ✅ | ❌ | ❌ |
| `clinic.view_analytics` | ✅ | ❌ | ❌ |
| `clinic.create_staff` | ✅ | ❌ | ❌ |
| `clinical.write_rx` | ✅ | ✅ | ❌ |
| `clinical.view_ehr` | ✅ (In Clinic) | ✅ (Own Patients) | ❌ |
| `booking.manage_queue` | ✅ | ✅ | ✅ |
| `booking.confirm_quota` | ✅ | ✅ | ❌ |

---

## 7. P2 Freeze Declaration
This specification is now the official contract for the Laravel Policy & Middleware layer. 

**Next Phase:** P3 — Booking Engine Specification.
