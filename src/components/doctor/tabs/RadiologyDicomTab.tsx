'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scan,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sun,
  Move,
  Ruler,
  FileText,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Layers,
  Info,
  ExternalLink,
  RotateCcw,
  LayoutGrid,
  List,
  User
} from 'lucide-react';
import { EngineHeader } from '../shared/EngineHeader';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslations, useLocale } from 'next-intl';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { RadiologyItem } from '../../../data/doctorDashboardData';

interface RadiologyDicomTabProps {
  isDarkMode?: boolean;
}

export const RadiologyDicomTab: React.FC<RadiologyDicomTabProps> = ({ isDarkMode = false }) => {
  const t = useTranslations('doctor.results.dicom');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [radiologyRecords, setRadiologyRecords] = useState<RadiologyItem[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Viewer States
  const [activeSlice, setActiveSlice] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isInverted, setIsInverted] = useState(false);

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  useEffect(() => {
    let isMounted = true;
    const fetchRadiologyOrders = async () => {
      setIsLoading(true);
      try {
        const res = await diagnosticService.getOrders({ order_type: 'radiology' });
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const firstOrder = res.data[0];
          if (firstOrder.patient) {
            setPatientName(`${firstOrder.patient.first_name} ${firstOrder.patient.last_name}`);
          }

          const items: RadiologyItem[] = [];
          res.data.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item, idx) => {
                items.push({
                  id: item.id || `rad-${order.id}-${idx}`,
                  studyType: item.test_name || t('imagingScan'),
                  modality: (item.category === 'CT' || item.category === 'MRI' || item.category === 'Ultrasound') ? item.category : 'X-Ray',
                  date: order.ordered_at ? order.ordered_at.substring(0, 10) : '2026-08-01',
                  facility: order.clinic?.name || t('radiologyCenter'),
                  radiologistReport: item.notes || t('pendingReview'),
                  dicomAvailable: true,
                  dicomImagesCount: 1,
                  status: (order.status === 'finalized' || order.status === 'resulted') ? 'completed' : 'pending'
                });
              });
            }
          });
          setRadiologyRecords(items);
        } else {
          if (isMounted) setRadiologyRecords([]);
        }
      } catch (err) {
        console.warn('Failed to fetch radiology orders:', err);
        if (isMounted) setRadiologyRecords([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRadiologyOrders();
    return () => {
      isMounted = false;
    };
  }, [locale]);

  const selectedStudy = useMemo(() => 
    radiologyRecords.find(r => r.id === selectedStudyId) || radiologyRecords[0]
  , [selectedStudyId, radiologyRecords]);

  const filteredHistory = useMemo(() => {
    return radiologyRecords.filter(study => {
      const matchesSearch = study.studyType.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            study.facility.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = modalityFilter === 'all' || study.modality === modalityFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, modalityFilter, radiologyRecords]);

  const handleSelectStudy = (id: string) => {
    setSelectedStudyId(id);
    setViewMode('detail');
    setActiveSlice(1);
    setZoomLevel(100);
    setBrightness(100);
    setRotation(0);
    setIsInverted(false);
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header */}
      <EngineHeader 
        engineName={t('viewerTitle')}
        engineSubtitle={t('viewerSubtitle')}
        patientName={patientName || t('currentPatient')}
        patientType="registered"
        icon={Scan}
        iconBgColor="bg-amber-600"
        badgeText={t('pacsBadge')}
        badgeColor={isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'}
        isDarkMode={isDarkMode}
        onAction={() => setViewMode(viewMode === 'list' ? 'detail' : 'list')}
        actionText={viewMode === 'list' ? t('openLatest') : t('backToHistory')}
        actionIcon={viewMode === 'list' ? Eye : ArrowRight}
      />

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Search & Filter Bar */}
            <div className={`${containerClass} rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-4`}>
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative w-full max-w-md">
                  <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-3 text-slate-400`} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className={`w-full text-xs rounded-xl py-2 ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} border focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {['all', 'X-Ray', 'CT', 'MRI', 'Ultrasound'].map((mod) => (
                  <button
                    key={mod}
                    onClick={() => setModalityFilter(mod)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                      modalityFilter === mod
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isDarkMode
                          ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {mod === 'all' ? t('allModalities') : mod}
                  </button>
                ))}
              </div>
            </div>

            {/* List / Cards View */}
            {filteredHistory.length === 0 ? (
              <div className={`${containerClass} rounded-2xl p-12 border text-center space-y-3`}>
                <Scan className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {t('noStudiesRecorded')}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('emptyStateDesc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((study) => (
                  <div
                    key={study.id}
                    className={`${containerClass} rounded-2xl p-5 border space-y-4 hover:border-amber-500/50 transition-all flex flex-col justify-between`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            study.modality === 'MRI' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            study.modality === 'CT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            study.modality === 'Ultrasound' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {study.modality}
                          </span>
                          <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {study.studyType}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          study.status === 'completed' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {t('reportReady')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {study.date}
                        </span>
                        <span>•</span>
                        <span>{study.facility}</span>
                      </div>

                      <p className={`text-xs line-clamp-2 mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {study.radiologistReport}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        {study.dicomImagesCount} {t('dicomFrames')}
                      </span>

                      <button
                        onClick={() => handleSelectStudy(study.id)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('viewInDicom')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Detail DICOM Viewer View */
          <motion.div 
            key="detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {selectedStudy ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2. Interactive PACS Screen */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
                    <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-slate-300 text-xs">
                      <button onClick={() => setZoomLevel(prev => Math.min(prev + 20, 200))} className="p-1.5 hover:bg-slate-800 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
                      <button onClick={() => setZoomLevel(prev => Math.max(prev - 20, 60))} className="p-1.5 hover:bg-slate-800 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
                      <button onClick={() => setBrightness(prev => (prev === 150 ? 100 : prev + 25))} className="p-1.5 hover:bg-slate-800 rounded-lg"><Sun className="w-4 h-4" /></button>
                      <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-1.5 hover:bg-slate-800 rounded-lg"><RotateCcw className="w-4 h-4" /></button>
                    </div>

                    <div className="text-center space-y-2 p-8 text-slate-400">
                      <Scan className="w-20 h-20 text-amber-500 mx-auto animate-pulse" />
                      <p className="font-bold text-white text-sm">{selectedStudy.studyType}</p>
                      <p className="text-xs font-mono">{selectedStudy.facility} • {selectedStudy.date}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Radiologist Diagnostic Report Panel */}
                <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
                  <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      {t('reportDetails')}
                    </h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-slate-800 block">{t('reportSummary')}</span>
                      <p className="text-slate-600 leading-relaxed">{selectedStudy.radiologistReport}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
