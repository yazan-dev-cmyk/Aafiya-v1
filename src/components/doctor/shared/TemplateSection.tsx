'use client';

import React from 'react';
import { Sparkles, Bookmark, Plus, LucideIcon } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface Template {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  itemCount?: number;
}

interface TemplateSectionProps {
  title: string;
  subtitle: string;
  templates: Template[];
  onApply: (templateId: string) => void;
  isDarkMode?: boolean;
  accentColor: string;
  icon?: LucideIcon;
}

export const TemplateSection: React.FC<TemplateSectionProps> = ({
  title,
  subtitle,
  templates,
  onApply,
  isDarkMode = false,
  accentColor,
  icon: Icon = Bookmark
}) => {
  const t = useTranslations('doctor.shared');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  return (
    <div className={`${containerClass} rounded-2xl p-6 border space-y-4 ${isRtl ? 'dir-rtl text-right' : 'dir-ltr text-left'}`}>
      <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</span>
        <span className={`text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
          {title}
          <Sparkles className="w-4 h-4 text-amber-600" />
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 transition-all hover:scale-[1.02] ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            } ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}
          >
            <div className={`overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
              {tpl.badge && (
                <span className={`text-[10px] font-mono font-bold block ${accentColor}`}>{tpl.badge}</span>
              )}
              <strong className={`text-xs font-bold block mt-0.5 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={tpl.name}>
                {tpl.name}
              </strong>
              {tpl.itemCount !== undefined && (
                <span className={`text-[10px] block mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                   {t('certifiedItems', { count: tpl.itemCount })}
                </span>
              )}
            </div>
            <button
              onClick={() => onApply(tpl.id)}
              className={`p-2 rounded-lg border cursor-pointer transition-all shrink-0 ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
