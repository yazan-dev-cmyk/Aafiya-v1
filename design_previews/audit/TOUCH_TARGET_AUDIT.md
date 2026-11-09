# AAFIYA Mobile — تقرير تدقيق مساحات اللمس وسهولة الوصول (Touch Target Audit)
## Minimum $\ge 48\times 48\text{dp}$ Touch Target & Accessibility Verification

**النظام:** AAFIYA Design System (Patient & Pro)  
**المنصة المستهدفة:** Android (Material Design Accessibility & WCAG 2.1 Success Criterion 2.5.8 Target Size)  
**الحد الأدنى الإلزامي:** $\ge 48\times 48\text{dp}$ لكل عنصر تفاعلي دون استثناء.

---

## 1. جدول تدقيق مساحات اللمس للمكونات التفاعلية (Touch Target Matrix)

| فئة المكون (Component Category) | اسم المكون واستخدامه | الأبعاد البصرية (Visual Size) | أبعاد مساحة اللمس الفعلية (Touch Target Size) | التباعد الأدنى المحيط (Padding / Margin) | التوافق مع معيار $48\text{dp}$ | ملاحظات التطبيق البرمجي (Flutter Implementation) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **الأزرار الرئيسية (CTA Buttons)** | أزرار الحجز، التأكيد، تسجيل الدخول | Height: $52\text{dp}$ × Full Width | Height: $52\text{dp}$ × Full Width | Margin: $16\text{dp}$ أفقي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `SizedBox(height: 52, child: ElevatedButton(...))` |
| **الأزرار الثانوية (Secondary Buttons)** | أزرار الإلغاء، العودة، العرض | Height: $48\text{dp}$ × Min Width $120\text{dp}$ | Height: $48\text{dp}$ × Min Width $120\text{dp}$ | Margin: $8\text{dp}$ | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `OutlinedButton(style: ButtonStyle(minimumSize: ...))` |
| **أزرار الأيقونات (Icon Buttons)** | زر الرجوع، الإغلاق، الإشعارات، التقويم | Icon: $24\times 24\text{dp}$ | **$48\times 48\text{dp}$** | Padding: $12\text{dp}$ محيطي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | استخدام `IconButton` مع `constraints: BoxConstraints(minWidth: 48, minHeight: 48)` |
| **حقول الإدخال (Text Form Fields)** | رقم الهاتف، كلمة المرور، البحث | Height: $52\text{dp}$ | Height: $52\text{dp}$ × Full Width | Margin: $12\text{dp}$ عمودي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16))` |
| **عناصر شريط التنقل السفلي (Bottom Nav)** | أيقونات التبويبات (الرئيسية، المواعيد، ...) | Icon + Text: $44\text{dp}$ | **$64\text{dp}$ (عرض التبويب) × $64\text{dp}$ (ارتفاع الشريط)** | موزع بالتساوي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | مساحة التبويب تشغل كامل ارتفاع الشريط $64\text{dp}$ لتفادي الأخطاء اللمسية |
| **بطاقات المواعيد والقوائم (List Cards)** | بطاقة موعد في الجدول أو قائمة الأطباء | Height: $84\text{dp} - 120\text{dp}$ | كامل مساحة البطاقة ($\ge 84\text{dp}$) | Margin: $8\text{dp}$ عمودي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `InkWell(onTap: ..., child: Card(...))` |
| **رقاقات التصفية والخيارات (Filter Chips)** | اختيار الاختصاص، تصنيف المواعيد | Visual: $36\text{dp}$ ارتفاع | **$48\text{dp}$ مساحة لمس (Touch Box)** | Margin: $6\text{dp}$ أفقي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | استخدام `MaterialTapTargetSize.padded` لتوسيع مساحة النقر إلى $48\text{dp}$ تلقائياً |
| **خانات اختيار الأيام والمواعيد (Slots)** | اختيار وقت الموعد (09:00، 09:30...) | Visual: $42\times 72\text{dp}$ | **$48\times 72\text{dp}$** | Gap: $8\text{dp}$ بين المربعات | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | ضبط أدنى ارتفاع للحاوية بـ $48\text{dp}$ |
| **أزرار الفحص السريع (Scanner FAB)** | زر تشغيل كاميرا مسح التذكرة الطبية | $56\times 56\text{dp}$ | **$56\times 56\text{dp}$** | Margin: $16\text{dp}$ | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `FloatingActionButton.extended` أو دائري $56\text{dp}$ |
| **مربعات الاختيار والتبديل (Switches)** | تبديل إتاحة الطبيب، تفعيل الإشعارات | Switch visual: $32\text{dp}$ | **$48\times 48\text{dp}$** | Padding: $8\text{dp}$ محيطي | ✅ **متوافق تماماً** ($\ge 48\text{dp}$) | `SwitchListTile` لكامل السطر أو `SizedBox(width: 48, height: 48, child: Switch(...))` |

---

## 2. قواعد هندسة الواجهة لمنع النقرات الخاطئة (Accidental Tap Prevention)

1. **التباعد الحرج بين العناصر المتجاورة (Critical Spacing):**
   - يُلزم النظام البرمجي بوضع مسافة فاصلة لا تقل عن **$8\text{dp}$** بين أي عنصرين تفاعليين متجاورين (مثل أزرار القبول والرفض، أو رقاقات التصفية).
2. **استبعاد الادعاءات غير الموثقة (Removal of Unverified Claims):**
   - تم شطب أي ادعاء غير مدعوم بحسابات دقيقة مثل (زيادة المساحة بنسبة 25%)، والاعتماد فقط على الأبعاد الهندسية المحددة بالـ dp والبيكسل.
3. **التجاوب مع تكبير الخط في إعدادات النظام (Dynamic Type / Font Scaling):**
   - الحاويات التفاعلية مُهيأة لتتمدد ديناميكياً (`BoxConstraints(minHeight: 48)`) بدلاً من الارتفاع الثابت غير المرن (`height: 48`) لتفادي قص النصوص (Text Truncation) عند تفعيل كبار السن لخاصية تكبير النصوص في نظام Android.
