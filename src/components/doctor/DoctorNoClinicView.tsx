'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Building2,
  Mail,
  RotateCw,
  LogOut,
  ShieldAlert,
  Stethoscope,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/auth';
import { DoctorInvitationsModal } from './invitations/DoctorInvitationsModal';

interface DoctorNoClinicViewProps {
  onBackToMain?: () => void;
  isDarkMode?: boolean;
}

export const DoctorNoClinicView: React.FC<DoctorNoClinicViewProps> = ({
  onBackToMain,
  isDarkMode = false,
}) => {
  const { user, refreshUser, logout } = useAuth();
  const t = useTranslations('doctor.noClinic');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.replace(`/${locale}`);
    }
  };

  const containerBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-md';

  const cardBg = isDarkMode
    ? 'bg-slate-950 border-slate-800'
    : 'bg-slate-50 border-slate-200/70';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-xl w-full space-y-6">
        <div className={`${containerBg} rounded-3xl p-6 sm:p-10 border text-center space-y-6 transition-all`}>
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {t('title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              {t('description')}
            </p>
          </div>

          {/* Doctor Identity Snapshot */}
          <div className={`${cardBg} rounded-2xl p-4 border text-start space-y-2`}>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Stethoscope className="w-4 h-4 text-teal-500 shrink-0" />
              <span>{user?.name}</span>
              {user?.doctor?.specialty && (
                <span className="text-slate-400 font-normal">({user.doctor.specialty})</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{user?.email}</span>
              {user?.doctor?.license_number && (
                <span>• {user.doctor.license_number}</span>
              )}
            </div>
          </div>

          {/* Primary Action: Invitations */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsInvitationsOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{t('openInvitationsBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t('refreshBtn')}</span>
            </button>
          </div>

          {/* Secondary Action: Logout */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            {onBackToMain ? (
              <button
                type="button"
                onClick={onBackToMain}
                className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
              >
                {isRtl ? 'العودة للمنصة' : 'Back to Platform'}
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('logoutBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invitations Modal */}
      <DoctorInvitationsModal
        isOpen={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
        onInvitationAccepted={async () => {
          await handleRefresh();
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
