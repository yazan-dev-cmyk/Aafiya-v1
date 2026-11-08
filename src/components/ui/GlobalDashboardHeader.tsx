'use client';

import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  Building2,
  Stethoscope,
  FlaskConical,
  Scan,
  ShieldCheck,
  Headphones,
  ChevronLeft,
  Crown
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '../../i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../auth/AuthProvider';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { PublicAdsTicker } from '../ticker/PublicAdsTicker';
import { AdminMultiTickerStack } from '../ticker/AdminMultiTickerStack';

export interface GlobalDashboardHeaderProps {
  user?: any;
  onToggleMobileSidebar?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onBackToMain?: () => void;
  onBackToMainPlatform?: () => void;
  onLogout?: () => void;
  headerActions?: React.ReactNode;
  pageTitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const GlobalDashboardHeader: React.FC<GlobalDashboardHeaderProps> = ({
  user: userProp,
  onToggleMobileSidebar,
  isDarkMode: isDarkModeProp,
  onToggleDarkMode: onToggleDarkModeProp,
  onBackToMain,
  onBackToMainPlatform,
  onLogout,
  headerActions,
  pageTitle,
  icon,
  className
}) => {
  const { user: authUser, logout } = useAuth();
  const user = userProp !== undefined ? userProp : authUser;
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [internalDarkMode, setInternalDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      setInternalDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const isDarkMode = isDarkModeProp !== undefined ? isDarkModeProp : internalDarkMode;
  const handleToggleDarkMode = () => {
    if (onToggleDarkModeProp) {
      onToggleDarkModeProp();
    } else if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.toggle('dark');
      setInternalDarkMode(isDark);
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      } catch {}
    }
  };

  const changeLanguage = (newLocale: string) => {
    const qs = searchParams ? searchParams.toString() : '';
    const fullPath = qs ? `${pathname}?${qs}` : pathname;
    router.replace(fullPath, { locale: newLocale as any });
  };

  const handleLogout = async () => {
    if (onLogout) {
      try {
        await onLogout();
      } catch (e) {
        console.warn('Logout callback failed', e);
      }
      return;
    }
    try {
      await logout();
    } catch (e) {
      console.warn('Logout request completed with local cleanup', e);
    } finally {
      window.location.replace(`/${locale}`);
    }
  };

  const handleBackNavigation = onBackToMain || onBackToMainPlatform;

  // Determine Primary Role
  const roles = user?.roles || [];
  const isDoctor = roles.includes('doctor');
  const isAssistant = roles.includes('assistant') || roles.includes('doctor_assistant');
  const isPatient = roles.includes('patient') || roles.includes('patient_registered') || roles.includes('patient_guest');
  const isBookingCenter = roles.includes('booking_center');
  const isBookingCenterStaff = roles.includes('booking_center_staff');
  const isLab = roles.includes('lab') || roles.includes('laboratory');
  const isLabAssistant = roles.includes('lab_assistant');
  const isRadiology = roles.includes('radiology');
  const isRadAssistant = roles.includes('rad_assistant') || roles.includes('radiology_assistant');
  const isPlatformAdmin = (roles.includes('admin') || roles.includes('super_admin')) && !roles.includes('admin_assistant');
  const isAdminAssistant = roles.includes('admin_assistant');

  // Role Human Title
  const getRoleLabel = () => {
    if (isPlatformAdmin) return t('header.roles.platformAdmin');
    if (isDoctor) {
      const isDirector = user?.clinic?.is_director || user?.active_clinic?.is_director;
      return isDirector ? t('header.roles.doctorDirector') : t('header.roles.doctor');
    }
    if (isAssistant) return t('header.roles.doctorAssistant');
    if (isPatient) return t('header.roles.patient');
    if (isBookingCenter) return t('header.roles.bookingCenter');
    if (isBookingCenterStaff) return t('header.roles.bookingCenterStaff');
    if (isLab) return t('header.roles.labManager');
    if (isLabAssistant) return t('header.roles.labAssistant');
    if (isRadiology) return t('header.roles.radManager');
    if (isRadAssistant) return t('header.roles.radAssistant');
    if (isAdminAssistant) return t('header.roles.adminAssistant');
    return t('header.roles.patient');
  };

  // Safe Display Name
  const cleanUserName = user?.name?.trim() || '';
  const displayGreeting = () => {
    if (isPlatformAdmin) {
      return cleanUserName
        ? t('header.welcomeBack', { name: cleanUserName })
        : t('header.welcome');
    }
    if (!cleanUserName) return t('header.welcome');
    if (isDoctor) {
      const hasDrPrefix = cleanUserName.startsWith('د.') || cleanUserName.toLowerCase().startsWith('dr');
      return hasDrPrefix
        ? t('header.welcomeWithName', { name: cleanUserName })
        : t('header.welcomeDoctor', { name: cleanUserName });
    }
    return t('header.welcomeWithName', { name: cleanUserName });
  };

  // Specialty (Doctor only)
  const medicalSpecialty = isDoctor ? (user?.doctor?.specialty || null) : null;

  // Professional Context Facility Resolution (Hidden for Patient)
  const getFacilityContext = () => {
    if (isPatient) return null;

    if (isDoctor || isAssistant) {
      const clinicName = user?.active_clinic?.name || user?.clinic?.name;
      if (!clinicName) return null;
      return {
        name: clinicName,
        icon: Building2,
        type: t('header.context.clinic'),
        isLive: true
      };
    }

    if (isLab || isLabAssistant) {
      const labName = user?.diagnostic_staff?.center?.name || user?.managed_diagnostic_center?.name;
      return {
        name: labName || t('header.context.laboratory'),
        icon: FlaskConical,
        type: t('header.context.laboratory'),
        isLive: true
      };
    }

    if (isRadiology || isRadAssistant) {
      const radName = user?.diagnostic_staff?.center?.name || user?.managed_diagnostic_center?.name;
      return {
        name: radName || t('header.context.radiology'),
        icon: Scan,
        type: t('header.context.radiology'),
        isLive: true
      };
    }

    if (isBookingCenter || isBookingCenterStaff) {
      const bcName = user?.booking_center?.name;
      return {
        name: bcName || t('header.context.bookingCenter'),
        icon: Headphones,
        type: t('header.context.bookingCenter'),
        isLive: true
      };
    }

    if (isPlatformAdmin || isAdminAssistant) {
      return {
        name: t('header.context.centralOperations'),
        icon: ShieldCheck,
        type: isPlatformAdmin ? t('header.roles.platformAdmin') : t('header.roles.adminAssistant'),
        isLive: false
      };
    }

    return null;
  };

  const facilityContext = getFacilityContext();
  const FacilityIcon = facilityContext?.icon;

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      <header
        className={cn(
          "backdrop-blur-md border-b transition-all duration-200 select-none",
          isDarkMode
            ? "bg-slate-900/95 border-slate-800 text-slate-100 shadow-sm shadow-slate-950/40"
            : "bg-white/95 border-slate-200/90 text-slate-800 shadow-xs",
          className
        )}
      >
      <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* =================================================================== */}
        {/* REGION 1: PLATFORM BRAND & MOBILE TRIGGER */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className={cn(
                "lg:hidden p-2 rounded-xl border transition-all cursor-pointer shrink-0",
                isDarkMode
                  ? "text-slate-300 hover:text-white bg-slate-800/80 border-slate-700 hover:bg-slate-700"
                  : "text-slate-700 hover:text-primary bg-slate-100 border-slate-200 hover:bg-slate-200/70"
              )}
              aria-label={t('header.menuToggle')}
              title={t('header.menuToggle')}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Platform Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/logo/Aafiya_Logo_No_Tagline.png"
              alt="AAFIYA"
              className="h-8 sm:h-8.5 w-auto object-contain shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo/aafiya_emblem.png')) {
                  target.src = '/logo/aafiya_emblem.png';
                }
              }}
            />
          </div>

          {/* Divider between brand & user identity */}
          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
        </div>

        {/* =================================================================== */}
        {/* REGION 2: USER WELCOME & ROLE IDENTITY */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 justify-start">
          {/* Subtle Premium Gold Accent Bar (Platform Admin only) */}
          {isPlatformAdmin && (
            <div
              className="w-0.5 h-7 rounded-full bg-amber-500/70 dark:bg-amber-400/60 shrink-0"
              aria-hidden="true"
            />
          )}

          <div className="min-w-0 space-y-0.5">
            {/* Greeting + Role Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className={cn(
                "text-xs sm:text-sm font-bold truncate leading-tight tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                {displayGreeting()}
              </h2>

              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 transition-colors",
                isPlatformAdmin
                  ? "bg-amber-500/10 text-amber-900 border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 shadow-2xs"
                  : isDoctor
                  ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
                  : isAssistant
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  : isPatient
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                  : isAdminAssistant
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              )}>
                {isPlatformAdmin && (
                  <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                )}
                <span>{getRoleLabel()}</span>
              </span>

              {/* Medical Specialty Badge (Doctor only) */}
              {medicalSpecialty && (
                <span className={cn(
                  "hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0",
                  isDarkMode
                    ? "bg-slate-800/80 text-teal-300 border-slate-700"
                    : "bg-teal-50/70 text-teal-800 border-teal-100"
                )}>
                  <Stethoscope className="w-3 h-3 text-teal-500" />
                  <span className="truncate max-w-[140px]">{medicalSpecialty}</span>
                </span>
              )}
            </div>

            {/* Platform Admin Executive Subtitle or Optional Page Subtitle */}
            {isPlatformAdmin ? (
              <p className={cn(
                "text-[10px] sm:text-[11px] font-medium truncate",
                isDarkMode ? "text-amber-300/80" : "text-amber-800/80"
              )}>
                {t('header.adminSubtitle')}
              </p>
            ) : pageTitle ? (
              <p className={cn(
                "text-[11px] truncate hidden md:block",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                {pageTitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* =================================================================== */}
        {/* REGION 3: PROFESSIONAL CONTEXT (FACILITY / CLINIC / CENTER) */}
        {/* =================================================================== */}
        {facilityContext && FacilityIcon && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 shrink-0 max-w-xs">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              isDarkMode ? "bg-slate-700 text-teal-300" : "bg-white text-teal-700 shadow-2xs border border-slate-200/60"
            )}>
              <FacilityIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-start">
              <div className="flex items-center gap-1.5 leading-none">
                <span className={cn(
                  "text-xs font-bold truncate block max-w-[170px]",
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                )}>
                  {facilityContext.name}
                </span>
                {facilityContext.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5 font-medium">
                {facilityContext.type}
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* REGION 4: UTILITIES & ACTIONS */}
        {/* =================================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Custom Header Actions */}
          {headerActions}

          {/* Language Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { code: 'ar', label: 'ع' },
              { code: 'fr', label: 'FR' },
              { code: 'en', label: 'EN' }
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer",
                  locale === lang.code
                    ? "bg-primary text-white shadow-xs"
                    : isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-slate-700/60"
                    : "text-slate-600 hover:text-primary hover:bg-white"
                )}
                aria-label={`Switch language to ${lang.label}`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={handleToggleDarkMode}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0",
              isDarkMode
                ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/90"
            )}
            title={t('toggleMode')}
            aria-label={t('toggleMode')}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Back to Platform Button (optional) */}
          {handleBackNavigation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackNavigation}
              className={cn(
                "hidden md:inline-flex font-bold text-xs rounded-xl shadow-2xs transition-all",
                isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              )}
              icon={<ChevronLeft className={cn("w-3.5 h-3.5", !isRtl && "rotate-180")} />}
            >
              <span className="hidden lg:inline">{t('platform')}</span>
            </Button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "p-2 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
              "text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/30"
            )}
            title={t('header.logout')}
            aria-label={t('header.logout')}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.logout')}</span>
          </button>

        </div>

      </div>
    </header>
    {(isPlatformAdmin || isAdminAssistant) ? (
      <AdminMultiTickerStack />
    ) : (
      <PublicAdsTicker embedded={true} />
    )}
  </div>
);
};
