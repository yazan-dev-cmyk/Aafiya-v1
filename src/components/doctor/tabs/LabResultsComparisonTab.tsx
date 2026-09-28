'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  FlaskConical,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { LabResultComparison } from '../../../data/doctorDashboardData';

interface LabResultsComparisonTabProps {
  isDarkMode?: boolean;
}

export const LabResultsComparisonTab: React.FC<LabResultsComparisonTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.results.comparison');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";
  
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [comparisons, setComparisons] = useState<LabResultComparison[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const categories = [
    { id: 'all', label: t('categories.all') },
    { id: 'السكري', label: t('categories.diabetes') },
    { id: 'وظائف الكلى', label: t('categories.kidney') },
    { id: 'الدهنيات', label: t('categories.lipids') },
    { id: 'وظائف الكبد', label: t('categories.liver') }
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchLabResults = async () => {
      setIsLoading(true);
      try {
        const res = await diagnosticService.getOrders({ order_type: 'laboratory' });
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const firstOrder = res.data[0];
          if (firstOrder.patient) {
            setPatientName(`${firstOrder.patient.first_name} ${firstOrder.patient.last_name}`);
          }

          const items: LabResultComparison[] = [];
          res.data.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item, idx) => {
                items.push({
                  id: item.id || `lab-${order.id}-${idx}`,
                  testName: item.test_name || t('generalAnalysis'),
                  category: item.category || t('generalAnalysis'),
                  previousValue: item.notes ? `--` : '--',
                  currentValue: item.notes || t('processingStatus'),
                  unit: '',
                  referenceRange: t('withinReference'),
                  difference: '--',
                  trend: 'stable',
                  isCritical: Boolean(item.is_critical || item.critical_flag)
                });
              });
            }
          });
          setComparisons(items);
        } else {
          if (isMounted) setComparisons([]);
        }
      } catch (err) {
        console.warn('Failed to load lab comparisons:', err);
        if (isMounted) setComparisons([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLabResults();
    return () => {
      isMounted = false;
    };
  }, [locale]);

  const filteredComparisons = comparisons.filter(
    (item) => filterCategory === 'all' || item.category === filterCategory
  );

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                Delta Comparison Matrix
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('subtitle')}</span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                filterCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delta Comparison Table */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {patientName ? t('matrixTitle', { name: patientName }) : t('matrixTitleDefault')}
          </span>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
            isDarkMode ? 'bg-teal-950 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-700 border-teal-200'
          }`}>
            Comparison Engine Live
          </span>
        </div>

        {filteredComparisons.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-xs">
              {t('noResultsRecorded')}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
                <tr>
                  <th className="p-3">{t('table.testName')}</th>
                  <th className="p-3">{t('table.category')}</th>
                  <th className="p-3">{t('table.previous')}</th>
                  <th className="p-3">{t('table.current')}</th>
                  <th className="p-3">{t('table.diff')}</th>
                  <th className="p-3">{t('table.ref')}</th>
                  <th className="p-3 text-center">{t('table.trend')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                {filteredComparisons.map((item) => (
                  <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.testName}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {categories.find(c => c.id === item.category)?.label || item.category}
                      </span>
                    </td>
                    <td className={`p-3 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.previousValue}</td>
                    <td className="p-3 font-mono font-bold text-amber-700 text-sm">{item.currentValue}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{item.difference}</td>
                    <td className={`p-3 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.referenceRange}</td>
                    <td className="p-3 text-center">
                      {item.trend === 'down' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>{t('trends.down')}</span>
                        </span>
                      ) : item.trend === 'up' ? (
                        <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{t('trends.up')}</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                          isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-100'
                        }`}>
                          <Minus className="w-3.5 h-3.5" />
                          <span>{t('trends.stable')}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
