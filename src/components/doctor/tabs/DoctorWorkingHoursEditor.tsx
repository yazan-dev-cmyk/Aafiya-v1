import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Clock,
  Save,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Calendar,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  workingHoursService,
  DoctorDayScheduleItem,
  DoctorWorkingHoursData,
  ALLOWED_HOURLY_SLOTS,
  WEEKDAYS_ORDER,
  ClinicOperatingHoursData,
} from '@/services/workingHoursService';
import { ScheduleActivationModal } from './ScheduleActivationModal';

interface DoctorWorkingHoursEditorProps {
  doctorId: string;
  clinicId: string;
  canManage: boolean;
  isDarkMode?: boolean;
  onActivated?: () => void;
}

const DEFAULT_DOCTOR_DAYS: DoctorDayScheduleItem[] = WEEKDAYS_ORDER.map((d) => ({
  day_of_week: d,
  is_closed: d === 0 || d === 6,
  slots:
    d === 0 || d === 6
      ? []
      : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
}));

export const DoctorWorkingHoursEditor: React.FC<DoctorWorkingHoursEditorProps> = ({
  doctorId,
  clinicId,
  canManage,
  isDarkMode = false,
  onActivated,
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [days, setDays] = useState<DoctorDayScheduleItem[]>(DEFAULT_DOCTOR_DAYS);
  const [scheduleData, setScheduleData] = useState<DoctorWorkingHoursData | null>(null);
  const [clinicHours, setClinicHours] = useState<ClinicOperatingHoursData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dayNames: Record<number, string> = {
    0: t('days.saturday'),
    1: t('days.sunday'),
    2: t('days.monday'),
    3: t('days.tuesday'),
    4: t('days.wednesday'),
    5: t('days.thursday'),
    6: t('days.friday'),
  };

  const loadData = async () => {
    if (!doctorId || !clinicId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch clinic operating hours
      try {
        const clinicRes = await workingHoursService.getClinicOperatingHours(clinicId);
        setClinicHours(clinicRes.data || null);
      } catch (cErr) {
        console.warn('Could not load clinic hours:', cErr);
      }

      // 2. Fetch doctor working schedule
      const doctorRes = await workingHoursService.getDoctorWorkingHours(doctorId, clinicId);
      if (doctorRes.data) {
        setScheduleData(doctorRes.data);
        if (doctorRes.data.days && doctorRes.data.days.length > 0) {
          const loadedMap = new Map(doctorRes.data.days.map((d) => [d.day_of_week, d]));
          const merged: DoctorDayScheduleItem[] = WEEKDAYS_ORDER.map((d) => {
            const found = loadedMap.get(d);
            if (found) {
              return {
                day_of_week: d,
                is_closed: found.is_closed,
                slots: found.slots || [],
              };
            }
            return { day_of_week: d, is_closed: true, slots: [] };
          });
          setDays(merged);
        }
      }
    } catch (err: any) {
      console.error('Failed to load doctor schedule:', err);
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          (isRtl
            ? 'تعذر تحميل ساعات عمل الطبيب. يرجى التحقق من انتساب الطبيب للعيادة.'
            : 'Failed to load doctor working hours.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [doctorId, clinicId]);

  const isLocked = Boolean(scheduleData?.is_activated);
  const isClinicConfigured = Boolean(clinicHours?.is_configured);

  const handleToggleDay = (dayIndex: number) => {
    if (isLocked || !canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const willBeClosed = !d.is_closed;
          return {
            ...d,
            is_closed: willBeClosed,
            slots: willBeClosed
              ? []
              : d.slots.length > 0
              ? d.slots
              : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
          };
        }
        return d;
      })
    );
  };

  const handleToggleSlot = (dayIndex: number, slotTime: string) => {
    if (isLocked || !canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const exists = d.slots.includes(slotTime);
          const nextSlots = exists
            ? d.slots.filter((s) => s !== slotTime)
            : [...d.slots, slotTime].sort();
          return {
            ...d,
            slots: nextSlots,
            is_closed: nextSlots.length === 0 ? true : d.is_closed,
          };
        }
        return d;
      })
    );
  };

  const checkSlotInClinicHours = (dayIndex: number, slotTime: string): boolean => {
    if (!clinicHours?.days) return true;
    const clinicDay = clinicHours.days.find((cd) => cd.day_of_week === dayIndex);
    if (!clinicDay || clinicDay.is_closed || !clinicDay.periods || clinicDay.periods.length === 0) {
      return false;
    }
    const slotHour = parseInt(slotTime.split(':')[0], 10);
    const slotEnd = `${String(slotHour + 1).padStart(2, '0')}:00`;

    return clinicDay.periods.some(
      (p) => p.open_time <= slotTime && p.close_time >= slotEnd
    );
  };

  const handleSaveDraft = async () => {
    if (isLocked || !canManage || isSavingDraft || isActivating) return;
    setIsSavingDraft(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await workingHoursService.saveDoctorScheduleDraft(doctorId, days, clinicId);
      if (res.data) {
        setScheduleData(res.data);
        setSuccessMessage(
          isRtl
            ? 'تم حفظ مسودة ساعات العمل بنجاح. تذكير: الحجوزات تظل غير متاحة حتى تفعيل الجدول نهائياً.'
            : 'Schedule draft saved successfully. Note: Bookings remain blocked until activated.'
        );
      }
    } catch (err: any) {
      console.error('Failed to save schedule draft:', err);
      const apiErrors = err?.errors?.days || err?.errors?.slots || err?.errors?.schedule_conflict;
      const firstError = Array.isArray(apiErrors) ? apiErrors[0] : null;
      setErrorMessage(
        firstError ||
          err?.message ||
          (isRtl
            ? 'تعذر حفظ مسودة ساعات العمل. يرجى مراجعة قيود العيادة والتأكد من مطابقة الساعات.'
            : 'Failed to save schedule draft.')
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleConfirmActivation = async () => {
    if (isLocked || !canManage || isActivating || isSavingDraft) return;
    setIsActivating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Persist the current 7-day editor state to ensure doctor_day_schedules exist in DB
      const draftRes = await workingHoursService.saveDoctorScheduleDraft(doctorId, days, clinicId);
      if (draftRes.data) {
        setScheduleData(draftRes.data);
      }

      // 2. Atomically activate and permanently lock the schedule
      const res = await workingHoursService.activateDoctorSchedule(doctorId, clinicId);
      if (res.data) {
        setScheduleData(res.data);
        setSuccessMessage(
          isRtl
            ? 'تم تفعيل ساعات العمل وقفل الجدول نهائياً بنجاح! يمكن الآن للمرضى حجز المواعيد وفق هذا الجدول.'
            : 'Schedule successfully activated and permanently locked! Bookings are now enabled.'
        );
        onActivated?.();
      }
    } catch (err: any) {
      const errorMsg =
        err?.errors?.clinic_hours?.[0] ||
        err?.errors?.schedule_conflict?.[0] ||
        err?.errors?.containment?.[0] ||
        err?.errors?.days?.[0] ||
        err?.errors?.slots?.[0] ||
        err?.message ||
        (isRtl
          ? 'فشل تفعيل ساعات العمل الأسبوعية. يرجى مراجعة قيود العيادة.'
          : 'Schedule activation failed.');
      setErrorMessage(errorMsg);
      throw err;
    } finally {
      setIsActivating(false);
    }
  };

  const containerClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  if (isLoading) {
    return (
      <div className={`${containerClass} rounded-2xl p-8 border text-center space-y-3`}>
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs text-slate-500 font-bold">
          {isRtl ? 'جاري تحميل جدول عمل الطبيب...' : 'Loading doctor schedule...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule State Banner */}
      <div className={`${containerClass} rounded-2xl p-6 border shadow-xs space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLocked
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
              }`}
            >
              {isLocked ? <Lock className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isRtl ? 'جدول ساعات العمل الأسبوعية للطبيب' : 'Doctor Weekly Working Hours'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isLocked
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {isLocked
                    ? isRtl
                      ? `مفعّل ومغلق نهائياً (إصدار ${scheduleData?.schedule_version || 1})`
                      : `Activated & Locked (v${scheduleData?.schedule_version || 1})`
                    : isRtl
                    ? 'مسودة غير مفعّلة (الحجز معطّل)'
                    : 'Draft (Bookings Disabled)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'تحديد فترات الكشف بالساعة (من 08:00 إلى 16:00، مدة 60 دقيقة). فترة 17:00 مخصصة للإغلاق ومحظورة.'
                  : 'Hourly booking slots (08:00 to 16:00, 60 minutes). 17:00 is reserved for closing and prohibited.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isLocked && canManage && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isActivating}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSavingDraft ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'حفظ المسودة' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isClinicConfigured || isSavingDraft || isActivating}
                  onClick={() => setIsActivationModalOpen(true)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isRtl ? 'مراجعة وتفعيل الجدول' : 'Review & Activate'}</span>
                </button>
              </>
            )}

            {isLocked && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block font-mono">
                  {isRtl ? 'تاريخ التفعيل:' : 'Activated At:'}{' '}
                  {scheduleData?.activated_at ? new Date(scheduleData.activated_at).toLocaleDateString() : '—'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notices & Banners */}
        {!isClinicConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">
                {isRtl ? 'ساعات تشغيل العيادة غير مهيأة:' : 'Clinic Operating Hours Incomplete:'}
              </strong>
              <p className="leading-relaxed">
                {isRtl
                  ? 'لا يمكن تفعيل جدول عمل الطبيب حتى تكتمل تهيئة ساعات تشغيل العيادة لجميع الأيام السبعة. يرجى تهيئة ساعات تشغيل العيادة أولاً.'
                  : 'Doctor schedule cannot be activated until clinic operating hours are fully configured for all 7 days.'}
              </p>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">
                {isRtl ? 'جدول ساعات العمل مفعّل وثابت (Locked Schedule):' : 'Activated & Immutable Schedule:'}
              </strong>
              <p className="leading-relaxed">
                {isRtl
                  ? 'ساعات العمل الأسبوعية مفعّلة وثابتة، ومحرك الحجز يعتمد هذه الفترات رسمياً. التعديل المباشر مغلق في هذا الإصدار لضمان استقرار المواعيد القائمة. لأي تعديل استثنائي، يلزم التواصل مع إدارة المنصة.'
                  : 'Weekly schedule is permanently locked. Direct editing is disabled to protect existing bookings. Corrections require platform administrator approval.'}
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* 7-Days Schedule Grid */}
        <div className="space-y-3 pt-2">
          {days.map((d) => (
            <div
              key={d.day_of_week}
              className={`p-4 rounded-xl border transition-all ${
                d.is_closed
                  ? isDarkMode
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                  : containerClass
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
                {/* Day Switcher */}
                <div className="lg:col-span-3 flex items-center justify-between border-b lg:border-b-0 pb-2 lg:pb-0 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isLocked || !canManage}
                      onClick={() => handleToggleDay(d.day_of_week)}
                      className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                        isLocked || !canManage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${!d.is_closed ? 'bg-teal-600' : 'bg-slate-400'}`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          !d.is_closed
                            ? isRtl
                              ? 'translate-x-[-16px]'
                              : 'translate-x-4'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <strong className="font-bold block text-sm">{dayNames[d.day_of_week]}</strong>
                      <span
                        className={`text-[10px] font-bold ${
                          !d.is_closed ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
                        }`}
                      >
                        {!d.is_closed ? t('workingHours.openStatus') : t('workingHours.closedStatus')}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Day {d.day_of_week}
                  </span>
                </div>

                {/* Slots Selector (08:00 - 16:00) */}
                <div className="lg:col-span-9">
                  {d.is_closed ? (
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 font-bold text-center">
                      {isRtl ? 'الطبيب في عطلة طوال هذا اليوم (لا مواعيد)' : 'Doctor is off all day'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {ALLOWED_HOURLY_SLOTS.map((slot) => {
                          const isSelected = d.slots.includes(slot);
                          const fitsInClinic = checkSlotInClinicHours(d.day_of_week, slot);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isLocked || !canManage}
                              onClick={() => handleToggleSlot(d.day_of_week, slot)}
                              title={
                                !fitsInClinic
                                  ? isRtl
                                    ? 'هذه الفترة تقع خارج ساعات تشغيل العيادة المعتمدة'
                                    : 'Slot is outside clinic operating hours'
                                  : undefined
                              }
                              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition-all border flex items-center gap-1.5 ${
                                isLocked || !canManage ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500'
                              } ${!fitsInClinic && isSelected ? 'ring-2 ring-amber-400' : ''}`}
                            >
                              <span>{slot}</span>
                              {!fitsInClinic && (
                                <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Conflict / Out of Clinic hours warning */}
                      {d.slots.some((s) => !checkSlotInClinicHours(d.day_of_week, s)) && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 pt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            {isRtl
                              ? 'تنبيه: توجد فترات مختارة خارج ساعات تشغيل العيادة. لن يُقبل تفعيل الجدول حتى تتطابق الفترات.'
                              : 'Warning: Selected slots outside clinic operating hours will be rejected upon activation.'}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Irreversible Activation Review Modal */}
      <ScheduleActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        onConfirm={handleConfirmActivation}
        days={days}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
