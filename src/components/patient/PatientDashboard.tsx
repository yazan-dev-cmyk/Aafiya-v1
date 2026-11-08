'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  User,
  QrCode,
  Calendar,
  Clock,
  FileText,
  Activity,
  Pill,
  FlaskConical,
  Radio,
  FileSpreadsheet,
  Settings,
  Share2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Bell,
  Sliders,
  MapPin,
  History,
  HeartPulse,
  Stethoscope,
  Sparkles,
  Maximize2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Info,
  Copy,
  Check,
  Phone,
  Mail,
  Lock,
  ExternalLink,
  ChevronDown,
  Filter,
  BadgeCheck,
  CalendarDays,
  FileCheck,
  UserCheck,
  Shield,
  Layers,
  Sparkle
} from 'lucide-react';

import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LockedActionButton } from '../ui/LockedActionButton';

import { authService, UserProfile } from '@/services/authService';
import { appointmentService, AppointmentItem as ApiAppointmentItem } from '@/services/appointmentService';
import { prescriptionService, PrescriptionRecord } from '@/services/prescriptionService';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { ehrService, PatientRecord, ClinicalVisitRecord, PatientShareTokenCreated } from '@/services/ehrService';
import { patientNotificationService, PatientNotificationItem } from '@/services/patientNotificationService';
import QRCode from 'react-qr-code';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { MedicalTimelineHeader, MedicalTimelineValue } from '../shared/MedicalTimelineHeader';
import { resolveCanonicalShareUrl } from '@/lib/utils';
import { DoctorSearchSection } from '../DoctorSearchSection';

interface PatientDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenDoctorDashboard?: () => void;
  onOpenLabDashboard?: () => void;
  onOpenRadDashboard?: () => void;
}

export type PatientTab =
  | 'dashboard'
  | 'directory'
  | 'appointments'
  | 'visit_pass'
  | 'medical_record'
  | 'clinical_visits'
  | 'prescriptions'
  | 'lab_results'
  | 'rad_results'
  | 'billing_sharing'
  | 'profile'
  | 'settings';

export interface AppointmentItem {
  id: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  clinicId?: string;
  doctorId?: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  type: 'in_person' | 'teleconsultation';
  preparationInstructions?: string[];
  docRefNumber: string;
  secure_token?: string;
  checked_in_at?: string | null;
  notes?: string;
}

export interface LabResultItem {
  id: string;
  testNameAr: string;
  testNameEn: string;
  category: string;
  date: string;
  status: 'received' | 'in_progress' | 'ready';
  isCritical: boolean;
  value: string;
  unit: string;
  normalRange: string;
  trend: 'improving' | 'stable' | 'warning';
  doctorNotes?: string;
}

export interface RadResultItem {
  id: string;
  scanNameAr: string;
  scanNameEn: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Mammography';
  date: string;
  status: 'received' | 'in_progress' | 'ready';
  radiologistName: string;
  findings: string;
  impression: string;
  images: { id: string; title: string; url: string; previewColor: string }[];
}

export interface PrescriptionItem {
  id: string;
  prescription_reference?: string;
  secure_token?: string;
  medicationAr: string;
  medicationEn: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedBy: string;
  date: string;
  status: 'active' | 'completed' | 'refill_requested';
  refillsLeft: number;
  pharmacyNote?: string;
}

export interface MedicalNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  date: string;
  type: 'lab' | 'rad' | 'prescription' | 'appointment' | 'critical' | 'reschedule' | 'general';
  read: boolean;
  isReal?: boolean;
  acknowledged?: boolean;
  actionTab?: string;
  actionLabel?: string;
}

export interface DownloadLogItem {
  id: string;
  docName: string;
  date: string;
  type: 'LAB' | 'RAD' | 'RX' | 'VISIT' | 'PASS';
  status: string;
}

/**
 * Normalizes Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) numerals to ASCII 0-9 and strips non-digits.
 */
function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[^0-9]/g, '');
}

export function PatientDashboard({
  onBackToMainPlatform,
  onOpenDoctorDashboard,
  onOpenLabDashboard,
  onOpenRadDashboard
}: PatientDashboardProps) {
  const t = useTranslations('patient');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [timelineValue, setTimelineValue] = useState<MedicalTimelineValue>({ range: 'all' });

  useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const [rxCurrentPage, setRxCurrentPage] = useState<number>(1);
  const [rxLastPage, setRxLastPage] = useState<number>(1);
  const [rxTotalRecords, setRxTotalRecords] = useState<number>(0);
  const [isRxLoading, setIsRxLoading] = useState<boolean>(false);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'prescriptions') {
      setRxCurrentPage(1);
    }
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
  const [bookingNoticeOpen, setBookingNoticeOpen] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedScanForViewer, setSelectedScanForViewer] = useState<RadResultItem | null>(null);
  const [selectedReportToShare, setSelectedReportToShare] = useState<string>('all_emr');
  const [shareDuration, setShareDuration] = useState<'24h' | '7d' | '30d'>('24h');
  const [sharePin, setSharePin] = useState<string>('');
  const [createdPin, setCreatedPin] = useState<string>('');
  const [showSharePin, setShowSharePin] = useState<boolean>(false);
  const [sharePinError, setSharePinError] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);
  const [createdShareData, setCreatedShareData] = useState<PatientShareTokenCreated | null>(null);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedMrn, setCopiedMrn] = useState(false);

  // Appointment Sub-filter Tab State
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Live Data States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [labResults, setLabResults] = useState<LabResultItem[]>([]);
  const [radResults, setRadResults] = useState<RadResultItem[]>([]);
  const [clinicalVisits, setClinicalVisits] = useState<ClinicalVisitRecord[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogItem[]>([]);
  const [selectedRxForQr, setSelectedRxForQr] = useState<PrescriptionItem | null>(null);
  const [selectedAppForQr, setSelectedAppForQr] = useState<AppointmentItem | null>(null);
  const [selectedDiagnosticForQr, setSelectedDiagnosticForQr] = useState<{ id: string; order_reference?: string; secure_token?: string; order_type: string; title?: string } | null>(null);
  const [realNotifications, setRealNotifications] = useState<PatientNotificationItem[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState<boolean>(false);
  const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | 'unread' | 'appointment' | 'medical' | 'critical'>('all');

  // Cancellation Modal States
  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  const handleOpenCancelModal = (app: AppointmentItem) => {
    setCancellingAppointment(app);
    setCancelReason('');
    setCancelError(null);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) return;
    setCancellingAppointment(null);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointment || isCancelling) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const defaultReason = isRtl
        ? 'إلغاء الموعد بناءً على طلب المريض'
        : (locale === 'fr' ? 'Annulation à la demande du patient' : 'Cancelled at patient request');

      const res = await appointmentService.cancelAppointment(
        cancellingAppointment.id,
        cancelReason.trim() || defaultReason
      );

      setAppointments(prev =>
        prev.map(a => (a.id === cancellingAppointment.id ? { ...a, status: 'cancelled' } : a))
      );

      const successMsg = res?.message || (isRtl ? 'تم إلغاء الموعد بنجاح.' : (locale === 'fr' ? 'Rendez-vous annulé avec succès.' : 'Appointment cancelled successfully.'));
      setCancelSuccessMessage(successMsg);
      setCancellingAppointment(null);
      setCancelReason('');

      setTimeout(() => {
        setCancelSuccessMessage(prev => (prev === successMsg ? null : prev));
      }, 5000);
    } catch (err: any) {
      const errMsg = err?.message || (isRtl ? 'تعذر إلغاء الموعد. يرجى المحاولة لاحقاً.' : (locale === 'fr' ? "Échec de l'annulation. Veuillez réessayer." : 'Failed to cancel appointment. Please try again.'));
      setCancelError(errMsg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Rescheduling Modal States
  const [reschedulingAppointment, setReschedulingAppointment] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('');
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Array<{
    time_slot: string;
    max_capacity: number;
    occupied: number;
    available: number;
    is_available: boolean;
  }>>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState<boolean>(false);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccessMessage, setRescheduleSuccessMessage] = useState<string | null>(null);

  const getTodayString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchSlotsForDate = async (clinicId?: string, doctorId?: string, date?: string) => {
    if (!clinicId || !doctorId || !date) {
      setAvailableSlots([]);
      return;
    }

    setIsFetchingSlots(true);
    setSlotFetchError(null);
    try {
      const res = await appointmentService.getSlots(clinicId, doctorId, date);
      const rawSlots = res?.data?.slots || (Array.isArray(res?.data) ? res.data : []);
      const parsedSlots = Array.isArray(rawSlots)
        ? rawSlots.map((s: any) => ({
            time_slot: s.time_slot,
            max_capacity: Number(s.max_capacity) || 0,
            occupied: Number(s.occupied) || 0,
            available: Number(s.available) || 0,
            is_available: Boolean(s.is_available),
          }))
        : [];
      setAvailableSlots(parsedSlots);
    } catch (err: any) {
      console.warn('Failed to fetch available slots:', err);
      setSlotFetchError(
        err?.message || (isRtl ? 'تعذر جلب الفترات المتاحة لهذا اليوم.' : (locale === 'fr' ? 'Impossible de charger les créneaux pour cette date.' : 'Failed to fetch available slots for this date.'))
      );
      setAvailableSlots([]);
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleOpenRescheduleModal = (app: AppointmentItem) => {
    setReschedulingAppointment(app);
    setRescheduleError(null);
    setRescheduleNotes(app.notes || '');

    const today = getTodayString();
    const initialDate = app.date && app.date >= today ? app.date : today;
    setRescheduleDate(initialDate);
    setRescheduleSlot('');

    if (app.clinicId && app.doctorId) {
      fetchSlotsForDate(app.clinicId, app.doctorId, initialDate);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleCloseRescheduleModal = () => {
    if (isRescheduling) return;
    setReschedulingAppointment(null);
    setRescheduleDate('');
    setRescheduleSlot('');
    setRescheduleNotes('');
    setRescheduleError(null);
    setSlotFetchError(null);
    setAvailableSlots([]);
  };

  const handleDateChange = (newDate: string) => {
    setRescheduleDate(newDate);
    setRescheduleSlot('');
    setRescheduleError(null);
    if (reschedulingAppointment?.clinicId && reschedulingAppointment?.doctorId && newDate) {
      fetchSlotsForDate(reschedulingAppointment.clinicId, reschedulingAppointment.doctorId, newDate);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reschedulingAppointment ||
      isRescheduling ||
      !rescheduleDate ||
      !rescheduleSlot
    ) {
      return;
    }

    if (
      rescheduleDate === reschedulingAppointment.date &&
      rescheduleSlot === reschedulingAppointment.time
    ) {
      setRescheduleError(
        isRtl
          ? 'التاريخ والفترة المحددة مطابقة لموعدك الحالي بالفعل.'
          : (locale === 'fr'
              ? 'La date et le créneau sélectionnés sont identiques à votre rendez-vous actuel.'
              : 'Selected date and time slot are identical to your current appointment.')
      );
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const res = await appointmentService.rescheduleAppointment(
        reschedulingAppointment.id,
        {
          appointment_date: rescheduleDate,
          time_slot: rescheduleSlot,
          notes: rescheduleNotes.trim() || undefined,
        }
      );

      const updatedDate = res?.data?.appointment_date || rescheduleDate;
      const updatedSlot = res?.data?.time_slot || rescheduleSlot;
      const updatedNotes = res?.data?.notes || (rescheduleNotes.trim() || reschedulingAppointment.notes);

      setAppointments(prev =>
        prev.map(a =>
          a.id === reschedulingAppointment.id
            ? {
                ...a,
                date: updatedDate,
                time: updatedSlot,
                notes: updatedNotes,
                preparationInstructions: updatedNotes ? [updatedNotes] : a.preparationInstructions,
              }
            : a
        )
      );

      const successMsg =
        res?.message ||
        (isRtl
          ? 'تمت إعادة جدولة الموعد الطبي بنجاح.'
          : (locale === 'fr'
              ? 'Rendez-vous médical reprogrammé avec succès.'
              : 'Medical appointment rescheduled successfully.'));
      setRescheduleSuccessMessage(successMsg);
      handleCloseRescheduleModal();

      setTimeout(() => {
        setRescheduleSuccessMessage(prev => (prev === successMsg ? null : prev));
      }, 6000);
    } catch (err: any) {
      console.warn('Reschedule appointment error:', err);
      let errMsg = err?.message;
      if (err?.errors) {
        const errorKeys = Object.keys(err.errors);
        if (errorKeys.length > 0 && Array.isArray(err.errors[errorKeys[0]]) && err.errors[errorKeys[0]].length > 0) {
          errMsg = err.errors[errorKeys[0]][0];
        }
      }
      if (!errMsg) {
        errMsg = isRtl
          ? 'تعذر إعادة جدولة الموعد. يرجى اختيار موعد آخر أو المحاولة لاحقاً.'
          : (locale === 'fr'
              ? 'Échec de la reprogrammation. Veuillez choisir un autre créneau.'
              : 'Failed to reschedule appointment. Please select another slot or try again.');
      }
      setRescheduleError(errMsg);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Fetch real patient data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchPatientData = async () => {
      setIsLoading(true);
      try {
        // 1. Authenticated User Profile
        let user: UserProfile | null = null;
        try {
          user = await authService.me();
          if (isMounted) setCurrentUser(user);
        } catch (e) {
          console.warn('Auth user fetch error in PatientDashboard:', e);
        }

        // 2. Patient Profile & Medical Record
        try {
          const patientRes = await ehrService.getMyPatientProfile();
          if (isMounted && patientRes.data) {
            setPatientRecord(patientRes.data);
          }
        } catch (e) {
          console.warn('EHR patient record fetch error:', e);
        }

        // 3. Appointments
        try {
          const appRes = await appointmentService.getAppointments();
          if (isMounted && appRes.data && Array.isArray(appRes.data)) {
            const mappedApps: AppointmentItem[] = appRes.data.map((app: ApiAppointmentItem) => {
              let mappedStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled' = 'pending';
              if (app.status === 'confirmed') mappedStatus = 'confirmed';
              else if (app.status === 'completed' || app.status === 'attended') mappedStatus = 'completed';
              else if (app.status === 'cancelled' || app.status === 'rejected') mappedStatus = 'cancelled';

              return {
                id: app.id,
                doctorName: app.doctor?.name || app.doctor?.user?.name || (isRtl ? 'د. الطبيب المعالج' : 'Attending Doctor'),
                specialty: app.doctor?.specialty || (isRtl ? 'الطب العام' : 'General Practice'),
                clinic: app.clinic ? `${app.clinic.name} (${app.clinic.wilaya})` : (isRtl ? 'العيادة التخصصية' : 'Specialized Clinic'),
                clinicId: app.clinic_id || app.clinic?.id,
                doctorId: app.doctor_id || app.doctor?.id,
                date: app.appointment_date,
                time: app.time_slot,
                status: mappedStatus,
                type: app.notes?.toLowerCase().includes('tele') ? 'teleconsultation' : 'in_person',
                docRefNumber: app.booking_reference,
                secure_token: app.secure_token,
                checked_in_at: app.checked_in_at,
                notes: app.notes,
                preparationInstructions: app.notes ? [app.notes] : undefined
              };
            });
            setAppointments(mappedApps);
          }
        } catch (e) {
          console.warn('Appointments fetch error:', e);
        }

        // 4. Diagnostic Orders (Laboratory)
        try {
          const labRes = await diagnosticService.getOrders({ order_type: 'laboratory' });
          if (isMounted && labRes.data && Array.isArray(labRes.data)) {
            const mappedLabs: LabResultItem[] = labRes.data.map((ord: DiagnosticOrderRecord) => {
              const firstItem = ord.items?.[0];
              const isReady = ord.status === 'finalized' || ord.status === 'resulted';
              const isInProgress = ord.status === 'processing' || ord.status === 'received';
              const isCritical = ord.items?.some(i => i.is_critical) || ord.priority === 'stat';

              return {
                id: ord.id,
                testNameAr: firstItem?.test_name || (isRtl ? 'تحليل مخبري' : 'Laboratory Test'),
                testNameEn: firstItem?.test_name || 'Laboratory Test',
                category: firstItem?.category || (isRtl ? 'فحوصات عامة' : 'General Panel'),
                date: ord.ordered_at ? ord.ordered_at.substring(0, 10) : '',
                status: isReady ? 'ready' : (isInProgress ? 'in_progress' : 'received'),
                isCritical: Boolean(isCritical),
                value: firstItem?.result_value || '--',
                unit: firstItem?.unit || '',
                normalRange: firstItem?.reference_range || (isRtl ? 'ضمن المعدل الطبيعي' : 'Within Normal Range'),
                trend: isCritical ? 'warning' : 'stable',
                doctorNotes: ord.clinical_indication
              };
            });
            setLabResults(mappedLabs);
          }
        } catch (e) {
          console.warn('Lab diagnostic orders fetch error:', e);
        }

        // 5. Diagnostic Orders (Radiology)
        try {
          const radRes = await diagnosticService.getOrders({ order_type: 'radiology' });
          if (isMounted && radRes.data && Array.isArray(radRes.data)) {
            const mappedRads: RadResultItem[] = radRes.data.map((ord: DiagnosticOrderRecord) => {
              const firstItem = ord.items?.[0];
              const isReady = ord.status === 'finalized' || ord.status === 'resulted';
              const isInProgress = ord.status === 'processing' || ord.status === 'received';
              const radReport = ord.radiology_report;

              return {
                id: ord.id,
                scanNameAr: firstItem?.test_name || (isRtl ? 'فحص تصوير شعاعي' : 'Radiology Scan'),
                scanNameEn: firstItem?.test_name || 'Radiology Scan',
                modality: (radReport?.modality as any) || 'X-Ray',
                date: ord.ordered_at ? ord.ordered_at.substring(0, 10) : '',
                status: isReady ? 'ready' : (isInProgress ? 'in_progress' : 'received'),
                radiologistName: radReport?.reported_by || ord.clinic?.name || (isRtl ? 'استشاري الأشعة والتصوير' : 'Consultant Radiologist'),
                findings: radReport?.findings || ord.clinical_indication || (isRtl ? 'الفحص الشعاعي ضمن المعايير التشريحية السليمة.' : 'Radiological scan within normal anatomical limits.'),
                impression: radReport?.impression || (isRtl ? 'لا توجد علامات مرضية حادة.' : 'No acute findings.'),
                images: [
                  { id: `img-${ord.id}-1`, title: 'Axial Scout', url: '/demo-rad-1.jpg', previewColor: 'bg-slate-800' },
                  { id: `img-${ord.id}-2`, title: 'Coronal Slice', url: '/demo-rad-2.jpg', previewColor: 'bg-slate-900' }
                ]
              };
            });
            setRadResults(mappedRads);
          }
        } catch (e) {
          console.warn('Radiology diagnostic orders fetch error:', e);
        }

        // 6. Clinical Visits & History
        try {
          const visitsRes = await ehrService.getVisits();
          if (isMounted && visitsRes.data && Array.isArray(visitsRes.data)) {
            setClinicalVisits(visitsRes.data);
          }
        } catch (e) {
          console.warn('Clinical visits fetch error:', e);
        }

        // 7. Real Patient Notifications
        try {
          const notifsRes = await patientNotificationService.getNotifications();
          if (isMounted && notifsRes.data && Array.isArray(notifsRes.data)) {
            setRealNotifications(notifsRes.data);
          }
        } catch (e) {
          console.warn('Notifications fetch error:', e);
        }

      } catch (err) {
        console.error('General patient data fetch error in PatientDashboard:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPatientData();

    return () => {
      isMounted = false;
    };
  }, [isRtl]);

  // Paginated Prescriptions Fetch Effect
  useEffect(() => {
    let isMounted = true;
    setIsRxLoading(true);

    prescriptionService.getPrescriptions({ page: rxCurrentPage, per_page: 6 })
      .then((rxRes) => {
        if (!isMounted) return;
        if (rxRes.data && Array.isArray(rxRes.data)) {
          const mappedRxs: PrescriptionItem[] = rxRes.data.map((rx: PrescriptionRecord) => {
            const firstItem = rx.items?.[0];
            return {
              id: rx.id,
              prescription_reference: rx.prescription_reference,
              secure_token: rx.secure_token,
              medicationAr: firstItem?.medication_name || (isRtl ? 'وصفة علاجية' : 'Prescription Item'),
              medicationEn: firstItem?.medication_name || 'Prescription Item',
              dosage: firstItem?.dosage || '--',
              frequency: firstItem?.frequency || '--',
              duration: firstItem?.duration || '--',
              prescribedBy: rx.doctor?.user?.name || (isRtl ? 'د. الطبيب المعالج' : 'Prescribing Doctor'),
              date: rx.issue_date ? rx.issue_date.substring(0, 10) : '',
              status: rx.status === 'expired' || rx.status === 'voided' ? 'completed' : 'active',
              refillsLeft: (rx as any).refills_remaining || 0,
              pharmacyNote: firstItem?.instructions || rx.notes
            };
          });
          setPrescriptions(mappedRxs);
          if (rxRes.meta) {
            setRxLastPage(rxRes.meta.last_page || 1);
            setRxTotalRecords(rxRes.meta.total || 0);
          }
        }
      })
      .catch((e) => {
        console.warn('Prescriptions fetch error:', e);
      })
      .finally(() => {
        if (isMounted) setIsRxLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rxCurrentPage, isRtl]);

  // Filtered Appointments Logic
  const filteredAppointments = useMemo(() => {
    if (appointmentFilter === 'all') return appointments;
    if (appointmentFilter === 'upcoming') {
      return appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
    }
    if (appointmentFilter === 'completed') {
      return appointments.filter(a => a.status === 'completed');
    }
    if (appointmentFilter === 'cancelled') {
      return appointments.filter(a => a.status === 'cancelled');
    }
    return appointments;
  }, [appointments, appointmentFilter]);

  const upcomingCount = useMemo(() => appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length, [appointments]);
  const completedCount = useMemo(() => appointments.filter(a => a.status === 'completed').length, [appointments]);
  const cancelledCount = useMemo(() => appointments.filter(a => a.status === 'cancelled').length, [appointments]);

  // Copy helper for MRN and Share fields
  const handleCopyField = (text: string, type: 'mrn' | 'url' | 'token' | 'pin') => {
    navigator.clipboard.writeText(text);
    if (type === 'mrn') {
      setCopiedMrn(true);
      setTimeout(() => setCopiedMrn(false), 2500);
    } else if (type === 'url') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleSimulateDownload = (docName: string, type: 'LAB' | 'RAD' | 'RX' | 'VISIT' | 'PASS') => {
    const newLog: DownloadLogItem = {
      id: `DL-${Date.now()}`,
      docName,
      date: new Date().toISOString().split('T')[0],
      type,
      status: 'VERIFIED_AUDIT_LOGGED'
    };
    setDownloadLogs(prev => [newLog, ...prev]);
    alert(isRtl ? `تم تنزيل الوثيقة [${docName}] وتوثيق العملية في سجل التدقيق السريري بنجاح.` : `Downloaded [${docName}] and recorded in audit log.`);
  };

  const handleCopyShareLink = async () => {
    setSharePinError(null);
    setShareErrorMessage(null);

    const pinVal = sharePin.trim();
    if (!pinVal || pinVal.length < 4 || pinVal.length > 8) {
      setSharePinError(
        isRtl
          ? 'رمز الحماية PIN إلزامي ويجب أن يتكون من 4 إلى 8 أرقام وفق القرار DEC-P05-01.'
          : (locale === 'fr'
              ? 'Le code PIN est obligatoire et doit comporter entre 4 et 8 chiffres (DEC-P05-01).'
              : 'Security PIN is required and must be between 4 and 8 digits per DEC-P05-01.')
      );
      return;
    }

    setIsGeneratingToken(true);
    try {
      const res = await ehrService.generateShareToken({
        duration: shareDuration,
        pin: pinVal,
      });

      if (res.data) {
        const canonicalUrl = resolveCanonicalShareUrl(res.data.share_url, locale);
        const resolvedData: PatientShareTokenCreated = {
          ...res.data,
          share_url: canonicalUrl,
        };
        setCreatedShareData(resolvedData);
        setCreatedPin(pinVal);
        setGeneratedShareUrl(canonicalUrl);
      }
    } catch (err: any) {
      const errMsg =
        err?.data?.message ||
        err?.message ||
        (isRtl
          ? 'تعذر إنشاء رابط المشاركة المشفر. يرجى التحقق من الاتصال والمحاولة مجدداً.'
          : (locale === 'fr'
              ? 'Échec de la génération du lien sécurisé. Veuillez réessayer.'
              : 'Failed to generate secure share link. Please try again.'));
      setShareErrorMessage(errMsg);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleResetShare = () => {
    setCreatedShareData(null);
    setGeneratedShareUrl('');
    setCreatedPin('');
    setSharePin('');
    setShowSharePin(false);
    setSharePinError(null);
    setShareErrorMessage(null);
  };

  // Derive Patient Identity
  const patientFullName = currentUser?.name || patientRecord?.full_name || (isRtl ? 'المريض' : 'Patient');
  const patientMrn = patientRecord?.mrn || currentUser?.id?.slice(0, 8).toUpperCase() || 'MRN-VAL01';
  const patientNationalId = patientRecord?.national_id || '001984712001';
  const patientBirthDate = patientRecord?.date_of_birth || '1984-05-12';
  const patientBloodType = patientRecord?.blood_group || 'O+';
  const patientPhone = patientRecord?.phone || currentUser?.phone || '0550123456';
  const patientEmail = currentUser?.email || 'patient@aafiya.dz';

  const criticalLab = labResults.find(l => l.isCritical);
  const nextAppointment = appointments.find(a => a.status === 'confirmed' || a.status === 'pending');
  const lastVisit = clinicalVisits[0];

  const primaryDoctorName = nextAppointment?.doctorName || lastVisit?.doctor?.user?.name || (isRtl ? 'د. الطبيب الاستشاري' : 'Consultant Physician');
  const primaryDoctorSpecialty = nextAppointment?.specialty || lastVisit?.doctor?.specialty || (isRtl ? 'الطب العام والمتابعة الدورية' : 'General Practice & Follow-up');
  const primaryHospital = nextAppointment?.clinic || lastVisit?.clinic?.name || (isRtl ? 'العيادة التخصصية المعتمدة' : 'Specialized Center');

  // Notifications aggregation with precise category mapping
  const notifications: MedicalNotification[] = [];
  realNotifications.forEach((rn) => {
    const tmpl = (rn.template || '').toLowerCase();
    const p = rn.payload || {};
    const pTitle = (p.title || '').toLowerCase();
    const pMsg = (p.message || p.reason || '').toLowerCase();
    const isAck = Boolean(rn.acknowledged_at);

    let type: 'appointment' | 'reschedule' | 'prescription' | 'lab' | 'rad' | 'critical' | 'general' = 'general';
    let defaultTitle = '';
    let defaultMsg = '';
    let actionTab = 'dashboard';
    let actionLabel = '';

    if (tmpl.includes('reschedule') || tmpl.includes('vacation') || pTitle.includes('جدولة') || pMsg.includes('جدولة') || pTitle.includes('reprogram')) {
      type = 'reschedule';
      defaultTitle = isRtl ? 'مقترح إعادة جدولة موعد طبي' : (locale === 'fr' ? 'Proposition de reprogrammation' : 'Reschedule Proposal');
      defaultMsg = isRtl ? 'لديك مقترح لتعديل موعدك الطبي بسبب تنظيم جدول العيادة، يرجى مراجعة الخيارات.' : 'You have an appointment reschedule proposal due to clinic schedule adjustments.';
      actionTab = 'appointments';
      actionLabel = isRtl ? 'مراجعة الموعد' : (locale === 'fr' ? 'Voir le rdv' : 'Review Appointment');
    } else if (tmpl.includes('crit') || pTitle.includes('حرج') || pTitle.includes('urgent') || pTitle.includes('critical')) {
      type = 'critical';
      defaultTitle = isRtl ? 'تنبيه سريري عاجل' : (locale === 'fr' ? 'Alerte clinique urgente' : 'Critical Clinical Alert');
      defaultMsg = isRtl ? 'سجل الفحص نتيجة مخبرية تتطلب استشارة ومتابعة الطبيب المعالج.' : 'A critical test result requires clinical follow-up.';
      actionTab = 'lab_results';
      actionLabel = isRtl ? 'فحص النتيجة الحرجة' : (locale === 'fr' ? 'Consulter le résultat' : 'Check Critical Result');
    } else if (tmpl.includes('presc') || tmpl.includes('ordonnance') || tmpl.includes('medic') || pTitle.includes('وصفة') || pTitle.includes('دواء') || pMsg.includes('وصفة')) {
      type = 'prescription';
      defaultTitle = isRtl ? 'وصفة طبية إلكترونية جديدة' : (locale === 'fr' ? 'Nouvelle ordonnance' : 'New E-Prescription');
      defaultMsg = isRtl ? 'تم إصدار وصفة دوائية إلكترونية معتمدة من قبل الطبيب المعالج.' : 'An authorized electronic prescription has been issued by your doctor.';
      actionTab = 'prescriptions';
      actionLabel = isRtl ? 'عرض الوصفة الدوائية' : (locale === 'fr' ? "Voir l'ordonnance" : 'View Prescription');
    } else if (tmpl.includes('lab') || tmpl.includes('analys') || tmpl.includes('test') || pTitle.includes('تحليل') || pTitle.includes('مخبر') || pTitle.includes('فحص') || pMsg.includes('تحليل')) {
      type = 'lab';
      defaultTitle = isRtl ? 'نتائج الفحص المخبري جاهزة' : (locale === 'fr' ? "Résultats d'analyses disponibles" : 'Lab Results Ready');
      defaultMsg = isRtl ? 'أصبحت نتائج الفحوصات المخبرية جاهزة ومعتمدة للاطلاع والتحميل.' : 'Your laboratory test results are ready and certified for review.';
      actionTab = 'lab_results';
      actionLabel = isRtl ? 'عرض نتائج التحاليل' : (locale === 'fr' ? 'Consulter les analyses' : 'View Lab Results');
    } else if (tmpl.includes('rad') || tmpl.includes('radio') || tmpl.includes('xray') || tmpl.includes('scan') || tmpl.includes('irm') || pTitle.includes('أشعة') || pTitle.includes('تصوير') || pMsg.includes('أشعة')) {
      type = 'rad';
      defaultTitle = isRtl ? 'تقرير الأشعة والتصوير الطبي' : (locale === 'fr' ? "Compte-rendu d'imagerie" : 'Radiology Report Ready');
      defaultMsg = isRtl ? 'تم رفع تقرير الأشعة والتصوير الطبي وصور الفحص في سجلك الطبي.' : 'Your imaging report and scans have been securely uploaded.';
      actionTab = 'rad_results';
      actionLabel = isRtl ? 'عرض تقرير الأشعة' : (locale === 'fr' ? 'Consulter la radio' : 'View Radiology');
    } else if (tmpl.includes('cancel') || pTitle.includes('إلغاء') || pTitle.includes('annul') || pMsg.includes('إلغاء')) {
      type = 'appointment';
      defaultTitle = isRtl ? 'إشعار إلغاء موعد طبي' : (locale === 'fr' ? 'Annulation de rendez-vous' : 'Appointment Cancelled');
      defaultMsg = isRtl ? 'تم إلغاء الموعد الطبي بناءً على الطلب أو لظروف تنظيمية بالعيادة.' : 'The medical appointment has been cancelled.';
      actionTab = 'appointments';
      actionLabel = isRtl ? 'سجل المواعيد' : (locale === 'fr' ? 'Historique' : 'View Appointments');
    } else if (tmpl.includes('remind') || pTitle.includes('تذكير') || pTitle.includes('rappel') || pMsg.includes('تذكير')) {
      type = 'appointment';
      defaultTitle = isRtl ? 'تذكير بموعد الفحص الطبي' : (locale === 'fr' ? 'Rappel de rendez-vous' : 'Appointment Reminder');
      defaultMsg = isRtl ? 'نذكرك بموعد زيارتك الطبية القادمة، يرجى الحضور قبل الموعد بـ 15 دقيقة.' : 'Reminder: Your medical visit is coming up soon.';
      actionTab = 'visit_pass';
      actionLabel = isRtl ? 'بطاقة العبور الرقمية' : (locale === 'fr' ? 'Pass de visite' : 'View Visit Pass');
    } else if (tmpl.includes('appoint') || tmpl.includes('book') || rn.appointment_id || p.booking_reference || pTitle.includes('حجز') || pTitle.includes('موعد') || pTitle.includes('rdv')) {
      type = 'appointment';
      defaultTitle = isRtl ? 'تأكيد حجز الموعد الطبي' : (locale === 'fr' ? 'Confirmation de rendez-vous' : 'Appointment Confirmed');
      defaultMsg = isRtl ? 'تم تأكيد حجز موعدك الطبي بنجاح. يمكنك استعراض التذكرة وبطاقة العبور.' : 'Your appointment is confirmed. You can access your visit pass and ticket.';
      actionTab = 'appointments';
      actionLabel = isRtl ? 'تفاصيل الموعد' : (locale === 'fr' ? 'Détails du rdv' : 'Appointment Details');
    } else {
      type = 'general';
      defaultTitle = isRtl ? 'إشعار سريري عام' : (locale === 'fr' ? 'Notification de santé' : 'Clinical Notification');
      defaultMsg = isRtl ? 'لديك تحديث إداري أو توجيه سريري جديد في حسابك الصحي.' : 'You have a new update in your health portal.';
      actionTab = 'dashboard';
      actionLabel = isRtl ? 'لوحة المتابعة' : (locale === 'fr' ? 'Tableau de bord' : 'Dashboard');
    }

    const title = p.title || defaultTitle;
    const msg = p.reason || p.message || defaultMsg;
    const dateStr = rn.created_at ? rn.created_at.substring(0, 10) : '';
    const timeStr = rn.created_at ? rn.created_at.substring(11, 16) : '';

    notifications.push({
      id: rn.id,
      title,
      message: msg,
      date: dateStr,
      time: timeStr,
      type,
      read: isAck,
      isReal: true,
      acknowledged: isAck,
      actionTab,
      actionLabel,
    });
  });

  // Unread count
  const unreadNotifsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleAcknowledgeNotification = async (notifId: string) => {
    setAcknowledgingId(notifId);
    try {
      await patientNotificationService.acknowledgeNotification(notifId);
      setRealNotifications(prev => prev.map(n => n.id === notifId ? { ...n, acknowledged_at: new Date().toISOString() } : n));
    } catch (e) {
      console.error('Failed to acknowledge notification:', e);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadList = realNotifications.filter(n => !n.acknowledged_at);
    for (const un of unreadList) {
      try {
        await patientNotificationService.acknowledgeNotification(un.id);
      } catch (e) {
        // ignore individual failures
      }
    }
    setRealNotifications(prev => prev.map(n => ({ ...n, acknowledged_at: n.acknowledged_at || new Date().toISOString() })));
  };

  // Extract Vitals
  const latestVitals = lastVisit?.vital_signs;
  const bpVital = (latestVitals?.blood_pressure_systolic && latestVitals?.blood_pressure_diastolic)
    ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic} mmHg`
    : '--';
  const sugarVital = latestVitals?.blood_glucose
    ? `${latestVitals.blood_glucose} mg/dL`
    : '--';
  const weightVital = latestVitals?.weight_kg
    ? `${latestVitals.weight_kg} kg`
    : '--';
  const pulseVital = latestVitals?.heart_rate
    ? `${latestVitals.heart_rate} bpm`
    : '--';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: Activity },
    { id: 'directory', label: t('tabs.directory'), icon: Search },
    { id: 'appointments', label: t('tabs.appointments'), icon: Calendar, badge: upcomingCount > 0 ? `${upcomingCount}` : undefined },
    { id: 'visit_pass', label: t('tabs.visitPass'), icon: QrCode },
    { id: 'notifications', label: isRtl ? 'الإشعارات والتنبيهات' : (locale === 'fr' ? 'Notifications' : 'Notifications'), icon: Bell, badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined },
    { id: 'medical_record', label: t('tabs.medicalRecord'), icon: ShieldCheck },
    { id: 'clinical_visits', label: t('tabs.clinicalVisits'), icon: Stethoscope },
    { id: 'prescriptions', label: t('tabs.prescriptions'), icon: Pill, badge: rxTotalRecords > 0 ? `${rxTotalRecords}` : undefined },
    { id: 'lab_results', label: t('tabs.labResults'), icon: FlaskConical, badge: criticalLab ? '!' : undefined },
    { id: 'rad_results', label: t('tabs.radResults'), icon: Radio },
    { id: 'billing_sharing', label: t('tabs.billingSharing'), icon: FileSpreadsheet },
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'settings', label: t('tabs.settings'), icon: Sliders },
  ];

  return (
    <DashboardLayout
      title={t('title')}
      userName={patientFullName}
      userRole={`MRN: ${patientMrn}`}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      navItems={navItems}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onBackToMain={onBackToMainPlatform}
      sidebarTitle={t('sidebarTitle')}
      icon={<User className="w-6 h-6" />}
      headerActions={
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
              isNotifDropdownOpen
                ? 'bg-teal-500/10 text-teal-600 border-teal-500/30'
                : 'text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs'
            }`}
            title={isRtl ? 'الإشعارات والتنبيهات' : (locale === 'fr' ? 'Notifications' : 'Notifications')}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Quick Dropdown Panel */}
          {isNotifDropdownOpen && (
            <div className={`absolute top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
              isRtl ? 'left-0' : 'right-0'
            }`}>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    {isRtl ? 'الإشعارات والتنبيهات' : (locale === 'fr' ? 'Notifications' : 'Notifications')}
                  </h4>
                  {unreadNotifsCount > 0 && (
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                      {unreadNotifsCount} {isRtl ? 'جديد' : (locale === 'fr' ? 'nouveau' : 'new')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  disabled={unreadNotifsCount === 0}
                  className={`text-[11px] font-bold transition-all cursor-pointer ${
                    unreadNotifsCount > 0
                      ? 'text-teal-600 hover:text-teal-700 underline'
                      : 'text-slate-400 cursor-default'
                  }`}
                >
                  {unreadNotifsCount > 0
                    ? (isRtl ? 'تحديد الكل كمقروء' : (locale === 'fr' ? 'Tout marquer lu' : 'Mark all read'))
                    : (isRtl ? 'جميعها مقروءة ✓' : (locale === 'fr' ? 'Toutes lues ✓' : 'All read ✓'))
                  }
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>{isRtl ? 'لا توجد إشعارات جديدة حالياً' : (locale === 'fr' ? 'Aucune notification' : 'No notifications')}</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors flex items-start gap-3 ${
                        !n.read ? 'bg-teal-50/40 dark:bg-teal-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                        n.type === 'critical'
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 border border-rose-200'
                          : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 border border-teal-200'
                      }`}>
                        {n.type === 'critical' ? <AlertTriangle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">{n.time || n.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeNotification(n.id)}
                            disabled={acknowledgingId === n.id}
                            className="mt-1.5 text-[10px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            {acknowledgingId === n.id ? (isRtl ? 'جاري التأكيد...' : 'Saving...') : (isRtl ? 'تحديد كمقروء' : 'Mark as read')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifDropdownOpen(false);
                    handleTabChange('notifications');
                  }}
                  className="text-xs font-black text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                >
                  {isRtl ? 'عرض مركز الإشعارات الكامل ←' : (locale === 'fr' ? 'Voir toutes les notifications →' : 'View all notifications →')}
                </button>
              </div>
            </div>
          )}
        </div>
      }
    >
      <main className="space-y-6">
        
        {/* ========================================================================= */}
        {/* PAGE 1: DASHBOARD OVERVIEW                                                */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Critical Alert Banner */}
            {criticalLab && (
              <div className="bg-rose-50/90 border border-rose-200/90 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-rose-900">{t('dashboard.criticalAlert')}</h3>
                      <Badge variant="error" className="px-2.5 py-0.5 font-mono">{criticalLab.testNameAr}: {criticalLab.value} {criticalLab.unit}</Badge>
                    </div>
                    <p className="text-xs text-rose-800 mt-1 font-bold">
                      {criticalLab.doctorNotes || t('dashboard.alertDescription')}
                    </p>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleTabChange('lab_results')}>
                  {t('dashboard.viewDetails')}
                </Button>
              </div>
            )}

            {/* Visit Pass Hero Widget */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white rounded-[32px] p-7 lg:p-9 shadow-xl border border-slate-800/80 relative overflow-hidden">
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-7">
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('dashboard.visitPassBadge')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                      {t('dashboard.bloodType')}: {patientBloodType}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {isRtl ? 'ملف صحي نشط وموثق' : 'Active Certified Profile'}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{patientFullName}</h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-slate-400">{t('dashboard.mrn')}:</span>
                      <strong className="font-mono text-teal-300 text-sm tracking-wider">{patientMrn}</strong>
                      <button
                        onClick={() => handleCopyField(patientMrn, 'mrn')}
                        className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                        title={isRtl ? 'نسخ رقم MRN' : 'Copy MRN'}
                      >
                        {copiedMrn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-slate-400">{t('dashboard.nationalId')}:</span>
                      <strong className="font-mono text-slate-200">{patientNationalId}</strong>
                    </div>
                  </div>
                </div>

                {/* QR Code Pass Card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/15 p-4 rounded-3xl flex items-center gap-4 shadow-inner">
                  <div className="w-20 h-20 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                    <QRCode 
                      value={patientMrn || 'MRN-VAL01'} 
                      size={64} 
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                      viewBox="0 0 256 256" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-teal-300 font-black uppercase tracking-wider block">{t('dashboard.scanCode')}</span>
                    <p className="text-base font-mono font-black text-white">{patientMrn}</p>
                    <button 
                      onClick={() => setShowQrModal(true)}
                      className="text-xs text-teal-300 hover:text-white underline font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>{t('dashboard.enlargeCode')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Quick Stat Pills */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                {[
                  {
                    label: t('dashboard.nextAppointment'),
                    value: nextAppointment ? `${nextAppointment.date} - ${nextAppointment.time}` : (isRtl ? 'لا توجد مواعيد قادمة' : 'No upcoming appointments'),
                    sub: nextAppointment ? `${isRtl ? 'مع' : 'with'} ${nextAppointment.doctorName}` : (isRtl ? 'احجز موعدك بسهولة' : 'Book an appointment'),
                    icon: Calendar,
                    highlight: Boolean(nextAppointment)
                  },
                  {
                    label: t('dashboard.clinicCenter'),
                    value: nextAppointment?.clinic || primaryHospital,
                    sub: isRtl ? 'المركز الطبي المعتمد' : 'Affiliated Center',
                    icon: MapPin,
                    highlight: false
                  },
                  {
                    label: t('dashboard.lastVisit'),
                    value: lastVisit ? lastVisit.visit_date : (isRtl ? 'لا توجد زيارات سابقة' : 'No prior visits'),
                    sub: lastVisit ? (isRtl ? 'تم توثيق السجل الطبي' : 'Record Documented') : (isRtl ? 'سجل الزيارات فارغ' : 'Empty history'),
                    icon: History,
                    highlight: false
                  },
                  {
                    label: t('dashboard.passStatus'),
                    value: t('dashboard.activePass'),
                    sub: isRtl ? 'مربوطة بـ EMR الموحد' : 'Linked to Unified EMR',
                    icon: ShieldCheck,
                    highlight: true
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-4 rounded-2xl space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-bold flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-teal-400" />
                      {item.label}
                    </span>
                    <p className={`font-black text-sm truncate ${item.highlight ? 'text-teal-200' : 'text-white'}`}>{item.value}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Grid: Vitals & Primary Doctor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vital Signs Card */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2.5">
                    <HeartPulse className="w-5 h-5 text-teal-600" />
                    {t('dashboard.vitals')}
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">
                    {lastVisit ? `${t('dashboard.lastUpdate')}: ${lastVisit.visit_date}` : (isRtl ? 'بانتظار أول فحص سريري' : 'Pending first clinical visit')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: t('dashboard.bloodPressure'), value: bpVital !== '--' ? bpVital : '--', status: bpVital !== '--' ? t('dashboard.vitalsStatus.withinRange') : (isRtl ? 'غير مسجل' : 'Not recorded'), variant: bpVital !== '--' ? 'success' : 'neutral' },
                    { label: t('dashboard.fastingSugar'), value: sugarVital !== '--' ? sugarVital : '--', status: sugarVital !== '--' ? t('dashboard.vitalsStatus.withinRange') : (isRtl ? 'غير مسجل' : 'Not recorded'), variant: sugarVital !== '--' ? 'success' : 'neutral' },
                    { label: t('dashboard.weightBmi'), value: weightVital !== '--' ? weightVital : '--', status: weightVital !== '--' ? 'BMI Active' : (isRtl ? 'غير مسجل' : 'Not recorded'), variant: weightVital !== '--' ? 'info' : 'neutral' },
                    { label: isRtl ? 'النبض' : 'Pulse / HR', value: pulseVital !== '--' ? pulseVital : '--', status: pulseVital !== '--' ? t('dashboard.vitalsStatus.excellent') : (isRtl ? 'غير مسجل' : 'Not recorded'), variant: pulseVital !== '--' ? 'success' : 'neutral' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1.5 hover:border-slate-200 transition-colors">
                      <span className="text-[11px] text-slate-500 font-bold block">{metric.label}</span>
                      <p className="text-lg font-black text-slate-900 font-mono">{metric.value}</p>
                      <Badge variant={metric.variant as any} className="text-[10px]">{metric.status}</Badge>
                    </div>
                  ))}
                </div>

                {/* Orders Progress */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-teal-600" />
                      {t('dashboard.ordersProgress')}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {isRtl ? 'الفحوصات المخبرية والشعاعية' : 'Lab & Imaging Status'}
                    </span>
                  </div>

                  {labResults.length === 0 && radResults.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center text-slate-500">
                      <p className="text-xs font-bold">{isRtl ? 'لا توجد طلبات تحاليل أو أشعة جارية حالياً' : 'No active diagnostic orders currently'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'ستظهر هنا الفحوصات الطبية فور إصدارها من الأطباء' : 'New tests will appear here once requested by your doctor'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {labResults.slice(0, 1).map(lab => (
                        <div key={lab.id} className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{lab.testNameAr}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{lab.date || 'LAB ORDER'}</span>
                          </div>
                          <Badge variant={lab.status === 'ready' ? 'success' : 'info'}>
                            {lab.status === 'ready' ? t('dashboard.orderStatus.ready') : t('dashboard.orderStatus.inProgress')}
                          </Badge>
                        </div>
                      ))}
                      {radResults.slice(0, 1).map(rad => (
                        <div key={rad.id} className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{rad.scanNameAr}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{rad.modality}</span>
                          </div>
                          <Badge variant={rad.status === 'ready' ? 'success' : 'info'}>
                            {rad.status === 'ready' ? t('dashboard.orderStatus.ready') : t('dashboard.orderStatus.inProgress')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Treating Doctor Spotlight Card */}
              <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <span className="text-xs font-black text-slate-500">{t('dashboard.treatingDoctor')}</span>
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isRtl ? 'معتمد' : 'Authorized'}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xl border border-teal-100 shrink-0">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{primaryDoctorName}</h4>
                      <p className="text-xs text-slate-500 font-bold">{primaryDoctorSpecialty}</p>
                      <p className="text-[11px] text-teal-600 font-black mt-0.5">{primaryHospital}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-black block">
                      {isRtl ? 'آخر تشخيص وخطة علاجية:' : 'Latest Diagnosis & Plan:'}
                    </span>
                    <p className="font-bold text-slate-800 text-xs leading-relaxed">
                      {lastVisit?.diagnosis || lastVisit?.treatment_plan || (isRtl ? 'الملف الصحي قيد المتابعة الدورية.' : 'Routine medical follow-up.')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={() => handleTabChange('directory')}>
                    <Calendar className="w-4 h-4 ml-2" />
                    {isRtl ? 'حجز موعد أو استشارة' : 'Book Appointment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: DIRECTORY / DOCTOR SEARCH                                         */}
        {/* ========================================================================= */}
        {activeTab === 'directory' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <Search className="w-6 h-6 text-teal-600" />
                    {t('tabs.directory')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-bold">
                    {isRtl ? 'ابحث عن أمهر الأطباء والعيادات التخصصية واحجز موعدك فوراً' : 'Find certified doctors and clinics to book your appointments instantly'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTabChange('appointments')}>
                    <Calendar className="w-4 h-4 ml-1.5" />
                    <span>{isRtl ? 'مواعيدي المحجوزة' : 'My Bookings'}</span>
                  </Button>
                </div>
              </div>

              {/* Specialty Quick Category Chips */}
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <span className="text-xs font-black text-slate-400 ml-1">{isRtl ? 'تصفح حسب التخصص:' : 'Browse by specialty:'}</span>
                {['الكل', 'طب عام', 'طب أطفال', 'أمراض القلب', 'طب العيون', 'طب الأسنان', 'أمراض النساء والتوليد', 'جراحة العظام'].map((spec, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all cursor-pointer text-slate-700 shadow-2xs"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              <DoctorSearchSection 
                onOpenAuth={() => {
                  handleTabChange('appointments');
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: APPOINTMENTS                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  {t('appointments.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-bold">{t('appointments.subtitle')}</p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={() => handleTabChange('directory')}>
                {t('appointments.newButton')}
              </Button>
            </div>

            {/* Sub-filter tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 max-w-xl">
              {[
                { id: 'all', label: isRtl ? 'كافة المواعيد' : 'All', count: appointments.length },
                { id: 'upcoming', label: isRtl ? 'المواعيد القادمة' : 'Upcoming', count: upcomingCount },
                { id: 'completed', label: isRtl ? 'المكتملة' : 'Completed', count: completedCount },
                { id: 'cancelled', label: isRtl ? 'الملغاة' : 'Cancelled', count: cancelledCount },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAppointmentFilter(tab.id as any)}
                  className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    appointmentFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    appointmentFilter === tab.id ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Notifications Alert Banner */}
            {cancelSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-black">{cancelSuccessMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {rescheduleSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-black">{rescheduleSuccessMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {filteredAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 space-y-3">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {appointmentFilter === 'all'
                    ? (isRtl ? 'لا توجد مواعيد محجوزة حالياً' : 'No appointments scheduled')
                    : (isRtl ? 'لا توجد مواعيد تطابق الفلتر المحدد' : 'No appointments matching this filter')}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isRtl ? 'يمكنك حجز موعد جديد مع الأطباء والاستشاريين في العيادات والمراكز المعتمدة.' : 'You can schedule a new appointment with our doctors and specialists.'}
                </p>
                <Button className="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold" size="sm" onClick={() => handleTabChange('directory')}>
                  {t('appointments.newButton')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((app) => (
                  <div key={app.id} className="bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-3xl p-6 space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-200/60 pb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-teal-600 font-black shadow-2xs shrink-0">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900">{app.doctorName}</h3>
                            <Badge variant="info" className="text-[11px] font-bold">{app.specialty}</Badge>
                            {app.docRefNumber && (
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {app.docRefNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-bold flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {app.clinic}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-center shadow-2xs">
                          <p className="text-[10px] text-slate-400 font-black uppercase">{isRtl ? 'التاريخ والوقت' : 'Date & Time'}</p>
                          <p className="text-xs font-black text-slate-900 font-mono mt-0.5">{app.date} • {app.time}</p>
                        </div>
                        <Badge variant={app.status === 'confirmed' ? 'success' : (app.status === 'completed' ? 'neutral' : (app.status === 'cancelled' ? 'error' : 'info'))} className="px-3.5 py-1.5 text-xs font-bold">
                          {app.status === 'confirmed' ? (isRtl ? 'مؤكد 🟢' : 'Confirmed 🟢') : (app.status === 'completed' ? (isRtl ? 'مكتمل' : 'Completed') : (app.status === 'cancelled' ? (isRtl ? 'ملغى 🔴' : 'Cancelled 🔴') : (isRtl ? 'بانتظار التأكيد ⏳' : 'Pending Confirmation ⏳')))}
                        </Badge>
                      </div>
                    </div>

                    {app.preparationInstructions && app.preparationInstructions.length > 0 && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          {t('appointments.preparationTitle')}
                        </h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-800 font-bold">
                          {app.preparationInstructions.map((inst, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                              <span>{inst}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <Button variant="secondary" size="sm" className="bg-white hover:bg-slate-100 border border-slate-200 text-teal-800 font-bold shadow-2xs" onClick={() => setSelectedAppForQr(app)}>
                        <QrCode className="w-4 h-4 ml-1.5 text-teal-600" />
                        {t('appointments.viewPass')}
                      </Button>

                      <div className="flex items-center gap-2">
                        {app.status !== 'cancelled' && app.status !== 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 hover:text-teal-700 hover:bg-teal-50 font-bold"
                              onClick={() => handleOpenRescheduleModal(app)}
                            >
                              <Clock className="w-3.5 h-3.5 ml-1" />
                              {t('appointments.reschedule')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                              onClick={() => handleOpenCancelModal(app)}
                            >
                              <X className="w-3.5 h-3.5 ml-1" />
                              {t('appointments.cancel')}
                            </Button>
                          </>
                        )}
                        {app.status === 'cancelled' && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-100">
                            {isRtl ? 'تم إلغاء هذا الموعد' : (locale === 'fr' ? 'Ce rendez-vous est annulé' : 'This appointment was cancelled')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: VISIT PASS (BOARDING PASS STYLE)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'visit_pass' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4 text-center space-y-1.5">
                <span className="bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-bold px-3 py-1 rounded-full inline-block font-mono tracking-wider">
                  DIGITAL HEALTH IDENTIFIER • PASS
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isRtl ? 'بطاقة الزيارة الرقمية الموحدة (Patient Visit Pass)' : 'Unified Digital Patient Visit Pass'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isRtl ? 'استخدم هذا الكود عند الدخول لكافة عيادات ومختبرات وأقسام الأشعة التابعة لمنظومة عافية' : 'Use this pass at all affiliated clinics, labs, and radiology centers'}
                </p>
              </div>

              {/* The Boarding Pass Card */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6 relative z-10">
                  <div className="text-center sm:text-right space-y-1.5">
                    <span className="text-[10px] text-teal-400 font-mono font-bold tracking-widest block uppercase">AAFIYA DIGITAL HEALTH CARD</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">{patientFullName}</h3>
                    <p className="text-xs text-slate-300 font-bold flex items-center gap-2 justify-center sm:justify-start">
                      <span>{isRtl ? 'رقم السجل الطبي MRN:' : 'Medical Record Number (MRN):'}</span>
                      <span className="font-mono text-teal-300 text-sm tracking-wider font-black">{patientMrn}</span>
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl shadow-lg shrink-0 text-center">
                    <QRCode 
                      value={patientMrn || 'MRN-VAL01'} 
                      size={112} 
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                      viewBox="0 0 256 256" 
                      className="mx-auto" 
                    />
                    <span className="text-[10px] font-mono font-black text-slate-700 mt-1 block tracking-wider">{patientMrn}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs relative z-10">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'رقم الهوية الوطنية' : 'National ID'}</span>
                    <p className="font-mono font-bold text-slate-100 text-sm mt-0.5">{patientNationalId}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'فصيلة الدم' : 'Blood Group'}</span>
                    <p className="font-mono font-black text-rose-400 text-sm mt-0.5">{patientBloodType}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                    <p className="font-bold text-slate-100 text-xs mt-0.5">{patientBirthDate}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'الهاتف المعتمد' : 'Registered Phone'}</span>
                    <p className="font-mono font-bold text-slate-100 text-xs mt-0.5">{patientPhone}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</span>
                    <p className="font-bold text-slate-100 text-xs truncate mt-0.5">{patientEmail}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'حالة التوثيق الرقمي' : 'Verification Status'}</span>
                    <p className="font-bold text-emerald-400 text-xs mt-0.5">{isRtl ? 'موثق ومعتمد 🟢' : 'Verified & Active 🟢'}</p>
                  </div>
                </div>

                <div className="bg-teal-950/70 border border-teal-800/80 p-3.5 rounded-2xl text-center text-xs text-teal-200 font-medium">
                  {isRtl ? '💡 عند وصولك للعيادة، وجه هذا الكود إلى جهاز المسح الذاتي لتسجيل حضورك تلقائياً دون الحاجة للانتظار.' : '💡 Scan this code at clinic check-in terminals for automated queue check-in.'}
                </div>
              </div>

              {/* 3 Step Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-black flex items-center justify-center mx-auto text-sm">1</div>
                  <h4 className="font-black text-slate-900">{isRtl ? 'الوصول للعيادة' : 'Arrive at Clinic'}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{isRtl ? 'توجه إلى محطة الاستقبال أو جهاز المسح' : 'Go to reception or scan station'}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-black flex items-center justify-center mx-auto text-sm">2</div>
                  <h4 className="font-black text-slate-900">{isRtl ? 'إبراز رمز QR' : 'Show Pass QR'}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{isRtl ? 'امسح الرمز عبر كاميرا المساعد أو القارئ' : 'Scan the code with reader'}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-black flex items-center justify-center mx-auto text-sm">3</div>
                  <h4 className="font-black text-slate-900">{isRtl ? 'تسجيل الحضور الفوري' : 'Direct Check-In'}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{isRtl ? 'تأكيد الحضور ودخول قائمة الانتظار' : 'Enter queue automatically'}</p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => handleSimulateDownload(`Patient_Visit_Pass_${patientMrn}.pdf`, 'PASS')}
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  {isRtl ? 'تحميل بطاقة الزيارة PDF' : 'Download Visit Pass PDF'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-6 py-2.5 rounded-xl border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  {isRtl ? 'طباعة البطاقة مباشرة' : 'Print Pass'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 5: UNIFIED MEDICAL RECORD (EMR)                                      */}
        {/* ========================================================================= */}
        {activeTab === 'medical_record' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                {isRtl ? 'الملف الطبي الموحد الرقمي (Unified EMR Record)' : 'Unified Electronic Medical Record'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'سجلك الطبي الشامل المتكامل المعترف به عبر كافة العيادات والمستشفيات المشاركة' : 'Comprehensive integrated health records shared securely with certified providers'}
              </p>
            </div>

            {/* Health Overview Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-xs font-bold">
              <div>
                <span className="text-[11px] text-slate-500 block">{isRtl ? 'فصيلة الدم' : 'Blood Group'}</span>
                <p className="text-lg font-black text-rose-600 font-mono mt-0.5">{patientBloodType}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{isRtl ? 'الوزن المسجل' : 'Weight'}</span>
                <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{weightVital}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{isRtl ? 'ضغط الدم الأخير' : 'Last BP'}</span>
                <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{bpVital}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">{isRtl ? 'حالة التوثيق' : 'Record Status'}</span>
                <p className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg inline-block mt-1">
                  {isRtl ? 'موثق 100%' : '100% Verified'}
                </p>
              </div>
            </div>

            {/* 4 Quadrants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Chronic Conditions */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200/70 pb-2.5">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'الأمراض المزمنة والمتابعة التشخيصية' : 'Chronic Conditions'}
                </h3>
                {(!patientRecord?.chronic_conditions || patientRecord.chronic_conditions.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold">{isRtl ? 'لا توجد أمراض مزمنة مسجلة في ملفك الطبي' : 'No chronic conditions recorded'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {patientRecord.chronic_conditions.map((cond, idx) => (
                      <div key={cond.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-black text-slate-900 block">{cond.condition_name}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? `تم التشخيص: ${cond.diagnosed_year || '--'}` : `Diagnosed: ${cond.diagnosed_year || '--'}`}</span>
                        </div>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          {isRtl ? 'نشط ومسجل 🟢' : 'Active 🟢'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Allergies */}
              <div className="bg-rose-50/50 border border-rose-200/70 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-black text-rose-950 flex items-center gap-2 border-b border-rose-200/60 pb-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {isRtl ? 'الحساسية والتفاعلات الدوائية (Allergies)' : 'Allergies & Drug Reactions'}
                </h3>
                {(!patientRecord?.allergies || patientRecord.allergies.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-rose-200/60">
                    <p className="text-xs font-bold">{isRtl ? 'لا توجد حساسيات مسجلة' : 'No known allergies recorded'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {patientRecord.allergies.map((all, idx) => (
                      <div key={all.id || idx} className="bg-white border border-rose-200 p-3 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-black text-rose-900 block">{all.allergen_name}</span>
                          <span className="text-[10px] text-rose-700">{all.reaction_type || all.severity}</span>
                        </div>
                        <span className="bg-rose-100 text-rose-900 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded">
                          {all.severity || (isRtl ? 'حساسية' : 'Allergy')} 🔴
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Surgical History */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200/70 pb-2.5">
                  <Activity className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'العمليات والتدخلات الجراحية السابقة' : 'Surgical & Procedural History'}
                </h3>
                <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold">{isRtl ? 'لا توجد عمليات جراحية مسجلة' : 'No surgical history on record'}</p>
                </div>
              </div>

              {/* Vaccinations */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200/70 pb-2.5">
                  <Pill className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'سجل اللقاحات والتطعيمات المعتمدة' : 'Vaccination Records'}
                </h3>
                <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold">{isRtl ? 'لا توجد سجلات لقاحات مسجلة' : 'No vaccination records on file'}</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 6: CLINICAL VISITS                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'clinical_visits' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <MedicalTimelineHeader
              value={timelineValue}
              onChange={setTimelineValue}
              totalCount={clinicalVisits.length}
            />

            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <Stethoscope className="w-6 h-6 text-teal-600" />
                  {isRtl ? 'سجل الزيارات الطبية والتشخيص السريري (Clinical Visits & Notes)' : 'Clinical Visits & Doctor Notes'}
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-bold">
                  {isRtl ? 'ملاحظات الطبيب، العلامات الحيوية، والتشخيص مع الخطة العلاجية لكل زيارة سابقة' : 'Consultation notes, vital signs, and treatment plans from prior clinic visits'}
                </p>
              </div>

              {clinicalVisits.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                  <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد زيارات سريرية مسجلة بعد' : 'No clinical visits recorded yet'}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {isRtl ? 'سيتم توثيق تقارير الفحص والتشخيص هنا فور انتهاء جلسات الاستشارة الطبية مع أطبائك.' : 'Consultation reports and vital sign recordings will appear here following completed visits.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clinicalVisits.map((visit) => (
                    <div key={visit.id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">
                            {visit.doctor?.user?.name || (isRtl ? 'د. الطبيب المعالج' : 'Consulting Doctor')}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                            {isRtl ? 'تاريخ الزيارة:' : 'Visit Date:'} <span className="font-mono">{visit.visit_date}</span> • {visit.clinic?.name || (isRtl ? 'العيادة التخصصية' : 'Clinic')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSimulateDownload(`Clinical_Visit_Report_${visit.visit_reference || visit.id}.pdf`, 'VISIT')}
                          className="bg-white hover:bg-slate-100 text-teal-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-2xs active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isRtl ? 'تحميل تقرير الزيارة PDF' : 'Download Visit PDF'}
                        </button>
                      </div>

                      {visit.vital_signs && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-white p-3 rounded-xl border border-slate-200">
                          {visit.vital_signs.blood_pressure_systolic && (
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'ضغط الدم' : 'Blood Pressure'}</span>
                              <p className="font-black text-slate-900 font-mono">{visit.vital_signs.blood_pressure_systolic}/{visit.vital_signs.blood_pressure_diastolic} mmHg</p>
                            </div>
                          )}
                          {visit.vital_signs.heart_rate && (
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'النبض' : 'Heart Rate'}</span>
                              <p className="font-black text-slate-900 font-mono">{visit.vital_signs.heart_rate} bpm</p>
                            </div>
                          )}
                          {visit.vital_signs.temperature && (
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'الحرارة' : 'Temperature'}</span>
                              <p className="font-black text-slate-900 font-mono">{visit.vital_signs.temperature} °C</p>
                            </div>
                          )}
                          {visit.vital_signs.oxygen_saturation && (
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'تشبع الأكسجين' : 'SpO2'}</span>
                              <p className="font-black text-slate-900 font-mono">{visit.vital_signs.oxygen_saturation}%</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs">
                        <span className="font-black text-slate-800 block">{isRtl ? 'ملاحظات التشخيص والخطة العلاجية:' : 'Diagnosis & Treatment Plan:'}</span>
                        <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                          {visit.diagnosis ? `[${visit.diagnosis}] ` : ''}{visit.clinical_notes || visit.treatment_plan || visit.chief_complaint || (isRtl ? 'تمت الاستشارة بنجاح.' : 'Consultation completed.')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 7: DIGITAL E-PRESCRIPTIONS                                           */}
        {/* ========================================================================= */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Pill className="w-6 h-6 text-teal-600" />
                {isRtl ? 'سجل الوصفات الطبية الإلكترونية (e-Prescriptions & Refills)' : 'Electronic Prescriptions & Refills'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'الأدوية الحالية النشطة، الجرعات الموصى بها، والتحقق الرقمي من صحة الوصفة للصيدلي' : 'Active prescriptions, dosages, instructions, and pharmacy verification codes'}
              </p>
            </div>

            {prescriptions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد وصفات طبية مسجلة حالياً' : 'No active prescriptions on file'}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {isRtl ? 'ستظهر هنا الأدوية والعلاجات الموصوفة فور إصدارها من طبيبك المعالج.' : 'Medications prescribed during consultations will appear here automatically.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                      <span className="font-black text-slate-900 text-sm">{rx.medicationAr}</span>
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded">
                        {rx.status === 'active' ? (isRtl ? 'نشطة 🟢' : 'Active 🟢') : (isRtl ? 'مكتملة' : 'Completed')}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                      <p><strong>{isRtl ? 'الجرعة والتكرار:' : 'Dosage & Frequency:'}</strong> <span className="font-mono">{rx.dosage}</span> • {rx.frequency}</p>
                      <p><strong>{isRtl ? 'المدة:' : 'Duration:'}</strong> {rx.duration}</p>
                      <p><strong>{isRtl ? 'وُصفت بواسطة:' : 'Prescribed By:'}</strong> {rx.prescribedBy} ({rx.date})</p>
                    </div>

                    {rx.pharmacyNote && (
                      <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl text-[11px] text-teal-900 font-bold">
                        {rx.pharmacyNote}
                      </div>
                    )}

                    {/* Official E-Prescription QR & Reference Code */}
                    <MedicalDocumentCode 
                      documentId={rx.prescription_reference || rx.id} 
                      secureToken={rx.secure_token}
                      documentType="prescription" 
                      patientName={patientFullName} 
                      locale={locale}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setSelectedRxForQr(rx)}
                        className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'تكبير رمز الـ QR' : 'Enlarge QR'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSimulateDownload(`Prescription_${rx.id}.pdf`, 'RX')}
                          className="text-xs text-slate-700 hover:text-slate-900 font-bold underline cursor-pointer"
                        >
                          {isRtl ? 'تحميل PDF' : 'Download PDF'}
                        </button>

                        <button
                          onClick={() => alert(isRtl ? `تم إرسال طلب تكرار الصرف للدواء (${rx.medicationAr}) بنجاح!` : `Refill request sent for ${rx.medicationEn}!`)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          {isRtl ? 'طلب إعادة صرف' : 'Request Refill'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prescriptions Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-2 text-xs font-sans text-slate-600">
                <span className="font-bold">
                  {isRtl ? `صفحة ${rxCurrentPage} من ${rxLastPage}` : `Page ${rxCurrentPage} of ${rxLastPage}`}
                </span>
                {rxTotalRecords > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded font-bold border bg-slate-100 border-slate-300 text-slate-700 font-mono">
                    {isRtl ? `إجمالي: ${rxTotalRecords}` : `Total: ${rxTotalRecords}`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={isRtl ? "الصفحة السابقة" : "Previous Page"}
                  onClick={() => setRxCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={rxCurrentPage <= 1 || isRxLoading}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rxCurrentPage <= 1 || isRxLoading
                      ? 'opacity-40 cursor-not-allowed border-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{isRtl ? 'السابق' : 'Previous'}</span>
                </button>

                <button
                  type="button"
                  aria-label={isRtl ? "الصفحة التالية" : "Next Page"}
                  onClick={() => setRxCurrentPage((prev) => Math.min(rxLastPage, prev + 1))}
                  disabled={rxCurrentPage >= rxLastPage || isRxLoading}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rxCurrentPage >= rxLastPage || isRxLoading
                      ? 'opacity-40 cursor-not-allowed border-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span>{isRtl ? 'التالي' : 'Next'}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 8: LABORATORY DIAGNOSTICS & RESULTS                                  */}
        {/* ========================================================================= */}
        {activeTab === 'lab_results' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <FlaskConical className="w-6 h-6 text-teal-600" />
                {isRtl ? 'نتائج التحاليل الطبية والتقارير المخبرية (Lab Results & Diagnostics)' : 'Laboratory Diagnostics & Test Results'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'نتائج التحاليل المعتمدة وقيم الفحص مع تنبيهات القيم الحرجة وإمكانية تنزيل التقارير الرسمية' : 'Verified laboratory test outcomes with reference range checks and official PDF downloads'}
              </p>
            </div>

            {labResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد نتائج تحاليل مسجلة حالياً' : 'No laboratory results on record'}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {isRtl ? 'ستظهر التحاليل المخبرية المعتمدة هنا فور إنجازها وتوقيعها من المختبر.' : 'Certified laboratory results will appear here once finalized by the diagnostic center.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">{isRtl ? 'اسم التحليل' : 'Test Name'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'النتيجة المسجلة' : 'Result'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'المعدل الطبيعي' : 'Reference Range'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'حالة الطلب' : 'Status'}</th>
                        <th className="py-3 px-3.5 text-center">{isRtl ? 'التقرير PDF' : 'PDF Report'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {labResults.map((lab) => (
                        <tr key={lab.id} className={lab.isCritical ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-3.5">
                            <p className="font-black text-slate-900">{lab.testNameAr}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{lab.testNameEn}</p>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600">{lab.date}</td>
                          <td className="py-3 px-3.5 font-bold">
                            {lab.isCritical ? (
                              <span className="text-rose-700 font-mono font-black flex items-center gap-1">
                                {lab.value} {lab.unit} 🔴 ({isRtl ? 'حرج' : 'Critical'})
                              </span>
                            ) : (
                              <span className="font-mono text-teal-800">{lab.value} {lab.unit}</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 font-mono">{lab.normalRange}</td>
                          <td className="py-3 px-3.5">
                            {lab.status === 'ready' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded">{isRtl ? '🟢 جاهز' : '🟢 Ready'}</span>}
                            {lab.status === 'in_progress' && <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded">{isRtl ? '🔵 جاري الفحص' : '🔵 In Progress'}</span>}
                            {lab.status === 'received' && <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded">{isRtl ? 'تم الاستلام' : 'Received'}</span>}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedDiagnosticForQr({
                                  id: lab.id,
                                  order_reference: `ORD-${lab.id.slice(0, 8)}`,
                                  order_type: 'laboratory',
                                  title: lab.testNameAr,
                                })}
                                title={isRtl ? 'عرض رمز QR للتحقق' : 'Show Verification QR'}
                                className="p-1.5 bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              {lab.status === 'ready' && (
                                <LockedActionButton
                                  className="bg-teal-600/60 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                                >
                                  <span>{isRtl ? 'تحميل PDF' : 'Download'}</span>
                                </LockedActionButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 9: RADIOLOGY REPORTS & VIEWER                                        */}
        {/* ========================================================================= */}
        {activeTab === 'rad_results' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Radio className="w-6 h-6 text-teal-600" />
                {isRtl ? 'تقارير وأشعة المريض التشخيصية ومعاين الصور (Radiology & Image Viewer)' : 'Radiology Studies & Image Viewer'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'استعرض تقارير الأشعة المعتمدة وصور الأشعة المقطعية، الرنين، والسينية مع معاين التكبير' : 'Explore verified diagnostic imaging reports (CT, MRI, X-Ray) with interactive viewer'}
              </p>
            </div>

            {radResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد فحوصات أشعة مسجلة حالياً' : 'No radiology examinations on record'}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {isRtl ? 'ستظهر هنا تقارير وصور الأشعة فور اعتمادها من مركز التصوير الشعاعي.' : 'Imaging scans and radiologist findings will appear here once finalized.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {radResults.map((rad) => (
                  <div key={rad.id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{rad.scanNameAr}</h3>
                          <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                            {rad.modality}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-bold">{rad.scanNameEn} • {isRtl ? 'الاستشاري:' : 'Radiologist:'} {rad.radiologistName}</p>
                      </div>

                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl self-start sm:self-auto">
                        {isRtl ? 'تقرير معتمد 🟢' : 'Verified Report 🟢'}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'تقرير استشاري الأشعة:' : 'Radiology Finding Summary:'}</span>
                      <p className="font-bold text-slate-800 leading-relaxed">{rad.findings}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        onClick={() => setSelectedScanForViewer(rad)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xs"
                      >
                        <Radio className="w-3.5 h-3.5 text-teal-400" />
                        <span>{isRtl ? 'معاينة الصور الرقمية (DICOM)' : 'Open Scan Viewer'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDiagnosticForQr({
                            id: rad.id,
                            order_reference: `ORD-${rad.id.slice(0, 8)}`,
                            order_type: 'radiology',
                            title: rad.scanNameAr,
                          })}
                          className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'رمز التحقق QR' : 'Verification QR'}</span>
                        </button>

                        <button
                          onClick={() => handleSimulateDownload(`Radiology_Report_${rad.id}.pdf`, 'RAD')}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          {isRtl ? 'تحميل التقرير PDF' : 'Download PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 10: BILLING, SHARING & AUDIT                                         */}
        {/* ========================================================================= */}
        {activeTab === 'billing_sharing' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                {isRtl ? 'الفواتير، مشاركة التقارير، وسجل التنزيلات (Billing & Sharing)' : 'Billing, Report Sharing & Download History'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'شارك تقاريرك الفردية بأمان مع أطباء خارجيين وتتبع سجل التنزيل الرقمي' : 'Share discrete clinical reports securely via temporary tokens and audit access records'}
              </p>
            </div>

            {/* Encrypted Medical Record Sharing Tool */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'مشاركة السجل الطبي المشفر (رمز PIN إلزامي)' : (locale === 'fr' ? 'Partage sécurisé du dossier médical (Code PIN obligatoire)' : 'Encrypted Medical Record Sharing (PIN Required)')}
                </h3>
                <span className="bg-teal-100 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  SECURE TOKEN
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium">
                {isRtl ? 'تسمح لك هذه الخاصية بإنشاء رابط مشفر ومحمي برمز PIN لمشاركة سجلك الطبي الموحد بأمان مع طبيب معالج أو جهة استشارية وفق القرار DEC-P05-01.' : (locale === 'fr' ? 'Générez un lien chiffré protégé par code PIN pour partager votre dossier médical unifié en toute sécurité selon DEC-P05-01.' : 'Generate a secure encrypted link protected by PIN to share your unified medical record with consulting providers per DEC-P05-01.')}
              </p>

              {!createdShareData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        {isRtl ? 'نطاق المشاركة المعتمد:' : (locale === 'fr' ? 'Portée autorisée :' : 'Authorized Scope:')}
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 font-medium">
                        {isRtl ? 'الملف الطبي الموحد (all_emr)' : (locale === 'fr' ? 'Dossier unifié (all_emr)' : 'Full Unified EMR (all_emr)')}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        {isRtl ? 'صلاحية رابط المشاركة:' : (locale === 'fr' ? 'Durée de validité :' : 'Token Expiry Duration:')}
                      </label>
                      <select
                        value={shareDuration}
                        onChange={(e) => setShareDuration(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 font-bold"
                      >
                        <option value="24h">{isRtl ? '24 ساعة (مستحسن للزيارات السريعة)' : (locale === 'fr' ? '24 heures (recommandé)' : '24 Hours (Recommended)')}</option>
                        <option value="7d">{isRtl ? '7 أيام (للاستشارات الممتدة)' : (locale === 'fr' ? '7 jours' : '7 Days')}</option>
                        <option value="30d">{isRtl ? '30 يوماً' : (locale === 'fr' ? '30 jours' : '30 Days')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        {isRtl ? 'رمز الحماية PIN (4-8 أرقام):' : (locale === 'fr' ? 'Code PIN (4-8 chiffres) :' : 'Security PIN (4-8 digits):')}
                      </label>
                      <div className="relative">
                        <input
                          type={showSharePin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={sharePin}
                          onChange={(e) => {
                            const v = normalizeDigits(e.target.value);
                            setSharePin(v);
                            if (sharePinError) setSharePinError(null);
                          }}
                          placeholder={isRtl ? '4 إلى 8 أرقام' : (locale === 'fr' ? '4 à 8 chiffres' : '4 to 8 digits')}
                          className={`w-full bg-white border ${sharePinError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'} text-slate-900 rounded-xl px-3 py-2 ${isRtl ? 'pl-10 pr-3' : 'pr-10 pl-3'} focus:outline-none focus:border-teal-600 font-mono tracking-widest text-center`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSharePin((prev) => !prev)}
                          className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer`}
                          title={isRtl ? (showSharePin ? 'إخفاء رمز PIN' : 'إظهار رمز PIN') : 'Toggle PIN visibility'}
                        >
                          {showSharePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {sharePinError && (
                        <p className="text-[11px] text-red-600 font-bold mt-1">{sharePinError}</p>
                      )}
                    </div>
                  </div>

                  {shareErrorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{shareErrorMessage}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCopyShareLink}
                    disabled={isGeneratingToken}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    {isGeneratingToken ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جارٍ توليد الرابط المشفر...' : 'Generating Token...'}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>{isRtl ? 'توليد رابط المشاركة المشفر' : 'Generate Secure Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-bold">
                      {isRtl ? 'تم إنشاء رابط المشاركة المشفر بنجاح' : (locale === 'fr' ? 'Lien généré avec succès' : 'Link Generated Successfully')}
                    </span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-[11px] text-amber-900 font-medium">
                    <p className="font-bold mb-1">{isRtl ? 'تنبيه أمني هام:' : 'Important Notice:'}</p>
                    <p>{isRtl ? 'لن يتم عرض رمز PIN مجدداً. يرجى نسخه ومشاركته مع الطبيب مع رابط المشاركة.' : 'The PIN will not be shown again. Please copy and share it now.'}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'رابط المشاركة:' : 'Share URL:'}</label>
                      <div className="bg-white border border-slate-300 p-2.5 rounded-xl font-mono text-[11px] text-slate-800 flex items-center justify-between">
                        <span className="truncate mr-2 select-all">{createdShareData.share_url}</span>
                        <button
                          onClick={() => handleCopyField(createdShareData.share_url, 'url')}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg shrink-0 cursor-pointer shadow-2xs"
                        >
                          {copiedLink ? (isRtl ? 'تم! ✓' : 'Copied! ✓') : (isRtl ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">PIN:</label>
                        <div className="bg-white border border-slate-300 p-2.5 rounded-xl font-mono text-xs text-slate-900 font-black flex items-center justify-between">
                          <span className="tracking-widest select-all">{createdPin}</span>
                          <button
                            onClick={() => handleCopyField(createdPin, 'pin')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer border border-slate-300"
                          >
                            {copiedPin ? '✓' : (isRtl ? 'نسخ' : 'Copy')}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Token:</label>
                        <div className="bg-white border border-slate-300 p-2.5 rounded-xl font-mono text-[10px] text-slate-800 flex items-center justify-between">
                          <span className="truncate mr-1 select-all">{createdShareData.token}</span>
                          <button
                            onClick={() => handleCopyField(createdShareData.token, 'token')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded shrink-0 cursor-pointer border border-slate-300"
                          >
                            {copiedToken ? '✓' : (isRtl ? 'نسخ' : 'Copy')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleResetShare}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    {isRtl ? 'إغلاق وإعادة ضبط' : 'Close & Reset'}
                  </button>
                </div>
              )}
            </div>

            {/* Download Logs Audit */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200/70 pb-2.5">
                <FileCheck className="w-4 h-4 text-teal-600" />
                {isRtl ? 'سجل التدقيق والتنزيلات الطبية (Audit Log)' : 'Medical Download Audit History'}
              </h3>
              {downloadLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold">{isRtl ? 'لا توجد تنزيلات مسجلة في هذه الجلسة' : 'No downloads recorded in this session'}</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {downloadLogs.map((log) => (
                    <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{log.docName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.date} • {log.type}</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 11: PATIENT PROFILE & DEMOGRAPHICS                                   */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <User className="w-6 h-6 text-teal-600" />
                {isRtl ? 'الملف الشخصي وإدارة التابعين (Patient Profile & Dependents)' : 'Patient Profile & Dependents'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'بياناتك الشخصية الموثقة مع إمكانية إضافة وإدارة ملفات الأبناء وأفراد العائلة' : 'Verified personal demographics and family member/dependent management'}
              </p>
            </div>

            {/* Profile Avatar Card */}
            <div className="bg-gradient-to-r from-teal-50 to-slate-50 border border-teal-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                {patientFullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{patientFullName}</h3>
                  <Badge variant="success" className="text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    {isRtl ? 'حساب معتمد' : 'Verified'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  MRN: <span className="font-mono text-teal-700">{patientMrn}</span> • {isRtl ? 'فصيلة الدم:' : 'Blood:'} <span className="text-rose-600 font-mono font-black">{patientBloodType}</span>
                </p>
              </div>
            </div>

            {/* Demographics Grid */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-200/70 pb-2">{isRtl ? 'البيانات الشخصية الأساسية:' : 'Primary Demographics:'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'الاسم الكامل' : 'Full Name'}</span>
                  <p className="font-black text-slate-900 mt-0.5">{patientFullName}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الهوية الوطنية' : 'National ID'}</span>
                  <p className="font-black text-slate-900 font-mono mt-0.5">{patientNationalId}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                  <p className="font-black text-slate-900 mt-0.5">{patientBirthDate}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</span>
                  <p className="font-bold text-slate-900 font-mono mt-0.5 truncate">{patientEmail}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</span>
                  <p className="font-black text-slate-900 font-mono mt-0.5">{patientPhone}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الملف الطبي MRN' : 'Medical Record Number'}</span>
                  <p className="font-black text-teal-700 font-mono mt-0.5">{patientMrn}</p>
                </div>
              </div>
            </div>

            {/* Family & Dependents */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'ملفات الأبناء والتابعين المربوطين (Dependents)' : 'Linked Dependents & Family'}
                </h3>
                <button
                  onClick={() => alert(isRtl ? 'سيتم فتح نموذج ربط ملف تابع جديد برقم الهوية صلة القرابة!' : 'Opening dependent link form...')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {isRtl ? '+ إضافة تابع' : '+ Add Dependent'}
                </button>
              </div>

              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا يوجد تابعون مربوطون بهذا الحساب حالياً' : 'No dependents linked currently'}</p>
                <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'يمكنك ربط ملفات أفراد العائلة لإدارة مواعيدهم وسجلاتهم بسهولة' : 'Link family members to manage their appointments and health records'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 12: SETTINGS & SECURITY                                              */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Sliders className="w-6 h-6 text-teal-600" />
                {isRtl ? 'إعدادات الحساب والأمان والتفضيلات (Settings & Security)' : 'Account Settings & Security'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {isRtl ? 'تغيير كلمة المرور، تفضيلات التنبيهات، والتوثيق الثنائي' : 'Password management, notification preferences, and two-factor authentication'}
              </p>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900">{isRtl ? 'تنبيهات الرسائل النصية القصيرة (SMS Alerts)' : 'SMS Notifications'}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{isRtl ? 'استلام تذكير بالنتائج والمواعيد على الجوال المعتمد' : 'Receive appointment reminders and ready report alerts via SMS'}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-teal-600 cursor-pointer" />
              </div>

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900">{isRtl ? 'التوثيق الثنائي وأمان الدخول (Two-Factor Auth)' : 'Two-Factor Authentication (2FA)'}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{isRtl ? 'حماية دخول بوابة المريض عبر رمز OTP مؤقت' : 'Protect your patient portal access with one-time verification codes'}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
                  {isRtl ? 'مفعل 🟢' : 'Active 🟢'}
                </span>
              </div>

              <ChangePasswordCard isRtl={isRtl} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE: NOTIFICATIONS & CLINICAL ALERTS                                     */}
        {/* ========================================================================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Ribbon */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-200">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {isRtl ? 'مركز التنبيهات والإشعارات السريرية' : (locale === 'fr' ? 'Centre de notifications cliniques' : 'Clinical Notifications Center')}
                    </h2>
                    {unreadNotifsCount > 0 ? (
                      <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-200 font-mono animate-pulse">
                        {unreadNotifsCount} {isRtl ? 'غير مقروء' : 'Unread'}
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                        {isRtl ? 'جميعها مقروءة ✓' : 'All read ✓'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-bold">
                    {isRtl ? 'متابعة فورية لمواعيدك الطبية، مقترحات إعادة الجدولة، والتقارير المخبرية والإشعاعية.' : 'Real-time updates regarding appointments, rescheduling proposals, and laboratory results.'}
                  </p>
                </div>
              </div>

              {/* Mark All as Read Button - Always Visible */}
              <Button
                variant={unreadNotifsCount > 0 ? "primary" : "outline"}
                size="sm"
                onClick={handleMarkAllNotificationsRead}
                disabled={unreadNotifsCount === 0}
                className={`font-black text-xs rounded-xl shadow-xs transition-all ${
                  unreadNotifsCount > 0
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                }`}
                icon={<CheckCircle2 className={`w-4 h-4 ${unreadNotifsCount > 0 ? 'text-white' : 'text-slate-400'}`} />}
              >
                {unreadNotifsCount > 0 
                  ? (isRtl ? `تحديد الكل كمقروء (${unreadNotifsCount})` : (locale === 'fr' ? `Tout marquer comme lu (${unreadNotifsCount})` : `Mark All as Read (${unreadNotifsCount})`))
                  : (isRtl ? 'جميع الإشعارات مقروءة ✓' : (locale === 'fr' ? 'Toutes les notifications sont lues ✓' : 'All notifications read ✓'))
                }
              </Button>
            </div>

            {/* 4 KPI Pulse Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-slate-400 text-[11px] font-black uppercase tracking-wider">{isRtl ? 'إجمالي الإشعارات' : 'Total'}</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{notifications.length}</p>
                <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'كل السجلات الواردة' : 'All records'}</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-1">
                <span className="text-rose-500 text-[11px] font-black uppercase tracking-wider">{isRtl ? 'غير مقروءة' : 'Unread'}</span>
                <p className="text-2xl font-black text-rose-600 font-mono">{unreadNotifsCount}</p>
                <span className="text-[10px] text-rose-500/80 font-bold block">{isRtl ? 'تتطلب انتباهك' : 'Requires attention'}</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-teal-100 shadow-xs space-y-1">
                <span className="text-teal-600 text-[11px] font-black uppercase tracking-wider">{isRtl ? 'المواعيد والحجوزات' : 'Appointments'}</span>
                <p className="text-2xl font-black text-teal-700 font-mono">
                  {notifications.filter(n => n.type === 'appointment' || n.type === 'reschedule').length}
                </p>
                <span className="text-[10px] text-teal-600/80 font-bold block">{isRtl ? 'مواعيد وإعادة جدولة' : 'Schedules'}</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-xs space-y-1">
                <span className="text-blue-600 text-[11px] font-black uppercase tracking-wider">{isRtl ? 'الوصفات والفحوصات' : 'Medical Records'}</span>
                <p className="text-2xl font-black text-blue-700 font-mono">
                  {notifications.filter(n => n.type === 'prescription' || n.type === 'lab' || n.type === 'rad').length}
                </p>
                <span className="text-[10px] text-blue-600/80 font-bold block">{isRtl ? 'تحاليل، أشعة، ووصفات' : 'Labs, Imaging & Rx'}</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: isRtl ? 'الكل' : 'All', count: notifications.length },
                  { id: 'unread', label: isRtl ? 'غير مقروءة' : 'Unread', count: unreadNotifsCount },
                  { id: 'appointment', label: isRtl ? 'المواعيد' : 'Appointments', count: notifications.filter(n => n.type === 'appointment' || n.type === 'reschedule').length },
                  { id: 'medical', label: isRtl ? 'سجلات طبية' : 'Medical', count: notifications.filter(n => n.type === 'prescription' || n.type === 'lab' || n.type === 'rad').length },
                  { id: 'critical', label: isRtl ? 'عاجلة' : 'Critical', count: notifications.filter(n => n.type === 'critical').length }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setNotifCategoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      notifCategoryFilter === f.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      notifCategoryFilter === f.id ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'بحث في الإشعارات...' : 'Search notifications...'}
                    className="w-full text-xs pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Notifications List */}
            {(() => {
              const filtered = notifications.filter(n => {
                if (notifCategoryFilter === 'unread' && n.read) return false;
                if (notifCategoryFilter === 'appointment' && n.type !== 'appointment' && n.type !== 'reschedule') return false;
                if (notifCategoryFilter === 'medical' && n.type !== 'prescription' && n.type !== 'lab' && n.type !== 'rad') return false;
                if (notifCategoryFilter === 'critical' && n.type !== 'critical') return false;
                if (notifSearchQuery) {
                  const q = notifSearchQuery.toLowerCase();
                  return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200 space-y-3 shadow-xs">
                    <Bell className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">
                      {isRtl ? 'لا توجد إشعارات مطابقة' : 'No matching notifications'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                      {isRtl ? 'جميع إشعاراتك وتنبيهاتك السريرية ستظهر هنا فور صدورها.' : 'All clinical updates and notifications will appear here once received.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filtered.map(item => {
                    const isCrit = item.type === 'critical';
                    const isResched = item.type === 'reschedule';
                    const isRx = item.type === 'prescription';
                    const isLab = item.type === 'lab';
                    const isRad = item.type === 'rad';
                    const isApp = item.type === 'appointment';

                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    let badgeLabel = isRtl ? 'إشعار سريري عام' : 'Notice';
                    let iconBg = 'bg-slate-100 text-slate-600 border-slate-200';
                    let iconNode = <Bell className="w-5 h-5" />;
                    let unreadBorder = 'border-slate-300 bg-slate-50/40';

                    if (isCrit) {
                      badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                      badgeLabel = isRtl ? 'تنبيه سريري عاجل' : (locale === 'fr' ? 'Alerte critique' : 'Critical Alert');
                      iconBg = 'bg-rose-100 text-rose-600 border-rose-200';
                      iconNode = <AlertTriangle className="w-5 h-5 animate-pulse" />;
                      unreadBorder = 'border-rose-300 bg-rose-50/30';
                    } else if (isResched) {
                      badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                      badgeLabel = isRtl ? 'مقترح إعادة جدولة' : (locale === 'fr' ? 'Reprogrammation' : 'Reschedule Proposal');
                      iconBg = 'bg-amber-100 text-amber-700 border-amber-200';
                      iconNode = <RefreshCw className="w-5 h-5" />;
                      unreadBorder = 'border-amber-300 bg-amber-50/30';
                    } else if (isRx) {
                      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      badgeLabel = isRtl ? 'وصفة طبية إلكترونية' : (locale === 'fr' ? 'Ordonnance' : 'Prescription');
                      iconBg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                      iconNode = <Pill className="w-5 h-5" />;
                      unreadBorder = 'border-emerald-300 bg-emerald-50/30';
                    } else if (isLab) {
                      badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                      badgeLabel = isRtl ? 'فحص مخبري' : (locale === 'fr' ? 'Analyse laboratoire' : 'Lab Test');
                      iconBg = 'bg-blue-100 text-blue-700 border-blue-200';
                      iconNode = <FlaskConical className="w-5 h-5" />;
                      unreadBorder = 'border-blue-300 bg-blue-50/30';
                    } else if (isRad) {
                      badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                      badgeLabel = isRtl ? 'أشعة وتصوير طبي' : (locale === 'fr' ? 'Imagerie médicale' : 'Radiology');
                      iconBg = 'bg-purple-100 text-purple-700 border-purple-200';
                      iconNode = <Radio className="w-5 h-5" />;
                      unreadBorder = 'border-purple-300 bg-purple-50/30';
                    } else if (isApp) {
                      badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
                      badgeLabel = isRtl ? 'موعد طبي' : (locale === 'fr' ? 'Rendez-vous' : 'Appointment');
                      iconBg = 'bg-teal-100 text-teal-700 border-teal-200';
                      iconNode = <Calendar className="w-5 h-5" />;
                      unreadBorder = 'border-teal-300 bg-teal-50/30';
                    }

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-2xl p-5 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
                          !item.read ? unreadBorder : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg}`}>
                            {iconNode}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                              {!item.read && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {isRtl ? 'جديد' : 'NEW'}
                                </span>
                              )}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${badgeColor}`}>
                                {badgeLabel}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-2xl">
                              {item.message}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                              {item.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {item.date}
                                </span>
                              )}
                              {item.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {item.time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          {/* Dedicated Context-Aware Action Button */}
                          {item.actionLabel && (
                            <Button
                              variant={isCrit ? "danger" : "outline"}
                              size="sm"
                              onClick={() => handleTabChange(item.actionTab || 'dashboard')}
                              className={`text-xs font-bold rounded-xl ${
                                isCrit ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                              }`}
                            >
                              {item.actionLabel}
                            </Button>
                          )}

                          {/* Individual Acknowledge Button or Read Indicator */}
                          {!item.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={acknowledgingId === item.id}
                              onClick={() => handleAcknowledgeNotification(item.id)}
                              className="text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-xl"
                              icon={<Check className="w-4 h-4" />}
                            >
                              {acknowledgingId === item.id
                                ? (isRtl ? 'جاري التأكيد...' : 'Saving...')
                                : (isRtl ? 'تحديد كمقروء' : 'Mark Read')}
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1 px-2 py-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {isRtl ? 'مقروء' : 'Read'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pt-2">
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold font-mono px-3 py-1 rounded-full border border-teal-200 tracking-wider">
                CHECK-IN QR CODE
              </span>
              <h3 className="text-base font-black text-slate-900">{patientFullName}</h3>
              <p className="text-xs font-mono font-bold text-slate-500">{patientMrn}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={patientMrn || 'MRN-VAL01'} 
                size={192} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                viewBox="0 0 256 256" 
                className="mx-auto" 
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isRtl ? 'وجه هذا الرمز إلى جهاز المسح الرقمي عند عيادة الاستقبال للتحقق السريع وتسجيل الوصول.' : 'Present this QR code at clinic reception scanners for check-in verification.'}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
            >
              {isRtl ? 'إغلاق الشاشة' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* PRESCRIPTION QR VERIFICATION MODAL */}
      {selectedRxForQr && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedRxForQr(null)}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pt-2">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold font-mono px-3 py-1 rounded-full border border-emerald-200 tracking-wider">
                CERTIFIED E-PRESCRIPTION QR
              </span>
              <h3 className="text-base font-black text-slate-900">{selectedRxForQr.medicationAr}</h3>
              <p className="text-xs font-mono text-slate-500">{selectedRxForQr.prescription_reference || selectedRxForQr.id}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://aafiya.site'}/${locale}/verify/${selectedRxForQr.secure_token || selectedRxForQr.id}`} 
                size={192} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                viewBox="0 0 256 256" 
                className="mx-auto" 
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isRtl ? 'امسح هذا الرمز للتحقق الفوري من صحة الوصفة وتفاصيل الأدوية المصرح بها للصيدلي.' : 'Scan this code with any camera to verify certified prescription details.'}
            </p>

            <a
              href={`/${locale}/verify/${selectedRxForQr.secure_token || selectedRxForQr.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors text-center"
            >
              {isRtl ? 'فتح صفحة التحقق المباشرة' : 'Open Verification Page'}
            </a>
          </div>
        </div>
      )}

      {/* APPOINTMENT QR CHECK-IN PASS MODAL */}
      {selectedAppForQr && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedAppForQr(null)}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pt-2">
              <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold font-mono px-3 py-1 rounded-full border border-indigo-200 tracking-wider">
                APPOINTMENT CHECK-IN PASS
              </span>
              <h3 className="text-base font-black text-slate-900">{selectedAppForQr.doctorName}</h3>
              <p className="text-xs text-slate-500 font-bold">{selectedAppForQr.clinic}</p>
              <p className="text-xs font-mono font-black text-indigo-600">{selectedAppForQr.date} • {selectedAppForQr.time}</p>
            </div>

            {(() => {
              const rawToken = selectedAppForQr.secure_token?.trim() || '';
              const isValidToken = /^[A-Za-z0-9]{64}$/.test(rawToken);
              const qrUrl = isValidToken
                ? `${typeof window !== 'undefined' ? window.location.origin : 'https://aafiya.site'}/${locale}/appointment/pass/${rawToken}`
                : '';

              if (!isValidToken) {
                return (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 text-right">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{isRtl ? 'رمز العبور قيد المعالجة' : 'Pass Token Processing'}</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        {isRtl 
                          ? 'الرمز الرقمي الآمن غير متوفر حالياً. يرجى مراجعة الاستقبال عند الحضور.' 
                          : 'Secure digital pass token is not available yet. Please check in with reception.'}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
                  <QRCode 
                    value={qrUrl} 
                    size={192} 
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                    viewBox="0 0 256 256" 
                    className="mx-auto" 
                  />
                </div>
              );
            })()}

            <div className="text-xs text-slate-600 leading-relaxed font-medium">
              {selectedAppForQr.checked_in_at ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold">
                  {isRtl ? 'تم تسجيل حضور هذا الموعد بنجاح 🟢' : 'Attendance Confirmed 🟢'}
                </div>
              ) : (
                <p>
                  {isRtl ? 'وجه هذا الرمز إلى جهاز مسح العيادة لتسجيل الوصول وتأكيد حضور الموعد لمرة واحدة.' : 'Present this single-use pass at clinic reception to check in for your appointment.'}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedAppForQr(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
            >
              {isRtl ? 'إغلاق الشاشة' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC ORDER QR VERIFICATION MODAL */}
      {selectedDiagnosticForQr && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedDiagnosticForQr(null)}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pt-2">
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold font-mono px-3 py-1 rounded-full border border-teal-200 uppercase tracking-wider">
                {selectedDiagnosticForQr.order_type === 'radiology' ? 'RADIOLOGY ORDER QR' : 'LABORATORY ORDER QR'}
              </span>
              <h3 className="text-base font-black text-slate-900">{selectedDiagnosticForQr.title || 'Diagnostic Order'}</h3>
              <p className="text-xs font-mono text-slate-500">{selectedDiagnosticForQr.order_reference || selectedDiagnosticForQr.id}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://aafiya.site'}/${locale}/diagnostic/order/${selectedDiagnosticForQr.secure_token || selectedDiagnosticForQr.id}`} 
                size={192} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                viewBox="0 0 256 256" 
                className="mx-auto" 
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isRtl ? 'امسح هذا الرمز للتحقق الفوري من صحة طلب الفحوصات والنتائج المعتمدة من المختبر أو مركز الأشعة.' : 'Scan this code to verify diagnostic order authenticity and certified lab/radiology results.'}
            </p>

            <a
              href={`/${locale}/diagnostic/order/${selectedDiagnosticForQr.secure_token || selectedDiagnosticForQr.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors text-center"
            >
              {isRtl ? 'فتح صفحة التحقق المباشرة' : 'Open Verification Page'}
            </a>
          </div>
        </div>
      )}

      {/* RADIOLOGY INTERACTIVE SCAN VIEWER MODAL */}
      {selectedScanForViewer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full p-6 space-y-5 border border-slate-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedScanForViewer(null)}
              className="absolute top-4 left-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{selectedScanForViewer.scanNameAr}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedScanForViewer.scanNameEn} • Modality: {selectedScanForViewer.modality}</p>
              </div>
            </div>

            {/* Viewer Stage */}
            <div className="bg-black rounded-2xl h-80 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-mono text-teal-300 border border-slate-700">
                ZOOM: 100% | WINDOW: {selectedScanForViewer.modality} | STATUS: CERTIFIED
              </div>

              <Radio className="w-20 h-20 text-teal-500 animate-pulse mb-3" />
              <p className="text-xs font-mono text-slate-300 font-bold">DICOM Interactive Canvas Preview Stage</p>
              <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'معاين الفحص الشعاعي التفاعلي' : 'Interactive Scan Viewer'} — {selectedScanForViewer.radiologistName}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs space-y-1">
              <span className="font-bold text-teal-400 block">{isRtl ? 'الانطباع والتقرير السريري المرفق:' : 'Clinical Findings & Impression:'}</span>
              <p className="text-slate-300 leading-relaxed">{selectedScanForViewer.findings}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">{isRtl ? 'تاريخ الفحص:' : 'Scan Date:'} {selectedScanForViewer.date}</span>
              <button
                onClick={() => setSelectedScanForViewer(null)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-6 py-2 rounded-xl cursor-pointer transition-all"
              >
                {isRtl ? 'إغلاق المعاين' : 'Close Viewer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT CANCELLATION CONFIRMATION MODAL */}
      {cancellingAppointment && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-start shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={handleCloseCancelModal}
              disabled={isCancelling}
              className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isRtl ? 'إلغاء الموعد الطبي' : (locale === 'fr' ? 'Annuler le rendez-vous' : 'Cancel Medical Appointment')}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'يرجى تأكيد رغبتك في إلغاء هذا الحجز' : (locale === 'fr' ? "Veuillez confirmer l'annulation" : 'Please confirm appointment cancellation')}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">{isRtl ? 'الطبيب:' : (locale === 'fr' ? 'Médecin :' : 'Doctor:')}</span>
                <span className="font-black text-slate-800">{cancellingAppointment.doctorName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">{isRtl ? 'العيادة:' : (locale === 'fr' ? 'Clinique :' : 'Clinic:')}</span>
                <span className="font-bold text-slate-700">{cancellingAppointment.clinic}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">{isRtl ? 'الموعد:' : (locale === 'fr' ? 'Date & Heure :' : 'Date & Time:')}</span>
                <span className="font-bold text-slate-700">{cancellingAppointment.date} • {cancellingAppointment.time}</span>
              </div>
              {cancellingAppointment.docRefNumber && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 font-mono text-[10px]">{isRtl ? 'الرقم المرجعي:' : (locale === 'fr' ? 'Réf :' : 'Ref:')}</span>
                  <span className="font-mono text-slate-600 text-[10px]">{cancellingAppointment.docRefNumber}</span>
                </div>
              )}
            </div>

            {cancelError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-bold leading-relaxed">{cancelError}</p>
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {isRtl ? 'سبب الإلغاء (اختياري)' : (locale === 'fr' ? "Motif d'annulation (optionnel)" : 'Cancellation reason (optional)')}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isCancelling}
                  rows={2}
                  maxLength={500}
                  placeholder={isRtl ? 'اكتب سبب الإلغاء هنا إن رغبت...' : (locale === 'fr' ? 'Précisez le motif si souhaité...' : 'Enter reason if any...')}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseCancelModal}
                  disabled={isCancelling}
                >
                  {isRtl ? 'تراجع' : (locale === 'fr' ? 'Garder le rendez-vous' : 'Keep Appointment')}
                </Button>
                <Button
                  type="submit"
                  disabled={isCancelling}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isCancelling ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isRtl ? 'جاري الإلغاء...' : (locale === 'fr' ? 'Annulation en cours...' : 'Cancelling...')}
                    </span>
                  ) : (
                    (isRtl ? 'تأكيد إلغاء الموعد' : (locale === 'fr' ? "Confirmer l'annulation" : 'Confirm Cancellation'))
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT RESCHEDULING MODAL */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-5 text-start shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={handleCloseRescheduleModal}
              disabled={isRescheduling}
              className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {t('appointments.rescheduleModal.title')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('appointments.rescheduleModal.subtitle')}
                </p>
              </div>
            </div>

            {/* Doctor & Clinic Info Card */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">{t('appointments.rescheduleModal.doctor')}</span>
                <span className="font-black text-slate-800">
                  {reschedulingAppointment.doctorName}
                  {reschedulingAppointment.specialty ? ` (${reschedulingAppointment.specialty})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">{t('appointments.rescheduleModal.clinic')}</span>
                <span className="font-bold text-slate-700">{reschedulingAppointment.clinic}</span>
              </div>
              {reschedulingAppointment.docRefNumber && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 font-mono text-[10px]">{isRtl ? 'الرقم المرجعي:' : (locale === 'fr' ? 'Réf :' : 'Ref:')}</span>
                  <span className="font-mono text-slate-600 text-[10px]">{reschedulingAppointment.docRefNumber}</span>
                </div>
              )}
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  {t('appointments.rescheduleModal.currentAppointment')}
                </p>
                <p className="text-sm font-black text-slate-800">
                  {reschedulingAppointment.date}
                </p>
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {reschedulingAppointment.time}
                </p>
              </div>

              <div className={`border rounded-2xl p-3.5 space-y-1 transition-all ${
                rescheduleSlot
                  ? (rescheduleDate === reschedulingAppointment.date && rescheduleSlot === reschedulingAppointment.time
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-teal-50 border-teal-200 text-teal-900')
                  : 'bg-slate-50 border-dashed border-slate-300 text-slate-600'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
                  {t('appointments.rescheduleModal.newAppointment')}
                </p>
                <p className="text-sm font-black">
                  {rescheduleDate || '--'}
                </p>
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                  {rescheduleSlot || (isRtl ? 'بانتظار اختيار الفترة' : (locale === 'fr' ? 'Choisir un créneau' : 'Select a slot'))}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {t('appointments.rescheduleModal.selectDate')}
                </label>
                <input
                  type="date"
                  min={getTodayString()}
                  value={rescheduleDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={isRescheduling || !reschedulingAppointment.clinicId || !reschedulingAppointment.doctorId}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-bold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-700">
                    {t('appointments.rescheduleModal.selectSlot')}
                  </label>
                  {isFetchingSlots && (
                    <span className="text-[11px] text-teal-600 flex items-center gap-1 font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {t('appointments.rescheduleModal.loadingSlots')}
                    </span>
                  )}
                </div>

                {slotFetchError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="font-bold leading-relaxed">{slotFetchError}</p>
                  </div>
                )}

                {!isFetchingSlots && !slotFetchError && availableSlots.length === 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                    <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="font-bold">{t('appointments.rescheduleModal.noSlots')}</p>
                  </div>
                )}

                {!isFetchingSlots && availableSlots.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = rescheduleSlot === slot.time_slot;
                      const isCurrentApptSlot =
                        rescheduleDate === reschedulingAppointment.date &&
                        slot.time_slot === reschedulingAppointment.time;
                      const isDisabled = !slot.is_available || slot.available <= 0 || isRescheduling;

                      return (
                        <button
                          key={slot.time_slot}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setRescheduleSlot(slot.time_slot);
                            setRescheduleError(null);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer disabled:cursor-not-allowed ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-600/30'
                              : isDisabled
                              ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                              : 'bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="text-sm font-black">{slot.time_slot}</div>
                          <div className="text-[10px] mt-0.5 opacity-80">
                            {isDisabled
                              ? (isRtl ? 'مكتمل' : (locale === 'fr' ? 'Complet' : 'Full'))
                              : isCurrentApptSlot
                              ? (isRtl ? 'الحالي' : (locale === 'fr' ? 'Actuel' : 'Current'))
                              : (isRtl ? `${slot.available} متاح` : (locale === 'fr' ? `${slot.available} dispo` : `${slot.available} left`))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {rescheduleSlot &&
                rescheduleDate === reschedulingAppointment.date &&
                rescheduleSlot === reschedulingAppointment.time && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-bold leading-relaxed">
                      {t('appointments.rescheduleModal.sameSlotWarning')}
                    </p>
                  </div>
                )}

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {t('appointments.rescheduleModal.notesLabel')}
                </label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  disabled={isRescheduling}
                  rows={2}
                  maxLength={500}
                  placeholder={t('appointments.rescheduleModal.notesPlaceholder')}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                />
              </div>

              {rescheduleError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-bold leading-relaxed">{rescheduleError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseRescheduleModal}
                  disabled={isRescheduling}
                >
                  {t('appointments.rescheduleModal.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isRescheduling ||
                    isFetchingSlots ||
                    !rescheduleSlot ||
                    !rescheduleDate ||
                    (rescheduleDate === reschedulingAppointment.date &&
                      rescheduleSlot === reschedulingAppointment.time) ||
                    !reschedulingAppointment.clinicId ||
                    !reschedulingAppointment.doctorId
                  }
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {isRescheduling ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('appointments.rescheduleModal.submitting')}
                    </span>
                  ) : (
                    t('appointments.rescheduleModal.confirm')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
