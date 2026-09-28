'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, FileText, FlaskConical, Scan } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { ehrService } from '@/services/ehrService';
import { prescriptionService } from '@/services/prescriptionService';
import { diagnosticService } from '@/services/diagnosticService';

interface ClinicalAnalyticsTabProps {
  isDarkMode?: boolean;
}

export const ClinicalAnalyticsTab: React.FC<ClinicalAnalyticsTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.analytics');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState<number>(0);
  const [labOrdersCount, setLabOrdersCount] = useState<number>(0);
  const [radOrdersCount, setRadOrdersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [patRes, rxRes, labRes, radRes] = await Promise.allSettled([
          ehrService.getPatients(),
          prescriptionService.getPrescriptions(),
          diagnosticService.getOrders({ order_type: 'laboratory' }),
          diagnosticService.getOrders({ order_type: 'radiology' })
        ]);

        if (isMounted) {
          if (patRes.status === 'fulfilled' && patRes.value.data && Array.isArray(patRes.value.data)) {
            setPatientsCount(patRes.value.data.length);
          }
          if (rxRes.status === 'fulfilled' && rxRes.value.data && Array.isArray(rxRes.value.data)) {
            setPrescriptionsCount(rxRes.value.data.length);
          }
          if (labRes.status === 'fulfilled' && labRes.value.data && Array.isArray(labRes.value.data)) {
            setLabOrdersCount(labRes.value.data.length);
          }
          if (radRes.status === 'fulfilled' && radRes.value.data && Array.isArray(radRes.value.data)) {
            setRadOrdersCount(radRes.value.data.length);
          }
        }
      } catch (err) {
        console.warn('Failed to load clinical analytics:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`${containerClass} rounded-2xl p-6 border flex items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-amber-600">{t('subtitle')}</span>
            <h2 className={`text-lg font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className={`p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <span className={isDarkMode ? 'text-slate-400 block' : 'text-slate-500 block'}>{t('stats.totalPatients')}</span>
          <strong className={`text-xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('stats.totalPatientsValue', { count: patientsCount })}
          </strong>
        </div>
        <div className={`p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <span className={isDarkMode ? 'text-slate-400 block' : 'text-slate-500 block'}>{t('stats.issuedPrescriptions')}</span>
          <strong className="text-xl font-bold font-mono text-emerald-600">
            {t('stats.issuedPrescriptionsValue', { count: prescriptionsCount })}
          </strong>
        </div>
        <div className={`p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <span className={isDarkMode ? 'text-slate-400 block' : 'text-slate-500 block'}>{t('stats.labOrders')}</span>
          <strong className="text-xl font-bold font-mono text-purple-600">
            {t('stats.labOrdersValue', { count: labOrdersCount })}
          </strong>
        </div>
        <div className={`p-4 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <span className={isDarkMode ? 'text-slate-400 block' : 'text-slate-500 block'}>{t('stats.radiologyOrders')}</span>
          <strong className="text-xl font-bold font-mono text-amber-600">
            {t('stats.radiologyOrdersValue', { count: radOrdersCount })}
          </strong>
        </div>
      </div>
    </div>
  );
};
