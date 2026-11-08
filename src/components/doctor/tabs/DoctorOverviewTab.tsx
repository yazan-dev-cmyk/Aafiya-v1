import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Eye,
  EyeOff,
  Stethoscope,
  CheckCircle2,
  Calendar,
  Activity,
  FileText,
  FlaskConical,
  Scan,
  Play,
  Phone,
  Sparkles,
  RefreshCw,
  UserCheck,
  Building2
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/auth';
import { OperationalDayBar } from '@/components/shared/OperationalDayBar';
import { appointmentService, AppointmentItem } from '@/services/appointmentService';
import { WaitingPatient } from '../../../data/doctorDashboardData';

interface DoctorOverviewTabProps {
  onNavigateTab: (tabId: string) => void;
  onStartConsultation?: (patient: WaitingPatient) => void;
  isDarkMode?: boolean;
  queueLength?: number;
  selectedOperationalDate?: string;
  onOperationalDateChange?: (date: string) => void;
}

export const DoctorOverviewTab: React.FC<DoctorOverviewTabProps> = ({
  onNavigateTab,
  onStartConsultation,
  isDarkMode = false,
  queueLength = 0,
  selectedOperationalDate,
  onOperationalDateChange
}) => {
  const { user } = useAuth();
  const [showIncome, setShowIncome] = useState(false);
  const [localDate, setLocalDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'waiting' | 'completed' | 'pending'>('all');

  // Fetch appointments for the selected operational date
  const fetchDayAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await appointmentService.getAppointments({
        appointment_date: activeDate
      });
      if (res.data) {
        setAppointments(res.data);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.warn('Failed to fetch day appointments in DoctorOverviewTab:', err);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchDayAppointments();
  }, [activeDate, user?.id]);

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const cardItemClass = isDarkMode
    ? "bg-slate-950/70 border-slate-800/80 text-slate-200 hover:bg-slate-800/70 hover:border-slate-700"
    : "bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-white hover:border-primary/30 hover:shadow-sm";

  const doctorDisplayName = user?.name || t('defaultDoctorName');
  const doctorSpecialty = user?.doctor?.specialty || t('defaultSpecialty');
  const clinicName = user?.clinic?.name || t('defaultClinicName');

  // Computed metrics
  const totalToday = appointments.length;
  const waitingCount = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed' || a.status === 'waiting' || a.status === 'called').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const effectiveQueue = queueLength > 0 ? queueLength : waitingCount;

  // Next patient waiting for consultation
  const nextWaitingAppointment = appointments.find(a => 
    a.status === 'waiting' || a.status === 'called' || a.status === 'confirmed' || a.status === 'pending'
  );

  const handleStartConsultationWithApp = (app: AppointmentItem) => {
    const patientObj: WaitingPatient = {
      id: app.id,
      queueNumber: 1,
      patientName: app.patient?.name || app.patient_name || t('guestPatient'),
      patientType: (app.patient?.id || app.patient_id ? 'registered' : 'guest') as 'registered' | 'guest',
      arrivalTime: app.time_slot || '09:00',
      waitingMinutes: 5,
      status: 'waiting',
      reasonForVisit: app.notes || t('generalConsultation'),
      phone: app.patient?.phone || app.patient_phone || '',
      age: 35,
      gender: 'male'
    };

    if (onStartConsultation) {
      onStartConsultation(patientObj);
    } else {
      onNavigateTab('consultation');
    }
  };

  // Filtered appointments list
  const filteredAppointments = appointments.filter(a => {
    if (scheduleFilter === 'waiting') return a.status === 'waiting' || a.status === 'called' || a.status === 'confirmed';
    if (scheduleFilter === 'completed') return a.status === 'completed';
    if (scheduleFilter === 'pending') return a.status === 'pending';
    return true;
  });

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Clinical Cockpit Hero Banner */}
      <div className={`${containerClass} rounded-2xl p-6 sm:p-7 border relative overflow-hidden transition-all`}>
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shadow-primary/20 shrink-0">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t('practiceActive')}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                  isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {clinicName}
                </span>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  • {doctorSpecialty}
                </span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {doctorDisplayName ? t('welcomeWithName', { name: doctorDisplayName }) : t('welcome')}
              </h1>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('cockpitSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => onNavigateTab('waiting-room')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>{t('waitingRoomButton')}</span>
              {effectiveQueue > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                  {effectiveQueue}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigateTab('consultation')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t('currentConsultationBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Day Selection Bar */}
      <OperationalDayBar
        selectedDate={activeDate}
        onDateChange={handleDateChange}
      />

      {/* Spotlight: Next Patient in Queue */}
      <div className={`${containerClass} rounded-2xl p-5 sm:p-6 border transition-all`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('nextPatientTitle')}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {t('nextPatientSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={fetchDayAppointments}
            disabled={isLoadingAppointments}
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('refreshTooltip')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAppointments ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {nextWaitingAppointment ? (
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-teal-50/40 border-teal-100'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-primary/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {nextWaitingAppointment.patient?.name || nextWaitingAppointment.patient_name || t('guestPatient')}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {nextWaitingAppointment.booking_reference || '#APP'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-mono font-bold text-primary">
                    <Clock className="w-3.5 h-3.5" />
                    {nextWaitingAppointment.time_slot}
                  </span>
                  {(nextWaitingAppointment.patient?.phone || nextWaitingAppointment.patient_phone) && (
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {nextWaitingAppointment.patient?.phone || nextWaitingAppointment.patient_phone}
                    </span>
                  )}
                  {nextWaitingAppointment.notes && (
                    <span className="italic text-slate-500">
                      "{nextWaitingAppointment.notes}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => handleStartConsultationWithApp(nextWaitingAppointment)}
                className="flex-1 md:flex-initial px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('startConsultationNow')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`p-6 rounded-xl border text-center space-y-2 ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50/60 border-slate-100'
          }`}>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('noWaitingPatients')}
            </p>
            <p className="text-[11px] text-slate-500">
              {t('waitingRoomClear')}
            </p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Waiting Room Queue */}
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
          <div className="flex items-baseline gap-2">
            <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>
              {effectiveQueue} {t('patientsUnit')}
            </strong>
          </div>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {effectiveQueue > 0 
              ? t('patientsWaitingCall') 
              : t('waitingPatientsFootnote')}
          </p>
        </div>

        {/* KPI 2: Completed Consultations */}
        <div className={`${containerClass} p-5 rounded-2xl border space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('completedTodayTitle')}
            </span>
            <div className={`p-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {completedCount}
            </strong>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-100'
            }`}>
              / {totalToday} {t('totalScheduledUnit')}
            </span>
          </div>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('totalScheduledFootnote', { count: totalToday })}
          </p>
        </div>

        {/* KPI 3: Average Wait Time */}
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
              {effectiveQueue > 0 ? `${effectiveQueue * 12} د` : t('avgWaitValue')}
            </strong>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            }`}>
              {effectiveQueue > 0 ? t('stableStatus') : t('avgWaitChange')}
            </span>
          </div>
          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('completedFootnote', { count: completedCount })}
          </p>
        </div>

        {/* KPI 4: Today's Income with Toggle Option */}
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
                {completedCount * 2500} {isRtl ? 'د.ج' : 'DZD'}
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

      </div>

      {/* Clinical Operations Rail */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('quickHubTitle')}
          </span>
          <span className="text-[11px] text-slate-400">
            {t('quickHubSubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { 
              id: 'waiting-room', 
              title: t('railWaitingRoomTitle'), 
              desc: t('railWaitingRoomDesc'), 
              icon: Users, 
              color: 'text-teal-600 dark:text-teal-400',
              badge: effectiveQueue > 0 ? `${effectiveQueue}` : undefined
            },
            { 
              id: 'consultation', 
              title: t('railConsultationTitle'), 
              desc: t('railConsultationDesc'), 
              icon: Stethoscope, 
              color: 'text-blue-600 dark:text-blue-400' 
            },
            { 
              id: 'prescriptions', 
              title: t('railPrescriptionsTitle'), 
              desc: t('railPrescriptionsDesc'), 
              icon: FileText, 
              color: 'text-emerald-600 dark:text-emerald-400' 
            },
            { 
              id: 'lab-orders', 
              title: t('railLabOrdersTitle'), 
              desc: t('railLabOrdersDesc'), 
              icon: FlaskConical, 
              color: 'text-purple-600 dark:text-purple-400' 
            },
            { 
              id: 'radiology-orders', 
              title: t('railRadiologyOrdersTitle'), 
              desc: t('railRadiologyOrdersDesc'), 
              icon: Scan, 
              color: 'text-amber-600 dark:text-amber-400' 
            },
            { 
              id: 'visits', 
              title: t('railVisitsTitle'), 
              desc: t('railVisitsDesc'), 
              icon: Calendar, 
              color: 'text-indigo-600 dark:text-indigo-400' 
            },
            { 
              id: 'patients', 
              title: t('railPatientsTitle'), 
              desc: t('railPatientsDesc'), 
              icon: UserCheck, 
              color: 'text-sky-600 dark:text-sky-400' 
            },
            { 
              id: 'analytics', 
              title: t('railAnalyticsTitle'), 
              desc: t('railAnalyticsDesc'), 
              icon: Activity, 
              color: 'text-rose-600 dark:text-rose-400' 
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab(item.id)}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${cardItemClass} ${isRtl ? 'text-right' : 'text-left'}`}
              >
                <div className="space-y-0.5 min-w-0 me-2">
                  <div className="flex items-center gap-1.5">
                    <strong className={`block font-bold text-xs group-hover:text-primary transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </strong>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.desc}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className={`w-4.5 h-4.5 ${item.color}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Appointments Timeline & List */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t('todayScheduleTitle')}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredAppointments.length})
            </span>
          </div>

          {/* Filtering Chips */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {[
              { id: 'all', label: t('filterAll') },
              { id: 'waiting', label: t('filterWaiting') },
              { id: 'completed', label: t('filterCompleted') },
              { id: 'pending', label: t('filterPending') }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setScheduleFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  scheduleFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingAppointments ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{t('loadingAppointments')}</span>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-2">
            {filteredAppointments.map((app) => {
              const isWaiting = app.status === 'waiting' || app.status === 'called' || app.status === 'confirmed';
              const isCompleted = app.status === 'completed';

              return (
                <div
                  key={app.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-850' : 'bg-slate-50/60 border-slate-200/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-16 text-center font-mono font-bold text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
                      {app.time_slot}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {app.patient?.name || app.patient_name || t('guestPatient')}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {app.booking_reference}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {(app.patient?.phone || app.patient_phone) && (
                          <span dir="ltr" className="font-mono">
                            {app.patient?.phone || app.patient_phone}
                          </span>
                        )}
                        {app.notes && (
                          <span className="truncate max-w-[200px] text-slate-400">
                            • {app.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : isWaiting
                        ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {isCompleted ? t('statusCompleted') : isWaiting ? t('statusWaiting') : t('statusPending')}
                    </span>

                    {isWaiting && (
                      <button
                        onClick={() => handleStartConsultationWithApp(app)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{t('examineBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t('noAppointmentsFilter')}
            </p>
            <p className="text-[11px] text-slate-400">
              {t('pickAnotherDate')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

