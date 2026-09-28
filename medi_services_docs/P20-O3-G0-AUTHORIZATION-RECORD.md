# سجل التفويض البشري وتثبيت نطاق العمل للمسار P20-O3
## MEDISERVICES — P20-O3-G0 HUMAN AUTHORIZATION & SCOPE ALIGNMENT RECORD

**المشروع:** MediServices — المنصة الوطنية الطبية الرقمية الموحدة  
**المرحلة:** P20 — الجاهزية التشغيلية والتحصين الإنتاجي  
**مسار العمل:** `P20-O3` — فصل البيئات، تحصين الإعدادات التكوينية، وحوكمة أسرار الإنتاج  
**البوابة الحالية:** **`G0` (Human Authorization & Scope Alignment Gate)**  
**تاريخ ووقت التفويض:** 2026-08-22 20:17:00 UTC+1  
**وكيل التوثيق والحوكمة:** Antigravity  
**الحالة الرقابية للبوابة:** **`G0: PASS — CLOSED`**  

---

## 1. إعلان التفويض البشري الصريح (Human Authorization Declaration)

بموجب الأمر الصادر بتاريخ 2026-08-22 20:16:41 UTC+1 من المالك والمشرف البشري للمشروع، تم منح تفويض صريح لبدء وتنفيذ:
👉 **البوابة `G0` حصراً من مسار العمل `P20-O3`**.

```text
======================================================================
MEDISERVICES — P20-O3 G0 AUTHORIZATION BASELINE
======================================================================
- Previous Workstream (P20-O2) : FORMALLY CLOSED — 100% COMPLETE
- P20-O3 Plan Status           : APPROVED WITH REQUIRED AMENDMENTS
- Mandatory Approved Amendment : T-O3-01b (Test Database Isolation)
- G0 Execution Scope           : Governance & Scope Alignment ONLY
- Technical Mutations in G0    : STRICTLY FORBIDDEN (Zero Mutations)
======================================================================
```

---

## 2. تثبيت هيكل بوابات المسار المعتمد (Certified P20-O3 Gate Structure)

تم اعتماد وتثبيت الهيكل الرقابي المكون من 7 بوابات لمسار العمل `P20-O3`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    P20-O3 GATES ARCHITECTURE (G0 → G6)                     │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ Gate G0      │ Human Authorization & Scope Alignment Gate (هذه البوابة)    │
│ Gate G1      │ Pre-Execution Read-Only Audit & Baseline Confirmation        │
│ Gate G2      │ Backend Hardening & Test Database Isolation (Sanctum/CORS)   │
│ Gate G3      │ Frontend Environment Templates & Standardized Configuration  │
│ Gate G4      │ Isolated Automated Verification & Security Regression Test   │
│ Gate G5      │ Documentation & Master Execution Report Finalization         │
│ Gate G6      │ Formal Workstream Closure & Handoff Gate                     │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 3. تثبيت خطة المهام والتعديل الإلزامي المعتمد (Scope & Task Alignment)

تم تثبيت قائمة المهام المعتمدة للمسار `P20-O3`:

1. **`T-O3-01`:** تحصين إعدادات Sanctum Token Expiration (`backend/config/sanctum.php`).
2. **`T-O3-01b` (التعديل الإلزامي المعتمد - Test Database Isolation):**
   - عزل بيئة الاختبارات الآلية في `backend/phpunit.xml` لمنع سمة `RefreshDatabase` من المساس بقاعدة البيانات الأساسية `medical_db`، وضبط اتصال اختبارات منفصل ومعزول تماماً.
3. **`T-O3-02`:** تحصين وتأمين نطاقات CORS في `backend/config/cors.php` وتفعيل `supports_credentials = true`.
4. **`T-O3-03`:** ضبط تدوير السجلات اليومي `LOG_CHANNEL=daily` و `LOG_DAILY_DAYS=14` في `backend/config/logging.php`.
5. **`T-O3-04`:** إنشاء قوالب بيئات الـ Backend (`.env.example`, `.env.staging.example`, `.env.production.example`).
6. **`T-O3-05`:** إنشاء وتوحيد قوالب بيئات الـ Frontend (`.env.example`, `.env.staging.example`, `.env.production.example`).
7. **`T-O3-06`:** الفحص الآلي المعزول واختبارات الانحدار (76 اختبار PHPUnit + Next.js build).
8. **`T-O3-07`:** توثيق التقرير التنفيذي الشامل `medi_services_docs/P20-O3-EXECUTION-REPORT.md`.
9. **`T-O3-08`:** الإغلاق الرسمي والتسليم النهائي للمسار `medi_services_docs/P20-O3-G6-CLOSURE-HANDOFF.md`.

---

## 4. القيود والمحددات الموروثة من P20-O2 (P20-O2 Inherited Constraints)

تظل كافة قيود وقرارات P20-O2 ثابتة وملزمة دون أي تعديل:
* 🔒 **ثبات مخطط قاعدة البيانات (Schema Frozen):** ثبات الـ 40 جدولاً (31 جدول نطاق أعمال + 9 إطار عمل).
* 🔒 **حظر العمليات التدميرية (Zero Destructive Commands):** حظر `migrate:fresh` أو `db:wipe` أو `DROP TABLE`.
* 🔒 **نقاء البيانات التشغيلية (Zero Mock Data):** الجداول التشغيلية الـ 25 تبقى خالية تماماً عند **0 سجل**.
* 🔒 **حظر الأسرار في المستودع:** عدم تضمين أي كلمات مرور صريحة أو مفاتيح تشفير إنتاجية في Git.
* 🔒 **ثبات القرارات الهندسية:** بقاء القرارات `DEC-01` إلى `DEC-06` ثابتة وغير قابلة للمساس.

---

## 5. الأعمال المستبعدة خارج نطاق المسار (Explicit Out-of-Scope Items)

يُحظر في هذه المرحلة من المسار P20-O3:
* ❌ تنفيذ أي هجرات جديدة (No Migrations).
* ❌ تشغيل أي بذارات (No Seeders).
* ❌ تنفيذ أي عمليات إدخال أو تعديل أو حذف على بيانات النطاق في قاعدة البيانات.
* ❌ حجز أو نشر خوادم سحابية إنتاجية أو إعداد شهادات SSL/TLS وخادم Nginx الفعلي.
* ❌ تعديل أي من عقود الـ API الـ 78 المعتمدة.
* ❌ تعديل مصفوفة الـ RBAC أو منطق حماية `<AuthGuard>`.

---

## 6. التدقيق الرقابي للبوابة G0 (G0 Governance Audit)

```text
======================================================================
MEDISERVICES — P20-O3 G0 AUDIT CONFIRMATIONS
======================================================================
G0-SCOPE SOURCE CODE MUTATIONS : 0 (No application source code modified)
G0-SCOPE DATABASE MUTATIONS     : 0 (No INSERT / UPDATE / DELETE)
G0-SCOPE MIGRATIONS             : 0 (No migrate or migrate:fresh)
G0-SCOPE SEEDERS                : 0 (No seeders executed)
G0 ARTIFACTS CREATED            : medi_services_docs/P20-O3-G0-AUTHORIZATION-RECORD.md
======================================================================
```

---

## 7. حالة البوابة والتوقف الإلزامي (Gate Status & Mandatory Stop)

```text
======================================================================
G0 STATUS: PASS — CLOSED
NEXT GATE: G1 (Pre-Execution Read-Only Audit & Baseline Confirmation)

MANDATORY STOP
NO G1 EXECUTION PERMITTED WITHOUT NEW EXPLICIT HUMAN AUTHORIZATION.
======================================================================
```
