'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  ScanLine
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/auth';
import { AssistantBookingWizard } from './AssistantBookingWizard';
import { DocumentScanner } from '../shared/DocumentScanner';
import { appointmentService } from '@/services/appointmentService';
import { clinicService } from '@/services/clinicService';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { OperationalDayBar } from '../shared/OperationalDayBar';
import { Globe } from 'lucide-react';

export const AssistantCapabilitiesCard: React.FC<{ isRtl: boolean; isDarkMode?: boolean }> = ({ isRtl, isDarkMode }) => {
  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'}`}>
      <div className={`flex items-center gap-2.5 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
        <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <h3 className="text-sm font-bold">{isRtl ? 'مهام وصلاحيات مساعد الطبيب المعتمدة (Role Capabilities)' : 'Assistant Authorised Tasks & Security Ceiling'}</h3>
          <span className="text-[11px] text-slate-500 block">{isRtl ? 'استعراض دقيق للعمليات المصرح بها والقيود الأمنية وفق نظام 4D' : 'Official breakdown of authorized operations & 4D security ceiling'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Authorized Tasks */}
        <div className={`p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <span className={`font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {isRtl ? 'المهام والعمليات المسموح بها (Authorised Tasks)' : 'Authorized Tasks'}
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside">
            <li>{isRtl ? 'إدارة قائمة الانتظار الحية واستدعاء المرضى (booking.manage_queue)' : 'Manage live waiting queue & call patients'}</li>
            <li>{isRtl ? 'تسجيل حضور المريض ومسح تذاكر QR (booking.confirm_attendance)' : 'Confirm patient attendance & scan QR passes'}</li>
            <li>{isRtl ? 'إنشاء وحجز المواعيد بالاستقبال (booking.create)' : 'Create & book appointments at reception (booking.create)'}</li>
            <li>{isRtl ? 'تأكيد المواعيد الطبية عند تفويضها من المدير (booking.confirm)' : 'Confirm medical appointments when delegated (booking.confirm)'}</li>
            <li>{isRtl ? 'إعادة جدولة وإلغاء المواعيد بناءً على طلب العيادة' : 'Reschedule & cancel clinic appointments'}</li>
            <li>{isRtl ? 'عرض معلومات الاتصال الأساسية للمريض (patient.view_contacts)' : 'View basic patient contact details'}</li>
          </ul>
        </div>

        {/* Restricted Clinical Ceiling */}
        <div className={`p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2.5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <span className={`font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            {isRtl ? 'القيود السريرية والأمنية (Restricted Clinical Scope)' : 'Restricted Clinical Scope'}
          </span>
          <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside">
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
  
  // Assistant Permissions state (controlled by Doctor in Doctor Settings)
  const [permissions] = useState({
    canApproveAppointments: true,
    canEditAppointments: true,
    canRescheduleAppointments: true,
    canCancelAppointments: true,
    canManageWaitingQueue: true,
    canViewMedicalRecords: false,
    canStartVisit: false
  });

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
          checked_in_at: app.checked_in_at || null
        }));
        setQueue(liveQ);
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    }
  }, [selectedOperationalDate]);

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
  const completedCount = todayAppointments.filter(a => a.status === 'completed' || a.status === 'attended').length;
  const noShowCount = todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'rejected' || a.status === 'absent').length;

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showNewBookingWizard, setShowNewBookingWizard] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<any>(null);
  const [selectedPatientView, setSelectedPatientView] = useState<any>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  const handleOpenReschedule = (app: any) => {
    setShowRescheduleModal({
      id: app.id,
      patientName: app.patientName,
      appointment_date: app.appointmentDate || new Date().toISOString().split('T')[0],
      time_slot: app.timeSlot || '09:00',
    });
  };

  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRescheduleModal) return;
    try {
      await appointmentService.rescheduleAppointment(showRescheduleModal.id, {
        appointment_date: showRescheduleModal.appointment_date,
        time_slot: showRescheduleModal.time_slot,
      });
      triggerNotice(isRtl ? `تمت إعادة جدولة موعد المريض ${showRescheduleModal.patientName} بنجاح.` : `Appointment rescheduled successfully.`);
      setShowRescheduleModal(null);
      fetchQueue();
    } catch (err: any) {
      triggerNotice(err?.message || (isRtl ? 'حدث خطأ أثناء إعادة الجدولة.' : 'Failed to reschedule appointment.'));
    }
  };

  const handleCancelAppointment = async (appId: string, patientName: string) => {
    if (confirm(isRtl ? `هل أنت متأكد من رغبتك في إلغاء موعد المريض ${patientName}؟` : `Cancel appointment for ${patientName}?`)) {
      try {
        await appointmentService.cancelAppointment(appId, 'إلغاء الموعد بناءً على طلب العيادة');
        triggerNotice(isRtl ? `تم إلغاء موعد المريض ${patientName} بنجاح.` : `Appointment cancelled successfully.`);
        fetchQueue();
      } catch (err: any) {
        triggerNotice(err?.message || (isRtl ? 'حدث خطأ أثناء إلغاء الموعد.' : 'Failed to cancel appointment.'));
      }
    }
  };

  const handleAddBooking = (newBooking: any) => {
    triggerNotice(isRtl ? `تم إنشاء الحجز بنجاح برقم المرجع ${newBooking.refNumber}` : `Booking created successfully with ref number ${newBooking.refNumber}`);
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
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900 shadow-xs';

  const navItems = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: Activity, path: '/assistant/dashboard' },
    { id: 'today', label: t('tabs.today'), icon: Clock, badge: `${todayTotalCount}`, path: '/assistant/today' },
    { id: 'waiting-room', label: t('tabs.waitingRoom'), icon: Users, badge: `${inWaitingRoomCount}`, path: '/assistant/waiting-room' },
    { id: 'appointments', label: t('tabs.appointments'), icon: Calendar, path: '/assistant/appointments' },
    { id: 'reception', label: t('tabs.reception'), icon: UserCheck, path: '/assistant/reception' },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell, badge: '0', path: '/assistant/notifications' },
    { id: 'calendar', label: t('tabs.calendar'), icon: Calendar, path: '/assistant/calendar' },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart3, path: '/assistant/reports' },
    { id: 'profile', label: t('tabs.profile'), icon: User, path: '/assistant/profile' },
    { id: 'settings', label: t('tabs.settings'), icon: Settings, path: '/assistant/settings' }
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Header Bar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-xs'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              م
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {t('portalBadge')}
                </span>
                <span className="text-xs text-slate-500 font-mono">/assistant</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {user?.active_clinic?.name || user?.clinic?.name || t('clinicName')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <select
                value={locale}
                onChange={(e) => changeLanguage(e.target.value)}
                className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 cursor-pointer transition-all ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                aria-label="Language selector"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {onBackToMainPlatform && (
              <button
                onClick={onBackToMainPlatform}
                className={`px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{t('home')}</span>
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={t('themeToggle')}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title={t('logout') || 'تسجيل الخروج'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('logout') || (isRtl ? 'تسجيل الخروج' : 'Log Out')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Notice Banner if triggered */}
      {noticeMessage && (
        <div className="bg-teal-600 text-white text-xs px-4 py-2 font-bold text-center animate-fade-in flex items-center justify-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* New Booking Wizard Overlay */}
      {showNewBookingWizard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowNewBookingWizard(false)}
              className={`absolute p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-10 ${isRtl ? 'left-6 top-6' : 'right-6 top-6'}`}
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

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 space-y-2 shrink-0">
          
          {/* Active Shift Card */}
          <div className={`${containerClass} rounded-2xl p-4 border space-y-2`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">{t('shift.title')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {t('shift.activeNow')}
              </span>
            </div>
            <div className={`text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <strong className="block text-slate-900 dark:text-white font-bold">
                {user?.name || (isRtl ? 'مساعد العيادة' : 'Clinic Assistant')}
              </strong>
              <span className="text-slate-500 block text-[11px] mt-0.5 font-mono">
                {user?.email || '—'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <div className={`${containerClass} rounded-2xl p-2 border space-y-1`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-800 dark:bg-slate-800 dark:text-teal-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* RBAC Info Card */}
          <div className={`${containerClass} rounded-2xl p-4 border text-xs space-y-2 bg-amber-500/5 border-amber-500/20`}>
            <div className={`flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{isRtl ? 'صلاحيات المساعد التشغيلية' : 'Operational Permissions'}</span>
            </div>
            <p className={`text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'المساعد يعمل بـ Role-Based Access Control ويحدد الطبيب صلاحيات الحجز والاستقبال ومنع فتح EMR بدون تصريح.' : 'Assistant operates under Role-Based Access Control; the doctor defines booking and reception permissions and restricts EMR access without authorization.'}
            </p>
          </div>

        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 space-y-6 min-w-0">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Top Banner */}
              <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 block mb-1">
                    /assistant/dashboard
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t('dashboard.title')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('dashboard.subtitle')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {canCreateBooking && (
                    <button
                      onClick={() => setShowNewBookingWizard(true)}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('dashboard.newBooking')}</span>
                    </button>
                  )}

                  {canConfirmAttendance && (
                    <button
                      onClick={() => setShowCheckInModal(true)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{t('dashboard.checkIn')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border border-teal-500/20"
                  >
                    <ScanLine className="w-4 h-4 text-teal-600" />
                    <span>{t('dashboard.scanDoc')}</span>
                  </button>
                </div>
              </div>

              {/* Shared Operational Day Bar */}
              <OperationalDayBar
                selectedDate={selectedOperationalDate}
                onDateChange={setSelectedOperationalDate}
              />

              {/* Today's Tasks Widget (مهامي اليوم) */}
              <div className={`${containerClass} rounded-2xl p-5 border space-y-4 bg-linear-to-br from-teal-500/5 via-transparent to-amber-500/5`}>
                <div className={`flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('dashboard.tasksTitle')}</h3>
                      <span className="text-[11px] text-slate-500 block">{t('dashboard.tasksSubtitle')}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                    {t('dashboard.criticalTasks', { count: unarrivedCount + reviewCount })}
                  </span>
                </div>

                {/* Doctor's Latest Instruction Banner */}
                <div className={`p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className={`text-xs space-y-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <strong className="font-bold block">{t('dashboard.instructionTitle')}</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {isRtl ? 'لا توجد تعليمات حية من الطبيب حالياً.' : 'No active instructions from doctor currently.'}
                    </p>
                  </div>
                </div>

                {/* Task Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  
                  {/* Unarrived Patients */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {isRtl ? 'لم يصلوا بعد' : 'Not Arrived Yet'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                        {isRtl ? `${unarrivedCount} مرضى` : `${unarrivedCount} Patients`}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'مواعيد بانتظار تأكيد الحضور' : 'Appointments awaiting arrival'}</p>
                    <button
                      onClick={() => triggerNotice(t('kpis.sentSmsSuccess'))}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-lg text-[10px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'إرسال تذكير سريع SMS' : 'Send Quick SMS'}
                    </button>
                  </div>

                  {/* Checked-in Patients */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {t('kpis.checkedIn')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                        {t('kpis.patientsCount', { count: checkedInCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.readyWaiting')}</p>
                    <button
                      onClick={() => setActiveTab('waiting-room')}
                      className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-[10px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'إدارة القائمة الحية' : 'Manage Live Queue'}
                    </button>
                  </div>

                  {/* Late Patients */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        {t('kpis.latePatients')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                        {t('kpis.patientsCount', { count: lateCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.lateDesc')}</p>
                    <button
                      onClick={() => triggerNotice(t('kpis.calledLateSuccess'))}
                      className={`w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>{t('kpis.confirmCall')}</span>
                    </button>
                  </div>

                  {/* Appointments Needing Review */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-3.5 h-3.5 text-teal-500" />
                        {t('kpis.needReview')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                        {t('kpis.apptsCount', { count: reviewCount })}
                      </span>
                    </div>
                    <p className={`text-slate-500 text-[11px] ${isRtl ? 'text-right' : 'text-left'}`}>{t('kpis.reviewDesc')}</p>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="w-full py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold rounded-lg text-[10px] cursor-pointer transition-all"
                    >
                      {isRtl ? 'مراجعة الحجوزات' : 'Review Appts'}
                    </button>
                  </div>

                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`${containerClass} p-4 rounded-xl border ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-slate-500 font-bold block">{t('dashboard.stats.todayAppointments')}</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{todayTotalCount}</span>
                  <span className="text-[10px] text-teal-600 font-bold block mt-0.5">
                    {t('dashboard.stats.remaining', { count: queue.filter(a => a.status === 'pending' || a.status === 'confirmed').length })}
                  </span>
                </div>

                <div className={`${containerClass} p-4 rounded-xl border ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-slate-500 font-bold block">{t('dashboard.stats.inWaitingRoom')}</span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block">{t('kpis.patientsCount', { count: inWaitingRoomCount })}</span>
                  <span className="text-[10px] text-amber-600 font-bold block mt-0.5">{isRtl ? 'بناءً على قائمة الانتظار الحالية' : 'Based on live queue'}</span>
                </div>

                <div className={`${containerClass} p-4 rounded-xl border ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-slate-500 font-bold block">{t('dashboard.stats.completed')}</span>
                  <span className="text-2xl font-black text-emerald-600 mt-1 block">{completedCount}</span>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{isRtl ? 'مواعيد مكتملة' : 'Completed appts'}</span>
                </div>

                <div className={`${containerClass} p-4 rounded-xl border ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-slate-500 font-bold block">{t('dashboard.stats.noShow')}</span>
                  <span className="text-2xl font-black text-rose-600 mt-1 block">{noShowCount}</span>
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">{isRtl ? 'ملغاة / غائب' : 'Cancelled / Absent'}</span>
                </div>
              </div>

              {/* Live Queue Table */}
              <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
                <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Users className="w-4 h-4 text-teal-600" />
                    {t('waitingRoom.title')}
                  </h3>
                  <button
                    onClick={() => setActiveTab('waiting-room')}
                    className={`text-xs font-bold text-teal-600 hover:underline flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}
                  >
                    <span>{t('waitingRoom.fullScreen')}</span>
                    <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="p-3">{t('waitingRoom.table.queueNum')}</th>
                        <th className="p-3">{t('waitingRoom.table.patientName')}</th>
                        <th className="p-3">{t('waitingRoom.table.time')}</th>
                        <th className="p-3">{t('waitingRoom.table.status')}</th>
                        <th className="p-3 text-center">{t('waitingRoom.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {waitingRoomQueue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 font-bold text-xs">
                            {isRtl ? 'لا يوجد مرضى حالياً في قائمة الانتظار الحية لهذه الجلسة التشغيلية' : 'No patients currently in live waiting room for this operational day'}
                          </td>
                        </tr>
                      ) : (
                        waitingRoomQueue.map((q) => (
                          <tr key={q.id}>
                            <td className="p-3 font-mono font-bold text-teal-600">{q.bookingReference || q.id}</td>
                            <td className="p-3">
                              <strong className="block text-slate-900 dark:text-white">{q.patientName}</strong>
                              <span className="text-[10px] text-slate-500 font-mono">{q.mrn}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-500">{q.time}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                q.status === 'attended' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                q.status === 'examination' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                                q.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {t(`waitingRoom.status.${q.status}`) || q.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => triggerNotice(isRtl ? `تم استدعاء المريض ${q.patientName} بنجاح إلى العيادة` : `Patient ${q.patientName} called to clinic successfully`)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
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

          {/* TAB 2: TODAY'S SCHEDULE */}
          {activeTab === 'today' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/today</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isRtl ? `جدول مواعيد اليوم (${new Date().toLocaleDateString('ar-DZ')})` : `Today's Schedule (${new Date().toLocaleDateString('en-US')})`}
                  </h2>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {isRtl ? `${todayTotalCount} حجز كلي` : `${todayTotalCount} total appts`}
                </div>
              </div>

              <div className="space-y-3">
                {todayAppointments.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-bold text-xs border rounded-xl border-dashed border-slate-300 dark:border-slate-800">
                    {isRtl ? 'لا توجد مواعيد مخصصة اليوم' : 'No appointments scheduled for today'}
                  </div>
                ) : (
                  todayAppointments.map((item, idx) => (
                    <div key={item.id || idx} className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                      item.status === 'examination' ? 'border-teal-50 bg-teal-500/5' : 'border-slate-200 dark:border-slate-800'
                    } ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <span className="font-mono font-bold text-teal-600 bg-teal-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {item.timeSlot || item.time || '—'}
                        </span>
                        <div>
                          <strong className="block text-slate-900 dark:text-white text-sm">{item.patientName}</strong>
                          <span className="text-slate-500 text-[10px] font-mono">{item.mrn !== '—' ? item.mrn : ''}</span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border ${
                          item.status === 'completed' || item.status === 'attended' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          item.status === 'examination' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {t(`waitingRoom.status.${item.status}`) || item.status}
                        </span>

                        {canConfirmAttendance && (
                          <button
                            onClick={() => triggerNotice(isRtl ? `تم تحديث حالة الموعد لـ ${item.patientName}` : `Appointment status updated for ${item.patientName}`)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            {t('today.confirmArrival')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WAITING ROOM */}
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
                  <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/waiting-room</span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('waitingRoom.title')}</h2>
                    </div>
                    <button
                      onClick={() => triggerNotice(t('today.nextCalled'))}
                      className={`px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}
                    >
                      <Bell className="w-4 h-4" />
                      <span>{t('waitingRoom.callNext')}</span>
                    </button>
                  </div>

              {waitingRoomQueue.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold text-xs border rounded-xl border-dashed border-slate-300 dark:border-slate-800">
                  {isRtl ? 'لا يوجد مرضى حالياً في قائمة الانتظار الحية لهذا اليوم التشغيلي' : 'No patients currently in waiting queue for this operational day'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {waitingRoomQueue.map((item) => (
                    <div key={item.id} className={`p-4 rounded-xl border space-y-3 ${
                      item.status === 'examination' ? 'border-teal-50 bg-teal-500/5' : 'border-slate-200 dark:border-slate-800'
                    } ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="font-mono font-bold text-teal-600 text-sm">{item.bookingReference || item.id}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{item.time}</span>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white font-bold">{item.patientName}</strong>
                        <span className="text-slate-500 text-[11px] block font-mono">{item.phone !== '—' ? item.phone : ''}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.status === 'examination' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            item.status === 'waiting' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                         }`}>
                            {t(`waitingRoom.status.${item.status}`) || item.status}
                         </span>
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.priority === 'emergency' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            item.priority === 'followup' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                         }`}>
                            {t(`typeFilter.${item.priority === 'normal' ? 'all' : item.priority}`)}
                         </span>
                      </div>

                      <div className={`flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => triggerNotice(isRtl ? `تم تأجيل دور المريض ${item.patientName}` : `Patient ${item.patientName} turn postponed`)}
                          className="text-amber-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {t('waitingRoom.actions.postpone')}
                        </button>

                        <button
                          onClick={() => triggerNotice(isRtl ? `تم تسجيل المريض ${item.patientName} كـ غائب` : `Patient ${item.patientName} marked as absent`)}
                          className="text-rose-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {t('waitingRoom.actions.considerAbsent')}
                        </button>
                      </div>
                    </div>
                  ))}
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
                  <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/appointments</span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('tabs.appointments')}</h2>
                    </div>
                    {canCreateBooking && (
                      <button
                        onClick={() => setShowNewBookingWizard(true)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('dashboard.newBooking')}</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Controls Bar */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className={`flex flex-wrap items-center gap-3 justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      {/* Date Mode Segmented Buttons */}
                      <div className={`flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
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
                      <div className={`flex items-center gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <label className="text-slate-500 font-bold">{isRtl ? 'اختر التاريخ:' : 'Select Date:'}</label>
                        <input
                          type="date"
                          value={appointmentsDate}
                          onChange={(e) => setAppointmentsDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                        </input>
                      </div>
                    )}

                    {appointmentsDateMode === 'range' && (
                      <div className={`flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                        className={`w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none ${isRtl ? 'pl-3 pr-9' : 'pr-3 pl-9'}`}
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
                        <div className="p-8 text-center text-slate-500 font-bold text-xs border rounded-xl border-dashed border-slate-300 dark:border-slate-800">
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
                      <div className="space-y-6">
                        {sortedDates.map((dateKey) => {
                          const appsForDate = grouped[dateKey].sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
                          return (
                            <div key={dateKey} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-0">
                              <div className={`p-3.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <CalendarDays className="w-4 h-4 text-teal-600" />
                                  <span className="font-mono">{dateKey}</span>
                                </div>
                                <span className="text-[11px] font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-bold border border-teal-200 dark:border-teal-800">
                                  {appsForDate.length} {isRtl ? 'مواعيد' : 'appointments'}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                      <th className="p-3">{t('today.table.ref')}</th>
                                      <th className="p-3">{t('today.table.patient')}</th>
                                      <th className="p-3">{isRtl ? 'الوقت' : 'Time'}</th>
                                      <th className="p-3">{isRtl ? 'الطبيب المعين' : 'Doctor'}</th>
                                      <th className="p-3">{t('today.table.status')}</th>
                                      <th className="p-3 text-center">{t('today.table.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {appsForDate.map((app) => (
                                      <tr key={app.id}>
                                        <td className="p-3 font-mono text-teal-600 font-bold">{app.bookingReference || app.id}</td>
                                        <td className="p-3 font-bold text-slate-900 dark:text-white">{app.patientName}</td>
                                        <td className="p-3 font-mono text-slate-500">{app.timeSlot || app.time || '—'}</td>
                                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{app.doctorName}</td>
                                        <td className="p-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                            app.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                            app.status === 'cancelled' || app.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                            'bg-blue-50 text-blue-800 border-blue-200'
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
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[10px] cursor-pointer transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
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
                                              <button
                                                onClick={() => handleOpenReschedule(app)}
                                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-md text-[10px] cursor-pointer transition-colors"
                                              >
                                                {t('today.table.reschedule')}
                                              </button>
                                              <button
                                                onClick={() => handleCancelAppointment(app.id, app.patientName)}
                                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-md text-[10px] cursor-pointer transition-colors"
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

          {/* TAB 5: RECEPTION */}
          {activeTab === 'reception' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/reception</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('reception.title')}</h2>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className={`px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <ScanLine className="w-4 h-4" />
                  <span>{isRtl ? 'مسح تذكرة QR' : 'Scan QR Pass'}</span>
                </button>
              </div>

              <div className={`max-w-xl space-y-4 ${isRtl ? 'mr-0 ml-auto' : 'ml-0 mr-auto'}`}>
                <div className={`space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('reception.searchLabel')}</label>
                  <input
                    type="text"
                    value={receptionSearchQuery}
                    onChange={(e) => setReceptionSearchQuery(e.target.value)}
                    placeholder={t('reception.searchPlaceholder')}
                    className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                </div>

                {matchingReceptionPatients.length > 0 ? (
                  matchingReceptionPatients.map((pat) => (
                    <div key={pat.id} className={`p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-3 text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <strong className="text-teal-700 dark:text-teal-300 font-bold text-sm">{pat.patientName}</strong>
                        <span className="font-mono bg-teal-600 text-white px-2 py-0.5 rounded text-[10px]">{pat.mrn !== '—' ? pat.mrn : pat.bookingReference}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {isRtl
                          ? `الموعد: ${pat.appointmentDate || ''} ${pat.timeSlot || ''} (${pat.doctorName !== '—' ? pat.doctorName : ''})`
                          : `Scheduled: ${pat.appointmentDate || ''} ${pat.timeSlot || ''} (${pat.doctorName !== '—' ? pat.doctorName : ''})`}
                      </p>
                      
                      <div className="flex gap-2 pt-2">
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
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs w-full transition-all"
                          >
                            {t('reception.confirmArrival')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 font-bold text-xs border rounded-xl border-dashed border-slate-300 dark:border-slate-800 space-y-1">
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

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/notifications</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('notifications.title')}</h2>
                </div>
              </div>

              <div className="p-8 text-center text-slate-500 font-bold text-xs border rounded-xl border-dashed border-slate-300 dark:border-slate-800">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p>{isRtl ? 'لا توجد تنبيهات حية حالياً' : 'No active notifications at this time'}</p>
              </div>
            </div>
          )}

          {/* TAB 7: CALENDAR */}
          {activeTab === 'calendar' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/calendar</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('calendar.title')}</h2>
                </div>
              </div>

              <div className={`p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3 ${isRtl ? 'text-right' : 'text-left'}`}>
                <Calendar className="w-12 h-12 text-teal-600 mx-auto" />
                <h3 className="font-bold text-sm mx-auto">{t('calendar.viewTitle')}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('calendar.description')}
                </p>
              </div>
            </div>
          )}

          {/* TAB 8: OPERATIONAL REPORTS */}
          {activeTab === 'reports' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/reports</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('reports.title')}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-slate-500 font-bold block">{t('reports.disciplineRate')}</span>
                  <strong className="text-2xl font-black text-slate-400 block">—</strong>
                  <p className="text-slate-500 text-[11px]">{isRtl ? 'غير متوفر حالياً (تتطلب بيانات تحليلية من الـ Backend)' : 'Currently unavailable (requires backend analytics)'}</p>
                </div>

                <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="text-slate-500 font-bold block">{t('reports.avgWaiting')}</span>
                  <strong className="text-2xl font-black text-slate-400 block">—</strong>
                  <p className="text-slate-500 text-[11px]">{isRtl ? 'غير متوفر حالياً (تتطلب بيانات تحليلية من الـ Backend)' : 'Currently unavailable (requires backend analytics)'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PROFILE */}
          {activeTab === 'profile' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/profile</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.title')}</h2>
                </div>
              </div>

              <div className={`space-y-3 text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                <p><strong>{t('profile.nameLabel')}</strong> {user?.name || '—'}</p>
                <p><strong>{t('profile.clinicLabel')}</strong> {user?.active_clinic?.name || user?.clinic?.name || '—'}</p>
                <p><strong>{t('profile.phoneLabel')}</strong> {user?.phone || '—'}</p>
                <p><strong>{t('profile.roleLabel')}</strong> {user?.roles?.[0] || 'doctor_assistant'}</p>
              </div>

              <AssistantCapabilitiesCard isRtl={isRtl} isDarkMode={isDarkMode} />
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === 'settings' && (
            <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <span className={`text-xs font-mono font-bold text-teal-600 block ${isRtl ? 'text-right' : 'text-left'}`}>/assistant/settings</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings.title')}</h2>
                </div>
              </div>

              <AssistantCapabilitiesCard isRtl={isRtl} isDarkMode={isDarkMode} />

              <div className="max-w-xl">
                <ChangePasswordCard isRtl={isRtl} isDarkMode={isDarkMode} />
              </div>
            </div>
          )}

        </main>

      </div>

      {/* Modal for Quick Check In */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${containerClass} w-full max-w-md rounded-2xl p-6 space-y-4 border shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('reception.quickCheckIn.title')}</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">{t('reception.quickCheckIn.patientName')}</label>
                <input type="text" placeholder={t('settings.fullName')} className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 ${isRtl ? 'text-right' : 'text-left'}`} />
              </div>
              <div>
                <label className="font-bold block mb-1">{t('reception.quickCheckIn.phone')}</label>
                <input type="text" placeholder="+213 ..." className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 ${isRtl ? 'text-right' : 'text-left'}`} />
              </div>
            </div>

            <div className={`flex justify-end gap-2 pt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  triggerNotice(t('toast.checkedInSuccess'));
                }}
                className="px-4 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                {t('reception.quickCheckIn.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Reschedule Appointment */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isRtl ? `إعادة جدولة موعد: ${showRescheduleModal.patientName}` : `Reschedule Appointment: ${showRescheduleModal.patientName}`}
              </h3>
              <button onClick={() => setShowRescheduleModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleExecuteReschedule} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isRtl ? 'التاريخ الجديد' : 'New Date'}</label>
                <input
                  type="date"
                  required
                  value={showRescheduleModal.appointment_date}
                  onChange={(e) => setShowRescheduleModal({ ...showRescheduleModal, appointment_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">{isRtl ? 'الفترة الزمنية الجديدة' : 'New Time Slot'}</label>
                <select
                  value={showRescheduleModal.time_slot}
                  onChange={(e) => setShowRescheduleModal({ ...showRescheduleModal, time_slot: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
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
                  onClick={() => setShowRescheduleModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black"
                >
                  {isRtl ? 'تأكيد الموعد الجديد' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
