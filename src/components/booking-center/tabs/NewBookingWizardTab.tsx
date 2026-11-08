'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookingRecord,
  PatientRecord,
  PatientType,
  PackageDetails
} from '../../../types';
import {
  UserCheck,
  UserPlus,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Stethoscope,
  AlertCircle,
  ShieldAlert,
  Printer,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Loader2
} from 'lucide-react';
import { adminService, AdminDoctorItem } from '@/services/adminService';
import { appointmentService } from '@/services/appointmentService';
import { ehrService } from '@/services/ehrService';
import { WilayaSelect, CommuneSelect } from '../../master-data';
import QRCode from 'react-qr-code';
import {
  openWhatsAppAppointmentShare,
  downloadAppointmentCardPng,
  AppointmentTicketData,
  WhatsAppLanguage
} from '@/lib/appointmentTicketCard';
import { Download, Sparkles } from 'lucide-react';

interface DoctorSearchItem {
  id: string;
  name: string;
  specialty: string;
  facilityName: string;
  wilaya: string;
  address: string;
  rating: number;
  maxPatientsPerSlot: number;
  availableSlots: Array<{ time: string; booked: number }>;
  clinicId?: string;
  clinics?: Array<{
    id: string;
    name: string;
    wilaya?: string;
    address?: string;
    phone?: string;
    is_working_hours_activated?: boolean;
  }>;
  is_working_hours_activated?: boolean;
}

interface NewBookingWizardTabProps {
  patients?: PatientRecord[];
  packageDetails: PackageDetails;
  onCreateBooking: (newBooking: BookingRecord) => void;
  onCancel: () => void;
  initialPatient?: PatientRecord | null;
}

const DEFAULT_SLOTS = [
  { time: '08:00', booked: 0 },
  { time: '09:00', booked: 0 },
  { time: '10:00', booked: 0 },
  { time: '11:00', booked: 0 },
  { time: '12:00', booked: 0 },
  { time: '13:00', booked: 0 },
  { time: '14:00', booked: 0 },
  { time: '15:00', booked: 0 },
  { time: '16:00', booked: 0 },
  { time: '17:00', booked: 0 },
];

export const NewBookingWizardTab: React.FC<NewBookingWizardTabProps> = ({
  patients,
  packageDetails,
  onCreateBooking,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Form State
  const [patientType, setPatientType] = useState<PatientType>('registered');
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const activeSearchIdRef = React.useRef(0);

  // Guest Patient Details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestWilaya, setGuestWilaya] = useState('');
  const [guestCommune, setGuestCommune] = useState('');
  const [guestAge, setGuestAge] = useState<number>(30);

  // Doctor & Slot Selection
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctors, setDoctors] = useState<DoctorSearchItem[]>([]);
  const [doctorPage, setDoctorPage] = useState<number>(1);
  const [doctorLastPage, setDoctorLastPage] = useState<number>(1);
  const [doctorTotal, setDoctorTotal] = useState<number>(0);
  const activeDoctorSearchIdRef = useRef<number>(0);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSearchItem | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isLoadingDoctors, setIsLoadingDoctors] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doctorSelectionError, setDoctorSelectionError] = useState<string | null>(null);

  // Ticket Modal State
  const [createdBookingRef, setCreatedBookingRef] = useState<string | null>(null);
  const [createdBookingToken, setCreatedBookingToken] = useState<string | null>(null);
  const [createdBookingStatus, setCreatedBookingStatus] = useState<string>('pending');
  const [wizardTicketLanguage, setWizardTicketLanguage] = useState<WhatsAppLanguage>('ar');
  const [isDownloadingWizardPng, setIsDownloadingWizardPng] = useState(false);
  const [isOpeningWizardWhatsApp, setIsOpeningWizardWhatsApp] = useState(false);
  const wizardQrSvgRef = React.useRef<SVGSVGElement | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Authoritative Backend Slots State
  const [realSlots, setRealSlots] = useState<Array<{ time: string; booked: number; capacity: number; is_available: boolean; already_booked_by_patient?: boolean }>>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotAvailabilityError, setSlotAvailabilityError] = useState<{ code: string; message: string } | null>(null);

  // Check if given date string is Friday (Weekly Holiday in Algeria)
  const isFridayDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.getDay() === 5; // 5 = Friday
  };

  // Fetch real authoritative available slots from backend when doctor, clinic, or date changes
  useEffect(() => {
    if (!selectedDoctor) return;
    const clinicId = selectedClinicId || selectedDoctor.clinicId || selectedDoctor.clinics?.[0]?.id;
    if (!clinicId) return;

    setSelectedSlot('');
    setSlotAvailabilityError(null);

    // 1. Immediate client-side check for Friday weekly holiday
    if (isFridayDate(selectedDate)) {
      setRealSlots([]);
      setSlotAvailabilityError({
        code: 'WEEKLY_HOLIDAY_FRIDAY',
        message: 'يوم الجمعة عطلة أسبوعية رسمية، ولا تتوفر مواعيد عمل في هذا اليوم.',
      });
      return;
    }

    let isMounted = true;
    setIsLoadingSlots(true);

    const currentPatientPhone = patientType === 'registered' ? selectedPatient?.phone : guestPhone;
    const currentPatientId = patientType === 'registered' ? selectedPatient?.id : undefined;

    appointmentService.getSlots(clinicId, selectedDoctor.id, selectedDate, currentPatientPhone, currentPatientId)
      .then((res: any) => {
        if (!isMounted) return;
        const respData = res.data?.data || res.data || {};
        const slotsData = respData.slots || [];
        const isAvail = respData.is_available !== false;
        const reasonCode = respData.reason_code;
        const reasonMsg = respData.reason_message;

        if (Array.isArray(slotsData) && slotsData.length > 0) {
          const mapped = slotsData.map((s: any) => ({
            time: s.time_slot,
            booked: s.occupied,
            capacity: s.max_capacity,
            is_available: s.is_available,
            already_booked_by_patient: Boolean(s.already_booked_by_patient),
          }));
          setRealSlots(mapped);

          if (!isAvail || reasonMsg) {
            setSlotAvailabilityError({
              code: reasonCode || 'SLOTS_UNAVAILABLE',
              message: reasonMsg || 'لا توجد فترات حجز متاحة في هذا اليوم.',
            });
          } else {
            setSlotAvailabilityError(null);
          }
        } else {
          setRealSlots([]);
          setSlotAvailabilityError({
            code: reasonCode || 'NO_SLOTS',
            message: reasonMsg || 'لا تتوفر فترات حجز متاحة لهذا الطبيب في هذا التاريخ.',
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch slots from backend:', err);
        if (isMounted) {
          setRealSlots([]);
          const backendErr = err?.response?.data?.message || 'تعذر تحميل الفترات المتاحة لهذا التاريخ.';
          setSlotAvailabilityError({
            code: 'FETCH_ERROR',
            message: backendErr,
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDoctor, selectedClinicId, selectedDate, selectedPatient?.phone, selectedPatient?.id, guestPhone, patientType]);

  // Debounced server-side doctor search effect (300ms) with race-condition safety
  useEffect(() => {
    let isMounted = true;
    const currentSearchId = ++activeDoctorSearchIdRef.current;
    setIsLoadingDoctors(true);

    const timer = setTimeout(async () => {
      try {
        const trimmed = doctorQuery.trim();
        const res = await adminService.getDoctors({
          search: trimmed || undefined,
          page: doctorPage,
          per_page: 15,
        });

        if (!isMounted || currentSearchId !== activeDoctorSearchIdRef.current) return;

        if (res.data && Array.isArray(res.data)) {
          const docList: DoctorSearchItem[] = res.data.map((d: AdminDoctorItem) => {
            const docClinics = d.clinics || (d.clinic ? [d.clinic] : []);
            const primaryClinic = docClinics[0];
            const isWorkingHoursActive = docClinics.some((c: any) => c.is_working_hours_activated === true);
            return {
              id: d.id,
              name: d.name,
              specialty: d.specialty || 'طب عام',
              facilityName: primaryClinic?.name || 'العيادة التخصصية',
              wilaya: primaryClinic?.wilaya || d.wilaya || 'الجزائر العاصمة',
              address: (primaryClinic as any)?.address || (primaryClinic?.name ? `${primaryClinic.name} - ${primaryClinic.wilaya || 'الجزائر'}` : 'العيادة المركزية'),
              rating: 4.8,
              maxPatientsPerSlot: 10,
              availableSlots: DEFAULT_SLOTS,
              clinicId: primaryClinic?.id,
              clinics: docClinics,
              is_working_hours_activated: isWorkingHoursActive,
            };
          });
          setDoctors(docList);
          setDoctorLastPage(res.meta?.last_page || 1);
          setDoctorTotal(res.meta?.total || docList.length);
        } else {
          setDoctors([]);
          setDoctorLastPage(1);
          setDoctorTotal(0);
        }
      } catch (err) {
        if (!isMounted || currentSearchId !== activeDoctorSearchIdRef.current) return;
        console.warn('Failed to load doctors in booking wizard:', err);
        setDoctors([]);
      } finally {
        if (isMounted && currentSearchId === activeDoctorSearchIdRef.current) {
          setIsLoadingDoctors(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [doctorQuery, doctorPage]);

  // Debounced server-side search for registered patients (EV-BOOKING-008-B)
  useEffect(() => {
    const trimmed = searchPatientQuery.trim();
    if (trimmed.length < 2) {
      activeSearchIdRef.current++;
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentReqId = ++activeSearchIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await ehrService.getPatients({ search: trimmed });
        if (currentReqId !== activeSearchIdRef.current) return;

        if (res.data && Array.isArray(res.data)) {
          const mapped: PatientRecord[] = res.data.map((p) => {
            let calculatedAge = 35;
            if (p.date_of_birth) {
              const birthYear = new Date(p.date_of_birth).getFullYear();
              if (!isNaN(birthYear)) {
                calculatedAge = Math.max(0, new Date().getFullYear() - birthYear);
              }
            }
            return {
              id: p.id,
              uuid: p.mrn,
              fullName: p.full_name || `${p.first_name} ${p.last_name}`,
              phone: p.phone,
              email: p.email,
              type: 'registered' as const,
              wilaya: p.wilaya || 'غير محدد',
              age: calculatedAge,
              lastVisitDate: new Date().toISOString().split('T')[0],
              totalBookings: 1,
            };
          });
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        if (currentReqId !== activeSearchIdRef.current) return;
        console.warn('Failed to search patients:', err);
        setSearchError(err?.message || 'حدث خطأ أثناء البحث عن المريض');
        setSearchResults([]);
      } finally {
        if (currentReqId === activeSearchIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchPatientQuery]);

  const handleSelectPatient = (p: PatientRecord) => {
    setSelectedPatient(p);
  };

  const handleNextToStep2 = () => {
    if (patientType === 'registered' && !selectedPatient) {
      alert('يرجى اختيار مريض مسجل من القائمة أولاً');
      return;
    }
    if (patientType === 'guest') {
      if (!guestName.trim() || !guestPhone.trim()) {
        alert('يرجى كتابة الاسم الكامل ورقم الهاتف للمريض الزائر');
        return;
      }
    }
    setCurrentStep(2);
  };

  const handleNextToStep3 = (doc: DoctorSearchItem) => {
    const hasActiveSchedule = doc.is_working_hours_activated === true || (doc.clinics && doc.clinics.some(c => c.is_working_hours_activated === true));
    if (!hasActiveSchedule) {
      setDoctorSelectionError(`لا يمكن المواصلة مع د. ${doc.name}: ساعات العمل الأسبوعية للطبيب غير مفعّلة في العيادة. يرجى تفعيل ساعات العمل أو اختيار طبيب آخر.`);
      return;
    }

    setDoctorSelectionError(null);
    setSelectedDoctor(doc);
    const eligibleClinics = doc.clinics || [];
    if (eligibleClinics.length === 1) {
      setSelectedClinicId(eligibleClinics[0].id);
    } else {
      setSelectedClinicId('');
    }
    setCurrentStep(3);
  };

  const handleNextToStep4 = () => {
    if (selectedDoctor && selectedDoctor.clinics && selectedDoctor.clinics.length > 1 && !selectedClinicId) {
      alert('يرجى اختيار العيادة المعتمدة المحددة للمريض أولاً');
      return;
    }
    if (slotAvailabilityError) {
      alert(`لا يمكن المواصلة: ${slotAvailabilityError.message}`);
      return;
    }
    if (!selectedSlot) {
      alert('يرجى اختيار توقيت الموعد المتاح');
      return;
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    const targetClinicId = selectedClinicId || selectedDoctor.clinicId || selectedDoctor.clinics?.[0]?.id;
    if (!targetClinicId) {
      setSubmitError('الطبيب المحدد غير مرتبط بأي عيادة حالياً.');
      return;
    }

    const patientNameFinal =
      patientType === 'registered' ? selectedPatient!.fullName : guestName;
    const patientPhoneFinal =
      patientType === 'registered' ? selectedPatient!.phone : guestPhone;
    const patientIdFinal =
      patientType === 'registered' ? selectedPatient!.id : undefined;
    const patientMrnFinal =
      patientType === 'registered' ? selectedPatient?.uuid : undefined;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await appointmentService.createAppointment({
        clinic_id: targetClinicId,
        doctor_id: selectedDoctor.id,
        patient_name: patientNameFinal,
        patient_phone: patientPhoneFinal,
        patient_id: patientIdFinal,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        notes: `حجز تم إنشاؤه عبر مركز الحجز`
      });

      const createdApp = res.data;
      if (!createdApp || !createdApp.booking_reference) {
        throw new Error('لم يتم استلام مرجع الحجز من الخادم');
      }

      const activeClinic = selectedDoctor.clinics?.find((c) => c.id === targetClinicId);
      const realRecord: BookingRecord = {
        id: createdApp.id,
        refNumber: createdApp.booking_reference,
        patientId: patientIdFinal || `guest-${Date.now()}`,
        patientName: patientNameFinal,
        patientPhone: patientPhoneFinal,
        patientType: patientType,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        facilityName: activeClinic?.name || selectedDoctor.facilityName,
        wilaya: activeClinic?.wilaya || selectedDoctor.wilaya,
        date: selectedDate,
        timeSlot: selectedSlot,
        status: (createdApp.status === 'confirmed' ? 'approved' : createdApp.status) as any,
        notes: createdApp.notes,
        createdAt: (createdApp as any).created_at || new Date().toISOString().split('T')[0],
        createdBy: 'مركز الحجز',
        secureToken: createdApp.secure_token,
      };

      onCreateBooking(realRecord);
      setCreatedBookingRef(createdApp.booking_reference);
      setCreatedBookingToken(createdApp.secure_token || null);
      setCreatedBookingStatus(createdApp.status || 'pending');
      setShowTicketModal(true);
    } catch (err: any) {
      console.warn('Backend appointment create error:', err);
      const errMsg =
        err?.data?.message ||
        (err?.data?.errors ? Object.values(err.data.errors).flat().join(' ') : null) ||
        err?.response?.data?.message ||
        (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null) ||
        err?.message ||
        'فشل إنشاء الحجز في الخادم. يرجى التحقق من توفر الفترة والسعة.';
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">معالج إنشاء حجز جديد (New Booking Wizard)</h2>
          <p className="text-xs text-slate-500 mt-1">
            إدخال وتنسيق المواعيد المباشرة بأقل عدد من النقرات (خصم 1 عملية من رصيد الباقة عند النجاح)
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          الرصيد المتاح: {packageDetails.remainingQuota} عملية
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
          <div
            className={`py-2 rounded-xl transition-all ${
              currentStep === 0 ? 'bg-blue-600 text-white shadow-sm' : currentStep > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            0. نوع المريض
          </div>
          <div
            className={`py-2 rounded-xl transition-all ${
              currentStep === 1 ? 'bg-blue-600 text-white shadow-sm' : currentStep > 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            1. بيانات المريض
          </div>
          <div
            className={`py-2 rounded-xl transition-all ${
              currentStep === 2 ? 'bg-blue-600 text-white shadow-sm' : currentStep > 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            2. اختيار الطبيب
          </div>
          <div
            className={`py-2 rounded-xl transition-all ${
              currentStep === 3 ? 'bg-blue-600 text-white shadow-sm' : currentStep > 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            3. الموعد والتوقيت
          </div>
          <div
            className={`py-2 rounded-xl transition-all ${
              currentStep === 4 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
            }`}
          >
            4. المراجعة والتأكيد
          </div>
        </div>
      </div>

      {/* STEP 0: Select Patient Type */}
      {currentStep === 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base">حدد صفة المريض الراغب في الحجز:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setPatientType('registered');
                setCurrentStep(1);
              }}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-3 ${
                patientType === 'registered'
                  ? 'border-blue-600 bg-blue-50/50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">مريض مسجل (Registered Patient)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                يمتلك المريض ملفاً موحداً (UUID) في منصة عافية. يتم البحث برقم الهاتف، الإيميل، أو المعرف.
              </p>
              <span className="mt-2 text-xs font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                اختيار هذا المريض ←
              </span>
            </div>

            <div
              onClick={() => {
                setPatientType('guest');
                setCurrentStep(1);
              }}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-3 ${
                patientType === 'guest'
                  ? 'border-blue-600 bg-blue-50/50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <UserPlus className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">مريض زائر (Guest Patient)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                مريض مؤقت أو غير مسجل بالمنصة. يتم تسجيل بياناته الأساسية (الاسم ورقم الهاتف) لإنشاء حجز فوري.
              </p>
              <span className="mt-2 text-xs font-bold text-amber-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                تسجيل زائر جديد ←
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Patient Information */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">
              {patientType === 'registered' ? 'البحث عن مريض مسجل' : 'إدخال بيانات المريض الزائر'}
            </h3>
            <button
              onClick={() => setCurrentStep(0)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              تغيير نوع المريض
            </button>
          </div>

          {patientType === 'registered' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchPatientQuery}
                  onChange={(e) => setSearchPatientQuery(e.target.value)}
                  placeholder="ابحث بالاسم الكامل، رقم الهاتف، أو المعرف UUID..."
                  className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Patient Search Results or States */}
              {searchPatientQuery.trim().length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">اكتب اسم المريض أو رقم الهاتف أو MRN للبحث</p>
                  <p className="text-[11px] text-slate-400 mt-1">يجب إدخال حرفين على الأقل للبحث في سجلات المرضى بالمنصة</p>
                </div>
              ) : isSearching ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">جارٍ البحث في سجلات المرضى...</p>
                </div>
              ) : searchError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{searchError}</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">لا يوجد مرضى مطابقون لبيانات البحث</p>
                  <p className="text-[11px] text-slate-400 mt-1">تأكد من كتابة الاسم، رقم الهاتف، أو رقم الملف الطبي (MRN) بشكل صحيح</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedPatient?.id === p.id
                          ? 'border-blue-600 bg-blue-50/60'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{p.fullName}</span>
                          {p.uuid && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px]">
                              {p.uuid}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          الهاتف: {p.phone} • الولاية: {p.wilaya || 'غير محدد'} • العمر: {p.age || '--'} سنة
                        </p>
                      </div>

                      {selectedPatient?.id === p.id && (
                        <div className="p-1.5 bg-blue-600 text-white rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={handleNextToStep2}
                  disabled={!selectedPatient}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  متابعة إلى اختيار الطبيب ←
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم الكامل للمريض الزائر *
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="مثال: كريم بن زاف"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الهاتف للتواصل *
                  </label>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="0550112233"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
                  />
                </div>

                <div>
                  <WilayaSelect
                    label="الولاية"
                    value={guestWilaya}
                    onChange={(code) => {
                      setGuestWilaya(code);
                      setGuestCommune('');
                    }}
                  />
                </div>

                <div>
                  <CommuneSelect
                    label="البلدية"
                    wilayaCode={guestWilaya}
                    value={guestCommune}
                    onChange={setGuestCommune}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    العمر (تقديري)
                  </label>
                  <input
                    type="number"
                    value={guestAge}
                    onChange={(e) => setGuestAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={handleNextToStep2}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 cursor-pointer"
                >
                  متابعة إلى اختيار الطبيب ←
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Doctor & Provider Selection */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">اختر الطبيب أو المركز الطبي المطلوب:</h3>
            <button
              onClick={() => {
                setDoctorSelectionError(null);
                setCurrentStep(1);
              }}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              رجوع لبيانات المريض
            </button>
          </div>

          {doctorSelectionError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="flex-1">
                <p>{doctorSelectionError}</p>
                <p className="text-[11px] text-rose-600 font-normal mt-0.5">يجب أن تكون ساعات عمل الطبيب مفعلة في العيادة لتتمكن من حجز موعد معه.</p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={doctorQuery}
              onChange={(e) => {
                setDoctorQuery(e.target.value);
                setDoctorPage(1);
                setDoctorSelectionError(null);
              }}
              placeholder="ابحث باسم الطبيب، التخصص (مثال: قلب، عظام)، المدينة أو اسم العيادة..."
              className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLoadingDoctors ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Stethoscope className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="font-bold text-slate-700">جاري البحث في سبر الأطباء والمؤسسات الصحيات...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">لا يوجد أطباء مسجلون حالياً يطابقون البحث</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => {
                  const isScheduleActive = doc.is_working_hours_activated === true || (doc.clinics && doc.clinics.some(c => c.is_working_hours_activated === true));

                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-2xl border transition-all bg-white flex flex-col justify-between ${
                        isScheduleActive
                          ? 'border-slate-200 hover:border-blue-500 hover:shadow-md'
                          : 'border-slate-200 bg-slate-50/50 opacity-90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{doc.name}</h4>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{doc.specialty}</p>
                          </div>
                          <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                            ★ {doc.rating}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-500 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.facilityName}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.address}</span>
                          </p>
                        </div>

                        <div className="mt-3">
                          {isScheduleActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ساعات العمل: مفعّلة ✓</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>ساعات العمل: غير مفعّلة ✕</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleNextToStep3(doc)}
                        className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          isScheduleActive
                            ? 'bg-slate-900 hover:bg-blue-600 text-white shadow-xs'
                            : 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {isScheduleActive ? 'اختيار الطبيب والموعد ←' : 'لا يمكن الحجز (ساعات العمل غير مفعلة)'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {doctorLastPage > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                  <div>
                    إجمالي نتائج البحث: <span className="font-bold text-slate-900">{doctorTotal}</span> (صفحة {doctorPage} من {doctorLastPage})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={doctorPage <= 1 || isLoadingDoctors}
                      onClick={() => setDoctorPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      ← الصفحة السابقة
                    </button>
                    <button
                      type="button"
                      disabled={doctorPage >= doctorLastPage || isLoadingDoctors}
                      onClick={() => setDoctorPage((p) => Math.min(doctorLastPage, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      الصفحة التالية →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 3: Date & Slot Selection */}
      {currentStep === 3 && selectedDoctor && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">حدد التاريخ وتوقيت الموعد المتاح:</h3>
              <p className="text-xs text-slate-500">الطبيب المحدد: {selectedDoctor.name} ({selectedDoctor.specialty})</p>
            </div>
            <button
              onClick={() => {
                setSelectedDoctor(null);
                setSelectedClinicId('');
                setCurrentStep(2);
              }}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              تغيير الطبيب
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinic Picker if multiple clinics exist */}
            {selectedDoctor.clinics && selectedDoctor.clinics.length > 1 && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  اختر العيادة المعتمدة المحددة للمريض <span className="text-rose-500">* (اختيار إلزامي لـ {selectedDoctor.clinics.length} عيادات)</span>:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDoctor.clinics.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedClinicId(c.id)}
                      className={`p-3 rounded-xl border text-right text-xs transition-all cursor-pointer ${
                        selectedClinicId === c.id
                          ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{c.name}</span>
                        {selectedClinicId === c.id && <span className="text-blue-600 font-bold">✓ محددة</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{c.wilaya} {c.address ? `- ${c.address}` : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">تاريخ الموعد:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Slot Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700">الأوقات المتاحة لدى العيادة:</label>
                {isLoadingSlots && <span className="text-[10px] text-blue-600 font-medium animate-pulse">جارٍ التحقق من المواعيد والسعة...</span>}
              </div>

              {isLoadingSlots ? (
                <div className="py-8 text-center text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-xs">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">جارٍ تحميل المواعيد المتاحة لهذا اليوم...</p>
                </div>
              ) : slotAvailabilityError ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="font-bold text-sm">لا يمكن حجز موعد في هذا التاريخ</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    {slotAvailabilityError.message}
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg font-semibold inline-block">
                      💡 يرجى اختيار تاريخ آخر أو تغيير الطبيب للمتابعة.
                    </span>
                  </div>
                </div>
              ) : realSlots.length === 0 ? (
                <div className="py-8 text-center text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-xs">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">لا توجد فترات عمل متاحة لهذا اليوم</p>
                  <p className="text-[11px] text-slate-400 mt-1">اختر تاريخاً آخر للبحث عن فترات شاغرة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Warning banner if patient has an active booking on this date */}
                  {(() => {
                    const existingBookedSlot = realSlots.find((s) => s.already_booked_by_patient);
                    if (!existingBookedSlot) return null;
                    return (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <strong className="block font-bold text-amber-950">تنبيه: المريض لديه حجز نشط بالفعل في هذا اليوم</strong>
                          <p className="mt-0.5 text-amber-800 leading-relaxed">
                            يوجد موعد معتمد للمريض في تمام الساعة <span className="font-bold font-mono text-amber-950 px-1 bg-amber-100/70 rounded">{existingBookedSlot.time}</span> مع هذا الطبيب. تم تعطيل تلك الفترة تلقائياً لمنع التكرار، يرجى اختيار فترة زمنية أخرى.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {realSlots.map((slotObj) => {
                      const isAlreadyBooked = slotObj.already_booked_by_patient === true;
                      const isFull = !slotObj.is_available || slotObj.booked >= slotObj.capacity;
                      const isDisabled = isFull || isAlreadyBooked;
                      const isActive = selectedSlot === slotObj.time;
                      
                      return (
                        <button
                          type="button"
                          key={slotObj.time}
                          disabled={isDisabled}
                          onClick={() => setSelectedSlot(slotObj.time)}
                          className={`p-3 rounded-xl border text-center font-bold text-sm transition-all relative flex flex-col items-center justify-center gap-1 ${
                            isAlreadyBooked
                              ? 'bg-rose-50/70 border-rose-200 text-rose-500 cursor-not-allowed opacity-90'
                              : isFull
                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              : isActive
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs cursor-pointer'
                              : 'border-slate-200 hover:border-blue-400 bg-white text-slate-800 cursor-pointer'
                          }`}
                        >
                          <span>{slotObj.time}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                            isAlreadyBooked
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 font-bold'
                              : isFull 
                              ? 'bg-slate-200 text-slate-500' 
                              : isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {isAlreadyBooked ? '🚫 محجوز للمريض' : isFull ? 'مكتمل' : `${slotObj.booked} / ${slotObj.capacity}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
            >
              السابق
            </button>
            <button
              onClick={handleNextToStep4}
              disabled={!selectedSlot || !!slotAvailabilityError || realSlots.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              مراجعة بيانات الحجز النهائي ←
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Final Confirmation */}
      {currentStep === 4 && selectedDoctor && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base">مراجعة وتأكيد إرسال طلب الحجز النهائي:</h3>

          {submitError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <strong className="block font-bold">تعذر إتمام الحجز:</strong>
                  <span>{submitError}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot('');
                  setCurrentStep(3);
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                تغيير الموعد أو التوقيت ←
              </button>
            </div>
          )}

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">اسم المريض:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {patientType === 'registered' ? selectedPatient?.fullName : guestName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">رقم الهاتف:</span>
                <span className="font-bold text-slate-900 text-sm dir-ltr text-right">
                  {patientType === 'registered' ? selectedPatient?.phone : guestPhone}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">الطبيب المعالج:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedDoctor.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">التخصص والعيادة:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedDoctor.specialty} • {selectedDoctor.clinics?.find((c) => c.id === (selectedClinicId || selectedDoctor.clinicId))?.name || selectedDoctor.facilityName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">تاريخ وتوقيت الموعد:</span>
                <span className="font-bold text-blue-600 text-sm">{selectedDate} في تمام {selectedSlot}</span>
              </div>
              <div>
                <span className="text-slate-400 block">حالة الحجز المبدئية:</span>
                <span className="font-bold text-amber-700 text-sm">بانتظار اعتماد الطبيب (Pending Approval)</span>
              </div>
            </div>
          </div>

          {/* Quota Deduction Notice */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block mb-0.5">تنبيه خصم الرصيد (Quota Deduction Notice):</span>
              سيتم خصم <span className="font-bold text-amber-900">1 عملية</span> فوراً من رصيد الباقة الحالي (المتبقي: {packageDetails.remainingQuota} عملية). في حال رفض الطبيب للموعد، يُعاد الرصيد فوراً للحساب تلقائياً.
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              تعديل الموعد
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ الحفظ في الخادم...</span>
                </>
              ) : (
                <span>✓ تأكيد وإرسال طلب الحجز النهائي</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Ticket Confirmation Modal */}
      {showTicketModal && createdBookingRef && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 text-right animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">تم إنشاء الحجز بنجاح!</h3>
              <p className="text-xs text-slate-500 mt-1">
                رقم المرجع الموحد: <span className="font-mono font-bold text-blue-600 text-base">{createdBookingRef}</span>
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <p><span className="text-slate-400">المريض:</span> <strong className="text-slate-900">{patientType === 'registered' ? selectedPatient?.fullName : guestName}</strong></p>
              <p><span className="text-slate-400">الطبيب:</span> <strong className="text-slate-900">{selectedDoctor?.name}</strong></p>
              <p><span className="text-slate-400">الموعد:</span> <strong className="text-blue-600">{selectedDate} - {selectedSlot}</strong></p>
              <p><span className="text-slate-400">الحالة:</span> <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">بانتظار اعتماد الطبيب</span></p>
            </div>

            {/* Visual QR Code Voucher Pass (Unified Check-In Pass) */}
            {(() => {
              const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://aafiya.site';
              const rawToken = createdBookingToken?.trim() || '';
              const isValidToken = /^[A-Za-z0-9]{64}$/.test(rawToken);
              const qrPassUrl = isValidToken ? `${origin}/ar/appointment/pass/${rawToken}` : '';

              const pName = patientType === 'registered' ? (selectedPatient?.fullName || 'المريض') : (guestName || 'المريض');
              const pPhone = patientType === 'registered' ? (selectedPatient?.phone || '') : guestPhone;
              const docName = selectedDoctor?.name || 'الطبيب';
              const docSpec = selectedDoctor?.specialty || '';
              const clinName = selectedDoctor?.facilityName || 'مركز الحجز';

              const ticketData: AppointmentTicketData = {
                patientName: pName,
                patientPhone: pPhone,
                doctorName: docName,
                specialty: docSpec,
                clinicName: clinName,
                date: selectedDate,
                timeSlot: selectedSlot,
                refNumber: createdBookingRef,
                ticketUrl: qrPassUrl,
                status: createdBookingStatus,
              };

              return (
                <div className="space-y-3.5">
                  {isValidToken ? (
                    <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
                      <div 
                        ref={(node) => {
                          if (node) {
                            const svg = node.querySelector('svg');
                            if (svg) wizardQrSvgRef.current = svg;
                          }
                        }}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center"
                      >
                        <QRCode
                          value={qrPassUrl}
                          size={96}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox="0 0 256 256"
                        />
                      </div>
                      <div className="space-y-1 text-center sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">رمز الحضور السريع (QR Check-In Pass)</span>
                        <p className="font-mono text-xs font-black text-blue-600 dir-ltr text-right">
                          {createdBookingRef}
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          نظام المسح المعتمد: متوافق كلياً مع كاميرا الماسح لمساعد الطبيب وقارئ الباركود لتسجيل الحضور وتأكيد الموعد فوراً.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">تنبيه أمني: الرمز السري الآمن للموعد (secure_token) غير متوفر أو غير مطابق للصيغة المعتمدة.</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          تم منع إنشاء رمز QR للموعد لعدم توفر الرمز الأمني المشفر المكون من 64 محرفاً.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Language Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">لغة رسالة WhatsApp المصاحبة:</span>
                      <span className="text-[10px] text-slate-400">تحدد لغة الرسالة الموجهة للمريض</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setWizardTicketLanguage('ar')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${wizardTicketLanguage === 'ar' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        العربية (افتراضي)
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardTicketLanguage('fr')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${wizardTicketLanguage === 'fr' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Français
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardTicketLanguage('en')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${wizardTicketLanguage === 'en' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Download PNG Button */}
                  <button
                    type="button"
                    disabled={isDownloadingWizardPng}
                    onClick={async () => {
                      try {
                        setIsDownloadingWizardPng(true);
                        await downloadAppointmentCardPng(ticketData, wizardQrSvgRef.current);
                      } catch (err) {
                        console.error('Failed to download PNG ticket:', err);
                      } finally {
                        setIsDownloadingWizardPng(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isDownloadingWizardPng ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري إنشاء وتنزيل بطاقة PNG...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>تنزيل بطاقة الموعد PNG</span>
                      </>
                    )}
                  </button>

                  {/* WhatsApp and Print */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isOpeningWizardWhatsApp}
                      onClick={() => {
                        setIsOpeningWizardWhatsApp(true);
                        openWhatsAppAppointmentShare(ticketData, wizardTicketLanguage);
                        setTimeout(() => setIsOpeningWizardWhatsApp(false), 2000);
                      }}
                      className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{isOpeningWizardWhatsApp ? 'جاري الفتح...' : 'فتح WhatsApp للمشاركة اليدوية'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>طباعة التذكرة</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => {
                setShowTicketModal(false);
                onCancel();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
            >
              إغلاق والعودة للوحة القيادة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
