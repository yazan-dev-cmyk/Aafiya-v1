import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  Phone,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Stethoscope,
  FlaskConical,
  Scan,
  MapPin,
  Activity,
  Heart,
  ChevronLeft,
  ListFilter,
  Eye,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { PatientRecord, VisitRecord } from '../../../data/doctorPatientsData';
import { ehrService } from '@/services/ehrService';

import { useAuth } from '@/auth';

interface PatientsTabProps {
  isDarkMode?: boolean;
}

export const PatientsTab: React.FC<PatientsTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.patients');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { activeClinicId, user } = useAuth();
  const currentClinicId = activeClinicId || user?.clinic?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'week' | 'month' | 'new' | 'followup' | 'upcoming' | 'inactive'>('all');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [selectedVisitForModal, setSelectedVisitForModal] = useState<VisitRecord | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset page to 1 when clinic changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [currentClinicId]);

  React.useEffect(() => {
    let isCancelled = false;
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const trimmedSearch = searchTerm.trim();
        const params: Record<string, any> = {
          page: currentPage,
          per_page: 20,
        };
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const res = await ehrService.getPatients(params);
        if (isCancelled) return;
        if (res.data && res.data.length > 0) {
          const calculateAge = (dobString?: string): number | null => {
            if (!dobString) return null;
            const dob = new Date(dobString);
            if (isNaN(dob.getTime())) return null;
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
            return age >= 0 ? age : null;
          };

          const livePatients: PatientRecord[] = res.data.map((p) => {
            const rawEmergency = (p as any).emergency_contacts;
            const firstContact = Array.isArray(rawEmergency) && rawEmergency.length > 0 ? rawEmergency[0] : null;

            return {
              id: p.id,
              mrn: p.mrn,
              fullName: p.full_name || `${p.first_name} ${p.last_name}`.trim(),
              age: (calculateAge(p.date_of_birth) as unknown) as number,
              gender: (p.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
              phone: p.phone,
              stateLocation: p.wilaya || (isRtl ? 'غير محدد' : 'Not specified'),
              firstVisitDate: (p as any).first_visit_date || (isRtl ? 'غير مسجل' : 'Not recorded'),
              lastVisitDate: (p as any).last_visit_date || (isRtl ? 'غير مسجل' : 'Not recorded'),
              visitCount: typeof (p as any).visit_count === 'number' ? (p as any).visit_count : (null as unknown as number),
              status: (p as any).is_active === false ? ('completed' as const) : ('active' as const),
              attendingDoctor: (p as any).attending_doctor || (isRtl ? 'غير محدد' : 'Unspecified'),
              nextAppointment: null,
              primaryDiagnosis: (p as any).primary_diagnosis || (isRtl ? 'غير متوفر' : 'Not available'),
              bloodGroup: p.blood_group || (isRtl ? 'غير مسجلة' : 'Not recorded'),
              allergies: p.allergies?.map(a => a.allergen_name) || [t('noAllergies')],
              chronicDiseases: p.chronic_conditions?.map(c => c.condition_name) || [t('noChronic')],
              emergencyContact: {
                name: firstContact?.contact_name || firstContact?.name || (isRtl ? 'غير متوفر' : 'Not available'),
                phone: firstContact?.phone || '-',
                relation: firstContact?.relationship || firstContact?.relation || '-',
              },
              visitsHistory: [],
            };
          });
          if (!isCancelled) {
            setPatients(livePatients);
            setLastPage(res.meta?.last_page || 1);
            setTotalRecords(res.meta?.total || livePatients.length);
          }
        } else {
          if (!isCancelled) {
            setPatients([]);
            setLastPage(1);
            setTotalRecords(0);
          }
        }
      } catch {
        if (!isCancelled) {
          setPatients([]);
          setLastPage(1);
          setTotalRecords(0);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchPatients();
    return () => {
      isCancelled = true;
    };
  }, [currentClinicId, currentPage, searchTerm, isRtl, t]);

  const containerClass = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs';

  // Data Mappings
  const genderMap: Record<string, string> = {
    'male': t('gender.male'),
    'female': t('gender.female')
  };

  const statusMap: Record<string, string> = {
    'active': t('status.active'),
    'followup': t('status.followup'),
    'completed': t('status.completed'),
    'absent': t('status.absent')
  };

  const visitTypeMap: Record<string, string> = {
    'first': t('filters.new'), 
    'review': t('filters.followup'),
    'followup': t('filters.followup'),
    'emergency': t('filters.today'), // Map to appropriate keys
    'teleconsult': t('filters.today')
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // ListFilter Logic
  const filteredPatients = patients.filter((patient) => {
    // Search match
    const matchesSearch =
      patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm) ||
      (patient.stateLocation && patient.stateLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.primaryDiagnosis && patient.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // ListFilter type match
    if (activeFilter === 'today') {
      const todayStr = formatLocalDate(new Date());
      return patient.lastVisitDate === todayStr;
    }
    if (activeFilter === 'new') {
      return patient.visitCount === 1;
    }
    if (activeFilter === 'followup') {
      return patient.status === 'followup';
    }
    if (activeFilter === 'upcoming') {
      return patient.nextAppointment !== null;
    }
    if (activeFilter === 'inactive') {
      return patient.status === 'absent' || patient.status === 'completed';
    }
    return true;
  });

  // Calculate top quick statistics
  const totalPatients = patients.length;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = patients.filter((p) => p.firstVisitDate && p.firstVisitDate.startsWith(currentMonthStr)).length;
  const followUpCount = patients.filter((p) => p.status === 'followup').length;
  const upcomingTomorrowCount = patients.filter((p) => p.nextAppointment?.includes('غداً') || p.nextAppointment?.includes('Tomorrow')).length;
  const validVisits = patients.filter((p) => typeof p.visitCount === 'number' && p.visitCount !== null);
  const avgVisits = validVisits.length > 0
    ? (validVisits.reduce((acc, curr) => acc + (curr.visitCount || 0), 0) / validVisits.length).toFixed(1)
    : '-';

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
                isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                /doctor/patients
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('subtitle')}</span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('title')}
            </h2>
          </div>
        </div>

        <button
          onClick={() => alert('Add patient logic')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('addPatient')}</span>
        </button>
      </div>

      {/* Top Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t('stats.total')}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalPatients}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{t('stats.totalDesc')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t('stats.newMonth')}</span>
            <UserPlus className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{newThisMonth}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{t('stats.newMonthDesc')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t('stats.followUp')}</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{followUpCount}</span>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">{t('stats.followUpDesc')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t('stats.avgVisits')}</span>
            <Stethoscope className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{avgVisits}</span>
            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">{t('stats.avgVisitsDesc')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-4 rounded-xl border flex flex-col justify-between col-span-2 sm:col-span-1`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">{t('stats.tomorrow')}</span>
            <Calendar className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{upcomingTomorrowCount}</span>
            <span className="text-[10px] text-rose-600 font-bold block mt-0.5">{t('stats.tomorrowDesc')}</span>
          </div>
        </div>
      </div>

      {/* ListFilter Options & Search Bar */}
      <div className={`${containerClass} rounded-2xl p-5 border space-y-4`}>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('searchPlaceholder')}
              className={`w-full ${isRtl ? 'pl-3 pr-10' : 'pl-10 pr-3'} py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 transition-all ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className={`text-xs font-bold whitespace-nowrap flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <ListFilter className="w-3.5 h-3.5" />
              {t('filterBy')}
            </span>
            {[
              { id: 'all', label: t('filters.all') },
              { id: 'today', label: t('filters.today') },
              { id: 'new', label: t('filters.new') },
              { id: 'followup', label: t('filters.followup') },
              { id: 'upcoming', label: t('filters.upcoming') },
              { id: 'inactive', label: t('filters.inactive') }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFilter(f.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patients Main Data Table */}
        <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
              <tr>
                <th className="p-3 font-mono">{t('table.mrn')}</th>
                <th className="p-3">{t('table.patientName')}</th>
                <th className="p-3 text-center">{t('table.ageGender')}</th>
                <th className="p-3">{t('table.phone')}</th>
                <th className="p-3">{t('table.state')}</th>
                <th className="p-3 font-mono">{t('table.firstVisit')}</th>
                <th className="p-3 font-mono">{t('table.lastVisit')}</th>
                <th className="p-3 text-center">{t('table.visits')}</th>
                <th className="p-3 text-center">{t('table.status')}</th>
                <th className="p-3">{t('table.nextAppt')}</th>
                <th className="p-3 text-center">{t('table.ehr')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    {t('table.noPatients')}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    
                    <td className="p-3 font-mono font-bold text-blue-600">
                      {patient.mrn}
                    </td>

                    <td className="p-3">
                      <div>
                        <strong className={`font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {patient.fullName}
                        </strong>
                        <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {patient.primaryDiagnosis}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        patient.gender === 'male'
                          ? isDarkMode ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-800 border border-blue-200'
                          : isDarkMode ? 'bg-pink-950 text-pink-300 border border-pink-800' : 'bg-pink-50 text-pink-800 border border-pink-200'
                      }`}>
                        {typeof patient.age === 'number' && patient.age !== null && patient.age >= 0 ? `${patient.age} ${t('years')}` : (isRtl ? 'غير محدد' : 'Not specified')} ({genderMap[patient.gender] || patient.gender})
                      </span>
                    </td>

                    <td className={`p-3 font-mono ${isRtl ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {patient.phone}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {patient.stateLocation}
                      </span>
                    </td>

                    <td className={`p-3 font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {patient.firstVisitDate}
                    </td>

                    <td className="p-3 font-mono text-[11px] font-bold text-amber-600">
                      {patient.lastVisitDate}
                    </td>

                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {patient.visitCount != null ? `${patient.visitCount} ${t('visitsUnit')}` : (isRtl ? 'غير مسجل' : 'Not recorded')}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                        patient.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : patient.status === 'followup'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {statusMap[patient.status] || patient.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {patient.nextAppointment ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {patient.nextAppointment}
                        </span>
                      ) : (
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('noAppointment')}</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('openEhr')}</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Footer Controls */}
          <div className={`px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {isRtl ? `صفحة ${currentPage} من ${lastPage}` : `Page ${currentPage} of ${lastPage}`}
              </span>
              {totalRecords > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                }`}>
                  {isRtl ? `إجمالي: ${totalRecords}` : `Total: ${totalRecords}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  currentPage <= 1 || isLoading
                    ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                    : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <span>{isRtl ? 'السابق' : 'Previous'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
                disabled={currentPage >= lastPage || isLoading}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  currentPage >= lastPage || isLoading
                    ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800'
                    : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <span>{isRtl ? 'التالي' : 'Next'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive EHR Electronic Medical Record Modal */}
      {selectedPatient && (
        <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto ${isRtl ? 'text-right' : 'text-left'} animate-fade-in`}>
          <div className={`${containerClass} w-full max-w-5xl rounded-2xl border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto`} dir={isRtl ? 'rtl' : 'ltr'}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedPatient.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded">
                      {selectedPatient.mrn}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ehrModal.subtitle')}</span>
                  </div>
                  <h3 className={`text-xl font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('ehrModal.title')}: {selectedPatient.fullName}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className={`p-2 rounded-xl border cursor-pointer hover:bg-rose-50 hover:text-rose-600 transition-all ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Patient Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ehrModal.ageGender')}</span>
                <strong className={`text-xs font-bold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {typeof selectedPatient.age === 'number' && selectedPatient.age !== null && selectedPatient.age >= 0
                    ? `${selectedPatient.age} ${t('years')}`
                    : (isRtl ? 'غير محدد' : 'Not specified')} ({genderMap[selectedPatient.gender] || selectedPatient.gender}) - {t('bloodGroupLabel')} {selectedPatient.bloodGroup}
                </strong>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ehrModal.phone')}</span>
                <strong className={`text-xs font-mono font-bold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPatient.phone}
                </strong>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ehrModal.emergency')}</span>
                <strong className={`text-xs font-bold block mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPatient.emergencyContact.phone && selectedPatient.emergencyContact.phone !== '-'
                    ? `${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.phone})`
                    : selectedPatient.emergencyContact.name}
                </strong>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('ehrModal.totalVisits')}</span>
                <strong className="text-xs font-bold block mt-0.5 text-blue-600">
                  {typeof selectedPatient.visitCount === 'number' && selectedPatient.visitCount !== null
                    ? t('ehrModal.visitsCount', { count: selectedPatient.visitCount })
                    : (isRtl ? 'غير مسجل' : 'Not recorded')}
                </strong>
              </div>
            </div>

            {/* Medical Alerts (Allergies & Chronic Diseases) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  {t('ehrModal.allergies')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergies.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-2xs">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5 mb-2">
                  <Heart className="w-4 h-4 text-amber-600" />
                  {t('ehrModal.chronic')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.chronicDiseases.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-2xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Visits Chronological Timeline Table */}
            <div className="space-y-3">
              <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('ehrModal.timeline')}
              </span>

              <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
                    <tr>
                      <th className="p-3 font-mono">{t('visitTable.date')}</th>
                      <th className="p-3 font-mono">{t('visitTable.time')}</th>
                      <th className="p-3">{t('visitTable.type')}</th>
                      <th className="p-3">{t('visitTable.diagnosis')}</th>
                      <th className="p-3 text-center">{t('visitTable.prescription')}</th>
                      <th className="p-3 text-center">{t('visitTable.lab')}</th>
                      <th className="p-3 text-center">{t('visitTable.rad')}</th>
                      <th className="p-3 text-center">{t('visitTable.details')}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                    {selectedPatient.visitsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500">
                          {isRtl ? 'لا توجد سجلات زيارات متوفرة' : 'No visit records available'}
                        </td>
                      </tr>
                    ) : (
                      selectedPatient.visitsHistory.map((visit) => (
                      <tr key={visit.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono font-bold text-blue-600">{visit.date}</td>
                        <td className="p-3 font-mono text-slate-500">{visit.time}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {visitTypeMap[visit.visitType] || visit.visitType}
                          </span>
                        </td>
                        <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{visit.diagnosis}</td>
                        
                        <td className="p-3 text-center font-bold">
                          {visit.hasPrescription ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ {t('visitTable.dispensed')}</span>
                          ) : (
                            <span className="text-slate-400">✗</span>
                          )}
                        </td>

                        <td className="p-3 text-center font-bold">
                          {visit.hasLabOrder ? (
                            <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">✓ {t('visitTable.requested')}</span>
                          ) : (
                            <span className="text-slate-400">✗</span>
                          )}
                        </td>

                        <td className="p-3 text-center font-bold">
                          {visit.hasRadiologyOrder ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">✓ {t('visitTable.requested')}</span>
                          ) : (
                            <span className="text-slate-400">✗</span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedVisitForModal(visit)}
                            className="text-blue-600 hover:underline font-bold text-[11px]"
                          >
                            {t('visitTable.preview')}
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between border-t pt-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('ehrModal.certifiedDoctor')}
              </span>
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {t('ehrModal.close')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Individual Visit View Detail Sub-Modal */}
      {selectedVisitForModal && (
        <div className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in ${isRtl ? 'text-right' : 'text-left'}`}>
          <div className={`${containerClass} w-full max-w-xl rounded-2xl border shadow-2xl p-6 space-y-4`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                {t('visitDetail.title')} ({selectedVisitForModal.id})
              </h4>
              <button onClick={() => setSelectedVisitForModal(null)} className={`p-1 text-slate-400 hover:text-slate-600 ${isRtl ? 'rotate-180' : ''}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>{t('visitDetail.patient')}</strong> {selectedVisitForModal.patientName}</p>
              <p><strong>{t('visitDetail.dateTime')}</strong> {selectedVisitForModal.date} - {selectedVisitForModal.time}</p>
              <p><strong>{t('visitDetail.diagnosis')}</strong> {selectedVisitForModal.diagnosis}</p>
              {selectedVisitForModal.vitals && (
                <div className={`p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div><span className="text-slate-400 block text-[10px]">{t('visitDetail.vitals.bp')}:</span> <strong>{selectedVisitForModal.vitals.bp}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">{t('visitDetail.vitals.pulse')}:</span> <strong>{selectedVisitForModal.vitals.pulse} {t('visitDetail.vitals.pulseUnit')}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">{t('visitDetail.vitals.temp')}:</span> <strong>{selectedVisitForModal.vitals.temp} °C</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">{t('visitDetail.vitals.spo2')}:</span> <strong>{selectedVisitForModal.vitals.spo2}%</strong></div>
                </div>
              )}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <span className="font-bold block text-blue-800 dark:text-blue-300 mb-1">{t('visitDetail.notes')}</span>
                <p className="text-slate-700 dark:text-slate-300">{selectedVisitForModal.notes}</p>
              </div>
            </div>

            <div className={`flex ${isRtl ? 'justify-start' : 'justify-end'} pt-2`}>
              <button
                onClick={() => setSelectedVisitForModal(null)}
                className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                {t('visitDetail.ok')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
