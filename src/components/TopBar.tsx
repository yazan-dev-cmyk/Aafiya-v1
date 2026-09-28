'use client';

import React from 'react';
import { Globe, Sparkles, ArrowLeft, LayoutDashboard, FlaskConical, Radio, User, ShieldCheck } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { ViewMode } from '../types';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface TopBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenCalculator: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onViewModeChange,
  onOpenCalculator
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: 'ar' | 'en' | 'fr') => {
    router.replace(pathname, { locale: newLocale });
  };

  const viewModes = [
    { id: 'landing', label: t('navigation.landing'), icon: null },
    { id: 'doctor_dashboard', label: t('navigation.doctor_dashboard'), icon: Sparkles, activeClass: 'bg-amber-400 text-slate-950', inactiveClass: 'bg-amber-500/30 text-amber-200' },
    { id: 'assistant_dashboard', label: t('navigation.assistant_dashboard'), icon: Sparkles, activeClass: 'bg-teal-400 text-slate-950', inactiveClass: 'bg-teal-500/30 text-teal-200' },
    { id: 'booking_center_dashboard', label: t('navigation.booking_center_dashboard'), icon: LayoutDashboard, activeClass: 'bg-emerald-400 text-slate-950', inactiveClass: 'bg-emerald-500/30 text-emerald-200' },
    { id: 'laboratory_dashboard', label: t('navigation.laboratory_dashboard'), icon: FlaskConical, activeClass: 'bg-teal-400 text-slate-950', inactiveClass: 'bg-teal-500/30 text-teal-200' },
    { id: 'lab_assistant_dashboard', label: t('navigation.lab_assistant_dashboard'), icon: FlaskConical, activeClass: 'bg-teal-400 text-slate-950', inactiveClass: 'bg-teal-500/30 text-teal-200' },
    { id: 'patient_dashboard', label: t('navigation.patient_dashboard'), icon: User, activeClass: 'bg-emerald-400 text-slate-950', inactiveClass: 'bg-emerald-500/30 text-emerald-200' },
    { id: 'platform_admin_dashboard', label: t('navigation.platform_admin_dashboard'), icon: ShieldCheck, activeClass: 'bg-amber-400 text-slate-950', inactiveClass: 'bg-amber-500/30 text-amber-200' },
    { id: 'platform_assistant_dashboard', label: t('navigation.platform_assistant_dashboard'), icon: ShieldCheck, activeClass: 'bg-blue-400 text-slate-950', inactiveClass: 'bg-blue-500/30 text-blue-200' },
    { id: 'radiology_dashboard', label: t('navigation.radiology_dashboard'), icon: Radio, activeClass: 'bg-blue-400 text-slate-950', inactiveClass: 'bg-blue-500/30 text-blue-200' },
    { id: 'rad_assistant_dashboard', label: t('navigation.rad_assistant_dashboard'), icon: Radio, activeClass: 'bg-blue-400 text-slate-950', inactiveClass: 'bg-blue-500/30 text-blue-200' },
  ];

  return (
    <div className="bg-primary text-white text-xs py-2 px-4 shadow-sm font-bold tracking-tight">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Highlight text */}
        <div className="flex items-center gap-3">
          <Badge 
            variant="neutral" 
            className="bg-white/20 text-white border-white/25 py-0.5 font-satisfy"
            icon={<Sparkles className="w-3 h-3 text-amber-300" />}
          >
            {t('common.version')}
          </Badge>
          <span className="truncate opacity-90 text-[11px]">
            {t('topbar.announcement')}
          </span>
          <button
            onClick={onOpenCalculator}
            className="hidden md:inline-flex items-center gap-1 text-white/80 hover:text-white underline cursor-pointer transition-colors"
          >
            {t('navigation.calculator')}
            <ArrowLeft className={cn("w-3 h-3", locale === 'en' && "rotate-180")} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
          {/* View Mode Switches */}
          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-xl border border-white/10 shrink-0">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => onViewModeChange(mode.id as ViewMode)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    isActive 
                      ? mode.id === 'landing' ? 'bg-white text-primary shadow-sm' : mode.activeClass
                      : mode.id === 'landing' ? 'text-white/80 hover:text-white' : mode.inactiveClass
                  )}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-black/10 rounded-xl p-1 border border-white/10 shrink-0">
            <Globe className="w-3 h-3 text-white/60 mx-1" />
            {[
              { code: 'ar', label: 'عربي' },
              { code: 'fr', label: 'FR' },
              { code: 'en', label: 'EN' }
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => handleLanguageChange(l.code as any)}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors uppercase",
                  locale === l.code ? 'bg-white text-primary' : 'text-white/80 hover:text-white'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
