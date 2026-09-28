import React, { useState } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Stethoscope,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Activity,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/auth';
import { OperationalDayBar } from '@/components/shared/OperationalDayBar';

interface DoctorOverviewTabProps {
  onNavigateTab: (tabId: string) => void;
  isDarkMode?: boolean;
  queueLength?: number;
  selectedOperationalDate?: string;
  onOperationalDateChange?: (date: string) => void;
}

export const DoctorOverviewTab: React.FC<DoctorOverviewTabProps> = ({
  onNavigateTab,
  isDarkMode = false,
  queueLength = 0,
  selectedOperationalDate,
  onOperationalDateChange
}) => {
  const { user } = useAuth();
  const [showIncome, setShowIncome] = useState(false);
  const [localDate, setLocalDate] = useState<string>('');

  const activeDate = selectedOperationalDate !== undefined ? selectedOperationalDate : localDate;
  const handleDateChange = (newDate: string) => {
    setLocalDate(newDate);
    if (onOperationalDateChange) {
      onOperationalDateChange(newDate);
    }
  };
  const t = useTranslations('doctor.overview');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const cardItemClass = isDarkMode
    ? "bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800/60"
    : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/80";

  const doctorDisplayName = user?.name ? `${user.name}${user.doctor?.specialty ? ` (${user.doctor.specialty})` : ''}` : '';

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Banner */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-600/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                Light Modern Enterprise EMR
              </span>
              <span className={isDarkMode ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs'}>
                {t('subtitle')}
              </span>
            </div>
            <h2 className={`text-lg sm:text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {doctorDisplayName ? t('welcomeWithName', { name: doctorDisplayName }) : t('welcome')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('waiting-room')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>{t('waitingRoomButton')}</span>
          </button>
        </div>
      </div>

      {/* Operational Day Selection Bar */}
      <OperationalDayBar
        selectedDate={activeDate}
        onDateChange={handleDateChange}
      />

      {/* KPI Cards including Average Waiting Time & Today's Income Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Average Waiting Time Card */}
        <div className={`${containerClass} p-5 rounded-2xl border space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('avgWaitTime')}
            </span>
            <div className={`p-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {t('avgWaitValue')}
            </strong>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            }`}>
              {t('avgWaitChange')}
            </span>
          </div>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('avgWaitFootnote')}
          </p>
        </div>

        {/* KPI 2: Today's Income with Toggle Option */}
        <div className={`${containerClass} p-5 rounded-2xl border space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('incomeTitle')}
            </span>
            <button
              onClick={() => setShowIncome(!showIncome)}
              className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={t('incomeToggleTitle')}
            >
              {showIncome ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            {showIncome ? (
              <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {t('incomeValue')}
              </strong>
            ) : (
              <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('incomeHidden')}
              </strong>
            )}
          </div>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('incomeFootnote')}
          </p>
        </div>

        {/* KPI 3: Patients Queue */}
        <div className={`${containerClass} p-5 rounded-2xl border space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('waitingPatientsTitle')}
            </span>
            <div className={`p-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' 
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>
            {t('waitingPatientsValue')}
          </strong>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('waitingPatientsFootnote')}
          </p>
        </div>

        {/* KPI 4: Prescriptions Today */}
        <div className={`${containerClass} p-5 rounded-2xl border space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('prescriptionsTitle')}
            </span>
            <div className={`p-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {t('prescriptionsValue')}
          </strong>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('prescriptionsFootnote')}
          </p>
        </div>

      </div>

      {/* Quick Launch Cards to All Doctor Pages */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <span className={`text-xs font-bold block border-b pb-3 ${isDarkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>
          {t('quickAccess')}
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { id: 'waiting-room', title: t('waitingRoomTitle'), desc: '/doctor/waiting-room', icon: Users, color: isDarkMode ? 'text-teal-400' : 'text-teal-600' },
            { id: 'consultation', title: t('consultationTitle'), desc: '/doctor/consultation/current', icon: Stethoscope, color: isDarkMode ? 'text-blue-400' : 'text-blue-600' },
            { id: 'lab-results', title: t('labResultsTitle'), desc: t('labResultsDesc'), icon: Activity, color: isDarkMode ? 'text-purple-400' : 'text-purple-600' },
            { id: 'radiology-results', title: t('radiologyResultsTitle'), desc: t('radiologyResultsDesc'), icon: Eye, color: isDarkMode ? 'text-amber-400' : 'text-amber-600' },
            { id: 'prescriptions', title: t('prescriptionsTabTitle'), desc: t('prescriptionsDesc'), icon: FileText, color: isDarkMode ? 'text-emerald-400' : 'text-emerald-600' },
            { id: 'activity-log', title: t('activityLogTitle'), desc: '/doctor/activity-log', icon: CheckCircle2, color: isDarkMode ? 'text-slate-300' : 'text-slate-600' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${cardItemClass} ${isRtl ? 'text-right' : 'text-left'}`}
              >
                <div>
                  <strong className={`block font-bold text-xs group-hover:text-blue-600 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </strong>
                  <span className={`text-[10px] font-mono block mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</span>
                </div>
                <Icon className={`w-5 h-5 ${item.color} shrink-0`} />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
