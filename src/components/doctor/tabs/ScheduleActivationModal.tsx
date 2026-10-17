import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  X,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { DoctorDayScheduleItem } from '@/services/workingHoursService';

interface ScheduleActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  days: DoctorDayScheduleItem[];
  isDarkMode?: boolean;
}

export const ScheduleActivationModal: React.FC<ScheduleActivationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  days,
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [hasConfirmedIrreversibility, setHasConfirmedIrreversibility] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const dayNames: Record<number, string> = {
    0: t('days.saturday'),
    1: t('days.sunday'),
    2: t('days.monday'),
    3: t('days.tuesday'),
    4: t('days.wednesday'),
    5: t('days.thursday'),
    6: t('days.friday'),
  };

  const totalOpenDays = days.filter((d) => !d.is_closed).length;
  const totalSlots = days.reduce((sum, d) => sum + (d.is_closed ? 0 : d.slots.length), 0);

  const handleActivate = async () => {
    if (!hasConfirmedIrreversibility) return;
    setIsActivating(true);
    setErrorMsg(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Activation failed:', err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          (isRtl
            ? 'فشل تفعيل ساعات العمل الأسبوعية. يرجى مراجعة قيود العيادة.'
            : 'Schedule activation failed.')
      );
    } finally {
      setIsActivating(false);
    }
  };

  const bgModal = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`${bgModal} w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isRtl ? 'المراجعة النهائية والتفعيل النهائي للجدول' : 'Review & Irreversible Schedule Activation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRtl
                  ? 'مراجعة أسبوع العمل وتأكيد قفل ساعات العمل نهائياً'
                  : 'Review weekly schedule and confirm permanent lock'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isActivating}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Severe Irreversibility Warning */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              {isRtl ? 'تحذير أمان صارم: التفعيل نهائي وغير قابل للتعديل' : 'Strict Security Warning: Permanent Action'}
            </span>
          </div>
          <p className="leading-relaxed">
            {isRtl
              ? 'وفق قواعد الإصدار الحالي للمنصة (AAFIYA V1 Frozen Policy): بعد الضغط على "تفعيل وقفل الجدول"، سيتم اعتماد ساعات العمل بصورة نهائية ومغلقة. لا يمكن للطبيب أو مدير العيادة تعديل أي فترة أو إعادة فتح الجدول من خلال هذه الواجهة.'
              : 'Under AAFIYA V1 policy: Once activated, the schedule is permanently locked. You will NOT be able to modify, delete, or reopen the schedule from this interface.'}
          </p>
          <p className="leading-relaxed font-semibold text-rose-800 dark:text-rose-300">
            {isRtl
              ? 'أي تصحيح أو تعديل استثنائي لاحقاً يتطلب إجراءً إدارياً مستقلاً وموافقة صريحة من إدارة المنصة.'
              : 'Any subsequent correction requires a separate administrative procedure with explicit platform authorization.'}
          </p>
        </div>

        {/* Schedule Summary Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>{isRtl ? 'ملخص الجدول الأسبوعي المقترح:' : 'Proposed Weekly Schedule Summary:'}</span>
            </span>
            <span className="font-mono text-slate-500">
              {totalOpenDays} {isRtl ? 'أيام عمل' : 'working days'} • {totalSlots} {isRtl ? 'فترة حجز' : 'slots'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {days.map((d) => (
              <div
                key={d.day_of_week}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  d.is_closed
                    ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    : 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/60 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <strong className="block font-bold">{dayNames[d.day_of_week]}</strong>
                  <span className="text-[10px]">
                    {d.is_closed
                      ? isRtl
                        ? 'عطلة (مغلق)'
                        : 'Closed'
                      : `${d.slots.length} ${isRtl ? 'فترات محددة' : 'slots'}`}
                  </span>
                </div>

                <div className="text-right font-mono text-[10px]">
                  {!d.is_closed && d.slots.length > 0 ? (
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      {d.slots[0]} - {d.slots[d.slots.length - 1]}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mandatory Confirmation Checkbox */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <label className="flex items-start gap-3 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={hasConfirmedIrreversibility}
              onChange={(e) => setHasConfirmedIrreversibility(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
            <span className="leading-relaxed font-bold text-slate-800 dark:text-slate-200">
              {isRtl
                ? 'أقر بأنني راجعت جميع الأيام والفترات أعلاه، وأوافق على تفعيل ساعات العمل وقفل الجدول بصورة نهائية لا تقبل الرجوع أو التعديل في هذا الإصدار.'
                : 'I confirm that I have reviewed the schedule above, and I agree to activate and permanently lock it with no further edits permitted in this version.'}
            </span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isActivating}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            {isRtl ? 'إلغاء والعودة للمسودة' : 'Cancel & Keep Draft'}
          </button>

          <button
            type="button"
            disabled={!hasConfirmedIrreversibility || isActivating}
            onClick={handleActivate}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {isActivating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>
              {isActivating
                ? isRtl
                  ? 'جاري التفعيل والقفل...'
                  : 'Activating...'
                : isRtl
                ? 'تفعيل وقفل الجدول نهائياً'
                : 'Confirm & Permanently Lock'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
