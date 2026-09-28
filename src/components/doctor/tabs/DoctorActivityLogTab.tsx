import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ClinicalActivityLog } from '../../../data/doctorDashboardData';
import { auditService } from '@/services/auditService';
import {
  ShieldCheck,
  Clock,
  Search,
  FileText,
  FlaskConical,
  Scan,
  Users,
  Stethoscope,
  Terminal
} from 'lucide-react';

import { HistoricalPeriodBar, HistoricalPeriodValue } from '@/components/shared/HistoricalPeriodBar';

interface DoctorActivityLogTabProps {
  isDarkMode?: boolean;
}

export const DoctorActivityLogTab: React.FC<DoctorActivityLogTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.activityLog');
  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<ClinicalActivityLog[]>([]);
  const [periodValue, setPeriodValue] = useState<HistoricalPeriodValue>({ period: 'today' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const resolveHistoricalPeriodBounds = (val: HistoricalPeriodValue): { fromDate?: string; toDate?: string } => {
    const now = new Date();
    if (val.period === 'today') {
      const todayStr = formatLocalDate(now);
      return { fromDate: todayStr, toDate: todayStr };
    }
    if (val.period === 'week') {
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const diff = (dayOfWeek + 6) % 7;
      startOfWeek.setDate(now.getDate() - diff);
      return { fromDate: formatLocalDate(startOfWeek), toDate: formatLocalDate(now) };
    }
    if (val.period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { fromDate: formatLocalDate(startOfMonth), toDate: formatLocalDate(endOfMonth) };
    }
    if (val.period === 'custom') {
      return { fromDate: val.fromDate || undefined, toDate: val.toDate || undefined };
    }
    return {};
  };

  // Reset page to 1 when periodValue or searchTerm changes
  useEffect(() => {
    setCurrentPage(1);
  }, [periodValue, searchTerm]);

  // Fetch Clinical Access Logs with Pagination and Stale Protection
  useEffect(() => {
    let isCancelled = false;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const bounds = resolveHistoricalPeriodBounds(periodValue);
        const params: Record<string, any> = {
          page: currentPage,
          per_page: 25,
        };
        if (bounds.fromDate) params.from_date = bounds.fromDate;
        if (bounds.toDate) params.to_date = bounds.toDate;

        const res = await auditService.getClinicalAccessLogs(params);
        if (isCancelled) return;
        if (res.data && res.data.length > 0) {
          const liveLogs = res.data.map((log) => {
            const dateObj = log.created_at ? new Date(log.created_at) : new Date();
            const dateStr = formatLocalDate(dateObj);
            const rawCreated = log.created_at || `${dateStr}T12:00:00`;
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            return {
              id: log.id,
              timestamp: `${dateStr} ${timeStr}`,
              rawCreatedAt: rawCreated,
              rawDate: dateStr,
              actionType: 'consultation' as const,
              title: `${t('auditActionPrefix')}: ${log.action} -> ${log.resource_type}`,
              patientName: log.patient ? `${log.patient.first_name} ${log.patient.last_name}` : 'EHR',
              details: `${t('reasonPrefix')}: ${log.access_reason}`,
              ipAddress: log.ip_address || '127.0.0.1',
            };
          });
          setLogs(liveLogs);
        } else {
          setLogs([]);
        }

        if (res.meta) {
          setLastPage(res.meta.last_page || 1);
          setTotalRecords(res.meta.total || 0);
        }
      } catch {
        if (!isCancelled) {
          setLogs([]);
          setTotalRecords(0);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isCancelled = true;
    };
  }, [periodValue, currentPage, t]);

  const bounds = resolveHistoricalPeriodBounds(periodValue);
  const filteredLogs = logs
    .filter((l: any) => {
      const matchesSearch =
        l.title.includes(searchTerm) ||
        l.details.includes(searchTerm) ||
        l.patientName.includes(searchTerm);
      if (!matchesSearch) return false;

      if (bounds.fromDate && l.rawDate && l.rawDate < bounds.fromDate) return false;
      if (bounds.toDate && l.rawDate && l.rawDate > bounds.toDate) return false;

      return true;
    })
    .sort((a: any, b: any) => (b.rawCreatedAt || '').localeCompare(a.rawCreatedAt || ''));

  return (
    <div className="space-y-6 dir-rtl text-right">
      
      {/* Top Banner Header */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-xs ${
            isDarkMode ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {t('path')}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('subtitle')}</span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <div className={`text-xs font-mono px-3 py-1.5 rounded-xl border ${
          isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          IP: 192.168.1.45 (Verified Doctor Session)
        </div>
      </div>

      {/* Temporal Historical Period Filter */}
      <HistoricalPeriodBar
        value={periodValue}
        onChange={setPeriodValue}
      />

      {/* Activity Logs Table */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className={`w-4 h-4 absolute right-3 top-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className={`w-full pl-3 pr-9 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('stats', { count: filteredLogs.length })}
          </span>
        </div>

        <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <table className="w-full text-right text-xs font-sans">
            <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
              <tr>
                <th className="p-3 font-mono">{t('table.timestamp')}</th>
                <th className="p-3">{t('table.type')}</th>
                <th className="p-3">{t('table.title')}</th>
                <th className="p-3">{t('table.details')}</th>
                <th className="p-3">{t('table.patient')}</th>
                <th className="p-3 font-mono">{t('table.ip')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={`${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} font-mono text-[11px]`}>
                  <td className="p-3 text-amber-700 font-bold">{log.timestamp}</td>
                  <td className="p-3 font-sans">
                    <span className={`px-2 py-0.5 rounded border ${
                      isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className={`p-3 font-bold font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.title}</td>
                  <td className={`p-3 font-sans ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{log.details}</td>
                  <td className="p-3 text-blue-700 font-bold font-sans">{log.patientName}</td>
                  <td className={isDarkMode ? 'p-3 text-slate-500' : 'p-3 text-slate-400'}>{log.ipAddress}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-slate-500 font-bold font-sans">
                    {searchTerm ? t('noSearchResults') : t('noLogsRecorded')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t ${
          isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="font-bold">
              صفحة {currentPage} من {lastPage}
            </span>
            {totalRecords > 0 && (
              <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
              }`}>
                إجمالي: {totalRecords}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-sans">
            <button
              type="button"
              aria-label="الصفحة السابقة"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || isLoading}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentPage <= 1 || isLoading
                  ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                  : isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <span>السابق</span>
            </button>

            <button
              type="button"
              aria-label="الصفحة التالية"
              onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
              disabled={currentPage >= lastPage || isLoading}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentPage >= lastPage || isLoading
                  ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                  : isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
              }`}
            >
              <span>التالي</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
