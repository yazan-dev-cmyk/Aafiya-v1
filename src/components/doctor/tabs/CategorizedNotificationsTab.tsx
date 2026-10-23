import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Stethoscope, Building, Cpu, CheckCircle2, Phone, Calendar, Clock, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { clinicNotificationService, ClinicEscalationItem } from '@/services/clinicNotificationService';

interface CategorizedNotificationsTabProps {
  isDarkMode?: boolean;
  clinicId?: string;
}

export const CategorizedNotificationsTab: React.FC<CategorizedNotificationsTabProps> = ({
  isDarkMode = false,
  clinicId,
}) => {
  const t = useTranslations('doctor.notifications');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [activeCategory, setActiveCategory] = useState<'urgent' | 'clinical' | 'administrative' | 'system'>('urgent');
  const [escalations, setEscalations] = useState<ClinicEscalationItem[]>([]);
  const [isLoadingEscalations, setIsLoadingEscalations] = useState<boolean>(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEscalations = async () => {
      setIsLoadingEscalations(true);
      try {
        const data = await clinicNotificationService.getEscalations(clinicId, 'pending');
        if (isMounted) {
          setEscalations(data);
        }
      } catch (err) {
        console.warn('Failed to load clinic escalations:', err);
      } finally {
        if (isMounted) setIsLoadingEscalations(false);
      }
    };

    fetchEscalations();
    return () => {
      isMounted = false;
    };
  }, [clinicId]);

  const handleAcknowledgeEscalation = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await clinicNotificationService.acknowledgeEscalation(id, clinicId);
      setEscalations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge escalation:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const staticNotifications = [
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

  const filteredStatic = staticNotifications.filter((n) => n.category === activeCategory);

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
        {escalations.length > 0 && (
          <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>{isRtl ? `${escalations.length} تصعيد عاجل يتطلب المتابعة` : `${escalations.length} urgent escalations`}</span>
          </span>
        )}
      </div>

      <div className={`flex items-center gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'urgent', label: t('categories.urgent'), icon: AlertTriangle, color: 'text-rose-600', badge: escalations.length },
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
              {Boolean(cat.badge) && cat.badge! > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory === 'urgent' && escalations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{isRtl ? 'طابور تصعيدات المواعيد المعلقة (تجاوز مهلة الـ 24 ساعة)' : 'Escalated Unread Appointments Queue (24h SLA Expired)'}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {escalations.map((esc) => (
              <div
                key={esc.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-rose-950/20 border-rose-900/40 text-white'
                    : 'bg-rose-50/60 border-rose-200 text-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-xs font-bold">
                        {isRtl ? 'تصعيد موعد عاجل' : 'Urgent Escalation'}
                      </span>
                      <strong className="text-sm font-black">{esc.patient_name}</strong>
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{esc.patient_phone}</span>
                      </span>
                    </div>

                    <p className="text-xs text-rose-800 font-bold leading-relaxed">
                      {esc.instruction}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                      {esc.original_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{isRtl ? 'الموعد الأصلي:' : 'Original:'} {esc.original_date} ({esc.original_time_slot})</span>
                        </span>
                      )}
                      {esc.new_date && (
                        <span className="flex items-center gap-1 font-bold text-teal-700">
                          <Clock className="w-3 h-3 text-teal-600" />
                          <span>{isRtl ? 'الموعد البديل المقترح:' : 'Replacement:'} {esc.new_date} ({esc.new_slot})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={acknowledgingId === esc.id}
                    onClick={() => handleAcknowledgeEscalation(esc.id)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {acknowledgingId === esc.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جاري الإقرار...' : 'Acknowledging...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isRtl ? 'إقرار المتابعة وإغلاق التصعيد' : 'Acknowledge & Close'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${containerClass} rounded-2xl p-6 border space-y-3`}>
        {filteredStatic.map((item) => (
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
