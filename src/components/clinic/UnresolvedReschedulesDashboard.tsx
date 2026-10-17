import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  AlertTriangle,
  RefreshCw,
  Phone,
  User,
  Calendar,
  Clock,
  Building,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Info
} from 'lucide-react';
import { vacationService, UnresolvedRescheduleItem } from '@/services/vacationService';

interface UnresolvedReschedulesDashboardProps {
  clinicId: string;
  isDarkMode?: boolean;
}

export const UnresolvedReschedulesDashboard: React.FC<UnresolvedReschedulesDashboardProps> = ({
  clinicId,
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [items, setItems] = useState<UnresolvedRescheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadUnresolvedAppointments = useCallback(async () => {
    if (!clinicId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await vacationService.getClinicUnresolvedReschedules(clinicId, 1, 50);
      const rawData = res.data || [];
      const list = Array.isArray(rawData) ? rawData : (rawData as any)?.data || [];
      setItems(list);
    } catch (err: any) {
      console.error('Failed to load unresolved reschedules:', err);
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        (isRtl ? 'تعذر تحميل قائمة الحالات غير المحلولة للعيادة.' : 'Failed to load unresolved reschedules.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, isRtl]);

  useEffect(() => {
    loadUnresolvedAppointments();
  }, [loadUnresolvedAppointments]);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const patName = item.original_appointment?.patient_name?.toLowerCase() || '';
    const mrn = item.original_appointment?.patient_mrn?.toLowerCase() || '';
    const ref = item.original_appointment?.booking_reference?.toLowerCase() || '';
    const docName = item.original_appointment?.doctor?.name?.toLowerCase() || '';
    return patName.includes(q) || mrn.includes(q) || ref.includes(q) || docName.includes(q);
  });

  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs';

  return (
    <div className="space-y-6">
      
      {/* Informative Header & Banner */}
      <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <strong className="font-bold block text-sm">
            {isRtl ? 'لوحة متابعة المواعيد غير المحسومة (Urgent Unresolved Cases — Option B):' : 'Urgent Unresolved Reschedules Dashboard (Option B):'}
          </strong>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            {isRtl
              ? 'تضم هذه اللوحة المواعيد التي تعذر على المحرك الآلي إعادة جدولتها خلال أفق الـ 7 أيام التقويمية أثناء إجازة الطبيب (DEC-VAC-02). تم تحرير الحصة وإشعار المريض للتواصل مع العيادة/مركز الحجز لإعادة الجدولة اليدوية دون رسوم إضافية (DEC-GAP-03).'
              : 'Lists appointments that could not be automatically rescheduled within the 7-calendar-day horizon due to doctor vacation (DEC-VAC-02). The alternative reservation is released, quota returned, and staff must follow up with the patient without additional charge (DEC-GAP-03).'}
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className={`${cardBg} rounded-2xl p-6 border space-y-5`}>
        
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isRtl ? 'قائمة الحالات المعلقة بانتظار التواصل اليدوي' : 'Pending Manual Outreach Cases'}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  {items.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl ? 'حالات تتطلب اتصال فريق الاستقبال بالمريض لترتيب موعد بديل' : 'Appointments requiring reception staff phone outreach'}
              </p>
            </div>
          </div>

          <button
            onClick={loadUnresolvedAppointments}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث باسم المريض، رقم الملف MRN، أو المرجع...' : 'Search by patient name, MRN, or reference...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full p-2.5 rounded-xl border text-xs bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto" />
            <p>{isRtl ? 'جاري تحميل الحالات غير المحسومة...' : 'Loading unresolved cases...'}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="p-8 text-center space-y-2 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isRtl ? 'لا توجد حالات غير محسومة حالياً في هذه العيادة.' : 'No urgent unresolved cases currently registered for this clinic.'}
            </p>
            <p className="text-[11px] text-slate-500">
              {isRtl
                ? 'جميع عمليات إعادة الجدولة الآلية تمت بنجاح أو لم تسجل حالات تعثر تستوجب تدخل الاستقبال.'
                : 'All automated reschedules succeeded or no failed relocations exist.'}
            </p>
          </div>
        )}

        {/* Unresolved Records List */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const orig = item.original_appointment;
              const hasPhone = Boolean(orig?.patient_phone);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  {/* Left Column: Patient & Appointment Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-mono">
                        {isRtl ? 'حالة حرجة غير محسومة' : 'URGENT UNRESOLVED'}
                      </span>
                      {orig?.booking_reference && (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {orig.booking_reference}
                        </span>
                      )}
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">
                        {orig?.patient_name || (isRtl ? 'مريض غير مسمى' : 'Unnamed Patient')}
                      </strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isRtl ? 'الموعد الأصلي:' : 'Original Date:'} <strong>{orig?.appointment_date || '—'}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{orig?.time_slot || '—'}</span>
                      </span>
                      {orig?.doctor?.name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-teal-600" />
                          <span>{orig.doctor.name}</span>
                        </span>
                      )}
                    </div>

                    {item.failure_reason && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                        {isRtl ? 'سبب التعذر:' : 'Failure Reason:'} {item.failure_reason}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Outreach Actions (Phone & Privacy Masking) */}
                  <div className="flex items-center gap-3 shrink-0">
                    {hasPhone ? (
                      <a
                        href={`tel:${orig?.patient_phone}`}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono">{orig?.patient_phone}</span>
                      </a>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-[11px] flex items-center gap-1.5">
                        <Phone className="w-3 h-3 opacity-50" />
                        <span>{isRtl ? 'رقم الهاتف محجوب (صلاحية محدودة)' : 'Phone Masked (No Permission)'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
