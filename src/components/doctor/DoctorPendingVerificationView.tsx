'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/auth';
import {
  ShieldAlert,
  Clock,
  UserCheck,
  Building2,
  FileCheck,
  RotateCw,
  LogOut,
  HelpCircle,
  AlertCircle,
  Stethoscope
} from 'lucide-react';

interface DoctorPendingVerificationViewProps {
  isDarkMode?: boolean;
}

export const DoctorPendingVerificationView: React.FC<DoctorPendingVerificationViewProps> = ({
  isDarkMode = false
}) => {
  const { user, logout, refreshUser } = useAuth();
  const t = useTranslations('doctor.pendingVerification');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshUser) {
        await refreshUser();
      } else {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const containerBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-sm';

  const cardBg = isDarkMode
    ? 'bg-slate-950 border-slate-800'
    : 'bg-slate-50 border-slate-200';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Main Card */}
        <div className={`${containerBg} rounded-3xl p-6 sm:p-8 border transition-all`}>
          
          {/* Header Badge & Icon */}
          <div className="flex items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shadow-xs">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  {t('badge')}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>

          {/* Welcome Message Body */}
          <div className="py-6 space-y-4">
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
              {t('welcome', { name: user?.name || '' })}
            </p>
            
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs sm:text-sm leading-relaxed space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold">{t('description')}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 opacity-90">{t('footnote')}</p>
                </div>
              </div>
            </div>

            {/* Doctor & Clinic Profile Details */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('doctorDetails')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`${cardBg} p-3.5 rounded-xl border flex items-center gap-3`}>
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('doctorName')}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{user?.name || '--'}</strong>
                  </div>
                </div>

                <div className={`${cardBg} p-3.5 rounded-xl border flex items-center gap-3`}>
                  <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('specialty')}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{user?.doctor?.specialty || '--'}</strong>
                  </div>
                </div>

                <div className={`${cardBg} p-3.5 rounded-xl border flex items-center gap-3`}>
                  <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('licenseNumber')}</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">{user?.doctor?.license_number || '--'}</strong>
                  </div>
                </div>

                <div className={`${cardBg} p-3.5 rounded-xl border flex items-center gap-3`}>
                  <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('clinicName')}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{user?.clinic?.name || '--'}</strong>
                  </div>
                </div>

                <div className={`${cardBg} p-3.5 rounded-xl border flex items-center gap-3 sm:col-span-2`}>
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 block">{t('status')}</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                      {t('statusValue')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="border-t pt-6 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t('refreshButton')}</span>
            </button>

            <button
              onClick={logout}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logoutButton')}</span>
            </button>
          </div>

        </div>

        {/* Support Footer Note */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          <span>{t('supportNotice')}</span>
        </p>

      </div>
    </div>
  );
};
