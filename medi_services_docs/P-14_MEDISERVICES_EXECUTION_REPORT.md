# MEDISERVICES — P14 EXECUTION REPORT
## Phase P14: Booking Engine & Quota
**Platform:** MediServices — خدمات طبية  
**Execution Date:** 2026-08-21  
**Status:** ✅ COMPLETED & VERIFIED  
**Framework:** Laravel 13.26.1 / PHP 8.3.33 / MySQL 8.0.46  
**Authoritative Specifications:** P1 v1.0, P2 v1.0, P3 v1.0, P10 v1.3 (FROZEN)

---

## 1. Executive Summary

Phase **P14 — Booking Engine & Quota** has been officially implemented and verified with zero architectural deviation and zero regression across P12 and P13.

* **Tables Implemented (10–14):** 5 domain tables (`booking_centers`, `booking_packages`, `appointments`, `booking_transactions`, `appointment_status_history`).
* **Total Domain Tables in MySQL:** Exactly **14 / 31** (45.16% of the 31-Table Migration Registry).
* **Test Results:** **37 tests passed, 267 assertions, 0 failures (100% pass rate)**.
* **Frontend Compatibility:** Clean build (Exit code 0, 38/38 static routes generated).
* **EHR Boundary:** The `patients` table remains strictly reserved for **P15**. `appointments.patient_id` exists as a nullable UUID without foreign key constraint.

---

## 2. Database Migrations (Tables 10–14)

The migrations were executed in strict dependency-safe registry order:

| # | Table Name | Migration File | Primary Key | Key Foreign Keys & Indexes |
|---|------------|----------------|-------------|----------------------------|
| 10 | `booking_centers` | `2026_08_21_090001_create_booking_centers_table.php` | UUID | `user_id` (FK -> `users`), `quota_balance` (unsigned int) |
| 11 | `booking_packages` | `2026_08_21_090002_create_booking_packages_table.php` | UUID | `package_code` (UNIQUE), `quota_units`, `price_dzd` |
| 13 | `appointments` | `2026_08_21_090003_create_appointments_table.php` | UUID | `booking_reference` (UNIQUE), `clinic_id` (FK), `doctor_id` (FK), `booking_center_id` (FK nullable), `created_by_id` (FK), `patient_id` (UUID nullable, no FK in P14), Composite index `idx_appointments_capacity` on `[clinic_id, doctor_id, appointment_date, time_slot]` |
| 12 | `booking_transactions` | `2026_08_21_090004_create_booking_transactions_table.php` | UUID | `booking_center_id` (FK), `appointment_id` (FK nullable), `booking_package_id` (FK nullable), `created_by_id` (FK) |
| 14 | `appointment_status_history` | `2026_08_21_090005_create_appointment_status_history_table.php` | UUID | `appointment_id` (FK), `changed_by_id` (FK) |

---

## 3. Booking Engine & Quota Architecture

### 3.1 One-Hour Slot Rule (P3 Frozen)
- Appointments are strictly bound to 60-minute windows starting on the hour (`08:00`, `09:00`, `10:00`, `11:00`, `12:00`, `13:00`, `14:00`, `15:00`, `16:00`, `17:00`).
- Fractional sub-slots (e.g. `09:30`) are rejected at the validation layer with HTTP 422.

### 3.2 Concurrency & Capacity Protection
- Real-time capacity counting inside `DB::transaction()` with pessimistic row-level locking (`lockForUpdate()`).
- Only **occupying statuses** (`pending`, `confirmed`, `attended`, `no_show`) consume doctor capacity.
- Non-occupying statuses (`cancelled`, `rejected`, `expired`, `rescheduled`) release capacity immediately.
- Capacity is isolated per doctor, meaning Doctor A reaching capacity does not block Doctor B.

### 3.3 Quota Ledger Invariants (P3 / P10)
- **Pending Booking:** Does **NOT** deduct quota.
- **Confirmation:** Deducts **exactly 1 quota unit** atomically when transitioned to `confirmed` by the doctor/director, and writes a `confirmation` transaction.
- **Idempotency:** Double confirmation does not duplicate deductions.
- **Refund Policy:** Cancelling/rejecting a previously confirmed booking refunds **+1 unit** and writes a `refund` ledger transaction.

### 3.4 Booking Reference Number
- Unique, immutable commercial identifier formatted as `MS-YYYY-XXXX` (e.g., `MS-2026-0001`).

---

## 4. 4D Authorization Integration

1. **Role (L1):**
   - `doctor`: Can view, confirm, cancel, reject, and reschedule appointments within authorized clinics.
   - `doctor_assistant`: Can view queue and create bookings (`booking.create`, `booking.manage_queue`, `booking.confirm_attendance`). Hard permission ceiling explicitly blocks `booking.confirm_quota`.
   - `booking_center`: Can create institutional bookings, view quota balance, purchase packages, and view transaction history. **Strict Privacy Wall: zero access to clinical EHR records.**
2. **Position (L2):**
   - `director`: Clinic-wide appointment management.
   - `doctor` (employed): Personal appointments only.
3. **Scope (L3):**
   - Scoped to `clinic_id`, `doctor_id`, and `booking_center_id`.

---

## 5. Seeded Packages (`booking_packages`)

Executed via `BookingPackageSeeder`:

| Package Code | Name | Quota Units | Price (DZD) |
|--------------|------|-------------|-------------|
| `PKG_100` | باقة 100 حجز (Starter) | 100 | 15,000.00 |
| `PKG_250` | باقة 250 حجز (Growth) | 250 | 32,500.00 |
| `PKG_500` | باقة 500 حجز (Professional) | 500 | 60,000.00 |
| `PKG_1000` | باقة 1000 حجز (Enterprise) | 1000 | 110,000.00 |

---

## 6. API Route Catalog (`/api/v1/`)

| Method | URI | Controller Action | Middleware |
|--------|-----|-------------------|------------|
| `GET` | `/api/v1/booking-packages` | `BookingPackageController@index` | Public |
| `GET` | `/api/v1/booking-packages/{id}` | `BookingPackageController@show` | Public |
| `GET` | `/api/v1/appointments/slots` | `AppointmentController@slots` | Public |
| `GET` | `/api/v1/booking-centers` | `BookingCenterController@index` | `auth:sanctum` |
| `POST` | `/api/v1/booking-centers` | `BookingCenterController@store` | `auth:sanctum` |
| `GET` | `/api/v1/booking-centers/quota-balance` | `BookingCenterController@quotaBalance` | `auth:sanctum` |
| `GET` | `/api/v1/booking-centers/transactions` | `BookingCenterController@transactions` | `auth:sanctum` |
| `POST` | `/api/v1/booking-centers/purchase-package` | `BookingCenterController@purchasePackage` | `auth:sanctum` |
| `GET` | `/api/v1/booking-centers/{id}` | `BookingCenterController@show` | `auth:sanctum` |
| `GET` | `/api/v1/appointments` | `AppointmentController@index` | `auth:sanctum` |
| `POST` | `/api/v1/appointments` | `AppointmentController@store` | `auth:sanctum` |
| `GET` | `/api/v1/appointments/{id}` | `AppointmentController@show` | `auth:sanctum` |
| `POST` | `/api/v1/appointments/{id}/confirm` | `AppointmentController@confirm` | `auth:sanctum` |
| `POST` | `/api/v1/appointments/{id}/cancel` | `AppointmentController@cancel` | `auth:sanctum` |
| `POST` | `/api/v1/appointments/{id}/reject` | `AppointmentController@reject` | `auth:sanctum` |
| `POST` | `/api/v1/appointments/{id}/reschedule` | `AppointmentController@reschedule` | `auth:sanctum` |

---

## 7. Automated Test Suite Results

```
PASS  Tests\Unit\ExampleTest
PASS  Tests\Unit\Authorization4DTest (6 tests, 38 assertions)
PASS  Tests\Unit\Clinic4DAuthorizationTest (6 tests, 42 assertions)
PASS  Tests\Feature\ExampleTest
PASS  Tests\Feature\AuthTest (3 tests, 31 assertions)
PASS  Tests\Feature\ClinicTest (7 tests, 42 assertions)
PASS  Tests\Feature\AppointmentBookingTest (4 tests, 32 assertions)
PASS  Tests\Feature\QuotaLedgerLifecycleTest (6 tests, 51 assertions)
PASS  Tests\Feature\Booking4DAuthorizationTest (5 tests, 31 assertions)

Tests:    37 passed (267 assertions)
Duration: 14.45s
Result:   100% PASSED ✅
```

---

## 8. Files Created / Modified

### Migrations
- `backend/database/migrations/2026_08_21_090001_create_booking_centers_table.php` [NEW]
- `backend/database/migrations/2026_08_21_090002_create_booking_packages_table.php` [NEW]
- `backend/database/migrations/2026_08_21_090003_create_appointments_table.php` [NEW]
- `backend/database/migrations/2026_08_21_090004_create_booking_transactions_table.php` [NEW]
- `backend/database/migrations/2026_08_21_090005_create_appointment_status_history_table.php` [NEW]

### Models
- `backend/app/Models/BookingCenter.php` [NEW]
- `backend/app/Models/BookingPackage.php` [NEW]
- `backend/app/Models/Appointment.php` [NEW]
- `backend/app/Models/BookingTransaction.php` [NEW]
- `backend/app/Models/AppointmentStatusHistory.php` [NEW]
- `backend/app/Models/User.php` [MODIFIED - added relations]
- `backend/app/Models/Clinic.php` [MODIFIED - added relations]
- `backend/app/Models/Doctor.php` [MODIFIED - added relations]

### Services
- `backend/app/Services/QuotaService.php` [NEW]
- `backend/app/Services/BookingService.php` [NEW]

### Http Layer
- `backend/app/Http/Requests/Booking/CreateAppointmentRequest.php` [NEW]
- `backend/app/Http/Requests/Booking/UpdateAppointmentStatusRequest.php` [NEW]
- `backend/app/Http/Requests/Booking/PurchasePackageRequest.php` [NEW]
- `backend/app/Http/Requests/Booking/RescheduleAppointmentRequest.php` [NEW]
- `backend/app/Http/Resources/AppointmentResource.php` [NEW]
- `backend/app/Http/Resources/BookingCenterResource.php` [NEW]
- `backend/app/Http/Resources/BookingPackageResource.php` [NEW]
- `backend/app/Http/Resources/BookingTransactionResource.php` [NEW]
- `backend/app/Http/Controllers/Api/V1/AppointmentController.php` [NEW]
- `backend/app/Http/Controllers/Api/V1/BookingCenterController.php` [NEW]
- `backend/app/Http/Controllers/Api/V1/BookingPackageController.php` [NEW]
- `backend/routes/api.php` [MODIFIED - registered P14 routes]

### Seeders & Tests
- `backend/database/seeders/BookingPackageSeeder.php` [NEW]
- `backend/database/seeders/DatabaseSeeder.php` [MODIFIED]
- `backend/tests/Feature/AppointmentBookingTest.php` [NEW]
- `backend/tests/Feature/QuotaLedgerLifecycleTest.php` [NEW]
- `backend/tests/Feature/Booking4DAuthorizationTest.php` [NEW]

---

## 9. Governance & Phase Boundary Confirmation

- [x] **P10 v1.3:** FROZEN & UNMODIFIED
- [x] **P11 Execution Report:** UNMODIFIED
- [x] **P12 Execution Report:** UNMODIFIED
- [x] **P13 Execution Report:** UNMODIFIED
- [x] **P14:** **COMPLETED & FULLY VERIFIED**
- [x] **P15 (EHR & Clinical):** **NOT STARTED (FROZEN)**
- [x] **P16 (Prescriptions & Diagnostics):** **NOT STARTED (FROZEN)**
- [x] **P17 (Audit & Logs):** **NOT STARTED (FROZEN)**
