# MEDISERVICES_API_CONTRACT_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices
**Phase:** P8 — API Contract Specification
**Status:** 🔒 FROZEN — Approved Technical Bridge
**Base URL:** `/api/v1/`
**Auth Protocol:** Laravel Sanctum (Stateful/Token)
**Response Format:** Standard JSON Wrapper

---

## 1. Unified Response Structure
All API responses must adhere to this structure to ensure frontend consistency.

### 1.1 Success Wrapper
```json
{
  "success": true,
  "message": "Action completed",
  "data": { ... },
  "meta": { "total": 100, "page": 1 }
}
```

### 1.2 Error Wrapper
```json
{
  "success": false,
  "error_code": "INSUFFICIENT_QUOTA",
  "message": "Error description for developer",
  "errors": { "field": ["validation message"] }
}
```

---

## 2. Authentication (Laravel Sanctum)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Authentication via Sanctum. |
| `POST` | `/auth/logout` | Revoke session. |
| `GET` | `/auth/me` | Current User + Roles + Positions + Scopes. |

---

## 3. Clinics & Availability
Availability is decoupled from clinic details to respect P3 logic.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clinics/{id}` | Static clinic details. |
| `GET` | `/clinics/{id}/availability` | 1-hour slots + capacity per doctor (10/slot). |
| `PATCH` | `/clinics/{id}/settings` | Admin/Director only. |
| `POST` | `/clinics/{id}/doctors` | Director only: Add employed doctor. |
| `POST` | `/clinics/{id}/assistants`| Director only: Add clinic assistant. |

---

## 4. Booking Engine & Appointments
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/appointments` | Create `pending` (Expires in 24h). |
| `PATCH` | `/appointments/{id}/confirm`| Atomic Quota Deduction + Confirmation. |
| `PATCH` | `/appointments/{id}/cancel` | Cancellation & Quota Refund logic. |
| `PATCH` | `/appointments/{id}/reschedule`| Release old slot, check new capacity. |
| `GET` | `/appointments/{id}/history` | Status transition log (P1 History). |

---

## 5. Quota & Transaction Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/quota/balance` | Current units for Booking Centers. |
| `GET` | `/quota/transactions` | Ledger of purchases and deductions. |
| `GET` | `/quota/packages` | Available packages for purchase. |
| `POST` | `/quota/purchase` | Admin/Center: Purchase new package. |

---

## 6. EHR & Clinical Privacy (P4 Wall)
Response data is filtered at the Backend based on the request context.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ehr/patients/{id}` | Clinical profile (Filtered by Role/Scope). |
| `POST` | `/ehr/visits` | Start visit (Doctor only). |
| `PATCH` | `/ehr/visits/{id}/finalize` | Sign & Lock record (Author only). |
| `POST` | `/ehr/visits/{id}/addendum` | Post-finalization notes. |

---

## 7. Diagnostics (Lab & Radiology)
Separate workflows for Lab and Radiology as per P6.

### 7.1 Laboratory
| Method | Endpoint | Actor Authority |
| :--- | :--- | :--- |
| `POST` | `/lab/orders` | Doctor only. |
| `POST` | `/lab/orders/{id}/samples` | Assistant: Log sample collection. |
| `POST` | `/lab/orders/{id}/results` | Assistant: Enter numeric results. |
| `PATCH` | `/lab/orders/{id}/finalize` | Lab Manager only: Sign results. |

### 7.2 Radiology
| Method | Endpoint | Actor Authority |
| :--- | :--- | :--- |
| `POST` | `/radiology/orders` | Doctor only. |
| `POST` | `/radiology/orders/{id}/study` | Assistant: Upload image links/DICOM. |
| `POST` | `/radiology/orders/{id}/report`| Assistant: Enter report draft. |
| `PATCH` | `/radiology/orders/{id}/finalize`| Rad Manager only: Sign report. |

---

## 8. Verification & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/verification/rx/{token}` | Authenticity check (Opaque Token). |
| `GET` | `/analytics/clinic` | Full clinic stats (Director only). |
| `GET` | `/analytics/personal` | Personal stats (Employed Doctor). |

---

## 9. Audit & Access Logs
| Method | Endpoint | Scope |
| :--- | :--- | :--- |
| `GET` | `/audit/personal/access` | Patient's own data access history. |
| `GET` | `/audit/admin/activity` | Full system audit (Admin only). |

---

## 10. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES API CONTRACT SPECIFICATION v1.0     ║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║ AUTH: LARAVEL SANCTUM                            ║
║ CAPACITY: PER DOCTOR (10 PATIENTS / 1 HOUR SLOT) ║
║ LOGIC: BACKEND-ENFORCED SCOPING                  ║
║                                                  ║
║ APPROVED FOR P9: BACKEND ARCHITECTURE            ║
╚══════════════════════════════════════════════════╝
