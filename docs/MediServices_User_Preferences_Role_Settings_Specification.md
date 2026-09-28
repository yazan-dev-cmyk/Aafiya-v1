# Aafiya — User Preferences & Role Settings Specification
**Document Version:** 1.0  
**Status:** 📋 APPROVED PRE-IMPLEMENTATION SPECIFICATION (REFERENCE ONLY)  
**Date:** 2026-08-23  
**Implementation Status:** `MODIFICATION MADE: NONE` (Read-Only / Specification Only)

---

## 1. Executive Summary (الملخص التنفيذي)

تحدد هذه الوثيقة المرجعية المعمارية الشاملة لإعدادات وتفضيلات المستخدمين (User Preferences) وتكوينات الأدوار (Role Settings) في منصة **Aafiya**. تم إعداد هذه الوثيقة بعد إجراء تدقيق معماري وتقني شامل (Read-Only Audit) لكافة طبقات النظام (قاعدة البيانات MySQL 8.0، وخلفية Laravel 11، وواجهة Next.js 14).

### الغرض الأساسي:
1. التمييز الصارم بين **تفضيلات المستخدم الشخصية (User Preferences)**، و**الصلاحيات الأمنية (Permissions)**، و**إعدادات المنشأة (Facility Settings)**، و**الضوابط الأمنية/السريرية الإلزامية (Security & Clinical Controls)**.
2. توثيق الوضع الراهن المكتشف فعليًا بالأدلة من الشيفرة البرمجية دون افتراض أو تخمين.
3. وضع المخطط المعماري المستقبلي لحفظ التفضيلات واسترجاعها بما يضمن قابلية التوسع لخدمة أكثر من **150,000 طبيب** و **500,000 مساعد** و **ملايين المرضى**.

---

## 2. Current-State Audit & Evidence (تدقيق الواقع الفعلي)

أظهر الفحص الدقيق لقاعدة البيانات `medical_db` وملفات الكود المصدري النتائج التالية:

| النطاق | الوضع الحالي المكتشف | الدليل البرمجي / المصدر | حالة الـ Persistence |
| :--- | :--- | :--- | :--- |
| **قاعدة البيانات (`medical_db`)** | لا يوجد جدول `user_preferences` ولا توجد أعمدة تفضيلات داخل جدول `users`. | `SHOW TABLES;` في `medical_db` (40 جدولاً تخلو من جداول التفضيلات). | غير مخزن في قاعدة البيانات. |
| **اللغة والاتجاه (Locale & RTL)** | تعتمد على مسار URL في Next.js (`/[locale]/...`) عبر `next-intl`. | `src/i18n/routing.ts` (`locales: ['ar', 'en', 'fr']`, `defaultLocale: 'ar'`). | محفوظ في مسار المتصفح (URL Path) فقط. |
| **المظهر (Theme / Dark Mode)** | حالة React داخلية مستقلة `useState<boolean>(false)` في 8 لوحات تحكم. | `DoctorDashboard.tsx:60`, `PatientDashboard.tsx:157`, `PlatformAdminDashboard.tsx:92`, إلخ. | يفقد عند الـ Refresh ويعود للفاتح (In-Memory). |
| **إعدادات التنبيهات الشخصية** | حقول تجريبية في واجهات الإعدادات تستدعي `alert()` محلي. | `ProfileSettingsTab.tsx:36-41`, `DoctorSettingsTab.tsx:331-336`. | يفقد عند الـ Refresh (In-Memory). |
| **المنطقة الزمنية (Timezone)** | `NOT FOUND` — لا توجد أي معالجة لتفضيل المنطقة الزمنية للمستخدم. | تم اتخاذ قرار معماري بعدم الحاجة لها حاليًا (توقيت موحد الجزائر GMT+1). | مستبعدة معماريًا. |

---

## 3. Discovered vs Proposed Preferences Matrix

### 3.1 الإعدادات المكتشفة فعليًا في الكود (Discovered):
1. **`language` (اللغة):** مدعومة عبر URL (`ar`, `en`, `fr`). القيمة الافتراضية: `ar`.
2. **`isRtl` (اتجاه النص):** مشتق تلقائيًا من اللغة (`locale === 'ar'`).
3. **`isDarkMode` (المظهر الداكن):** موجود في React State في كافة الـ Dashboards. القيمة الافتراضية: `false`.
4. **`enableSmsAlerts` (تنبيهات الرسائل القصيرة):** موجود كـ State محلي في `ProfileSettingsTab` و `DoctorSettingsTab`.
5. **`enableWhatsappAlerts` (تنبيهات واتساب):** موجود كـ State محلي في `ProfileSettingsTab` و `DoctorSettingsTab`.
6. **`urgentPush` (تنبيهات الطوارئ الفورية):** موجود كـ State محلي في `DoctorSettingsTab`.
7. **`doctorDirectivesSound` (أصوات توجيهات الطبيب):** موجود كـ State محلي في `DoctorSettingsTab`.
8. **`showIncomeOnDashboard` (عرض الدخل المالي):** موجود كـ State محلي في `DoctorSettingsTab`.

### 3.2 الإعدادات المقترحة للتنفيذ المستقبلي (Proposed):
1. **`theme_mode`:** (`light` / `dark` / `system`).
2. **`table_density`:** (`compact` / `comfortable`).
3. **`profile_avatar_url`:** مسار الصورة الشخصية للمستخدم.
4. **`in_app_sound_enabled`:** تفعيل/تعطيل المؤثرات الصوتية العامة.
5. **`patient_reminder_lead_time`:** وقت تذكير المريض قبل الموعد (24 ساعة / ساعتان).
6. **`doctor_queue_view_mode`:** نمط عرض رتل الانتظار للمساعد (`cards` / `table`).
7. **`queue_auto_refresh_interval`:** معدل التحديث اللحظي للرتل (15s / 30s / 60s).
8. **`dicom_viewer_default_preset`:** وضع عارض الأشعة الافتراضي (`lung` / `bone` / `soft_tissue`).
9. **`dicom_viewer_layout`:** تقسيم شاشة الأشعة الافتراضي (`1x1` / `2x1` / `2x2`).
10. **`admin_rows_per_page`:** عدد العناصر في صفحة جداول الإدارة (`25` / `50` / `100`).

---

## 4. Role-by-Role Preference & Settings Matrix

### 4.1 الإعدادات العامة المشتركة (Universal User Preferences)
تتاح لجميع المستخدمين من كافة الأدوار:
* **المظهر (Theme):** `light` | `dark` | `system` (الافتراضي: `system` أو `light`).
* **اللغة (Language):** `ar` | `en` | `fr` (الافتراضي: `ar`). الاتجاه RTL/LTR مشتق دائمًا ولا يمثل Preference مستقلًا.
* **الصورة الشخصية (Profile Avatar):** إمكانية رفع/تحديث الصورة الشخصية للمستخدم.
* **إشعارات النظام (System Notifications):** تفعيل/تعطيل التنبيهات المنبثقة داخل التطبيق وأصوات التنبيه.
* **كثافة عرض الجداول (Table Density):** `comfortable` (افتراضي) | `compact`.
* **ملاحظة معمارية ملزمة:** **استبعاد حقل Timezone تمامًا**؛ لا يتم إنشاء حقل أو إعداد للمنطقة الزمنية.

---

### 4.2 تفضيلات المريض (Patient Preferences)
* **قنوات تذكير المواعيد (Appointment Reminder Channels):**
  * خيارات: `sms`, `whatsapp`, `email`, `push` (افتراضي: تفعيل SMS و In-App).
* **توقيت تذكيرات المواعيد (Reminder Lead Time):**
  * خيارات مقترحة: `24h_before`, `2h_before`, `both` (افتراضي: `24h_before`).
* **طريقة استلام المستندات الطبية (Medical Document Delivery):**
  * استقبال نسخة PDF فورية للوصفات ونتائج التحاليل المعتمدة على البريد الإلكتروني (`true` / `false`).
* **المحتوى التثقيفي الصحي (Health Education Feeds):**
  * تفعيل/إيقاف استقبال النشرات الطبية والتوعوية من العيادات المتابعة (`true` / `false`).

---

### 4.3 تفضيلات الطبيب (Doctor Preferences)
* **تفضيلات تدفق المواعيد (Appointment Workflow Preferences):**
  * مدة الكشف الافتراضية لكل مريض (15 دقيقة / 20 دقيقة / 30 دقيقة / 45 دقيقة).
  * آلية قبول الحجوزات: قبول تلقائي للمرضى المسجلين (`auto_approve_registered`) / مراجعة يدوية.
* **تخصيص لوحة التحكم (Dashboard Customization):**
  * التبويب الافتراضي عند الدخول: غرفة الانتظار (`waiting_room`) / المواعيد (`appointments`) / التحليلات (`analytics`).
  * إظهار/إخفاء مؤشرات الدخل المالي في اللوحة الرئيسية (`show_income_kpi`: `true` / `false`).
* **تفضيلات الطباعة والوصفات (Prescription Print Settings):**
  * إظهار رمز الاستجابة السريع QR Code في الوصفة المطبوعة (`true` / `false`).
  * حجم الخط الافتراضي وهوامش الترويسة للطباعة.
* **تنبيهات سير العمل والأصوات (Workflow Sounds):**
  * نغمة تنبيه عند وصول مريض جديد لغرفة الانتظار.
  * تنبيهات جهوزية النتائج المخبرية والإشعاعية للمرضى المحالين.
* **الضابط الأمني/السريري:** **لا يجوز للطبيب تعطيل التنبيهات السريرية الحرجة المفروضة نظاميًا.**

---

### 4.4 تفضيلات مساعد الطبيب (Doctor Assistant Preferences)
* **نمط عرض رتل الانتظار (Queue Display Mode):**
  * خيارات: بطاقات تفاعلية (`cards`) / جدول مضغوط (`table`).
* **تنبيهات حركة المرضى (Queue Event Chimes):**
  * صوت تنبيه عند وصول مريض وتسجيل حضوره.
  * صوت تنبيه عند استدعاء الطبيب للمريض التالي من داخل العيادة.
* **معدل التحديث اللحظي (Auto-Refresh Rate):**
  * خيارات مقترحة: `15s`, `30s`, `60s`, `manual` (الافتراضي: `30s`).

---

### 4.5 تفضيلات المختبر ومساعد المختبر (Laboratory & Assistant Preferences)
* **التبويب الافتراضي للوحة المختبر (Default Tab):**
  * خيارات: استقبال وتجهيز العينات (`sample_reception`) / إدخال النتائج (`result_entry`) / الاعتماد (`validation`).
* **تنبيهات النتائج الحرجة (Critical / Panic Value Alerts):**
  * وميض مرئي وصوت إنذار مخصص عند تسجيل نتيجة تقع خارج النطاق الحيوي الآمن.
  * **قيد أمني/سريري:** التنبيه المرئي للقيم الحرجة إلزامي ولا يمكن إلغاؤه.
* **خيارات عرض التقارير (Result Display):**
  * إظهار النطاقات المرجعية للمقارنة السريعة (`show_reference_ranges`: `true` / `false`).
* **مساعد المختبر:** يشارك نفس خيارات كثافة الجداول، التحديث التلقائي، وأصوات استقبال العينات.

---

### 4.6 تفضيلات مركز الأشعة ومساعد الأشعة (Radiology & Assistant Preferences)
* **تفضيلات عارض صور الأشعة (DICOM Viewer Settings):**
  * نافذة المعاينة الافتراضية (Window Preset): رئة (`lung`) / عظام (`bone`) / أنسجة رخوة (`soft_tissue`).
  * التخطيط الافتراضي للشاشة (Viewer Layout): `1x1` (افتراضي) / `2x1` / `2x2`.
* **تفضيلات التقرير الإشعاعي (Reporting View):**
  * نمط عرض التقرير المقارن (Split Screen مع الفحوصات السابقة).
* **إشعارات اكتمال الفحوصات:**
  * تنبيه فوري لطاقم التصوير عند اكتمال رفع السلسلة الإشعاعية (Series Upload Complete).

---

### 4.7 تفضيلات مركز الحجز (Booking Center Preferences)
* **تنبيه اقتراب نفاد الحصص (Low Quota Alert Threshold):**
  * تنبيه مرئي وصوتي عندما يقل رصيد الحصص عن حد معين (قيمة مقترحة قابلة للتعديل: `< 10` حجوزات).
* **قنوات إرسال تذاكر الحجز (Booking Ticket Dispatch Channels):**
  * القناة الافتراضية المفضلة لإرسال وصل وتأكيد الحجز للمريض (SMS / WhatsApp).
* **تخصيص الواجهة:** التبويب الافتراضي، وكثافة جداول المراكز والحجوزات.

---

### 4.8 تفضيلات مدير المنصة ومساعد المدير (Admin & Admin Assistant Preferences)
* **لوحة التحكم وعرض البيانات (Dashboard Density):**
  * التبويب الافتراضي (طلبات التحقق الجديدة / التذاكر والدعم / الإعلانات).
  * عدد السجلات في كل صفحة Pagination: `25` / `50` / `100`.
* **تنبيهات المراقبة التشغيلية:**
  * تنبيه صوتي/مرئي عند ورود طلب تسجيل منشأة أو طبيب جديد.
  * تنبيهات ورود تذاكر دعم فني طارئة أو شكاوى.
* **الضابط الأمني الصارم:**
  * **لا يجوز لأي تفضيل للمسؤول أو مساعده تعطيل أو فلترة سجلات التدقيق الأمني (P7 Audit Logs)، أو تجاوز الـ Hard Permission Ceiling، أو التأثير على سياسات التفويض العلائقي (`scoped_permission_assignments`).**

---

## 5. Strict Architectural Categorization (التصنيف المعماري الصارم)

لضمان عدم خلط المفاهيم أثناء التطوير، تم تصنيف كل عنصر في النظام إلى الفئات الست المعيارية:

```text
========================================================================================
A: User Preference       --> Theme, Language, Avatar, UI Density
B: Role Preference       --> Queue View Mode, DICOM Preset, Default Dashboard Tab
C: Facility Setting      --> Working Hours, Facility Gallery, Booking Quotas, Cancellation Policy
D: Permission            --> clinical.write_rx, booking.manage_queue, platform.manage_users
E: Security/Clinical     --> Audit Logging, Panic Value Alerts, Hard Permission Ceiling
F: System Configuration  --> JWT Expiry, Storage Drivers, Mail Gateways
========================================================================================
```

### تفصيل التصنيفات:
1. **الفئة A — User Preference (تفضيل مستخدم):** (المظهر، اللغة، الصورة الشخصية، التنبيهات الشخصية العامة).
2. **الفئة B — Role Preference (تفضيل مرتبط بالدور):** (طريقة عرض الرتل للمساعد، إعدادات DICOM لاختصاصي الأشعة، التبويب الافتراضي للطبيب).
3. **الفئة C — Facility Setting (إعداد منشأة):** (ساعات عمل العيادة، سياسة الإلغاء، رصيد حصص الحجز، معارض صور المنشآت).
4. **الفئة D — Permission (صلاحية وصول أمنية):** (ما يُسمح للمستخدم بفعله أمنيًا عبر `scoped_permission_assignments` و `permission_role`).
5. **الفئة E — Security / Clinical Control (ضابط أمني/سريري إلزامي):** (تسجيل الوصول السريري P7، منع تعطيل تنبيهات القيم الحرجة، سقف الصلاحيات الصارم).
6. **الفئة F — System Configuration (إعداد نظام عام):** (تكوينات خوادم البريد، بوابات الدفع، مسارات التخزين).

---

## 6. Facility Settings & Galleries (إعدادات المنشآت ومعارض الصور)

تم التأكيد بصورة قاطعة على أن العناصر التالية هي **بيانات منشأة (Facility Data)** تتبع كيان المنشأة (`clinics`, `diagnostic_centers`, `booking_centers`) **ولا يجوز تخزينها في جداول تفضيلات المستخدمين**:

1. **معارض صور المنشآت (Facility Galleries):**
   * **Clinic Gallery:** صور مبنى العيادة، قاعات الانتظار، غرف الفحص.
   * **Laboratory Gallery:** صور المختبر، أجهزة التحليل، معايير الجودة.
   * **Radiology Gallery:** صور أجهزة الرنين المغناطيسي والمفراس، غرف الاستقبال.
   * **التخزين الصحيح:** جدول وسائط المنشأة `facility_media` أو أعمدة مرتبطة بمعرف المنشأة `clinic_id` / `diagnostic_center_id`.
2. **ساعات وأيام العمل والاستثناءات (Working Hours & Exceptions):**
   * تتبع المنشأة وتخزن في جداول العمل المعتمدة في P1/P3 (`clinic_schedules`, `clinic_exceptions`).
3. **رصيد وشراء حصص الحجز (Booking Quotas):**
   * تتبع حساب المركز أو العيادة وتخزن في `booking_transactions` و `booking_packages`.

---

## 7. Persistence Architecture (معمارية الحفظ المقترحة للتنفيذ المستقبلي)

عند بدء مرحلة التنفيذ لاحقًا، يوصى بالنموذج التالي:

### 7.1 تفضيلات الواجهة السريعة (Theme & UI Preferences)
* **المكان:** `localStorage` و `Cookies` في المتصفح.
* **السبب:** تحميل فوري عند فتح الصفحة دون انتظار طلبات الشبكة (0ms Latency) ومنع وميض الشاشة (Zero Layout Shift / Flicker).

### 7.2 تفضيلات الحساب والتنبيهات المتقاطعة بين الأجهزة (Account & Workflow Preferences)
* **المكان:** جدول علائقي مستقل مخصص `user_preferences`:
  - `id` (UUID PK)
  - `user_id` (UUID FK UNIQUE -> `users.id`)
  - `theme` (VARCHAR: `light`, `dark`, `system`)
  - `locale` (VARCHAR: `ar`, `en`, `fr`)
  - `table_density` (VARCHAR: `comfortable`, `compact`)
  - `notifications_json` (JSON: قنوات التنبيه المفضلة لكل مستخدم)
  - `workflow_settings_json` (JSON: إعدادات الدور الخاصة مثل طريقة عرض الرتل، إعدادات DICOM)
  - `created_at`, `updated_at` (TIMESTAMPS)
* **الفهرسة:** فهرس فريد على `user_id` يضمن استعلامات قراءة وكتابة O(1).
* **الأمان:** محمي بمصادقة Sanctum؛ يسترجع المستخدم إعداداته الخاصة حصرًا عبر `$request->user()->preferences` لمنع أي ثغرة تعديل عبر المستخدمين (IDOR).
* **الحفاظ على النظافة:** إبقاء جدول `users` خاليًا تمامًا من حقول الـ JSON.

---

## 8. Scalability & Performance Analysis (قابلية التوسع)

| المعيار | التقييم عند الوصول إلى (150k طبيب + 500k مساعد + ملايين المرضى) |
| :--- | :--- |
| **سرعة القراءة (Read Speed)** | استعلام مفهرس 1:1 عبر المفتاح الأجنبي الفريد `user_id` يستغرق أقل من 1ms في MySQL 8.0. |
| **سرعة التحديث (Write Speed)** | تحديث سجل التفضيلات لا يقفل جدول `users` الرئيسي، مما يمنع أي اختناق في قاعدة البيانات. |
| **استهلاك الذاكرة (Memory)** | حجم كائن التفضيلات لا يتجاوز 1KB لكل مستخدم؛ استهلاك ثابت وخفيف للغاية. |
| **عزل المستأجرين (Isolation)** | كل مستخدم معزول تمامًا بحسابه؛ لا يوجد أي تداخل في التفضيلات بين أجهزة العيادات المختلفة. |

---

## 9. P1–P10 Compatibility Matrix (التوافق مع المواصفات المجمدة)

* **P1 (Database Architecture):** متوافق 100% (فصل كامل بين الهويات والتفضيلات؛ الحفاظ على سلامة الـ Schema).
* **P2 (RBAC / 4D Authorization):** متوافق 100% (التفضيلات لا تتدخل إطلاقًا في طبقات الصلاحيات L1-L4 أو السقف الصارم).
* **P7 (Audit & Integrity):** متوافق 100% (سجلات التدقيق الأمني والسريري غير قابلة للتعديل أو الحجب عبر التفضيلات).
* **P9 (Backend Architecture):** متوافق 100% (الخلفية هي مصدر الحقيقة للبيانات والتحقق الأمني).
* **P10 (Implementation Plan):** متوافق 100% (الالتزام بمراحل التنفيذ المنضبطة).

---

## 10. Future Test Matrix (حزمة الاختبارات المستقبلية لمرحلة التنفيذ)

عند بدء التنفيذ المستقبلي، يجب أن تغطي الاختبارات الآلية السيناريوهات التالية:

```text
1. Preference Save Test:
   - حفظ التفضيلات بنجاح عبر PUT /api/v1/user/preferences للمستخدم المصادق عليه.
2. Preference Persistence Test (Refresh & Logout/Login):
   - التحقق من بقاء المظهر، اللغة، وقنوات التنبيه بعد الـ Refresh وتسجيل الخروج ثم الدخول.
3. Multi-Device Isolation Test:
   - التحقق من أن تغيير المستخدم (A) لتفضيلاته لا يؤثر إطلاقًا على المستخدم (B).
4. Security & Anti-IDOR Test:
   - محاولة المستخدم (A) إرسال user_id = User (B) لتعديل تفضيلاته تُرفض تلقائيًا (يعتمد الـ Backend على auth user فقط).
5. Permission Non-Escalation Test:
   - التحقق الصارم من أن إرسال أي مفتاح تفضيل لا يمنح أي صلاحية سريرية أو إدارية في Has4DAuthorization.
6. Role-Specific Coverage Test:
   - اختبار حفظ واسترجاع تفضيلات كل دور من الأدوار العشرة في النظام.
```

---

## 11. Open Architectural Decisions (القرارات المعمارية المفتوحة)

العناصر التالية موثقة كخيارات تحتاج إلى اعتماد صريح قبل بدء التنفيذ البرمجي:
1. **الاعتماد النهائي لقنوات التنبيه الافتراضية للمرضى:** هل يتم تفعيل WhatsApp كقناة افتراضية إلى جانب SMS؟
2. **حد إنذار انخفاض الحصص لمركز الحجز:** هل يتم اعتماده كقيمة ثابتة (10 حجوزات) أم كنسبة مئوية من الباقة؟
3. **مزامنة المظهر مع خادم النظام:** هل يتم الاكتفاء بالـ LocalStorage للمظهر الداكن لسرعة الأداء، أم مزامنته مع جدول `user_preferences`؟

---

## 12. Execution Statement (إقرار عدم التعديل)

```text
=====================================================================
SPECIFICATION STATUS: COMPLETE & FROZEN FOR REVIEW
DATABASE SCHEMA MODIFIED: NO
MIGRATIONS EXECUTED: NO
MODELS/CONTROLLERS/SERVICES MODIFIED: NO
FRONTEND COMPONENTS MODIFIED: NO
CURRENT WORKFLOW ALTERED: NO
---------------------------------------------------------------------
MODIFICATION MADE: NONE
=====================================================================
```
