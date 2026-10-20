'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { AlertTriangle, Clock, Calendar, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

interface DoctorSetupReminderBannerProps {
  isDirector: boolean;
  isClinicConfigured: boolean | null;
  isScheduleActivated: boolean | null;
  onOpenSetup: (step?: 1 | 2) => void;
  onRefresh?: () => void;
  isDarkMode?: boolean;
}

export const DoctorSetupReminderBanner: React.FC<DoctorSetupReminderBannerProps> = ({
  isDirector,
  isClinicConfigured,
  isScheduleActivated,
  onOpenSetup,
  onRefresh,
  isDarkMode = false,
}) => {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // If loading/undetermined, or both are complete, no banner needed
  if (isClinicConfigured === null || isScheduleActivated === null || (isClinicConfigured && isScheduleActivated)) {
    return null;
  }

  // Case 1: Clinic Operating Hours are incomplete
  if (!isClinicConfigured) {
    if (isDirector) {
      return (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDarkMode
              ? 'bg-amber-950/40 border-amber-800 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">
                    {isRtl
                      ? 'إعدادات العيادة غير مكتملة — ساعات تشغيل العيادة غير مهيأة'
                      : 'Clinic Setup Incomplete — Operating Hours Not Configured'}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    {isRtl ? 'الحجز معطل' : 'Bookings Blocked'}
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed max-w-3xl">
                  {isRtl
                    ? 'بصفتك مديراً للعيادة، يجب أولاً تهيئة ساعات تشغيل العيادة للأيام السبعة ثم تفعيل جدول عملك لتمكين المرضى من حجز المواعيد.'
                    : 'As clinic director, you must first configure clinic operating hours for all 7 days before bookings can be enabled.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSetup(1)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>{isRtl ? 'إكمال إعداد ساعات العيادة' : 'Configure Clinic Hours'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      );
    }

    // Employed Doctor view when clinic hours are missing
    return (
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">
                  {isRtl
                    ? 'بانتظار تهيئة ساعات العيادة من قِبل إدارة العيادة'
                    : 'Awaiting Clinic Operating Hours Setup by Director'}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {isRtl ? 'قيد انتظار الإدارة' : 'Pending Management'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                {isRtl
                  ? 'لم تقم إدارة العيادة بتهيئة ساعات التشغيل بعد. بمجرد قيام مدير العيادة بذلك، ستتمكن من إعداد وتفعيل جدول عملك الشخصي.'
                  : 'Clinic management has not yet configured operating hours. Once complete, you will be guided to activate your personal schedule.'}
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحديث الحالة' : 'Check Status'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Clinic hours configured, but Doctor schedule is not activated
  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isDarkMode
          ? 'bg-teal-950/40 border-teal-800 text-teal-200'
          : 'bg-teal-50 border-teal-200 text-teal-900 shadow-xs'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">
                {isRtl
                  ? 'ساعات عملك في هذه العيادة غير مفعّلة'
                  : 'Personal Working Hours Not Activated'}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                {isRtl ? 'المسودة غير مفعّلة' : 'Draft Only'}
              </span>
            </div>
            <p className="text-xs text-teal-800/80 dark:text-teal-300/80 leading-relaxed max-w-3xl">
              {isRtl
                ? 'ساعات تشغيل العيادة مهيأة بنجاح. يرجى إعداد وتفعيل جدول عملك الأسبوعي لبدء استقبال مواعيد المرضى.'
                : 'Clinic operating hours are ready. Please review and activate your weekly working hours to enable bookings.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenSetup(2)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isRtl ? 'تفعيل جدول العمل الآن' : 'Activate Schedule Now'}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
