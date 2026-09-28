'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  RotateCw,
  Star
} from 'lucide-react';
import { useAuth } from '@/auth';
import { ClinicAffiliation } from '@/services/authService';
import { DoctorInvitationsModal } from './invitations/DoctorInvitationsModal';

interface DoctorClinicSelectorViewProps {
  onSelectClinic?: (clinic: ClinicAffiliation) => void;
  isDarkMode?: boolean;
}

export const DoctorClinicSelectorView: React.FC<DoctorClinicSelectorViewProps> = ({
  onSelectClinic,
  isDarkMode = false,
}) => {
  const { user, activeClinicId, switchActiveClinic, refreshUser } = useAuth();
  const t = useTranslations('doctor.clinicSelector');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);

  const clinics: ClinicAffiliation[] = user?.clinics || (user?.clinic ? [user.clinic] : []);

  const handleSelect = async (clinic: ClinicAffiliation) => {
    if (clinic.is_active === false) return; // Disallow selecting suspended clinic
    setSelectingId(clinic.id);
    try {
      await switchActiveClinic(clinic.id);
      if (onSelectClinic) {
        onSelectClinic(clinic);
      }
    } finally {
      setSelectingId(null);
    }
  };

  const containerBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-md';

  const cardBg = isDarkMode
    ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
    : 'bg-slate-50/80 border-slate-200/80 hover:border-teal-500/40 hover:shadow-md';

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className={`${containerBg} rounded-3xl p-6 sm:p-8 border space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {t('title')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsInvitationsOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t('viewInvitationsBtn', { count: '' }).replace('()', '').trim()}</span>
          </button>
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {clinics.map((clinic) => {
          const isSelected = clinic.id === activeClinicId;
          const isSuspended = clinic.is_active === false;
          const isDirector = clinic.position === 'director' || clinic.is_director === true;
          const isProcessing = selectingId === clinic.id;

          return (
            <div
              key={clinic.id}
              className={`${cardBg} rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'ring-2 ring-teal-500 border-teal-500/50 bg-teal-50/20 dark:bg-teal-950/20'
                  : isSuspended
                  ? 'opacity-60 bg-slate-100/60 dark:bg-slate-900/50'
                  : ''
              }`}
            >
              {/* Card Top: Badges & Name */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                        isDirector
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {isDirector ? <ShieldCheck className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
                      {isDirector ? t('directorPosition') : t('doctorPosition')}
                    </span>

                    {clinic.is_primary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {t('primaryBadge')}
                      </span>
                    )}
                  </div>

                  <div>
                    {isSuspended ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        {t('statusSuspended')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('statusActive')}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">
                    {clinic.name}
                  </h2>
                  {(clinic.wilaya || clinic.address) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{[clinic.wilaya, clinic.address].filter(Boolean).join(' — ')}</span>
                    </div>
                  )}
                  {clinic.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr">{clinic.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Suspended Alert Warning */}
              {isSuspended && (
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-start gap-2 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('suspendedWarning')}</span>
                </div>
              )}

              {/* Card Bottom: Action Button */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => handleSelect(clinic)}
                  disabled={isSuspended || isProcessing}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isSuspended
                      ? 'opacity-40 bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isSelected
                      ? 'bg-teal-600 text-white shadow-md cursor-pointer hover:bg-teal-700'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer shadow-sm'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{t('enterWorkspace')}...</span>
                    </>
                  ) : isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('enterWorkspace')} ({isRtl ? 'العيادة الحالية' : 'Current'})</span>
                    </>
                  ) : (
                    <>
                      <span>{t('enterWorkspace')}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invitations Modal */}
      <DoctorInvitationsModal
        isOpen={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
        onInvitationAccepted={async () => {
          await refreshUser();
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
