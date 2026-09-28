# سجل التفويض البشري وتثبيت نطاق العمل للمسار P20-O5
## MEDISERVICES — P20-O5-G0 HUMAN AUTHORIZATION & SCOPE ALIGNMENT RECORD
### Production Infrastructure, Nginx Reverse Proxy & Supervisor Daemons

---

## 1. هوية الوثيقة (Document Identity)

* **المشروع (Project):** MediServices — المنصة الوطنية الطبية الرقمية الموحدة
* **المرحلة (Phase):** P20 — الجاهزية التشغيلية والتحصين الإنتاجي
* **مسار العمل (Workstream):** `P20-O5` — تجهيز البنية التحتية للإنتاج، وسيط Nginx، وعمال الطوابير Supervisor Daemons
* **البوابة الحالية (Gate):** **`Gate G0 — Human Authorization & Scope Alignment Gate`**
* **طبيعة البوابة (Gate Nature):** **`READ-ONLY GOVERNANCE GATE`** (100% خالية من أي تعديل تنفيذي)
* **تاريخ ووقت التفويض:** 2026-08-23 06:33:36 UTC+1
* **وكيل التوثيق والحوكمة:** Antigravity
* **الحالة الرقابية للبوابة:** **`G0: PASS — CLOSED`** ✅

---

## 2. التفويض البشري الصريح (Explicit Human Authorization)

بموجب الأمر الإداري والرقابي الصادر صراحةً من المالك والمشرف العام للمشروع بتاريخ 2026-08-23 06:33:36 UTC+1، تم منح **تفويض بشري صريح ومستقل لتنفيذ البوابة `G0` فقط** من مسار العمل `P20-O5`.  
يُسجل رسمياً أن هذا التفويض محصور في `G0` حصراً، ولا يُمثل تفويضاً تلقائياً للبوابات `G1` إلى `G6` أو أي مسار عمل لاحق.

---

## 3. نطاق التفويض المعتمد (Authorization Scope)

يقتصر نطاق التفويض في `G0` حصراً على:
1. تسجيل وتوثيق التفويض البشري الصريح لبدء مسار العمل `P20-O5`.
2. تثبيت نطاق مهام المسار بدقة ومنع أي توسع غير مصرح به.
3. إجراء فحص ميداني للقراءة فقط (100% Read-Only) لخط الأساس للبيئة التحتية وحزم النظام.
4. تسجيل القرارات المعمارية المفتوحة المطلوب حسمها بشرياً قبل التنفيذ.
5. توثيق ثبات خط الأساس لقاعدة البيانات وسياسة نقاء الإنتاج.
6. الالتزام الصارم بالتوقف الإلزامي وعدم بدء أي بوابة لاحقة.

---

## 4. تثبيت نطاق المهام المعتمد لمسار P20-O5 (Scope Alignment)

تم تثبيت المهام السبع المعتمدة لمسار العمل `P20-O5` وفق التالي:
* **`T-O5-01`:** معمارية وسيط التوجيه Nginx Reverse Proxy وتوجيه المسارات للإنتاج.
* **`T-O5-02`:** معمارية التشفير وسياسة شهادات HTTPS / TLS.
* **`T-O5-03`:** معمارية إدارة عمال الطوابير في الخلفية عبر Supervisor (Laravel Queue Workers).
* **`T-O5-04`:** معمارية مجدول المهام التلقائي (Laravel Scheduler / Cron).
* **`T-O5-05`:** أوامر تسريع الأداء للإنتاج والجاهزية للنشر (`config/route/view:cache`).
* **`T-O5-06`:** التحقق الآلي وفحص سلامة الصياغة التكوينية (Configuration Syntax Validation).
* **`T-O5-07`:** التوثيق الشامل والإغلاق والتسليم الرسمي للمسار.

---

## 5. القيود الحوكمية الموروثة (Inherited Constraints)

* 🛑 **حماية قاعدة البيانات الأساسية:** بقاء `medical_db` محمية ونظيفة بنسبة 100% وخالية من أي تعديل.
* 🛑 **استمرار سياسة نقاء الإنتاج (Zero Mock Data):** الجداول التشغيلية الـ 25 تبقى عند **0 سجل**.
* 🛑 **عزل بيئة الاختبارات:** الحفاظ على `medical_db_testing` كبيئة حصرية لاختبارات PHPUnit.
* 🛑 **ثبات المسارات السابقة:** إغلاق P20-O1 و P20-O2 و P20-O3 و P20-O4 يظل نهائياً وغير قابل لإعادة الفتح.
* 🛑 **تجميد المسارات اللاحقة:** `P20-O6` (النسخ الاحتياطي) وما بعدها تبقى مجمدة كلياً (`STRICTLY FROZEN`).

---

## 6. حالة مسارات العمل السابقة (Previous Workstream Status)

```text
======================================================================
MEDISERVICES — WORKSTREAM LIFECYCLE BASELINE
======================================================================
- P20-O1 : Mock Data Audit & Purge           → FORMALLY CLOSED ✅
- P20-O2 : Clean Database Initialization     → FORMALLY CLOSED ✅
- P20-O3 : Environment Separation & Hardening → FORMALLY CLOSED ✅
- P20-O4 : Security & Privacy Hardening Audit→ FORMALLY CLOSED ✅
- P20-O5 : Production Infrastructure & Daemons→ G0 AUTHORIZED / IN PROGRESS 🔄
- P20-O6+: Backup, Telemetry, Pilot & Go-Live→ STRICTLY FROZEN 🛑
======================================================================
```

---

## 7. خط الأساس المعتمد لقاعدة البيانات (Database Baseline)

```text
======================================================================
MEDISERVICES — CERTIFIED DATABASE BASELINE (medical_db)
======================================================================
- Total Database Tables       : EXACTLY 40 Tables
- Business Domain Tables      : EXACTLY 31 Tables (100% Present)
- Framework Tables            : EXACTLY 9 Tables (100% Present)
- Active Foreign Keys         : EXACTLY 62 Constraints
- Operational Tables at 0 Rows: EXACTLY 25 Tables (100% Clean)
- Total Users in medical_db   : EXACTLY 1 User (admin@mediservices.dz)
- Seeded System Roles (RBAC)  : EXACTLY 11 Seeded Roles
- Seeded System Permissions   : EXACTLY 21 Seeded Permissions
- Seeded Permission-Role Links: EXACTLY 51 Seeded Links
- Approved Booking Packages   : EXACTLY 4 Packages
======================================================================
```

> [!IMPORTANT]
> **التفريق الرقابي الإلزامي بين الأدوار والمستخدمين (Roles ≠ Users):**  
> وجود 11 دوراً في جدول `roles` يمثل **مصفوفة الصلاحيات المرجعية (RBAC Taxonomy)** فقط، ولا يعني وجود 11 مستخدماً.  
> المستخدم الوحيد الموجود والمرخص فعلياً في قاعدة البيانات هو حساب المسؤول العام (`admin@mediservices.dz`).

---

## 8. خط الأساس لبيئة الاختبارات (Test Environment Baseline)

* **محرك الاختبارات:** MySQL على المنفذ `3306`.
* **قاعدة بيانات الاختبارات الحصرية:** `medical_db_testing` (`utf8mb4_unicode_ci`).
* **عزل الاتصال:** ملف `backend/phpunit.xml` يشير حصراً إلى `medical_db_testing` لمنع سمة `RefreshDatabase` من مساس `medical_db`.

---

## 9. خط الأساس للبنية التحتية للقراءة فقط (Read-Only Infrastructure Baseline)

تم إجراء فحص ميداني للقراءة فقط لحزم وأدوات النظام على خادم التطوير المحلي، وكانت النتائج كالتالي:

| مكون البنية التحتية | الحالة الفعلية الملاحظة | المسار / الإصدار الفعلي | ملاحظات رقابية |
|---|---|---|---|
| **PHP CLI** | **`PRESENT`** | `/usr/bin/php` (v8.3.33) | متوافق مع متطلبات Laravel 13 |
| **Node.js** | **`PRESENT`** | `/usr/bin/node` (v18.20.4) | متوافق مع تشغيل وبناء Next.js 15 |
| **NPM** | **`PRESENT`** | `/usr/bin/npm` (v10.8.2) | متواجد لإدارة الحزم |
| **MySQL Client** | **`PRESENT`** | `/usr/bin/mysql` | متصل بقاعدة البيانات المحلية |
| **Crontab Utility**| **`PRESENT`** | `/usr/bin/crontab` | أداة جدولة المهام متوفرة للنظام |
| **Nginx Web Server** | **`NOT PRESENT`** | غير مثبت كحزمة نظام محلية | سيتم توفير قوالب التكوين له كـ Blueprints |
| **PHP-FPM** | **`NOT PRESENT`** | غير مثبت كخدمة خلفية محلية | سيتم تجهيز إعدادات FastCGI Socket له |
| **Supervisor** | **`NOT PRESENT`** | غير مثبت كحزمة نظام محلية | سيتم إعداد وتوثيق ملفات `supervisord.conf` كـ Blueprints |

---

## 10. حالة وسيط التوجيه Nginx (Nginx Status)
* **الحالة على البيئة الحالية:** **`NOT PRESENT`** (حزمة Nginx غير مثبتة محلياً على بيئة التطوير الحالية).
* **الإجراء المعتمد في P20-O5:** إعداد قوالب التكوين المعيارية الجاهزة للإنتاج (`Nginx Production Configuration Blueprints`) وتوثيقها في مسارات محددة ليتم رفعها لخوادم الإنتاج دون فرض تثبيت حزم محلية غير مطلوبة.

---

## 11. حالة معالج PHP-FPM (PHP-FPM Status)
* **الحالة على البيئة الحالية:** **`NOT PRESENT`** (البيئة المحلية تستخدم PHP CLI).
* **الإجراء المعتمد في P20-O5:** إعداد وتوثيق توجيهات FastCGI لـ `php8.3-fpm.sock` ضمن قوالب Nginx.

---

## 12. حالة مدير العمليات Supervisor (Supervisor Status)
* **الحالة على البيئة الحالية:** **`NOT PRESENT`** (أدوات `supervisord` و `supervisorctl` غير مثبتة محلياً).
* **الإجراء المعتمد في P20-O5:** إعداد قوالب التكوين المرجعية لإدارة عمال الطوابير (`mediservices-worker.conf`) وسياسات إعادة التشغيل التلقائي.

---

## 13. حالة مجدول المهام Cron / Scheduler (Cron Status)
* **الحالة على البيئة الحالية:** **`PRESENT`** (أداة `crontab` متواجدة في `/usr/bin/crontab`).
* **الإجراء المعتمد في P20-O5:** توثيق سطر الجدولة القياسي لتشغيل `schedule:run` كل دقيقة.

---

## 14. حالة بيئة تشغيل الواجهة Node / Next.js (Node/Next.js Status)
* **الحالة على البيئة الحالية:** **`PRESENT`** (Node v18.20.4 + Next.js 15.1.0).
* **الجاهزية الإنتاجية:** تم إثبات نجاح البناء `npm run build` وتوليد الـ 38 مساراً ثابتاً.

---

## 15. حالة بيئة تشغيل الخادم Laravel (Laravel Status)
* **الحالة على البيئة الحالية:** **`PRESENT`** (PHP 8.3.33 + Laravel 13.26.1).
* **الجاهزية الإنتاجية:** تم اجتياز 76/76 اختباراً في PHPUnit، وجميع المسارات الـ 78 مهيأة للتخزين المؤقت.

---

## 16. خط الأساس لقوالب البيئة التكوينية (Production Configuration Baseline)
* **القوالب المعتمدة (من P20-O3):**
  - `.env.example` (القالب العام)
  - `.env.local.example` (بيئة التطوير)
  - `.env.staging.example` (بيئة التجريب)
  - `.env.production.example` (بيئة الإنتاج)
* **حظر تسريب الأسرار:** خلو حزم العميل بنسبة 100% من أي أسرار حساسة أو مفاتيح خاصة.

---

## 17. القرارات المعمارية المفتوحة (Open Architectural Decisions)

> [!WARNING]
> **قرار معماري مفتوح يتطلب حسماً وتأكيداً بشرياً صريحاً قبل البدء بالبوابة G2:**
> 
> * **التباين الملحوظ:** تذكر وثائق المراجعة السابقة دعم `TLS 1.2 + TLS 1.3` لضمان التوافقية العريضة مع متصفحات الأجهزة القديمة، بينما يذكر الهدف المرجعي قصر الاتصال على `Strict TLS 1.3` لأعلى معايير الأمان.
> * **القرار المطلوب:** تحديد هل يتم اعتماد **`TLS 1.2 + TLS 1.3 (موصى به للتوافقية)`** أم **`Strict TLS 1.3 Only (أعلى درجات التشفير)`** عند إعداد قوالب Nginx في البوابة G2.

---

## 18. سجل المخاطر والعوائق (Risks & Blockers)

* **Blockers:** **`0 (لا توجد أي عوائق تعطل تنفيذ G0)`**.
* **المخاطر المحتملة وإدارتها:**
  - *خطر تعارض بيئات التشغيل:* يتم حله عبر تجهيز قوالب التكوين كـ Blueprints قابلة للنقل دون إجبار البيئة المحلية على محاكاة خادم الإنتاج.
  - *خطر مساس قاعدة البيانات:* محمي كلياً بفضل العزل التام لـ `medical_db_testing`.

---

## 19. إقرار النزاهة الرقابية للبوابة G0 (G0 Integrity Statement)

```text
============================================================
MEDISERVICES — P20-O5 G0 INTEGRITY CONFIRMATIONS
============================================================

Source Code Mutations       : 0 (No application source code modified)
Configuration Mutations     : 0 (No configuration modified)
Infrastructure Mutations    : 0 (No services started/stopped/reloaded)
Database Schema Mutations   : 0 (Schema 100% Untouched)
Database Data Mutations     : 0 (medical_db 100% Untouched)
Migrations Executed         : 0 (No migrations executed)
Seeders Executed            : 0 (No seeders executed)
Destructive Operations      : 0 (Zero destructive operations)
Service Restarts            : 0 (No services restarted)
Package Installations       : 0 (No packages installed or removed)
DNS Changes                 : 0 (No DNS modified)
Firewall Changes            : 0 (No firewall modified)
SSL Changes                 : 0 (No SSL modified)
Supervisor Changes          : 0 (No Supervisor modified)
Cron Changes                : 0 (No Cron modified)

============================================================
```

---

## 20. الحكم الرقابي للبوابة G0 (G0 Gate Status)

```text
======================================================================
G0 STATUS: PASS — CLOSED ✅
======================================================================
تم إنجاز كافة متطلبات البوابة G0 للقراءة فقط بنجاح تام:
1. تسجيل وتوثيق التفويض البشري الصريح.
2. تثبيت نطاق المسار بدقة دون أي توسع.
3. تدقيق خط الأساس للبنية التحتية وقاعدة البيانات بنسبة 100% Read-Only.
4. تسجيل القرار المعماري المفتوح لسياسة التشفير TLS.
5. التحقق من ثبات عدم حدوث أي Mutation برمجية أو تكوينية أو بنائية.
======================================================================
```

---

## 21. إعلان التوقف الإلزامي (Mandatory Stop)

```text
======================================================================
P20-O5 WORKSTREAM STATUS:
- G0 : PASS — CLOSED ✅
- G1 : NOT EXECUTED — FROZEN 🛑
- G2 : NOT EXECUTED — FROZEN 🛑
- G3 : NOT EXECUTED — FROZEN 🛑
- G4 : NOT EXECUTED — FROZEN 🛑
- G5 : NOT EXECUTED — FROZEN 🛑
- G6 : NOT EXECUTED — FROZEN 🛑

P20-O6 & BEYOND : STRICTLY FROZEN 🛑

MANDATORY STOP — AWAITING NEW EXPLICIT HUMAN AUTHORIZATION FOR G1.
======================================================================
```
