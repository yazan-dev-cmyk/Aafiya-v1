'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Stethoscope,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
  Building2,
  Users,
  Search,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { clinicService, ClinicDoctorStaff } from '@/services/clinicService';
import { appointmentService } from '@/services/appointmentService';
import { ehrService, PatientRecord } from '@/services/ehrService';

interface SlotItem {
  time_slot: string;
  max_capacity: number;
  occupied: number;
  available: number;
  is_available: boolean;
  already_booked_by_patient?: boolean;
}

interface AssistantBookingWizardProps {
  clinicId: string;
  onSuccess: (appointment: any) => void;
  onCancel: () => void;
}

export const AssistantBookingWizard: React.FC<AssistantBookingWizardProps> = ({
  clinicId,
  onSuccess,
  onCancel,
}) => {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // Step management: 1: Patient, 2: Doctor, 3: Date & Slot, 4: Review & Confirm
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Clinic doctors state
  const [clinicName, setClinicName] = useState<string>('');
  const [doctors, setDoctors] = useState<ClinicDoctorStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // Form selections
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorSelectionError, setDoctorSelectionError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Slots state
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const activeSlotsRequestIdRef = useRef<number>(0);
  const prevDoctorIdRef = useRef<string>(selectedDoctorId);
  const prevDateRef = useRef<string>(selectedDate);

  // Patient mode: 'registered' (search platform-wide) vs 'walkin' (unregistered walk-in)
  const [patientMode, setPatientMode] = useState<'registered' | 'walkin'>('registered');

  // Registered patient search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Patient details state
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientMrn, setPatientMrn] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if given date string is Friday (Weekly Holiday)
  const isFridayDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.getDay() === 5; // 5 = Friday
  };

  // 1. Fetch clinic doctors on mount or clinicId change
  useEffect(() => {
    if (!clinicId) return;

    let isMounted = true;
    const fetchClinicDoctors = async () => {
      setLoadingDoctors(true);
      setDoctorsError(null);
      try {
        const response = await clinicService.getClinic(clinicId);
        if (!isMounted) return;

        const details = response.data;
        setClinicName(details.name);

        const activeDocs = (details.doctors || []).filter(
          (d) => d.is_active !== false
        );
        setDoctors(activeDocs);

        // Pre-select first doctor if active working hours
        if (activeDocs.length > 0 && !selectedDoctorId) {
          const firstWithSchedule = activeDocs.find((d) => d.is_working_hours_activated === true) || activeDocs[0];
          setSelectedDoctorId(firstWithSchedule.id);
          if (firstWithSchedule.is_working_hours_activated !== true) {
            setDoctorSelectionError(
              isRtl
                ? `لا يمكن المواصلة مع د. ${firstWithSchedule.name}: ساعات العمل الأسبوعية للطبيب غير مفعّلة في العيادة. يرجى تفعيل ساعات العمل أو اختيار طبيب آخر.`
                : `Doctor ${firstWithSchedule.name} does not have active working hours.`
            );
          } else {
            setDoctorSelectionError(null);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to fetch clinic doctors:', err);
        setDoctorsError(
          err?.message ||
            (isRtl
              ? 'فشل في تحميل قائمة أطباء العيادة.'
              : 'Failed to load clinic doctors.')
        );
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    };

    fetchClinicDoctors();
    return () => {
      isMounted = false;
    };
  }, [clinicId, isRtl]);

  // 2. Fetch authoritative slots whenever doctor, date, or patient changes (strictly when step is 3)
  const fetchSlots = useCallback(async () => {
    if (!clinicId || !selectedDoctorId || !selectedDate) {
      setSlots([]);
      setSlotsError(null);
      return;
    }

    setSlotsError(null);

    // 1. Friday check
    if (isFridayDate(selectedDate)) {
      setSlots([]);
      setSelectedTimeSlot('');
      setSlotsError(
        isRtl
          ? 'يوم الجمعة عطلة أسبوعية رسمية، ولا تتوفر مواعيد عمل في هذا اليوم.'
          : 'Friday is an official weekly holiday. No appointments available.'
      );
      return;
    }

    const currentReqId = ++activeSlotsRequestIdRef.current;
    setLoadingSlots(true);

    const currentPatientPhone = patientMode === 'registered' ? selectedPatient?.phone : patientPhone;
    const currentPatientId = patientMode === 'registered' ? selectedPatient?.id : undefined;

    try {
      const response = await appointmentService.getSlots(
        clinicId,
        selectedDoctorId,
        selectedDate,
        currentPatientPhone,
        currentPatientId
      );

      // Stale response guard: discard if doctor, date, or patient changed in the meantime
      if (currentReqId !== activeSlotsRequestIdRef.current) return;

      const respData = response.data?.data || response.data || {};
      const slotData: SlotItem[] = respData.slots || [];
      const reasonMsg = respData.reason_message;
      const isAvail = respData.is_available !== false;

      if (Array.isArray(slotData) && slotData.length > 0) {
        setSlots(slotData);

        // Preserve selectedTimeSlot if it still exists and is genuinely available; otherwise reset it
        setSelectedTimeSlot((currentSelected) => {
          if (!currentSelected) return '';
          const matchingSlot = slotData.find((s) => s.time_slot === currentSelected);
          if (matchingSlot && matchingSlot.is_available && matchingSlot.available > 0 && !matchingSlot.already_booked_by_patient) {
            return currentSelected; // Keep selection intact!
          }
          return ''; // Reset if slot became unavailable, booked up, or was booked by this patient
        });

        if (!isAvail || reasonMsg) {
          setSlotsError(reasonMsg || (isRtl ? 'لا توجد فترات حجز متاحة في هذا اليوم.' : 'No available slots on this day.'));
        } else {
          setSlotsError(null);
        }
      } else {
        setSlots([]);
        setSelectedTimeSlot('');
        setSlotsError(
          reasonMsg ||
            (isRtl
              ? 'لا تتوفر فترات حجز متاحة لهذا الطبيب في هذا التاريخ.'
              : 'No booking slots available for this doctor on this date.')
        );
      }
    } catch (err: any) {
      if (currentReqId !== activeSlotsRequestIdRef.current) return;
      console.warn('Failed to fetch slots:', err);
      setSlotsError(
        err?.data?.message ||
          err?.response?.data?.message ||
          err?.message ||
          (isRtl
            ? 'تعذر تحميل المواعيد المتاحة لهذا اليوم.'
            : 'Failed to load available slots for this date.')
      );
      setSlots([]);
      setSelectedTimeSlot('');
    } finally {
      if (currentReqId === activeSlotsRequestIdRef.current) {
        setLoadingSlots(false);
      }
    }
  }, [clinicId, selectedDoctorId, selectedDate, selectedPatient?.phone, selectedPatient?.id, patientPhone, patientMode, isRtl]);

  // Trigger fetchSlots strictly when user is on Step 3 (Date & Slot selection)
  useEffect(() => {
    if (step === 3) {
      // Check if doctor or date actually changed from previous fetch
      const docChanged = prevDoctorIdRef.current !== selectedDoctorId;
      const dateChanged = prevDateRef.current !== selectedDate;

      if (docChanged || dateChanged) {
        setSelectedTimeSlot('');
        prevDoctorIdRef.current = selectedDoctorId;
        prevDateRef.current = selectedDate;
      }

      fetchSlots();
    }
  }, [clinicId, selectedDoctorId, selectedDate, step, fetchSlots]);

  // 3. Debounced platform-wide patient search for registered patients
  useEffect(() => {
    if (patientMode !== 'registered' || selectedPatient) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let isCurrent = true;
    setSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await ehrService.getPatients({ search: trimmed });
        if (!isCurrent) return;
        setSearchResults(res.data || []);
      } catch (err: any) {
        if (!isCurrent) return;
        console.error('Failed to search patients:', err);
        setSearchError(
          err?.message ||
            (isRtl
              ? 'تعذر البحث عن المرضى المسجلين.'
              : 'Failed to search registered patients.')
        );
        setSearchResults([]);
      } finally {
        if (isCurrent) setSearching(false);
      }
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery, patientMode, selectedPatient, isRtl]);

  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    const fullName =
      patient.full_name || `${patient.first_name} ${patient.last_name}`.trim();
    setPatientName(fullName);
    setPatientPhone(patient.phone || '');
    setPatientMrn(patient.mrn || '');
    setSubmitError(null);
  };

  const handleClearSelectedPatient = () => {
    setSelectedPatient(null);
    setPatientName('');
    setPatientPhone('');
    setPatientMrn('');
  };

  const handleSwitchMode = (mode: 'registered' | 'walkin') => {
    setPatientMode(mode);
    setSubmitError(null);
    if (mode === 'walkin') {
      setSelectedPatient(null);
    } else {
      if (selectedPatient) {
        const fullName =
          selectedPatient.full_name ||
          `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim();
        setPatientName(fullName);
        setPatientPhone(selectedPatient.phone || '');
        setPatientMrn(selectedPatient.mrn || '');
      } else {
        setPatientName('');
        setPatientPhone('');
        setPatientMrn('');
      }
    }
  };

  // Step 1 -> Step 2 validation
  const handleProceedToDoctor = () => {
    if (patientMode === 'registered' && !selectedPatient) {
      alert(isRtl ? 'يرجى اختيار مريض مسجل من القائمة أولاً' : 'Please select a registered patient first');
      return;
    }
    if (patientMode === 'walkin') {
      if (!patientName.trim() || !patientPhone.trim()) {
        alert(isRtl ? 'يرجى كتابة اسم ورقم هاتف المريض الزائر' : 'Please enter patient name and phone number');
        return;
      }
    }
    setStep(2);
  };

  // Step 2: Doctor selection handler with working hours guard
  const handleSelectDoctor = (doctor: ClinicDoctorStaff) => {
    setSelectedDoctorId(doctor.id);
    setSelectedTimeSlot('');

    if (doctor.is_working_hours_activated !== true) {
      setDoctorSelectionError(
        isRtl
          ? `لا يمكن المواصلة مع د. ${doctor.name}: ساعات العمل الأسبوعية للطبيب غير مفعّلة في العيادة. يرجى تفعيل ساعات العمل أو اختيار طبيب آخر.`
          : `Cannot proceed with Dr. ${doctor.name}: working hours are not activated in this clinic.`
      );
    } else {
      setDoctorSelectionError(null);
    }
  };

  // Step 2 -> Step 3 validation
  const handleProceedToDateAndSlot = () => {
    const doc = doctors.find((d) => d.id === selectedDoctorId);
    if (!doc) {
      alert(isRtl ? 'يرجى اختيار الطبيب المعالج' : 'Please select a doctor');
      return;
    }
    if (doc.is_working_hours_activated !== true) {
      setDoctorSelectionError(
        isRtl
          ? `لا يمكن المواصلة مع د. ${doc.name}: ساعات العمل الأسبوعية للطبيب غير مفعّلة في العيادة. يرجى تفعيل ساعات العمل أو اختيار طبيب آخر.`
          : `Doctor ${doc.name} does not have active working hours.`
      );
      return;
    }
    setDoctorSelectionError(null);
    setStep(3);
  };

  // Step 3 -> Step 4 validation: verify slot exists and is available
  const handleProceedToReview = () => {
    if (!selectedTimeSlot) {
      alert(isRtl ? 'يرجى اختيار الفترة الزمنية المطلوبة' : 'Please select a time slot');
      return;
    }

    const chosenSlot = slots.find((s) => s.time_slot === selectedTimeSlot);
    if (!chosenSlot || !chosenSlot.is_available || (chosenSlot.available ?? 0) <= 0 || chosenSlot.already_booked_by_patient) {
      alert(
        isRtl
          ? 'الفترة الزمنية المختارة لم تعد متاحة حالياً. يرجى اختيار فترة زمنية أخرى.'
          : 'Selected time slot is no longer available. Please select another slot.'
      );
      setSelectedTimeSlot('');
      return;
    }

    if (slotsError) {
      alert(slotsError);
      return;
    }
    setStep(4);
  };

  // Step 4: Final Submit with robust validation and error handling
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctorId || !selectedDate || !selectedTimeSlot) {
      setSubmitError(isRtl ? 'بيانات الموعد غير مكتملة' : 'Appointment details incomplete');
      return;
    }

    if (!clinicId) {
      setSubmitError(isRtl ? 'تعذر تحديد معرف العيادة. يرجى تحديث الصفحة والمحاولة مجدداً.' : 'Clinic identifier missing.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        clinic_id: clinicId,
        doctor_id: selectedDoctorId,
        appointment_date: selectedDate,
        time_slot: selectedTimeSlot,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        ...(selectedPatient?.id ? { patient_id: selectedPatient.id } : {}),
        ...(patientMrn.trim() ? { patient_mrn: patientMrn.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const res = await appointmentService.createAppointment(payload);
      onSuccess(res.data);
    } catch (err: any) {
      console.warn('Failed to create appointment in assistant wizard:', err);
      const errMsg =
        err?.data?.message ||
        (err?.data?.errors ? Object.values(err.data.errors).flat().join(' ') : null) ||
        err?.response?.data?.message ||
        (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null) ||
        err?.message ||
        (isRtl
          ? 'تعذر إنشاء الحجز. يرجى التحقق من توفر السعة.'
          : 'Failed to create booking. Please check capacity.');
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 relative max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? 'حجز موعد حضوري في العيادة' : 'New In-Clinic Booking'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {clinicName
              ? (isRtl ? `العيادة: ${clinicName}` : `Clinic: ${clinicName}`)
              : (isRtl ? 'حجز موعد جديد في العيادة المصرح بها' : 'New appointment for the authorized clinic')}
          </p>
        </div>

        {/* 4-Steps Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { num: 1, label: isRtl ? 'المريض' : 'Patient' },
            { num: 2, label: isRtl ? 'الطبيب' : 'Doctor' },
            { num: 3, label: isRtl ? 'الموعد' : 'Date' },
            { num: 4, label: isRtl ? 'التأكيد' : 'Confirm' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <span
                  className={`w-3 sm:w-6 h-0.5 ${
                    step >= s.num ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
              <div className="flex flex-col items-center">
                <span
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20 ring-2 ring-teal-600/30'
                      : step > s.num
                      ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="hidden sm:block text-[10px] font-semibold text-slate-500 mt-1">
                  {s.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: Patient Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isRtl ? '1. حدد بيانات المريض:' : '1. Select Patient Information:'}
            </h3>
          </div>

          {/* Mode Selector: Registered Patient vs Walk-in */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
            <button
              type="button"
              onClick={() => handleSwitchMode('registered')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                patientMode === 'registered'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isRtl ? 'مريض مسجل بالمنصة' : 'Registered Patient'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('walkin')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                patientMode === 'walkin'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRtl ? 'مريض مباشر (Walk-in)' : 'Walk-in (Unregistered)'}</span>
            </button>
          </div>

          {patientMode === 'registered' ? (
            <div className="space-y-4">
              {selectedPatient ? (
                /* Selected Registered Patient Card */
                <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-900/20 border-2 border-teal-500/30 dark:border-teal-500/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-teal-600 text-white">
                          <UserCheck className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                        </span>
                        {selectedPatient.mrn && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                            {selectedPatient.mrn}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        {selectedPatient.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {selectedPatient.phone}
                          </span>
                        )}
                        {selectedPatient.wilaya && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {selectedPatient.wilaya}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        {isRtl
                          ? 'تم تحديد هذا المريض المسجل بنجاح لربط الموعد بملفه الطبي.'
                          : 'This registered patient will be linked to the booking.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedPatient}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-all cursor-pointer flex-shrink-0"
                    >
                      {isRtl ? 'تغيير المريض' : 'Change'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Patient Search Input & Results */
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'ابحث بالاسم، رقم الملف (MRN)، أو رقم الهاتف...'
                          : 'Search by name, MRN, or phone number...'
                      }
                      className={`w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all ${
                        isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'
                      }`}
                    />
                    <Search
                      className={`absolute top-3.5 w-5 h-5 text-slate-400 ${
                        isRtl ? 'right-4' : 'left-4'
                      }`}
                    />
                  </div>

                  {searching && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span>{isRtl ? 'جاري البحث عبر المنصة...' : 'Searching platform...'}</span>
                    </div>
                  )}

                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                      {searchError}
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto bg-white dark:bg-slate-900">
                      {searchResults.map((p) => {
                        const fullName =
                          p.full_name || `${p.first_name} ${p.last_name}`.trim();
                        return (
                          <div
                            key={p.id}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {fullName}
                                </span>
                                {p.mrn && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                                    {p.mrn}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {p.phone && <span className="font-mono">{p.phone}</span>}
                                {p.wilaya && <span>{p.wilaya}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectPatient(p)}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors cursor-pointer flex-shrink-0"
                            >
                              {isRtl ? 'اختيار المريض' : 'Select'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isRtl
                          ? 'لم يتم العثور على أي مريض مسجل مطابق لبحثك.'
                          : 'No matching registered patient found.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('walkin')}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        {isRtl ? 'التحويل إلى تسجيل مريض مباشر (Walk-in)' : 'Switch to Walk-in'}
                      </button>
                    </div>
                  )}

                  {!searching && searchQuery.trim().length < 2 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
                      {isRtl
                        ? 'أدخل حرفين على الأقل للبحث عن المريض بالاسم أو رقم MRN أو رقم الهاتف.'
                        : 'Enter at least 2 characters to search by name, MRN, or phone.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Walk-in Form */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
                {isRtl
                  ? 'حجز مباشر لمريض غير مسجل في المنصة. سيتم تسجيل بيانات المريض الأساسية لإنشاء التذكرة فورياً.'
                  : 'Direct walk-in booking for an unregistered patient.'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {isRtl ? 'اسم المريض كاملاً *' : 'Patient Full Name *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder={isRtl ? 'مثال: محمد العمري' : 'e.g., Mohamed El-Amri'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {isRtl ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="0550112233"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none text-right"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {isRtl ? 'رقم الملف الطبي بالعيادة MRN (اختياري)' : 'Clinic MRN (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={patientMrn}
                    onChange={(e) => setPatientMrn(e.target.value)}
                    placeholder="MRN-..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-all cursor-pointer"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleProceedToDoctor}
              disabled={
                (patientMode === 'registered' && !selectedPatient) ||
                (patientMode === 'walkin' && (!patientName.trim() || !patientPhone.trim()))
              }
              className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{isRtl ? 'متابعة إلى اختيار الطبيب ←' : 'Continue to Doctor Selection →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Doctor Selection with Working Hours Guard */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isRtl ? '2. اختر الطبيب المعالج:' : '2. Select Attending Doctor:'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? `المريض المحدد: ${patientName || selectedPatient?.full_name}`
                  : `Selected Patient: ${patientName || selectedPatient?.full_name}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {isRtl ? 'تعديل بيانات المريض' : 'Edit Patient'}
            </button>
          </div>

          {/* Doctor Selection Error Alert */}
          {doctorSelectionError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="flex-1 leading-relaxed">
                <p>{doctorSelectionError}</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-normal mt-0.5">
                  {isRtl
                    ? 'يجب تفعيل جدول ساعات العمل الأسبوعية للطبيب في العيادة أولاً لتتمكن من إنشاء الحجوزات.'
                    : 'Doctor schedule must be activated to accept bookings.'}
                </p>
              </div>
            </div>
          )}

          {loadingDoctors ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
              <span>{isRtl ? 'جاري تحميل أطباء العيادة...' : 'Loading doctors...'}</span>
            </div>
          ) : doctorsError ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{doctorsError}</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl text-xs">
              {isRtl ? 'لا يوجد أطباء مسجلون في هذه العيادة حالياً.' : 'No doctors in this clinic.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctors.map((doctor) => {
                const isSelected = selectedDoctorId === doctor.id;
                const isScheduleActive = doctor.is_working_hours_activated === true;

                return (
                  <div
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? isScheduleActive
                          ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-900/20 shadow-sm ring-2 ring-teal-500/20'
                          : 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20 ring-2 ring-rose-400/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-xl ${
                              isSelected
                                ? isScheduleActive ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {doctor.name}
                            </div>
                            <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                              {doctor.specialty || (isRtl ? 'طب عام' : 'General')}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className={`p-1 rounded-full text-white ${isScheduleActive ? 'bg-teal-600' : 'bg-rose-600'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{doctor.license_number ? `ترخيص: ${doctor.license_number}` : ''}</span>
                        <span>{doctor.position === 'director' ? (isRtl ? 'مدير العيادة' : 'Director') : ''}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      {isScheduleActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{isRtl ? 'ساعات العمل: مفعّلة ✓' : 'Working hours: Active ✓'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>{isRtl ? 'ساعات العمل: غير مفعّلة ✕' : 'Working hours: Inactive ✕'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2 Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isRtl ? 'السابق (بيانات المريض)' : 'Back to Patient'}</span>
            </button>

            <button
              type="button"
              disabled={!selectedDoctorId || selectedDoctor?.is_working_hours_activated !== true}
              onClick={handleProceedToDateAndSlot}
              className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{isRtl ? 'متابعة إلى تحديد الموعد ←' : 'Continue to Date & Slot →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Date & Slot Selection with Friday / Vacation / Schedule Guards */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isRtl ? '3. حدد التاريخ والفترة الزمنية المتاحة:' : '3. Select Date and Available Slot:'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? `الطبيب: ${selectedDoctor?.name} (${selectedDoctor?.specialty || 'طب عام'})`
                  : `Doctor: ${selectedDoctor?.name}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {isRtl ? 'تغيير الطبيب' : 'Change Doctor'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                {isRtl ? 'تاريخ الحجز المطلوب:' : 'Appointment Date:'}
              </label>
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                {isRtl
                  ? 'ملاحظة: أيام الجمعة عطلة أسبوعية رسمية.'
                  : 'Note: Fridays are official weekly holidays.'}
              </p>
            </div>

            {/* Time Slot Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isRtl ? 'الفترات الزمنية المتاحة:' : 'Available Time Slots:'}
                </label>
                {loadingSlots && (
                  <span className="text-[10px] text-teal-600 animate-pulse font-medium">
                    {isRtl ? 'جارٍ التحقق...' : 'Checking...'}
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto mb-2" />
                  <p>{isRtl ? 'جارٍ فحص المواعيد المتاحة والسعة...' : 'Checking capacity...'}</p>
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">{isRtl ? 'لا يمكن حجز موعد في هذا التاريخ' : 'Unavailable Date'}</span>
                  </div>
                  <p className="leading-relaxed font-medium pr-6">{slotsError}</p>
                  <div className="pr-6 pt-1">
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-lg font-semibold inline-block">
                      💡 {isRtl ? 'يرجى اختيار تاريخ آخر للمتابعة.' : 'Please select another date.'}
                    </span>
                  </div>
                </div>
              ) : slots.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p>{isRtl ? 'لا توجد فترات عمل متاحة لهذا اليوم' : 'No available slots on this day'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{isRtl ? 'اختر تاريخاً آخر' : 'Choose another date'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Warning banner if patient has an active booking on this date */}
                  {(() => {
                    const existingBookedSlot = slots.find((s) => s.already_booked_by_patient);
                    if (!existingBookedSlot) return null;
                    return (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <strong className="block font-bold text-amber-950 dark:text-amber-100">
                            {isRtl ? 'تنبيه: المريض لديه حجز نشط بالفعل في هذا اليوم' : 'Notice: Patient already has an active booking on this date'}
                          </strong>
                          <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                            {isRtl
                              ? `يوجد موعد معتمد للمريض في تمام الساعة (${existingBookedSlot.time_slot}) مع هذا الطبيب. تم تعطيل تلك الفترة تلقائياً لمنع التكرار، يرجى اختيار فترة زمنية أخرى.`
                              : `Patient is already booked at ${existingBookedSlot.time_slot} with this doctor. This slot has been disabled to prevent duplicate bookings.`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedTimeSlot === slot.time_slot;
                      const isAlreadyBooked = Boolean(slot.already_booked_by_patient);
                      const isAvailable = slot.is_available && slot.available > 0 && !isAlreadyBooked;

                      return (
                        <button
                          type="button"
                          key={slot.time_slot}
                          disabled={!isAvailable}
                          onClick={() => setSelectedTimeSlot(slot.time_slot)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            isAlreadyBooked
                              ? 'border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-500 cursor-not-allowed opacity-90'
                              : !isAvailable
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <span className="font-bold text-xs">{slot.time_slot}</span>
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full ${
                              isAlreadyBooked
                                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold border border-rose-200'
                                : isSelected
                                ? 'bg-teal-500 text-white'
                                : isAvailable
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {isAlreadyBooked
                              ? (isRtl ? '🚫 محجوز للمريض' : 'Already booked')
                              : isAvailable
                              ? (isRtl ? `متاح (${slot.available}/${slot.max_capacity})` : `${slot.available} free`)
                              : (isRtl ? 'مكتمل' : 'Full')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isRtl ? 'السابق (اختيار الطبيب)' : 'Back to Doctor'}</span>
            </button>

            <button
              type="button"
              disabled={!selectedTimeSlot || !!slotsError || slots.length === 0}
              onClick={handleProceedToReview}
              className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{isRtl ? 'متابعة إلى مراجعة وتأكيد الحجز ←' : 'Continue to Review →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Final Confirmation */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isRtl ? '4. مراجعة وتأكيد الحجز النهائي:' : '4. Review & Confirm Booking:'}
            </h3>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {isRtl ? 'تعديل الموعد' : 'Change Date/Slot'}
            </button>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {isRtl ? 'تعديل التوقيت أو اليوم ←' : 'Change Slot/Date →'}
              </button>
            </div>
          )}

          {/* Structured Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">{isRtl ? 'المريض:' : 'Patient:'}</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{patientName}</p>
                <p className="text-slate-500 font-mono mt-0.5">{patientPhone}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                  {patientMode === 'registered' ? (isRtl ? 'مريض مسجل بالمنصة' : 'Registered') : (isRtl ? 'مريض مباشر (Walk-in)' : 'Walk-in')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">{isRtl ? 'الطبيب والعيادة:' : 'Doctor & Clinic:'}</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedDoctor?.name}</p>
                <p className="text-teal-600 dark:text-teal-400 font-semibold mt-0.5">{selectedDoctor?.specialty || (isRtl ? 'طب عام' : 'General')}</p>
                <p className="text-slate-500 mt-1">{clinicName}</p>
              </div>

              <div className="sm:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block mb-1">{isRtl ? 'تاريخ وتوقيت الموعد:' : 'Date & Time Slot:'}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-teal-600 text-white font-bold font-mono text-sm">
                      {selectedTimeSlot}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {selectedDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              {isRtl ? 'ملاحظات إضافية أو سبب الزيارة (اختياري):' : 'Notes / Reason for Visit (Optional):'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? 'ملاحظات خاصة، استشارة أولى، متابعة علاج...' : 'Additional visit notes...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
          </div>

          {/* Step 4 Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isRtl ? 'السابق (تعديل الموعد)' : 'Back to Date'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRtl ? 'جاري تأكيد الحجز...' : 'Confirming Booking...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'تأكيد وإنشاء الحجز الحضوري' : 'Confirm In-Clinic Booking'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
