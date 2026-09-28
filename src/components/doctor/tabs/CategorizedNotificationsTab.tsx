import React, { useState } from 'react';
import { Bell, AlertTriangle, Stethoscope, Building, Cpu, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface CategorizedNotificationsTabProps {
  isDarkMode?: boolean;
}

export const CategorizedNotificationsTab: React.FC<CategorizedNotificationsTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.notifications');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [activeCategory, setActiveCategory] = useState<'urgent' | 'clinical' | 'administrative' | 'system'>('urgent');

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const notifications = [
    {
      id: 'n1',
      category: 'urgent',
      title: t('items.n1.title'),
      time: t('items.n1.time'),
      body: t('items.n1.body')
    },
    {
      id: 'n2',
      category: 'clinical',
      title: t('items.n2.title'),
      time: t('items.n2.time'),
      body: t('items.n2.body')
    },
    {
      id: 'n3',
      category: 'administrative',
      title: t('items.n3.title'),
      time: t('items.n3.time'),
      body: t('items.n3.body')
    },
    {
      id: 'n4',
      category: 'system',
      title: t('items.n4.title'),
      time: t('items.n4.time'),
      body: t('items.n4.body')
    }
  ];

  const filtered = notifications.filter((n) => n.category === activeCategory);

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`${containerClass} rounded-2xl p-6 border flex items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            isDarkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-amber-700">{t('subtitle')}</span>
            <h2 className={`text-lg font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'urgent', label: t('categories.urgent'), icon: AlertTriangle, color: 'text-rose-600' },
          { id: 'clinical', label: t('categories.clinical'), icon: Stethoscope, color: 'text-teal-600' },
          { id: 'administrative', label: t('categories.administrative'), icon: Building, color: 'text-blue-600' },
          { id: 'system', label: t('categories.system'), icon: Cpu, color: 'text-slate-600' }
        ].map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`${containerClass} rounded-2xl p-6 border space-y-3`}>
        {filtered.map((item) => (
          <div key={item.id} className={`p-4 rounded-xl border space-y-1 text-xs ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <strong className={`text-sm block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</strong>
              <span className="text-amber-700 font-mono text-[11px] font-bold">{item.time}</span>
            </div>
            <p className={`leading-relaxed pt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
