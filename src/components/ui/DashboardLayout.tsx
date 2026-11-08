import React from 'react';
import { cn } from '../../lib/utils';
import { Sidebar, NavItem, NavCategory } from './Sidebar';
import { GlobalDashboardHeader } from './GlobalDashboardHeader';
import { useLocale } from 'next-intl';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  navCategories?: NavCategory[];
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
  navCategories,
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
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        "min-h-screen font-sans flex flex-col transition-colors duration-300",
        "text-start",
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Unified Global Dashboard Header */}
      <GlobalDashboardHeader
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onBackToMain={onBackToMain}
        headerActions={headerActions}
        pageTitle={title}
        icon={icon}
      />

      {/* Sidebar + Main Content Container */}
      <div className="flex-1 flex overflow-hidden">
        
        <Sidebar
          items={navItems}
          categories={navCategories}
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
