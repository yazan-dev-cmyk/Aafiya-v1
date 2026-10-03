'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Button } from './ui/Button';
import { ViewMode, RoleType } from '../types';
import { 
  Activity, 
  Search, 
  LayoutDashboard, 
  LogIn, 
  UserPlus, 
  ChevronDown, 
  Building2, 
  Stethoscope, 
  X, 
  Menu,
  Languages,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '@/auth';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  onOpenSearch,
  onOpenAuth
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const getDashboardUrl = (): string => {
    if (!user) return '/';
    const roles = user.roles || [];
    if (roles.includes('admin')) return '/admin/dashboard';
    if (roles.includes('admin_assistant')) return '/admin/assistant-dashboard';
    if (roles.includes('doctor')) return '/doctor/dashboard';
    if (roles.includes('doctor_assistant')) return '/assistant/dashboard';
    if (roles.includes('patient_registered') || roles.includes('patient_guest') || roles.includes('patient')) return '/patient/dashboard';
    if (roles.includes('booking_center')) return '/booking/dashboard';
    if (roles.includes('lab') || roles.includes('lab_manager')) return '/laboratory/dashboard';
    if (roles.includes('lab_assistant')) return '/laboratory/assistant-dashboard';
    if (roles.includes('radiology') || roles.includes('rad_manager')) return '/radiology/dashboard';
    if (roles.includes('rad_assistant')) return '/radiology/assistant-dashboard';
    return '/';
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#hero', label: t('navigation.home') },
    { href: '#search-directory', label: t('navigation.directory') },
    { href: '#features', label: t('navigation.features') },
    { href: '#benefits', label: t('navigation.benefits') },
    { href: '#workflow', label: t('navigation.workflow') },
    { href: '#packages', label: t('navigation.packages') },
    { href: '#faq', label: t('navigation.faq') },
  ];

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md shadow-lg shadow-slate-900/5 border-b border-slate-100 py-3' 
          : 'bg-slate-50/80 backdrop-blur-sm py-5 border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 xl:gap-8">
          
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img 
              src="/logo/Aafiya_Logo_No_Tagline.png" 
              alt="Aafiya" 
              className="h-10 sm:h-11 md:h-12 w-auto object-contain group-hover:scale-105 transition-transform" 
            />
            <div className="flex flex-col justify-center text-start border-s border-slate-200 ps-2.5 sm:ps-3 transition-opacity">
              <span dir="rtl" className="font-amiri text-xs sm:text-sm font-bold text-slate-800 leading-tight tracking-normal">
                بوابتك إلى العافية
              </span>
              <span dir="ltr" className="font-katex text-[10px] sm:text-[11px] font-medium text-teal-700 leading-tight tracking-tight opacity-90">
                Your Gateway To Aafiya
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-6 shrink-0">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-black text-slate-500 hover:text-primary transition-colors tracking-tight"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-4 shrink-0">
            {/* Search Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
              className="text-slate-400 hover:text-primary"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Language Switcher Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="font-black text-slate-600 flex items-center gap-2"
              >
                <Languages className="w-4 h-4" />
                <span className="uppercase">{locale}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", langDropdownOpen ? 'rotate-180' : '')} />
              </Button>

              {langDropdownOpen && (
                <div 
                  className="absolute mt-3 w-32 bg-white rounded-[20px] shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 end-0"
                  onMouseLeave={() => setLangDropdownOpen(false)}
                >
                  <Link
                    href={pathname}
                    locale="ar"
                    className={cn(
                      "w-full text-start px-4 py-2 text-sm font-black flex items-center justify-between transition-colors",
                      locale === 'ar' ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    العربية
                  </Link>
                  <Link
                    href={pathname}
                    locale="en"
                    className={cn(
                      "w-full text-start px-4 py-2 text-sm font-black flex items-center justify-between transition-colors",
                      locale === 'en' ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    English
                  </Link>
                  <Link
                    href={pathname}
                    locale="fr"
                    className={cn(
                      "w-full text-start px-4 py-2 text-sm font-black flex items-center justify-between transition-colors",
                      locale === 'fr' ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    Français
                  </Link>
                </div>
              )}
            </div>

            {/* Authenticated Dashboard button OR Login & Register Buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={getDashboardUrl()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-xs transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                </Link>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span className="max-w-[110px] truncate">{user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-rose-600 hover:bg-rose-50 font-bold text-xs"
                  title={locale === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <>
                {/* Login Modal Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAuth(undefined, false)}
                  className="font-black text-slate-600"
                >
                  <LogIn className="w-3.5 h-3.5 ms-1.5" />
                  {t('common.login')}
                </Button>

                {/* Role Register Dropdown */}
                <div className="relative">
                  <Button
                    size="md"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="font-black"
                  >
                    <UserPlus className="w-4 h-4 ms-1.5" />
                    {t('common.register')}
                    <ChevronDown className={cn("w-3.5 h-3.5 me-1.5 transition-transform", roleDropdownOpen ? 'rotate-180' : '')} />
                  </Button>

                  {roleDropdownOpen && (
                    <div 
                      className="absolute mt-3 w-64 bg-white rounded-[24px] shadow-2xl border border-slate-100 py-3 z-50 text-start animate-in fade-in slide-in-from-top-2 duration-200 end-0"
                      onMouseLeave={() => setRoleDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">
                        {t('common.register')}
                      </div>
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onOpenAuth('booking_center', true);
                        }}
                        className="w-full text-start px-4 py-3 text-sm font-black text-slate-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                      >
                        <Building2 className="w-5 h-5 opacity-60" />
                        {t('navigation.booking_center_dashboard')}
                      </button>
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onOpenAuth('doctor', true);
                        }}
                        className="w-full text-start px-4 py-3 text-sm font-black text-slate-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                      >
                        <Stethoscope className="w-5 h-5 opacity-60" />
                        {t('navigation.doctor_dashboard')}
                      </button>
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onOpenAuth('patient_registered', true);
                        }}
                        className="w-full text-start px-4 py-3 text-sm font-black text-slate-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors border-t border-slate-50 mt-1"
                      >
                        <Activity className="w-5 h-5 opacity-60" />
                        {t('navigation.patient_dashboard')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
            >
              <Search className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-100 px-6 pt-4 pb-10 space-y-6 shadow-xl animate-in slide-in-from-top-full duration-300">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-black text-slate-700 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            {/* Mobile Language Switcher */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                {t('common.language') || 'Language'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href={pathname}
                  locale="ar"
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-black text-center transition-all",
                    locale === 'ar' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  )}
                >
                  AR
                </Link>
                <Link
                  href={pathname}
                  locale="en"
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-black text-center transition-all",
                    locale === 'en' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  )}
                >
                  EN
                </Link>
                <Link
                  href={pathname}
                  locale="fr"
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-black text-center transition-all",
                    locale === 'fr' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  )}
                >
                  FR
                </Link>
              </div>
            </div>

            {isAuthenticated && user ? (
              <div className="space-y-2">
                <Link
                  href={getDashboardUrl()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl transition-all shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'} ({user.name})</span>
                </Link>
                <Button
                  fullWidth
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-rose-600 font-black"
                >
                  <LogOut className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth(undefined, false);
                  }}
                >
                  {t('common.login')}
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('booking_center', true);
                  }}
                >
                  {t('common.register')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
