import React, { useState, useEffect, useCallback, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  UserX,
  XCircle,
  RotateCcw,
  Ban,
  Hourglass,
  Footprints,
  RefreshCw,
  AlertCircle,
  Building2,
  Filter,
  ArrowRight,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/auth';
import { getActiveClinicId } from '@/lib/api';
import { clinicService, ClinicDoctorStaff } from '@/services/clinicService';
import { clinicStatsService } from '@/services/clinicStatsService';
import {
  ClinicDoctorStatsData,
  ClinicDoctorItem,
  DateFilterPreset,
} from '@/types/clinicStats';

interface ClinicDirectorStatsTabProps {
  isDarkMode?: boolean;
}

export const ClinicDirectorStatsTab: React.FC<ClinicDirectorStatsTabProps> = ({
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { user } = useAuth();

  // Active Clinic Context
  const currentActiveClinicId = getActiveClinicId() || user?.clinic?.id || '';
  const [activeClinicId, setActiveClinicId] = useState<string>(currentActiveClinicId);

  // Doctors in Clinic (for dropdown filter)
  const [clinicDoctors, setClinicDoctors] = useState<ClinicDoctorStaff[]>([]);

  // Filter States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('today');
  
  // Format today's date as YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [specificDate, setSpecificDate] = useState<string>(getTodayString);
  const [rangeStart, setRangeStart] = useState<string>(getTodayString);
  const [rangeEnd, setRangeEnd] = useState<string>(getTodayString);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // Data & Request States
  const [statsData, setStatsData] = useState<ClinicDoctorStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accessible element IDs
  const doctorSelectId = useId();
  const specificDateInputId = useId();
  const rangeStartInputId = useId();
  const rangeEndInputId = useId();

  // Load Clinic Doctors List for the Dropdown
  const loadClinicDoctors = useCallback(async (clinicId: string) => {
    if (!clinicId) return;
    try {
      const res = await clinicService.getClinic(clinicId);
      if (res.data?.doctors) {
        setClinicDoctors(res.data.doctors.filter((d) => d.is_active !== false));
      } else {
        setClinicDoctors([]);
      }
    } catch {
      setClinicDoctors([]);
    }
  }, []);

  // Compute query parameters according to active filter selection
  const computeQueryParams = useCallback(() => {
    const params: { from_date?: string; to_date?: string; doctor_id?: string } = {};

    if (datePreset === 'today') {
      const today = getTodayString();
      params.from_date = today;
      params.to_date = today;
    } else if (datePreset === 'specific') {
      params.from_date = specificDate;
      params.to_date = specificDate;
    } else if (datePreset === 'range') {
      if (rangeEnd < rangeStart) {
        return null; // Invalid range
      }
      params.from_date = rangeStart;
      params.to_date = rangeEnd;
    }

    if (selectedDoctorId && selectedDoctorId.trim() !== '') {
      params.doctor_id = selectedDoctorId.trim();
    }

    return params;
  }, [datePreset, specificDate, rangeStart, rangeEnd, selectedDoctorId]);

  // Fetch Statistics
  const fetchStatistics = useCallback(async () => {
    const params = computeQueryParams();
    if (!params) {
      setDateRangeError(t('directorStats.filters.invalidRange'));
      return;
    }
    setDateRangeError(null);

    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await clinicStatsService.getClinicDoctorStats(params);
      if (res.data) {
        setStatsData(res.data);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = anyErr?.response?.status || 500;
      setErrorStatus(status);
      if (status === 403) {
        setErrorMessage(t('directorStats.error.forbidden'));
      } else if (status === 422) {
        setErrorMessage(anyErr?.response?.data?.message || t('directorStats.error.invalidParams'));
      } else {
        setErrorMessage(t('directorStats.error.title'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [computeQueryParams, t]);

  // React to Active Clinic ID Changes
  useEffect(() => {
    const currentId = getActiveClinicId() || user?.clinic?.id || '';
    if (currentId !== activeClinicId) {
      setActiveClinicId(currentId);
      setSelectedDoctorId(''); // Reset doctor selection on clinic switch
      setStatsData(null); // Clear previous clinic data to prevent leakage
    }
  }, [user, activeClinicId]);

  // Initial load or clinic change
  useEffect(() => {
    if (activeClinicId) {
      loadClinicDoctors(activeClinicId);
      fetchStatistics();
    }
  }, [activeClinicId, loadClinicDoctors, fetchStatistics]);

  // Handlers
  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
  };

  const handleDatePresetChange = (preset: DateFilterPreset) => {
    setDatePreset(preset);
    setDateRangeError(null);
  };

  const handleClearDoctorFilter = () => {
    setSelectedDoctorId('');
  };

  const summary = statsData?.summary;
  const isZeroRecords =
    summary &&
    summary.total_appointments === 0 &&
    summary.walk_in_visits === 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Active Clinic Context */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  {t('directorStats.title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('directorStats.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Clinic Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('directorStats.activeClinic')}:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {statsData?.clinic?.name || user?.clinic?.name || '—'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchStatistics}
              disabled={isLoading}
              title={t('directorStats.refresh')}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter Toolbar (Doctor + Date Filters) */}
      <div
        className={`p-5 rounded-2xl border transition-all space-y-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Doctor Filter Selector */}
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <label htmlFor={doctorSelectId} className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('directorStats.filters.doctor')}</span>
            </label>
            <div className="relative">
              <select
                id={doctorSelectId}
                value={selectedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                disabled={isLoading}
                className={`w-full appearance-none px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                }`}
              >
                <option value="">{t('directorStats.filters.allDoctors')}</option>
                {clinicDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} {doc.specialty ? `— ${doc.specialty}` : ''} ({doc.position === 'director' ? t('directorStats.table.director') : t('directorStats.table.doctorStaff')})
                  </option>
                ))}
              </select>
              <ChevronDown className={`w-4 h-4 text-slate-400 pointer-events-none absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'}`} />
            </div>
          </div>

          {/* Date Presets Segmented Control */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('directorStats.filters.dateMode')}</span>
            </label>
            <div
              className={`inline-flex p-1 rounded-xl border ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => handleDatePresetChange('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('directorStats.filters.today')}
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('specific')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === 'specific'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('directorStats.filters.specificDate')}
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === 'range'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('directorStats.filters.range')}
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs based on Mode */}
        {datePreset === 'specific' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label htmlFor={specificDateInputId} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{t('directorStats.filters.specificDate')}</span>
              </label>
              <input
                id={specificDateInputId}
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        )}

        {datePreset === 'range' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label htmlFor={rangeStartInputId} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" />
                <span>{t('directorStats.filters.fromDate')}</span>
              </label>
              <input
                id={rangeStartInputId}
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={rangeEndInputId} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" />
                <span>{t('directorStats.filters.toDate')}</span>
              </label>
              <input
                id={rangeEndInputId}
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {dateRangeError && (
              <div className="w-full text-xs text-rose-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{dateRangeError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Selected Doctor Focused Card (when doctor filter is active) */}
      {selectedDoctorId && statsData?.selected_doctor && (
        <div
          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDarkMode
              ? 'bg-blue-950/30 border-blue-900/50 text-blue-100'
              : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {t('directorStats.selectedDoctorCard.viewing')}
              </div>
              <div className="text-sm font-bold">
                {statsData.selected_doctor.name}
                {statsData.selected_doctor.specialty && (
                  <span className="text-xs font-medium opacity-80 ms-2">
                    ({statsData.selected_doctor.specialty})
                  </span>
                )}
                <span className="text-xs font-medium opacity-70 ms-2">
                  [{statsData.selected_doctor.position === 'director' ? t('directorStats.table.director') : t('directorStats.table.doctorStaff')}]
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClearDoctorFilter}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{t('directorStats.selectedDoctorCard.clearFilter')}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* 4. Error Display */}
      {errorStatus !== null && (
        <div
          className={`p-6 rounded-2xl border text-center space-y-3 ${
            errorStatus === 403
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto">
            {errorStatus === 403 ? <ShieldAlert className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <h3 className="text-base font-bold">
            {errorMessage || t('directorStats.error.title')}
          </h3>
          <button
            onClick={fetchStatistics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('directorStats.error.retry')}</span>
          </button>
        </div>
      )}

      {/* 5. Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-28 rounded-2xl border p-4 ${
                isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            />
          ))}
        </div>
      )}

      {/* 6. Statistics Content */}
      {!isLoading && summary && (
        <div className="space-y-6">
          {/* Primary KPIs Deck (5 Metrics) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('directorStats.sections.primaryKpis')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Appointments */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('directorStats.kpis.totalAppointments')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">
                  {summary.total_appointments}
                </div>
              </div>

              {/* Completed */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('directorStats.kpis.completed')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {summary.completed}
                </div>
              </div>

              {/* In Waiting Room */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('directorStats.kpis.inWaitingRoom')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {summary.in_waiting_room}
                </div>
              </div>

              {/* Pending Check-In */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('directorStats.kpis.pendingCheckIn')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Hourglass className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                  {summary.pending_check_in}
                </div>
              </div>

              {/* Walk-in Visits */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white'
                    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('directorStats.kpis.walkInVisits')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Footprints className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                  {summary.walk_in_visits}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Status Deck (5 Metrics) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('directorStats.sections.secondaryKpis')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* No-Show */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('directorStats.kpis.noShow')}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {summary.no_show}
                </span>
              </div>

              {/* Cancelled */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('directorStats.kpis.cancelled')}
                  </span>
                </div>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {summary.cancelled}
                </span>
              </div>

              {/* Rescheduled */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('directorStats.kpis.rescheduled')}
                  </span>
                </div>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.rescheduled}
                </span>
              </div>

              {/* Rejected */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('directorStats.kpis.rejected')}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {summary.rejected}
                </span>
              </div>

              {/* Expired */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('directorStats.kpis.expired')}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-500">
                  {summary.expired}
                </span>
              </div>
            </div>
          </div>

          {/* 7. Zero-Record Empty State (Reassuring banner, no false error) */}
          {isZeroRecords && (
            <div
              className={`p-8 rounded-2xl border text-center space-y-2 ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200/80 text-slate-600'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('directorStats.empty.title')}
              </h3>
              <p className="text-xs max-w-md mx-auto">
                {t('directorStats.empty.message')}
              </p>
            </div>
          )}

          {/* 8. Doctor Breakdown Table (All Doctors Mode) */}
          {!selectedDoctorId && statsData?.doctors && statsData.doctors.length > 0 && (
            <div
              className={`rounded-2xl border overflow-hidden transition-all ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
              }`}
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {t('directorStats.sections.doctorBreakdown')}
                </h2>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                  {statsData.doctors.length} {t('directorStats.table.doctor')}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead
                    className={`border-b ${
                      isDarkMode
                        ? 'bg-slate-800/50 border-slate-800 text-slate-400'
                        : 'bg-slate-50 border-slate-200/80 text-slate-500'
                    }`}
                  >
                    <tr>
                      <th className="py-3 px-4 text-start font-semibold">{t('directorStats.table.doctor')}</th>
                      <th className="py-3 px-4 text-start font-semibold">{t('directorStats.table.specialty')}</th>
                      <th className="py-3 px-4 text-center font-semibold">{t('directorStats.table.position')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.total')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.completed')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.waiting')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.pending')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.walkIn')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.noShow')}</th>
                      <th className="py-3 px-3 text-center font-semibold">{t('directorStats.table.cancelled')}</th>
                      <th className="py-3 px-4 text-center font-semibold">{t('directorStats.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {statsData.doctors.map((docItem: ClinicDoctorItem) => (
                      <tr
                        key={docItem.id}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {docItem.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {docItem.specialty || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              docItem.position === 'director'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {docItem.position === 'director'
                              ? t('directorStats.table.director')
                              : t('directorStats.table.doctorStaff')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold">
                          {docItem.metrics.total_appointments}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {docItem.metrics.completed}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                          {docItem.metrics.in_waiting_room}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-sky-600 dark:text-sky-400">
                          {docItem.metrics.pending_check_in}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-purple-600 dark:text-purple-400">
                          {docItem.metrics.walk_in_visits}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-slate-500">
                          {docItem.metrics.no_show}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-rose-500">
                          {docItem.metrics.cancelled}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDoctorChange(docItem.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Filter className="w-3 h-3" />
                            <span>{t('directorStats.table.viewDoctor')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
                {statsData.doctors.map((docItem: ClinicDoctorItem) => (
                  <div
                    key={docItem.id}
                    className={`p-3.5 rounded-xl border space-y-3 ${
                      isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {docItem.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {docItem.specialty || '—'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          docItem.position === 'director'
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-slate-500/10 text-slate-600'
                        }`}
                      >
                        {docItem.position === 'director'
                          ? t('directorStats.table.director')
                          : t('directorStats.table.doctorStaff')}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400">{t('directorStats.table.total')}</div>
                        <div className="font-bold">{docItem.metrics.total_appointments}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400">{t('directorStats.table.completed')}</div>
                        <div className="font-bold text-emerald-600">{docItem.metrics.completed}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400">{t('directorStats.table.waiting')}</div>
                        <div className="font-bold text-amber-600">{docItem.metrics.in_waiting_room}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400">{t('directorStats.table.walkIn')}</div>
                        <div className="font-bold text-purple-600">{docItem.metrics.walk_in_visits}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDoctorChange(docItem.id)}
                      className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>{t('directorStats.table.viewDoctor')}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
