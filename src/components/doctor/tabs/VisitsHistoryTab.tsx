import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Calendar,
  Clock,
  Search,
  ListFilter,
  FileText,
  FlaskConical,
  Scan,
  Stethoscope,
  AlertTriangle,
  Eye,
  X,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
  Ban
} from 'lucide-react';
import { appointmentService, AppointmentItem } from '@/services/appointmentService';
import { ehrService } from '@/services/ehrService';
import { VisitRecord } from '../../../data/doctorPatientsData';
import { HistoricalPeriodBar, HistoricalPeriodValue } from '@/components/shared/HistoricalPeriodBar';

interface VisitsHistoryTabProps {
  isDarkMode?: boolean;
}

export const VisitsHistoryTab: React.FC<VisitsHistoryTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.visits');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // Temporal Filter State
  const [periodValue, setPeriodValue] = useState<HistoricalPeriodValue>({ period: 'today' });

  // Subtab: 'appointments' (Live Appointments) vs 'clinical_visits' (EHR Consultations)
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'clinical_visits'>('appointments');

  // Live Doctor Appointments State & Pagination
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');
  const [appointmentsPage, setAppointmentsPage] = useState<number>(1);
  const [appointmentsLastPage, setAppointmentsLastPage] = useState<number>(1);
  const [appointmentsTotal, setAppointmentsTotal] = useState<number>(0);

  // Reschedule & Cancel Modal States
  const [reschedulingAppointment, setReschedulingAppointment] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('09:00');
  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('إلغاء الموعد بناءً على طلب الطبيب');

  // EHR Consultations State & Pagination
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [visitsPage, setVisitsPage] = useState<number>(1);
  const [visitsLastPage, setVisitsLastPage] = useState<number>(1);
  const [visitsTotal, setVisitsTotal] = useState<number>(0);
  const [isLoadingVisits, setIsLoadingVisits] = useState<boolean>(false);

  const containerClass = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs';

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

  // Reset pagination to page 1 on search or filter change
  useEffect(() => {
    setAppointmentsPage(1);
  }, [statusFilter, appointmentSearch]);

  // Reset pagination to page 1 on historical period change
  useEffect(() => {
    setAppointmentsPage(1);
    setVisitsPage(1);
  }, [periodValue]);

  // Fetch Appointments with Pagination
  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const bounds = resolveHistoricalPeriodBounds(periodValue);
      const params: Record<string, any> = {
        page: appointmentsPage,
        per_page: 20,
      };
      if (bounds.fromDate) params.from_date = bounds.fromDate;
      if (bounds.toDate) params.to_date = bounds.toDate;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await appointmentService.getAppointments(params);
      if (res.data && Array.isArray(res.data)) {
        setAppointments(res.data);
      } else {
        setAppointments([]);
      }
      if (res.meta) {
        setAppointmentsLastPage(res.meta.last_page || 1);
        setAppointmentsTotal(res.meta.total || 0);
      }
    } catch {
      setAppointments([]);
      setAppointmentsTotal(0);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  // Fetch Clinical Visits with Pagination
  const fetchVisits = async () => {
    setIsLoadingVisits(true);
    try {
      const bounds = resolveHistoricalPeriodBounds(periodValue);
      const params: Record<string, any> = {
        page: visitsPage,
        per_page: 20,
      };
      if (bounds.fromDate) params.from_date = bounds.fromDate;
      if (bounds.toDate) params.to_date = bounds.toDate;

      const res = await ehrService.getVisits(params);
      if (res.data && res.data.length > 0) {
        const liveVisits: VisitRecord[] = res.data.map((v) => ({
          id: v.visit_reference,
          patientId: v.patient_id,
          patientMrn: v.patient?.mrn || 'MRN-2026',
          patientName: v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : 'مريض',
          patientAge: 35,
          patientGender: 'male',
          date: v.visit_date,
          time: '10:00',
          visitType: 'review',
          diagnosis: v.diagnosis || v.chief_complaint,
          hasPrescription: false,
          hasLabOrder: false,
          hasRadiologyOrder: false,
          doctorName: 'د. الطبيب المعني',
          status: v.is_finalized ? 'completed' : 'ongoing',
          notes: v.clinical_notes || '',
        }));
        setVisits(liveVisits);
      } else {
        setVisits([]);
      }
      if (res.meta) {
        setVisitsLastPage(res.meta.last_page || 1);
        setVisitsTotal(res.meta.total || 0);
      }
    } catch {
      setVisits([]);
      setVisitsTotal(0);
    } finally {
      setIsLoadingVisits(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [periodValue, appointmentsPage, statusFilter]);

  useEffect(() => {
    fetchVisits();
  }, [periodValue, visitsPage]);

  // Filtered & Chronologically Sorted Appointments
  const filteredAppointments = appointments
    .filter((app) => {
      const pName = app.patient?.name || app.patient_name || '';
      const ref = app.booking_reference || app.id;
      const mrn = app.patient?.mrn || app.patient_mrn || '';
      const notes = app.notes || '';

      const matchesSearch =
        pName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        ref.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        mrn.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        notes.toLowerCase().includes(appointmentSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }

      // Local period filter verification
      const bounds = resolveHistoricalPeriodBounds(periodValue);
      if (bounds.fromDate && app.appointment_date && app.appointment_date < bounds.fromDate) {
        return false;
      }
      if (bounds.toDate && app.appointment_date && app.appointment_date > bounds.toDate) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.appointment_date || '';
      const dateB = b.appointment_date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.time_slot || '').localeCompare(a.time_slot || '');
    });

  // Action: Confirm Appointment
  const handleConfirm = async (id: string, name: string) => {
    try {
      await appointmentService.confirmAppointment(id);
      alert(isRtl ? `تم تأكيد موعد المريض ${name} بنجاح.` : `Appointment for ${name} confirmed successfully.`);
      fetchAppointments();
    } catch (err: any) {
      alert(err?.message || (isRtl ? 'حدث خطأ أثناء تأكيد الموعد.' : 'Failed to confirm appointment.'));
    }
  };

  // Action: Open Reschedule
  const handleOpenReschedule = (app: AppointmentItem) => {
    setReschedulingAppointment(app);
    setRescheduleDate(app.appointment_date || formatLocalDate(new Date()));
    setRescheduleSlot(app.time_slot || '09:00');
  };

  // Action: Submit Reschedule
  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppointment) return;
    try {
      await appointmentService.rescheduleAppointment(reschedulingAppointment.id, {
        appointment_date: rescheduleDate,
        time_slot: rescheduleSlot,
      });
      alert(isRtl ? 'تمت إعادة جدولة الموعد بنجاح.' : 'Appointment rescheduled successfully.');
      setReschedulingAppointment(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err?.message || (isRtl ? 'حدث خطأ أثناء إعادة الجدولة.' : 'Failed to reschedule appointment.'));
    }
  };

  // Action: Open Cancel Dialog
  const handleOpenCancel = (app: AppointmentItem) => {
    setCancellingAppointment(app);
    setCancelReason('إلغاء الموعد بناءً على طلب الطبيب المعالج');
  };

  // Action: Submit Cancel
  const handleExecuteCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointment) return;
    try {
      await appointmentService.cancelAppointment(cancellingAppointment.id, cancelReason);
      alert(isRtl ? 'تم إلغاء الموعد بنجاح.' : 'Appointment cancelled successfully.');
      setCancellingAppointment(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err?.message || (isRtl ? 'حدث خطأ أثناء إلغاء الموعد.' : 'Failed to cancel appointment.'));
    }
  };

  // Status Badge Formatter
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">{isRtl ? 'مؤكد ✅' : 'Confirmed'}</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{isRtl ? 'في انتظار التأكيد ⏳' : 'Pending'}</span>;
      case 'attended':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">{isRtl ? 'حضر 🏥' : 'Attended'}</span>;
      case 'rescheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">{isRtl ? 'معاد جدولته 🔄' : 'Rescheduled'}</span>;
      case 'cancelled':
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">{isRtl ? 'ملغى ❌' : 'Cancelled'}</span>;
      case 'expired':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">{isRtl ? 'منتهي' : 'Expired'}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">{status}</span>;
    }
  };

  // Quick Stats
  const totalCount = filteredAppointments.length;
  const pendingCount = filteredAppointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = filteredAppointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = filteredAppointments.filter((a) => a.status === 'attended').length;
  const cancelledCount = filteredAppointments.filter((a) => a.status === 'cancelled' || a.status === 'rejected').length;

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Banner Header */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}>
                /doctor/appointments
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isRtl ? 'إدارة المواعيد وسجل الزيارات' : 'Appointment & Visit Management'}
              </span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {isRtl ? 'سجل المواعيد والزيارات الخاصة بالطبيب' : 'Doctor Appointments & Visits Log'}
            </h2>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'appointments'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isRtl ? 'سجل المواعيد (Appointments)' : 'Appointments'}
          </button>
          <button
            onClick={() => setActiveSubTab('clinical_visits')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'clinical_visits'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isRtl ? 'الزيارات السريرية (EHR Visits)' : 'Clinical Consultations'}
          </button>
        </div>
      </div>

      {/* Shared Historical Period Selection Bar */}
      <HistoricalPeriodBar
        value={periodValue}
        onChange={setPeriodValue}
      />

      {/* SUBTAB 1: DOCTOR APPOINTMENTS */}
      {activeSubTab === 'appointments' && (
        <div className="space-y-6">
          {/* Top Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
              <span className="text-xs text-slate-500 font-bold">{isRtl ? 'إجمالي المواعيد' : 'Total Appts'}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalCount}</span>
            </div>
            <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
              <span className="text-xs text-amber-600 font-bold">{isRtl ? 'في انتظار التأكيد' : 'Pending'}</span>
              <span className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</span>
            </div>
            <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
              <span className="text-xs text-emerald-600 font-bold">{isRtl ? 'مؤكدة' : 'Confirmed'}</span>
              <span className="text-2xl font-black text-emerald-600 mt-2">{confirmedCount}</span>
            </div>
            <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
              <span className="text-xs text-blue-600 font-bold">{isRtl ? 'تم الحضور' : 'Attended'}</span>
              <span className="text-2xl font-black text-blue-600 mt-2">{completedCount}</span>
            </div>
            <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
              <span className="text-xs text-rose-600 font-bold">{isRtl ? 'ملغاة / مرفوضة' : 'Cancelled'}</span>
              <span className="text-2xl font-black text-rose-600 mt-2">{cancelledCount}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  placeholder={isRtl ? 'البحث بالاسم، المرجع الطبي، أو الملاحظات...' : 'Search by name, reference, MRN...'}
                  className={`w-full ${isRtl ? 'pl-3 pr-10' : 'pl-10 pr-3'} py-2.5 rounded-xl border text-xs focus:outline-none focus:border-teal-500 transition-all ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold">
                <span className="text-slate-500 whitespace-nowrap flex items-center gap-1">
                  <ListFilter className="w-3.5 h-3.5" />
                  {isRtl ? 'الحالة:' : 'Status:'}
                </span>
                {[
                  { id: 'all', label: isRtl ? 'الكل' : 'All' },
                  { id: 'pending', label: isRtl ? 'معلقة' : 'Pending' },
                  { id: 'confirmed', label: isRtl ? 'مؤكدة' : 'Confirmed' },
                  { id: 'attended', label: isRtl ? 'حضر' : 'Attended' },
                  { id: 'rescheduled', label: isRtl ? 'معاد جدولتها' : 'Rescheduled' },
                  { id: 'cancelled', label: isRtl ? 'ملغاة' : 'Cancelled' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === item.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments Table */}
            <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <table className="w-full text-xs">
                <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-bold' : 'bg-slate-100 text-slate-600 font-bold'}>
                  <tr>
                    <th className="p-3 font-mono text-start">{isRtl ? 'المرجع' : 'Reference'}</th>
                    <th className="p-3 text-start">{isRtl ? 'المريض' : 'Patient'}</th>
                    <th className="p-3 text-start">{isRtl ? 'تاريخ الموعد' : 'Date'}</th>
                    <th className="p-3 text-start">{isRtl ? 'التوقيت' : 'Time'}</th>
                    <th className="p-3 text-start">{isRtl ? 'الطبيب المعين' : 'Assigned Doctor'}</th>
                    <th className="p-3 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                  {isLoadingAppointments ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-600" />
                        {isRtl ? 'جاري تحميل المواعيد...' : 'Loading appointments...'}
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        {isRtl ? 'لا توجد مواعيد تطابق معايير البحث' : 'No appointments matching criteria'}
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((app) => {
                      const pName = app.patient?.name || app.patient_name || 'مريض غير مسجل';
                      const doctorName = app.doctor?.user?.name || app.doctor?.name || 'د. الطبيب المعني';

                      return (
                        <tr key={app.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="p-3 font-mono font-bold text-teal-600">
                            {app.booking_reference || app.id.slice(0, 8)}
                          </td>
                          <td className="p-3">
                            <strong className="block font-bold text-slate-900 dark:text-white">{pName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">{app.patient?.mrn || app.patient_mrn || app.patient_phone}</span>
                          </td>
                          <td className="p-3 font-mono font-bold">{app.appointment_date}</td>
                          <td className="p-3 font-mono text-slate-500">{app.time_slot}</td>
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{doctorName}</td>
                          <td className="p-3">{renderStatusBadge(app.status)}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirm(app.id, pName)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-xs"
                                >
                                  {isRtl ? 'تأكيد الموعد' : 'Confirm'}
                                </button>
                              )}
                              {app.status !== 'cancelled' && app.status !== 'rejected' && (
                                <>
                                  <button
                                    onClick={() => handleOpenReschedule(app)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                                  >
                                    {isRtl ? 'إعادة جدولة' : 'Reschedule'}
                                  </button>
                                  <button
                                    onClick={() => handleOpenCancel(app)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                                  >
                                    {isRtl ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Appointments Pagination Controls Footer */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t ${
              isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">
                  {isRtl ? `صفحة ${appointmentsPage} من ${appointmentsLastPage}` : `Page ${appointmentsPage} of ${appointmentsLastPage}`}
                </span>
                {appointmentsTotal > 0 && (
                  <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                  }`}>
                    {isRtl ? `إجمالي: ${appointmentsTotal}` : `Total: ${appointmentsTotal}`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={isRtl ? 'الصفحة السابقة' : 'Previous page'}
                  onClick={() => setAppointmentsPage((prev) => Math.max(1, prev - 1))}
                  disabled={appointmentsPage <= 1 || isLoadingAppointments}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    appointmentsPage <= 1 || isLoadingAppointments
                      ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                      : isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span>{isRtl ? 'السابق' : 'Previous'}</span>
                </button>

                <button
                  type="button"
                  aria-label={isRtl ? 'الصفحة التالية' : 'Next page'}
                  onClick={() => setAppointmentsPage((prev) => Math.min(appointmentsLastPage, prev + 1))}
                  disabled={appointmentsPage >= appointmentsLastPage || isLoadingAppointments}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    appointmentsPage >= appointmentsLastPage || isLoadingAppointments
                      ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                      : isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span>{isRtl ? 'التالي' : 'Next'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: EHR CLINICAL VISITS */}
      {activeSubTab === 'clinical_visits' && (
        <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {isRtl ? 'سجل الاستشارات الطبية السريرية المكتملة (EHR)' : 'Finalized Clinical Consultations (EHR)'}
            </h3>
            <span className="text-xs font-mono text-teal-600 font-bold">{visits.length} {isRtl ? 'زيارة موثقة' : 'visits'}</span>
          </div>

          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className="w-full text-xs">
              <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-bold' : 'bg-slate-100 text-slate-600 font-bold'}>
                <tr>
                  <th className="p-3 text-start">{t('table.date')}</th>
                  <th className="p-3 text-start">{t('table.patient')}</th>
                  <th className="p-3 text-center">{t('table.type')}</th>
                  <th className="p-3 text-start">{t('table.diagnosis')}</th>
                  <th className="p-3 text-center">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                      {t('table.noVisits')}
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono font-bold">{visit.date}</td>
                      <td className="p-3">
                        <strong className="block text-slate-900 dark:text-white">{visit.patientName}</strong>
                        <span className="text-[10px] text-blue-600 font-mono">{visit.patientMrn}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-teal-600">{visit.visitType}</td>
                      <td className="p-3 truncate max-w-[200px]">{visit.diagnosis}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedVisit(visit)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Clinical Visits Pagination Controls Footer */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t ${
            isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold">
                {isRtl ? `صفحة ${visitsPage} من ${visitsLastPage}` : `Page ${visitsPage} of ${visitsLastPage}`}
              </span>
              {visitsTotal > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                }`}>
                  {isRtl ? `إجمالي: ${visitsTotal}` : `Total: ${visitsTotal}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={isRtl ? 'الصفحة السابقة' : 'Previous page'}
                onClick={() => setVisitsPage((prev) => Math.max(1, prev - 1))}
                disabled={visitsPage <= 1 || isLoadingVisits}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  visitsPage <= 1 || isLoadingVisits
                    ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                    : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <span>{isRtl ? 'السابق' : 'Previous'}</span>
              </button>

              <button
                type="button"
                aria-label={isRtl ? 'الصفحة التالية' : 'Next page'}
                onClick={() => setVisitsPage((prev) => Math.min(visitsLastPage, prev + 1))}
                disabled={visitsPage >= visitsLastPage || isLoadingVisits}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  visitsPage >= visitsLastPage || isLoadingVisits
                    ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                    : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <span>{isRtl ? 'التالي' : 'Next'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{isRtl ? `إعادة جدولة موعد: ${reschedulingAppointment.patient?.name || reschedulingAppointment.patient_name}` : 'Reschedule Appointment'}</span>
              </h3>
              <button onClick={() => setReschedulingAppointment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleExecuteReschedule} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isRtl ? 'التاريخ الجديد للموعد' : 'New Appointment Date'}</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isRtl ? 'الفترة الزمنية الجديدة' : 'New Time Slot'}</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="08:00">08:00 - 09:00</option>
                  <option value="09:00">09:00 - 10:00</option>
                  <option value="10:00">10:00 - 11:00</option>
                  <option value="11:00">11:00 - 12:00</option>
                  <option value="12:00">12:00 - 13:00</option>
                  <option value="13:00">13:00 - 14:00</option>
                  <option value="14:00">14:00 - 15:00</option>
                  <option value="15:00">15:00 - 16:00</option>
                  <option value="16:00">16:00 - 17:00</option>
                  <option value="17:00">17:00 - 18:00</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingAppointment(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                >
                  {isRtl ? 'تأكيد الموعد الجديد' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-rose-600 text-sm flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>{isRtl ? 'تأكيد إلغاء الموعد الطبي' : 'Confirm Appointment Cancellation'}</span>
              </h3>
              <button onClick={() => setCancellingAppointment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleExecuteCancel} className="space-y-4 text-xs font-bold">
              <p className="text-slate-600 dark:text-slate-400">
                {isRtl ? `هل أنت متأكد من رغبتك في إلغاء موعد المريض (${cancellingAppointment.patient?.name || cancellingAppointment.patient_name}) رقم ${cancellingAppointment.booking_reference}؟` : `Cancel appointment for ${cancellingAppointment.patient?.name || cancellingAppointment.patient_name}?`}
              </p>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isRtl ? 'سبب الإلغاء' : 'Cancellation Reason'}</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppointment(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Keep Appointment'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                >
                  {isRtl ? 'تأكيد الإلغاء' : 'Cancel Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED VISIT MODAL */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${containerClass} w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-teal-600">{selectedVisit.id}</span>
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('table.view')}: {selectedVisit.patientName}
                  </h3>
                </div>
              </div>
              <button onClick={() => setSelectedVisit(null)} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">{t('table.date')}:</span>
                <strong className="block font-mono font-bold mt-0.5">{selectedVisit.date}</strong>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">{t('table.type')}:</span>
                <strong className="block font-bold text-teal-600 mt-0.5">{selectedVisit.visitType}</strong>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">{t('doctorLabel')}</span>
                <strong className="block font-bold mt-0.5">{selectedVisit.doctorName}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-teal-50/50 border-teal-200'}`}>
                <span className="font-bold block text-teal-800 dark:text-teal-300 mb-1">{t('table.diagnosis')}:</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedVisit.diagnosis}</p>
              </div>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold block text-slate-600 dark:text-slate-400 mb-1">{t('table.details')}:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{selectedVisit.notes}</p>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4">
              <button
                onClick={() => setSelectedVisit(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
