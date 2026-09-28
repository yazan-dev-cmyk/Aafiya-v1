'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/auth';
import {
  ShieldAlert,
  RotateCw,
  LogOut,
  HelpCircle
} from 'lucide-react';

interface BookingCenterSuspendedViewProps {
  isDarkMode?: boolean;
}

export const BookingCenterSuspendedView: React.FC<BookingCenterSuspendedViewProps> = ({
  isDarkMode = false
}) => {
  const { user, logout, refreshUser } = useAuth();
  const t = useTranslations('bookingCenter.suspended');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Main Card */}
        <div className={`${containerBg} rounded-3xl p-6 sm:p-8 border transition-all`}>
          
          {/* Header Badge & Icon */}
          <div className="flex items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shadow-xs">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  {t('badge')}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="py-6 space-y-4">
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
              {t('message', { name: user?.name || '' })}
            </p>
            
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed">
              <p>{t('description')}</p>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('checking') : t('checkStatus')}
            </button>

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
