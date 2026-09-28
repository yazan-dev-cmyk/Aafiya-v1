'use client';

import React, { useState } from 'react';
import {
  Stethoscope,
  Activity,
  AlertOctagon,
  Clock,
  FileText,
  FlaskConical,
  Scan,
  CheckCircle2,
  Phone,
  User,
  Heart,
  Thermometer,
  ShieldAlert,
  ChevronDown,
  PlusCircle,
  Printer,
  Save,
  Check
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { WaitingPatient } from '../../../data/doctorDashboardData';

interface CurrentConsultationTabProps {
  patient?: WaitingPatient | null;
  onOpenPrescription: () => void;
  onOpenLabOrders: () => void;
  onOpenRadiologyOrders: () => void;
  onCompleteConsultation: () => void;
  isDarkMode?: boolean;
}

export const CurrentConsultationTab: React.FC<CurrentConsultationTabProps> = ({
  patient,
  onOpenPrescription,
  onOpenLabOrders,
  onOpenRadiologyOrders,
  onCompleteConsultation,
  isDarkMode = false
}) => {
  const t = useTranslations('doctor.consultation');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const handleSaveDraft = () => {
    if (!diagnosis && !notes) return;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner Header - Live Patient Console Bar */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {t('activePath')}
              </span>
              <span className="text-xs text-blue-600 font-bold">
                {patient ? t('activePatientBadge') : t('newSessionBadge')}
              </span>
            </div>
            <h2 className={`text-lg sm:text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPrescription}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>{t('issuePrescription')}</span>
          </button>
          <button
            onClick={onOpenLabOrders}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <FlaskConical className="w-4 h-4" />
            <span>{t('requestLab')}</span>
          </button>
          <button
            onClick={onOpenRadiologyOrders}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Scan className="w-4 h-4" />
            <span>{t('requestRad')}</span>
          </button>
          <button
            onClick={onCompleteConsultation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('completeVisit')}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Header Card */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              isDarkMode ? 'bg-slate-800 border border-slate-700 text-amber-400' : 'bg-blue-50 border border-blue-200 text-blue-600'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {patient?.patientName || t('noActivePatient')}
                </h3>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  {patient ? (patient.patientType === 'registered' ? t('patientStatus') : t('guestPatient')) : t('idleStatus')}
                </span>
              </div>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {patient 
                  ? `${t('age')}: ${patient.age} ${t('years')} | ${t('gender')}: ${patient.gender === 'female' ? t('female') : t('male')} | ${patient.phone}` 
                  : t('selectPatientPrompt')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`block text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('emergencyContact')}:</span>
              <strong className={`block mt-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {patient ? `${patient.phone || '--'}` : t('noEmergencyContact')}
              </strong>
            </div>
          </div>
        </div>

        {/* Vitals Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className={`p-3.5 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('vitals.bp')}:</span>
            <strong className="text-amber-600 font-mono text-sm block">-- / --</strong>
          </div>
          <div className={`p-3.5 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('vitals.pulse')}:</span>
            <strong className="text-emerald-600 font-mono text-sm block">-- bpm</strong>
          </div>
          <div className={`p-3.5 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('vitals.temp')}:</span>
            <strong className="text-rose-600 font-mono text-sm block">-- °C</strong>
          </div>
          <div className={`p-3.5 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('vitals.spo2')}:</span>
            <strong className="text-blue-600 font-mono text-sm block">-- %</strong>
          </div>
          <div className={`p-3.5 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('vitals.sugar')}:</span>
            <strong className="text-purple-600 font-mono text-sm block">-- g/L</strong>
          </div>
        </div>
      </div>

      {/* Clinical Diagnosis & Examination Notes */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="border-b pb-3 flex items-center justify-between">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <FileText className="w-5 h-5 text-blue-600" />
            {t('clinicalNotesTitle')}
          </h3>
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <Check className="w-4 h-4" />
              {t('draftSaved')}
            </span>
          )}
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className={`block font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('diagnosisLabel')}
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder={t('preliminaryDiagnosisPlaceholder')}
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className={`block font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('notesLabel')}
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('examinationNotesPlaceholder')}
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{t('saveDraft')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
