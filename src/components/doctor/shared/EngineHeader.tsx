'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface EngineHeaderProps {
  engineName: string;
  engineSubtitle: string;
  patientName: string;
  patientType: 'registered' | 'guest';
  doctorName?: string;
  specialty?: string;
  icon: LucideIcon;
  iconBgColor: string;
  badgeText: string;
  badgeColor: string;
  isDarkMode?: boolean;
  onAction?: () => void;
  actionText?: string;
  actionIcon?: LucideIcon;
}

export const EngineHeader: React.FC<EngineHeaderProps> = ({
  engineName,
  engineSubtitle,
  patientName,
  patientType,
  doctorName,
  specialty,
  icon: Icon,
  iconBgColor,
  badgeText,
  badgeColor,
  isDarkMode = false,
  onAction,
  actionText,
  actionIcon: ActionIcon
}) => {
  const t = useTranslations('doctor.shared');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const displayDoctorName = doctorName || t('defaultDoctorName');
  const displaySpecialty = specialty || t('defaultSpecialty');

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  return (
    <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all ${isRtl ? 'dir-rtl text-right' : 'dir-ltr text-left'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl ${iconBgColor} text-white flex items-center justify-center font-bold shadow-xs`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${badgeColor}`}>
              {badgeText}
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{engineSubtitle}</span>
          </div>
          <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('patientLabel')} {patientName} ({patientType === 'registered' ? t('registeredEhr') : t('guestPatient')})
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
               {t('doctorLabel')} {displayDoctorName} | {displaySpecialty}
             </span>
          </div>
        </div>
      </div>

      {onAction && actionText && (
        <button
          onClick={onAction}
          className={`px-4 py-2 ${iconBgColor} hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2`}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
