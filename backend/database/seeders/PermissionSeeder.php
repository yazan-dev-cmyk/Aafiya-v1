<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Core System & Dashboard
            [
                'name' => 'platform.view_dashboard',
                'display_name' => 'عرض لوحة القيادة',
                'category' => 'system',
                'description' => 'الاطلاع على الإحصائيات العامة للمنصة',
            ],
            [
                'name' => 'platform.view_statistics',
                'display_name' => 'عرض الإحصائيات المتقدمة',
                'category' => 'system',
                'description' => 'الاطلاع على الرسوم البيانية ومؤشرات الأداء',
            ],

            // User Management
            [
                'name' => 'platform.manage_users',
                'display_name' => 'إدارة المستخدمين',
                'category' => 'users',
                'description' => 'عرض قائمة مستخدمي المنصة بجميع الأدوار',
            ],
            [
                'name' => 'platform.edit_users',
                'display_name' => 'تعديل بيانات المستخدمين',
                'category' => 'users',
                'description' => 'تحديث الملفات الشخصية والحسابات',
            ],
            [
                'name' => 'platform.suspend_users',
                'display_name' => 'تجميد الحسابات',
                'category' => 'users',
                'description' => 'إيقاف حسابات المستخدمين مؤقتاً',
            ],
            [
                'name' => 'platform.delete_users',
                'display_name' => 'حذف الحسابات',
                'category' => 'users',
                'description' => 'حذف الحسابات نهائياً من المنصة',
            ],

            // Verification & Onboarding
            [
                'name' => 'platform.view_requests',
                'display_name' => 'عرض طلبات الانضمام',
                'category' => 'verification',
                'description' => 'استعراض طلبات الأطباء والمراكز والعيادات',
            ],
            [
                'name' => 'platform.review_requests',
                'display_name' => 'مراجعة الطلبات والوثائق',
                'category' => 'verification',
                'description' => 'تدقيق الشهادات والتراخيص المرفقة',
            ],
            [
                'name' => 'platform.approve_requests',
                'display_name' => 'اعتماد الطلبات',
                'category' => 'verification',
                'description' => 'قبول طلبات الانضمام وتفعيل الحسابات',
            ],
            [
                'name' => 'platform.reject_requests',
                'display_name' => 'رفض الطلبات',
                'category' => 'verification',
                'description' => 'رفض طلبات الانضمام غير المستوفية للشروط',
            ],
            [
                'name' => 'platform.request_more_info',
                'display_name' => 'طلب استكمال الوثائق',
                'category' => 'verification',
                'description' => 'مطالبة مقدم الطلب بإرفاق مستندات إضافية',
            ],

            // Document Audit
            [
                'name' => 'platform.view_docs',
                'display_name' => 'عرض المستندات والملفات',
                'category' => 'documents',
                'description' => 'الاطلاع على الأرشيف الرقمي للتراخيص',
            ],
            [
                'name' => 'platform.review_docs',
                'display_name' => 'فحص صحة المستندات',
                'category' => 'documents',
                'description' => 'إجراء المراجعة الفنية للتراخيص الطبية',
            ],
            [
                'name' => 'platform.approve_docs',
                'display_name' => 'توثيق واعتماد المستند',
                'category' => 'documents',
                'description' => 'منح علامة التوثيق الرسمية للوثيقة',
            ],
            [
                'name' => 'platform.request_info_docs',
                'display_name' => 'طلب إعادة إرسال وثيقة',
                'category' => 'documents',
                'description' => 'طلب نسخة أوضح أو أحدث من المستند',
            ],

            // Ticketing & Support
            [
                'name' => 'platform.view_tickets',
                'display_name' => 'عرض تذاكر الدعم الفني',
                'category' => 'support',
                'description' => 'استعراض الشكاوى والاستفسارات الواردة',
            ],
            [
                'name' => 'platform.reply_tickets',
                'display_name' => 'الرد على التذاكر',
                'category' => 'support',
                'description' => 'مراسلة المستخدمين لحل الإشكالات الفنية',
            ],
            [
                'name' => 'platform.close_tickets',
                'display_name' => 'إغلاق التذاكر',
                'category' => 'support',
                'description' => 'إنهاء التذاكر بعد حل الموضوع',
            ],
            [
                'name' => 'platform.escalate_tickets',
                'display_name' => 'تصعيد التذاكر للإدارة',
                'category' => 'support',
                'description' => 'إحالة التذاكر الحرجة للإدارة العليا',
            ],

            // System Broadcasts & Notifications
            [
                'name' => 'platform.view_notifications',
                'display_name' => 'عرض سجل الإشعارات',
                'category' => 'notifications',
                'description' => 'استعراض الإشعارات المرسلة لعموم المنصة',
            ],
            [
                'name' => 'platform.create_notifications',
                'display_name' => 'إنشاء إشعار عام',
                'category' => 'notifications',
                'description' => 'صياغة تنبيهات ورسائل جماعية للمستخدمين',
            ],
            [
                'name' => 'platform.edit_notifications',
                'display_name' => 'تعديل الإشعار',
                'category' => 'notifications',
                'description' => 'تحديث محتوى الإشعارات غير المرسلة',
            ],
            [
                'name' => 'platform.delete_notifications',
                'display_name' => 'حذف الإشعارات',
                'category' => 'notifications',
                'description' => 'إلغاء مسودات الإشعارات',
            ],
            [
                'name' => 'platform.publish_notifications',
                'display_name' => 'بث ونشر الإشعار',
                'category' => 'notifications',
                'description' => 'إرسال الإشعارات فورياً إلى المستهدفين',
            ],

            // Reporting & Auditing
            [
                'name' => 'platform.view_operational_reports',
                'display_name' => 'عرض التقارير التشغيلية',
                'category' => 'reports',
                'description' => 'تقارير المواعيد، الإلغاءات، أداء العيادات',
            ],
            [
                'name' => 'platform.view_financial_reports',
                'display_name' => 'عرض التقارير المالية',
                'category' => 'reports',
                'description' => 'تقارير الإيرادات، الباقات، ومبيعات الحصص',
            ],
            [
                'name' => 'platform.export_reports',
                'display_name' => 'تصدير التقارير (Excel/PDF)',
                'category' => 'reports',
                'description' => 'تنزيل كشوفات البيانات والتقارير الدورية',
            ],
            [
                'name' => 'platform.print_reports',
                'display_name' => 'طباعة التقارير الرسمية',
                'category' => 'reports',
                'description' => 'إرسال التقارير والوثائق لأجهزة الطباعة',
            ],

            // Task Management
            [
                'name' => 'platform.view_tasks',
                'display_name' => 'عرض المهام الإدارية',
                'category' => 'tasks',
                'description' => 'متابعة جدول المهام اليومية لفريق العمل',
            ],

            // Payout Confirmation (Individual Delegated Authority under DEC-ARP-08 / DEC-07)
            [
                'name' => 'platform.confirm_assistant_payout',
                'display_name' => 'تأكيد تحويل مستحقات المساعدين',
                'category' => 'financial',
                'description' => 'صلاحية تفويضية لتأكيد التحويل المصرفي الفعلي لدفعات مستحقات المساعدين وخصمها من الدفتر المالي',
            ],

            // Assistant Rewards Administration & Governance
            [
                'name' => 'platform.rewards.view_overview',
                'display_name' => 'عرض المؤشرات المالية لمكافآت المساعدين',
                'category' => 'financial',
                'description' => 'الاطلاع على الإجماليات، الأرصدة المعلقة، والخسائر التشغيلية للمكافآت',
            ],
            [
                'name' => 'platform.rewards.view_assistants',
                'display_name' => 'استعراض دليل المساعدين وأرصدتهم',
                'category' => 'financial',
                'description' => 'عرض قائمة المساعدين، الأرصدة التراكمية، وحالة الأهلية للصرف',
            ],
            [
                'name' => 'platform.rewards.view_assistant_ledger',
                'display_name' => 'عرض دفتر أستاذ المساعد الفردي',
                'category' => 'financial',
                'description' => 'الاطلاع على المعاملات المالية التاريخية والقيود للمساعد',
            ],
            [
                'name' => 'platform.rewards.view_cheque_document',
                'display_name' => 'معاينة وثيقة الشيك المشطوب للمساعد',
                'category' => 'financial',
                'description' => 'استعراض ملف الشيك المشطوب المرفوع للحساب البريدي',
            ],
            [
                'name' => 'platform.rewards.download_cheque_document',
                'display_name' => 'تنزيل وثيقة الشيك المشطوب للمساعد',
                'category' => 'financial',
                'description' => 'تنزيل ملف الشيك المشطوب بصيغة أصلية للتدقيق الورقي',
            ],
            [
                'name' => 'platform.rewards.view_full_rip',
                'display_name' => 'كشف الحساب البريدي الكامل (20 رقماً)',
                'category' => 'financial',
                'description' => 'إظهار رقم الـ RIP الكامل غير المشفر مع تسجيل قيد تدقيق أمني',
            ],
            [
                'name' => 'platform.rewards.verify_payout_profile',
                'display_name' => 'اعتماد وتفعيل ملف الحساب البريدي للمساعد',
                'category' => 'financial',
                'description' => 'تأكيد صحة الحساب البريدي والموافقة على جاهزيته لصرف المستحقات',
            ],
            [
                'name' => 'platform.rewards.reject_payout_profile',
                'display_name' => 'رفض ملف الحساب البريدي للمساعد',
                'category' => 'financial',
                'description' => 'رفض الحساب البريدي مع إلزامية توثيق سبب الرفض وإعادة الملف للمسودة',
            ],
            [
                'name' => 'platform.rewards.generate_payout_batch',
                'display_name' => 'تجهيز وتوليد دفعة مستحقات شهرية للمساعدين',
                'category' => 'financial',
                'description' => 'تجميع المساعدين المؤهلين وتوليد دفعة الصرف الشهري',
            ],
            [
                'name' => 'platform.rewards.cancel_payout_batch',
                'display_name' => 'إلغاء دفعة مستحقات شهرية غير مدفوعة',
                'category' => 'financial',
                'description' => 'إلغاء دفعة المستحقات وإعادة مبالغ البنود لأرصدة المساعدين المتاحة مع تبرير إلزامي',
            ],
            [
                'name' => 'platform.rewards.view_audit_logs',
                'display_name' => 'استعراض سجل التدقيق الأمني المالي للمكافآت',
                'category' => 'financial',
                'description' => 'الاطلاع على أحداث كشف الـ RIP وتنزيل الشيكات والتعديلات الإدارية الحساسة',
            ],

            // Dynamic Rate Scheduling & Program Lifecycle Management (DEC-03 & DEC-05)
            [
                'name' => 'platform.rewards.view_settings',
                'display_name' => 'عرض إعدادات وسياسة برنامج المكافآت',
                'category' => 'financial',
                'description' => 'الاطلاع على السعر الحالي، السجل التاريخي، والجدولة المستقبلية وحالة دورة حياة البرنامج',
            ],
            [
                'name' => 'platform.rewards.schedule_rate',
                'display_name' => 'جدولة قيمة جديدة لمكافأة المساعدين',
                'category' => 'financial',
                'description' => 'صلاحية حصرية للمدير لجدولة قيمة المكافأة مع تاريخ ووقت السريان المستقبلي',
            ],
            [
                'name' => 'platform.rewards.cancel_scheduled_rate',
                'display_name' => 'إلغاء جدولة قيمة المكافأة المستقبلية',
                'category' => 'financial',
                'description' => 'إلغاء تغيير سعر مجدول قبل حلول تاريخ ووقت سريانه مع إبداء السبب الإلزامي',
            ],
            [
                'name' => 'platform.rewards.manage_lifecycle',
                'display_name' => 'إدارة دورة حياة برنامج المكافآت',
                'category' => 'financial',
                'description' => 'صلاحية حصرية للمدير لتعليق البرنامج أو استئنافه أو إنهائه نهائياً بموجب DEC-05 و DEC-06',
            ],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                $permission
            );
        }
    }
}