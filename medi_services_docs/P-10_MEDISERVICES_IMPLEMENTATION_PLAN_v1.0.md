MEDISERVICES IMPLEMENTATION PLAN v1.3

Document ID: MSP-P10-v1.3
Project: MediServices — خدمات طبية
Phase: P10 — Laravel Backend Initialization & Implementation Specification
Status: 🔒 ARCHITECTURAL APPROVED — VERSION 1.3
Version: 1.3
Date: 2026-08-21
Classification: Internal Engineering / Architecture / Implementation
Authority: P1–P9 Frozen Architecture + P10 Backend Specification v1.3
Next Phase: P11 — Laravel Backend Initialization

1. DOCUMENT CONTROL
1.1 Document Purpose

تحدد هذه الوثيقة البنية الهندسية الرسمية للـ Backend الخاص بمنصة MediServices، وتحوّل القرارات المعمارية المجمدة في المراحل السابقة P1–P9 إلى مواصفة تنفيذية واضحة لمرحلة P10.

لا تُعد هذه الوثيقة إعادة تحليل للمشروع، ولا تعيد تعريف المتطلبات الوظيفية السابقة، وإنما تحدد كيف سيتم بناء طبقة Backend بما يتوافق مع تلك المتطلبات.

1.2 Document Authority

تُعتبر هذه الوثيقة المرجع التنفيذي الرسمي لتهيئة Backend ابتداءً من P11، ما لم يتم إصدار Change Request رسمي يغيّر أحد القرارات المعمارية المجمدة.

1.3 Version Policy

أي تعديل على:

Database Architecture
Authorization Model
API Contract
EHR Privacy Rules
Booking Integrity
Quota Integrity
Prescription Integrity
Diagnostic Approval
Audit Architecture

يجب أن يخضع لإجراء Change Control قبل اعتماده.

1.4 Supersession & Scope Statement

تُعد هذه الوثيقة (P10 v1.3) الإصدار المعتمد الذي يحل محل الإصدار السابق (P10 v1.2) حصرًا فيما يتعلق بتحديث خط الأساس لإطار العمل من Laravel 11 إلى Laravel 13، والآثار التقنية المترتبة على هذا التحديث. لا تُعد هذه الوثيقة إعادة تصميم للبنية المعمارية المعتمدة للمشروع أو تعديلاً لقواعد العمل أو العقود المجمدة في P1–P9.

1.5 Change Control: Reason for P10 v1.3

- **سبب التحديث:** كان الإصدار P10 v1.2 يحدد Laravel 11 كخط أساس تقني. ووفقًا لسياسة الدعم الرسمية لإطار عمل Laravel، انتهت فترة الدعم الأمني الرسمي لإصدار Laravel 11 بتاريخ 12 مارس 2026.
- **إصدار خط الأساس الجديد:** تم اعتماد إصدار **Laravel 13** (الذي أُطلق رسميًا في 17 مارس 2026، وتستمر إصلاحات الأخطاء فيه حتى الربع الثالث من عام 2027 والدعم الأمني حتى 17 مارس 2028).
- **بيئة التشغيل:** يتطلب Laravel 13 رسميًا إصدار **PHP 8.3** كحد أدنى (وهو نفس إصدار PHP المعتمد في P10 v1.2)، وبالتالي تم الإبقاء على PHP 8.3 دون تصعيد.
- **طبيعة التغيير:** هذا تحديث تقني لخط الأساس (Technical Baseline Update) قبل بدء مرحلة التنفيذ P11 لضمان استقرار ودعم المنظومة على المدى الطويل، وليس إعادة تصميم معماري.
- **المصدر الرسمي المعتمد:** وثائق Laravel الرسمية (Laravel Releases & Support Policy: https://laravel.com/docs/13.x/releases).

1.6 P10 v1.3 Changelog

- **تحديث إطار العمل:** ترقية خط الأساس للـ Backend من Laravel 11 إلى Laravel 13.
- **التحقق من PHP:** تأكيد التوافق التام مع PHP 8.3 (الحد الأدنى لمتطلبات Laravel 13) والإبقاء عليه كخط أساس للمشروع.
- **مراجعة الآثار التقنية:** إجراء تحليل أثر شامل ومفصل لترقية Laravel 11 → Laravel 13 عبر كافة مكونات النظام.
- **توثيق متطلبات Laravel 13:** توثيق المتطلبات الخاصة بإطار عمل Laravel 13 والاعتبارات التنفيذية المصاحبة.
- **حماية العقود والمعمارية:** الحفاظ الكامل على عقود وقواعد ومواصفات المراحل P1–P9 دون أي تعديل.
- **حماية سجل الترحيلات:** الإبقاء على سجل الترحيلات الرسمي (Migration Registry 31/31) دون أي تغيير في هيكل أو أسماء أو عدد الجداول.
- **حماية واجهات البرمجة:** الإبقاء على بنية وعقود الـ REST API المعيارية `/api/v1/`.
- **حماية المصادقة:** الإبقاء على بنية المصادقة المعتمدة عبر Laravel Sanctum (`laravel/sanctum ^4.0`).
- **حماية طبقة الخدمات والصلاحيات:** الإبقاء على Service Layer و Policy Layer و 4D Authorization و Privacy Wall.
- **حماية حدود P11:** الإبقاء على P10 كمواصفة هندسية وتوثيقية وحصر التنفيذ البرمجي الفعلي في مرحلة P11 المستقلة.

2. PURPOSE & OBJECTIVES

تهدف P10 إلى إنشاء أساس Backend production-ready لمنصة MediServices.

الأهداف الرئيسية:

تهيئة Laravel Backend.
تثبيت بنية API Versioning.
تجهيز Laravel Sanctum.
إنشاء Architecture واضحة للـ Services.
إنشاء Policies وAuthorization Layer.
تجهيز Migration Registry الرسمي.
اعتماد استراتيجية UUID.
اعتماد Soft Delete حيث يسمح المجال.
تجهيز Audit Infrastructure.
حماية العمليات الحرجة بالـ Transactions.
استخدام Row Locking عند الحاجة.
حماية بيانات المرضى بواسطة Privacy Wall.
منع وضع Business Logic داخل Controllers.
تجهيز Backend ليكون المصدر الوحيد للحقيقة.
3. AUTHORITY & SOURCE OF TRUTH
3.1 Backend Authority

الـ Backend هو Source of Truth الوحيد في كل ما يتعلق بـ:

Authorization
Permissions
Roles
Scope
Clinical Relationships
Booking State
Slot Availability
Quota
Prescription Integrity
Diagnostic Workflow
Audit Logs

لا يجوز للـ Frontend افتراض نجاح عملية حساسة بناءً على حالته الداخلية.

3.2 Frontend Relationship

الـ Frontend:

يعرض البيانات.
يرسل Requests.
يعرض حالة العملية.
يتعامل مع أخطاء API.
لا يقرر الصلاحيات.
لا يقرر الوصول السريري.
لا يقرر صحة الحصة.
لا يقرر صلاحية الاعتماد النهائي.

القرار النهائي دائماً للـ Backend.

3.3 Contract Authority

عند وجود اختلاف بين:

Frontend assumptions
Mock Data
Backend state

فإن Backend state هو المعتمد.

4. P10 NON-NEGOTIABLE RULES
4.1 Backend Authority

Backend هو المصدر الوحيد للحقيقة بالنسبة إلى:

Authorization & Business Rules
Booking State & Slot Availability
Quota Management
EHR Access
Prescription Integrity
Diagnostics Workflow
Audit Logs
4.2 Frontend Is a Mirror

الـ Frontend لا يملك صلاحية تقرير الصلاحيات.

كل عملية محمية يجب أن تمر عبر API ويقرر Backend السماح بها وفق نموذج 4D Authorization.

4.3 No Business Logic in Controllers

Controllers مسؤولة عن:

استقبال Request.
Form Request Validation.
استدعاء Service.
استدعاء Policy عند الحاجة.
إعادة Response.

لا يجوز وضع Workflow معقد داخل Controller.

4.4 Services Own Business Workflows

العمليات المعقدة تملكها Services، ومنها:

BookingService
QuotaService
EhrService
PrescriptionService
DiagnosticsService
VerificationService
AuditService
5. P10 SCOPE

يشمل P10:

Laravel Backend Architecture.
Laravel 13 initialization.
Sanctum.
API v1.
Services.
Policies.
Middleware.
Form Requests.
Models.
Migrations.
UUID.
Soft Delete.
Transactions.
Locking.
Audit.
Privacy Wall.
Quota.
Booking integrity.
Prescription integrity.
Diagnostics authorization.
Testing architecture.
Environment configuration.

لا تشمل P10:

بناء واجهات Frontend جديدة.
إعادة تصميم UI/UX.
استبدال قرارات P1–P9.
إدخال Business Logic في Frontend.
حذف أو إعادة تسمية جداول P1 المعتمدة دون Change Request.
6. FROZEN CONTRACTS P1–P9

تتعامل P10 مع P1–P9 باعتبارها طبقات معمارية سابقة معتمدة.

6.1 Frozen Principles

يجب الحفاظ على:

4D Authorization Model.
Privacy Wall.
Authorized Clinical Relationship.
Quota Integrity.
Booking Integrity.
Diagnostic Approval Rules.
Prescription Integrity.
Auditability.
6.2 P1 Database Authority

P1 هو المرجع الرسمي لـ Database Registry.

عدد الجداول المعتمد في P10:

31 Table

6.3 Conflict Rule

في حال اكتشاف تعارض بين P10 وأحد العقود السابقة:

لا يتم التصحيح بشكل صامت.

يتم تسجيل:

ARCHITECTURAL CONFLICT

ثم إيقاف الجزء المتعارض إلى حين إصدار قرار رسمي.

7. APPROVED TECHNOLOGY STACK
7.1 Backend
- PHP: 8.3 (الحد الأدنى لمتطلبات Laravel 13)
- Framework: Laravel 13 (`laravel/framework: ^13.0`)
- Database: MySQL Community Server 8.0.x
- Authentication: Laravel Sanctum (`laravel/sanctum: ^4.0`)
- API: REST API `/api/v1/`
- Testing: PHPUnit `^12.0` / Pest `^4.0` / Laravel Testing Stack

7.2 Architecture

النمط المعتمد:

Controller → Form Request / Policy → Service → Model / Repository Logic → Database

مع استخدام:

Policies
Middleware
Events
Listeners
Jobs
Notifications
Resources

حسب الحاجة.

7.3 API Version

النسخة الأولى:

/api/v1

ولا يسمح بإزالة أو تغيير /api/v1 بعد إطلاقها.

7.4 Laravel 11 → Laravel 13 Compatibility Impact Analysis

يوضح الجدول التالي التحليل التفصيلي لأثر ترقية خط الأساس من Laravel 11 إلى Laravel 13 عبر كافة الجوانب المعمارية والتنفيذية لمنصة MediServices وفقًا للوثائق الرسمية لـ Laravel:

| العنصر | تصنيف الأثر | التحليل والقرار المعماري |
| :--- | :--- | :--- |
| **PHP Version** | `IMPLEMENTATION CONSIDERATION` | يتطلب Laravel 13 رسميًا إصدار PHP 8.3 أو أعلى (8.3 - 8.5). كان P10 v1.2 يحدد PHP 8.3، وبالتالي يتم الإبقاء على **PHP 8.3** كخط أساس للمشروع دون الحاجة لتصعيده. |
| **Application Structure** | `NO CHANGE` | يحافظ Laravel 13 على الهيكل المدمج والحديث (Streamlined Structure) المعتمد منذ Laravel 11 (`bootstrap/app.php` و `routes/api.php`) دون وجود لملفات الـ Kernel القديمة. |
| **Routing** | `IMPLEMENTATION CONSIDERATION` | تم تقديم أولوية مطابقة المسارات المحددة بالنطاق (Domain routes precedence). بما أن مسارات MediServices تعتمد البادئة المسارية المعيارية `/api/v1/` داخل `routes/api.php`، فلا يوجد أي تغيير معماري. |
| **Middleware** | `IMPLEMENTATION CONSIDERATION` | تم تحديث طبقة الحماية من تزوير الطلبات إلى `PreventRequestForgery` مع دعم التحقق عبر ترويسة `Sec-Fetch-Site`. بالنسبة لـ `/api/v1` للـ Stateless API، لا تنطبق CSRF؛ ولطلبات الـ SPA المعتمدة على الـ Cookies تُستخدم الفئة المحدثة. |
| **Controllers** | `NO CHANGE` | الالتزام الصارم بمبدأ المتحكمات النحيفة (Thin Controllers) الخالية من أي Business Logic. يوفر Laravel 13 خيار استخدام سمات PHP مثل `#[Middleware]` و `#[Authorize]` كخيار إضافي دون المساس بالبنية. |
| **Form Requests** | `NO CHANGE` | آلية التحقق من صحة المدخلات وتفويض الطلبات عبر Form Requests تظل متطابقة بالكامل دون تعديل. |
| **Policies** | `NO CHANGE` | طبقة الصلاحيات (Policy Layer) تظل المسؤولة الوحيدة عن قرارات الصلاحية وتطبيق نموذج 4D Authorization. |
| **Eloquent** | `IMPLEMENTATION CONSIDERATION` | يمنع Laravel 13 إنشاء نماذج متداخلة أثناء دورة إقلاع النموذج (`boot` cycle) مسببًا `LogicException`. كما تعتمد جداول الربط المتعدد (Polymorphic Pivot) التسمية الجمعية افتراضيًا، وتتم استعادة العلاقات المحملة مسبقًا عند تسلسل المجموعات. لا يوجد تعارض مع نماذج MediServices. |
| **API Resources** | `NO CHANGE` | بنية التحويل المعياري `JsonResource` لتنسيق استجابات `/api/v1/` (`data`, `meta`, `error`) تظل متطابقة بالكامل. توفر موارد JSON:API في Laravel 13 كإمكانية إضافية لا يلغي المعيار المعتمد. |
| **Validation** | `NO CHANGE` | كافة قواعد التحقق المعتمدة ورسائل الخطأ تظل متوافقة بالكامل مع محرك التحقق في Laravel 13. |
| **Authentication** | `NO CHANGE` | تدفق المصادقة وإصدار الـ Tokens عبر Sanctum للـ API والـ Session Cookies للـ SPA يظل هو المعتمد. |
| **Sanctum** | `IMPLEMENTATION CONSIDERATION` | متوافق بالكامل مع Laravel 13 عبر الحزمة الرسمية `laravel/sanctum: ^4.0` التي يتم تهيئتها عبر `php artisan install:api` في P11. |
| **Exception Handling** | `NO CHANGE` | معالجة الاستثناءات المركزية وتنسيق أخطاء API تتم عبر `bootstrap/app.php` باستخدام `withExceptions()` كما هو معتمد. |
| **Database Transactions** | `NO CHANGE` | تنفيذ العمليات الحرجة داخل `DB::transaction()` لضمان الذرية (Atomicity) يظل ركيزة غير قابلة للتغيير. |
| **Row Locking** | `NO CHANGE` | القفل التشاؤمي للأسطر `lockForUpdate()` على جداول الحصص والحجوزات يظل مدعومًا ومعتمدًا بالكامل. |
| **Queues / Jobs** | `IMPLEMENTATION CONSIDERATION` | يدعم Laravel 13 توجيه الطوابير عبر الفئات `Queue::route()`، وتمرير كائن الاستثناء في حدث `JobAttempted`، وسمات التحكم بالمهام `#[Tries]` و `#[Timeout]`. |
| **Events** | `NO CHANGE` | بنية الأحداث والمستمعين (Events & Listeners) والاكتشاف التلقائي تظل مطابقة دون تغيير. |
| **Notifications** | `IMPLEMENTATION CONSIDERATION` | تغيير العنوان الافتراضي لرسالة استعادة كلمة المرور إلى "Reset your password"، ودعم السمة `#[DeleteWhenMissingModels]` للإشعارات المجدولة. |
| **Testing** | `IMPLEMENTATION CONSIDERATION` | بيئة الاختبارات تدعم PHPUnit `^12.0` و Pest `^4.0` مع إعادة ضبط مولدات `Str` تلقائيًا بين الاختبارات. |
| **Configuration** | `IMPLEMENTATION CONSIDERATION` | ضبط إعداد الـ Cache الافتراضي `serializable_classes => false` لتعزيز الأمان ضد هجمات الـ Deserialization، وضبط تسلسل الجلسات الافتراضي على `json`. |
| **Environment Variables** | `IMPLEMENTATION CONSIDERATION` | استخدام الفواصل الواصلة (Hyphens) في بادئات الـ Cache والـ Session الافتراضية؛ وتعيين المتغيرات الصريحة في `.env` يتجاوز القيم التلقائية دائمًا. |
| **Artisan Commands** | `NO CHANGE` | أوامر Artisan المعيارية لإدارة المشروع والترحيلات والتوليد تظل متطابقة. |
| **Deployment** | `NO CHANGE` | إجراءات النشر تعتمد على PHP 8.3 CLI/FPM و Composer 2.x وخادم الويب المعياري. |
| **Nginx / PHP-FPM** | `NO CHANGE` | إعدادات FastCGI لربط Nginx مع PHP 8.3-FPM تظل دون أي تعديل. |
| **MySQL 8 Compatibility** | `IMPLEMENTATION CONSIDERATION` | التوافق التام مع MySQL Community Server 8.0.x. تتطلب عمليات الـ `upsert` تحديد معامل `uniqueBy` غير فارغ، والترجمة الدقيقة لجمل `DELETE ... JOIN`. |

7.5 Laravel 13 Specific Requirements & Implementation Guidelines

1. **إدارة التبعيات:** اعتماد الحزم المتوافقة مع Laravel 13:
   - `laravel/framework: ^13.0`
   - `laravel/sanctum: ^4.0`
   - `phpunit/phpunit: ^12.0` (أو `pestphp/pest: ^4.0`)
2. **الحماية والأمان المعزز:**
   - استخدام وسيط `PreventRequestForgery` بدلاً من الاسم المهجور `VerifyCsrfToken`.
   - الإبقاء على `serializable_classes => false` في إعدادات الـ Cache لحماية التطبيق.
   - استخدام تسلسل `json` للجلسات (`session.serialization => 'json'`).
3. **التعامل مع قاعدة البيانات:**
   - عند استخدام دالة `DB::table(...)->upsert()`، يجب دائمًا تمرير مصفوفة المفاتيح الفريدة في معامل `uniqueBy` لتجنب `InvalidArgumentException`.
   - عدم إنشاء كائنات جديدة من النماذج (Model instantiation) داخل الدالة الثابتة `boot()` لأي نموذج لتفادي `LogicException`.
4. **خدمات الذكاء الاصطناعي والبحث المتجهي (AI SDK & Vector Search):**
   - يوفر Laravel 13 حزمة AI SDK ودوال البحث المتجهي (`whereVectorSimilarTo`) كإمكانيات مدمجة في إطار العمل. تُعد هذه ميزات إضافية متاحة للمنصة مستقبلاً دون أن تؤثر على قواعد العمل الأساسية أو العقود المحددة في P1–P9.
5. **تمديد صلاحية الذاكرة المؤقتة:**
   - إمكانية استخدام `Cache::touch($key, $seconds)` لتحديث عمر العناصر المؤقتة دون إعادة كتابتها.

8. DEVELOPMENT ENVIRONMENT

يجب أن يوفر بيئة تطوير محلية مستقرة تتضمن:

PHP
Composer
Laravel
MySQL
Node.js عند الحاجة لأدوات Frontend
Git
PHPUnit
Laravel Artisan
8.1 Environment Separation

يجب الفصل بين:

Local
Testing
Staging
Production

ولا يجوز استخدام Production credentials in Local.

8.2 Environment Variables

القيم الحساسة يجب أن تكون في .env.

يُمنع:

Commit secrets.
Commit passwords.
Commit API keys.
Commit private credentials.
9. LARAVEL PROJECT INITIALIZATION
9.1 Project Creation

يتم إنشاء Laravel Backend مستقل عن Frontend.

الهدف هو منع تداخل مسؤوليات:

MediServices
├── Frontend
└── Backend
9.2 Initial Laravel Configuration

يجب إعداد:

Application key.
Database connection.
API configuration.
Sanctum.
Cache.
Queue configuration.
Logging.
Mail configuration عند الحاجة.
Timezone.
Localization.
9.3 Initial Validation

بعد التهيئة يجب التأكد من:

Laravel boot.
Database connection.
Migration execution.
Sanctum initialization.
Test suite execution.
API health endpoint.
10. LARAVEL DIRECTORY ARCHITECTURE

البنية الأساسية المقترحة:

app/
├── Actions/
├── Console/
├── Events/
├── Exceptions/
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/
│   └── Resources/
├── Jobs/
├── Listeners/
├── Models/
├── Notifications/
├── Policies/
├── Services/
│   ├── Auth/
│   ├── Booking/
│   ├── Clinical/
│   ├── Diagnostics/
│   ├── Laboratory/
│   ├── Prescription/
│   ├── Quota/
│   ├── Audit/
│   └── Verification/
└── Support/
10.1 Architecture Rule

لا يتم إنشاء مجلدات أو طبقات لمجرد زيادة التعقيد.

كل طبقة يجب أن تملك مسؤولية واضحة.

11. DOMAIN ARCHITECTURE

يقسم Backend إلى Domains:

Identity
Institutions
Booking
EHR
Clinical
Prescriptions
Diagnostics
Laboratory
Radiology
Marketing
Audit
Verification
11.1 Domain Isolation

لا يجوز لـ Domain أن يتجاوز Security Boundary الخاص بـ Domain آخر.

مثال:

BookingService

لا يجب أن يتولى بنفسه منطق EHR.

بدلاً من ذلك يستخدم Service أو Contract مناسباً.

12. SERVICE LAYER ARCHITECTURE
12.1 Principle

Services هي المكان الرئيسي لتنفيذ Business Workflows.

12.2 Core Services

يجب تجهيز:

AuthService
BookingService
QuotaService
EhrService
ClinicalService
PrescriptionService
DiagnosticsService
LaboratoryService
RadiologyService
AuditService
VerificationService
12.3 Service Responsibilities
BookingService

مسؤول عن:

إنشاء Booking.
التحقق من availability.
تغيير state.
cancellation.
confirmation.
locking.
QuotaService

مسؤول عن:

quota validation.
deduction.
restoration وفق القواعد المعتمدة.
transaction integrity.
EhrService

مسؤول عن:

EHR access.
clinical relationship verification.
privacy wall enforcement.
13. POLICY & 4D AUTHORIZATION ARCHITECTURE
13.1 4D Model

القرار الأمني يعتمد على أربعة أبعاد:

Role
Position
Scope
Permission
13.2 Authorization Formula

الوصول لا يعتمد على Role وحده.

مفهومياً:

Access =
Role
+ Position
+ Scope
+ Permission
+ Resource Rules

وبالنسبة للبيانات السريرية يضاف:

+ Authorized Clinical Relationship
13.3 Policies

يجب استخدام Policies للعمليات المتعلقة بالموارد.

أمثلة:

AppointmentPolicy
PatientPolicy
DoctorPolicy
PrescriptionPolicy
DiagnosticOrderPolicy
ClinicalVisitPolicy
AuditLogPolicy
13.4 Privacy Wall

حتى امتلاك Permission عامة لا يعني تلقائياً امتلاك حق الوصول إلى بيانات EHR.

14. API CONTRACT MAPPING
Domain	Endpoint Root	Auth	Permission Check
Auth	/api/v1/auth	Public/Sanctum	Role
Quota	/api/v1/quota	Sanctum	Role + Scope + Permission
Clinical	/api/v1/ehr	Sanctum	Role + Scope + Permission + Authorized Clinical Relationship
Laboratory	/api/v1/lab	Sanctum	Role + Scope + Permission
Radiology	/api/v1/radiology	Sanctum	Role + Scope + Permission
Audit	/api/v1/audit	Sanctum	Role + Scope + Permission
Verification	/api/v1/verification	Public	Opaque Token Validation
14.1 API Rule

كل Endpoint جديد يجب أن يحدد:

Authentication.
Authorization.
Scope.
Resource.
Validation.
Response.
Error Contract.
Audit requirement.
15. AUTHENTICATION & SANCTUM ARCHITECTURE
15.1 Authentication

يستخدم Laravel Sanctum لإدارة API authentication.

15.2 Token Principle

Token يثبت هوية المستخدم.

لكن:

Authentication ≠ Authorization.

نجاح Authentication لا يعني السماح بالعملية.

15.3 Authentication Flow
Request
   ↓
Sanctum
   ↓
Authenticated User
   ↓
Authorization
   ↓
Policy / Service
   ↓
Business Rule
   ↓
Response
15.4 Logout

يجب دعم إلغاء الـ Token وفق سياسة Authentication المعتمدة.

16. MIDDLEWARE ARCHITECTURE

Middleware تستخدم للحماية العامة قبل الوصول إلى Controller.

أمثلة:

Authenticate
EnsureApiVersion
ResolveScope
CheckPermission
PrivacyBoundary
AuditRequest
RateLimit
16.1 Middleware Rule

لا توضع Business Workflow داخل Middleware.

Middleware تتحقق من شروط الوصول أو البنية العامة للطلب.

17. FORM REQUESTS & VALIDATION
17.1 Validation Principle

Validation يجب أن تتم قبل Service execution.

17.2 Form Requests

كل Request معقد يجب أن يملك Form Request خاصاً به.

أمثلة:

CreateAppointmentRequest
ConfirmAppointmentRequest
CreatePrescriptionRequest
CreateDiagnosticOrderRequest
UpdatePatientRequest
17.3 Validation Layers

هناك فرق بين:

Input Validation

هل البيانات صحيحة شكلياً؟

Business Validation

هل العملية مسموحة وفق النظام؟

Input Validation → Form Request.

Business Validation → Service / Policy.

18. MIGRATION REGISTRY — 31 TABLES

السجل الرسمي:

Identity — 5
users
roles
permissions
role_user
permission_role
Institutions — 4
clinics
doctors
doctor_clinic
clinic_assistants
Booking — 5
appointments
appointment_status_history
booking_transactions
booking_packages
booking_centers
EHR — 5
patients
emergency_contacts
patient_allergies
patient_chronic_conditions
patient_current_medications
Clinical — 1
clinical_visits
Prescriptions — 4
prescriptions
prescription_items
prescription_templates
prescription_template_items
Diagnostics — 4
diagnostic_orders
laboratory_samples
laboratory_results
radiology_reports
Marketing — 1
advertisements
Audit — 2
activity_logs
clinical_access_logs
18.1 Removed Table

تم حذف:

patient_health_profiles

نهائياً من P10 لمطابقة P1.

19. ELOQUENT MODEL STRATEGY

لكل جدول Domain Model مطابق.

أمثلة:

User
Role
Permission
Clinic
Doctor
Appointment
Patient
ClinicalVisit
Prescription
DiagnosticOrder
LaboratoryResult
RadiologyReport
ActivityLog
ClinicalAccessLog
19.1 Model Responsibility

Models مسؤولة عن:

Relationships.
Casting.
Attributes.
Persistence behavior.
Model-level invariants المناسبة.

ولا يجب أن تتحول Model إلى Service ضخمة تحتوي على Workflow كامل.

19.2 Relationships

يجب تعريف العلاقات بوضوح، مثل:

Doctor ↔ Clinic
User ↔ Roles
Role ↔ Permissions
Doctor ↔ Appointments
Patient ↔ Clinical Visits
Prescription ↔ Prescription Items
Diagnostic Order ↔ Laboratory Sample
20. UUID & SOFT DELETE STRATEGY
20.1 UUID

يتم اعتماد UUID للكيانات التي تتطلب معرفات غير قابلة للتخمين بسهولة في API.

الهدف:

تقليل enumeration risk.
تحسين API identity.
فصل Public Identifier عن integer sequence.
20.2 UUID Rule

لا يجوز كشف Internal identifiers الحساسة بطريقة تؤدي إلى تجاوز Authorization.

UUID ليس بديلاً عن Authorization.

20.3 Soft Delete

Soft Delete يستخدم فقط للكيانات التي يسمح Domain الخاص بها بالحذف المنطقي.

لا يستخدم بشكل أعمى على السجلات الطبية أو السجلات التي يجب الاحتفاظ بها لأغراض integrity/audit.

20.4 Immutable Records

السجلات السريرية أو التشخيصية التي أصبحت Finalized يجب ألا تعامل كسجلات عادية قابلة للحذف أو التعديل الحر.

21. BUSINESS RULE ENFORCEMENT
21.1 Authorized Clinical Relationship

الوصول إلى EHR يتطلب علاقة سريرية موثقة، مثل:

حجز نشط.
إحالة.
علاقة تاريخية معتمدة.

امتلاك Permission عامة لا يتجاوز هذا الشرط.

21.2 Quota Integrity

الخصم المالي يتم عند:

Confirmation فقط.

الحجز Pending لا يؤدي إلى خصم نهائي.

21.3 Pending Expiration

الحجوزات المعلقة تنتهي آلياً بعد:

24 ساعة

وفق السياسة المعتمدة.

21.4 Diagnostics Approval

المساعد لا يملك صلاحية الاعتماد النهائي.

الاعتماد النهائي يتطلب:

Manager check.
التحقق من is_licensed.
21.5 Booking Integrity

عند التعامل مع capacity يجب استخدام Row Locking عند الحاجة لضمان عدم تجاوز السعة.

22. BOOKING & AVAILABILITY INFRASTRUCTURE
22.1 Booking State

Appointment يجب أن يمتلك State واضحاً.

أمثلة منطقية:

Pending
Confirmed
Cancelled
Completed
Expired

القيم النهائية يجب أن تتوافق مع Contract السابق.

22.2 Availability

لا يجوز للـ Frontend اعتبار Slot متاحاً بناءً على Mock Data.

الـ Backend يعيد availability الحقيقي.

22.3 Concurrency

سيناريو:

User A checks slot
User B checks slot
A confirms
B confirms

يجب أن يمنع النظام double allocation.

الحل المعتمد:

Transaction
+
SELECT FOR UPDATE
+
Capacity Validation
+
State Update
23. QUOTA LEDGER INFRASTRUCTURE
23.1 Principle

Quota يجب أن تكون قابلة للتتبع.

كل عملية مالية حرجة يجب أن يكون لها أثر واضح.

23.2 Deduction

لا يتم الخصم عند إنشاء Pending Appointment.

يتم الخصم عند:

Confirmed

23.3 Atomicity

عملية confirmation يجب أن تكون Atomic:

Begin Transaction
    ↓
Lock Booking
    ↓
Validate Availability
    ↓
Validate Quota
    ↓
Deduct Quota
    ↓
Confirm Booking
    ↓
Record Transaction
Commit

في حال الفشل:

ROLLBACK

24. EHR PRIVACY WALL
24.1 Principle

EHR هو أعلى Domain حساسية.

الوصول يجب أن يمر عبر:

Authentication
→ 4D Authorization
→ Clinical Relationship
→ Resource Ownership / Scope
→ EHR Service
24.2 Direct Database Access

لا يجوز لأي Controller الوصول المباشر إلى EHR database records لتجاوز Privacy Wall.

24.3 Clinical Access Logging

كل وصول حساس إلى EHR يجب أن يكون قابلاً للتسجيل في:

clinical_access_logs

24.4 Denial

إذا فشل أي شرط:

403 Forbidden

أو Error Contract المناسب.

لا يجب كشف معلومات سريرية من خلال رسالة الرفض.

25. PRESCRIPTION INTEGRITY
25.1 Prescription Lifecycle

Prescription تمر عبر lifecycle واضح.

لا يجوز تعديل Prescription نهائية كما لو كانت Draft.

25.2 Finalization

عند Finalization:

يتم تثبيت المحتوى.
يمنع التعديل غير المصرح.
يسجل الحدث.
يحتفظ النظام بأثر Audit.
25.3 Prescription Items

يجب فصل:

Prescription
Prescription Items

للحفاظ على normalization والمرونة.

25.4 Verification

التحقق الخارجي يعتمد على:

Opaque Verification Token

وليس على كشف معرفات داخلية.

26. DIAGNOSTICS AUTHORIZATION
26.1 Diagnostic Order

Diagnostic workflow يجب أن يفصل بين:

Creation
Processing
Result
Review
Final Approval
26.2 Assistant Restriction

Assistant لا يملك Final Approval.

26.3 Manager Approval

Final approval يتطلب:

Manager authorization.
is_licensed verification.
Valid diagnostic workflow state.
26.4 Finalization Integrity

بعد Finalization لا يسمح بالتعديل الحر.

أي Correction لاحق يجب أن يكون Workflow موثقاً وفق السياسة المعتمدة.

27. AUDIT & CLINICAL ACCESS LOGGING
27.1 Activity Logs

activity_logs يسجل العمليات النظامية المهمة.

27.2 Clinical Access Logs

clinical_access_logs مخصص للوصول إلى البيانات السريرية الحساسة.

27.3 Audit Principle

Audit Logs ليست مجرد Debug Logs.

يجب أن تكون:

Structured.
Traceable.
Protected.
مرتبطة بالفاعل.
مرتبطة بالعملية.
قابلة للتحقيق.
27.4 Immutable Audit

لا يجوز للمستخدم العادي حذف أو تعديل Audit Trail.

28. OBSERVERS, EVENTS & LISTENERS

يستخدم Event Architecture عندما يكون هناك أثر ثانوي يجب فصله عن Workflow الأساسي.

أمثلة:

AppointmentConfirmed
PrescriptionFinalized
DiagnosticApproved
ClinicalRecordAccessed
QuotaDeducted
28.1 Event Principle

لا يجب استخدام Events لإخفاء Business Logic الأساسي.

العملية الحرجة يجب أن تكون واضحة داخل Service.

28.2 Audit Events

يمكن استخدام Events/Listeners لإنشاء Audit Entries بعد العمليات الناجحة.

29. JOBS & SCHEDULED TASKS
29.1 Scheduled Tasks

النظام يحتاج إلى Scheduled Processing للعمليات المؤجلة.

أهم مثال:

Pending Booking Expiration

الحجوزات التي تجاوزت:

24 ساعة

دون Confirmation تصبح Expired وفق الـ Workflow.

29.2 Queueable Work

الأعمال غير الحرجة زمنياً يمكن نقلها إلى Jobs، مثل:

Notifications.
Non-blocking audit processing.
Background processing.
29.3 Critical Transactions

لا يجوز نقل الجزء الحرج من Transaction إلى Job بطريقة تكسر Atomicity.

30. DATABASE TRANSACTIONS & LOCKING
30.1 Atomic Operations

كل عملية تؤثر على أكثر من مورد مترابط يجب تقييمها لتحديد الحاجة إلى Transaction.

30.2 Mandatory Critical Cases

Transactions مطلوبة خصوصاً عند:

Booking confirmation.
Quota deduction.
Capacity allocation.
Critical state transitions.
30.3 Row Locking

يجب استخدام:

SELECT FOR UPDATE

عند الحاجة إلى حماية الموارد المتنافس عليها.

30.4 Transaction Rule

لا يتم تنفيذ:

Read
→ Decision
→ Write

بشكل منفصل عندما تكون هناك احتمالية race condition تؤثر على integrity.

31. API RESOURCES & RESPONSE STANDARD
31.1 Resource Layer

يجب استخدام API Resources لفصل Database Models عن API representation.

31.2 Response Structure

يجب أن تكون Responses متسقة.

نموذج مفاهيمي:

{
  "data": {},
  "meta": {}
}

وعند وجود أخطاء:

{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
31.3 Sensitive Data

لا يجوز إرجاع:

Internal secrets.
Password hashes.
Private credentials.
بيانات EHR غير المصرح بها.
32. ERROR HANDLING & ERROR CODES
32.1 Error Philosophy

يجب أن تكون أخطاء API:

Predictable.
Machine-readable.
Safe.
Consistent.
32.2 Categories

أمثلة:

AUTHENTICATION_FAILED
AUTHORIZATION_DENIED
CLINICAL_RELATIONSHIP_REQUIRED
QUOTA_INSUFFICIENT
BOOKING_UNAVAILABLE
BOOKING_EXPIRED
INVALID_STATE_TRANSITION
DIAGNOSTIC_APPROVAL_REQUIRED
VERIFICATION_TOKEN_INVALID
RESOURCE_NOT_FOUND
VALIDATION_FAILED
32.3 Security

رسائل الخطأ لا يجب أن تكشف:

وجود سجل طبي غير مصرح به.
تفاصيل Patient.
تفاصيل Appointment خاصة.
أسباب أمنية داخلية حساسة.
33. REQUEST ID / CORRELATION ARCHITECTURE

كل Request مهم يجب أن يكون قابلاً للتتبع.

يتم اعتماد مفهوم:

Request ID

لربط:

HTTP Request
→ Service Operation
→ Audit
→ Error
→ Logs
33.1 Purpose

يساعد ذلك على:

Debugging.
Incident investigation.
Audit correlation.
Support.
34. SECURITY ARCHITECTURE
34.1 Security Layers

الأمن ليس طبقة واحدة.

الطبقات:

Authentication
↓
Rate Limiting
↓
Middleware
↓
4D Authorization
↓
Policy
↓
Privacy Wall
↓
Business Rule
↓
Database Integrity
↓
Audit
34.2 Mass Assignment

يجب منع Mass Assignment غير المقصود.

34.3 Input Security

كل Input خارجي يعتبر غير موثوق حتى يتم Validation.

34.4 Secrets

لا تحفظ Secrets داخل:

Controllers.
Models.
Git.
Frontend.
35. CONFIGURATION & ENVIRONMENT VARIABLES

يجب فصل Configuration عن Business Code.

القيم النموذجية:

APP_ENV
APP_KEY
APP_URL

DB_CONNECTION
DB_HOST
DB_PORT
DB_DATABASE
DB_USERNAME
DB_PASSWORD

CACHE_DRIVER
QUEUE_CONNECTION

MAIL_MAILER
MAIL_HOST
MAIL_PORT
MAIL_USERNAME
MAIL_PASSWORD

القائمة النهائية تعتمد على الخدمات التي سيتم تفعيلها فعلياً.

35.1 Environment Rule

.env.example يجب أن يحتوي أسماء المتغيرات المطلوبة دون أسرار حقيقية.

36. LOGGING & MONITORING
36.1 Application Logs

يجب تسجيل:

Errors.
Exceptions.
Critical workflows.
Failed authorization events عند الحاجة.
Transaction failures.
36.2 Sensitive Data

لا يجوز تسجيل:

Passwords.
Tokens.
Full sensitive EHR.
Secrets.
36.3 Monitoring

يجب أن تكون المنظومة قابلة للمراقبة في Production.

المؤشرات المهمة تشمل:

API errors.
Failed authentication.
Booking failures.
Quota failures.
Queue failures.
Database failures.
37. TESTING ARCHITECTURE
37.1 Testing Layers

يجب أن يحتوي Backend على:

Unit Tests

للـ Services والـ Rules المعزولة.

Feature Tests

للـ API workflows.

Authorization Tests

لـ 4D Model.

Security Tests

لـ Privacy Wall.

Transaction Tests

للعمليات الحرجة.

37.2 Critical Test Areas

يجب اختبار:

Unauthorized EHR access.
Authorized clinical access.
Double booking.
Quota deduction.
Pending expiration.
Assistant diagnostic restriction.
Manager approval.
Prescription finalization.
Verification token.
Audit creation.
38. SEEDER ARCHITECTURE
38.1 Purpose

Seeders تستخدم لبيئة التطوير والاختبار.

38.2 Seed Data

يمكن تجهيز:

Roles.
Permissions.
Test users.
Test clinics.
Test doctors.
Test appointments.
38.3 Production Rule

لا يجوز استخدام بيانات Test أو Fake Patient Data في Production.

38.4 Deterministic Seeds

يجب أن تكون Seeders قابلة لإعادة التشغيل في Testing دون إنشاء فوضى غير متوقعة.

39. DEVELOPMENT DATA POLICY
39.1 Mock Data

Mock Data المستخدمة في Frontend لا تعتبر Backend Source of Truth.

39.2 Backend Test Data

يجب الفصل بين:

Mock UI Data
Test Database Data
Production Data
39.3 Clinical Test Data

بيانات المرضى السريرية التجريبية يجب ألا تكون بيانات أشخاص حقيقيين.

40. TRANSACTION ARCHITECTURE

العمليات الحرجة يجب أن تكون Atomic.

40.1 Standard Pattern
BEGIN TRANSACTION

Validate Authorization
Validate Business State

Lock Required Rows

Validate Resource Availability

Perform Mutation

Write Related Records

Write Audit

COMMIT

عند حدوث Exception:

ROLLBACK
40.2 Booking Example
BookingService
    ↓
DB Transaction
    ↓
Lock Appointment/Capacity Resource
    ↓
Check Slot
    ↓
Check Quota
    ↓
Deduct Quota
    ↓
Confirm Appointment
    ↓
Create Booking Transaction
    ↓
Commit
41. IMPLEMENTATION SEQUENCE P11–P19

بعد P10، يكون التنفيذ على مراحل منظمة.

P11 — Laravel Initialization
Laravel project.
Environment.
Database.
Sanctum.
Base architecture.
P12 — Identity & Authorization
Users.
Roles.
Permissions.
4D Authorization.
Policies.
P13 — Institutions
Clinics.
Doctors.
Relationships.
Assistants.
P14 — Booking & Quota
Appointments.
Booking state.
Transactions.
Quota.
Locking.
P15 — EHR & Clinical
Patients.
Clinical relationships.
Clinical visits.
Privacy Wall.
P16 — Prescriptions & Diagnostics
Prescriptions.
Templates.
Diagnostic Orders.
Laboratory.
Radiology.
Approval workflow.
P17 — Audit & Verification
Activity Logs.
Clinical Access Logs.
Verification Tokens.
P18 — API Hardening & Testing
Security.
Error handling.
Testing.
Performance.
Concurrency.
P19 — Backend Readiness / Integration
Frontend integration.
Contract validation.
Deployment readiness.
Final acceptance.
42. DEPENDENCY & RISK MATRIX
Area	Dependency	Risk	Control
Authentication	Sanctum	Unauthorized access	Security tests
Authorization	4D Model	Privilege escalation	Policies + tests
EHR	Clinical Relationship	Privacy breach	Privacy Wall
Booking	Capacity	Double booking	Row Locking
Quota	Booking confirmation	Incorrect deduction	Atomic Transaction
Diagnostics	Manager approval	Invalid finalization	Policy + Service
Prescription	Finalization	Data mutation	State locking
Audit	Critical workflows	Missing evidence	Events/Service logging
Verification	Opaque token	Token abuse	Expiration/validation
Database	31-table registry	Schema drift	Migration registry
43. FORBIDDEN IMPLEMENTATIONS

يُمنع في P10/P11 وما بعدها:

43.1 Business Logic in Controllers

ممنوع.

43.2 Authorization in Frontend

ممنوع.

43.3 Role-only Authorization

غير كافٍ للعمليات الحساسة.

43.4 Direct EHR Access

ممنوع خارج Privacy Wall.

43.5 Quota Deduction on Pending

ممنوع.

43.6 Assistant Final Approval

ممنوع.

43.7 Booking Without Concurrency Protection

ممنوع.

43.8 Mutable Finalized Clinical Records

ممنوع بدون Workflow رسمي.

43.9 Deleting Audit History

ممنوع.

43.10 Reintroducing patient_health_profiles

ممنوع دون تعديل رسمي لـ P1.

44. ARCHITECTURE FREEZE RULES

بعد اعتماد P10:

لا يجوز تغيير العناصر التالية مباشرة:

Laravel Architecture.
API version.
4D Authorization.
Privacy Wall.
31-table Registry.
Quota confirmation rule.
Booking locking.
Diagnostic approval.
Audit architecture.
44.1 Change Request

أي تغيير يجب أن يحتوي:

Change ID
Reason
Affected Phase
Affected Components
Risk
Migration Impact
Security Impact
Backward Compatibility
Approval
45. MIGRATION & CHANGE-CONTROL PROCEDURE
45.1 Database Change

أي تغيير على Schema يجب أن يكون عبر Migration.

لا يسمح بتعديل Production Database يدوياً كحل دائم.

45.2 Migration Rule

كل Migration يجب أن تكون:

Versioned.
Reproducible.
Reviewable.
Tested.
45.3 Schema Drift

أي اختلاف بين:

P1 Registry
+
Laravel Migrations
+
Actual Database

يعتبر Schema Drift ويجب تصحيحه.

46. P10 VALIDATION CHECKLIST

قبل الانتقال إلى P11 يجب التحقق من:

Architecture
 Laravel 13 architecture محددة.
 Service Layer محددة.
 Controller boundaries محددة.
 Policy architecture محددة.
 Middleware architecture محددة.
Security
 Sanctum محدد.
 4D Authorization مثبت.
 Privacy Wall مثبت.
 EHR access controlled.
 Diagnostic approval protected.
Database
 31 جدولاً مسجلاً.
 patient_health_profiles غير موجود.
 UUID strategy محددة.
 Soft Delete strategy محددة.
 Migration governance محددة.
Booking
 Availability backend-owned.
 Confirmation protected.
 Row locking محدد.
 Pending expiration = 24h.
Quota
 Deduction = Confirmation.
 Transaction protected.
 Ledger/transaction traceability موجودة.
Audit
 activity_logs.
 clinical_access_logs.
 Immutable audit principle.
47. ARCHITECTURAL REVIEW FINDINGS
AR-001 — Migration Registry Count

تم تثبيت السجل الرسمي عند:

31 Tables

ومتوافق مع P1.

AR-002 — Removed Health Profile

تم حذف:

patient_health_profiles

نهائياً.

AR-003 — Backend Authority

تم تثبيت Backend كمصدر الحقيقة.

AR-004 — 4D Authorization

تم تثبيت:

Role
+
Position
+
Scope
+
Permission

كأساس Authorization.

AR-005 — Quota Deduction

الخصم يحدث عند:

Confirmation فقط.

AR-006 — Assistant Authorization

Assistant لا يملك Finalization.

Finalization تتطلب Manager authorization وفق P6.

AR-007 — Clinical Privacy

EHR access يتطلب Authorized Clinical Relationship.

AR-008 — Booking Concurrency

Booking integrity تتطلب Transaction وRow Locking عند فحص الموارد المتنافس عليها.

AR-009 — Audit

Clinical access يجب أن يكون قابلاً للتتبع.

AR-010 — P10 Readiness

المعمارية أصبحت جاهزة للانتقال إلى Laravel Initialization في P11.

48. DEFINITION OF DONE

تعتبر P10 مكتملة عندما:

تم تعريف Laravel Architecture بالكامل.
تم تثبيت Backend Authority.
تم تثبيت Service Layer.
تم تثبيت Policy Architecture.
تم تثبيت 4D Authorization.
تم تثبيت Privacy Wall.
تم تثبيت Sanctum.
تم تثبيت API /api/v1.
تم اعتماد Migration Registry.
تم تثبيت 31/31 Tables.
تم حذف patient_health_profiles.
تم تثبيت UUID strategy.
تم تثبيت Soft Delete strategy.
تم تثبيت Booking Integrity.
تم تثبيت Quota Integrity.
تم تثبيت Diagnostics Authorization.
تم تثبيت Prescription Integrity.
تم تثبيت Audit Architecture.
تم تثبيت Transactions.
تم تثبيت Row Locking.
تم تحديد Testing Architecture.
تم تحديد Change Control.
تم تحديد P11 transition.
49. ACCEPTANCE CRITERIA

لا تنتقل المنظومة إلى P11 إلا إذا تحققت المعايير التالية.

AC-001

Laravel Backend architecture واضحة وقابلة للتنفيذ.

AC-002

لا توجد Business Logic مطلوبة داخل Controllers.

AC-003

Authorization ليست معتمدة على Frontend.

AC-004

EHR محمي بواسطة 4D Authorization + Authorized Clinical Relationship.

AC-005

Quota لا تخصم إلا عند Confirmation.

AC-006

Booking يمنع تجاوز capacity في حالات concurrency.

AC-007

Assistant لا يستطيع Final Approval.

AC-008

31 جدولاً هي المرجع الرسمي.

AC-009

patient_health_profiles غير موجود في Registry.

AC-010

Audit Architecture قابلة للتتبع.

AC-011

العمليات الحرجة Atomic.

AC-012

P11 يمكن أن يبدأ دون إعادة تصميم معماري.

50. FINAL APPROVAL & TRANSITION TO P11
50.1 Final Architectural Decision

بناءً على P1–P9 والقرارات المعتمدة في P10 v1.3:

P10 — Laravel Backend Initialization & Implementation Specification

تعتبر:

🔒 ARCHITECTURALLY APPROVED — VERSION 1.3

ولا يوجد ضمن نطاق P10 أي قرار مفتوح يمنع بدء مرحلة P11، مع الالتزام الكامل بالـ Frozen Contracts السابقة.

50.2 Official Backend Principle

يُعتمد المبدأ التالي كقاعدة أساسية للمراحل القادمة:

Frontend requests.
Backend decides.
Services execute.
Policies authorize.
Database persists.
Transactions protect.
Audit records.
Privacy Wall limits clinical access.

وبصياغة معمارية:

                    ┌──────────────────────┐
                    │      Frontend        │
                    │   UI / API Client    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      API / v1        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        ┌───────────────┐             ┌───────────────┐
        │  Middleware   │             │ Form Requests │
        └───────┬───────┘             └───────┬───────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  4D Authorization    │
                    │ Role / Position      │
                    │ Scope / Permission   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Policies       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       Services       │
                    │ Booking / Quota      │
                    │ EHR / Clinical       │
                    │ Prescription         │
                    │ Diagnostics          │
                    └──────────┬───────────┘
                               │
                  ┌────────────┼─────────────┐
                  ▼            ▼             ▼
             ┌────────┐  ┌──────────┐  ┌──────────┐
             │ Models │  │Transaction│ │ Privacy  │
             │        │  │ & Locking │ │   Wall   │
             └────┬───┘  └─────┬────┘ └─────┬────┘
                  │            │             │
                  └────────────┼─────────────┘
                               ▼
                    ┌──────────────────────┐
                    │       MySQL          │
                    │     31 Tables        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Audit / Clinical Log │
                    └──────────────────────┘
50.3 Official Next Action

الانتقال الرسمي هو:

P10 v1.3
   ↓
FINAL ARCHITECTURAL APPROVAL (v1.3)
   ↓
P11
Laravel Backend Initialization
P11 يجب أن يبدأ بالتنفيذ، وليس بإعادة تحليل المعمارية.

الترتيب الأولي في P11:

1. Initialize Laravel 13
2. Configure PHP 8.3 environment
3. Configure MySQL
4. Configure .env / .env.example
5. Install & configure Sanctum (`laravel/sanctum ^4.0`)
6. Establish API /api/v1
7. Create Backend directory structure
8. Establish base middleware
9. Establish base exception handling
10. Establish testing infrastructure
11. Establish migration baseline (31/31 Tables)
12. Validate architecture before Domain implementation
P10 FINAL STATUS
Item	Status
Architecture	🔒 APPROVED (Laravel 13)
Backend Authority	🔒 FROZEN
4D Authorization	🔒 FROZEN
Privacy Wall	🔒 FROZEN
Sanctum	🔒 APPROVED (^4.0)
API v1	🔒 APPROVED
Service Layer	🔒 APPROVED
Policy Layer	🔒 APPROVED
Booking Integrity	🔒 APPROVED
Quota Integrity	🔒 APPROVED
EHR Protection	🔒 APPROVED
Prescription Integrity	🔒 APPROVED
Diagnostics Approval	🔒 APPROVED
Audit Architecture	🔒 APPROVED
Transactions	🔒 APPROVED
Row Locking	🔒 APPROVED
Migration Registry	31/31 🔒
patient_health_profiles	REMOVED 🔒
P10 Definition of Done	ACHIEVED
Next Phase	P11 — Backend Initialization
END OF DOCUMENT

MediServices — خدمات طبية
MSP-P10-v1.3
P10 — Laravel Backend Initialization & Implementation Specification

Status: 🔒 ARCHITECTURAL APPROVED — VERSION 1.3

Next Action: P11 — Laravel Backend Initialization
