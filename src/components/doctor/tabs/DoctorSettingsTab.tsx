import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '../../../i18n/routing';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/authService';
import { ChangePasswordCard } from '../../shared/ChangePasswordCard';
import { DoctorStaffTab } from './DoctorStaffTab';
import {
  Settings,
  Clock,
  Calendar,
  User,
  Building,
  ShieldCheck,
  Bell,
  Globe,
  Lock,
  EyeOff,
  Download,
  Info,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  Save,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  CircleHelp,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Users,
  AlertCircle,
  Edit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DoctorSettingsTabProps {
  isDarkMode?: boolean;
  defaultSubTab?: string;
}

export interface ExceptionRecord {
  id: string;
  type: 'vacation' | 'conference' | 'emergency' | 'holiday' | 'pause';
  typeNameAr: string;
  startDate: string;
  endDate: string;
  reason: string;
  description: string;
  bookingStatus: 'unavailable' | 'pending';
}

export interface ConflictingAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  appointmentTime: string;
  conflictReason: string;
  status: 'needs_review' | 'approved_as_is' | 'rescheduled' | 'cancelled';
  newProposedTime?: string;
}

export interface SettingsAuditLog {
  id: string;
  timestamp: string;
  user: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  reason: string;
  ipAddress: string;
  device: string;
}

export const DoctorSettingsTab: React.FC<DoctorSettingsTabProps> = ({
  isDarkMode = false,
  defaultSubTab = 'working-hours'
}) => {
  const t = useTranslations('doctor.settings');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const cardBgClass = isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200/70";

  const initialSubTab = searchParams?.get('subtab') || defaultSubTab;
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlSubTab = searchParams?.get('subtab');
    if (urlSubTab && urlSubTab !== activeSubTab) {
      setActiveSubTab(urlSubTab);
    }
  }, [searchParams]);

  // Auto-scroll active subtab into view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector<HTMLElement>(`[data-subtab-id="${activeSubTab}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeSubTab]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      tabsContainerRef.current.scrollBy({ left: isRtl ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSubTabChange = (newSubTab: string) => {
    setActiveSubTab(newSubTab);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('tab', 'settings');
    params.set('subtab', newSubTab);
    const qs = params.toString();
    router.push(`${pathname}?${qs}`, { scroll: false });
  };

  // 1. Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    title: t('mockData.personalTitle'),
    fullName: t('mockData.fullName'),
    specialty: t('mockData.specialty'),
    licenseNumber: 'DZ-ALGIERS-88492',
    phone: '+213 555 12 34 56',
    email: 'dr.larbi@aafiya.dz'
  });

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const user = await authService.me();
        if (isMounted && user) {
          setPersonalInfo(prev => ({
            ...prev,
            fullName: user.name || prev.fullName,
            email: user.email || prev.email,
          }));
          if (user.clinic?.name) {
            setClinicInfo(prev => ({
              ...prev,
              name: user.clinic?.name || prev.name,
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load profile in settings:', err);
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Clinic Info State
  const [clinicInfo, setClinicInfo] = useState({
    name: t('mockData.clinicName'),
    address: t('mockData.clinicAddress'),
    city: t('mockData.clinicCity'),
    phone: '+213 21 63 45 00',
    email: 'contact@ibnsina-clinic.dz',
    roomCount: t('mockData.roomCount')
  });

  // 3. Weekly Working Hours Schedule State
  const [workingHours, setWorkingHours] = useState([
    {
      id: 'sun',
      dayAr: t('days.sunday'),
      isOpen: true,
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      maxPatientsPerSlot: 10,
      slotDurationMin: 20,
      note: t('workingHours.fullTime')
    },
    {
      id: 'mon',
      dayAr: t('days.monday'),
      isOpen: true,
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      maxPatientsPerSlot: 10,
      slotDurationMin: 20,
      note: t('workingHours.fullTime')
    },
    {
      id: 'tue',
      dayAr: t('days.tuesday'),
      isOpen: true,
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      maxPatientsPerSlot: 10,
      slotDurationMin: 20,
      note: t('workingHours.fullTime')
    },
    {
      id: 'wed',
      dayAr: t('days.wednesday'),
      isOpen: true,
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      maxPatientsPerSlot: 10,
      slotDurationMin: 20,
      note: t('workingHours.fullTime')
    },
    {
      id: 'thu',
      dayAr: t('days.thursday'),
      isOpen: true,
      startTime: '08:00',
      endTime: '14:00',
      breakStart: '11:30',
      breakEnd: '12:00',
      maxPatientsPerSlot: 10,
      slotDurationMin: 20,
      note: t('workingHours.halfDay')
    },
    {
      id: 'fri',
      dayAr: t('days.friday'),
      isOpen: false,
      startTime: '08:00',
      endTime: '12:00',
      breakStart: '00:00',
      breakEnd: '00:00',
      maxPatientsPerSlot: 0,
      slotDurationMin: 20,
      note: t('workingHours.weekend')
    },
    {
      id: 'sat',
      dayAr: t('days.saturday'),
      isOpen: true,
      startTime: '09:00',
      endTime: '13:00',
      breakStart: '11:00',
      breakEnd: '11:30',
      maxPatientsPerSlot: 5,
      slotDurationMin: 30,
      note: t('workingHours.complexCases')
    }
  ]);

  // 4. Vacations & Exceptions State
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([
    {
      id: 'exc-1',
      type: 'conference',
      typeNameAr: t('types.conference'),
      startDate: '2026-08-15',
      endDate: '2026-08-17',
      reason: t('mockData.exc1Reason'),
      description: t('mockData.exc1Desc'),
      bookingStatus: 'unavailable'
    },
    {
      id: 'exc-2',
      type: 'vacation',
      typeNameAr: t('types.vacation'),
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      reason: t('mockData.exc2Reason'),
      description: t('mockData.exc2Desc'),
      bookingStatus: 'unavailable'
    },
    {
      id: 'exc-3',
      type: 'emergency',
      typeNameAr: t('types.emergency'),
      startDate: '2026-08-28',
      endDate: '2026-08-28',
      reason: t('mockData.exc3Reason'),
      description: t('mockData.exc3Desc'),
      bookingStatus: 'unavailable'
    }
  ]);

  // Form states for adding new exception
  const [newExcType, setNewExcType] = useState<ExceptionRecord['type']>('vacation');
  const [newExcStartDate, setNewExcStartDate] = useState('');
  const [newExcEndDate, setNewExcEndDate] = useState('');
  const [newExcReason, setNewExcReason] = useState('');
  const [newExcDesc, setNewExcDesc] = useState('');

  // Conflicting Appointments State (affected by schedule changes/vacations)
  const [conflictingAppointments, setConflictingAppointments] = useState<ConflictingAppointment[]>([
    {
      id: 'apt-101',
      patientName: t('mockData.patient1Name'),
      patientPhone: '+213 661 22 33 44',
      appointmentTime: t('mockData.apt1Time'),
      conflictReason: t('mockData.apt1Conflict'),
      status: 'needs_review'
    },
    {
      id: 'apt-102',
      patientName: t('mockData.patient2Name'),
      patientPhone: '+213 770 11 22 33',
      appointmentTime: t('mockData.apt2Time'),
      conflictReason: t('mockData.apt2Conflict'),
      status: 'needs_review'
    },
    {
      id: 'apt-103',
      patientName: t('mockData.patient3Name'),
      patientPhone: '+213 552 44 55 66',
      appointmentTime: t('mockData.apt3Time'),
      conflictReason: t('mockData.apt3Conflict'),
      status: 'needs_review'
    }
  ]);

  // 5. Audit Log State
  const [auditLogs, setAuditLogs] = useState<SettingsAuditLog[]>([
    {
      id: 'log-1',
      timestamp: '2026-08-06 09:15',
      user: t('mockData.doctorNameWithRole'),
      fieldChanged: t('mockData.log1Field'),
      oldValue: t('workingHours.openStatus'),
      newValue: t('mockData.log1NewValue'),
      reason: t('mockData.log1Reason'),
      ipAddress: '197.204.18.92',
      device: t('mockData.clinicDevice')
    },
    {
      id: 'log-2',
      timestamp: '2026-08-05 14:30',
      user: t('mockData.doctorNameWithRole'),
      fieldChanged: t('mockData.log2Field'),
      oldValue: '08:00 - 16:00',
      newValue: '08:00 - 14:00',
      reason: t('mockData.log2Reason'),
      ipAddress: '197.204.18.92',
      device: t('mockData.clinicDevice')
    }
  ]);

  // General settings state
  const [bookingSettings, setBookingSettings] = useState({
    autoApproveRegistered: true,
    autoApproveGuest: false,
    minAdvanceHours: 2,
    cancellationLeadHours: 24,
    showIncomeOnDashboard: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    smsAlerts: true,
    whatsappConfirmations: true,
    urgentPush: true,
    doctorDirectivesSound: true
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const addAuditEntry = (field: string, oldVal: string, newVal: string, reason: string) => {
    const newLog: SettingsAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(isRtl ? 'ar-DZ' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
      user: t('mockData.doctorNameWithRole'),
      fieldChanged: field,
      oldValue: oldVal,
      newValue: newVal,
      reason: reason || t('auditLog.defaultReason'),
      ipAddress: '197.204.18.92',
      device: t('mockData.clinicDevice')
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleDayToggle = (id: string) => {
    setWorkingHours((prev) =>
      prev.map((wh) => {
        if (wh.id === id) {
          const updated = !wh.isOpen;
          addAuditEntry(
            t('auditLog.dayStatusField', { day: wh.dayAr }),
            wh.isOpen ? t('workingHours.openStatus') : t('workingHours.closedStatus'),
            updated ? t('workingHours.openStatus') : t('workingHours.closedStatus'),
            t('auditLog.scheduleChangeReason')
          );
          return { ...wh, isOpen: updated };
        }
        return wh;
      })
    );
    triggerToast(t('workingHours.toastUpdated'));
  };

  const handleWorkingHourChange = (id: string, field: string, val: any) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.id === id ? { ...wh, [field]: val } : wh))
    );
  };

  const saveWorkingHours = () => {
    addAuditEntry(
      t('auditLog.weeklyScheduleField'),
      t('auditLog.previousScheduleValue'),
      t('auditLog.newScheduleValue'),
      t('auditLog.saveScheduleReason')
    );
    triggerToast(t('workingHours.successMessage'));
  };

  const handleAddException = () => {
    if (!newExcStartDate || !newExcReason.trim()) {
      alert(t('vacationExceptions.alertMissingData'));
      return;
    }

    const typeNames: Record<ExceptionRecord['type'], string> = {
      vacation: t('types.vacation'),
      conference: t('types.conference'),
      emergency: t('types.emergency'),
      holiday: t('types.holiday'),
      pause: t('types.pause')
    };

    const newRecord: ExceptionRecord = {
      id: `exc-${Date.now()}`,
      type: newExcType,
      typeNameAr: typeNames[newExcType],
      startDate: newExcStartDate,
      endDate: newExcEndDate || newExcStartDate,
      reason: newExcReason.trim(),
      description: newExcDesc.trim() || t('vacationExceptions.noDetails'),
      bookingStatus: 'unavailable'
    };

    setExceptions((prev) => [...prev, newRecord]);
    addAuditEntry(
      t('auditLog.addExceptionField', { type: typeNames[newExcType] }),
      t('workingHours.openStatus'),
      t('auditLog.unavailableValue', { start: newExcStartDate, end: newExcEndDate || newExcStartDate }),
      newExcReason
    );

    setNewExcStartDate('');
    setNewExcEndDate('');
    setNewExcReason('');
    setNewExcDesc('');

    triggerToast(t('vacationExceptions.toastSuccess'));
  };

  const handleDeleteException = (id: string, reason: string) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    addAuditEntry(t('auditLog.deleteExceptionField'), reason, t('auditLog.normalWorkValue'), t('auditLog.manualDeleteReason'));
    triggerToast(t('vacationExceptions.toastDeleted'));
  };

  const handleAppointmentResolution = (
    aptId: string,
    action: 'approved_as_is' | 'rescheduled' | 'cancelled',
    proposedTime?: string
  ) => {
    setConflictingAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id === aptId) {
          return {
            ...apt,
            status: action,
            newProposedTime: proposedTime
          };
        }
        return apt;
      })
    );

    const actionText =
      action === 'approved_as_is'
        ? t('vacationExceptions.decisionApproved')
        : action === 'rescheduled'
        ? t('vacationExceptions.rescheduleText', { time: proposedTime || t('vacationExceptions.newTime') })
        : t('vacationExceptions.decisionCancel');

    addAuditEntry(t('auditLog.appointmentConflictField'), t('auditLog.affectedValue'), actionText, t('auditLog.manualReviewReason'));

    triggerToast(t('vacationExceptions.toastDecision', { action: actionText }));
  };

  const tabsList = [
    { id: 'personal', label: t('tabs.personal'), icon: User },
    { id: 'clinic', label: t('tabs.clinic'), icon: Building },
    { id: 'working-hours', label: t('tabs.workingHours'), icon: Clock, badge: t('tabs.scheduleBadge') },
    { id: 'vacation-exceptions', label: t('tabs.vacationExceptions'), icon: Calendar, badge: t('tabs.vacationBadge') },
    { id: 'assistants', label: t('tabs.assistants'), icon: Users },
    { id: 'booking-rules', label: t('tabs.bookingRules'), icon: Sliders },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
    { id: 'appearance', label: t('tabs.appearance'), icon: Globe },
    { id: 'security', label: t('tabs.security'), icon: Lock },
    { id: 'privacy', label: t('tabs.privacy'), icon: EyeOff },
    { id: 'export', label: t('tabs.export'), icon: Download },
    { id: 'about', label: t('tabs.about'), icon: Info }
  ];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-bounce`}>
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                {t('subtitle')}
              </span>
              <span className="text-xs text-slate-500">{t('path')}</span>
            </div>
            <h2 className={`text-xl font-extrabold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubTabChange('working-hours')}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>{t('workingHoursButton')}</span>
          </button>
          <button
            onClick={() => handleSubTabChange('vacation-exceptions')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>{t('vacationsButton')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar with Independent Scroll, Auto-Centering & Direction Controls */}
      <div className={`${containerClass} rounded-2xl p-2 border relative transition-all`}>
        <div className="flex items-center gap-1.5 relative">
          
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 shadow-xs z-10 cursor-pointer"
            aria-label="Scroll subtabs backward"
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Scrollable Subtabs Container */}
          <div
            ref={tabsContainerRef}
            className="overflow-x-auto scroll-smooth flex items-center gap-1.5 flex-1 scrollbar-none py-0.5 px-0.5"
          >
            {tabsList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-subtab-id={tab.id}
                  onClick={() => handleSubTabChange(tab.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold ring-2 ring-blue-400/40'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 shadow-xs z-10 cursor-pointer"
            aria-label="Scroll subtabs forward"
          >
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

        </div>
      </div>

      {/* TAB 1: Personal Info */}
      {activeSubTab === 'personal' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('personal.title')}</h3>
            </div>
            <span className="text-xs text-slate-500">{t('personal.description')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.academicTitle')}</label>
              <input
                type="text"
                value={personalInfo.title}
                onChange={(e) => setPersonalInfo({ ...personalInfo, title: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.fullName')}</label>
              <input
                type="text"
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.specialty')}</label>
              <input
                type="text"
                value={personalInfo.specialty}
                onChange={(e) => setPersonalInfo({ ...personalInfo, specialty: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.licenseNumber')}</label>
              <input
                type="text"
                value={personalInfo.licenseNumber}
                onChange={(e) => setPersonalInfo({ ...personalInfo, licenseNumber: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.phone')}</label>
              <input
                type="text"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.email')}</label>
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => {
                addAuditEntry(t('tabs.personal'), t('auditLog.previousScheduleValue'), personalInfo.fullName, t('personal.saveButton'));
                triggerToast(t('personal.successMessage'));
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t('personal.saveButton')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Clinic Info */}
      {activeSubTab === 'clinic' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('clinic.title')}</h3>
            </div>
            <span className="text-xs text-slate-500">{t('clinic.description')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.name')}</label>
              <input
                type="text"
                value={clinicInfo.name}
                onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.city')}</label>
              <input
                type="text"
                value={clinicInfo.city}
                onChange={(e) => setClinicInfo({ ...clinicInfo, city: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.address')}</label>
              <input
                type="text"
                value={clinicInfo.address}
                onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.phone')}</label>
              <input
                type="text"
                value={clinicInfo.phone}
                onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.email')}</label>
              <input
                type="text"
                value={clinicInfo.email}
                onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => {
                addAuditEntry(t('tabs.clinic'), t('auditLog.previousScheduleValue'), clinicInfo.name, t('clinic.saveButton'));
                triggerToast(t('clinic.successMessage'));
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t('clinic.saveButton')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Working Hours (ساعات العمل) - Integrates Clinic Schedule Engine */}
      {activeSubTab === 'working-hours' && (
        <div className="space-y-6">
          
          {/* Important Business Rule Banner */}
          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="font-bold block text-sm">{t('workingHours.ruleTitle')}</strong>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {t('workingHours.ruleDesc')}
              </p>
            </div>
          </div>

          {/* Weekly Schedule Grid Editor */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-base">{t('workingHours.title')}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t('workingHours.subtitle')}</p>
                </div>
              </div>

              <button
                onClick={saveWorkingHours}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t('workingHours.saveButton')}</span>
              </button>
            </div>

            {/* Days Rows */}
            <div className="space-y-3">
              {workingHours.map((wh) => (
                <div
                  key={wh.id}
                  className={`p-4 rounded-xl border transition-all ${
                    wh.isOpen ? cardBgClass : isDarkMode ? 'bg-slate-950/40 border-slate-800 opacity-60' : 'bg-slate-100/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
                    
                    {/* Day Name & Toggle */}
                    <div className="lg:col-span-3 flex items-center justify-between gap-3 border-b lg:border-b-0 pb-2 lg:pb-0 border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleDayToggle(wh.id)}
                          className={`w-10 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                            wh.isOpen ? 'bg-teal-600' : 'bg-slate-400'
                          }`}
                        >
                          <span
                            className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                              wh.isOpen ? (isRtl ? 'translate-x-[-16px]' : 'translate-x-4') : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div>
                          <strong className="font-bold block text-sm">{wh.dayAr}</strong>
                          <span className={`text-[10px] font-bold ${wh.isOpen ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                            {wh.isOpen ? t('workingHours.openStatus') : t('workingHours.closedStatus')}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {wh.note}
                      </span>
                    </div>

                    {wh.isOpen ? (
                      <>
                        {/* Working Hours Times */}
                        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">{t('workingHours.startWork')}</label>
                            <input
                              type="time"
                              value={wh.startTime}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'startTime', e.target.value)}
                              className="w-full p-2 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">{t('workingHours.endWork')}</label>
                            <input
                              type="time"
                              value={wh.endTime}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'endTime', e.target.value)}
                              className="w-full p-2 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>

                        {/* Break Times */}
                        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">{t('workingHours.startBreak')}</label>
                            <input
                              type="time"
                              value={wh.breakStart}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'breakStart', e.target.value)}
                              className="w-full p-2 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">{t('workingHours.endBreak')}</label>
                            <input
                              type="time"
                              value={wh.breakEnd}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'breakEnd', e.target.value)}
                              className="w-full p-2 rounded-lg border font-mono font-bold bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>

                        {/* Patient Capacity */}
                        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">{t('workingHours.capacity')}</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={wh.maxPatientsPerSlot}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'maxPatientsPerSlot', parseInt(e.target.value) || 1)}
                              className="w-full p-2 rounded-lg border font-bold bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">{t('workingHours.duration')}</label>
                            <select
                              value={wh.slotDurationMin}
                              onChange={(e) => handleWorkingHourChange(wh.id, 'slotDurationMin', parseInt(e.target.value))}
                              className="w-full p-2 rounded-lg border font-bold bg-white dark:bg-slate-900"
                            >
                              <option value={15}>{t('workingHours.minutes', { count: 15 })}</option>
                              <option value={20}>{t('workingHours.minutes', { count: 20 })}</option>
                              <option value={30}>{t('workingHours.minutes', { count: 30 })}</option>
                              <option value={45}>{t('workingHours.minutes', { count: 45 })}</option>
                              <option value={60}>{t('workingHours.minutes', { count: 60 })}</option>
                            </select>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="lg:col-span-9 p-2 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 font-bold text-center">
                        {t('workingHours.closedNote')}
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: Vacation & Exceptions (الإجازات والاستثناءات) */}
      {activeSubTab === 'vacation-exceptions' && (
        <div className="space-y-6">
          
          {/* Top Info Banner */}
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="font-bold block text-sm">{t('vacationExceptions.bannerTitle')}</strong>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {t('vacationExceptions.bannerDesc')}
              </p>
            </div>
          </div>

          {/* New Exception Creation Form */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <Plus className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">{t('vacationExceptions.addTitle')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('vacationExceptions.typeLabel')}</label>
                <select
                  value={newExcType}
                  onChange={(e) => setNewExcType(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
                >
                  <option value="vacation">{t('types.vacation')}</option>
                  <option value="conference">{t('types.conference')}</option>
                  <option value="emergency">{t('types.emergency')}</option>
                  <option value="holiday">{t('types.holiday')}</option>
                  <option value="pause">{t('types.pause')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('vacationExceptions.startDate')}</label>
                <input
                  type="date"
                  value={newExcStartDate}
                  onChange={(e) => setNewExcStartDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('vacationExceptions.endDate')}</label>
                <input
                  type="date"
                  value={newExcEndDate}
                  onChange={(e) => setNewExcEndDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('vacationExceptions.reasonLabel')}</label>
                <input
                  type="text"
                  placeholder={t('vacationExceptions.reasonPlaceholder')}
                  value={newExcReason}
                  onChange={(e) => setNewExcReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('vacationExceptions.descriptionLabel')}</label>
              <input
                type="text"
                placeholder={t('vacationExceptions.descriptionPlaceholder')}
                value={newExcDesc}
                onChange={(e) => setNewExcDesc(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddException}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('vacationExceptions.saveButton')}</span>
              </button>
            </div>
          </div>

          {/* Registered Exceptions Table */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>{t('vacationExceptions.listTitle')}</span>
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                {t('vacationExceptions.activeCount', { count: exceptions.length })}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${cardBgClass}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] border border-amber-500/30">
                        {exc.typeNameAr}
                      </span>
                      <strong className="font-bold text-sm">{exc.reason}</strong>
                    </div>

                    <p className="text-slate-500 text-[11px]">{exc.description}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span>{t('vacationExceptions.startDate')}: <strong>{exc.startDate}</strong></span>
                      <span>{t('vacationExceptions.endDate')}: <strong>{exc.endDate}</strong></span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{t('workingHours.closedStatus')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteException(exc.id, exc.reason)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('vacationExceptions.cancelButton')}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Conflicting Appointments Review Widget */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span>{t('vacationExceptions.conflictsTitle')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('vacationExceptions.conflictsDesc')}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 font-bold text-xs border border-rose-500/20">
                {conflictingAppointments.filter((a) => a.status === 'needs_review').length} {t('activityLog.filterPending')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {conflictingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    apt.status === 'needs_review'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : cardBgClass
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                    <div>
                      <strong className="font-bold text-sm block">{apt.patientName}</strong>
                      <span className="text-slate-500 font-mono">{apt.patientPhone}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-blue-600 dark:text-blue-400 block">{apt.appointmentTime}</span>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{apt.conflictReason}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-[11px]">
                      <span className="text-slate-500">{t('conflicts.reviewStatus')} </span>
                      <strong className={`font-bold ${
                        apt.status === 'needs_review'
                          ? 'text-amber-600'
                          : apt.status === 'approved_as_is'
                          ? 'text-emerald-600'
                          : apt.status === 'rescheduled'
                          ? 'text-blue-600'
                          : 'text-rose-600'
                      }`}>
                        {apt.status === 'needs_review' && t('conflicts.pendingDecision')}
                        {apt.status === 'approved_as_is' && t('conflicts.approvedAsIs')}
                        {apt.status === 'rescheduled' && t('conflicts.rescheduledWithTime', { time: apt.newProposedTime || t('vacationExceptions.newTime') })}
                        {apt.status === 'cancelled' && t('conflicts.cancelledByClinic')}
                      </strong>
                    </div>

                    {apt.status === 'needs_review' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleAppointmentResolution(apt.id, 'approved_as_is')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {t('conflicts.approveButton')}
                        </button>
                        <button
                          onClick={() => handleAppointmentResolution(apt.id, 'rescheduled', isRtl ? 'اليوم الموالي 09:00 صباحاً' : 'Next day 09:00 AM')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {t('conflicts.rescheduleButton')}
                        </button>
                        <button
                          onClick={() => handleAppointmentResolution(apt.id, 'cancelled')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {t('conflicts.cancelButton')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('conflicts.noticeSent')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: Staff & Assistant Management */}
      {activeSubTab === 'assistants' && (
        <DoctorStaffTab isDarkMode={isDarkMode} />
      )}

      {/* TAB 6: Booking Rules */}
      {activeSubTab === 'booking-rules' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.bookingRules')}</h3>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-950">
              <div>
                <strong className="font-bold block">{t('bookingRules.autoApproveLabel')}</strong>
                <p className="text-slate-500 text-[11px]">{t('bookingRules.autoApproveDesc')}</p>
              </div>
              <button
                onClick={() => setBookingSettings({ ...bookingSettings, autoApproveRegistered: !bookingSettings.autoApproveRegistered })}
                className={`w-10 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  bookingSettings.autoApproveRegistered ? 'bg-blue-600' : 'bg-slate-400'
                }`}
              >
                <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  bookingSettings.autoApproveRegistered ? (isRtl ? 'translate-x-[-16px]' : 'translate-x-[16px]') : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Notifications */}
      {activeSubTab === 'notifications' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.notifications')}</h3>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500">{t('notifications.description')}</p>
          </div>
        </div>
      )}

      {/* TAB 8: Appearance */}
      {activeSubTab === 'appearance' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.appearance')}</h3>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold block text-slate-700 dark:text-slate-300 mb-1">{t('appearance.languageLabel')}</label>
              <select 
                className={`w-full max-w-xs p-2.5 rounded-xl border font-bold ${cardBgClass}`} 
                value={locale}
                onChange={(e) => {
                  router.replace(pathname, { locale: e.target.value as any });
                }}
              >
                <option value="ar">العربية (Arabic)</option>
                <option value="fr">Français (French)</option>
                <option value="en">English (English)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: Security */}
      {activeSubTab === 'security' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-base">{t('tabs.security')}</h3>
            </div>
          </div>

          <div className="max-w-xl">
            <ChangePasswordCard isRtl={isRtl} isDarkMode={isDarkMode} />
          </div>
        </div>
      )}

      {/* TAB 10: Privacy */}
      {activeSubTab === 'privacy' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.privacy')}</h3>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500">{t('privacy.description')}</p>
          </div>
        </div>
      )}

      {/* TAB 11: Export */}
      {activeSubTab === 'export' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.export')}</h3>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500">{t('export.description')}</p>
          </div>
        </div>
      )}

      {/* TAB 12: About System */}
      {activeSubTab === 'about' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">{t('tabs.about')}</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-700 dark:text-slate-300 font-bold">{t('about.version')}</p>
            <p className="text-slate-500">{t('about.compliance')}</p>
          </div>
        </div>
      )}

      {/* Live Activity Log Section at Bottom of Settings */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-bold text-sm">{t('auditLog.title')}</h3>
              <p className="text-[11px] text-slate-500">{t('auditLog.description')}</p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-bold">
            {t('auditLog.activeLogs', { count: auditLogs.length })}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${cardBgClass}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{log.fieldChanged}</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  {t('auditLog.table.oldValue')}: <span className="line-through opacity-70">{log.oldValue}</span> ➔ {t('auditLog.table.newValue')}: <strong className="text-teal-600 dark:text-teal-400">{log.newValue}</strong>
                </p>
                <span className="text-[10px] text-slate-400 block">{t('auditLog.table.reason')}: {log.reason}</span>
              </div>

              <div className={`text-${isRtl ? 'left' : 'right'} text-[10px] text-slate-400 font-mono`}>
                <span className="block">{log.user}</span>
                <span>IP: {log.ipAddress}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
