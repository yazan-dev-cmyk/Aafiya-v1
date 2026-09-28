import React, { useState, useEffect } from 'react';
import { WaitingPatient } from '../../../data/doctorDashboardData';
import {
  Users,
  Clock,
  Volume2,
  Stethoscope,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface WaitingRoomTabProps {
  queue: WaitingPatient[];
  onCallPatient: (patientId: string) => void;
  onStartConsultation: (patient: WaitingPatient) => void;
  onConfirmAppointment?: (patientId: string) => void;
  isDarkMode?: boolean;
}

export const WaitingRoomTab: React.FC<WaitingRoomTabProps> = ({
  queue,
  onCallPatient,
  onStartConsultation,
  onConfirmAppointment,
  isDarkMode = false
}) => {
  const t = useTranslations('doctor.waitingRoom');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [localQueue, setLocalQueue] = useState<WaitingPatient[]>(queue);

  useEffect(() => {
    setLocalQueue(queue);
  }, [queue]);

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const tableHeadClass = isDarkMode
    ? "bg-slate-950 text-slate-400"
    : "bg-slate-100 text-slate-600 font-bold";

  const filteredQueue = localQueue.filter(
    (p) =>
      p.patientName.includes(searchTerm) ||
      p.reasonForVisit.includes(searchTerm) ||
      p.phone.includes(searchTerm)
  );

  const currentlyCalled = localQueue.find((p) => p.status === 'called');
  const currentlyInConsultation = localQueue.find((p) => p.status === 'in_consultation');
  const waitingCount = localQueue.filter((p) => p.status === 'waiting' || p.status === 'called').length;

  const handleCall = (id: string) => {
    setLocalQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) return { ...item, status: 'called' };
        if (item.status === 'called') return { ...item, status: 'waiting' };
        return item;
      })
    );
    onCallPatient(id);
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Banner Header */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4 transition-all`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isDarkMode ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                /doctor/waiting-room
              </span>
              <span className={isDarkMode ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs'}>{t('subtitle')}</span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`block text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('waitingNow')}</span>
            <strong className="text-amber-600 text-sm font-bold">{t('patientsCount', { count: waitingCount })}</strong>
          </div>
          <div className={`px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`block text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('avgTime')}</span>
            <strong className="text-blue-600 text-sm font-bold">{t('avgTimeValue')}</strong>
          </div>
        </div>
      </div>

      {/* Currently Called / In Consultation Highlight Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* In Consultation Card */}
        <div className={`rounded-2xl p-5 border space-y-3 ${
          isDarkMode ? 'bg-blue-950/40 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              {t('inConsultationTitle')}
            </span>
            <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold">
              {t('inConsultationBadge')}
            </span>
          </div>

          {currentlyInConsultation ? (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-blue-200 shadow-xs'
            }`}>
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 block">
                  {t('orderNo')} #{currentlyInConsultation.queueNumber}
                </span>
                <h3 className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentlyInConsultation.patientName}
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('table.reason')}: {currentlyInConsultation.reasonForVisit}
                </p>
              </div>
              <button
                onClick={() => onStartConsultation(currentlyInConsultation)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>{t('startConsultationButton')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-xs text-center ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-white border-blue-200 text-slate-500'
            }`}>
              {t('inConsultationEmpty')}
            </div>
          )}
        </div>

        {/* Currently Called Card */}
        <div className={`rounded-2xl p-5 border space-y-3 ${
          isDarkMode ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-600" />
              {t('calledTitle')}
            </span>
            <span className="text-[10px] bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-bold">
              {t('calledBadge')}
            </span>
          </div>

          {currentlyCalled ? (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-amber-200 shadow-xs'
            }`}>
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 block">
                  {t('orderNo')} #{currentlyCalled.queueNumber}
                </span>
                <h3 className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentlyCalled.patientName}
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('table.arrival')}: {currentlyCalled.arrivalTime} ({t('since')} {currentlyCalled.waitingMinutes} {t('minutesShort')})
                </p>
              </div>
              <button
                onClick={() => {
                  setLocalQueue((prev) =>
                    prev.map((item) =>
                      item.id === currentlyCalled.id
                        ? { ...item, status: 'in_consultation' }
                        : item
                    )
                  );
                  onStartConsultation(currentlyCalled);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{t('startVisitButton')}</span>
              </button>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-xs text-center ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-white border-amber-200 text-slate-500'
            }`}>
              {t('calledEmpty')}
            </div>
          )}
        </div>

      </div>

      {/* Main Queue Table */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className={`w-full ${isRtl ? 'pl-3 pr-9' : 'pl-9 pr-3'} py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('queueFootnote')}</span>
          </div>
        </div>

        <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className={tableHeadClass}>
              <tr>
                <th className="p-3">{t('table.order')}</th>
                <th className="p-3">{t('table.patient')}</th>
                <th className="p-3">{t('table.type')}</th>
                <th className="p-3">{t('table.arrival')}</th>
                <th className="p-3">{t('table.wait')}</th>
                <th className="p-3">{t('table.reason')}</th>
                <th className="p-3">{t('table.status')}</th>
                <th className="p-3 text-center">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {filteredQueue.map((patient) => {
                const isCalled = patient.status === 'called';
                const isInConsultation = patient.status === 'in_consultation';

                return (
                  <tr
                    key={patient.id}
                    className={`transition-colors ${
                      isCalled
                        ? isDarkMode ? 'bg-amber-950/20' : 'bg-amber-50/60'
                        : isInConsultation
                        ? isDarkMode ? 'bg-blue-950/20' : 'bg-blue-50/60'
                        : isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-amber-600">
                      #{patient.queueNumber}
                    </td>
                    <td className="p-3">
                      <div className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <span>{patient.patientName}</span>
                        {patient.emergencyFlag && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-bold">
                            {t('emergency')}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{patient.phone}</span>
                    </td>
                    <td className="p-3">
                      {patient.patientType === 'registered' ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {t('patientTypes.registered')}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                          {t('patientTypes.guest')}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono">{patient.arrivalTime}</td>
                    <td className="p-3">
                      <span className="font-bold text-amber-600">{patient.waitingMinutes} {t('minutesShort')}</span>
                    </td>
                    <td className="p-3 max-w-xs truncate">{patient.reasonForVisit}</td>
                    <td className="p-3">
                      {isInConsultation ? (
                        <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                          {t('status.inConsultation')}
                        </span>
                      ) : isCalled ? (
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                          {t('status.called')}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[11px] ${isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-100'}`}>
                          {t('status.waiting')}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      {patient.status === 'pending' && onConfirmAppointment && (
                        <button
                          onClick={() => onConfirmAppointment(patient.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>{isRtl ? 'تأكيد الموعد' : 'Confirm'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleCall(patient.id)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{t('actions.call')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setLocalQueue((prev) =>
                            prev.map((item) =>
                              item.id === patient.id
                                ? { ...item, status: 'in_consultation' }
                                : item
                            )
                          );
                          onStartConsultation(patient);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Stethoscope className="w-3 h-3" />
                        <span>{t('actions.start')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500 font-bold">
                    {searchTerm ? t('noSearchResults') : t('noPatientsInQueue')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
