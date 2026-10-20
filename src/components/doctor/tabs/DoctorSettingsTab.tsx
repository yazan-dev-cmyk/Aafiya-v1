import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '../../../i18n/routing';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/authService';
import { clinicService } from '@/services/clinicService';
import { useAuth } from '@/auth';
import { SpecialtySelect, masterDataService } from '@/components/master-data';
import { ChangePasswordCard } from '../../shared/ChangePasswordCard';
import { DoctorStaffTab } from './DoctorStaffTab';
import { ClinicOperatingHoursEditor } from './ClinicOperatingHoursEditor';
import { DoctorWorkingHoursEditor } from './DoctorWorkingHoursEditor';
import { DoctorVacationModal } from './DoctorVacationModal';
import { UnresolvedReschedulesDashboard } from '../../clinic/UnresolvedReschedulesDashboard';
import { vacationService, DoctorVacationItem } from '@/services/vacationService';
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
  onClinicHoursUpdated?: () => void;
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
  defaultSubTab = 'working-hours',
  onClinicHoursUpdated,
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
    fullName: '',
    specialty: '',
    specialtyId: undefined as number | undefined,
    licenseNumber: '',
    isVerified: false,
    phone: '',
    email: '',
    bio: '',
  });

  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const currentUser = await authService.me();
        if (isMounted && currentUser) {
          setPersonalInfo(prev => ({
            ...prev,
            fullName: currentUser.name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            specialty: currentUser.doctor?.specialty || '',
            specialtyId: currentUser.doctor?.specialty_id,
            licenseNumber: currentUser.doctor?.license_number || '',
            isVerified: Boolean(currentUser.doctor?.is_verified),
            bio: currentUser.doctor?.bio || '',
          }));
          if (currentUser.clinic?.name) {
            setClinicInfo(prev => ({
              ...prev,
              name: currentUser.clinic?.name || prev.name,
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

  // Auth and Clinic Context Resolution
  const { user, activeClinicId, hasPermission, refreshUser } = useAuth();
  const effectiveClinicId = activeClinicId || user?.clinic?.id;
  const activeAffiliation = user?.clinics?.find((c) => c.id === effectiveClinicId) || user?.clinic;
  const isDirector = activeAffiliation?.position === 'director' || activeAffiliation?.is_director === true;
  const canManageSettings = isDirector || Boolean(user?.permissions?.includes('clinic.manage_settings')) || hasPermission('clinic.manage_settings');

  const handleSavePersonal = async () => {
    setProfileErrorMessage(null);
    setProfileSuccessMessage(null);

    const trimmedName = personalInfo.fullName.trim();
    const trimmedPhone = personalInfo.phone.trim();

    if (!trimmedName) {
      setProfileErrorMessage(isRtl ? 'الاسم الكامل مطلوب ولا يمكن تركه فارغاً.' : 'Full name is required.');
      return;
    }
    if (!trimmedPhone) {
      setProfileErrorMessage(isRtl ? 'رقم الهاتف مطلوب ولا يمكن تركه فارغاً.' : 'Phone number is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload: {
        name: string;
        phone: string;
        specialty_id?: number;
        bio?: string | null;
      } = {
        name: trimmedName,
        phone: trimmedPhone,
        bio: personalInfo.bio.trim() || null,
      };

      if (personalInfo.specialtyId) {
        payload.specialty_id = personalInfo.specialtyId;
      }

      const updatedUser = await authService.updateProfile(payload);

      setPersonalInfo(prev => ({
        ...prev,
        fullName: updatedUser.name || prev.fullName,
        phone: updatedUser.phone || prev.phone,
        specialty: updatedUser.doctor?.specialty || prev.specialty,
        specialtyId: updatedUser.doctor?.specialty_id ?? prev.specialtyId,
        bio: updatedUser.doctor?.bio ?? '',
      }));

      await refreshUser();

      addAuditEntry(
        t('tabs.personal'),
        t('auditLog.previousScheduleValue'),
        trimmedName,
        t('personal.saveButton')
      );
      setProfileSuccessMessage(t('personal.successMessage'));
      triggerToast(t('personal.successMessage'));
    } catch (err: any) {
      console.error('Failed to update doctor profile:', err);
      const msg = err?.errors?.name?.[0]
        || err?.errors?.phone?.[0]
        || err?.errors?.specialty_id?.[0]
        || err?.errors?.bio?.[0]
        || err?.errors?.email?.[0]
        || err?.errors?.license_number?.[0]
        || err?.message
        || (isRtl ? 'حدث خطأ أثناء حفظ الملف الشخصي.' : 'An error occurred while saving profile.');
      setProfileErrorMessage(msg);
      triggerToast(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Authoritative Slot Capacity & Duration State
  const [slotCapacity, setSlotCapacity] = useState<number>(10);
  const [clinicSettingsLoading, setClinicSettingsLoading] = useState<boolean>(false);
  const [clinicSettingsError, setClinicSettingsError] = useState<string | null>(null);
  const [isSavingCapacity, setIsSavingCapacity] = useState<boolean>(false);
  const [capacitySuccessMessage, setCapacitySuccessMessage] = useState<string | null>(null);
  const [capacityErrorMessage, setCapacityErrorMessage] = useState<string | null>(null);

  // Clinic Information Persistence State & Feedback
  const [isSavingClinicInfo, setIsSavingClinicInfo] = useState<boolean>(false);
  const [clinicInfoSuccessMessage, setClinicInfoSuccessMessage] = useState<string | null>(null);
  const [clinicInfoErrorMessage, setClinicInfoErrorMessage] = useState<string | null>(null);

  // 3. Weekly Working Hours Schedule State (Strict 60-min Platform Invariant)
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
      slotDurationMin: 60,
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
      slotDurationMin: 60,
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
      slotDurationMin: 60,
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
      slotDurationMin: 60,
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
      slotDurationMin: 60,
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
      slotDurationMin: 60,
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
      maxPatientsPerSlot: 10,
      slotDurationMin: 60,
      note: t('workingHours.complexCases')
    }
  ]);

  // 4. Vacations & Exceptions State (Integrated with Backend API DEC-VAC-01 / DEC-VAC-05)
  const [vacations, setVacations] = useState<DoctorVacationItem[]>([]);
  const [loadingVacations, setLoadingVacations] = useState<boolean>(false);
  const [vacationsError, setVacationsError] = useState<string | null>(null);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState<boolean>(false);
  const [cancellingVacationId, setCancellingVacationId] = useState<string | null>(null);

  const fetchVacations = async () => {
    setLoadingVacations(true);
    setVacationsError(null);
    try {
      const res = await vacationService.getDoctorVacations(1, 50);
      const raw = res.data || [];
      const list = Array.isArray(raw) ? raw : (raw as any)?.data || [];
      setVacations(list);
    } catch (err: any) {
      console.error('Failed to load vacations:', err);
      setVacationsError(
        err?.response?.data?.message ||
        err?.message ||
        (isRtl ? 'تعذر تحميل قائمة الإجازات من الخادم.' : 'Failed to load vacations from server.')
      );
    } finally {
      setLoadingVacations(false);
    }
  };

  const handleCancelVacation = async (vacationId: string) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من رغبتك في إلغاء هذه الإجازة؟' : 'Are you sure you want to cancel this vacation?')) {
      return;
    }
    setCancellingVacationId(vacationId);
    try {
      await vacationService.cancelVacation(vacationId);
      triggerToast(isRtl ? 'تم إلغاء الإجازة بنجاح.' : 'Vacation cancelled successfully.');
      await fetchVacations();
    } catch (err: any) {
      console.error('Failed to cancel vacation:', err);
      alert(
        err?.response?.data?.message ||
        err?.message ||
        (isRtl ? 'تعذر إلغاء الإجازة. يرجى المحاولة لاحقاً.' : 'Failed to cancel vacation.')
      );
    } finally {
      setCancellingVacationId(null);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'vacation-exceptions') {
      fetchVacations();
    }
  }, [activeSubTab]);

  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);

  // Form states for adding new exception
  const [newExcType, setNewExcType] = useState<ExceptionRecord['type']>('vacation');
  const [newExcStartDate, setNewExcStartDate] = useState('');
  const [newExcEndDate, setNewExcEndDate] = useState('');
  const [newExcReason, setNewExcReason] = useState('');
  const [newExcDesc, setNewExcDesc] = useState('');

  // Conflicting Appointments State (Empty initial state; Backend endpoints not yet implemented)
  const [conflictingAppointments, setConflictingAppointments] = useState<ConflictingAppointment[]>([]);

  // 5. Audit Log State (Empty initial state; Backend clinical/settings audit trail pending integration)
  const [auditLogs, setAuditLogs] = useState<SettingsAuditLog[]>([]);

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

  // Fetch Authoritative Clinic Settings on mount / active clinic change
  useEffect(() => {
    if (!effectiveClinicId) return;

    let isMounted = true;
    const fetchClinicSettings = async () => {
      setClinicSettingsLoading(true);
      setClinicSettingsError(null);
      try {
        const res = await clinicService.getClinic(effectiveClinicId);
        if (!isMounted) return;
        if (res.data) {
          const fetchedCapacity = res.data.max_patients_per_slot ?? 10;
          setSlotCapacity(fetchedCapacity);
          setWorkingHours((prev) =>
            prev.map((wh) => ({
              ...wh,
              maxPatientsPerSlot: wh.isOpen ? fetchedCapacity : 0,
              slotDurationMin: 60,
            }))
          );
          if (res.data.name) {
            setClinicInfo((prev) => ({
              ...prev,
              name: res.data.name || prev.name,
              address: res.data.address || prev.address,
              phone: res.data.phone || prev.phone,
            }));
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Failed to load clinic settings in settings tab:', err);
        setClinicSettingsError(
          err?.message || (isRtl ? 'تعذر تحميل إعدادات العيادة من الخادم.' : 'Failed to load clinic settings.')
        );
      } finally {
        if (isMounted) {
          setClinicSettingsLoading(false);
        }
      }
    };

    fetchClinicSettings();
    return () => {
      isMounted = false;
    };
  }, [effectiveClinicId, isRtl]);

  const handleSaveSlotCapacity = async () => {
    if (!effectiveClinicId) return;
    if (!canManageSettings) {
      setCapacityErrorMessage(
        isRtl
          ? 'غير مصرح: يحق لمدير العيادة فقط تعديل وحفظ سعة المواعيد.'
          : 'Forbidden: Only the Clinic Director can update slot capacity.'
      );
      return;
    }

    const parsedCapacity = Number(slotCapacity);
    if (isNaN(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 10) {
      setCapacityErrorMessage(
        isRtl
          ? 'سعة الموعد غير صالحة. يجب أن تكون القيمة بين 1 و 10 مرضى لكل فترة.'
          : 'Invalid capacity. Must be between 1 and 10 patients per slot.'
      );
      return;
    }

    setIsSavingCapacity(true);
    setCapacityErrorMessage(null);
    setCapacitySuccessMessage(null);

    try {
      const res = await clinicService.updateClinic(effectiveClinicId, {
        max_patients_per_slot: parsedCapacity,
      });

      if (res.data) {
        const updatedCapacity = res.data.max_patients_per_slot ?? parsedCapacity;
        setSlotCapacity(updatedCapacity);
        setWorkingHours((prev) =>
          prev.map((wh) => ({
            ...wh,
            maxPatientsPerSlot: wh.isOpen ? updatedCapacity : 0,
            slotDurationMin: 60,
          }))
        );
      }

      const msg = isRtl
        ? 'تم حفظ سعة المواعيد بنجاح والتزامن مع محرك الحجز بالعيادة.'
        : 'Slot capacity saved successfully and synchronized with booking engine.';
      setCapacitySuccessMessage(msg);
      triggerToast(msg);
    } catch (err: any) {
      console.error('Failed to update slot capacity:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        (isRtl ? 'تعذر حفظ سعة المواعيد. يرجى التحقق من اتصال الخادم.' : 'Failed to save slot capacity.');
      setCapacityErrorMessage(errMsg);
    } finally {
      setIsSavingCapacity(false);
    }
  };

  const handleSaveClinicInfo = async () => {
    if (!effectiveClinicId) return;
    if (!canManageSettings) {
      setClinicInfoErrorMessage(
        isRtl
          ? 'غير مصرح: يحق لمدير العيادة فقط تعديل وحفظ معلومات العيادة.'
          : 'Forbidden: Only the Clinic Director can update clinic information.'
      );
      return;
    }

    const trimmedName = clinicInfo.name.trim();
    const trimmedAddress = clinicInfo.address.trim();
    const trimmedPhone = clinicInfo.phone.trim();

    if (!trimmedName || !trimmedAddress || !trimmedPhone) {
      setClinicInfoErrorMessage(
        isRtl
          ? 'يرجى ملء جميع الحقول الإلزامية (اسم العيادة، العنوان، رقم الهاتف).'
          : 'Please fill in all required fields (Clinic Name, Address, Phone).'
      );
      return;
    }

    setIsSavingClinicInfo(true);
    setClinicInfoErrorMessage(null);
    setClinicInfoSuccessMessage(null);

    try {
      const res = await clinicService.updateClinic(effectiveClinicId, {
        name: trimmedName,
        address: trimmedAddress,
        phone: trimmedPhone,
      });

      if (res.data) {
        setClinicInfo((prev) => ({
          ...prev,
          name: res.data.name || trimmedName,
          address: res.data.address || trimmedAddress,
          phone: res.data.phone || trimmedPhone,
        }));
      }

      const msg = isRtl
        ? 'تم حفظ معلومات العيادة بنجاح والتزامن مع الخادم.'
        : 'Clinic information saved successfully and synchronized with server.';
      setClinicInfoSuccessMessage(msg);
      triggerToast(msg);
      addAuditEntry(
        t('tabs.clinic'),
        t('auditLog.previousScheduleValue'),
        trimmedName,
        t('clinic.saveButton')
      );
    } catch (err: any) {
      console.error('Failed to update clinic info:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        (isRtl ? 'تعذر حفظ معلومات العيادة. يرجى التحقق من اتصال الخادم.' : 'Failed to save clinic information.');
      setClinicInfoErrorMessage(errMsg);
    } finally {
      setIsSavingClinicInfo(false);
    }
  };

  const saveWorkingHours = async () => {
    await handleSaveSlotCapacity();
    addAuditEntry(
      t('auditLog.weeklyScheduleField'),
      t('auditLog.previousScheduleValue'),
      `${slotCapacity} patients/slot (60 min)`,
      t('auditLog.saveScheduleReason')
    );
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

          {/* Feedback Banners */}
          {profileSuccessMessage && (
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>{profileSuccessMessage}</span>
            </div>
          )}
          {profileErrorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{profileErrorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Academic Title (Read-only / Cosmetic) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.academicTitle')}</label>
                <span className="text-[10px] text-slate-400 font-mono">({isRtl ? 'للعرض فقط' : 'Read-only'})</span>
              </div>
              <input
                type="text"
                readOnly
                disabled
                value={personalInfo.title}
                className={`w-full p-2.5 rounded-xl border font-bold opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 ${cardBgClass}`}
              />
            </div>

            {/* Full Name (Editable) */}
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {t('personal.fullName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                disabled={isSavingProfile}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass}`}
              />
            </div>

            {/* Medical Specialty (Canonical Master Data Select) */}
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {t('personal.specialty')}
              </label>
              <SpecialtySelect
                value={personalInfo.specialtyId || personalInfo.specialty}
                onChange={(selectedId, selectedModel) => {
                  setPersonalInfo((prev) => ({
                    ...prev,
                    specialtyId: selectedModel?.id ?? (selectedId && !isNaN(Number(selectedId)) ? Number(selectedId) : undefined),
                    specialty: selectedModel ? masterDataService.getLocalizedName(selectedModel, locale) : (selectedId || prev.specialty),
                  }));
                }}
                disabled={isSavingProfile}
                placeholder={isRtl ? 'اختر التخصص الطبي المعتمد' : 'Select medical specialty'}
              />
            </div>

            {/* License Number (Read-only / Regulatory Lock) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.licenseNumber')}</label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  personalInfo.isVerified
                    ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {personalInfo.isVerified
                    ? (isRtl ? 'معرّف معتمد' : 'Verified License')
                    : (isRtl ? 'قيد التدقيق' : 'Pending Verification')}
                </span>
              </div>
              <input
                type="text"
                readOnly
                disabled
                value={personalInfo.licenseNumber || (isRtl ? 'غير محدد' : 'Not set')}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 ${cardBgClass}`}
              />
            </div>

            {/* Phone Number (Editable) */}
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {t('personal.phone')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                disabled={isSavingProfile}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass}`}
              />
            </div>

            {/* Email (Read-only / Security Lock) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold block text-slate-700 dark:text-slate-300">{t('personal.email')}</label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {isRtl ? 'هوية تسجيل الدخول' : 'Auth Login ID'}
                </span>
              </div>
              <input
                type="email"
                readOnly
                disabled
                value={personalInfo.email}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 ${cardBgClass}`}
              />
            </div>

            {/* Bio (Editable) */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="font-bold block text-slate-700 dark:text-slate-300">
                {isRtl ? 'النبذة المهنية والخبرات السريرية (Bio)' : 'Clinical Bio & Experience'}
              </label>
              <textarea
                rows={3}
                value={personalInfo.bio}
                onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
                placeholder={isRtl ? 'أدخل نبذة مختصرة عن خبراتك الطبية والمجالات الدقيقة...' : 'Brief description of medical practice and background...'}
                disabled={isSavingProfile}
                className={`w-full p-2.5 rounded-xl border font-normal text-xs resize-none ${cardBgClass}`}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleSavePersonal}
              disabled={isSavingProfile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSavingProfile ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{t('personal.saveButton')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Clinic Info */}
      {activeSubTab === 'clinic' && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('clinic.title')}</h3>
                <span className="text-xs text-slate-500">{t('clinic.description')}</span>
              </div>
            </div>

            {canManageSettings && (
              <button
                type="button"
                disabled={isSavingClinicInfo || clinicSettingsLoading}
                onClick={handleSaveClinicInfo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingClinicInfo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSavingClinicInfo
                    ? (isRtl ? 'جاري الحفظ والتزامن...' : 'Saving...')
                    : t('clinic.saveButton')}
                </span>
              </button>
            )}
          </div>

          {/* Success / Error Feedback Alerts */}
          {clinicInfoSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="font-semibold">{clinicInfoSuccessMessage}</span>
            </div>
          )}

          {clinicInfoErrorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold">{clinicInfoErrorMessage}</span>
            </div>
          )}

          {clinicSettingsError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{clinicSettingsError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.name')}</label>
              <input
                type="text"
                disabled={!canManageSettings || isSavingClinicInfo}
                value={clinicInfo.name}
                onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass} ${!canManageSettings ? 'cursor-not-allowed opacity-70' : ''}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.city')}</label>
              <input
                type="text"
                disabled={!canManageSettings || isSavingClinicInfo}
                value={clinicInfo.city}
                onChange={(e) => setClinicInfo({ ...clinicInfo, city: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass} ${!canManageSettings ? 'cursor-not-allowed opacity-70' : ''}`}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.address')}</label>
              <input
                type="text"
                disabled={!canManageSettings || isSavingClinicInfo}
                value={clinicInfo.address}
                onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold ${cardBgClass} ${!canManageSettings ? 'cursor-not-allowed opacity-70' : ''}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.phone')}</label>
              <input
                type="text"
                disabled={!canManageSettings || isSavingClinicInfo}
                value={clinicInfo.phone}
                onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass} ${!canManageSettings ? 'cursor-not-allowed opacity-70' : ''}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold block text-slate-700 dark:text-slate-300">{t('clinic.email')}</label>
              <input
                type="text"
                disabled={!canManageSettings || isSavingClinicInfo}
                value={clinicInfo.email}
                onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-bold font-mono ${cardBgClass} ${!canManageSettings ? 'cursor-not-allowed opacity-70' : ''}`}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="button"
              disabled={isSavingClinicInfo || clinicSettingsLoading || !canManageSettings}
              onClick={handleSaveClinicInfo}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSavingClinicInfo ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSavingClinicInfo
                  ? (isRtl ? 'جاري الحفظ والتزامن...' : 'Saving...')
                  : t('clinic.saveButton')}
              </span>
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

          {/* Authoritative Slot Duration & Capacity Settings Card */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-5 shadow-xs`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isRtl ? 'إعدادات فترات وسعة الحجز الرسمية' : 'Authoritative Slot & Capacity Settings'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isRtl
                      ? 'التحكم في سعة المواعيد المتاحة لكل فترة زمنية والتزامن مع محرك الحجز بالعيادة'
                      : 'Configure slot booking capacity per hourly window and synchronize with booking engine'}
                  </p>
                </div>
              </div>

              {canManageSettings && (
                <button
                  type="button"
                  key="save_slot_capacity_button"
                  disabled={isSavingCapacity || clinicSettingsLoading}
                  onClick={handleSaveSlotCapacity}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingCapacity ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSavingCapacity
                      ? (isRtl ? 'جاري الحفظ والتزامن...' : 'Saving...')
                      : (isRtl ? 'حفظ سعة المواعيد' : 'Save Slot Capacity')}
                  </span>
                </button>
              )}
            </div>

            {/* Success / Error Feedback Alerts */}
            {capacitySuccessMessage && (
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-semibold">{capacitySuccessMessage}</span>
              </div>
            )}

            {capacityErrorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-semibold">{capacityErrorMessage}</span>
              </div>
            )}

            {clinicSettingsError && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{clinicSettingsError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Slot Duration (Fixed 60 Minutes Platform Invariant) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{isRtl ? 'مدة الفترة الزمنية (Slot Duration)' : 'Slot Duration'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    {isRtl ? 'قاعدة المنصة (ثابت)' : 'Fixed Platform Rule'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={isRtl ? '60 دقيقة (ساعة كاملة)' : '60 minutes (1 hour)'}
                    className="w-full p-2.5 rounded-xl border font-bold bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isRtl
                    ? 'وفق قاعدة المنصة المعتمدة (P3 Frozen Invariant)، تبدأ جميع فترات الكشف على رأس كل ساعة (من 08:00 إلى 17:00).'
                    : 'Per platform rule (P3 Frozen Invariant), all slots start on the hour from 08:00 to 17:00.'}
                </p>
              </div>

              {/* Slot Capacity (1..10 Patients per Slot) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{isRtl ? 'سعة الحجز للفترة (Slot Capacity)' : 'Booking Capacity per Slot'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {slotCapacity} / 10
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={!canManageSettings || isSavingCapacity || clinicSettingsLoading}
                    value={slotCapacity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setSlotCapacity(Math.max(1, Math.min(10, val)));
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border font-bold text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono ${
                      !canManageSettings ? 'cursor-not-allowed opacity-70 bg-slate-100 dark:bg-slate-900/60' : ''
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    {isRtl ? 'مرضى / Slot' : 'patients/slot'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {canManageSettings
                    ? (isRtl
                        ? 'النطاق المسموح به: من 1 إلى 10 مرضى لكل ساعة (القيمة الافتراضية: 10).'
                        : 'Allowed range: 1 to 10 patients per hour (Default: 10).')
                    : (isRtl
                        ? 'تعديل سعة المواعيد متاح حصرياً لمدير العيادة (Clinic Director).'
                        : 'Editing capacity is restricted to Clinic Director.')}
                </p>
              </div>
            </div>
          </div>

          {/* Clinic Weekly Operating Hours (Required Foundation for Booking) */}
          {effectiveClinicId && (
            <ClinicOperatingHoursEditor
              clinicId={effectiveClinicId}
              canManage={canManageSettings}
              isDarkMode={isDarkMode}
              onConfiguredChange={() => onClinicHoursUpdated?.()}
            />
          )}

          {/* Doctor Weekly Working Hours & Locked Schedule Engine */}
          {user?.doctor?.id && effectiveClinicId && (
            <DoctorWorkingHoursEditor
              doctorId={user.doctor.id}
              clinicId={effectiveClinicId}
              canManage={canManageSettings || user?.doctor?.id === user?.doctor?.id}
              isDarkMode={isDarkMode}
            />
          )}

        </div>
      )}

      {/* TAB 4: Vacation & Exceptions (الإجازات والاستثناءات) */}
      {activeSubTab === 'vacation-exceptions' && (
        <div className="space-y-6">
          
          {/* Top Info Banner - DEC-VAC-01 & DEC-VAC-02 Policy */}
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="font-bold block text-sm">
                {isRtl ? 'إدارة الإجازات وإعادة الجدولة الآلية (AAFIYA V1 Policy)' : 'Vacations & Automated Rescheduling (AAFIYA V1 Policy)'}
              </strong>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {isRtl
                  ? 'تسجيل الإجازة يسري فوراً (DEC-VAC-01) ويقوم المحرك بترحيل المواعيد آلياً إلى أقرب خانة شاغرة خلال 7 أيام (DEC-VAC-02). الحالات التي يتعذر ترحيلها تُسجل كـ urgent_unresolved للمتابعة اليدوية (Option B). إلغاء الإجازة منطقي فقط ولا يحذف السجل (DEC-VAC-05).'
                  : 'Vacation registration takes immediate effect (DEC-VAC-01) and automatically relocates conflicting appointments within a 7-day horizon (DEC-VAC-02). Non-relocatable cases become urgent_unresolved (Option B). Cancellation is logical only and preserves audit history (DEC-VAC-05).'}
              </p>
            </div>
          </div>

          {/* Action Bar: Register Vacation */}
          <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4`}>
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{isRtl ? 'إجازات وعطلات الطبيب الرسمية' : 'Doctor Official Vacations'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'يمكنك تسجيل إجازة جديدة محددة التاريخ والعيادات التابعة لتشغيل محرك إعادة الجدولة الآمن.'
                  : 'Register a new vacation across all or specific clinics to trigger automated rescheduling.'}
              </p>
            </div>

            <button
              onClick={() => setIsVacationModalOpen(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'تسجيل إجازة جديدة' : 'Register New Vacation'}</span>
            </button>
          </div>

          {/* Registered Vacations Table */}
          <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>{isRtl ? 'سجل الإجازات المسجلة' : 'Registered Vacations Log'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchVacations}
                  disabled={loadingVacations}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all cursor-pointer disabled:opacity-50"
                  title={isRtl ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingVacations ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                  {vacations.length} {isRtl ? 'إجازة' : 'vacations'}
                </span>
              </div>
            </div>

            {vacationsError && (
              <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{vacationsError}</span>
              </div>
            )}

            {loadingVacations ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">{isRtl ? 'جاري تحميل الإجازات...' : 'Loading vacations...'}</p>
              </div>
            ) : vacations.length === 0 ? (
              <div className="p-8 text-center space-y-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isRtl ? 'لا توجد إجازات مسجلة حالياً.' : 'No vacations currently registered.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isRtl
                    ? 'اضغط على زر "تسجيل إجازة جديدة" أعلاه لبدء تسجيل فترة عطلة.'
                    : 'Click "Register New Vacation" above to declare a vacation period.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {vacations.map((vac) => {
                  const isEffective = vac.status === 'effective';
                  const isCancelling = cancellingVacationId === vac.id;
                  return (
                    <div
                      key={vac.id}
                      className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${cardBgClass}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            isEffective
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                          }`}>
                            {isEffective
                              ? (isRtl ? 'سارية المفعول' : 'Effective')
                              : (isRtl ? 'ملغاة' : 'Cancelled')}
                          </span>
                          <strong className="font-bold text-sm text-slate-900 dark:text-white">
                            {vac.reason || (isRtl ? 'إجازة عادية' : 'Regular Vacation')}
                          </strong>
                        </div>

                        {vac.notes && (
                          <p className="text-slate-500 text-[11px]">{vac.notes}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          <span>{isRtl ? 'من:' : 'From:'} <strong>{vac.vacation_start}</strong></span>
                          <span>{isRtl ? 'إلى:' : 'To:'} <strong>{vac.vacation_end}</strong></span>
                          {vac.clinics && vac.clinics.length > 0 && (
                            <span className="text-teal-600 dark:text-teal-400 font-bold">
                              {vac.clinics.map((c) => c.name || c.clinic_id).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {isEffective && (
                        <button
                          onClick={() => handleCancelVacation(vac.id)}
                          disabled={isCancelling}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isCancelling ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isRtl ? 'إلغاء الإجازة' : 'Cancel Vacation'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unresolved Cases Dashboard (DEC-VAC-06 / Option B) */}
          {effectiveClinicId && (
            <UnresolvedReschedulesDashboard
              clinicId={effectiveClinicId}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Doctor Vacation Modal */}
          <DoctorVacationModal
            isOpen={isVacationModalOpen}
            onClose={() => setIsVacationModalOpen(false)}
            onSuccess={() => {
              triggerToast(isRtl ? 'تم تسجيل الإجازة بنجاح.' : 'Vacation registered successfully.');
              fetchVacations();
            }}
            affiliatedClinics={(user?.clinics || []).map((c: any) => ({
              id: c.id,
              name: c.name || `Clinic ${c.id}`,
            }))}
            isDarkMode={isDarkMode}
          />

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

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800">
            <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isRtl ? 'لا توجد سجلات تدقيق مسجلة حالياً.' : 'No audit log entries currently recorded.'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isRtl
                ? 'سجل تدقيق الإعدادات في طور الربط مع خادم المراقبة المركزي (Audit Trail API). سيتم توثيق كافة التعديلات فور تفعيل الخدمة.'
                : 'The settings audit log is awaiting integration with the centralized Audit Trail API. Changes will be documented once connected.'}
            </p>
          </div>
        ) : (
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
        )}
      </div>

    </div>
  );
};
