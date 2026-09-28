import React from 'react';
import { cn } from '../../lib/utils';
import { Sidebar, NavItem } from './Sidebar';
import { Menu, Sun, Moon, ChevronLeft, Globe, LogOut } from 'lucide-react';
import { Button } from './Button';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '../../i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../auth/AuthProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
  userName: string;
  userRole: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onBackToMain: () => void;
  sidebarTitle?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navItems,
  activeTab,
  onTabChange,
  title,
  userName,
  userRole,
  isDarkMode,
  onToggleDarkMode,
  onBackToMain,
  sidebarTitle,
  icon,
  headerActions
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuth();

  const changeLanguage = (newLocale: string) => {
    const qs = searchParams ? searchParams.toString() : '';
    const fullPath = qs ? `${pathname}?${qs}` : pathname;
    router.replace(fullPath, { locale: newLocale as any });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout request completed with local cleanup', e);
    } finally {
      window.location.replace(`/${locale}`);
    }
  };

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        "min-h-screen font-sans flex flex-col transition-colors duration-300",
        "text-start",
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      
      {/* Dashboard Header */}
      <header className={cn(
        "sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-6 py-3 flex items-center justify-between transition-all",
        isDarkMode 
          ? "bg-slate-900/95 border-slate-800" 
          : "bg-white/95 border-slate-200 shadow-sm"
      )}>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className={cn(
              "lg:hidden p-2.5 rounded-xl border transition-all",
              isDarkMode 
                ? "text-slate-300 hover:text-white bg-slate-800 border-slate-700" 
                : "text-slate-700 hover:text-primary bg-slate-100 border-slate-200"
            )}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/20 shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono uppercase tracking-tighter",
                  isDarkMode 
                    ? "bg-primary/20 text-primary border-primary/30" 
                    : "bg-primary/5 text-primary border-primary/20"
                )}>
                  Enterprise v1.0
                </span>
                <span className={cn("text-[11px] font-bold hidden sm:inline", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {userName} — {userRole}
                </span>
              </div>
              <h1 className={cn("text-sm sm:text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                {title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {headerActions}
          
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { code: 'ar', label: 'ع' },
              { code: 'fr', label: 'FR' },
              { code: 'en', label: 'EN' }
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all",
                  locale === lang.code
                    ? "bg-primary text-white shadow-sm"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                      : "text-slate-600 hover:text-primary hover:bg-white"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleDarkMode}
            className={cn(
              "p-2.5 rounded-xl border transition-all flex items-center gap-2",
              isDarkMode 
                ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
            )}
            title={t('toggleMode')}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline text-xs font-bold">
              {isDarkMode ? t('lightMode') : t('darkMode')}
            </span>
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={onBackToMain}
            className="font-bold text-xs rounded-xl shadow-lg shadow-primary/20"
            icon={<ChevronLeft className={cn("w-4 h-4", !isRtl && "rotate-180")} />}
          >
            {t('platform')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="font-bold text-xs rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 transition-all border border-rose-200 dark:border-rose-900/40"
            icon={<LogOut className="w-4 h-4" />}
          >
            {isRtl ? 'تسجيل الخروج' : locale === 'fr' ? 'Déconnexion' : 'Logout'}
          </Button>
        </div>
      </header>

      {/* Sidebar + Main Content Container */}
      <div className="flex-1 flex overflow-hidden">
        
        <Sidebar
          items={navItems}
          activeId={activeTab}
          onItemClick={onTabChange}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          title={sidebarTitle}
          isDarkMode={isDarkMode}
        />

        {/* Main Content Scrollable Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
};
