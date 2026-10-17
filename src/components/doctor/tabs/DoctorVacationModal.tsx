import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Building,
  ShieldCheck,
  Info
} from 'lucide-react';
import { vacationService, RegisterVacationPayload } from '@/services/vacationService';

interface DoctorVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  affiliatedClinics?: Array<{ id: string; name: string }>;
  isDarkMode?: boolean;
}

export const DoctorVacationModal: React.FC<DoctorVacationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  affiliatedClinics = [],
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClinicToggle = (clinicId: string) => {
    setSelectedClinicIds((prev) =>
      prev.includes(clinicId) ? prev.filter((id) => id !== clinicId) : [...prev, clinicId]
    );
  };

  const handleSelectAllClinics = () => {
    if (selectedClinicIds.length === affiliatedClinics.length) {
      setSelectedClinicIds([]);
    } else {
      setSelectedClinicIds(affiliatedClinics.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!startDate || !endDate) {
      setErrorMessage(
        isRtl ? 'يرجى تحديد تاريخ بداية ونهاية الإجازة.' : 'Please select both start and end dates.'
      );
      return;
    }

    if (endDate < startDate) {
      setErrorMessage(
        isRtl
          ? 'تاريخ نهاية الإجازة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.'
          : 'End date must be on or after start date.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RegisterVacationPayload = {
        vacation_start: startDate,
        vacation_end: endDate,
        clinic_ids: selectedClinicIds.length > 0 ? selectedClinicIds : undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await vacationService.registerVacation(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to register vacation:', err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.vacation_start?.[0] ||
        err?.response?.data?.errors?.vacation_end?.[0] ||
        err?.message ||
        (isRtl ? 'تعذر تسجيل الإجازة. يرجى التحقق من صحة البيانات.' : 'Failed to register vacation.');
      setErrorMessage(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalBg = isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className={`${modalBg} w-full max-w-xl rounded-3xl border p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isRtl ? 'تسجيل إجازة / عطلة طبية رسمية' : 'Register Official Medical Vacation'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRtl
                  ? 'تسري فورياً وتطلق إعادة جدولة تلقائية للمواعيد المتأثرة (DEC-VAC-01)'
                  : 'Takes effect immediately and triggers automated rescheduling (DEC-VAC-01)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Policy Banner */}
        <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isRtl
              ? 'تسجيل الإجازة يُلتقط فورياً دون الحاجة لموافقة المدير. سيقوم المحرك بنقل المواعيد القائمة إلى فترات بديلة أو تحويلها للمتابعة اليدوية (Option B) في حال تعذر الترحيل.'
              : 'Vacation registration is effective immediately without director veto. The system automatically relocates affected appointments or flags them for manual staff follow-up.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {isRtl ? 'تاريخ بداية الإجازة' : 'Vacation Start Date'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {isRtl ? 'تاريخ نهاية الإجازة' : 'Vacation End Date'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Clinics Selection (Optional filter: empty = all affiliated clinics snapshot) */}
          {affiliatedClinics.length > 0 && (
            <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold block text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>{isRtl ? 'نطاق العيادات المشمولة' : 'Scope of Clinics'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllClinics}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  {selectedClinicIds.length === affiliatedClinics.length
                    ? (isRtl ? 'إلغاء تحديد الكل' : 'Deselect All')
                    : (isRtl ? 'تحديد كافة العيادات' : 'Select All')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {affiliatedClinics.map((clinic) => {
                  const isChecked = selectedClinicIds.includes(clinic.id);
                  return (
                    <label
                      key={clinic.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-teal-500/50 bg-teal-500/5 text-teal-900 dark:text-teal-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleClinicToggle(clinic.id)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="truncate">{clinic.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                {isRtl
                  ? 'إذا تركت بدون تحديد عيادات مخصصة، سيتم شمل كافة عيادات الطبيب المنتسبة تلقائياً.'
                  : 'If left unselected, all affiliated clinics will be snapshotted automatically.'}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="font-bold block text-slate-700 dark:text-slate-300">
              {isRtl ? 'سبب الإجازة (اختياري)' : 'Reason (Optional)'}
            </label>
            <input
              type="text"
              maxLength={255}
              placeholder={isRtl ? 'مثال: إجازة سنوية، مشاركة في مؤتمر طبي...' : 'e.g. Annual Leave, Medical Conference...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold block text-slate-700 dark:text-slate-300">
              {isRtl ? 'ملاحظات إضافية' : 'Internal Notes'}
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder={isRtl ? 'أي توجيهات لفريق الاستقبال...' : 'Any guidance for clinic reception staff...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isSubmitting ? (isRtl ? 'جاري التسجيل...' : 'Registering...') : (isRtl ? 'تأكيد وتسجيل الإجازة' : 'Confirm Vacation')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
