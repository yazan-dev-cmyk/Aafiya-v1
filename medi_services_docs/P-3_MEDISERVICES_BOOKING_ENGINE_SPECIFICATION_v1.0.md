# MEDISERVICES_BOOKING_ENGINE_SPECIFICATION_v1.0 — FROZEN

**Project:** MediServices — خدمات طبية
**Phase:** P3 — Booking Engine
**Version:** 1.0
**Status:** 🔒 FROZEN — Approved Business Contract
**Database:** MySQL 8.0
**Backend:** PHP 8.3 + Laravel 11

---

## 1. Purpose & Authority
هذه الوثيقة هي العقد الرسمي والوحيد لمحرك الحجز. لا يجوز للـ Frontend فرض Business Rules على Backend، والمصدر النهائي للحقيقة هو الـ Booking Service داخل Laravel.

---

## 2. Slot Model (The 1-Hour Rule)
- **Slot Duration:** 60 minutes (Fixed).
- **Sub-slots:** Non-existent. No 20/30 min intervals.
- **Generation:** Derived from `clinic_working_hours` and `clinic_exceptions`. 
- **Rule:** Partial slots at the end of the shift are NOT created.

---

## 3. Capacity Model (Multi-Patient per Slot)
- **Source:** `clinics.max_patients_per_slot`.
- **Application:** Per Doctor, per Slot.
- **Isolation:** Each doctor has an independent capacity. Filling Doctor A's slot does NOT affect Doctor B's availability.
- **Example:** If Max Capacity is 10, then 10 patients can book at 09:00 with Doctor A, and 10 others can book at 09:00 with Doctor B.

---

## 4. Appointment Lifecycle & Statuses
- **Occupying Statuses:** `pending`, `confirmed`, `attended`, `no_show`. (These consume capacity).
- **Non-Occupying Statuses:** `cancelled`, `rejected`, `expired`, `rescheduled`.
- **Pending Expiration:** 24 Hours from `created_at`. System auto-expires pending bookings and releases capacity.

---

## 5. Quota & Transaction Ledger
- **Deduction Rule:** Quota is deducted ONLY at the `confirmed` status.
- **Atomicity:** Confirmation and Quota deduction MUST occur within a single Database Transaction.
- **Double Confirmation Protection:** Logic must prevent multiple quota charges for the same appointment.

---

## 6. Concurrency & Overbooking Protection
- **Strategy:** Database Transaction + Pessimistic Locking (`SELECT FOR UPDATE`).
- **Validation:** Capacity must be re-validated inside the lock before finalizing the booking.
- **Duplicate Rule:** A patient cannot have more than one active booking for the same (Doctor, Clinic, Date, Slot).

---

## 7. Appointment Reference & Identity
- **Internal ID:** UUID.
- **Commercial Reference:** `MS-YYYY-XXXX` (Unique, Immutable).
- **Audit Context:** Every booking records `created_by_id` and `creator_type`.

---

## 8. Rescheduling & Cancellation
- **Rescheduling:** Creates a NEW appointment and links it to the old one (`rescheduled_from_id`).
- **Refunds:** Quota refunds after cancellation depend on a specific Business Policy to be defined.

---

## 9. FINAL STATUS
╔══════════════════════════════════════════════════╗
║ MEDISERVICES BOOKING ENGINE SPECIFICATION v1.0 ║
║                                                  ║
║ STATUS: 🔒 FROZEN                                ║
║                                                  ║
║ SLOT DURATION: 1 HOUR                            ║
║ CAPACITY: CLINIC LEVEL (APPLIED PER DOCTOR)      ║
║ QUOTA DEDUCTION: ON CONFIRMATION                 ║
║                                                  ║
║ APPROVED FOR P4: EHR SPECIFICATION               ║
╚══════════════════════════════════════════════════╝
