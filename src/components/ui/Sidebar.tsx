import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  highlight?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  activeId: string;
  onItemClick: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  title?: string;
  isDarkMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeId,
  onItemClick,
  isMobileOpen,
  onCloseMobile,
  title,
  isDarkMode = false
}) => {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const displayTitle = title || t('mainMenu');

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 z-50 w-72 border-e p-4 flex flex-col transition-all duration-300 ease-in-out start-0",
          isDarkMode 
            ? "bg-slate-900 border-slate-800" 
            : "bg-white border-slate-200 shadow-xl lg:shadow-none",
          isMobileOpen 
            ? "translate-x-0" 
            : isRtl 
              ? "translate-x-full lg:translate-x-0" 
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between mb-6 px-2 lg:hidden">
          <span className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
            {displayTitle}
          </span>
          <button 
            onClick={onCloseMobile}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-[0.2em] px-4 pb-3 mb-2 border-b",
          isDarkMode ? "text-slate-50 border-slate-800" : "text-slate-400 border-slate-100"
        )}>
          {displayTitle}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onItemClick(item.id);
                  onCloseMobile();
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer group relative overflow-hidden",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                    : item.highlight
                    ? isDarkMode 
                      ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                      : "bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10"
                    : isDarkMode 
                      ? "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-primary/70"
                  )} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : isDarkMode 
                          ? "bg-slate-800 text-primary border border-slate-700" 
                          : "bg-primary/10 text-primary border border-primary/10"
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Hover Indicator */}
                {!isActive && (
                  <div className={cn(
                    "absolute top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top start-0"
                  )} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer (Optional) */}
        <div className={cn(
          "mt-auto pt-4 border-t",
          isDarkMode ? "border-slate-800" : "border-slate-100"
        )}>
          <div className={cn(
            "p-4 rounded-2xl bg-gradient-to-br transition-all",
            isDarkMode 
              ? "from-slate-800 to-slate-900 border border-slate-700" 
              : "from-primary/5 to-primary/10 border border-primary/10"
          )}>
            <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDarkMode ? "text-slate-400" : "text-primary/70")}>
              {t('quickStats')}
            </div>
            <div className={cn("text-xs font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
              {t('platformStable')}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
