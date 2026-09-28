'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/auth';
import { api } from '@/lib/api';
import {
  XCircle,
  RotateCw,
  LogOut,
  Building,
  FileCheck,
  Send,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface BookingCenterRejectedViewProps {
  isDarkMode?: boolean;
  rejectionReason?: string | null;
}

export const BookingCenterRejectedView: React.FC<BookingCenterRejectedViewProps> = ({
  isDarkMode = false,
  rejectionReason
}) => {
  const { user, logout, refreshUser } = useAuth();
  const t = useTranslations('bookingCenter.rejected');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [commercialRegister, setCommercialRegister] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const center = user?.booking_center;

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload: Record<string, string> = {};
      if (commercialRegister.trim()) payload.commercial_register = commercialRegister.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (address.trim()) payload.address = address.trim();

      await api.post('/booking-centers/resubmit', payload);

      setFeedback({
        type: 'success',
        message: isRtl ? 'تم إعادة إرسال طلبكم بنجاح وهو الآن قيد المراجعة مجدداً.' : 'Your application has been resubmitted for review.'
      });

      if (refreshUser) {
        await refreshUser();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء إعادة إرسال الطلب.' : 'Failed to resubmit application.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-sm';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Main Card */}
        <div className={`${containerBg} rounded-3xl p-6 sm:p-8 border transition-all`}>
          
          {/* Header Badge & Icon */}
          <div className="flex items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold shadow-xs">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                  {t('badge')}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>

          {/* Rejection Details */}
          <div className="py-6 space-y-4">
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
              {t('message', { name: user?.name || center?.name || '' })}
            </p>
            
            {/* Rejection Reason Box */}
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs sm:text-sm leading-relaxed space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{t('reasonTitle')}:</p>
                  <p className="text-rose-800 dark:text-rose-300 text-sm font-semibold bg-white/70 dark:bg-slate-900/50 p-3 rounded-xl border border-rose-200/60 dark:border-rose-500/20">
                    {rejectionReason || center?.rejection_reason || t('defaultReason')}
                  </p>
                </div>
              </div>
            </div>

            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedback.message}
              </div>
            )}

            {/* Resubmit Form Toggle */}
            {!showResubmitForm ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitForm(true)}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {t('resubmitButton')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {t('resubmitFormTitle')}
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('newCommercialRegister')}
                  </label>
                  <input
                    type="text"
                    value={commercialRegister}
                    onChange={(e) => setCommercialRegister(e.target.value)}
                    placeholder={center?.commercial_register || 'RC-16/00-XXXXXXX'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('phone')}
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={center?.phone || '+213...'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('address')}
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={center?.address || 'العنوان'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResubmitForm(false)}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                    {isSubmitting ? t('submitting') : t('submitResubmission')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>

        </div>

        {/* Support Help Card */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>{t('contactSupport')}</span>
          <a href="mailto:support@aafiya.dz" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            support@aafiya.dz
          </a>
        </div>

      </div>
    </div>
  );
};
