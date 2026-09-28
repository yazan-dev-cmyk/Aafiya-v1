# MEDISERVICES_BACKEND_ARCHITECTURE_v1.0 — FROZEN

**Project:** MediServices — خدمات طبية
**Phase:** P9 — Laravel Backend Architecture Specification
**Version:** 1.0
**Status:** 🔒 FROZEN — Approved Architectural Contract
**Database:** MySQL 8.0
**Backend:** Laravel 11
**PHP Version:** 8.3
**ORM:** Eloquent ORM
**Frontend:** Next.js + TypeScript

---

## 1. Purpose & Authority
تحدد هذه الوثيقة البنية المعمارية المعتمدة لخلفية نظام MediServices. الـ Backend هو المصدر الوحيد والنهائي للحقيقة (Single Source of Truth)، ولا يجوز للـ Frontend فرض أي قواعد عمل أو أمان.

---

## 2. Core Architectural Principles
1. **Controller Rule:** الـ Controllers لا تحتوي على أي Business Logic؛ وظيفتها التنسيق فقط.
2. **Service Layer Rule:** الـ Services هي المالكة الوحيدة لـ Business Workflows.
3. **Policy Layer Rule:** الـ Policies هي المسؤولة عن اتخاذ قرارات الصلاحية (Authorization).
4. **Backend Authority Rule:** الـ Backend يمتلك كافة قرارات الأمان، والـ UI مجرد مرآة للحالة المصرح بها.
5. **Atomic Transactions:** كافة العمليات الحرجة (حجز، خصم حصص، اعتماد طبي) يجب أن تتم داخل Database Transactions.

---

## 3. Layered Execution Flow
`Request` → `Middleware` → `Controller` → `Form Request (Validation)` → `Policy (Authorization)` → `Service (Logic)` → `Model/Eloquent (Database)` → `Resource (Formatting)` → `Response`

---

## 4. Key Services & Domains
### 4.1 Booking & Quota Domain
- **`BookingService`:** إدارة عمليات الحجز، التحقق من السعة، والتحقق من التكرار.
- **`AvailabilityService`:** توليد الـ Slots (60 دقيقة) بناءً على ساعات عمل العيادة والاستثناءات.
- **`QuotaService`:** إدارة رصيد الحصص، عمليات الشراء، الخصم عند التأكيد، والتعامل مع الإرجاع (Refund).
- **`Atomic Confirmation:`** عملية التأكيد وخصم الحصة يجب أن تكون ذرية (Atomic) داخل Transaction واحدة.

### 4.2 Clinical & EHR Domain
- **`EhrService`:** إدارة الملفات الطبية مع تطبيق جدار الخصوصية (Privacy Wall) المعتمد في P4.
- **`ClinicalVisitService`:** إدارة الزيارات السريرية والاعتماد النهائي (Finalization) ومنع التعديل اللاحق (Immutability).
- **`ClinicalAccessService`:** تتبع عمليات الوصول للبيانات الطبية وتسجيل أسباب الوصول (Access Reason).

### 4.3 Diagnostic Domain
- **`LaboratoryService` & `RadiologyService`:** إدارة مسارات العمل وفق P6.
- **`DiagnosticAuthorizationService`:** التحقق من أن المساعد الذي يقوم بالاعتماد (Finalize) مرخص ومخول صراحة بذلك.

---

## 5. Security & Authorization (P2 Logic)
- **Four-Layer Auth:** يتم التحقق من (Role + Position + Scope + Delegation) في كل طلب.
- **Permission Ceiling:** لا يمكن لتفويض المساعد أن يتجاوز السقف المحدد لدوره نظامياً.
- **Query Scoping:** يتم فرض عزل البيانات (Clinic/Personal Scope) على مستوى الاستعلامات (Queries) في الـ Backend.

---

## 6. Audit & Integrity Trait (P7 Logic)
- **`ActivityAudit`:** تسجيل كل تغيير في البيانات (Old vs New) مع Request ID للربط.
- **`ClinicalAccessAudit`:** تسجيل كل عملية عرض للبيانات السريرية الحساسة مع ذكر السبب.
- **Immutability:** سجلات التدقيق غير قابلة للحذف أو التعديل نهائياً.

---

## 7. Technical Standards
- **UUID:** استخدام الـ UUID كمعرف أساسي لكافة الكيانات الرئيسية.
- **Soft Deletes:** تطبيق الحذف المنطقي للكيانات المحددة في P1، مع استثناء سجلات التدقيق والعمليات المالية.
- **API Standardization:** الالتزام التام بهيكل الاستجابة الموحد في P8 واستخدام `JsonResource`.
- **MySQL 8.0:** الالتزام الصارم بخصائص MySQL 8.0 (مثل JSON columns و Locking strategies).

---

## 8. Directory Structure (Laravel Standard)
```text
app/
 ├── Services/          # Domain Logic (The Brain: Booking, EHR, Quota, etc.)
 ├── Http/
 │    ├── Controllers/  # Clean & Thin Controllers
 │    ├── Requests/     # Validation Logic (Form Requests)
 │    ├── Resources/    # API Response Transformers (JsonResource)
 │    └── Middleware/   # Security & Scoping (Sanctum)
 ├── Policies/          # Authorization Logic (Can actor do X?)
 ├── Models/            # Eloquent Models (UUID, SoftDeletes)
 ├── Traits/            # Shared logic (Logging, UUID)
 ├── Observers/         # Side effects
 └── Jobs/              # Async tasks (e.g., Expire Pending Bookings)
```

---

## 9. FINAL ARCHITECTURAL STATUS
╔══════════════════════════════════════════════════════╗
║     MEDISERVICES BACKEND ARCHITECTURE v1.0          ║
║                                                      ║
║     PHASE: P9                                        ║
║     STATUS: 🔒 FROZEN                                ║
║                                                  	   ║
║     LOGIC: SERVICE LAYER DRIVEN                      ║
║     AUTHORIZATION: POLICY ENFORCED                   ║
║     TRANSACTIONS: ATOMIC FOR CRITICAL OPS            ║
║     CAPACITY: PER DOCTOR / 1-HOUR SLOT               ║
║     QUOTA: DEDUCTED ON CONFIRMATION                  ║
║                                                  	   ║
║     APPROVED FOR P10: INITIALIZATION                 ║
╚══════════════════════════════════════════════════════╝
