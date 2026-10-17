'use client';

import React, { useState, useEffect } from 'react';
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
  EyeOff
} from 'lucide-react';

import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

import { authService, UserProfile } from '@/services/authService';
import { appointmentService, AppointmentItem as ApiAppointmentItem } from '@/services/appointmentService';
import { prescriptionService, PrescriptionRecord } from '@/services/prescriptionService';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { ehrService, PatientRecord, ClinicalVisitRecord, PatientShareTokenCreated } from '@/services/ehrService';
import QRCode from 'react-qr-code';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { MedicalTimelineHeader, MedicalTimelineValue } from '../shared/MedicalTimelineHeader';

interface PatientDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenDoctorDashboard?: () => void;
  onOpenLabDashboard?: () => void;
  onOpenRadDashboard?: () => void;
}

export type PatientTab =
  | 'dashboard'
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
  type: 'lab' | 'rad' | 'prescription' | 'appointment' | 'critical';
  read: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cancellation Modal States (FIX-PAT-01)
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

      // Immediately update local appointments state
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

  // Rescheduling Modal States (FIX-PAT-02)
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

    // Prevent no-op submission
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

      // Immediately update local appointments state with the verified server response
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

        // 2. Patient Profile & Medical Record (Strictly scoped to authenticated user)
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

        // 4. Prescriptions are loaded via dedicated paginated effect below

        // 5. Diagnostic Orders (Laboratory)
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

        // 6. Diagnostic Orders (Radiology)
        try {
          const radRes = await diagnosticService.getOrders({ order_type: 'radiology' });
          if (isMounted && radRes.data && Array.isArray(radRes.data)) {
            const mappedRads: RadResultItem[] = radRes.data.map((ord: DiagnosticOrderRecord) => {
              const firstItem = ord.items?.[0];
              const isReady = ord.status === 'finalized' || ord.status === 'resulted';
              const modality = (ord.radiology_report?.modality || 'X-Ray') as any;

              return {
                id: ord.id,
                scanNameAr: firstItem?.test_name || (isRtl ? 'فحص تصوير شعاعي' : 'Radiology Scan'),
                scanNameEn: firstItem?.test_name || 'Radiology Scan',
                modality,
                date: ord.ordered_at ? ord.ordered_at.substring(0, 10) : '',
                status: isReady ? 'ready' : 'in_progress',
                radiologistName: ord.doctor?.name || (isRtl ? 'استشاري الأشعة' : 'Radiologist'),
                findings: ord.radiology_report?.findings || (isRtl ? 'التقرير قيد المراجعة والاعتماد من قبل طبيب الأشعة.' : 'Report under review by radiologist.'),
                impression: ord.radiology_report?.impression || (isReady ? (isRtl ? 'تم اعتماد التقرير الشعاعي' : 'Radiology Report Approved') : (isRtl ? 'بانتظار الاعتماد النهائي' : 'Pending Finalization')),
                images: ord.radiology_report?.image_urls?.map((url, idx) => ({
                  id: `img-${idx}`,
                  title: `Scan Image ${idx + 1}`,
                  url,
                  previewColor: 'bg-slate-900'
                })) || []
              };
            });
            setRadResults(mappedRads);
          }
        } catch (e) {
          console.warn('Radiology diagnostic orders fetch error:', e);
        }

        // 7. Clinical Visits
        try {
          const visitsRes = await ehrService.getVisits();
          if (isMounted && visitsRes.data && Array.isArray(visitsRes.data)) {
            setClinicalVisits(visitsRes.data);
          }
        } catch (e) {
          console.warn('Clinical visits fetch error:', e);
        }

      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPatientData();

    return () => {
      isMounted = false;
    };
  }, [isRtl]);

  // Dedicated Paginated Prescriptions Fetcher
  useEffect(() => {
    let isMounted = true;
    const fetchPrescriptions = async () => {
      setIsRxLoading(true);
      try {
        const rxRes = await prescriptionService.getPrescriptions({
          page: rxCurrentPage,
          per_page: 20
        });
        if (isMounted) {
          if (rxRes.data && Array.isArray(rxRes.data)) {
            const mappedRx: PrescriptionItem[] = rxRes.data.map((rx: PrescriptionRecord) => {
              const firstItem = rx.items?.[0];
              return {
                id: rx.id,
                prescription_reference: rx.prescription_reference,
                secure_token: rx.secure_token,
                medicationAr: firstItem?.medication_name || (isRtl ? 'وصفة طبية إلكترونية' : 'Digital Prescription'),
                medicationEn: firstItem?.medication_name || 'Digital Prescription',
                dosage: firstItem?.dosage || (isRtl ? 'حسب تعليمات الطبيب' : 'As directed'),
                frequency: firstItem?.frequency || (isRtl ? 'يومياً' : 'Daily'),
                duration: firstItem?.duration_days ? `${firstItem.duration_days} ${isRtl ? 'يوم' : 'Days'}` : (isRtl ? 'حسب الخطة العلاجية' : 'Per treatment plan'),
                prescribedBy: rx.doctor?.user?.name || (isRtl ? 'د. الطبيب المعالج' : 'Attending Doctor'),
                date: rx.issue_date,
                status: rx.status === 'active' ? 'active' : 'completed',
                refillsLeft: 0,
                pharmacyNote: rx.notes || firstItem?.instructions
              };
            });
            setPrescriptions(mappedRx);
          }
          if (rxRes.meta) {
            setRxCurrentPage(rxRes.meta.current_page || 1);
            setRxLastPage(rxRes.meta.last_page || 1);
            setRxTotalRecords(rxRes.meta.total || 0);
          }
        }
      } catch (e) {
        console.warn('Prescriptions fetch error:', e);
      } finally {
        if (isMounted) setIsRxLoading(false);
      }
    };

    fetchPrescriptions();
    return () => {
      isMounted = false;
    };
  }, [rxCurrentPage, isRtl]);

  const validateSharePin = (pin: string): string | null => {
    const clean = normalizeDigits(pin);
    if (!clean) {
      return isRtl
        ? 'رمز الحماية PIN إلزامي لإنشاء رابط المشاركة'
        : (locale === 'fr'
          ? 'Le code PIN est obligatoire pour générer le lien de partage'
          : 'Security PIN is required to generate a share link');
    }
    if (!/^[0-9]{4,8}$/.test(clean)) {
      return isRtl
        ? 'يجب أن يتكون رمز الحماية PIN من 4 إلى 8 أرقام فقط'
        : (locale === 'fr'
          ? 'Le code PIN doit comporter entre 4 et 8 chiffres uniquement'
          : 'Security PIN must be between 4 and 8 digits only');
    }
    return null;
  };

  const handleCopyShareLink = async () => {
    const cleanPin = normalizeDigits(sharePin);
    const pinErr = validateSharePin(cleanPin);
    if (pinErr) {
      setSharePinError(pinErr);
      return;
    }
    setSharePinError(null);
    setShareErrorMessage(null);
    setCreatedPin('');
    setIsGeneratingToken(true);

    try {
      const res = await ehrService.generateShareToken({
        scope: 'all_emr',
        duration: shareDuration,
        pin: cleanPin,
      });

      if (res.data?.share_url) {
        setCreatedPin(cleanPin);
        setCreatedShareData(res.data);
        setGeneratedShareUrl(res.data.share_url);
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(res.data.share_url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
          } catch {
            // Clipboard fallback
          }
        }
      } else {
        throw new Error(isRtl ? 'استجابة غير متوقعة من الخادم' : 'Unexpected server response');
      }
    } catch (err: any) {
      const serverMsg = err?.errors?.pin?.[0] || err?.errors?.scope?.[0] || err?.message;
      setShareErrorMessage(serverMsg || (isRtl ? 'حدث خطأ أثناء إنشاء رابط المشاركة المشفر' : 'Failed to generate encrypted share token'));
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyField = async (text: string, type: 'url' | 'token' | 'pin') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        if (type === 'url') {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 3000);
        } else if (type === 'token') {
          setCopiedToken(true);
          setTimeout(() => setCopiedToken(false), 3000);
        } else if (type === 'pin') {
          setCopiedPin(true);
          setTimeout(() => setCopiedPin(false), 3000);
        }
      } catch {
        // Clipboard fallback
      }
    }
  };

  const handleResetShare = () => {
    setCreatedShareData(null);
    setGeneratedShareUrl('');
    setSharePin('');
    setCreatedPin('');
    setShowSharePin(false);
    setSharePinError(null);
    setShareErrorMessage(null);
  };

  const handleSimulateDownload = (fileName: string, type: 'LAB' | 'RAD' | 'RX' | 'VISIT' | 'PASS' = 'LAB') => {
    const newLog: DownloadLogItem = {
      id: `log-${Date.now()}`,
      docName: fileName,
      date: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      type,
      status: 'completed'
    };
    setDownloadLogs(prev => [newLog, ...prev]);
    alert(`${isRtl ? 'تم تحميل المستند الطبي بأمان:' : 'Medical document downloaded securely:'} ${fileName}`);
  };

  // Dynamic Patient Profile Computed Fields
  const patientFullName = patientRecord
    ? `${patientRecord.first_name} ${patientRecord.last_name}`.trim()
    : (currentUser?.name || (isRtl ? 'المريض' : 'Patient'));

  const patientMrn = patientRecord?.mrn || (currentUser?.id ? `MRN-${currentUser.id.substring(0, 8).toUpperCase()}` : 'MRN-N/A');
  const patientNationalId = patientRecord?.national_id || '--';
  const patientBloodType = patientRecord?.blood_group || '--';
  const patientBirthDate = patientRecord?.date_of_birth || '--';
  const patientPhone = patientRecord?.phone || currentUser?.phone || '--';
  const patientEmail = patientRecord?.email || currentUser?.email || '--';

  // Dynamic Appointments
  const nextAppointment = appointments.find(a => a.status === 'confirmed' || a.status === 'pending');
  const lastVisit = clinicalVisits[0];

  // Dynamic Doctor Info
  const primaryDoctorName = nextAppointment?.doctorName || lastVisit?.doctor?.user?.name || (isRtl ? 'فريق الرعاية الطبية' : 'Clinical Care Team');
  const primaryDoctorSpecialty = nextAppointment?.specialty || (isRtl ? 'الطب العام والاستشارات' : 'General & Specialized Medicine');
  const primaryHospital = nextAppointment?.clinic || (isRtl ? 'مجمع العيادات المعتمد' : 'Affiliated Medical Center');

  // Dynamic Critical Findings
  const criticalLab = labResults.find(l => l.isCritical);

  // Dynamic Notifications List
  const notifications: MedicalNotification[] = [];
  if (criticalLab) {
    notifications.push({
      id: 'notif-crit',
      title: isRtl ? `تنبيه طبي عاجل: ${criticalLab.testNameAr}` : `Critical Alert: ${criticalLab.testNameEn}`,
      message: isRtl ? `سجل الفحص نتيجة (${criticalLab.value} ${criticalLab.unit}) تتطلب متابعة الطبيب المعالج.` : `Test recorded a critical value (${criticalLab.value} ${criticalLab.unit}) requiring medical attention.`,
      date: criticalLab.date,
      time: '10:00 AM',
      type: 'critical',
      read: false
    });
  }
  if (nextAppointment) {
    notifications.push({
      id: 'notif-app',
      title: isRtl ? 'تأكيد موعد العيادة القادم' : 'Upcoming Appointment Confirmed',
      message: isRtl ? `موعدك القادم مع ${nextAppointment.doctorName} بتاريخ ${nextAppointment.date} الساعة ${nextAppointment.time}.` : `Your appointment with ${nextAppointment.doctorName} is scheduled for ${nextAppointment.date} at ${nextAppointment.time}.`,
      date: nextAppointment.date,
      time: nextAppointment.time,
      type: 'appointment',
      read: true
    });
  }
  const readyLab = labResults.find(l => l.status === 'ready' && !l.isCritical);
  if (readyLab) {
    notifications.push({
      id: 'notif-lab',
      title: isRtl ? `جاهزية نتيجة ${readyLab.testNameAr}` : `Lab Result Ready: ${readyLab.testNameEn}`,
      message: isRtl ? 'تم اعتماد التقرير المخبري النهائي ويمكنك الاطلاع عليه وتنزيله بصيغة PDF.' : 'Laboratory report finalized and available for PDF download.',
      date: readyLab.date,
      time: '04:00 PM',
      type: 'lab',
      read: true
    });
  }
  const readyRad = radResults.find(r => r.status === 'ready');
  if (readyRad) {
    notifications.push({
      id: 'notif-rad',
      title: isRtl ? `جاهزية تقرير ${readyRad.scanNameAr}` : `Radiology Report Ready: ${readyRad.scanNameEn}`,
      message: isRtl ? 'تم اعتماد التقرير الشعاعي من قبل استشاري الأشعة مع توفر معاين الصور.' : 'Radiology study finalized with interactive imaging preview.',
      date: readyRad.date,
      time: '02:30 PM',
      type: 'rad',
      read: true
    });
  }

  // Extract Vitals from latest clinical visit (Structured Object Data Contract)
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
    ? `${latestVitals.heart_rate}`
    : '--';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: Activity },
    { id: 'appointments', label: t('tabs.appointments'), icon: Calendar },
    { id: 'visit_pass', label: t('tabs.visitPass'), icon: QrCode },
    { id: 'medical_record', label: t('tabs.medicalRecord'), icon: ShieldCheck },
    { id: 'clinical_visits', label: t('tabs.clinicalVisits'), icon: Stethoscope },
    { id: 'prescriptions', label: t('tabs.prescriptions'), icon: Pill },
    { id: 'lab_results', label: t('tabs.labResults'), icon: FlaskConical },
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
    >
      <main className="space-y-6">
        
        {/* PAGE 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Critical Alert Banner (Only when critical lab result exists) */}
            {criticalLab && (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-rose-900">{t('dashboard.criticalAlert')}</h3>
                      <Badge variant="error">{criticalLab.testNameAr}: {criticalLab.value} {criticalLab.unit}</Badge>
                    </div>
                    <p className="text-xs text-rose-800 mt-1 font-bold">
                      {criticalLab.doctorNotes || t('dashboard.alertDescription')}
                    </p>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => setActiveTab('lab_results')}>
                  {t('dashboard.viewDetails')}
                </Button>
              </div>
            )}

            {/* Visit Pass Hero Widget */}
            <div className="bg-slate-900 text-white rounded-[32px] p-8 lg:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b border-white/10 pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                      <Sparkles className="w-3 h-3 ml-1.5" />
                      {t('dashboard.visitPassBadge')}
                    </Badge>
                    <Badge variant="neutral" className="border-rose-500/30 text-rose-300">
                      {t('dashboard.bloodType')}: {patientBloodType}
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">{patientFullName}</h2>
                  <p className="text-sm text-slate-400 flex items-center gap-4 font-bold">
                    <span>{t('dashboard.mrn')}: <strong className="font-mono text-teal-300">{patientMrn}</strong></span>
                    <span>• {t('dashboard.nationalId')}: <strong className="font-mono text-slate-200">{patientNationalId}</strong></span>
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex items-center gap-5">
                  <div className="w-20 h-20 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0">
                    <QRCode 
                      value={patientMrn || 'MRN-VAL01'} 
                      size={64} 
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                      viewBox="0 0 256 256" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-teal-300 font-black uppercase tracking-wider block">{t('dashboard.scanCode')}</span>
                    <p className="text-lg font-mono font-black">{patientMrn}</p>
                    <button 
                      onClick={() => setShowQrModal(true)}
                      className="text-xs text-teal-400 hover:text-white underline font-black transition-colors cursor-pointer"
                    >
                      {t('dashboard.enlargeCode')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
                {[
                  {
                    label: t('dashboard.nextAppointment'),
                    value: nextAppointment ? `${nextAppointment.date} - ${nextAppointment.time}` : (isRtl ? 'لا توجد مواعيد قادمة' : 'No upcoming appointments'),
                    sub: nextAppointment ? `${isRtl ? 'مع' : 'with'} ${nextAppointment.doctorName}` : (isRtl ? 'احجز موعدك بسهولة' : 'Book an appointment'),
                    icon: Calendar
                  },
                  {
                    label: t('dashboard.clinicCenter'),
                    value: nextAppointment?.clinic || primaryHospital,
                    sub: isRtl ? 'المركز الطبي المعتمد' : 'Affiliated Center',
                    icon: MapPin
                  },
                  {
                    label: t('dashboard.lastVisit'),
                    value: lastVisit ? lastVisit.visit_date : (isRtl ? 'لا توجد زيارات سابقة' : 'No prior visits'),
                    sub: lastVisit ? (isRtl ? 'تم توثيق السجل الطبي' : 'Record Documented') : (isRtl ? 'سجل الزيارات فارغ' : 'Empty history'),
                    icon: History
                  },
                  {
                    label: t('dashboard.passStatus'),
                    value: t('dashboard.activePass'),
                    sub: isRtl ? 'مربوطة بـ EMR الموحد' : 'Linked to Unified EMR',
                    icon: ShieldCheck
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2">
                    <span className="text-[11px] text-slate-400 font-black flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-teal-400" />
                      {item.label}
                    </span>
                    <p className="font-black text-sm">{item.value}</p>
                    <p className="text-[11px] text-slate-400 font-bold">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vital Signs Card */}
              <Card className="lg:col-span-2 p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <HeartPulse className="w-6 h-6 text-teal-600" />
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
                    { label: isRtl ? 'النبض' : 'Pulse / HR', value: pulseVital !== '--' ? `${pulseVital} bpm` : '--', status: pulseVital !== '--' ? t('dashboard.vitalsStatus.excellent') : (isRtl ? 'غير مسجل' : 'Not recorded'), variant: pulseVital !== '--' ? 'success' : 'neutral' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-[24px] space-y-2">
                      <span className="text-[11px] text-slate-500 font-black block">{metric.label}</span>
                      <p className="text-xl font-black text-slate-900">{metric.value}</p>
                      <Badge variant={metric.variant as any} className="text-[10px]">{metric.status}</Badge>
                    </div>
                  ))}
                </div>

                {/* Orders Progress */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    {t('dashboard.ordersProgress')}
                  </h4>
                  {labResults.length === 0 && radResults.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center text-slate-500">
                      <p className="text-xs font-bold">{isRtl ? 'لا توجد طلبات تحاليل أو أشعة جارية حالياً' : 'No active diagnostic orders currently'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'ستظهر هنا الفحوصات الطبية فور إصدارها من الأطباء' : 'New tests will appear here once requested by your doctor'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {labResults.slice(0, 1).map(lab => (
                        <div key={lab.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="font-black text-slate-900 text-sm">{lab.testNameAr}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{lab.date || 'LAB ORDER'}</span>
                          </div>
                          <Badge variant={lab.status === 'ready' ? 'success' : 'info'}>
                            {lab.status === 'ready' ? t('dashboard.orderStatus.ready') : t('dashboard.orderStatus.inProgress')}
                          </Badge>
                        </div>
                      ))}
                      {radResults.slice(0, 1).map(rad => (
                        <div key={rad.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="font-black text-slate-900 text-sm">{rad.scanNameAr}</span>
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
              </Card>

              {/* Treating Doctor Card */}
              <Card className="p-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <span className="text-xs font-black text-slate-500">{t('dashboard.treatingDoctor')}</span>
                    <Badge variant="success">{isRtl ? 'معتمد' : 'Authorized'}</Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xl border border-teal-100">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">{primaryDoctorName}</h4>
                      <p className="text-xs text-slate-500 font-bold">{primaryDoctorSpecialty}</p>
                      <p className="text-[11px] text-teal-600 font-black mt-1">{primaryHospital}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-2">
                    <span className="text-[10px] text-slate-500 font-black block">
                      {isRtl ? 'آخر تشخيص وخطة علاجية:' : 'Latest Diagnosis & Plan:'}
                    </span>
                    <p className="font-bold text-slate-800 text-xs leading-relaxed">
                      {lastVisit?.diagnosis || lastVisit?.treatment_plan || (isRtl ? 'الملف الصحي قيد المتابعة الدورية.' : 'Routine medical follow-up.')}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <Button className="w-full" onClick={() => setActiveTab('appointments')}>
                    <Calendar className="w-4 h-4 ml-2" />
                    {isRtl ? 'حجز موعد جديد' : 'Book Appointment'}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Notifications Card */}
            <Card className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                  <Bell className="w-6 h-6 text-teal-600" />
                  {t('dashboard.notifications.title')}
                </h3>
                <Badge variant="info">{notifications.length} {t('dashboard.notifications.new')}</Badge>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد إشعارات جديدة حالياً' : 'No new notifications'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'ستصلك التنبيهات فور صدور نتائج التحاليل أو تأكيد المواعيد' : 'Alerts will appear here once results or appointments update'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-5 rounded-3xl border transition-all flex items-start justify-between gap-4 ${
                        notif.type === 'critical' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          notif.type === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {notif.type === 'critical' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{notif.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 font-bold leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-2 block">{notif.date} • {notif.time}</span>
                        </div>
                      </div>
                      {!notif.read && <Badge variant="info" className="shrink-0">{isRtl ? 'جديد' : 'New'}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* PAGE 2: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <Card className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  {t('appointments.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-bold">{t('appointments.subtitle')}</p>
              </div>
              <Button onClick={() => alert(isRtl ? 'جاري توجيهك لنظام حجز المواعيد المعتمد...' : 'Redirecting to booking portal...')}>
                {t('appointments.newButton')}
              </Button>
            </div>

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

            {appointments.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-[32px] border border-slate-100">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد مواعيد محجوزة حالياً' : 'No appointments scheduled'}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {isRtl ? 'يمكنك حجز موعد جديد مع الأطباء والاستشاريين في العيادات والمراكز المعتمدة.' : 'You can schedule a new appointment with our doctors and specialists.'}
                </p>
                <Button className="mt-4" size="sm" onClick={() => alert(isRtl ? 'جاري فتح نافذة حجز موعد جديد...' : 'Opening new booking wizard...')}>
                  {t('appointments.newButton')}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {appointments.map((app) => (
                  <div key={app.id} className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/50 pb-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-teal-600 font-black">
                          <Stethoscope className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-slate-900">{app.doctorName}</h3>
                            <Badge variant="info">{app.specialty}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-bold">{app.clinic}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl text-center">
                          <p className="text-[10px] text-slate-400 font-black uppercase">{isRtl ? 'التاريخ والوقت' : 'Date & Time'}</p>
                          <p className="text-sm font-black text-slate-900">{app.date} • {app.time}</p>
                        </div>
                        <Badge variant={app.status === 'confirmed' ? 'success' : (app.status === 'completed' ? 'neutral' : (app.status === 'cancelled' ? 'error' : 'info'))} className="px-4 py-2">
                          {app.status === 'confirmed' ? (isRtl ? 'مؤكد 🟢' : 'Confirmed 🟢') : (app.status === 'completed' ? (isRtl ? 'مكتمل' : 'Completed') : (app.status === 'cancelled' ? (isRtl ? 'ملغى 🔴' : 'Cancelled 🔴') : (isRtl ? 'في انتظار تأكيد الطبيب/المساعد ⏳' : 'Pending Doctor/Assistant Confirmation ⏳')))}
                        </Badge>
                      </div>
                    </div>

                    {app.preparationInstructions && app.preparationInstructions.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 space-y-3">
                        <h4 className="text-xs font-black text-amber-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          {t('appointments.preparationTitle')}
                        </h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {app.preparationInstructions.map((inst, idx) => (
                            <li key={idx} className="text-xs text-amber-800 font-bold flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                              {inst}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <Button variant="secondary" onClick={() => setSelectedAppForQr(app)}>
                        <QrCode className="w-4 h-4 ml-2" />
                        {t('appointments.viewPass')}
                      </Button>
                      <div className="flex items-center gap-2">
                        {app.status !== 'cancelled' && app.status !== 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              className="text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => handleOpenRescheduleModal(app)}
                            >
                              {t('appointments.reschedule')}
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleOpenCancelModal(app)}
                            >
                              {t('appointments.cancel')}
                            </Button>
                          </>
                        )}
                        {app.status === 'cancelled' && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                            {isRtl ? 'تم إلغاء هذا الموعد' : (locale === 'fr' ? 'Ce rendez-vous est annulé' : 'This appointment was cancelled')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* PAGE 3: VISIT PASS */}
        {activeTab === 'visit_pass' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6 shadow-xs max-w-4xl mx-auto">
              <div className="border-b border-slate-200 pb-4 text-center space-y-1">
                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full inline-block font-mono">
                  DIGITAL HEALTH IDENTIFIER • PASS
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {isRtl ? 'بطاقة الزيارة الرقمية الموحدة (Patient Visit Pass)' : 'Unified Digital Patient Visit Pass'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'استخدم هذا الكود عند الدخول لكافة عيادات ومختبرات وأقسام الأشعة التابعة لمنظومة عافية' : 'Use this pass at all affiliated clinics, labs, and radiology centers'}
                </p>
              </div>

              {/* The Printable Pass Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800 relative">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
                  <div className="text-center sm:text-right space-y-1">
                    <span className="text-[10px] text-teal-400 font-mono font-bold tracking-widest block uppercase">AAFIYA DIGITAL HEALTH CARD</span>
                    <h3 className="text-2xl font-black text-white">{patientFullName}</h3>
                    <p className="text-xs text-slate-300">
                      {isRtl ? 'رقم الملف الطبي MRN:' : 'Medical Record Number (MRN):'} <span className="font-mono text-teal-300 font-bold">{patientMrn}</span>
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0 text-center">
                    <QRCode 
                      value={patientMrn || 'MRN-VAL01'} 
                      size={112} 
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                      viewBox="0 0 256 256" 
                      className="mx-auto" 
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-700 mt-1 block">{patientMrn}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'رقم الهوية الوطنية' : 'National ID'}</span>
                    <p className="font-mono font-bold text-slate-100">{patientNationalId}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'فصيلة الدم' : 'Blood Group'}</span>
                    <p className="font-mono font-bold text-rose-400">{patientBloodType}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                    <p className="font-bold text-slate-100">{patientBirthDate}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'الهاتف المعتمد' : 'Registered Phone'}</span>
                    <p className="font-mono font-bold text-slate-100">{patientPhone}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</span>
                    <p className="font-bold text-slate-100 text-[11px] truncate">{patientEmail}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'حالة التوثيق الرقمي' : 'Verification Status'}</span>
                    <p className="font-bold text-emerald-400">{isRtl ? 'موثق ومعتمد 🟢' : 'Verified & Active 🟢'}</p>
                  </div>
                </div>

                <div className="bg-teal-950/60 border border-teal-800/80 p-3 rounded-xl text-center text-[11px] text-teal-200">
                  {isRtl ? '💡 عند وصولك للعيادة، امسح الكود أعلاه على القارئ الذاتي لتسجيل حضورك تلقائياً دون الانتظار.' : '💡 Scan this code at clinic check-in terminals for automated queue priority.'}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleSimulateDownload(`Patient_Visit_Pass_${patientMrn}.pdf`, 'PASS')}
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isRtl ? 'تحميل بطاقة الزيارة PDF' : 'Download Visit Pass PDF'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-6 py-2.5 rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {isRtl ? 'طباعة البطاقة مباشرة' : 'Print Pass'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* PAGE 4: UNIFIED MEDICAL RECORD (EMR) */}
        {activeTab === 'medical_record' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'الملف الطبي الموحد الرقمي (Unified EMR Record)' : 'Unified Electronic Medical Record'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'سجلك الطبي الشامل المتكامل المعترف به عبر كافة العيادات والمستشفيات المشاركة' : 'Comprehensive integrated health records shared securely with certified providers'}
                </p>
              </div>

              {/* Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Chronic Conditions */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
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
                        <div key={cond.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">{cond.condition_name}</span>
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
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    {isRtl ? 'الحساسية والتفاعلات الدوائية (Allergies)' : 'Allergies & Drug Reactions'}
                  </h3>
                  {(!patientRecord?.allergies || patientRecord.allergies.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                      <p className="text-xs font-bold">{isRtl ? 'لا توجد حساسيات مسجلة' : 'No known allergies recorded'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {patientRecord.allergies.map((all, idx) => (
                        <div key={all.id || idx} className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-rose-900 block">{all.allergen_name}</span>
                            <span className="text-[10px] text-rose-700">{all.reaction_type || all.severity}</span>
                          </div>
                          <span className="bg-rose-200 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded">
                            {all.severity || (isRtl ? 'حساسية' : 'Allergy')} 🔴
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Surgical History */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    {isRtl ? 'العمليات والتدخلات الجراحية السابقة' : 'Surgical & Procedural History'}
                  </h3>
                  <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold">{isRtl ? 'لا توجد عمليات جراحية مسجلة' : 'No surgical history on record'}</p>
                  </div>
                </div>

                {/* Vaccinations */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    {isRtl ? 'سجل اللقاحات والتطعيمات المعتمدة' : 'Vaccination Records'}
                  </h3>
                  <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold">{isRtl ? 'لا توجد سجلات لقاحات مسجلة' : 'No vaccination records on file'}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: CLINICAL VISITS */}
        {activeTab === 'clinical_visits' && (
          <div className="space-y-6">
            {/* Shared Medical Timeline Header */}
            <MedicalTimelineHeader
              value={timelineValue}
              onChange={setTimelineValue}
              totalCount={clinicalVisits.length}
            />

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'سجل الزيارات الطبية والتشخيص السريري (Clinical Visits & Notes)' : 'Clinical Visits & Doctor Notes'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'ملاحظات الطبيب، العلامات الحيوية، والتشخيص مع الخطة العلاجية لكل زيارة سابقة' : 'Consultation notes, vital signs, and treatment plans from prior clinic visits'}
                </p>
              </div>

              {clinicalVisits.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد زيارات سريرية مسجلة بعد' : 'No clinical visits recorded yet'}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {isRtl ? 'سيتم توثيق تقارير الفحص والتشخيص هنا فور انتهاء جلسات الاستشارة الطبية مع أطبائك.' : 'Consultation reports and vital sign recordings will appear here following completed visits.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clinicalVisits.map((visit) => (
                    <div key={visit.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {visit.doctor?.user?.name || (isRtl ? 'د. الطبيب المعالج' : 'Consulting Doctor')}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {isRtl ? 'تاريخ الزيارة:' : 'Visit Date:'} {visit.visit_date} • {visit.clinic?.name || (isRtl ? 'العيادة التخصصية' : 'Clinic')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSimulateDownload(`Clinical_Visit_Report_${visit.visit_reference || visit.id}.pdf`, 'VISIT')}
                          className="bg-white hover:bg-slate-100 text-teal-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isRtl ? 'تحميل تقرير الزيارة PDF' : 'Download Visit PDF'}
                        </button>
                      </div>

                      {visit.vital_signs && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                          {visit.vital_signs.blood_pressure_systolic && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'ضغط الدم' : 'Blood Pressure'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.blood_pressure_systolic}/{visit.vital_signs.blood_pressure_diastolic} mmHg</p>
                            </div>
                          )}
                          {visit.vital_signs.heart_rate && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'النبض' : 'Heart Rate'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.heart_rate} bpm</p>
                            </div>
                          )}
                          {visit.vital_signs.temperature && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'الحرارة' : 'Temperature'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.temperature} °C</p>
                            </div>
                          )}
                          {visit.vital_signs.oxygen_saturation && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'تشبع الأكسجين' : 'SpO2'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.oxygen_saturation}%</p>
                            </div>
                          )}
                          {visit.vital_signs.weight_kg && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'الوزن' : 'Weight'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.weight_kg} kg</p>
                            </div>
                          )}
                          {visit.vital_signs.height_cm && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'الطول' : 'Height'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.height_cm} cm</p>
                            </div>
                          )}
                          {visit.vital_signs.blood_glucose && (
                            <div>
                              <span className="text-[10px] text-slate-500 block">{isRtl ? 'سكر الدم' : 'Blood Glucose'}</span>
                              <p className="font-bold text-slate-900">{visit.vital_signs.blood_glucose} mg/dL</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-slate-800 block">{isRtl ? 'ملاحظات التشخيص والخطة العلاجية:' : 'Diagnosis & Treatment Plan:'}</span>
                        <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
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

        {/* PAGE 6: PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'سجل الوصفات الطبية الإلكترونية (e-Prescriptions & Refills)' : 'Electronic Prescriptions & Refills'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'الأدوية الحالية النشطة، الجرعات الموصى بها، والتحقق الرقمي من صحة الوصفة' : 'Active prescriptions, dosages, instructions, and pharmacy verification codes'}
                </p>
              </div>

              {prescriptions.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد وصفات طبية مسجلة حالياً' : 'No active prescriptions on file'}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {isRtl ? 'ستظهر هنا الأدوية والعلاجات الموصوفة فور إصدارها من طبيبك المعالج.' : 'Medications prescribed during consultations will appear here automatically.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-900 text-sm">{rx.medicationAr}</span>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          {rx.status === 'active' ? (isRtl ? 'نشطة 🟢' : 'Active 🟢') : (isRtl ? 'مكتملة' : 'Completed')}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-700">
                        <p><strong>{isRtl ? 'الجرعة والتكرار:' : 'Dosage & Frequency:'}</strong> {rx.dosage} • {rx.frequency}</p>
                        <p><strong>{isRtl ? 'المدة:' : 'Duration:'}</strong> {rx.duration}</p>
                        <p><strong>{isRtl ? 'وُصفت بواسطة:' : 'Prescribed By:'}</strong> {rx.prescribedBy} ({rx.date})</p>
                      </div>

                      {rx.pharmacyNote && (
                        <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl text-[11px] text-teal-900 font-medium">
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
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 text-xs font-sans text-slate-600">
                  <span className="font-bold">
                    {isRtl ? `صفحة ${rxCurrentPage} من ${rxLastPage}` : `Page ${rxCurrentPage} of ${rxLastPage}`}
                  </span>
                  {rxTotalRecords > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded font-bold border bg-slate-100 border-slate-300 text-slate-700">
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
                        ? 'opacity-40 cursor-not-allowed border-slate-300'
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
                        ? 'opacity-40 cursor-not-allowed border-slate-300'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <span>{isRtl ? 'التالي' : 'Next'}</span>
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 7: LABORATORY RESULTS */}
        {activeTab === 'lab_results' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'نتائج التحاليل الطبية والتقارير المخبرية (Lab Results & Diagnostics)' : 'Laboratory Diagnostics & Test Results'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'نتائج التحاليل المعتمدة وقيم الفحص مع تنبيهات القيم الحرجة وإمكانية تنزيل التقارير الرسمية' : 'Verified laboratory test outcomes with reference range checks and official PDF downloads'}
                </p>
              </div>

              {labResults.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد نتائج تحاليل مسجلة حالياً' : 'No laboratory results on record'}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {isRtl ? 'ستظهر التحاليل المخبرية المعتمدة هنا فور إنجازها وتوقيعها من المختبر.' : 'Certified laboratory results will appear here once finalized by the diagnostic center.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">{isRtl ? 'جدول التحاليل والفحوصات المخبرية:' : 'Laboratory Tests Record:'}</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">{isRtl ? 'اسم التحليل' : 'Test Name'}</th>
                          <th className="py-3 px-3">{isRtl ? 'التاريخ' : 'Date'}</th>
                          <th className="py-3 px-3">{isRtl ? 'النتيجة المسجلة' : 'Result'}</th>
                          <th className="py-3 px-3">{isRtl ? 'المعدل الطبيعي' : 'Reference Range'}</th>
                          <th className="py-3 px-3">{isRtl ? 'حالة الطلب' : 'Status'}</th>
                          <th className="py-3 px-3 text-center">{isRtl ? 'التقرير PDF' : 'PDF Report'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {labResults.map((lab) => (
                          <tr key={lab.id} className={lab.isCritical ? 'bg-rose-50/40' : 'hover:bg-slate-50'}>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{lab.testNameAr}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{lab.testNameEn}</p>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">{lab.date}</td>
                            <td className="py-3 px-3 font-bold">
                              {lab.isCritical ? (
                                <span className="text-rose-700 font-mono font-black flex items-center gap-1">
                                  {lab.value} {lab.unit} 🔴 ({isRtl ? 'حرج' : 'Critical'})
                                </span>
                              ) : (
                                <span className="font-mono text-teal-800">{lab.value} {lab.unit}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-mono">{lab.normalRange}</td>
                            <td className="py-3 px-3">
                              {lab.status === 'ready' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">{isRtl ? '🟢 التقرير جاهز' : '🟢 Ready'}</span>}
                              {lab.status === 'in_progress' && <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">{isRtl ? '🔵 جاري الفحص' : '🔵 In Progress'}</span>}
                              {lab.status === 'received' && <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">{isRtl ? 'تم الاستلام' : 'Received'}</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
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
                                  <button
                                    onClick={() => handleSimulateDownload(`Lab_Report_${lab.id}.pdf`, 'LAB')}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                  >
                                    {isRtl ? 'تحميل PDF' : 'Download'}
                                  </button>
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
          </div>
        )}

        {/* PAGE 8: RADIOLOGY RESULTS & VIEWER */}
        {activeTab === 'rad_results' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'تقارير وأشعة المريض التشخيصية ومعاين الصور (Radiology & Image Viewer)' : 'Radiology Studies & Image Viewer'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'استعرض تقارير الأشعة المعتمدة وصور الأشعة المقطعية، الرنين، والسينية مع معاين التكبير' : 'Explore verified diagnostic imaging reports (CT, MRI, X-Ray) with interactive viewer'}
                </p>
              </div>

              {radResults.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">{isRtl ? 'لا توجد فحوصات أشعة مسجلة حالياً' : 'No radiology examinations on record'}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {isRtl ? 'ستظهر هنا تقارير وصور الأشعة فور اعتمادها من مركز التصوير الشعاعي.' : 'Imaging scans and radiologist findings will appear here once finalized.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {radResults.map((rad) => (
                    <div key={rad.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{rad.scanNameAr}</h3>
                            <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                              {rad.modality}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{rad.scanNameEn} • {isRtl ? 'الاستشاري:' : 'Radiologist:'} {rad.radiologistName}</p>
                        </div>

                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl self-start sm:self-auto">
                          {rad.status === 'ready' ? (isRtl ? '🟢 معتمد جاهز' : '🟢 Finalized') : (isRtl ? '🔵 جاري التنفيذ' : '🔵 In Progress')}
                        </span>
                      </div>

                      {/* Report Findings Box */}
                      <div className="space-y-2 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-900 block">{isRtl ? 'النتائج الشعاعية (Findings):' : 'Radiological Findings:'}</span>
                          <p className="text-slate-700 leading-relaxed">{rad.findings}</p>
                        </div>

                        <div className="bg-teal-50/70 border border-teal-200 p-3.5 rounded-xl space-y-1">
                          <span className="font-bold text-teal-900 block">{isRtl ? 'الانطباع التشخيصي النهائي (Impression):' : 'Diagnostic Impression:'}</span>
                          <p className="text-slate-900 font-bold leading-relaxed">&ldquo;{rad.impression}&rdquo;</p>
                        </div>
                      </div>

                      {/* Image Viewer Thumbnails */}
                      {rad.images.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-bold text-slate-800 block">{isRtl ? 'معاين صور الأشعة والتصوير المقطعي:' : 'Image Viewer Previews:'}</span>
                          <div className="flex items-center gap-3 overflow-x-auto pb-2">
                            {rad.images.map((img) => (
                              <div
                                key={img.id}
                                onClick={() => setSelectedScanForViewer(rad)}
                                className="w-32 h-24 bg-slate-950 text-white rounded-xl p-2 flex flex-col justify-between cursor-pointer border border-slate-800 hover:border-teal-500 transition-colors shrink-0 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-teal-300 font-bold">{img.title}</span>
                                  <Maximize2 className="w-3 h-3 text-slate-400" />
                                </div>
                                <div className="text-center my-auto text-slate-600">
                                  <Radio className="w-6 h-6 mx-auto animate-pulse" />
                                </div>
                                <span className="text-[8px] text-slate-400 text-center font-mono">{isRtl ? 'انقر للمعاينة' : 'Click to preview'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedScanForViewer(rad)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                            {isRtl ? 'فتح معاين الأشعة التفاعلي' : 'Open Image Viewer'}
                          </button>
                          <button
                            onClick={() => setSelectedDiagnosticForQr({
                              id: rad.id,
                              order_reference: `ORD-${rad.id.slice(0, 8)}`,
                              order_type: 'radiology',
                              title: rad.scanNameAr,
                            })}
                            className="bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                            title={isRtl ? 'عرض رمز QR للتحقق' : 'Show Verification QR'}
                          >
                            <QrCode className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isRtl ? 'رمز QR' : 'QR Pass'}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleSimulateDownload(`Radiology_Scan_Report_${rad.id}.pdf`, 'RAD')}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          {isRtl ? 'تحميل التقرير الطبي PDF' : 'Download Report PDF'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 9: BILLING & DOCUMENT SHARING */}
        {activeTab === 'billing_sharing' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'الفواتير، مشاركة التقارير، وسجل التنزيلات (Billing & Sharing)' : 'Billing, Report Sharing & Download History'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'شارك تقاريرك الفردية بأمان مع أطباء خارجيين وتتبع سجل التنزيل الرقمي' : 'Share discrete clinical reports securely via temporary tokens and audit access records'}
                </p>
              </div>

              {/* Encrypted Medical Record Sharing Tool (DEC-P05-01, DEC-P05-03) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-teal-600" />
                    {isRtl ? 'مشاركة السجل الطبي المشفر (رمز PIN إلزامي)' : (locale === 'fr' ? 'Partage sécurisé du dossier médical (Code PIN obligatoire)' : 'Encrypted Medical Record Sharing (PIN Required)')}
                  </h3>
                  <span className="bg-teal-100 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                    SECURE TOKEN
                  </span>
                </div>

                <p className="text-xs text-slate-600">
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
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 font-medium"
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
                            title={isRtl ? (showSharePin ? 'إخفاء رمز PIN' : 'إظهار رمز PIN') : (locale === 'fr' ? (showSharePin ? 'Masquer le code PIN' : 'Afficher le code PIN') : (showSharePin ? 'Hide PIN' : 'Show PIN'))}
                            aria-label={isRtl ? (showSharePin ? 'إخفاء رمز PIN' : 'إظهار رمز PIN') : (locale === 'fr' ? (showSharePin ? 'Masquer le code PIN' : 'Afficher le code PIN') : (showSharePin ? 'Hide PIN' : 'Show PIN'))}
                          >
                            {showSharePin ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
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

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleCopyShareLink}
                        disabled={isGeneratingToken}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {isGeneratingToken ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{isRtl ? 'جارٍ إنشاء الرابط المشفر...' : (locale === 'fr' ? 'Génération en cours...' : 'Generating Link...')}</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>{isRtl ? 'إنشاء رابط المشاركة المشفر' : (locale === 'fr' ? 'Générer le lien chiffré' : 'Generate Encrypted Link')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-sm font-bold text-emerald-950">
                          {isRtl ? 'تم إنشاء رابط المشاركة المشفر بنجاح' : (locale === 'fr' ? 'Lien de partage chiffré généré avec succès' : 'Encrypted Share Link Generated Successfully')}
                        </h4>
                      </div>
                      <button
                        onClick={handleResetShare}
                        className="text-xs text-teal-600 hover:text-teal-800 font-bold underline cursor-pointer"
                      >
                        {isRtl ? 'إنشاء مشاركة جديدة' : (locale === 'fr' ? 'Nouveau partage' : 'Create New Share')}
                      </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">
                          {isRtl ? 'تنبيه أمني هام:' : (locale === 'fr' ? 'Avis de sécurité important :' : 'Important Security Notice:')}
                        </span>
                        <span>
                          {isRtl
                            ? 'لن يتم عرض رمز التوكن أو رمز الحماية PIN مجدداً بعد مغادرة هذه الشاشة. يرجى نسخهما ومشاركتهما مع الطبيب الآن عبر وسيلة آمنة.'
                            : (locale === 'fr'
                              ? 'Le jeton et le code PIN ne seront plus jamais réaffichés après avoir quitté. Veuillez les copier et les transmettre maintenant.'
                              : 'The token and PIN will not be displayed again after leaving this view. Please copy and share them with the recipient now via a secure channel.')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          {isRtl ? 'رابط المشاركة المشفر:' : (locale === 'fr' ? 'Lien de partage chiffré :' : 'Encrypted Share URL:')}
                        </label>
                        <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl flex items-center justify-between font-mono">
                          <span className="text-slate-800 truncate text-[11px] select-all mr-2">
                            {createdShareData.share_url}
                          </span>
                          <button
                            onClick={() => handleCopyField(createdShareData.share_url, 'url')}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {copiedLink ? (isRtl ? 'تم النسخ! ✓' : 'Copied! ✓') : (isRtl ? 'نسخ الرابط' : 'Copy Link')}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            {isRtl ? 'رمز الحماية PIN:' : (locale === 'fr' ? 'Code PIN de sécurité :' : 'Security PIN:')}
                          </label>
                          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl flex items-center justify-between font-mono">
                            <span className="text-slate-900 font-bold text-sm tracking-widest select-all">
                              {createdPin}
                            </span>
                            <button
                              onClick={() => handleCopyField(createdPin, 'pin')}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {copiedPin ? (isRtl ? 'تم! ✓' : 'Copied! ✓') : (isRtl ? 'نسخ PIN' : 'Copy PIN')}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            {isRtl ? 'رمز التوكن (Token):' : (locale === 'fr' ? 'Jeton de partage (Token) :' : 'Share Token:')}
                          </label>
                          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl flex items-center justify-between font-mono">
                            <span className="text-slate-800 truncate text-[11px] select-all mr-2">
                              {createdShareData.token}
                            </span>
                            <button
                              onClick={() => handleCopyField(createdShareData.token, 'token')}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              {copiedToken ? (isRtl ? 'تم! ✓' : 'Copied! ✓') : (isRtl ? 'نسخ Token' : 'Copy Token')}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 pt-1">
                        <span className="font-bold">{isRtl ? 'صالح حتى:' : (locale === 'fr' ? 'Valable jusqu\'au :' : 'Expires at:')} </span>
                        <span>{new Date(createdShareData.expires_at).toLocaleString(locale === 'ar' ? 'ar-DZ' : (locale === 'fr' ? 'fr-FR' : 'en-US'))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Download Audit History Log */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-600" />
                  {isRtl ? 'سجل تنزيل المستندات والتقارير (Download Audit History Log):' : 'Document Download Audit Log:'}
                </h3>

                {downloadLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold">{isRtl ? 'لا توجد عمليات تنزيل مسجلة في هذه الجلسة' : 'No downloads recorded in this session'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'يتم توثيق كل عملية تنزيل لتقاريرك الطبية لضمان الأمان والتدقيق' : 'All document downloads are audited for your security'}</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">{isRtl ? 'اسم المستند/التقرير' : 'Document'}</th>
                          <th className="py-2.5 px-3">{isRtl ? 'تاريخ ووقت التنزيل' : 'Timestamp'}</th>
                          <th className="py-2.5 px-3">{isRtl ? 'النوع' : 'Type'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                        {downloadLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{log.docName}</td>
                            <td className="py-2.5 px-3 text-slate-500">{log.date}</td>
                            <td className="py-2.5 px-3 text-teal-800 font-bold">{log.type}</td>
                            <td className="py-2.5 px-3 text-center text-emerald-800 font-bold">{isRtl ? 'مكتمل 🟢' : 'Complete 🟢'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* PAGE 10: PROFILE & DEPENDENTS */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'الملف الشخصي وإدارة التابعين (Patient Profile & Dependents)' : 'Patient Profile & Dependents'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'بياناتك الشخصية الموثقة مع إمكانية إضافة وإدارة ملفات الأبناء وأفراد العائلة' : 'Verified personal demographics and family member/dependent management'}
                </p>
              </div>

              {/* Personal Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">{isRtl ? 'البيانات الشخصية الأساسية:' : 'Primary Demographics:'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'الاسم الكامل' : 'Full Name'}</span>
                    <p className="font-bold text-slate-900">{patientFullName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الهوية الوطنية' : 'National ID'}</span>
                    <p className="font-bold text-slate-900 font-mono">{patientNationalId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                    <p className="font-bold text-slate-900">{patientBirthDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</span>
                    <p className="font-bold text-slate-900 font-mono">{patientEmail}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</span>
                    <p className="font-bold text-slate-900 font-mono">{patientPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{isRtl ? 'رقم الملف الطبي MRN' : 'Medical Record Number'}</span>
                    <p className="font-bold text-teal-700 font-mono">{patientMrn}</p>
                  </div>
                </div>
              </div>

              {/* Family & Dependents */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    {isRtl ? 'ملفات الأبناء والتابعين المربوطين (Dependents)' : 'Linked Dependents & Family'}
                  </h3>
                  <button
                    onClick={() => alert(isRtl ? 'سيتم فتح نموذج ربط ملف تابع جديد برقم الهوية صلة القرابة!' : 'Opening dependent link form...')}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer"
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
          </div>
        )}

        {/* PAGE 11: SETTINGS & SECURITY */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'إعدادات الحساب والأمان والتفضيلات (Settings & Security)' : 'Account Settings & Security'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'تغيير كلمة المرور، تفضيلات التنبيهات، والتوثيق الثنائي' : 'Password management, notification preferences, and two-factor authentication'}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{isRtl ? 'تنبيهات الرسائل النصية القصيرة (SMS Alerts)' : 'SMS Notifications'}</h4>
                    <p className="text-slate-500 text-[11px]">{isRtl ? 'استلام تذكير بالنتائج والمواعيد على الجوال المعتمد' : 'Receive appointment reminders and ready report alerts via SMS'}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-teal-600 cursor-pointer" />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{isRtl ? 'التوثيق الثنائي وأمان الدخول (Two-Factor Auth)' : 'Two-Factor Authentication (2FA)'}</h4>
                    <p className="text-slate-500 text-[11px]">{isRtl ? 'حماية دخول بوابة المريض عبر رمز OTP مؤقت' : 'Protect your patient portal access with one-time verification codes'}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {isRtl ? 'مفعل 🟢' : 'Active 🟢'}
                  </span>
                </div>

                <ChangePasswordCard isRtl={isRtl} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-teal-200">
                CHECK-IN QR CODE
              </span>
              <h3 className="text-base font-bold text-slate-900">{patientFullName}</h3>
              <p className="text-xs font-mono text-slate-500">{patientMrn}</p>
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
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
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-emerald-200">
                CERTIFIED E-PRESCRIPTION QR
              </span>
              <h3 className="text-base font-bold text-slate-900">{selectedRxForQr.medicationAr}</h3>
              <p className="text-xs font-mono text-slate-500">{selectedRxForQr.prescription_reference || selectedRxForQr.id}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${locale}/verify/${selectedRxForQr.secure_token || selectedRxForQr.id}`} 
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
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-indigo-200">
                APPOINTMENT CHECK-IN PASS
              </span>
              <h3 className="text-base font-bold text-slate-900">{selectedAppForQr.doctorName}</h3>
              <p className="text-xs text-slate-500">{selectedAppForQr.clinic}</p>
              <p className="text-xs font-mono font-bold text-indigo-600">{selectedAppForQr.date} • {selectedAppForQr.time}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={selectedAppForQr.secure_token ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${locale}/appointment/pass/${selectedAppForQr.secure_token}` : selectedAppForQr.id} 
                size={192} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                viewBox="0 0 256 256" 
                className="mx-auto" 
              />
            </div>

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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
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
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-teal-200 uppercase">
                {selectedDiagnosticForQr.order_type === 'radiology' ? 'RADIOLOGY ORDER QR' : 'LABORATORY ORDER QR'}
              </span>
              <h3 className="text-base font-bold text-slate-900">{selectedDiagnosticForQr.title || 'Diagnostic Order'}</h3>
              <p className="text-xs font-mono text-slate-500">{selectedDiagnosticForQr.order_reference || selectedDiagnosticForQr.id}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border border-slate-200">
              <QRCode 
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${locale}/diagnostic/order/${selectedDiagnosticForQr.secure_token || selectedDiagnosticForQr.id}`} 
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

      {/* SHARE REPORT MODAL (DEC-P05-01, DEC-P05-03) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowShareModal(false);
                handleResetShare();
              }}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-600" />
                {isRtl ? 'مشاركة السجل الطبي المشفر' : (locale === 'fr' ? 'Partager le dossier médical chiffré' : 'Share Encrypted Medical Record')}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl ? 'إنشاء رابط مشفر ومحمي برمز PIN لمشاركة سجلك الطبي بأمان وفق القرار DEC-P05-01' : (locale === 'fr' ? 'Générer un lien chiffré protégé par PIN selon DEC-P05-01' : 'Generate an encrypted PIN-protected share link per DEC-P05-01')}
              </p>
            </div>

            {!createdShareData ? (
              <div className="space-y-3 text-xs">
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
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 font-medium"
                  >
                    <option value="24h">{isRtl ? '24 ساعة (مستحسن للزيارات السريعة)' : (locale === 'fr' ? '24 heures (recommandé)' : '24 Hours (Recommended)')}</option>
                    <option value="7d">{isRtl ? '7 أيام (للاستشارات الممتدة)' : (locale === 'fr' ? '7 jours' : '7 Days')}</option>
                    <option value="30d">{isRtl ? '30 يوماً' : (locale === 'fr' ? '30 jours' : '30 Days')}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'رمز الحماية PIN (إلزامي، 4 إلى 8 أرقام):' : (locale === 'fr' ? 'Code PIN (obligatoire, 4 à 8 chiffres) :' : 'Security PIN (Required, 4 to 8 digits):')}
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
                      title={isRtl ? (showSharePin ? 'إخفاء رمز PIN' : 'إظهار رمز PIN') : (locale === 'fr' ? (showSharePin ? 'Masquer le code PIN' : 'Afficher le code PIN') : (showSharePin ? 'Hide PIN' : 'Show PIN'))}
                      aria-label={isRtl ? (showSharePin ? 'إخفاء رمز PIN' : 'إظهار رمز PIN') : (locale === 'fr' ? (showSharePin ? 'Masquer le code PIN' : 'Afficher le code PIN') : (showSharePin ? 'Hide PIN' : 'Show PIN'))}
                    >
                      {showSharePin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {sharePinError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1">{sharePinError}</p>
                  )}
                </div>

                {shareErrorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{shareErrorMessage}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCopyShareLink}
                    disabled={isGeneratingToken}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-xs text-center flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingToken ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جارٍ الإنشاء...' : (locale === 'fr' ? 'Génération...' : 'Generating...')}</span>
                      </>
                    ) : (
                      <span>{isRtl ? 'إنشاء رابط المشاركة' : (locale === 'fr' ? 'Générer le lien' : 'Generate Link')}</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      handleResetShare();
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : (locale === 'fr' ? 'Annuler' : 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    {isRtl ? 'تم إنشاء رابط المشاركة المشفر بنجاح' : (locale === 'fr' ? 'Lien généré avec succès' : 'Link Generated Successfully')}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900">
                  <p className="font-bold mb-1">
                    {isRtl ? 'تنبيه أمني هام:' : (locale === 'fr' ? 'Avis de sécurité :' : 'Important Notice:')}
                  </p>
                  <p>
                    {isRtl
                      ? 'لن يتم عرض رمز التوكن أو PIN مجدداً. يرجى نسخهما ومشاركتهما مع الطبيب الآن.'
                      : (locale === 'fr'
                        ? 'Le jeton et le PIN ne seront plus jamais réaffichés. Copiez-les maintenant.'
                        : 'The token and PIN will not be displayed again. Please copy them now.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isRtl ? 'رابط المشاركة:' : (locale === 'fr' ? 'Lien de partage :' : 'Share URL:')}
                    </label>
                    <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-[11px] text-slate-800 flex items-center justify-between">
                      <span className="truncate mr-2 select-all">{createdShareData.share_url}</span>
                      <button
                        onClick={() => handleCopyField(createdShareData.share_url, 'url')}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
                      >
                        {copiedLink ? (isRtl ? 'تم! ✓' : 'Copied! ✓') : (isRtl ? 'نسخ' : 'Copy')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">PIN:</label>
                      <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-xs text-slate-900 font-bold flex items-center justify-between">
                        <span className="tracking-widest select-all">{createdPin}</span>
                        <button
                          onClick={() => handleCopyField(createdPin, 'pin')}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                        >
                          {copiedPin ? '✓' : (isRtl ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Token:</label>
                      <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-[10px] text-slate-800 flex items-center justify-between">
                        <span className="truncate mr-1 select-all">{createdShareData.token}</span>
                        <button
                          onClick={() => handleCopyField(createdShareData.token, 'token')}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded shrink-0 cursor-pointer"
                        >
                          {copiedToken ? '✓' : (isRtl ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowShareModal(false);
                    handleResetShare();
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  {isRtl ? 'إغلاق' : (locale === 'fr' ? 'Fermer' : 'Close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RADIOLOGY INTERACTIVE SCAN VIEWER MODAL */}
      {selectedScanForViewer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full p-6 space-y-5 border border-slate-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedScanForViewer(null)}
              className="absolute top-4 left-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
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
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-6 py-2 rounded-xl cursor-pointer"
              >
                {isRtl ? 'إغلاق المعاين' : 'Close Viewer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT CANCELLATION CONFIRMATION MODAL (FIX-PAT-01) */}
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
                  {isRtl ? 'يرجى تأكيد رغبتك في إلغاء هذا الحجز' : (locale === 'fr' ? 'Veuillez confirmer l\'annulation' : 'Please confirm appointment cancellation')}
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
                  {isRtl ? 'سبب الإلغاء (اختياري)' : (locale === 'fr' ? 'Motif d\'annulation (optionnel)' : 'Cancellation reason (optional)')}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isCancelling}
                  rows={2}
                  maxLength={500}
                  placeholder={isRtl ? 'اكتب سبب الإلغاء هنا إن رغبت...' : (locale === 'fr' ? 'Précisez le motif si souhaité...' : 'Enter reason if any...')}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                    (isRtl ? 'تأكيد إلغاء الموعد' : (locale === 'fr' ? 'Confirmer l\'annulation' : 'Confirm Cancellation'))
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT RESCHEDULING MODAL (FIX-PAT-02) */}
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

            {/* Comparison Grid: Current vs Proposed */}
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

            {/* Warning if data incomplete */}
            {(!reschedulingAppointment.clinicId || !reschedulingAppointment.doctorId) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-bold leading-relaxed">
                  {t('appointments.rescheduleModal.incompleteData')}
                </p>
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              {/* Date Selection */}
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

              {/* Time Slot Selection */}
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

              {/* Same Slot Warning */}
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

              {/* Notes */}
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
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Error Display */}
              {rescheduleError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-bold leading-relaxed">{rescheduleError}</p>
                </div>
              )}

              {/* Footer Buttons */}
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
