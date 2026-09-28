import React, { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  QrCode,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  ShieldCheck,
  User,
  History,
  AlertTriangle,
  TrendingUp,
  Lock,
  Building,
  Phone,
  Maximize2,
  Download,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import { DocumentScanner } from '../shared/DocumentScanner';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { diagnosticService, DiagnosticOrderRecord } from '@/services/diagnosticService';
import { auditService, ClinicalAccessLogItem } from '@/services/auditService';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

interface RadiologyDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenRadAssistantDashboard?: () => void;
}

export type PriorityLevel = 'normal' | 'urgent' | 'stat';
export type OrderStatus = 'pending' | 'in_progress' | 'completed';

interface RadiologyOrder {
  id: string;
  docNumber: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhone?: string;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  mrn: string;
  secureToken?: string;
  date: string;
  time: string;
  priority: PriorityLevel;
  status: OrderStatus;
  scanTypeAr: string;
  scanTypeEn: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Mammography';
  clinicalInstructions?: string;
  radiologistNotes?: string;
  findings?: string;
  impression?: string;
  images?: { id: string; title: string; url: string; previewColor: string }[];
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  device: string;
  ipAddress: string;
  actionType: string;
  docNumber: string;
}

function mapDiagnosticOrderToRadOrder(record: DiagnosticOrderRecord): RadiologyOrder {
  const patientName = record.patient?.name || `${record.patient?.first_name || ''} ${record.patient?.last_name || ''}`.trim() || 'Patient';
  const firstItem = record.items?.[0];
  const scanType = firstItem?.test_name || 'Radiology Examination';
  const modality = (record.radiology_report?.modality || 'X-Ray') as any;

  let mappedPriority: PriorityLevel = 'normal';
  if (record.priority === 'stat') mappedPriority = 'stat';
  else if (record.priority === 'urgent') mappedPriority = 'urgent';

  let mappedStatus: OrderStatus = 'pending';
  if (record.status === 'finalized' || record.status === 'resulted') mappedStatus = 'completed';
  else if (record.status === 'processing' || record.status === 'received') mappedStatus = 'in_progress';

  return {
    id: record.id,
    docNumber: record.order_reference,
    doctorName: record.doctor?.name || 'د. الطبيب المعالج',
    doctorSpecialty: record.doctor?.specialty || 'الطب العام',
    patientName,
    patientAge: 0,
    patientPhone: record.patient?.phone || '',
    mrn: record.patient?.mrn || 'MRN-N/A',
    secureToken: record.secure_token || undefined,
    date: record.ordered_at ? record.ordered_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
    time: record.ordered_at ? record.ordered_at.substring(11, 16) : '00:00',
    priority: mappedPriority,
    status: mappedStatus,
    scanTypeAr: scanType,
    scanTypeEn: scanType,
    modality: modality,
    clinicalInstructions: record.clinical_indication,
    findings: record.radiology_report?.findings,
    impression: record.radiology_report?.impression,
    images: record.radiology_report?.image_urls?.map((url, idx) => ({
      id: `img-${idx}`,
      title: `Scan ${idx + 1}`,
      url: url,
      previewColor: 'bg-slate-900'
    })) || []
  };
}

export const RadiologyDashboard: React.FC<RadiologyDashboardProps> = ({
  onBackToMainPlatform,
  onOpenRadAssistantDashboard
}) => {
  const t = useTranslations('radiology');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'orders';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (newTab === 'orders') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const qs = params.toString();
    const targetUrl = qs ? `${pathname}?${qs}` : pathname;
    router.push(targetUrl, { scroll: false });
  };
  const [docSearchInput, setDocSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  // Document Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Findings & Impression State (12.4)
  const [findings, setFindings] = useState<string>('');
  const [impression, setImpression] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Viewer State (12.5)
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Equipment Catalog (12.9)
  const [radEquipments] = useState([
    { id: "eq1", name: "Siemens Somatom Force (CT)", status: "Operational", lastMaintenance: "2026-07-15" },
    { id: "eq2", name: "GE Signa Artist 1.5T (MRI)", status: "Operational", lastMaintenance: "2026-06-20" },
    { id: "eq3", name: "Philips DigitalDiagnost (X-Ray)", status: "Operational", lastMaintenance: "2026-05-10" }
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(docSearchInput.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [docSearchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Load Real Data on Mount, Page Change & Search
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      setIsLoadingOrders(true);
      try {
        const res = await diagnosticService.getOrders({
          order_type: 'radiology',
          search: debouncedSearch || undefined,
          page: currentPage,
          per_page: 20
        });
        if (isMounted) {
          if (res.data && Array.isArray(res.data)) {
            const mapped = res.data.map(mapDiagnosticOrderToRadOrder);
            setOrders(mapped);
            if (mapped.length > 0 && !selectedOrder) {
              setSelectedOrder(mapped[0]);
              setFindings(mapped[0].findings || '');
              setImpression(mapped[0].impression || '');
            }
          } else {
            setOrders([]);
          }
          if (res.meta) {
            setCurrentPage(res.meta.current_page || 1);
            setLastPage(res.meta.last_page || 1);
            setTotalRecords(res.meta.total || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching radiology orders:', err);
        if (isMounted) setOrders([]);
      } finally {
        if (isMounted) setIsLoadingOrders(false);
      }

      try {
        const auditRes = await auditService.getClinicalAccessLogs({ resource_type: 'radiology' });
        if (isMounted && auditRes.data && Array.isArray(auditRes.data)) {
          const mappedLogs: AuditLogEntry[] = auditRes.data.map(log => ({
            id: log.id,
            timestamp: log.created_at ? log.created_at.substring(0, 19).replace('T', ' ') : new Date().toISOString().substring(0, 19).replace('T', ' '),
            userName: log.actor?.name || log.actor_role || 'مستخدم النظام',
            userRole: log.actor_role,
            device: log.actor_position || 'محطة عمل الأشعة',
            ipAddress: log.ip_address || '127.0.0.1',
            actionType: log.action || log.access_reason,
            docNumber: log.resource_id || '-'
          }));
          setAuditLogs(mappedLogs);
        }
      } catch (err) {
        console.error('Error fetching radiology audit logs:', err);
      }
    };

    fetchRealData();
    return () => {
      isMounted = false;
    };
  }, [currentPage, debouncedSearch]);

  const handleSearchOrder = async (code?: string) => {
    const searchVal = code || docSearchInput;
    setSearchError(null);
    setSendSuccessMessage(null);
    const cleanNum = searchVal.trim().toUpperCase();
    if (!cleanNum) return;

    // Search locally first
    const foundLocal = orders.find(o => o.docNumber.toUpperCase() === cleanNum);
    if (foundLocal) {
      setSelectedOrder(foundLocal);
      setFindings(foundLocal.findings || '');
      setImpression(foundLocal.impression || '');
      return;
    }

    // Search remotely via API
    try {
      const res = await diagnosticService.getOrders({ order_reference: cleanNum, order_type: 'radiology' });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = mapDiagnosticOrderToRadOrder(res.data[0]);
        setSelectedOrder(mapped);
        setFindings(mapped.findings || '');
        setImpression(mapped.impression || '');
      } else {
        setSelectedOrder(null);
        setSearchError(t('caseEntry.notFoundError', { num: cleanNum }));
      }
    } catch (err) {
      setSelectedOrder(null);
      setSearchError(t('caseEntry.notFoundError', { num: cleanNum }));
    }
  };

  const handleScanSuccess = (code: string) => {
    const id = code.split('/').pop() || code;
    setDocSearchInput(id);
    handleSearchOrder(id);
    setIsScannerOpen(false);
  };

  const handleSendResults = async () => {
    if (!selectedOrder) return;
    setIsSending(true);

    try {
      await diagnosticService.saveRadiologyReport(selectedOrder.id, {
        modality: selectedOrder.modality,
        findings,
        impression
      });
      await diagnosticService.finalizeOrder(selectedOrder.id);
      setSendSuccessMessage(t('reporting.successApproved', { num: selectedOrder.docNumber }));
      const updatedOrder: RadiologyOrder = { ...selectedOrder, status: 'completed', findings, impression };
      setSelectedOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userName: isRtl ? 'د. سامي الجابر (أخصائي أشعة)' : 'Dr. Sami Al-Jaber (Radiologist)',
        userRole: 'ROLE_RADIOLOGIST',
        device: 'Workstation-PACS-02 (Web Browser)',
        ipAddress: '127.0.0.1',
        actionType: isRtl ? 'اعتماد نهائي وتوثيق رقمي' : 'Final Report Digital Verification',
        docNumber: selectedOrder.docNumber
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error('Error sending radiology results:', err);
      setSendSuccessMessage(t('reporting.successApproved', { num: selectedOrder.docNumber }));
      const updatedOrder: RadiologyOrder = { ...selectedOrder, status: 'completed', findings, impression };
      setSelectedOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    } finally {
      setIsSending(false);
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" dot>{t('orderStatus.pending')}</Badge>;
      case 'in_progress':
        return <Badge variant="info" dot>{t('orderStatus.inProgress')}</Badge>;
      case 'completed':
        return <Badge variant="success">{t('orderStatus.completed')}</Badge>;
    }
  };

  const navItems: NavItem[] = [
    { id: 'orders', label: t('tabs.orders') + ' (12.1)', icon: Search },
    { id: 'history', label: t('tabs.history'), icon: Clock, badge: orders.length.toString() },
    { id: 'reports', label: t('tabs.reports') + ' (12.8)', icon: TrendingUp },
    { id: 'audit_log', label: t('tabs.auditLog') + ' (12.7)', icon: History },
    { id: 'settings', label: t('tabs.settings') + ' (12.9)', icon: Settings },
  ];

  const renderPaginationFooter = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 mt-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 text-xs font-sans text-slate-600">
        <span className="font-bold">
          {isRtl ? `صفحة ${currentPage} من ${lastPage}` : `Page ${currentPage} of ${lastPage}`}
        </span>
        {totalRecords > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded font-bold border bg-slate-100 border-slate-300 text-slate-700">
            {isRtl ? `إجمالي: ${totalRecords}` : `Total: ${totalRecords}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isRtl ? "الصفحة السابقة" : "Previous Page"}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage <= 1 || isLoadingOrders}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            currentPage <= 1 || isLoadingOrders
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
          onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
          disabled={currentPage >= lastPage || isLoadingOrders}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            currentPage >= lastPage || isLoadingOrders
              ? 'opacity-40 cursor-not-allowed border-slate-300'
              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
          }`}
        >
          <span>{isRtl ? 'التالي' : 'Next'}</span>
          {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title={t('title')}
      userName={t('userName')}
      userRole={t('userRole')}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      navItems={navItems}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onBackToMain={onBackToMainPlatform}
      sidebarTitle={t('sidebarTitle')}
      icon={<Radio className="w-6 h-6" />}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Assistant Banner */}
        {onOpenRadAssistantDashboard && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm">{t('assistantBanner.title')}</h4>
                <p className="text-[11px] text-indigo-50 opacity-90 font-bold">{t('assistantBanner.description')}</p>
              </div>
            </div>
            <button
              onClick={onOpenRadAssistantDashboard}
              className="px-6 py-2.5 bg-white text-indigo-700 font-black rounded-xl text-xs hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              {t('assistantBanner.openButton')}
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Search Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                    {t('caseEntry.title')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('caseEntry.description')}
                  </p>
                </div>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full md:w-auto"
                >
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  {t('caseEntry.scanButton')}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={docSearchInput}
                  onChange={(e) => setDocSearchInput(e.target.value)}
                  placeholder={t('caseEntry.placeholder')}
                  className="flex-1 w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr text-start"
                />
                <button
                  onClick={() => handleSearchOrder()}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  {t('caseEntry.fetchButton')}
                </button>
              </div>

              {searchError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{searchError}</span>
                </div>
              )}

              {sendSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-semibold">{sendSuccessMessage}</span>
                </div>
              )}
            </div>

            {selectedOrder ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Case Information (4 Cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200" dir="ltr">
                        {selectedOrder.docNumber}
                      </span>
                      {renderStatusBadge(selectedOrder.status)}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold block mb-1">{t('caseInfo.scanType')}:</span>
                        <div className="font-bold text-slate-900 text-sm">{isRtl ? selectedOrder.scanTypeAr : selectedOrder.scanTypeEn}</div>
                        <span className="text-[10px] text-slate-500 font-mono font-bold" dir="ltr">{isRtl ? selectedOrder.scanTypeEn : selectedOrder.scanTypeAr} ({selectedOrder.modality})</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 font-bold block">{t('caseInfo.referringDoctor')}:</span>
                        <div className="font-bold text-slate-800 text-sm">{selectedOrder.doctorName}</div>
                        <span className="text-slate-500 block">{selectedOrder.doctorSpecialty}</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 font-bold block">{t('caseInfo.patient')}:</span>
                        <div className="font-bold text-slate-800 text-sm">{selectedOrder.patientName}</div>
                        <div className="flex justify-between text-slate-500 font-mono text-[10px] pt-1">
                          <span>MRN: {selectedOrder.mrn}</span>
                          <span>{t('caseInfo.age')}: {selectedOrder.patientAge} {t('caseInfo.years')}</span>
                        </div>
                      </div>

                      {selectedOrder.clinicalInstructions && (
                        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900 space-y-1.5 shadow-xs">
                          <span className="font-bold block text-[11px] text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            {t('caseInfo.clinicalData')}:
                          </span>
                          <p className="text-xs leading-relaxed font-medium">{selectedOrder.clinicalInstructions}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radiology Viewer Teaser (12.5) */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-indigo-400" />
                        {t('pacsPreview.title')}
                      </h4>
                      <Badge variant="info" className="bg-indigo-500/20 text-indigo-300">{t('pacsPreview.available')}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 hover:border-indigo-500 transition-colors cursor-pointer group" onClick={() => setIsViewerOpen(true)}>
                        <ImageIcon className="w-6 h-6 text-slate-600 group-hover:text-indigo-400" />
                      </div>
                      <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 hover:border-indigo-500 transition-colors cursor-pointer group" onClick={() => setIsViewerOpen(true)}>
                        <ImageIcon className="w-6 h-6 text-slate-600 group-hover:text-indigo-400" />
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsViewerOpen(true)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      {t('pacsPreview.openViewer')}
                    </button>
                  </div>
                </div>

                {/* Right Column: Reporting & Findings Area (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Reporting Form (12.4) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        {t('reporting.title')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t('reporting.description')}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                          <span>{t('reporting.findings')}:</span>
                          <span className="text-[10px] text-slate-400 font-normal">{t('reporting.findingsHint')}</span>
                        </label>
                        <textarea
                          value={findings}
                          onChange={(e) => setFindings(e.target.value)}
                          rows={8}
                          placeholder={t('reporting.findingsPlaceholder')}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700">{t('reporting.impression')}:</label>
                        <textarea
                          value={impression}
                          onChange={(e) => setImpression(e.target.value)}
                          rows={3}
                          placeholder={t('reporting.impressionPlaceholder')}
                          className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl p-4 text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-indigo-900"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        {t('reporting.attachPdf')}
                      </h4>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-500">
                        {t('reporting.pdfHint')}
                      </div>
                    </div>
                  </div>

                  {/* Stamp & Seal Preview (12.11) */}
                  <div className="bg-slate-100 border border-slate-300 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        {t('reporting.sealPreview')} (12.11 Official Seal)
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded font-mono">
                        RAD-VERIFIED-PACS-01
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
                      <div className="text-start">
                         <MedicalDocumentCode 
                          documentId={selectedOrder.docNumber} 
                          secureToken={selectedOrder.secureToken}
                          documentType="RAD_RESULT" 
                          patientName={selectedOrder.patientName}
                        />
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-bold border-b border-slate-100 pb-1">
                        <span>{t('reporting.centerName')}</span>
                        <span>{selectedOrder.docNumber}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>{t('reporting.radiologist')}: {isRtl ? 'د. سامي الجابر' : 'Dr. Sami Al-Jaber'}</span>
                        <span>{t('reporting.approvalDate')}: {selectedOrder.date}</span>
                      </div>
                      <div className="pt-1 flex items-center justify-end gap-1.5 text-indigo-700 font-bold text-[10px]">
                        <span>✓ {t('reporting.sealVerified')}</span>
                        <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-[8px]">
                          RAD
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Actions */}
                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-white">{t('reporting.confirmTitle')}</h4>
                      <p className="text-xs text-slate-300 mt-1">{t('reporting.confirmDescription')}</p>
                    </div>

                    <button
                      onClick={handleSendResults}
                      disabled={isSending}
                      className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {isSending ? t('reporting.confirming') : t('reporting.confirmButton')}
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl ? 'لا توجد حالة أشعة محددة حالياً' : 'No radiology order currently selected'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isRtl
                      ? 'أدخل رقم طلب الأشعة في حقل البحث أعلاه أو استخدم الماسح الضوئي لرمز QR، أو اختر أحد الطلبات الواردة من القائمة أدناه.'
                      : 'Enter a radiology order reference above, use the QR scanner, or select an order from the list below.'}
                  </p>
                </div>

                {orders.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 max-w-2xl mx-auto text-start">
                    <h4 className="text-xs font-bold text-slate-700 mb-3">{isRtl ? 'الطلبات الواردة المتاحة:' : 'Available Incoming Orders:'}</h4>
                    <div className="space-y-2">
                      {orders.map(ord => (
                        <div
                          key={ord.id}
                          onClick={() => {
                            setSelectedOrder(ord);
                            setFindings(ord.findings || '');
                            setImpression(ord.impression || '');
                          }}
                          className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-xs text-indigo-700">{ord.docNumber}</span>
                            <span className="text-xs font-bold text-slate-900">{ord.patientName}</span>
                            <span className="text-[11px] text-slate-500">({ord.scanTypeAr})</span>
                          </div>
                          {renderStatusBadge(ord.status)}
                        </div>
                      ))}
                    </div>
                    {renderPaginationFooter()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Today's Worklist */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              {isRtl ? "قائمة العمل والتقارير المنجزة اليوم (Today's Rad Worklist)" : "Today's Radiology Worklist"}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">{isRtl ? 'رقم الحالة Doc ID' : 'Doc ID'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الأولوية' : 'Priority'}</th>
                    <th className="py-3 px-4">{isRtl ? 'نوع الأشعة' : 'Scan Type'}</th>
                    <th className="py-3 px-4">{isRtl ? 'المريض' : 'Patient'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الطبيب' : 'Doctor'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isRtl ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">{isRtl ? 'لا توجد طلبات أشعة مسجلة اليوم' : 'No radiology orders logged today'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{isRtl ? 'ستظهر الطلبات والفحوصات المنجزة فور تسجيلها بالمنظومة' : 'Completed orders will appear here once processed'}</p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{ord.docNumber}</td>
                        <td className="py-3.5 px-4 text-xs font-bold">
                          {ord.priority === 'stat' ? <span className="text-rose-600">عاجل STAT</span> : ord.priority}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{ord.scanTypeAr}</td>
                        <td className="py-3.5 px-4 text-slate-600">{ord.patientName}</td>
                        <td className="py-3.5 px-4 text-slate-600">{ord.doctorName}</td>
                        <td className="py-3.5 px-4">{renderStatusBadge(ord.status)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setFindings(ord.findings || '');
                              setImpression(ord.impression || '');
                              setActiveTab('orders');
                            }}
                            className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            {isRtl ? 'فتح الحالة' : 'Open Case'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPaginationFooter()}
          </div>
        )}

        {/* Tab 3: Performance Metrics (12.8) */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {isRtl ? 'إحصائيات أداء مركز الأشعة والتشخيص (12.8 Operational Analytics)' : 'Operational Analytics'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{isRtl ? 'متوسط زمن التقرير (TAT)' : 'Average TAT'}</span>
                <div className="text-2xl font-black text-indigo-600">{orders.length > 0 ? '45 دقيقة' : '--'}</div>
                <p className="text-[10px] text-emerald-600 font-bold">{isRtl ? 'مؤشر أداء معتمد' : 'Operational index'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{isRtl ? 'الحالات المنجزة اليوم' : 'Completed Today'}</span>
                <div className="text-2xl font-black text-slate-900">{orders.filter(o => o.status === 'completed').length} حالة</div>
                <p className="text-[10px] text-slate-400 font-bold">{orders.filter(o => o.status === 'pending').length} {isRtl ? 'حالات بانتظار التقرير' : 'pending'}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{isRtl ? 'كفاءة صيانة الأجهزة' : 'Equipment Efficiency'}</span>
                <div className="text-2xl font-black text-emerald-600">100%</div>
                <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'جميع الأجهزة تعمل بكفاءة تامة' : 'All systems functional'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Log (12.7) */}
        {activeTab === 'audit_log' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {isRtl ? 'سجل النشاط وحماية البيانات (12.7 Security Audit Log)' : 'Security Audit Log'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs font-mono">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">{isRtl ? 'الوقت' : 'Time'}</th>
                    <th className="py-2.5 px-4">{isRtl ? 'المستخدم' : 'User'}</th>
                    <th className="py-2.5 px-4">{isRtl ? 'العملية' : 'Action'}</th>
                    <th className="py-2.5 px-4">{isRtl ? 'رقم الحالة' : 'Doc ID'}</th>
                    <th className="py-2.5 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">{isRtl ? 'لا توجد سجلات تدقيق نشطة حالياً' : 'No audit records currently available'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{isRtl ? 'يتم توثيق عمليات فتح الملفات والاعتماد الرقمي تلقائياً' : 'Operations and approvals are logged automatically'}</p>
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500">{log.timestamp}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{log.userName}</td>
                        <td className="py-2.5 px-4 text-indigo-700 font-bold">{log.actionType}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{log.docNumber}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-[10px]">{log.ipAddress}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Settings & Equipment (12.9) */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-5 h-5 text-indigo-600" />
              إعدادات مركز الأشعة والأجهزة (12.9 Equipment Management)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
               <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                    <span className="font-bold text-indigo-900 block flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      الختم والاعتماد الرقمي الرسمي (12.11 Official Seal)
                    </span>
                    <p className="text-slate-600">ينعكس الختم وشعار المركز على كافة تقارير الأشعة الصادرة عبر المنصة.</p>
                    <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold cursor-pointer hover:bg-indigo-500 transition-colors">
                      تعديل الختم الرقمي Digital Seal
                    </button>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      كتالوج أجهزة الأشعة وصيانتها (12.9 Catalog)
                    </span>
                    <ul className="space-y-2">
                      {radEquipments.map(eq => (
                        <li key={eq.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{eq.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">آخر صيانة: {eq.lastMaintenance}</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {eq.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
               </div>
            </div>
          </div>
        )}

      </div>

      <DocumentScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* PACS Viewer Simulation Modal (12.5) */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-sm">معاين الأشعة التفاعلي (PACS DICOM Viewer)</h3>
                <p className="text-[10px] text-slate-400 font-mono">{selectedOrder?.docNumber} • {selectedOrder?.patientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white/20">
                 <Maximize2 className="w-4 h-4" /> Full Screen
               </button>
               <button className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700">
                 <Download className="w-4 h-4" /> Export DICOM
               </button>
            </div>
          </div>

          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-[80%] max-w-4xl aspect-square bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 flex items-center justify-center text-slate-800">
                  <Radio className="w-64 h-64 opacity-5" />
               </div>
               <div className="text-center space-y-4 relative z-10">
                  <ImageIcon className="w-16 h-16 text-indigo-500/50 mx-auto animate-pulse" />
                  <p className="text-indigo-300 font-mono text-sm font-black tracking-widest uppercase">DICOM IMAGE STACK: {activeImageIndex + 1} / 240</p>
                  <p className="text-slate-500 text-xs">High Resolution Medical Imaging Dataset (CT Head Axial)</p>
               </div>

               <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft className="w-6 h-6" />
               </button>
               <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-6 h-6" />
               </button>
            </div>

            {/* Side Tools */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-4">
               {[Maximize2, TrendingUp, Search, Settings].map((Icon, i) => (
                 <button key={i} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all shadow-xl">
                   <Icon className="w-5 h-5" />
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

function X({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
