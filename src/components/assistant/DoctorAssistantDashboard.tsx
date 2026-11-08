'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ListFilter,
  Bell,
  Settings,
  User,
  FileText,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Phone,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Edit,
  X,
  Stethoscope,
  Building2,
  LogOut,
  Moon,
  Sun,
  MapPin,
  Activity,
  BarChart3,
  CheckSquare,
  Lock,
  RefreshCw,
  UserPlus,
  CheckCircle,
  CalendarDays,
  ScanLine,
  Coins,
  LayoutGrid,
  List,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ChevronDown,
  Filter,
  BadgeCheck,
  Mail,
  PieChart,
  Award,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/auth';
import { AssistantBookingWizard } from './AssistantBookingWizard';
import { GlobalDashboardHeader } from '../ui/GlobalDashboardHeader';
import { DocumentScanner } from '../shared/DocumentScanner';
import { appointmentService } from '@/services/appointmentService';
import { clinicService } from '@/services/clinicService';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { OperationalDayBar } from '../shared/OperationalDayBar';
import { UnresolvedReschedulesDashboard } from '../clinic/UnresolvedReschedulesDashboard';
import { AssistantRewardsView } from './rewards/AssistantRewardsView';

export const AssistantCapabilitiesCard: React.FC<{ isRtl: boolean; isDarkMode?: boolean }> = ({ isRtl, isDarkMode }) => {
  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'}`}>
      <div className={`flex items-center gap-3 border-b pb-3.5 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {isRtl ? 'مهام وصلاحيات مساعد الطبيب المعتمدة (Role Capabilities)' : 'Assistant Authorised Tasks & Security Ceiling'}
          </h3>
          <span className="text-[11px] text-slate-500 block font-medium">
            {isRtl ? 'استعراض دقيق للعمليات المصرح بها والقيود الأمنية وفق نظام 4D RBAC' : 'Official breakdown of authorized operations & 4D security ceiling'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Authorized Tasks */}
        <div className={`p-4 rounded-xl border border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2.5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <span className={`font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {isRtl ? 'المهام والعمليات المسموح بها (Authorised Tasks)' : 'Authorized Tasks'}
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
            <li>{isRtl ? 'إدارة قائمة الانتظار الحية واستدعاء المرضى (booking.manage_queue)' : 'Manage live waiting queue & call patients'}</li>
            <li>{isRtl ? 'تسجيل حضور المريض ومسح تذاكر QR (booking.confirm_attendance)' : 'Confirm patient attendance & scan QR passes'}</li>
            <li>{isRtl ? 'إنشاء وحجز المواعيد بالاستقبال (booking.create)' : 'Create & book appointments at reception (booking.create)'}</li>
            <li>{isRtl ? 'تأكيد المواعيد الطبية عند تفويضها من المدير (booking.confirm)' : 'Confirm medical appointments when delegated (booking.confirm)'}</li>
            <li>{isRtl ? 'إعادة جدولة وإلغاء المواعيد بناءً على طلب العيادة' : 'Reschedule & cancel clinic appointments'}</li>
            <li>{isRtl ? 'عرض معلومات الاتصال الأساسية للمريض (patient.view_contacts)' : 'View basic patient contact details'}</li>
          </ul>
        </div>

        {/* Restricted Clinical Ceiling */}
        <div className={`p-4 rounded-xl border border-rose-500/25 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <span className={`font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            {isRtl ? 'القيود السريرية والأمنية (Restricted Clinical Scope)' : 'Restricted Clinical Scope'}
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
            <li>{isRtl ? 'محظور: الاطلاع على السجل الطبي التخصصي (clinical.view_ehr)' : 'Forbidden: View specialized medical EHR records'}</li>
            <li>{isRtl ? 'محظور: كتابة أو تحرير الوصفات الطبية (clinical.write_rx)' : 'Forbidden: Write or issue medical prescriptions'}</li>
            <li>{isRtl ? 'محظور: اعتماد نتائج التحاليل والأشعة (diagnostic.approve_result)' : 'Forbidden: Finalize or approve diagnostic results'}</li>
            <li>{isRtl ? 'محظور: تعديل وإدارة حصص العيادة الخاصة بمراكز الحجز' : 'Forbidden: Manage clinic quota allocations for booking centers'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatSlotRange = (slotTime: string): string => {
  if (!slotTime) return '';
  const parts = slotTime.split(':');
  if (parts.length < 2) return slotTime;
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return slotTime;
  const minute = parts[1];
  const nextHour = (hour + 1) % 24;
  const startStr = `${String(hour).padStart(2, '0')}:${minute}`;
  const nextHourStr = `${String(nextHour).padStart(2, '0')}:${minute}`;
  return `${startStr} - ${nextHourStr}`;
};

interface DoctorAssistantDashboardProps {
  onBackToMainPlatform?: () => void;
}

export const DoctorAssistantDashboard: React.FC<DoctorAssistantDashboardProps> = ({
  onBackToMainPlatform
}) => {
  const t = useTranslations('doctorAssistant');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { user, logout, activeClinicId, hasPermission } = useAuth();
  const canManageQueue = hasPermission('booking.manage_queue');
  const canConfirmAttendance = hasPermission('booking.confirm_attendance');
  const canCreateBooking = hasPermission('booking.create');
  const canViewContacts = hasPermission('patient.view_contacts');
  const canConfirmAppointment = hasPermission('booking.confirm') || hasPermission('booking.confirm_quota');
  const [selectedOperationalDate, setSelectedOperationalDate] = useState<string>('');

  // Clinic doctors list for filter
  const [clinicDoctors, setClinicDoctors] = useState<{ id: string; name: string }[]>([]);

  // Tab 4 (Appointments) Filter & Data States
  const [appointmentsDateMode, setAppointmentsDateMode] = useState<'all' | 'today' | 'specific' | 'range'>('today');
  const [appointmentsDate, setAppointmentsDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointmentsFromDate, setAppointmentsFromDate] = useState<string>('');
  const [appointmentsToDate, setAppointmentsToDate] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Tab 2 (Today) Filter States
  const [todayStatusFilter, setTodayStatusFilter] = useState<string>('all');
  const [todaySearchTerm, setTodaySearchTerm] = useState<string>('');

  // Workstation Preferences (Settings)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [waitingRoomViewMode, setWaitingRoomViewMode] = useState<'cards' | 'table'>('cards');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout fallback completed', e);
    } finally {
      window.location.replace(`/${locale}`);
    }
  };

  const changeLanguage = (newLocale: string) => {
    const qs = searchParams ? searchParams.toString() : '';
    const fullPath = qs ? `${pathname}?${qs}` : pathname;
    router.replace(fullPath, { locale: newLocale as any });
  };

  React.useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (newTab === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const qs = params.toString();
    const targetUrl = qs ? `${pathname}?${qs}` : pathname;
    router.push(targetUrl, { scroll: false });
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [receptionSearchQuery, setReceptionSearchQuery] = useState('');

  // Live Queue Data
  const [queue, setQueue] = useState<any[]>([]);

  const fetchQueue = useCallback(async (targetDate?: string) => {
    try {
      const dateToFetch = targetDate !== undefined ? targetDate : selectedOperationalDate;
      const params: Record<string, string> = {};
      if (dateToFetch) {
        params.appointment_date = dateToFetch;
      }
      const res = await appointmentService.getAppointments(params);
      if (res.data && res.data.length > 0) {
        const liveQ = res.data.map((app) => ({
          id: app.id,
          bookingReference: app.booking_reference || '—',
          patientName: app.patient?.name || app.patient_name || '—',
          mrn: app.patient?.mrn || app.patient_mrn || '—',
          appointmentDate: app.appointment_date,
          timeSlot: app.time_slot,
          time: app.time_slot,
          status: app.status,
          priority: 'normal',
          phone: canViewContacts ? (app.patient?.phone || app.patient_phone || '—') : '—',
          doctorName: app.doctor?.user?.name || app.doctor?.name || '—',
          doctorId: app.doctor_id || app.doctor?.id,
          clinicId: app.clinic_id || app.clinic?.id,
          checked_in_at: app.checked_in_at || null
        }));
        setQueue(liveQ);
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    }
  }, [selectedOperationalDate, canViewContacts]);

  useEffect(() => {
    fetchQueue(selectedOperationalDate);
  }, [selectedOperationalDate, fetchQueue]);

  // Load clinic doctors for doctor filter
  useEffect(() => {
    if (!activeClinicId) return;
    clinicService.getClinic(activeClinicId).then(res => {
      if (res.data) {
        const docList: { id: string; name: string }[] = [];
        if (res.data.director?.id && res.data.director?.name) {
          docList.push({ id: res.data.director.id, name: res.data.director.name });
        }
        if (res.data.doctors) {
          res.data.doctors.forEach(d => {
            if (d.id && d.name && !docList.some(existing => existing.id === d.id)) {
              docList.push({ id: d.id, name: d.name });
            }
          });
        }
        setClinicDoctors(docList);
      }
    }).catch(() => {});
  }, [activeClinicId]);

  // Server-side filtered appointment fetch for Tab 4
  const fetchAppointments = useCallback(async () => {
    if (!canManageQueue) return;
    setLoadingAppointments(true);
    setAppointmentsError(null);
    try {
      const params: Record<string, string> = {};
      if (appointmentsDateMode === 'today') {
        params.appointment_date = new Date().toISOString().split('T')[0];
      } else if (appointmentsDateMode === 'specific' && appointmentsDate) {
        params.appointment_date = appointmentsDate;
      } else if (appointmentsDateMode === 'range') {
        if (appointmentsFromDate) params.from_date = appointmentsFromDate;
        if (appointmentsToDate) params.to_date = appointmentsToDate;
      }
      if (selectedDoctorId) {
        params.doctor_id = selectedDoctorId;
      }
      const res = await appointmentService.getAppointments(params);
      if (res.data) {
        const mapped = res.data.map((app) => ({
          id: app.id,
          bookingReference: app.booking_reference || '—',
          patientName: app.patient?.name || app.patient_name || '—',
          mrn: app.patient?.mrn || app.patient_mrn || '—',
          appointmentDate: app.appointment_date,
          timeSlot: app.time_slot,
          time: app.time_slot,
          status: app.status,
          priority: 'normal',
          phone: canViewContacts ? (app.patient?.phone || app.patient_phone || '—') : '—',
          doctorName: app.doctor?.user?.name || app.doctor?.name || '—',
          doctorId: app.doctor_id || app.doctor?.id,
          clinicId: app.clinic_id || app.clinic?.id,
          checked_in_at: app.checked_in_at || null,
        }));
        setAppointmentsList(mapped);
      } else {
        setAppointmentsList([]);
      }
    } catch (err: any) {
      setAppointmentsError(err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء تحميل المواعيد' : 'Error loading appointments'));
      setAppointmentsList([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [canManageQueue, canViewContacts, appointmentsDateMode, appointmentsDate, appointmentsFromDate, appointmentsToDate, selectedDoctorId, isRtl]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, [activeTab, fetchAppointments]);

  const handleConfirmAppointment = async (id: string) => {
    if (!canConfirmAppointment) return;
    setConfirmingId(id);
    try {
      await appointmentService.confirmAppointment(id);
      await fetchAppointments();
      await fetchQueue();
      triggerNotice(isRtl ? 'تم تأكيد الموعد بنجاح' : 'Appointment confirmed successfully');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || (isRtl ? 'فشل تأكيد الموعد' : 'Failed to confirm appointment'));
    } finally {
      setConfirmingId(null);
    }
  };

  // Dynamic calculations for selected operational date (preserving YYYY-MM-DD contract)
  const effectiveDate = selectedOperationalDate || new Date().toISOString().split('T')[0];
  const todayAppointments = queue.filter(a => !a.appointmentDate || a.appointmentDate === effectiveDate);
  
  // Unarrived: confirmed/pending without check-in on effective date
  const unarrivedCount = todayAppointments.filter(a => (a.status === 'confirmed' || a.status === 'pending') && !a.checked_in_at).length;
  
  // Checked in: arrived/waiting/examination/attended or checked_in_at present
  const checkedInCount = todayAppointments.filter(a => a.status === 'arrived' || a.status === 'waiting' || a.status === 'examination' || a.status === 'attended' || Boolean(a.checked_in_at)).length;
  const lateCount = todayAppointments.filter(a => a.status === 'late').length;
  const reviewCount = todayAppointments.filter(a => a.status === 'pending').length;

  const todayTotalCount = todayAppointments.length;
  
  // Live waiting room queue (strictly patients eligible for waiting room on effective date)
  const waitingRoomQueue = queue.filter(q => 
    (!q.appointmentDate || q.appointmentDate === effectiveDate) && 
    (q.status === 'waiting' || q.status === 'arrived' || q.status === 'examination' || q.status === 'attended' || Boolean(q.checked_in_at))
  );
  const inWaitingRoomCount = waitingRoomQueue.length;
  const inExaminationCount = todayAppointments.filter(a => a.status === 'examination').length;
  const completedCount = todayAppointments.filter(a => a.status === 'completed' || a.status === 'attended').length;
  const noShowCount = todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'rejected' || a.status === 'absent').length;

  // Filtered Today Appointments
  const filteredTodayAppointments = useMemo(() => {
    return todayAppointments.filter((app) => {
      const matchesSearch =
        !todaySearchTerm.trim() ||
        app.patientName.toLowerCase().includes(todaySearchTerm.toLowerCase()) ||
        app.bookingReference.toLowerCase().includes(todaySearchTerm.toLowerCase()) ||
        (app.phone && app.phone.includes(todaySearchTerm));

      if (!matchesSearch) return false;

      if (todayStatusFilter === 'all') return true;
      if (todayStatusFilter === 'waiting') return app.status === 'waiting' || app.status === 'arrived';
      if (todayStatusFilter === 'examination') return app.status === 'examination';
      if (todayStatusFilter === 'completed') return app.status === 'completed' || app.status === 'attended';
      if (todayStatusFilter === 'pending') return app.status === 'pending';
      if (todayStatusFilter === 'confirmed') return app.status === 'confirmed';
      if (todayStatusFilter === 'absent') return app.status === 'cancelled' || app.status === 'rejected' || app.status === 'absent';
      return app.status === todayStatusFilter;
    });
  }, [todayAppointments, todaySearchTerm, todayStatusFilter]);

  // Operational Statistics for Tab 8 (Reports)
  const attendanceRate = todayTotalCount > 0 
    ? Math.round((checkedInCount / todayTotalCount) * 100) 
    : 0;
  
  const completionRate = todayTotalCount > 0 
    ? Math.round((completedCount / todayTotalCount) * 100) 
    : 0;

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showNewBookingWizard, setShowNewBookingWizard] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<any>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState<boolean>(false);
  const [rescheduleSlotsError, setRescheduleSlotsError] = useState<string | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setNoticeMessage(msg);
    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch {}
    }
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  useEffect(() => {
    if (!showRescheduleModal?.clinicId || !showRescheduleModal?.doctorId || !showRescheduleModal?.appointment_date) {
      setRescheduleSlots([]);
      return;
    }

    let isMounted = true;
    setLoadingRescheduleSlots(true);
    setRescheduleSlotsError(null);

    appointmentService.getSlots(
      showRescheduleModal.clinicId,
      showRescheduleModal.doctorId,
      showRescheduleModal.appointment_date
    ).then((res) => {
      if (!isMounted) return;
      const rawSlots = res.data?.slots || res.data || [];
      const slotsList = Array.isArray(rawSlots) ? rawSlots : [];
      setRescheduleSlots(slotsList);
    }).catch((err: any) => {
      if (!isMounted) return;
      setRescheduleSlots([]);
      setRescheduleSlotsError(
        err?.response?.data?.message || err?.message || (isRtl ? 'تعذر تحميل الفترات الزمنية المتاحة.' : 'Failed to load available time slots.')
      );
    }).finally(() => {
      if (isMounted) {
        setLoadingRescheduleSlots(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [showRescheduleModal?.clinicId, showRescheduleModal?.doctorId, showRescheduleModal?.appointment_date, isRtl]);

  const handleOpenReschedule = (app: any) => {
    const todayStr = getLocalDateString();
    const origDate = app.appointmentDate || todayStr;
    const initialDate = origDate >= todayStr ? origDate : todayStr;
    const origSlot = app.timeSlot || app.time || '';
    const resolvedClinicId = app.clinicId || activeClinicId || user?.clinic?.id || '';
    const resolvedDoctorId = app.doctorId || selectedDoctorId || clinicDoctors[0]?.id || '';

    setShowRescheduleModal({
      id: app.id,
      patientName: app.patientName,
      doctorName: app.doctorName,
      clinicId: resolvedClinicId,
      doctorId: resolvedDoctorId,
      originalDate: origDate,
      originalTimeSlot: origSlot,
      appointment_date: initialDate,
      time_slot: origSlot,
    });
  };

  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRescheduleModal || submittingReschedule) return;

    if (
      showRescheduleModal.appointment_date === showRescheduleModal.originalDate &&
      showRescheduleModal.time_slot === showRescheduleModal.originalTimeSlot
    ) {
      triggerNotice(isRtl ? 'يرجى اختيار تاريخ أو فترة زمنية مختلفة عن الموعد الحالي.' : 'Please select a date or time slot different from the current appointment.');
      return;
    }

    if (!showRescheduleModal.time_slot) {
      triggerNotice(isRtl ? 'يرجى اختيار فترة زمنية.' : 'Please select a time slot.');
      return;
    }

    setSubmittingReschedule(true);
    try {
      await appointmentService.rescheduleAppointment(showRescheduleModal.id, {
        appointment_date: showRescheduleModal.appointment_date,
        time_slot: showRescheduleModal.time_slot,
      });
      triggerNotice(isRtl ? `تمت إعادة جدولة موعد المريض ${showRescheduleModal.patientName} بنجاح.` : `Appointment rescheduled successfully.`);
      setShowRescheduleModal(null);
      await fetchQueue();
      if (activeTab === 'appointments') {
        await fetchAppointments();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء إعادة الجدولة.' : 'Failed to reschedule appointment.');
      triggerNotice(errMsg);
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleCancelAppointment = async (appId: string, patientName: string) => {
    if (confirm(isRtl ? `هل أنت متأكد من رغبتك في إلغاء موعد المريض ${patientName}؟` : `Cancel appointment for ${patientName}?`)) {
      try {
        await appointmentService.cancelAppointment(appId, 'إلغاء الموعد بناءً على طلب العيادة');
        triggerNotice(isRtl ? `تم إلغاء موعد المريض ${patientName} بنجاح.` : `Appointment cancelled successfully.`);
        await fetchQueue();
        if (activeTab === 'appointments') {
          await fetchAppointments();
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء إلغاء الموعد.' : 'Failed to cancel appointment.');
        triggerNotice(msg);
      }
    }
  };

  const handleAddBooking = (newBooking: any) => {
    triggerNotice(isRtl ? `تم إنشاء الحجز بنجاح برقم المرجع ${newBooking.refNumber || ''}` : `Booking created successfully with ref number ${newBooking.refNumber || ''}`);
    setShowNewBookingWizard(false);
    fetchQueue();
  };

  const handleConfirmAttendance = (patient: any) => {
    const isAlreadyInQueue = queue.find(q => q.mrn === patient.mrn && patient.mrn !== '—');
    
    if (isAlreadyInQueue) {
      triggerNotice(isRtl ? `المريض ${patient.patientName} موجود بالفعل في قائمة الانتظار.` : `Patient ${patient.patientName} is already in the queue.`);
      return;
    }

    const nextIdNum = queue.length + 1;
    const newQueueEntry = {
      id: patient.id || `Q-${nextIdNum}`,
      patientName: patient.patientName,
      mrn: patient.mrn,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: 'waiting',
      priority: 'normal',
      phone: patient.phone,
      doctorName: patient.doctorName || '—'
    };

    setQueue(prev => [...prev, newQueueEntry]);
    triggerNotice(isRtl ? `تم تأكيد حضور المريض ${patient.patientName} وتمت إضافته لقائمة الانتظار بنجاح.` : `Patient ${patient.patientName} attendance confirmed and added to queue successfully.`);
  };

  const containerClass = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white shadow-xs'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs';

  // Navigation Items with Categorized Hierarchy
  const operationalNavItems = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: Activity },
    { id: 'today', label: t('tabs.today'), icon: Clock, badge: todayTotalCount > 0 ? `${todayTotalCount}` : undefined },
    { id: 'waiting-room', label: t('tabs.waitingRoom'), icon: Users, badge: inWaitingRoomCount > 0 ? `${inWaitingRoomCount}` : undefined, pulse: inWaitingRoomCount > 0 },
    { id: 'appointments', label: t('tabs.appointments'), icon: Calendar },
    { id: 'reception', label: t('tabs.reception'), icon: UserCheck }
  ];

  const administrativeNavItems = [
    { id: 'unresolved-reschedules', label: isRtl ? 'إعادة الجدولة المعلقة' : 'Unresolved Reschedules', icon: ShieldAlert },
    { id: 'rewards', label: t('tabs.rewards'), icon: Coins },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart3 }
  ];

  const systemNavItems = [
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'settings', label: t('tabs.settings'), icon: Settings }
  ];

  // Reception search filtering against real loaded queue
  const matchingReceptionPatients = receptionSearchQuery.trim()
    ? queue.filter(q =>
        q.patientName.toLowerCase().includes(receptionSearchQuery.trim().toLowerCase()) ||
        q.mrn.toLowerCase().includes(receptionSearchQuery.trim().toLowerCase()) ||
        q.phone.includes(receptionSearchQuery.trim())
      )
    : [];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'} font-sans antialiased`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Clinical Header Bar */}
      <GlobalDashboardHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onBackToMain={onBackToMainPlatform}
        headerActions={
          <div className="flex items-center gap-2">
            {canCreateBooking && (
              <button
                onClick={() => setShowNewBookingWizard(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('dashboard.newBooking')}</span>
              </button>
            )}

            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={t('dashboard.scanDoc')}
            >
              <ScanLine className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden md:inline">{t('dashboard.scanDoc')}</span>
            </button>
          </div>
        }
      />

      {/* Notice Floating Toast */}
      {noticeMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs px-4 py-2.5 font-bold rounded-2xl shadow-xl flex items-center gap-2 border border-teal-500/30 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        </div>
      )}

      {/* New Booking Wizard Overlay */}
      {showNewBookingWizard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 relative border border-slate-200 dark:border-slate-800 shadow-2xl">
            <button
              onClick={() => setShowNewBookingWizard(false)}
              className={`absolute p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-10 ${isRtl ? 'left-5 top-5' : 'right-5 top-5'}`}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="pt-2">
              <AssistantBookingWizard
                clinicId={user?.clinic?.id || activeClinicId || ''}
                onSuccess={handleAddBooking}
                onCancel={() => setShowNewBookingWizard(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Scanner Overlay */}
      <DocumentScanner 
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          fetchQueue();
        }}
        onScanSuccess={(code, appData) => {
          fetchQueue();
          if (appData) {
            const patientName = appData.patient?.name || appData.patient_name || (isRtl ? 'المريض' : 'Patient');
            triggerNotice(isRtl ? `تم تأكيد حضور الموعد بنجاح للمريض: ${patientName}` : `Appointment check-in confirmed for ${patientName}`);
          } else {
            triggerNotice(t('docVerifiedNotice', { code }));
          }
        }}
        isDarkMode={isDarkMode}
      />

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row gap-5">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 space-y-3 shrink-0">
          
          {/* Active Shift Card */}
          <div className={`${containerClass} rounded-2xl p-4 border space-y-2.5`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">{t('shift.title')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('shift.activeNow')}
              </span>
            </div>
            <div className={`text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <strong className="block text-slate-900 dark:text-white font-bold text-sm">
                {user?.name || (isRtl ? 'مساعد العيادة' : 'Clinic Assistant')}
              </strong>
              <span className="text-slate-400 block text-[11px] mt-0.5 font-mono truncate">
                {user?.email || '—'}
              </span>
            </div>
          </div>

          {/* Nav Categories */}
          <div className={`${containerClass} rounded-2xl p-2.5 border space-y-3`}>
            
            {/* Operational Section */}
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isRtl ? 'العمليات الميدانية والانتظار' : 'Clinical Ops & Triage'}
              </div>
              {operationalNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.pulse 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Administrative / Coordination Section */}
            <div className="space-y-0.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isRtl ? 'المتابعة والتنسيق' : 'Coordination & ARP'}
              </div>
              {administrativeNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* System / Profile Section */}
            <div className="space-y-0.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isRtl ? 'النظام والصلاحيات' : 'System & Security'}
              </div>
              {systemNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* 4D RBAC Ceiling Notice */}
          <div className={`${containerClass} rounded-2xl p-3.5 border text-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800`}>
            <div className={`flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{isRtl ? 'حماية RBAC 4D نشطة' : '4D RBAC Active'}</span>
            </div>
            <p className={`text-[10.5px] text-slate-500 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'صلاحيات إدارية واستقبالية مصرح بها. الوصول للسجلات السريرية التخصصية والوصفات محظور أمنياً.' : 'Receptionist & triage scope authorized. Specialized clinical EHR & prescriptions restricted.'}
            </p>
          </div>

        </aside>

        {/* Main Operational Workspace */}
        <main className="flex-1 space-y-5 min-w-0">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              
              {/* Header Action Bar */}
              <div className={`${containerClass} rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4 bg-gradient-to-l from-teal-500/5 via-transparent to-transparent`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800">
                      /assistant/dashboard
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {t('dashboard.title')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('dashboard.subtitle')}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {canCreateBooking && (
                    <button
                      onClick={() => setShowNewBookingWizard(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-teal-700/20"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>{t('dashboard.newBooking')}</span>
                    </button>
                  )}

                  {canConfirmAttendance && (
                    <button
                      onClick={() => setShowCheckInModal(true)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>{t('dashboard.checkIn')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowScanner(true)}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{t('dashboard.scanDoc')}</span>
                  </button>
                </div>
              </div>

              {/* Shared Operational Day Bar */}
              <OperationalDayBar
                selectedDate={selectedOperationalDate}
                onDateChange={setSelectedOperationalDate}
              />

              {/* 4 Clinical KPI Pulse Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Total Appointments */}
                <div className={`${containerClass} p-4 rounded-2xl border ${isRtl ? 'text-right' : 'text-left'} relative overflow-hidden group`}>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold">{t('dashboard.stats.todayAppointments')}</span>
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {todayTotalCount}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-bold text-teal-600 dark:text-teal-400">
                    <span>{t('dashboard.stats.remaining', { count: queue.filter(a => a.status === 'pending' || a.status === 'confirmed').length })}</span>
                  </div>
                </div>

                {/* In Waiting Room */}
                <div className={`${containerClass} p-4 rounded-2xl border ${isRtl ? 'text-right' : 'text-left'} relative overflow-hidden border-amber-500/20 bg-amber-500/5`}>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{t('dashboard.stats.inWaitingRoom')}</span>
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                    {inWaitingRoomCount}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{isRtl ? 'بانتظار دور الكشف' : 'Waiting for doctor'}</span>
                  </div>
                </div>

                {/* Attended & Completed */}
                <div className={`${containerClass} p-4 rounded-2xl border ${isRtl ? 'text-right' : 'text-left'} relative overflow-hidden border-emerald-500/20 bg-emerald-500/5`}>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{t('dashboard.stats.completed')}</span>
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    {completedCount}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span>{isRtl ? `تم استكمال الفحص` : 'Finished consultation'}</span>
                  </div>
                </div>

                {/* No-Show / Cancelled */}
                <div className={`${containerClass} p-4 rounded-2xl border ${isRtl ? 'text-right' : 'text-left'} relative overflow-hidden border-rose-500/20 bg-rose-500/5`}>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300">{t('dashboard.stats.noShow')}</span>
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                    {noShowCount}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
                    <span>{isRtl ? 'ملغاة / لم يحضروا' : 'Cancelled / Absent'}</span>
                  </div>
                </div>

              </div>

              {/* Triage Tasks Deck (مهامي التشغيلية) */}
              <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
                <div className={`flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{t('dashboard.tasksTitle')}</h3>
                      <span className="text-[11px] text-slate-500 block font-medium">{t('dashboard.tasksSubtitle')}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {t('dashboard.criticalTasks', { count: unarrivedCount + reviewCount })}
                  </span>
                </div>

                {/* Doctor's Live Directive Bar */}
                <div className={`p-3.5 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className={`text-xs space-y-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <strong className="font-bold block">{t('dashboard.instructionTitle')}</strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      {isRtl ? 'لا توجد تعليمات حية من الطبيب حالياً. يرجى متابعة تدفق قائمة الانتظار بانتظام.' : 'No active directives from doctor. Please maintain queue triage regularly.'}
                    </p>
                  </div>
                </div>

                {/* Triage Grid Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  
                  {/* Unarrived */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {isRtl ? 'لم يصلوا بعد' : 'Not Arrived Yet'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                        {isRtl ? `${unarrivedCount} مرضى` : `${unarrivedCount} Patients`}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] leading-tight ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'مواعيد بانتظار تأكيد الحضور' : 'Appointments awaiting arrival'}</p>
                    <button
                      onClick={() => triggerNotice(t('kpis.sentSmsSuccess'))}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-lg text-[10.5px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'إرسال تذكير سريع SMS' : 'Send Quick SMS'}
                    </button>
                  </div>

                  {/* Waiting in Queue */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {t('kpis.checkedIn')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                        {t('kpis.patientsCount', { count: checkedInCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] leading-tight ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.readyWaiting')}</p>
                    <button
                      onClick={() => handleTabChange('waiting-room')}
                      className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-[10.5px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'إدارة القائمة الحية' : 'Manage Live Queue'}
                    </button>
                  </div>

                  {/* Late Patients */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        {t('kpis.latePatients')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                        {t('kpis.patientsCount', { count: lateCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] leading-tight ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.lateDesc')}</p>
                    <button
                      onClick={() => triggerNotice(t('kpis.calledLateSuccess'))}
                      className={`w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-[10.5px] cursor-pointer transition-all flex items-center justify-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>{t('kpis.confirmCall')}</span>
                    </button>
                  </div>

                  {/* Appointments Needing Review */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-3.5 h-3.5 text-teal-500" />
                        {t('kpis.needReview')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                        {t('kpis.apptsCount', { count: reviewCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] leading-tight ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.reviewDesc')}</p>
                    <button
                      onClick={() => handleTabChange('appointments')}
                      className="w-full py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold rounded-lg text-[10.5px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'مراجعة الحجوزات' : 'Review Appts'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Live Queue Overview Table */}
              <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
                <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-white ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>{t('waitingRoom.title')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
                      {waitingRoomQueue.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => handleTabChange('waiting-room')}
                    className={`text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}
                  >
                    <span>{t('waitingRoom.fullScreen')}</span>
                    <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="p-3 font-mono">{t('waitingRoom.table.queueNum')}</th>
                        <th className="p-3">{t('waitingRoom.table.patientName')}</th>
                        <th className="p-3">{t('waitingRoom.table.time')}</th>
                        <th className="p-3">{t('waitingRoom.table.status')}</th>
                        <th className="p-3 text-center">{t('waitingRoom.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {waitingRoomQueue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold text-xs">
                            {isRtl ? 'لا يوجد مرضى حالياً في قائمة الانتظار الحية لهذه الجلسة التشغيلية' : 'No patients currently in live waiting room for this operational day'}
                          </td>
                        </tr>
                      ) : (
                        waitingRoomQueue.map((q, idx) => (
                          <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                              #{String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="p-3">
                              <strong className="block text-slate-900 dark:text-white font-bold">{q.patientName}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{q.mrn !== '—' ? q.mrn : q.bookingReference}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-500 text-[11px]">{q.time}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                q.status === 'attended' || q.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                q.status === 'examination' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                                q.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}>
                                {t(`waitingRoom.status.${q.status}`) || q.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => triggerNotice(isRtl ? `تم استدعاء المريض ${q.patientName} بنجاح إلى العيادة` : `Patient ${q.patientName} called to clinic successfully`)}
                                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10.5px] cursor-pointer shadow-2xs transition-all"
                              >
                                {t('waitingRoom.actions.callToClinic')}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TODAY'S SCHEDULE & TIMELINE */}
          {activeTab === 'today' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              
              {/* Header with Date & Pulse */}
              <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/today</span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <span>{isRtl ? `جدول مواعيد اليوم (${effectiveDate})` : `Today's Schedule (${effectiveDate})`}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl ? 'إدارة وصول ومتابعة جميع المرضى المقيدين ضمن الجلسة اليومية الحالية' : 'Track and manage all appointments scheduled for the current clinic session'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                    {todayAppointments.length} {isRtl ? 'حجز مسجل' : 'Total Appts'}
                  </span>
                </div>
              </div>

              {/* Today Quick Triage Filter Chips & Search */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Status Pills */}
                  <div className={`flex flex-wrap items-center gap-1.5 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                    {[
                      { id: 'all', label: isRtl ? 'الكل' : 'All', count: todayAppointments.length },
                      { id: 'waiting', label: isRtl ? 'في الانتظار' : 'Waiting', count: todayAppointments.filter(a => a.status === 'waiting' || a.status === 'arrived').length },
                      { id: 'examination', label: isRtl ? 'داخل الكشف' : 'In Exam', count: inExaminationCount },
                      { id: 'completed', label: isRtl ? 'مكتمل' : 'Completed', count: completedCount },
                      { id: 'confirmed', label: isRtl ? 'مؤكد (لم يحضر بعد)' : 'Confirmed', count: unarrivedCount },
                      { id: 'absent', label: isRtl ? 'غائب / ملغى' : 'Absent', count: noShowCount },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setTodayStatusFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          todayStatusFilter === chip.id
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          todayStatusFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Search input for today */}
                  <div className="relative min-w-[200px]">
                    <Search className={`w-3.5 h-3.5 absolute top-2.5 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      value={todaySearchTerm}
                      onChange={(e) => setTodaySearchTerm(e.target.value)}
                      placeholder={isRtl ? 'بحث في مواعيد اليوم...' : 'Search today...'}
                      className={`w-full py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                        isRtl ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
                      }`}
                    />
                  </div>

                </div>
              </div>

              {/* Appointments List / Cards */}
              <div className="space-y-2.5">
                {filteredTodayAppointments.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold text-xs border rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
                    {isRtl ? 'لا توجد مواعيد مطابقة لخيارات الفلترة المحددة اليوم' : 'No appointments matching current filter for today'}
                  </div>
                ) : (
                  filteredTodayAppointments.map((item, idx) => (
                    <div key={item.id || idx} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                      item.status === 'examination' 
                        ? 'border-teal-500/40 bg-teal-500/5 ring-1 ring-teal-500/20' 
                        : item.status === 'waiting'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    } ${isRtl ? 'text-right' : 'text-left'}`}>
                      
                      <div className={`flex items-center gap-3.5 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className="flex flex-col items-center justify-center min-w-[65px] px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60">
                          <span className="font-mono font-extrabold text-teal-700 dark:text-teal-300 text-xs">
                            {item.timeSlot || item.time || '—'}
                          </span>
                          <span className="text-[9.5px] text-teal-600/80 font-mono font-bold">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>

                        <div>
                          <strong className="block text-slate-900 dark:text-white text-sm font-extrabold">{item.patientName}</strong>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono mt-0.5">
                            <span>MRN: {item.mrn !== '—' ? item.mrn : item.bookingReference}</span>
                            {item.phone && item.phone !== '—' && (
                              <>
                                <span>•</span>
                                <span>{item.phone}</span>
                              </>
                            )}
                            {item.doctorName && item.doctorName !== '—' && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 dark:text-slate-300 font-sans font-medium">{item.doctorName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${
                          item.status === 'completed' || item.status === 'attended' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                          item.status === 'examination' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                          item.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {t(`waitingRoom.status.${item.status}`) || item.status}
                        </span>

                        {/* Quick Check-in action if not checked in */}
                        {canConfirmAttendance && !item.checked_in_at && item.status !== 'attended' && item.status !== 'completed' && item.status !== 'waiting' && item.status !== 'examination' && (
                          <button
                            onClick={() => {
                              handleConfirmAttendance({
                                id: item.id,
                                patientName: item.patientName,
                                mrn: item.mrn,
                                phone: item.phone,
                                doctorName: item.doctorName
                              });
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-all shadow-2xs"
                          >
                            {t('today.confirmArrival')}
                          </button>
                        )}

                        {/* If in waiting room: Call action */}
                        {(item.status === 'waiting' || item.status === 'arrived') && (
                          <button
                            onClick={() => triggerNotice(isRtl ? `تم استدعاء المريض ${item.patientName} بنجاح إلى العيادة` : `Patient ${item.patientName} called to clinic successfully`)}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] cursor-pointer transition-all shadow-2xs flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{t('waitingRoom.actions.callToClinic')}</span>
                          </button>
                        )}

                        {/* Reschedule Button */}
                        {!['attended', 'completed', 'cancelled', 'rejected', 'expired'].includes(item.status) && (
                          <button
                            onClick={() => handleOpenReschedule(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10.5px] cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            {t('today.table.reschedule')}
                          </button>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: WAITING ROOM & LIVE QUEUE */}
          {activeTab === 'waiting-room' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              {!canManageQueue ? (
                <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed rounded-xl">
                  <ShieldAlert className="w-8 h-8 mx-auto text-amber-500" />
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    {isRtl ? 'صلاحية إدارة قائمة الانتظار غير مفوضة' : 'Queue Management Permission Required'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تم سحب صلاحية إدارة واستعراض قائمة الانتظار من قبل مدير العيادة.' : 'Access to appointment queue has been revoked by clinic director.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/waiting-room</span>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{t('waitingRoom.title')}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono font-bold">
                          {waitingRoomQueue.length} {isRtl ? 'مرضى' : 'patients'}
                        </span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* View Mode Toggle */}
                      <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                        <button
                          onClick={() => setWaitingRoomViewMode('cards')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            waitingRoomViewMode === 'cards' 
                              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={isRtl ? 'عرض البطاقات' : 'Cards view'}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setWaitingRoomViewMode('table')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            waitingRoomViewMode === 'table' 
                              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={isRtl ? 'عرض الجدول' : 'Table view'}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => triggerNotice(t('today.nextCalled'))}
                        className={`px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 ring-1 ring-teal-700/20 ${isRtl ? 'flex-row-reverse' : ''}`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{t('waitingRoom.callNext')}</span>
                      </button>
                    </div>
                  </div>

                  {waitingRoomQueue.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold text-xs border rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
                      {isRtl ? 'لا يوجد مرضى حالياً في قائمة الانتظار الحية لهذا اليوم التشغيلي' : 'No patients currently in waiting queue for this operational day'}
                    </div>
                  ) : waitingRoomViewMode === 'cards' ? (
                    /* Cards Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {waitingRoomQueue.map((item, idx) => (
                        <div key={item.id} className={`p-4 rounded-2xl border space-y-3.5 transition-all ${
                          item.status === 'examination' 
                            ? 'border-teal-500/40 bg-teal-500/5 ring-1 ring-teal-500/20' 
                            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:shadow-xs'
                        } ${isRtl ? 'text-right' : 'text-left'}`}>
                          
                          <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-black text-xs flex items-center justify-center border border-teal-500/20">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="font-mono font-bold text-slate-600 dark:text-slate-400 text-xs">{item.bookingReference || item.id}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                              {item.time}
                            </span>
                          </div>

                          <div>
                            <strong className="block text-slate-900 dark:text-white font-extrabold text-sm">{item.patientName}</strong>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono mt-0.5">
                              <span>MRN: {item.mrn !== '—' ? item.mrn : '—'}</span>
                              {item.phone && item.phone !== '—' && (
                                <>
                                  <span>•</span>
                                  <span>{item.phone}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.status === 'examination' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                              item.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>
                              {t(`waitingRoom.status.${item.status}`) || item.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {item.doctorName !== '—' ? item.doctorName : ''}
                            </span>
                          </div>

                          <div className={`flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <button
                              onClick={() => triggerNotice(isRtl ? `تم استدعاء المريض ${item.patientName} بنجاح إلى العيادة` : `Patient ${item.patientName} called to clinic successfully`)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-[10.5px] cursor-pointer shadow-2xs transition-all flex items-center gap-1"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{t('waitingRoom.actions.callToClinic')}</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => triggerNotice(isRtl ? `تم تأجيل دور المريض ${item.patientName}` : `Patient ${item.patientName} turn postponed`)}
                                className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[10.5px] cursor-pointer"
                              >
                                {t('waitingRoom.actions.postpone')}
                              </button>

                              <button
                                onClick={() => triggerNotice(isRtl ? `تم تسجيل المريض ${item.patientName} كـ غائب` : `Patient ${item.patientName} marked as absent`)}
                                className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[10.5px] cursor-pointer"
                              >
                                {t('waitingRoom.actions.considerAbsent')}
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800">
                          <tr>
                            <th className="p-3 font-mono">#</th>
                            <th className="p-3">{t('today.table.ref')}</th>
                            <th className="p-3">{t('waitingRoom.table.patientName')}</th>
                            <th className="p-3">{t('waitingRoom.table.time')}</th>
                            <th className="p-3">{isRtl ? 'الطبيب' : 'Doctor'}</th>
                            <th className="p-3">{t('waitingRoom.table.status')}</th>
                            <th className="p-3 text-center">{t('waitingRoom.table.action')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {waitingRoomQueue.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-mono font-bold text-teal-600">{idx + 1}</td>
                              <td className="p-3 font-mono text-slate-500">{item.bookingReference || item.id}</td>
                              <td className="p-3">
                                <strong className="block text-slate-900 dark:text-white font-bold">{item.patientName}</strong>
                                <span className="text-[10px] text-slate-400 font-mono">{item.mrn}</span>
                              </td>
                              <td className="p-3 font-mono text-slate-500">{item.time}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{item.doctorName}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.status === 'examination' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                                  item.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}>
                                  {t(`waitingRoom.status.${item.status}`) || item.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => triggerNotice(isRtl ? `تم استدعاء المريض ${item.patientName} بنجاح` : `Patient ${item.patientName} called`)}
                                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10.5px] cursor-pointer"
                                >
                                  {t('waitingRoom.actions.callToClinic')}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: APPOINTMENTS MANAGEMENT */}
          {activeTab === 'appointments' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              {!canManageQueue ? (
                <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed rounded-xl">
                  <ShieldAlert className="w-8 h-8 mx-auto text-amber-500" />
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    {isRtl ? 'صلاحية استعراض المواعيد غير مفوضة' : 'Appointment List Permission Required'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تم سحب صلاحية إدارة واستعراض قائمة المواعيد من قبل مدير العيادة.' : 'Access to appointment list has been revoked by clinic director.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className={`flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/appointments</span>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('tabs.appointments')}</h2>
                    </div>
                    {canCreateBooking && (
                      <button
                        onClick={() => setShowNewBookingWizard(true)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-teal-700/20"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>{t('dashboard.newBooking')}</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Controls Bar */}
                  <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className={`flex flex-wrap items-center gap-3 justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      {/* Date Mode Segmented Buttons */}
                      <div className={`flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setAppointmentsDateMode('today')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            appointmentsDateMode === 'today'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isRtl ? 'اليوم' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentsDateMode('specific')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            appointmentsDateMode === 'specific'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isRtl ? 'تاريخ محدد' : 'Specific Date'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentsDateMode('range')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            appointmentsDateMode === 'range'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isRtl ? 'نطاق زمني' : 'Date Range'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentsDateMode('all')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            appointmentsDateMode === 'all'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isRtl ? 'الكل' : 'All Dates'}
                        </button>
                      </div>

                      {/* Doctor Selector Dropdown */}
                      <div className={`flex items-center gap-2 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                        <select
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="">{isRtl ? 'جميع أطباء العيادة' : 'All Clinic Doctors'}</option>
                          {clinicDoctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conditional Date Pickers */}
                    {appointmentsDateMode === 'specific' && (
                      <div className={`flex items-center gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <label className="text-slate-500 font-bold">{isRtl ? 'اختر التاريخ:' : 'Select Date:'}</label>
                        <input
                          type="date"
                          value={appointmentsDate}
                          onChange={(e) => setAppointmentsDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {appointmentsDateMode === 'range' && (
                      <div className={`flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <label className="text-slate-500 font-bold">{isRtl ? 'من:' : 'From:'}</label>
                          <input
                            type="date"
                            value={appointmentsFromDate}
                            onChange={(e) => setAppointmentsFromDate(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                          />
                        </div>
                        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <label className="text-slate-500 font-bold">{isRtl ? 'إلى:' : 'To:'}</label>
                          <input
                            type="date"
                            value={appointmentsToDate}
                            onChange={(e) => setAppointmentsToDate(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Instant Search Bar */}
                    <div className="relative pt-1">
                      <Search className={`w-4 h-4 absolute top-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('today.searchPlaceholder')}
                        className={`w-full py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 ${isRtl ? 'pl-3 pr-9' : 'pr-3 pl-9'}`}
                      />
                    </div>
                  </div>

                  {appointmentsError && (
                    <div className={`p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-bold ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{appointmentsError}</span>
                    </div>
                  )}

                  {loadingAppointments ? (
                    <div className="p-12 text-center text-slate-500 font-bold text-xs flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                      <span>{isRtl ? 'جاري تحميل المواعيد من الخادم...' : 'Loading appointments from server...'}</span>
                    </div>
                  ) : (() => {
                    const filteredApps = appointmentsList.filter(app => 
                      !searchTerm || 
                      app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      app.bookingReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      app.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    if (filteredApps.length === 0) {
                      return (
                        <div className="p-10 text-center text-slate-400 font-bold text-xs border rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
                          {isRtl ? 'لا توجد مواعيد مطابقة لخيارات الفلترة الحالية' : 'No appointments matching current filters'}
                        </div>
                      );
                    }

                    // Group by appointmentDate
                    const grouped: Record<string, any[]> = {};
                    filteredApps.forEach(app => {
                      const dateKey = app.appointmentDate || '—';
                      if (!grouped[dateKey]) grouped[dateKey] = [];
                      grouped[dateKey].push(app);
                    });

                    // Sort date keys chronologically
                    const sortedDates = Object.keys(grouped).sort();

                    return (
                      <div className="space-y-5">
                        {sortedDates.map((dateKey) => {
                          const appsForDate = grouped[dateKey].sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
                          return (
                            <div key={dateKey} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden space-y-0">
                              <div className={`p-3.5 bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-2 font-extrabold text-slate-800 dark:text-slate-200 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <CalendarDays className="w-4 h-4 text-teal-600" />
                                  <span className="font-mono">{dateKey}</span>
                                </div>
                                <span className="text-[11px] font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-bold border border-teal-200 dark:border-teal-800">
                                  {appsForDate.length} {isRtl ? 'مواعيد' : 'appointments'}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800">
                                    <tr>
                                      <th className="p-3">{t('today.table.ref')}</th>
                                      <th className="p-3">{t('today.table.patient')}</th>
                                      <th className="p-3">{isRtl ? 'الوقت' : 'Time'}</th>
                                      <th className="p-3">{isRtl ? 'الطبيب المعين' : 'Doctor'}</th>
                                      <th className="p-3">{t('today.table.status')}</th>
                                      <th className="p-3 text-center">{t('today.table.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {appsForDate.map((app) => (
                                      <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3 font-mono text-teal-600 dark:text-teal-400 font-bold">{app.bookingReference || app.id}</td>
                                        <td className="p-3">
                                          <strong className="block text-slate-900 dark:text-white font-bold">{app.patientName}</strong>
                                          <span className="text-[10px] text-slate-400 font-mono">{app.mrn}</span>
                                        </td>
                                        <td className="p-3 font-mono text-slate-500">{app.timeSlot || app.time || '—'}</td>
                                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{app.doctorName}</td>
                                        <td className="p-3">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                            app.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                            app.status === 'cancelled' || app.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' :
                                            'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                          }`}>
                                            {t(`waitingRoom.status.${app.status}`) || app.status}
                                          </span>
                                        </td>
                                        <td className={`p-3 text-center space-x-2 ${isRtl ? 'space-x-reverse' : ''}`}>
                                          {/* Confirm action for pending appointments if delegated booking.confirm */}
                                          {app.status === 'pending' && canConfirmAppointment && (
                                            <button
                                              onClick={() => handleConfirmAppointment(app.id)}
                                              disabled={confirmingId === app.id}
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-1"
                                            >
                                              {confirmingId === app.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="w-3 h-3" />
                                              )}
                                              <span>{isRtl ? 'تأكيد الموعد' : 'Confirm'}</span>
                                            </button>
                                          )}

                                          {app.status !== 'cancelled' && app.status !== 'rejected' && (
                                            <>
                                              {!['attended', 'cancelled', 'rejected', 'expired'].includes(app.status) && (
                                                <button
                                                  onClick={() => handleOpenReschedule(app)}
                                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
                                                >
                                                  {t('today.table.reschedule')}
                                                </button>
                                              )}
                                              <button
                                                onClick={() => handleCancelAppointment(app.id, app.patientName)}
                                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
                                              >
                                                {t('today.table.cancel')}
                                              </button>
                                            </>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* TAB 5: RECEPTION & FAST CHECK-IN */}
          {activeTab === 'reception' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/reception</span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('reception.title')}</h2>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className={`px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ring-1 ring-teal-700/20 ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <ScanLine className="w-4 h-4" />
                  <span>{isRtl ? 'مسح تذكرة QR' : 'Scan QR Pass'}</span>
                </button>
              </div>

              <div className={`max-w-xl space-y-4 ${isRtl ? 'mr-0 ml-auto' : 'ml-0 mr-auto'}`}>
                <div className={`space-y-1.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('reception.searchLabel')}</label>
                  <div className="relative">
                    <Search className={`w-4 h-4 absolute top-3.5 text-slate-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
                    <input
                      type="text"
                      value={receptionSearchQuery}
                      onChange={(e) => setReceptionSearchQuery(e.target.value)}
                      placeholder={t('reception.searchPlaceholder')}
                      className={`w-full p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                    />
                  </div>
                </div>

                {matchingReceptionPatients.length > 0 ? (
                  matchingReceptionPatients.map((pat) => (
                    <div key={pat.id} className={`p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 space-y-3 text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <strong className="text-teal-700 dark:text-teal-300 font-extrabold text-sm">{pat.patientName}</strong>
                        <span className="font-mono bg-teal-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {pat.mrn !== '—' ? pat.mrn : pat.bookingReference}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        {isRtl
                          ? `الموعد: ${pat.appointmentDate || ''} • ${pat.timeSlot || ''} (${pat.doctorName !== '—' ? pat.doctorName : ''})`
                          : `Scheduled: ${pat.appointmentDate || ''} • ${pat.timeSlot || ''} (${pat.doctorName !== '—' ? pat.doctorName : ''})`}
                      </p>
                      
                      <div className="flex gap-2 pt-1">
                        {pat.status === 'arrived' || pat.status === 'waiting' || pat.status === 'examination' ? (
                          <div className={`flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs border border-emerald-500/20 w-full justify-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <CheckCircle className="w-4 h-4" />
                            <span>{t('reception.alreadyInQueue')}</span>
                          </div>
                        ) : canConfirmAttendance ? (
                          <button
                            onClick={() => handleConfirmAttendance({
                              id: pat.id,
                              patientName: pat.patientName,
                              mrn: pat.mrn,
                              phone: pat.phone,
                              doctorName: pat.doctorName
                            })}
                            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs w-full transition-all flex items-center justify-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>{t('reception.confirmArrival')}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium text-xs border rounded-2xl border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                    <p>
                      {receptionSearchQuery.trim()
                        ? (isRtl ? 'لا تتوفر مواعيد مطابقة لهذا البحث حالياً' : 'No matching appointments found for this query')
                        : (isRtl ? 'يرجى إدخال اسم المريض أو الرقم الطبي (MRN) أو رقم الهاتف في صندوق البحث للتحقق من وصول المريض.' : 'Please enter patient name, MRN, or phone number in search box to verify arrival.')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: UNRESOLVED RESCHEDULES (DEC-VAC-06 / Option B Dashboard) */}
          {activeTab === 'unresolved-reschedules' && (
            <div className="space-y-6">
              {activeClinicId || user?.clinic?.id ? (
                <UnresolvedReschedulesDashboard
                  clinicId={activeClinicId || user?.clinic?.id || ''}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div className={`${containerClass} rounded-2xl p-8 border text-center space-y-3`}>
                  <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {isRtl ? 'يرجى تحديد العيادة النشطة أولاً لعرض الحالات غير المحلولة.' : 'Please select an active clinic first to view unresolved cases.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: FINANCIAL REWARDS */}
          {activeTab === 'rewards' && (
            <AssistantRewardsView isDarkMode={isDarkMode} isRtl={isRtl} />
          )}

          {/* TAB 8: OPERATIONAL CLINICAL REPORTS */}
          {activeTab === 'reports' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/reports</span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-600" />
                    <span>{t('reports.title')}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl ? 'مؤشرات الأداء التشغيلي غير السريري لجلسة اليوم وتدفق قاعة الانتظار' : 'Non-clinical operational KPIs for current session flow & attendance discipline'}
                  </p>
                </div>

                <div className="text-xs font-mono font-bold text-slate-400">
                  {effectiveDate}
                </div>
              </div>

              {/* Real Operational KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                {/* Attendance Discipline Rate */}
                <div className={`p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-bold block">{t('reports.disciplineRate')}</span>
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                  </div>
                  <strong className="text-3xl font-black text-teal-700 dark:text-teal-300 font-mono block">
                    {todayTotalCount > 0 ? `${attendanceRate}%` : '—'}
                  </strong>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
                  </div>
                  <p className="text-slate-500 text-[10.5px]">
                    {isRtl ? `${checkedInCount} من أصل ${todayTotalCount} مريض سجلوا حضورهم` : `${checkedInCount} of ${todayTotalCount} attended`}
                  </p>
                </div>

                {/* Consultation Completion Rate */}
                <div className={`p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-bold block">{isRtl ? 'نسبة إنجاز الكشوفات' : 'Consultations Done'}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <strong className="text-3xl font-black text-emerald-700 dark:text-emerald-300 font-mono block">
                    {todayTotalCount > 0 ? `${completionRate}%` : '—'}
                  </strong>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                  </div>
                  <p className="text-slate-500 text-[10.5px]">
                    {isRtl ? `${completedCount} مريض أتموا الكشف بالعيادة` : `${completedCount} finished consultation`}
                  </p>
                </div>

                {/* Waiting Room Pressure */}
                <div className={`p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-bold block">{isRtl ? 'ضغط قاعة الانتظار' : 'Waiting Queue Load'}</span>
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <strong className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                    {inWaitingRoomCount}
                  </strong>
                  <p className="text-slate-500 text-[10.5px]">
                    {isRtl ? `${inExaminationCount} في غرفة الكشف حالياً` : `${inExaminationCount} currently in exam`}
                  </p>
                </div>

                {/* Drop-off / Cancellations */}
                <div className={`p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-bold block">{isRtl ? 'فاقد الحضور (غياب/إلغاء)' : 'Drop-off / Absent'}</span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <strong className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono block">
                    {noShowCount}
                  </strong>
                  <p className="text-slate-500 text-[10.5px]">
                    {isRtl ? 'مواعيد تعذر إجراؤها أو تغيب أصحابها' : 'Missed or cancelled appointments'}
                  </p>
                </div>

              </div>

              {/* Status Breakdown Progress Cards */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-600" />
                  <span>{isRtl ? 'تفصيل الحالة التشغيلية لجميع مواعيد اليوم' : 'Operational Status Breakdown'}</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? 'المكتمل ومن حضر الكشف' : 'Completed & Attended'}</span>
                      <span className="font-mono font-bold text-emerald-600">{completedCount} ({todayTotalCount > 0 ? Math.round((completedCount/todayTotalCount)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${todayTotalCount > 0 ? (completedCount/todayTotalCount)*100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? 'بانتظار الاستدعاء بقاعة الانتظار' : 'In Waiting Room'}</span>
                      <span className="font-mono font-bold text-amber-600">{inWaitingRoomCount} ({todayTotalCount > 0 ? Math.round((inWaitingRoomCount/todayTotalCount)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${todayTotalCount > 0 ? (inWaitingRoomCount/todayTotalCount)*100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? 'مؤكد - لم يصل للعيادة بعد' : 'Confirmed (Awaiting Arrival)'}</span>
                      <span className="font-mono font-bold text-teal-600">{unarrivedCount} ({todayTotalCount > 0 ? Math.round((unarrivedCount/todayTotalCount)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full" style={{ width: `${todayTotalCount > 0 ? (unarrivedCount/todayTotalCount)*100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? 'ملغى أو غائب' : 'Cancelled or Absent'}</span>
                      <span className="font-mono font-bold text-rose-600">{noShowCount} ({todayTotalCount > 0 ? Math.round((noShowCount/todayTotalCount)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${todayTotalCount > 0 ? (noShowCount/todayTotalCount)*100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 9: CLINICAL ASSISTANT CREDENTIAL & PROFILE */}
          {activeTab === 'profile' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/profile</span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-teal-600" />
                    <span>{t('profile.title')}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl ? 'بيانات الاعتماد المهني لمساعد الطبيب ومحددات الأمان السريري' : 'Clinical assistant professional badge, credentials and operational scope'}
                  </p>
                </div>
              </div>

              {/* Official Credential ID Badge Card */}
              <div className="p-5 sm:p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-white to-slate-50 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-950 space-y-5">
                <div className={`flex flex-col sm:flex-row items-center gap-4 ${isRtl ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-md ring-4 ring-teal-500/20 shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {user?.name || (isRtl ? 'سارة بنت إبراهيم' : 'Assistant Staff')}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white flex items-center gap-1 shadow-2xs">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'مساعد طبيب معتمد' : 'Verified Assistant'}</span>
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {user?.active_clinic?.name || user?.clinic?.name || t('clinicName')}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      ID: {user?.id ? user.id.slice(0, 12) : 'AST-2026-DZ'} • Role: doctor_assistant
                    </p>
                  </div>
                </div>

                {/* Identity Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'البريد الإلكتروني الوظيفي' : 'Work Email'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{user?.email || '—'}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'رقم الهاتف المعتمد' : 'Registered Phone'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{user?.phone || '0555 12 34 56'}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10.5px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'حالة الاعتماد في المنصة' : 'Platform Standing'}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{isRtl ? 'نشط ومصرح بالكامل' : 'Active & Certified'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4D RBAC Capabilities Card */}
              <AssistantCapabilitiesCard isRtl={isRtl} isDarkMode={isDarkMode} />
            </div>
          )}

          {/* TAB 10: SETTINGS & WORKSTATION PREFERENCES */}
          {activeTab === 'settings' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/settings</span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal-600" />
                    <span>{t('settings.title')}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl ? 'تفضيلات محطة العمل، التنبيهات الصوتية وتأمين الحساب الشخصي' : 'Workstation audio chimes, queue view preferences and security credentials'}
                  </p>
                </div>
              </div>

              {/* Workstation UI Preferences */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                  <span>{isRtl ? 'تفضيلات محطة عمل الاستقبال' : 'Reception Workstation Preferences'}</span>
                </h3>

                <div className="space-y-3 text-xs">
                  {/* Sound Chime Toggle */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="font-bold text-slate-800 dark:text-slate-200 block">
                        {isRtl ? 'التنبيه الصوتي عند استدعاء المريض' : 'Audio Chime on Patient Call'}
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        {isRtl ? 'إصدار رنين ناعم عند استدعاء المريض التالي أو تأكيد الحضور' : 'Play a subtle chime when calling next patient or confirming attendance'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        if (next) triggerNotice(isRtl ? 'تم تفعيل التنبيه الصوتي' : 'Audio chime enabled');
                      }}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        soundEnabled
                          ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title={soundEnabled ? 'صوت مفعل' : 'صوت معطل'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Waiting Room Default View */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="font-bold text-slate-800 dark:text-slate-200 block">
                        {isRtl ? 'طريقة العرض الافتراضية لقاعة الانتظار' : 'Default Queue View Mode'}
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        {isRtl ? 'اختر بين عرض البطاقات السريرية أو الجدول المنظم' : 'Select between clinical triage cards or compact tabular queue'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setWaitingRoomViewMode('cards')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          waitingRoomViewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {isRtl ? 'بطاقات' : 'Cards'}
                      </button>
                      <button
                        onClick={() => setWaitingRoomViewMode('table')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          waitingRoomViewMode === 'table' ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {isRtl ? 'جدول' : 'Table'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Security Card */}
              <div className="max-w-xl">
                <ChangePasswordCard isRtl={isRtl} isDarkMode={isDarkMode} />
              </div>

              {/* 4D Capabilities Ceiling Card */}
              <AssistantCapabilitiesCard isRtl={isRtl} isDarkMode={isDarkMode} />
            </div>
          )}

        </main>

      </div>

      {/* Modal for Quick Check In */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${containerClass} w-full max-w-md rounded-2xl p-6 space-y-4 border shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('reception.quickCheckIn.title')}</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('reception.quickCheckIn.patientName')}</label>
                <input type="text" placeholder={t('settings.fullName')} className={`w-full p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 ${isRtl ? 'text-right' : 'text-left'}`} />
              </div>
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('reception.quickCheckIn.phone')}</label>
                <input type="text" placeholder="+213 ..." className={`w-full p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 ${isRtl ? 'text-right' : 'text-left'}`} />
              </div>
            </div>

            <div className={`flex justify-end gap-2 pt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  triggerNotice(t('toast.checkedInSuccess'));
                }}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {t('reception.quickCheckIn.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Reschedule Appointment */}
      {showRescheduleModal && (() => {
        const isNoOp =
          showRescheduleModal.appointment_date === showRescheduleModal.originalDate &&
          showRescheduleModal.time_slot === showRescheduleModal.originalTimeSlot;
        const selectedSlotObj = rescheduleSlots.find((s: any) => s.time_slot === showRescheduleModal.time_slot);
        const isSelectedSlotAvailable = selectedSlotObj
          ? Boolean(selectedSlotObj.is_available ?? selectedSlotObj.isAvailable ?? (selectedSlotObj.available > 0))
          : false;
        const canSubmit =
          !isNoOp &&
          Boolean(showRescheduleModal.time_slot) &&
          isSelectedSlotAvailable &&
          !loadingRescheduleSlots &&
          !submittingReschedule;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {isRtl ? `إعادة جدولة موعد: ${showRescheduleModal.patientName}` : `Reschedule Appointment: ${showRescheduleModal.patientName}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRtl ? 'اختر تاريخاً وفترة زمنية جديدة ومتاحة للطبيب' : 'Select a new available date and time slot for the doctor'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Appointment Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-bold">{isRtl ? 'الموعد الحالي: ' : 'Current Appointment: '}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{showRescheduleModal.originalDate}</span>
                  <span className="mx-1.5">•</span>
                  <span className="font-mono text-slate-900 dark:text-white">{formatSlotRange(showRescheduleModal.originalTimeSlot)}</span>
                </div>
                {showRescheduleModal.doctorName && (
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold">{isRtl ? 'الطبيب المعين: ' : 'Doctor: '}</span>
                    <span className="text-slate-900 dark:text-white">{showRescheduleModal.doctorName}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleExecuteReschedule} className="space-y-4 text-xs font-bold">
                {/* Date Input */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'التاريخ الجديد' : 'New Date'}
                  </label>
                  <input
                    type="date"
                    required
                    min={getLocalDateString()}
                    value={showRescheduleModal.appointment_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setShowRescheduleModal((prev: any) => ({
                        ...prev,
                        appointment_date: newDate,
                        time_slot: '',
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>

                {/* Slot Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300">
                      {isRtl ? 'الفترة الزمنية الجديدة' : 'New Time Slot'}
                    </label>
                    {loadingRescheduleSlots && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-normal">
                        <RefreshCw className="w-3 h-3 animate-spin text-teal-600" />
                        <span>{isRtl ? 'جاري فحص السعة...' : 'Checking capacity...'}</span>
                      </span>
                    )}
                  </div>

                  <select
                    required
                    value={showRescheduleModal.time_slot}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShowRescheduleModal((prev: any) => ({ ...prev, time_slot: val }));
                    }}
                    disabled={loadingRescheduleSlots || rescheduleSlots.length === 0}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
                  >
                    <option value="">
                      {loadingRescheduleSlots
                        ? (isRtl ? '-- جاري تحميل الفترات المتاحة --' : '-- Loading available slots --')
                        : (isRtl ? '-- اختر الفترة الزمنية --' : '-- Select a time slot --')}
                    </option>
                    {rescheduleSlots.map((slot: any) => {
                      const isAvail = Boolean(slot.is_available ?? slot.isAvailable ?? (slot.available > 0));
                      const isCurrentSlot =
                        showRescheduleModal.appointment_date === showRescheduleModal.originalDate &&
                        slot.time_slot === showRescheduleModal.originalTimeSlot;

                      let statusLabel = '';
                      if (isCurrentSlot) {
                        statusLabel = isRtl ? `(${slot.time_slot} - الموعد الحالي)` : `(${slot.time_slot} - Current Slot)`;
                      } else if (!isAvail) {
                        statusLabel = isRtl ? '(مكتمل)' : '(Full)';
                      } else if (typeof slot.available === 'number') {
                        statusLabel = isRtl
                          ? `(متاح: ${slot.available}${typeof slot.max_capacity === 'number' ? `/${slot.max_capacity}` : ''})`
                          : `(Available: ${slot.available}${typeof slot.max_capacity === 'number' ? `/${slot.max_capacity}` : ''})`;
                      } else {
                        statusLabel = isRtl ? '(متاح)' : '(Available)';
                      }

                      return (
                        <option
                          key={slot.time_slot}
                          value={slot.time_slot}
                          disabled={!isAvail}
                        >
                          {formatSlotRange(slot.time_slot)} {statusLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Inline alerts & warnings */}
                {isNoOp && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {isRtl
                        ? 'يرجى اختيار تاريخ أو فترة زمنية مختلفة عن الموعد الحالي.'
                        : 'Please select a date or time slot different from the current appointment.'}
                    </span>
                  </div>
                )}

                {rescheduleSlotsError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{rescheduleSlotsError}</span>
                  </div>
                )}

                {!loadingRescheduleSlots && rescheduleSlots.length === 0 && !rescheduleSlotsError && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {isRtl
                        ? 'لا توجد فترات عمل متاحة لهذا التاريخ.'
                        : 'No available working slots for this date.'}
                    </span>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(null)}
                    disabled={submittingReschedule}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {submittingReschedule ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>{isRtl ? 'تأكيد الموعد الجديد' : 'Confirm Reschedule'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
