'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Building2,
  ChevronDown,
  Check,
  ShieldCheck,
  Stethoscope,
  AlertTriangle,
  RotateCw,
  Mail,
  Grid
} from 'lucide-react';
import { useAuth } from '@/auth';
import { ClinicAffiliation } from '@/services/authService';

interface ClinicSwitcherProps {
  onOpenSelector?: () => void;
  onOpenInvitations?: () => void;
  pendingInvitationsCount?: number;
  isDarkMode?: boolean;
}

export const ClinicSwitcher: React.FC<ClinicSwitcherProps> = ({
  onOpenSelector,
  onOpenInvitations,
  pendingInvitationsCount = 0,
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor.clinicSwitcher');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { user, activeClinicId, switchActiveClinic } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const clinics: ClinicAffiliation[] = user?.clinics || (user?.clinic ? [user.clinic] : []);
  const activeClinic = clinics.find((c) => c.id === activeClinicId) || user?.clinic || clinics[0];

  const handleSelectClinic = async (clinic: ClinicAffiliation) => {
    if (clinic.is_active === false) return; // Suspended cannot be selected
    if (clinic.id === activeClinicId) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      await switchActiveClinic(clinic.id);
      setIsOpen(false);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!activeClinic && clinics.length === 0) {
    return null;
  }

  const isCurrentDirector = activeClinic?.position === 'director' || activeClinic?.is_director === true;

  const buttonBg = isDarkMode
    ? 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-white'
    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs';

  const menuBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white shadow-2xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-xl';

  return (
    <div className="relative inline-block" ref={dropdownRef} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Current Active Clinic Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${buttonBg}`}
        title={t('switchWorkspace')}
      >
        <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
        <div className="flex flex-col text-start max-w-[140px] sm:max-w-[200px] truncate">
          <span className="truncate font-black text-xs leading-tight">
            {activeClinic?.name || t('currentWorkspace')}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
            {isCurrentDirector ? t('directorBadge') : t('doctorBadge')}
          </span>
        </div>
        {isSwitching ? (
          <RotateCw className="w-3.5 h-3.5 animate-spin text-teal-500 shrink-0" />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-72 sm:w-80 rounded-2xl border p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${menuBg}`}
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              {t('switchWorkspace')}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {clinics.filter((c) => c.is_active !== false).length} {t('activeBadge')}
            </span>
          </div>

          {/* Clinic Options */}
          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {clinics.map((clinic) => {
              const isSelected = clinic.id === activeClinicId || clinic.id === activeClinic?.id;
              const isSuspended = clinic.is_active === false;
              const isDirector = clinic.position === 'director' || clinic.is_director === true;

              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => handleSelectClinic(clinic)}
                  disabled={isSuspended || isSwitching}
                  className={`w-full text-start p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20'
                      : isSuspended
                      ? 'opacity-50 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/40 text-slate-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
                  }`}
                  title={isSuspended ? t('suspendedCannotSelect') : clinic.name}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-teal-500 text-white'
                          : isSuspended
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDirector ? <ShieldCheck className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-xs">{clinic.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{isDirector ? t('directorBadge') : t('doctorBadge')}</span>
                        {clinic.wilaya && <span>• {clinic.wilaya}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {isSuspended ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        {t('suspendedBadge')}
                      </span>
                    ) : isSelected ? (
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1 space-y-1">
            {onOpenSelector && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSelector();
                }}
                className="w-full text-start p-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Grid className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('allClinics')}</span>
              </button>
            )}

            {onOpenInvitations && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInvitations();
                }}
                className="w-full text-start p-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-teal-500" />
                  <span>{t('invitations')}</span>
                </div>
                {pendingInvitationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingInvitationsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
