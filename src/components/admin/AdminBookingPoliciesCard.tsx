'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Save, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { adminService } from '@/services/adminService';

interface AdminBookingPoliciesCardProps {
  isRtl?: boolean;
}

export const AdminBookingPoliciesCard: React.FC<AdminBookingPoliciesCardProps> = ({ isRtl = true }) => {
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState<number>(24);
  const [maxDailyPerPatient, setMaxDailyPerPatient] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    adminService.getBookingPolicies()
      .then((res) => {
        if (isMounted && res.data) {
          setCancellationCutoffHours(res.data.cancellation_cutoff_hours);
          setMaxDailyPerPatient(res.data.max_daily_bookings_per_patient);
        }
      })
      .catch((err) => {
        console.error('Failed to load admin booking policies:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cutoff = Number(cancellationCutoffHours);
    const daily = Number(maxDailyPerPatient);

    if (!Number.isInteger(cutoff) || cutoff <= 0) {
      setFeedback({
        type: 'error',
        message: isRtl
          ? 'يرجى إدخال مهلة إلغاء صحيحة أكبر من الصفر (بالساعات).'
          : 'Please enter a valid cancellation cutoff greater than zero (in hours).',
      });
      return;
    }

    if (!Number.isInteger(daily) || daily <= 0) {
      setFeedback({
        type: 'error',
        message: isRtl
          ? 'يرجى إدخال حد أقصى صحيح للحجوزات اليومية (1 على الأقل).'
          : 'Please enter a valid daily booking limit (at least 1).',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await adminService.updateBookingPolicies({
        cancellation_cutoff_hours: cutoff,
        max_daily_bookings_per_patient: daily,
      });

      if (res.data) {
        setCancellationCutoffHours(res.data.cancellation_cutoff_hours);
        setMaxDailyPerPatient(res.data.max_daily_bookings_per_patient);
      }

      setFeedback({
        type: 'success',
        message: isRtl
          ? 'تم حفظ وتحديث سياسات الحجز المركزية للمنصة بنجاح!'
          : 'Central platform booking policies successfully updated!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          (isRtl ? 'حدث خطأ أثناء حفظ السياسات المركزية.' : 'An error occurred while saving policies.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            <span>{isRtl ? 'سياسات الحجز والإلغاء المركزية (Platform Booking Policies)' : 'Central Booking Policies'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'تحديد السياسات العامة للمنصة التي يتم تعميمها على مراكز الحجز والمرضى'
              : 'Configure central platform rules propagated across booking centers and patients'}
          </p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          {isRtl ? 'صلاحية المشرف العام' : 'Platform Admin Authority'}
        </span>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs font-bold">
        <div>
          <label className="block text-slate-700 mb-1">
            {isRtl ? '1. الحد الأقصى للإلغاء المسموح قبل الموعد (بالساعات)' : '1. Cancellation Cutoff Lead Time (Hours)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              required
              disabled={isLoading || isSaving}
              value={cancellationCutoffHours}
              onChange={(e) => setCancellationCutoffHours(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-teal-500 disabled:opacity-60"
            />
            <span className="text-slate-500 font-medium shrink-0">{isRtl ? 'ساعة' : 'hrs'}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">
            {isRtl
              ? 'يسمح للمريض بالإلغاء الاستردادي للموعد حتى هذه المهلة قبل توقيت الحجز (القيمة الافتراضية: 24 ساعة).'
              : 'Allows refundable cancellation up until this lead time prior to appointment (Default: 24 hours).'}
          </span>
        </div>

        <div>
          <label className="block text-slate-700 mb-1">
            {isRtl ? '2. أقصى عدد حجوزات مسموح للمريض الواحد في نفس اليوم' : '2. Max Daily Bookings Per Patient'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              required
              disabled={isLoading || isSaving}
              value={maxDailyPerPatient}
              onChange={(e) => setMaxDailyPerPatient(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-teal-500 disabled:opacity-60"
            />
            <span className="text-slate-500 font-medium shrink-0">{isRtl ? 'حجوزات' : 'bookings'}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-normal">
            {isRtl
              ? 'الحد اليومي لتفادي حجز المواعيد المكررة أو العشوائية لنفس المريض (القيمة الافتراضية: 5 حجوزات).'
              : 'Daily quota to prevent duplicate or abusive bookings per patient (Default: 5 bookings).'}
          </span>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-2 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? (isRtl ? 'جارٍ الحفظ...' : 'Saving...') : (isRtl ? 'حفظ السياسات المركزية' : 'Save Policies')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
