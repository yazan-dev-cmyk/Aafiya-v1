# MEDISERVICES_DATABASE_SPECIFICATION_v1.0 — FROZEN

المنصة: MediServices — خدمات طبية
الإصدار: 1.0
الحالة: 🔒 FROZEN — Approved Database Contract
Database Engine: MySQL 8.0
Backend: PHP 8.3 + Laravel 11
Frontend: Next.js + TypeScript
API: REST API /api/v1/
Architecture: Domain-Driven Schema
Development Environment: XAMPP + VS Code
Development Methodology: Contract-First

---

## 1. حالة الوثيقة
هذه الوثيقة هي العقد الرسمي لقاعدة بيانات MediServices — Version 1.0.
بعد اعتمادها: لا يجوز تغيير بنية الجداول أو العلاقات الأساسية أثناء تنفيذ Laravel بشكل مباشر.
أي تغيير لاحق يجب أن يمر عبر مسار التغيير الرسمي (Requirement -> Business Rule -> Architecture Impact -> Database Impact -> API Impact -> Permission Impact -> Migration Change -> Versioned Approval).

مصدر الحقيقة هو:
Business Rules -> Frozen Contracts -> Database -> API -> Frontend

---

## 2. المبادئ العامة لقاعدة البيانات
### 2.1 Naming Convention
يتم استخدام `snake_case` للجداول والأعمدة.

### 2.2 Primary Keys
يتم استخدام UUID للكيانات الرئيسية، خصوصاً البيانات الطبية والمؤسساتية، لتقليل قابلية تخمين المعرفات وحماية خصوصية البيانات الطبية الحساسة. الجداول المساعدة والوسيطة قد تستخدم BIGINT.

### 2.3 Foreign Keys
جميع العلاقات المهمة محمية بواسطة Foreign Key Constraints على مستوى MySQL.

### 2.4 Timestamps
استخدام `created_at` و `updated_at` بشكل افتراضي، مع `deleted_at` للكيانات التي تعتمد Soft Delete.

---

## 3. Soft Deletes
يطبق على الكيانات الرئيسية (Patients, Doctors, Clinics, Assistants, Booking Centers, Appointments, Prescriptions, Laboratories, Radiology Centers, Advertisements). لا يطبق إجبارياً على جداول الصلاحيات أو الـ Logs لضمان النزاهة التاريخية.

---

## 4. Clinic Organizational Model — FROZEN
العيادة هي الكيان المؤسسي الأساسي في النظام، وتتكون من:
`Clinic` -> `Clinic Director` -> `Employed Doctors` + `Assistants`.

### Clinic Director (مدير العيادة)
- هو طبيب يحمل دور `doctor` ومنصب `director` داخل عيادة محددة.
- هو السلطة الإدارية الوحيدة المخولة بإنشاء حسابات الأطباء الموظفين والمساعدين.

### Employed Doctor (طبيب موظف)
- يحمل دور `doctor` ومنصب `doctor`.
- يعمل تحت إشراف المدير ولا يملك صلاحيات إدارية (إنشاء حسابات أو تعديل إعدادات العيادة).

### Assistants (مساعدون)
- تابعون للعيادة ومديرها، وليسوا تابعين لطبيب موظف بعينه.
- يتم تحديد صلاحياتهم عبر تفويض من مدير العيادة (`permissions_json`).

---

## 5. Domain: Identity & RBAC
### `users`
- `id` (UUID PK)
- `name`, `email` (UNIQUE), `password`, `phone` (UNIQUE)
- `is_active`, `last_login_at`
- لا يحتوي الجدول على حقل Role؛ الأدوار تدار عبر RBAC.

### `roles` & `permissions`
الجداول القياسية للأدوار والصلاحيات، مرتبطة عبر جداول وسيطة `role_user` و `permission_role`.

---

## 6. Domain: Clinical Institutions
### `clinics`
- `id` (UUID PK), `name`, `address`, `wilaya`, `phone`
- `director_doctor_id` (FK -> doctors.id) -- المدير الرسمي للعيادة (مدير واحد فقط).
- `max_patients_per_slot`, `slot_duration_min`
- `is_active` (boolean)

### `doctors`
- `id` (UUID PK), `user_id` (FK -> users)
- `specialty`, `license_number`, `bio`, `is_verified`

### `doctor_clinic` (Pivot)
- `doctor_id` (FK), `clinic_id` (FK)
- `position` (enum: 'director', 'doctor') -- المنصب داخل هذه العيادة المحددة.
- `is_primary` (boolean) -- هل هي العيادة الأساسية للطبيب.
- `joined_at` (timestamp)

### `clinic_assistants`
- `id` (UUID PK), `user_id` (FK -> users), `clinic_id` (FK -> clinics)
- `permissions_json` (JSON) -- تفويض الصلاحيات من قبل المدير.
- `created_by_id` (FK -> users) -- المدير الذي أنشأ الحساب.
- `is_active` (boolean)

---

## 7. Role vs Position — Architecture Rule
- **Role (Identity Level):** يحدد نوع الحساب في النظام (مثلاً: `doctor`). يمنح الصلاحيات السريرية الأساسية.
- **Position (Relationship Level):** يحدد الوظيفة داخل العيادة (`director` أو `doctor`). 
- **Rule:** يمكن للطبيب أن يكون مديراً (Director) في عيادة "أ" وموظفاً (Employed Doctor) في عيادة "ب". الصلاحيات الإدارية تتبع المنصب (Position) ضمن نطاق العيادة (Clinic Scope).

---

## 8. Domain: Booking Domain
### `appointments`
- `id` (UUID PK), `booking_reference` (UNIQUE)
- `patient_id`, `clinic_id`, `doctor_id`, `booking_center_id` (nullable)
- `created_by_id`, `creator_type` (patient, booking_center, etc)
- `appointment_date`, `time_slot`, `status`
- `confirmed_at`, `confirmed_by_id`

### `appointment_status_history`
لتتبع دورة حياة الحجز (Pending -> Confirmed -> etc) ومعرفة من قام بالتغيير والسبب.

### `booking_transactions`
سجل المعاملات المالي لرصيد الحجوزات (Quota Ledger). يشمل (purchase, reservation, confirmation, refund, adjustment). الخصم الفعلي يتم عند تأكيد الطبيب (Confirmation).

### `booking_packages`
إدارة باقات الحجوزات وأسعارها الحالية (100, 250, 500, 1000 وحدة).

---

## 8. Domain: EHR & Prescription Domains
### `patients`, `emergency_contacts`, `patient_allergies`, `patient_chronic_conditions`, `patient_current_medications`.
### `clinical_visits`: سجل الزيارة السريرية (الأعراض، التشخيص، الملاحظات).
### `prescriptions`: تشمل `secure_token` (Opaque Token للـ QR).
### `prescription_items`, `prescription_templates`, `prescription_template_items`.

---

## 9. Domain: Diagnostics Domain (Lab & Radiology)
نظام كامل للطلبات والعينات والنتائج والأشعة، مع حالات سير عمل واضحة (created, received, in_progress, completed, finalized).

---

## 10. Domain: Advertising Domain
نظام إعلانات يستهدف (Role + Specialty + Placement + Date Range)، مع دعم ميزة (Free Welcome Advertisement) للأطباء الجدد.

---

## 11. Domain: Activity & Audit Logs
تسجيل كافة العمليات الحساسة (تعديل البيانات الطبية، الحجوزات، الصلاحيات) مع حفظ القيم القديمة والجديدة وحماية خصوصية البيانات الطبية في السجلات.

---

## 12. Domain: Statistical Visibility & Analytics Scopes — FROZEN
تحدد هذه القواعد نطاق الوصول للتقارير والإحصائيات بناءً على المنصب (Position) داخل العيادة.

### 12.1 Clinic Director Scope (الإدارة الشاملة)
يتمتع مدير العيادة (`position: director`) بصلاحية الوصول إلى:
- **إحصائيات العيادة الكلية:** (إجمالي الحجوزات، معدل الإلغاء، الإيرادات العامة).
- **مقارنة الأداء:** (عدد المواعيد لكل طبيب موظف، توزيع الحالات).
- **إحصائيات التشغيل:** (أداء المساعدين، أوقات الانتظار، معدل إشغال الـ Slots).

### 12.2 Employed Doctor Scope (النطاق الشخصي)
يقتصر وصول الطبيب الموظف (`position: doctor`) على:
- **إحصائياتي الشخصية:** (حجوزاتي المؤكدة، مرضاي، معدل إنجاز مواعيدي اليومية).
- **الأداء الفردي:** (نمو عدد مرضاي الشخصي، تقييمات المرضى الخاصة بي فقط).
- **المحظورات:** يمنع منعاً باتاً الاطلاع على أداء الزملاء الآخرين أو إجمالي إحصائيات العيادة الإدارية.

---

## 13. FINAL STATUS
╔══════════════════════════════════════════════╗
║ MEDISERVICES DATABASE SPECIFICATION v1.0    ║
║                                              ║
║ STATUS: 🔒 FROZEN                            ║
║                                              ║
║ Phase: P1                                    ║
║ Database: MySQL 8.0                          ║
║ Backend: PHP 8.3 + Laravel 11               ║
║ Architecture: Domain-Driven Schema           ║
║                                              ║
║ APPROVED FOR P2                              ║
╚══════════════════════════════════════════════╝
