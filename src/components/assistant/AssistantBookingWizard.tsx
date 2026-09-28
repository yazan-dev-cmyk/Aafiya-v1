'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  // Step management (1: Doctor & Date & Slot, 2: Patient Info)
  const [step, setStep] = useState<1 | 2>(1);

  // Clinic doctors state
  const [clinicName, setClinicName] = useState<string>('');
  const [doctors, setDoctors] = useState<ClinicDoctorStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // Form selections
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Slots state
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

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

        if (activeDocs.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(activeDocs[0].id);
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

  // 2. Fetch authoritative slots whenever doctor or date changes
  const fetchSlots = useCallback(async () => {
    if (!clinicId || !selectedDoctorId || !selectedDate) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const response = await appointmentService.getSlots(
        clinicId,
        selectedDoctorId,
        selectedDate
      );
      const slotData = response.data?.slots || [];
      setSlots(slotData);

      // If previously selected slot is no longer available, clear selection
      if (selectedTimeSlot) {
        const current = slotData.find(
          (s: SlotItem) => s.time_slot === selectedTimeSlot
        );
        if (!current || !current.is_available) {
          setSelectedTimeSlot('');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch slots:', err);
      setSlotsError(
        err?.message ||
          (isRtl
            ? 'تعذر تحميل المواعيد المتاحة لهذا اليوم.'
            : 'Failed to load available slots for this date.')
      );
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [clinicId, selectedDoctorId, selectedDate, selectedTimeSlot, isRtl]);

  useEffect(() => {
    fetchSlots();
  }, [clinicId, selectedDoctorId, selectedDate]);

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

  // Validation before moving to Step 2
  const handleProceedToPatientInfo = () => {
    if (!selectedDoctorId) {
      setSlotsError(
        isRtl ? 'يرجى اختيار الطبيب المعالج.' : 'Please select a doctor.'
      );
      return;
    }
    if (!selectedDate) {
      setSlotsError(
        isRtl ? 'يرجى اختيار تاريخ الحجز.' : 'Please select a date.'
      );
      return;
    }
    if (!selectedTimeSlot) {
      setSlotsError(
        isRtl
          ? 'يرجى اختيار الفترة الزمنية المطلوبة.'
          : 'Please select a time slot.'
      );
      return;
    }
    setSlotsError(null);
    setStep(2);
  };

  // Submit appointment creation
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (patientMode === 'registered' && !selectedPatient) {
      setSubmitError(
        isRtl
          ? 'يرجى البحث واختيار مريض مسجل أو التحويل إلى وضع مريض مباشر (Walk-in).'
          : 'Please search and select a registered patient or switch to walk-in.'
      );
      return;
    }

    if (!patientName.trim()) {
      setSubmitError(
        isRtl ? 'يرجى إدخال اسم المريض كاملاً.' : 'Please enter patient name.'
      );
      return;
    }
    if (!patientPhone.trim()) {
      setSubmitError(
        isRtl
          ? 'يرجى إدخال رقم هاتف المريض.'
          : 'Please enter patient phone number.'
      );
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
      console.error('Failed to create appointment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        (isRtl
          ? 'تعذر إنشاء الحجز. يرجى التحقق من توفر السعة.'
          : 'Failed to create booking. Please check capacity.');
      setSubmitError(errMsg);

      // Refresh slots in case slot became fully booked
      fetchSlots();
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

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 1
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
            }`}
          >
            1
          </span>
          <span className="w-6 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === 2
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            2
          </span>
        </div>
      </div>

      {/* Content */}
      {step === 1 ? (
        <div className="space-y-6">
          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              {isRtl ? '1. اختر الطبيب المعالج من العيادة' : '1. Select In-Clinic Doctor'}
            </label>

            {loadingDoctors ? (
              <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                <span>{isRtl ? 'جاري تحميل أطباء العيادة...' : 'Loading clinic doctors...'}</span>
              </div>
            ) : doctorsError ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{doctorsError}</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                {isRtl ? 'لا يوجد أطباء نشطون مسجلون في هذه العيادة حالياً.' : 'No active doctors registered in this clinic.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doctor) => {
                  const isSelected = selectedDoctorId === doctor.id;
                  return (
                    <button
                      type="button"
                      key={doctor.id}
                      onClick={() => {
                        setSelectedDoctorId(doctor.id);
                        setSelectedTimeSlot('');
                      }}
                      className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-900/20 shadow-sm ring-1 ring-teal-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {doctor.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {doctor.specialty || (isRtl ? 'طبيب ممارس' : 'General Practitioner')}
                        </div>
                        {doctor.position === 'director' && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            {isRtl ? 'مدير العيادة' : 'Clinic Director'}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              {isRtl ? '2. تاريخ الحجز' : '2. Appointment Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTimeSlot('');
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Hourly Slot Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                {isRtl ? '3. الفترة الزمنية (نظام الساعة الواحدة P3)' : '3. Hourly Time Slot (P3 Rule)'}
              </label>
              {loadingSlots && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  {isRtl ? 'تحديث السعة...' : 'Checking capacity...'}
                </span>
              )}
            </div>

            {slotsError ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{slotsError}</span>
              </div>
            ) : slots.length === 0 && !loadingSlots ? (
              <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                {isRtl ? 'يرجى تحديد الطبيب والتاريخ لعرض الفترات الزمنية المتاحة.' : 'Select a doctor and date to view time slots.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot.time_slot;
                  const isAvailable = slot.is_available;

                  return (
                    <button
                      type="button"
                      key={slot.time_slot}
                      disabled={!isAvailable}
                      onClick={() => setSelectedTimeSlot(slot.time_slot)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        !isAvailable
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-sm tracking-wider flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.time_slot}</span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 ${
                          isSelected
                            ? 'text-teal-100'
                            : isAvailable
                            ? 'text-teal-600 dark:text-teal-400 font-semibold'
                            : 'text-rose-500 dark:text-rose-400 font-semibold'
                        }`}
                      >
                        {isAvailable
                          ? (isRtl ? `متاح (${slot.available}/${slot.max_capacity})` : `${slot.available} free`)
                          : (isRtl ? 'مكتمل' : 'Full')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={!selectedDoctorId || !selectedDate || !selectedTimeSlot || loadingSlots}
              onClick={handleProceedToPatientInfo}
              className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{isRtl ? 'متابعة لبيانات المريض' : 'Continue to Patient Info'}</span>
              {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        /* Step 2: Patient Info */
        <form onSubmit={handleConfirmBooking} className="space-y-5">
          {/* Booking Summary Card */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isRtl ? 'تفاصيل الموعد المحدد' : 'Selected Appointment'}
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {selectedDoctor?.name} — {selectedDate} ({selectedTimeSlot})
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {isRtl ? 'تعديل الموعد' : 'Change Slot'}
            </button>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

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
              <span>{isRtl ? 'مريض مسجل في المنصة' : 'Registered Patient'}</span>
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
              <span>{isRtl ? 'مريض غير مسجل / مباشر (Walk-in)' : 'Walk-in (Unregistered)'}</span>
            </button>
          </div>

          {patientMode === 'registered' ? (
            /* Registered Patient Search Flow */
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
                          ? 'تم تحديد هذا المريض المسجل لربط الحجز بملفه التعريفي.'
                          : 'This registered patient will be linked to the booking identity.'}
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
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      {isRtl ? 'البحث عن مريض مسجل في المنصة *' : 'Search Registered Patient *'}
                    </label>
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
                  </div>

                  {/* Searching loader */}
                  {searching && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span>{isRtl ? 'جاري البحث عبر المنصة...' : 'Searching platform...'}</span>
                    </div>
                  )}

                  {/* Search error */}
                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                      {searchError}
                    </div>
                  )}

                  {/* Search results */}
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
                              {isRtl ? 'اختيار' : 'Select'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No results found */}
                  {!searching &&
                    searchQuery.trim().length >= 2 &&
                    searchResults.length === 0 && (
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
                          {isRtl
                            ? 'التحويل إلى حجز مباشر (Walk-in)'
                            : 'Switch to Walk-in Booking'}
                        </button>
                      </div>
                    )}

                  {/* Helper text when idle */}
                  {!searching && searchQuery.trim().length < 2 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
                      {isRtl
                        ? 'أدخل حرفين على الأقل للبحث عن المريض بالاسم أو رقم MRN أو رقم الهاتف.'
                        : 'Enter at least 2 characters to search by name, MRN, or phone number.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Walk-in (Unregistered) Patient Flow */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
                {isRtl
                  ? 'حجز مباشر لمريض غير مسجل في المنصة. لن يتم إنشاء حساب مستخدم أو ملف طبي إلكتروني تلقائيًا.'
                  : 'Direct booking for an unregistered patient. No platform account or EHR is created automatically.'}
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {isRtl ? 'اسم المريض كاملاً *' : 'Patient Full Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder={isRtl ? 'مثال: محمد العمري' : 'e.g., Mohamed El-Amri'}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                  <User
                    className={`absolute top-3.5 w-5 h-5 text-slate-400 ${
                      isRtl ? 'left-4' : 'right-4'
                    }`}
                  />
                </div>
              </div>

              {/* Patient Phone */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {isRtl ? 'رقم الهاتف *' : 'Phone Number *'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+213..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-left"
                  />
                  <Phone
                    className={`absolute top-3.5 w-5 h-5 text-slate-400 ${
                      isRtl ? 'left-4' : 'right-4'
                    }`}
                  />
                </div>
              </div>

              {/* MRN / Patient Number (Optional) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {isRtl
                    ? 'رقم الملف الطبي بالعيادة (اختياري)'
                    : 'Clinic Medical Record Number (Optional)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientMrn}
                    onChange={(e) => setPatientMrn(e.target.value)}
                    placeholder="MRN-..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  />
                  <FileText
                    className={`absolute top-3.5 w-5 h-5 text-slate-400 ${
                      isRtl ? 'left-4' : 'right-4'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              {isRtl ? 'ملاحظات الحجز (اختياري)' : 'Notes / Reason for Visit (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRtl
                  ? 'ملاحظات خاصة، سبب الزيارة، أو إحالة...'
                  : 'Notes or reason for visit...'
              }
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isRtl ? 'السابق' : 'Back'}</span>
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                (patientMode === 'registered' && !selectedPatient) ||
                (patientMode === 'walkin' && (!patientName.trim() || !patientPhone.trim()))
              }
              className="px-8 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRtl ? 'جاري تأكيد الحجز...' : 'Confirming Booking...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'تأكيد الحجز الحضوري' : 'Confirm In-Clinic Booking'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
