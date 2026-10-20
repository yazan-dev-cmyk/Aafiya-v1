'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import {
  Clock,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { ClinicOperatingHoursEditor } from '../tabs/ClinicOperatingHoursEditor';
import { DoctorWorkingHoursEditor } from '../tabs/DoctorWorkingHoursEditor';

interface DoctorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLater: () => void;
  isDirector: boolean;
  clinicId: string;
  clinicName?: string;
  doctorId: string;
  isClinicConfigured: boolean | null;
  isScheduleActivated: boolean | null;
  onClinicConfigured: () => void;
  onScheduleActivated: () => void;
  initialStep?: 1 | 2;
  isDarkMode?: boolean;
}

export const DoctorOnboardingModal: React.FC<DoctorOnboardingModalProps> = ({
  isOpen,
  onClose,
  onLater,
  isDirector,
  clinicId,
  clinicName,
  doctorId,
  isClinicConfigured,
  isScheduleActivated,
  onClinicConfigured,
  onScheduleActivated,
  initialStep,
  isDarkMode = false,
}) => {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const defaultStep = isDirector && !isClinicConfigured ? 1 : 2;
  const [step, setStep] = useState<1 | 2>(initialStep || defaultStep);

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    } else if (isDirector && !isClinicConfigured) {
      setStep(1);
    } else {
      setStep(2);
    }
  }, [initialStep, isDirector, isClinicConfigured]);

  if (!isOpen) return null;

  const bgModal = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs" dir={isRtl ? 'rtl' : 'ltr'}>
      <div
        className={`${bgModal} w-full max-w-4xl rounded-3xl border shadow-2xl p-5 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {isRtl ? 'الإعداد والتهيئة التشغيلية' : 'Operational Onboarding'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {clinicName || (isRtl ? 'العيادة النشطة' : 'Active Clinic')}
              </span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {isDirector
                ? isRtl
                  ? 'تهيئة العيادة وتفعيل جدول العمل'
                  : 'Clinic Configuration & Schedule Activation'
                : isRtl
                ? 'تهيئة جدول العمل الأسبوعي'
                : 'Weekly Working Hours Setup'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onLater}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isRtl ? 'لاحقاً (تخطي للجلسة)' : 'Later (Skip Session)'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Director Step Stepper */}
        {isDirector && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800">
            <div
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                step === 1
                  ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'opacity-70'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isClinicConfigured
                    ? 'bg-teal-500 text-white'
                    : step === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isClinicConfigured ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'ساعات تشغيل العيادة' : 'Clinic Operating Hours'}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  {isClinicConfigured
                    ? isRtl
                      ? 'مكتملة ومهيأة'
                      : 'Configured'
                    : isRtl
                    ? 'مطلوبة للأيام السبعة'
                    : 'Required 7 Days'}
                </span>
              </div>
            </div>

            <ArrowRight className={`w-4 h-4 text-slate-400 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />

            <div
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                step === 2
                  ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'opacity-70'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isScheduleActivated
                    ? 'bg-teal-500 text-white'
                    : step === 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isScheduleActivated ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'جدول عمل الطبيب' : 'Personal Doctor Schedule'}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  {isScheduleActivated
                    ? isRtl
                      ? 'مفعّل ومغلق نهائياً'
                      : 'Activated & Locked'
                    : isRtl
                    ? 'تحديد الفترات والتفعيل'
                    : 'Setup & Activate'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-4">
          {/* STEP 1 (Director only): Clinic Operating Hours */}
          {isDirector && step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isRtl
                    ? 'الخطوة 1 من 2: حدد ساعات العمل الأسبوعية للعيادة عبر تحديد فترات الفتح والإغلاق لكل يوم من أيام الأسبوع السبعة. بعد حفظ ساعات العيادة، ستنتقل لتحديد ساعات كشفك الشخصية.'
                    : 'Step 1 of 2: Configure weekly clinic operating hours across all 7 days. Once saved, you will proceed to set your personal schedule.'}
                </p>
              </div>

              <ClinicOperatingHoursEditor
                clinicId={clinicId}
                canManage={isDirector}
                isDarkMode={isDarkMode}
                onConfiguredChange={(configured) => {
                  if (configured) {
                    onClinicConfigured();
                    setStep(2);
                  }
                }}
              />

              {isClinicConfigured && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isRtl ? 'المتابعة إلى جدول عمل الطبيب' : 'Proceed to Doctor Schedule'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 (or Direct Step for Configured Clinic): Doctor Working Hours */}
          {((isDirector && step === 2) || (!isDirector && isClinicConfigured)) && (
            <div className="space-y-4">
              {isDirector && (
                <div className="flex items-center justify-between pb-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    <span>{isRtl ? 'العودة لمراجعة ساعات العيادة' : 'Back to Clinic Hours'}</span>
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isRtl
                    ? 'حدد فترات العمل والكشف الشخصية الخاصة بك داخل إطار ساعات تشغيل العيادة المعتمدة. عند الانتهاء، انقر على "مراجعة وتفعيل الجدول" لتثبيت وتفعيل الحجوزات.'
                    : 'Select your individual working slots contained within clinic operating hours. When ready, click "Review & Activate" to permanently lock and enable bookings.'}
                </p>
              </div>

              <DoctorWorkingHoursEditor
                doctorId={doctorId}
                clinicId={clinicId}
                canManage={true}
                isDarkMode={isDarkMode}
                onActivated={() => {
                  onScheduleActivated();
                  onClose();
                }}
              />
            </div>
          )}

          {/* Employed Doctor Waiting State when clinic hours are NOT configured */}
          {!isDirector && !isClinicConfigured && (
            <div className="py-8 px-6 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'ساعات تشغيل العيادة قيد الإعداد' : 'Clinic Hours Pending Configuration'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'لم يقم مدير العيادة بتهيئة ساعات التشغيل الأسبوعية للعيادة بعد. لا تملك صلاحية تعديل ساعات العيادة. بمجرد قيام إدارة العيادة بحفظ الساعات المعتمدة، ستتمكن من إعداد وتفعيل جدول عملك الشخصي.'
                    : 'The clinic director has not yet configured weekly operating hours. You do not have settings permissions. Once the director completes setup, you will be able to activate your schedule.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs text-right">
                <span className="font-bold block mb-1">{isRtl ? 'ملاحظة أمان:' : 'Safety Notice:'}</span>
                <span>
                  {isRtl
                    ? 'حجز المواعيد يظل معطلاً بشكل آمن حتى تكتمل جاهزية العيادة وجدول الطبيب معاً.'
                    : 'Patient bookings remain safely blocked until both clinic and doctor schedules are active.'}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLater}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {isRtl ? 'العودة للوحة التحكم ومتابعة العمل' : 'Return to Dashboard'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
