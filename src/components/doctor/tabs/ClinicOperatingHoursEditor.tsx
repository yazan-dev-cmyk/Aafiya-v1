import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Clock,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  Info,
} from 'lucide-react';
import {
  workingHoursService,
  ClinicOperatingDay,
  ClinicOperatingPeriod,
  WEEKDAYS_ORDER,
} from '@/services/workingHoursService';

interface ClinicOperatingHoursEditorProps {
  clinicId: string;
  canManage: boolean;
  isDarkMode?: boolean;
  onConfiguredChange?: (isConfigured: boolean) => void;
}

const DEFAULT_DAYS: ClinicOperatingDay[] = WEEKDAYS_ORDER.map((d) => ({
  day_of_week: d,
  is_closed: d === 0 || d === 6, // Sat & Fri closed by default
  periods:
    d === 0 || d === 6
      ? []
      : [{ period_index: 0, open_time: '08:00', close_time: '17:00' }],
}));

export const ClinicOperatingHoursEditor: React.FC<ClinicOperatingHoursEditorProps> = ({
  clinicId,
  canManage,
  isDarkMode = false,
  onConfiguredChange,
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [days, setDays] = useState<ClinicOperatingDay[]>(DEFAULT_DAYS);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
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

  const loadOperatingHours = async () => {
    if (!clinicId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await workingHoursService.getClinicOperatingHours(clinicId);
      if (res.data?.days && res.data.days.length > 0) {
        // Ensure all 7 days exist in state mapped correctly
        const loadedDaysMap = new Map(res.data.days.map((d) => [d.day_of_week, d]));
        const fullDays: ClinicOperatingDay[] = WEEKDAYS_ORDER.map((d) => {
          const existing = loadedDaysMap.get(d);
          if (existing) {
            return {
              day_of_week: d,
              is_closed: existing.is_closed,
              periods: existing.periods || [],
            };
          }
          return { day_of_week: d, is_closed: true, periods: [] };
        });
        setDays(fullDays);
        setIsConfigured(Boolean(res.data.is_configured));
        onConfiguredChange?.(Boolean(res.data.is_configured));
      } else {
        setIsConfigured(false);
        onConfiguredChange?.(false);
      }
    } catch (err: any) {
      console.error('Failed to load clinic operating hours:', err);
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          (isRtl
            ? 'تعذر تحميل ساعات تشغيل العيادة. يرجى التحقق من الاتصال.'
            : 'Failed to load clinic operating hours.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOperatingHours();
  }, [clinicId]);

  const handleToggleDay = (dayIndex: number) => {
    if (!canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const willBeClosed = !d.is_closed;
          return {
            ...d,
            is_closed: willBeClosed,
            periods: willBeClosed
              ? []
              : d.periods.length > 0
              ? d.periods
              : [{ period_index: 0, open_time: '08:00', close_time: '17:00' }],
          };
        }
        return d;
      })
    );
  };

  const handlePeriodChange = (
    dayIndex: number,
    periodIdx: number,
    field: 'open_time' | 'close_time',
    value: string
  ) => {
    if (!canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const updatedPeriods = [...d.periods];
          if (updatedPeriods[periodIdx]) {
            updatedPeriods[periodIdx] = {
              ...updatedPeriods[periodIdx],
              [field]: value,
            };
          }
          return { ...d, periods: updatedPeriods };
        }
        return d;
      })
    );
  };

  const handleAddPeriod = (dayIndex: number) => {
    if (!canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const newPeriod: ClinicOperatingPeriod = {
            period_index: d.periods.length,
            open_time: '13:00',
            close_time: '17:00',
          };
          return { ...d, periods: [...d.periods, newPeriod] };
        }
        return d;
      })
    );
  };

  const handleRemovePeriod = (dayIndex: number, periodIdx: number) => {
    if (!canManage) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week === dayIndex) {
          const updatedPeriods = d.periods.filter((_, idx) => idx !== periodIdx);
          return {
            ...d,
            periods: updatedPeriods,
            is_closed: updatedPeriods.length === 0 ? true : d.is_closed,
          };
        }
        return d;
      })
    );
  };

  const validatePeriods = (): string | null => {
    for (const d of days) {
      if (!d.is_closed) {
        if (!d.periods || d.periods.length === 0) {
          return isRtl
            ? `يجب تحديد فترة تشغيل واحدة على الأقل لـ ${dayNames[d.day_of_week]} أو تعيينه كيوم عطلة.`
            : `Please specify at least one period for ${dayNames[d.day_of_week]} or mark it closed.`;
        }
        for (const p of d.periods) {
          if (!p.open_time || !p.close_time) {
            return isRtl
              ? `أوقات الفتح والإغلاق مطلوبة لجميع الفترات في ${dayNames[d.day_of_week]}.`
              : `Open and close times are required for ${dayNames[d.day_of_week]}.`;
          }
          if (p.open_time >= p.close_time) {
            return isRtl
              ? `وقت الفتح (${p.open_time}) يجب أن يكون قبل وقت الإغلاق (${p.close_time}) في ${dayNames[d.day_of_week]}.`
              : `Open time (${p.open_time}) must be earlier than close time (${p.close_time}) on ${dayNames[d.day_of_week]}.`;
          }
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!canManage) return;
    const validationErr = validatePeriods();
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await workingHoursService.saveClinicOperatingHours(days, clinicId);
      if (res.data) {
        setIsConfigured(Boolean(res.data.is_configured));
        onConfiguredChange?.(Boolean(res.data.is_configured));
        setSuccessMessage(
          isRtl
            ? 'تم حفظ ساعات تشغيل العيادة بنجاح والتزامن مع النظام.'
            : 'Clinic operating hours saved and synchronized successfully.'
        );
      }
    } catch (err: any) {
      console.error('Failed to save clinic operating hours:', err);
      const apiErrors = err?.errors?.days || err?.errors?.clinic_id;
      const firstError = Array.isArray(apiErrors) ? apiErrors[0] : null;
      setErrorMessage(
        firstError ||
          err?.message ||
          (isRtl
            ? 'تعذر حفظ ساعات تشغيل العيادة. يرجى التحقق من صحة المدخلات.'
            : 'Failed to save clinic operating hours.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const containerClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  if (isLoading) {
    return (
      <div className={`${containerClass} rounded-2xl p-8 border text-center space-y-3`}>
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs text-slate-500 font-bold">
          {isRtl ? 'جاري تحميل ساعات تشغيل العيادة...' : 'Loading clinic operating hours...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className={`${containerClass} rounded-2xl p-6 border shadow-xs space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isRtl ? 'ساعات تشغيل العيادة الأسبوعية' : 'Clinic Weekly Operating Hours'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isConfigured
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {isConfigured
                    ? isRtl
                      ? 'مهيأة ومكتملة (7 أيام)'
                      : 'Fully Configured (7 Days)'
                    : isRtl
                    ? 'غير مكتملة التهيأة'
                    : 'Incomplete / Not Configured'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'يجب تهيئة ساعات تشغيل العيادة لجميع الأيام السبعة لتمكين الأطباء من تفعيل جداولهم واستقبال الحجوزات.'
                  : 'Clinic operating hours must be configured for all 7 days before doctors can activate schedules and accept bookings.'}
              </p>
            </div>
          </div>

          {canManage && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>
                {isSaving
                  ? isRtl
                    ? 'جاري الحفظ والتزامن...'
                    : 'Saving...'
                  : isRtl
                  ? 'حفظ ساعات تشغيل العيادة'
                  : 'Save Operating Hours'}
              </span>
            </button>
          )}
        </div>

        {!isConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">
                {isRtl ? 'تنبيه إلزامي لمنظومة الحجز:' : 'Mandatory Booking System Notice:'}
              </strong>
              <p className="leading-relaxed">
                {isRtl
                  ? 'يُمنع على مستوى المنصة إنشاء أو قبول أي حجز ما لم يتم ضبط ساعات تشغيل العيادة لجميع الأيام السبعة (بما في ذلك تحديد أيام العطلات صراحة).'
                  : 'Platform policy prevents creating new bookings until all 7 days of clinic operating hours are explicitly configured (including designated closed days).'}
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

        {/* Days List Grid */}
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
                      disabled={!canManage}
                      onClick={() => handleToggleDay(d.day_of_week)}
                      className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                        !canManage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
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

                {/* Periods Configuration */}
                <div className="lg:col-span-9">
                  {d.is_closed ? (
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 font-bold text-center">
                      {isRtl ? 'العيادة مغلقة طوال هذا اليوم (عطلة رسمية)' : 'Clinic is closed all day'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {d.periods.map((p, pIdx) => (
                        <div key={pIdx} className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[10px] font-bold text-slate-500">
                              {isRtl ? 'من:' : 'From:'}
                            </span>
                            <input
                              type="time"
                              disabled={!canManage}
                              value={p.open_time}
                              onChange={(e) =>
                                handlePeriodChange(d.day_of_week, pIdx, 'open_time', e.target.value)
                              }
                              className="p-1.5 rounded-lg border font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[10px] font-bold text-slate-500">
                              {isRtl ? 'إلى:' : 'To:'}
                            </span>
                            <input
                              type="time"
                              disabled={!canManage}
                              value={p.close_time}
                              onChange={(e) =>
                                handlePeriodChange(d.day_of_week, pIdx, 'close_time', e.target.value)
                              }
                              className="p-1.5 rounded-lg border font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </div>

                          {canManage && d.periods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePeriod(d.day_of_week, pIdx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title={isRtl ? 'حذف الفترة' : 'Remove period'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleAddPeriod(d.day_of_week)}
                          className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'إضافة فترة تشغيل أخرى (دوام مسائي)' : 'Add another period'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
