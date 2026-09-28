'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  User,
  Heart,
  ShieldAlert,
  AlertOctagon,
  Clock,
  Phone,
  CheckCircle2,
  Calendar,
  Pill,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  Microscope,
  Stethoscope,
  FileSearch,
  ExternalLink,
  Info,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Printer,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslations, useLocale } from 'next-intl';
import { MedicalTimelineHeader, MedicalTimelineValue } from '@/components/shared/MedicalTimelineHeader';
import { ehrService, ClinicalVisitRecord } from '@/services/ehrService';
import { prescriptionService, PrescriptionRecord } from '@/services/prescriptionService';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { ClinicalTimelineItem } from '../../../data/doctorDashboardData';

interface EhrSummaryTabProps {
  isDarkMode?: boolean;
}

export const EhrSummaryTab: React.FC<EhrSummaryTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.results.ehr');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [timelineValue, setTimelineValue] = useState<MedicalTimelineValue>({ range: 'all' });
  const [selectedRecord, setSelectedRecord] = useState<ClinicalTimelineItem | null>(null);

  // Live EHR states
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [timelineItems, setTimelineItems] = useState<ClinicalTimelineItem[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [currentMeds, setCurrentMeds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState<'allergy' | 'chronic' | 'med' | null>(null);

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  useEffect(() => {
    let isMounted = true;
    const fetchEhrData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Patients
        const patRes = await ehrService.getPatients();
        const patList = patRes.data && Array.isArray(patRes.data) ? patRes.data : [];
        if (isMounted) setPatients(patList);

        if (patList.length > 0) {
          const firstPat = patList[0];
          if (isMounted) {
            setSelectedPatient(firstPat);
            setAllergies(firstPat.allergies?.map((a: any) => a.allergen_name) || []);
            setChronicConditions(firstPat.chronic_conditions?.map((c: any) => c.condition_name) || []);
            setCurrentMeds(firstPat.medications?.map((m: any) => `${m.medication_name}${m.dosage ? ` (${m.dosage})` : ''}`) || []);
          }
        }

        // 2. Fetch Clinical Visits, Prescriptions, Diagnostic Orders
        const [visitsRes, rxRes, ordersRes] = await Promise.allSettled([
          ehrService.getVisits(),
          prescriptionService.getPrescriptions(),
          diagnosticService.getOrders()
        ]);

        const events: ClinicalTimelineItem[] = [];

        // Map Visits
        if (visitsRes.status === 'fulfilled' && visitsRes.value.data && Array.isArray(visitsRes.value.data)) {
          visitsRes.value.data.forEach((v: ClinicalVisitRecord) => {
            events.push({
              id: `vst-${v.id}`,
              year: v.visit_date ? v.visit_date.substring(0, 4) : '2026',
              date: v.visit_date || '2026-08-01',
              type: 'visit',
              title: `زيارة سريرية (${v.chief_complaint || 'فحص متابعة'})`,
              details: v.clinical_notes || v.diagnosis || 'استشارة سريرية',
              badgeColor: 'bg-blue-500'
            });
          });
        }

        // Map Prescriptions
        if (rxRes.status === 'fulfilled' && rxRes.value.data && Array.isArray(rxRes.value.data)) {
          rxRes.value.data.forEach((rx: PrescriptionRecord) => {
            events.push({
              id: `rx-${rx.id}`,
              year: rx.issue_date ? rx.issue_date.substring(0, 4) : '2026',
              date: rx.issue_date || '2026-08-01',
              type: 'prescription',
              title: `وصفة طبية إلكترونية رقم #${rx.prescription_reference || rx.id.slice(0, 8)}`,
              details: rx.notes ? `ملاحظات: ${rx.notes}` : 'وصفة دوائية معتمدة',
              badgeColor: 'bg-emerald-500'
            });
          });
        }

        // Map Diagnostic Orders
        if (ordersRes.status === 'fulfilled' && ordersRes.value.data && Array.isArray(ordersRes.value.data)) {
          ordersRes.value.data.forEach((ord: DiagnosticOrderRecord) => {
            events.push({
              id: `ord-${ord.id}`,
              year: ord.ordered_at ? ord.ordered_at.substring(0, 4) : '2026',
              date: ord.ordered_at ? ord.ordered_at.substring(0, 10) : '2026-08-01',
              type: ord.order_type === 'radiology' ? 'radiology' : 'lab_result',
              title: ord.order_type === 'radiology' ? 'طلب فحص تصوير إشعاعي' : 'طلب تحاليل مخبرية',
              details: `حالة الطلب: ${ord.status} • الأولوية: ${ord.priority || 'عادية'}`,
              badgeColor: ord.order_type === 'radiology' ? 'bg-amber-500' : 'bg-purple-500'
            });
          });
        }

        if (isMounted) {
          setTimelineItems(events);
        }
      } catch (err) {
        console.warn('Failed to load EHR data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEhrData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const filteredTimeline = useMemo(() => {
    const now = new Date();
    return timelineItems
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.details.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || item.type === filterType;
        if (!matchesSearch || !matchesFilter) return false;

        // Range filtering
        if (timelineValue.range === 'last_30_days') {
          const d30 = new Date(now);
          d30.setDate(now.getDate() - 30);
          const cutoff = formatLocalDate(d30);
          return item.date >= cutoff;
        }
        if (timelineValue.range === 'this_year') {
          const startOfYear = `${now.getFullYear()}-01-01`;
          return item.date >= startOfYear;
        }
        if (timelineValue.range === 'custom') {
          if (timelineValue.fromDate && item.date < timelineValue.fromDate) return false;
          if (timelineValue.toDate && item.date > timelineValue.toDate) return false;
        }

        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [searchTerm, filterType, timelineItems, timelineValue]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'visit': return <Stethoscope className="w-4 h-4" />;
      case 'prescription': return <Pill className="w-4 h-4" />;
      case 'lab_result': return <Microscope className="w-4 h-4" />;
      case 'radiology': return <FileSearch className="w-4 h-4" />;
      case 'review': return <Activity className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return t(`filter.${type}` as any) || t('filter.default');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const value = formData.get('itemName') as string;
    
    if (value) {
      if (isAddModalOpen === 'allergy') setAllergies(prev => [value, ...prev]);
      if (isAddModalOpen === 'chronic') setChronicConditions(prev => [value, ...prev]);
      if (isAddModalOpen === 'med') setCurrentMeds(prev => [value, ...prev]);
      
      setIsAddModalOpen(null);
      alert(t('modal.subtitle'));
    }
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header Profile Box */}
      <div className={`${containerClass} rounded-2xl p-6 border transition-all`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : (isRtl ? 'الملف الطبي الموحد' : 'Unified EHR Profile')}
                </h2>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {selectedPatient?.mrn || 'MRN-2026'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedPatient ? `${selectedPatient.gender === 'female' ? 'أنثى' : 'ذكر'} • فصيلة الدم: ${selectedPatient.blood_group || '--'} • الهاتف: ${selectedPatient.phone}` : (isRtl ? 'سجل الرعاية الطبية الشامل للمريض' : 'Comprehensive Medical Record')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-1.5 text-xs font-bold ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{t('printRecord')}</span>
            </button>
          </div>
        </div>

        {/* 2. Critical Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          {/* Allergies */}
          <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-600 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                {t('allergies')}
              </span>
              <button 
                onClick={() => setIsAddModalOpen('allergy')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {allergies.length === 0 ? (
              <p className="text-slate-400 text-[11px]">{isRtl ? 'لا توجد حساسيات مسجلة' : 'No recorded allergies'}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allergies.map((alg, i) => (
                  <span key={i} className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[11px] border border-rose-200">
                    {alg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chronic Conditions */}
          <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-600 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                {t('chronicConditions')}
              </span>
              <button 
                onClick={() => setIsAddModalOpen('chronic')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {chronicConditions.length === 0 ? (
              <p className="text-slate-400 text-[11px]">{isRtl ? 'لا توجد أمراض مزمنة مسجلة' : 'No chronic conditions'}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chronicConditions.map((ch, i) => (
                  <span key={i} className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[11px] border border-amber-200">
                    {ch}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Current Medications */}
          <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <Pill className="w-4 h-4" />
                {t('activeMedications')}
              </span>
              <button 
                onClick={() => setIsAddModalOpen('med')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {currentMeds.length === 0 ? (
              <p className="text-slate-400 text-[11px]">{isRtl ? 'لا توجد أدوية حالية مسجلة' : 'No current medications'}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentMeds.map((med, i) => (
                  <span key={i} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[11px] border border-emerald-200">
                    {med}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shared Medical Timeline Header Controls */}
      <MedicalTimelineHeader
        value={timelineValue}
        onChange={setTimelineValue}
        totalCount={filteredTimeline.length}
      />

      {/* 3. Clinical Timeline */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-6`}>
        {/* Timeline Header & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <Clock className="w-5 h-5 text-blue-600" />
              {t('timelineTitle')}
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('timelineSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'visit', 'prescription', 'lab_result', 'radiology'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Items */}
        {filteredTimeline.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-xs">
              {isRtl ? 'لا توجد أحداث كلينيكية مسجلة في السجل الزمني' : 'No clinical timeline events recorded'}
            </p>
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-200 pr-6 space-y-6 mr-3">
            {filteredTimeline.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -right-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${item.badgeColor} shadow-xs flex items-center justify-center`} />

                <div className={`p-4 rounded-xl border transition-all ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">{item.date}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${item.badgeColor}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </h4>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.details}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900">
              {isAddModalOpen === 'allergy' ? t('modal.addAllergy') : isAddModalOpen === 'chronic' ? t('modal.addCondition') : t('modal.addMedication')}
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <input
                type="text"
                name="itemName"
                required
                placeholder={t('modal.inputPlaceholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl">
                  {t('modal.save')}
                </button>
                <button type="button" onClick={() => setIsAddModalOpen(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl">
                  {t('modal.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
