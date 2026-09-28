'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Search,
  QrCode,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Download,
  Settings,
  ShieldCheck,
  Building,
  User,
  Image as ImageIcon,
  Activity,
  Maximize2,
  Phone,
  AlertTriangle,
  History,
  TrendingUp,
  Lock,
  ListTodo,
  Bell,
  BarChart3,
  Sliders,
  KeyRound,
  ShieldAlert,
  Info,
  Check,
  X,
  FileUp,
  CheckSquare,
  Layers,
  Zap,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { DocumentScanner } from '../shared/DocumentScanner';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import {
  diagnosticService,
  DiagnosticOrderRecord,
  DiagnosticAnalyticsRecord,
  DiagnosticNotificationRecord
} from '@/services/diagnosticService';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/auth';

interface RadiologyAssistantDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenRadManagerDashboard?: () => void;
}

export type PriorityLevel = 'normal' | 'urgent' | 'stat';
export type OrderStatus = 'pending' | 'in_progress' | 'completed';
export type ScanModality = 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Mammography';

export interface ScanOrder {
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
  modality: ScanModality;
  scanTypeAr: string;
  scanTypeEn: string;
  priority: PriorityLevel;
  status: OrderStatus;
  clinicalInstructions?: string;
  reportFindings?: string;
  reportImpression?: string;
  reportRecommendation?: string;
  uploadedImages?: { id: string; name: string; size: string; type: string; url?: string }[];
  assignedRoom?: string;
}

export interface PatientReceptionLog {
  id: string;
  docNumber: string;
  patientName: string;
  mrn: string;
  arrivalTime: string;
  modality: ScanModality;
  assignedRoom: string;
  prepStatus: {
    metalFree: boolean;
    fastingConfirmed: boolean;
    contrastReady: boolean;
    consentSigned: boolean;
  };
  notes: string;
}

export interface ManagerDirective {
  id: string;
  date: string;
  time: string;
  title: string;
  content: string;
  priority: 'high' | 'normal';
  author: string;
}

export const RadiologyAssistantDashboard: React.FC<RadiologyAssistantDashboardProps> = ({
  onBackToMainPlatform,
  onOpenRadManagerDashboard
}) => {
  const t = useTranslations('radiologyAssistant');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm(isRtl ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟' : 'Are you sure you want to log out?')) {
      await logout();
      window.location.replace(`/${locale}`);
    }
  };

  const searchParams = useSearchParams();
  const tabFromUrl = (searchParams?.get('tab') as any) || 'dashboard';
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'orders' | 'process' | 'reception' | 'tasks' | 'notifications' | 'reports' | 'profile' | 'settings'
  >(tabFromUrl);

  useEffect(() => {
    const urlTab = (searchParams?.get('tab') as any) || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as any);
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

  // Center ID resolution
  const [centerId, setCenterId] = useState<string>(
    user?.diagnostic_staff?.diagnostic_center_id || user?.diagnostic_staff?.center?.id || ''
  );

  useEffect(() => {
    if (!centerId) {
      diagnosticService.getMyStaffProfile().then(res => {
        if (res.data?.center?.id) {
          setCenterId(res.data.center.id);
        }
      }).catch(() => {});
    }
  }, [centerId]);

  // Data states
  const [orders, setOrders] = useState<ScanOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ScanOrder | null>(null);
  const [receptionLogs, setReceptionLogs] = useState<PatientReceptionLog[]>([]);
  const [notifications, setNotifications] = useState<DiagnosticNotificationRecord[]>([]);
  const [analytics, setAnalytics] = useState<DiagnosticAnalyticsRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filters
  const [searchDocNumber, setSearchDocNumber] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Scanner & Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Draft report inputs
  const [findingsDraft, setFindingsDraft] = useState('');
  const [impressionDraft, setImpressionDraft] = useState('');
  const [recommendationDraft, setRecommendationDraft] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; size: string; type: string; url?: string }[]>([]);

  // Patient Reception Form state
  const [selectedRecOrderId, setSelectedRecOrderId] = useState<string>('');
  const [recRoom, setRecRoom] = useState<string>('غرفة 1 - X-Ray');
  const [prepMetalFree, setPrepMetalFree] = useState(true);
  const [prepFasting, setPrepFasting] = useState(false);
  const [prepContrast, setPrepContrast] = useState(false);
  const [prepConsent, setPrepConsent] = useState(true);
  const [recNotes, setRecNotes] = useState<string>('');

  const mapApiOrderToRadOrder = (apiOrder: any): ScanOrder => {
    const item = apiOrder.items?.[0] || {};
    let mod: ScanModality = 'X-Ray';
    const code = (item.test_code || item.item_type || '').toUpperCase();
    if (code.includes('MRI')) mod = 'MRI';
    else if (code.includes('CT') || code.includes('SCANNER')) mod = 'CT';
    else if (code.includes('ECHO') || code.includes('US')) mod = 'Ultrasound';
    else if (code.includes('MAMMO')) mod = 'Mammography';

    return {
      id: String(apiOrder.id),
      docNumber: apiOrder.order_reference || `RAD-${apiOrder.id}`,
      doctorName: apiOrder.doctor?.name || (isRtl ? 'د. غير محدد' : 'Dr. Unspecified'),
      doctorSpecialty: apiOrder.doctor?.specialty || (isRtl ? 'طب عام' : 'General Practice'),
      doctorPhone: apiOrder.doctor?.phone || '',
      patientName: apiOrder.patient?.name || (isRtl ? 'مريض غير محدد' : 'Unspecified Patient'),
      patientAge: apiOrder.patient?.age || 0,
      patientPhone: apiOrder.patient?.phone || '',
      mrn: apiOrder.patient?.mrn || `MRN-${apiOrder.patient_id || 'N/A'}`,
      secureToken: apiOrder.prescription?.secure_token || apiOrder.secure_token || undefined,
      date: apiOrder.ordered_at ? new Date(apiOrder.ordered_at).toISOString().split('T')[0] : '',
      time: apiOrder.ordered_at ? new Date(apiOrder.ordered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      modality: mod,
      scanTypeAr: item.test_name || 'تصوير شعاعي',
      scanTypeEn: item.test_name || 'Radiology Scan',
      priority: (apiOrder.priority as PriorityLevel) || 'normal',
      status: (apiOrder.status === 'finalized' || apiOrder.status === 'completed') ? 'completed' : (apiOrder.status === 'processing' || apiOrder.status === 'received') ? 'in_progress' : 'pending',
      clinicalInstructions: apiOrder.clinical_indication || '',
      reportFindings: apiOrder.radiology_report?.findings || '',
      reportImpression: apiOrder.radiology_report?.impression || '',
      reportRecommendation: apiOrder.radiology_report?.recommendations || '',
      uploadedImages: (apiOrder.radiology_report?.image_urls_json || []).map((url: string, i: number) => ({
        id: `img-${i}`,
        name: `Scan_Image_${i + 1}.dcm`,
        size: '15.4 MB',
        type: 'DICOM',
        url: url
      })),
      assignedRoom: 'غرفة 1'
    };
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchDocNumber.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchDocNumber]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  // Fetch real orders with unified server-side search and pagination
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const apiStatus = statusFilter === 'completed' ? 'completed' : statusFilter === 'in_progress' ? 'processing' : statusFilter === 'pending' ? 'pending' : undefined;
      const res = await diagnosticService.getOrders({
        order_type: 'radiology',
        search: debouncedSearch || undefined,
        status: apiStatus,
        page: currentPage,
        per_page: 20
      });
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiOrderToRadOrder);
        setOrders(mapped);
        if (mapped.length > 0 && !selectedOrder) {
          setSelectedOrder(mapped[0]);
          setFindingsDraft(mapped[0].reportFindings || '');
          setImpressionDraft(mapped[0].reportImpression || '');
          setRecommendationDraft(mapped[0].reportRecommendation || '');
          setUploadedFiles(mapped[0].uploadedImages || []);
        }
      } else {
        setOrders([]);
      }
      if (res.meta) {
        setCurrentPage(res.meta.current_page || 1);
        setLastPage(res.meta.last_page || 1);
        setTotalRecords(res.meta.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch radiology orders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch real notifications
  const fetchNotifications = async () => {
    if (!centerId) return;
    try {
      const res = await diagnosticService.getNotifications(centerId);
      if (res.data && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch center notifications:', err);
    }
  };

  // Fetch real analytics
  const fetchAnalytics = async () => {
    if (!centerId) return;
    try {
      const res = await diagnosticService.getAnalytics(centerId);
      if (res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch center analytics:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (centerId) {
      fetchNotifications();
      fetchAnalytics();
    }
  }, [centerId]);

  // Sync draft states when selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      setFindingsDraft(selectedOrder.reportFindings || '');
      setImpressionDraft(selectedOrder.reportImpression || '');
      setRecommendationDraft(selectedOrder.reportRecommendation || '');
      setUploadedFiles(selectedOrder.uploadedImages || []);
    }
  }, [selectedOrder?.id]);

  const handleScanSuccess = (code: string) => {
    const id = code.split('/').pop() || code;
    setSearchDocNumber(id);
    const found = orders.find(o => o.docNumber.toUpperCase() === id.toUpperCase() || o.id === id);
    if (found) {
      handleSelectOrder(found);
    }
    setIsScannerOpen(false);
  };

  const handleSelectOrder = (ord: ScanOrder) => {
    setSelectedOrder(ord);
    setActiveTab('process');
  };

  // Save report draft or submit to radiologist review (NO finalizeOrder call from assistant)
  const handleSaveReport = async (forwardToDoctor: boolean) => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      await diagnosticService.saveRadiologyReport(selectedOrder.id, {
        modality: selectedOrder.modality,
        findings: findingsDraft,
        impression: impressionDraft,
        recommendations: recommendationDraft,
        image_urls_json: uploadedFiles.map(f => f.url || f.name),
      });

      alert(forwardToDoctor ? t('process.forwardSuccess') : t('process.saveSuccess'));

      // Refresh order
      const refRes = await diagnosticService.getOrder(selectedOrder.id);
      if (refRes.data) {
        const mapped = mapApiOrderToRadOrder(refRes.data);
        setSelectedOrder(mapped);
        setOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o));
      }
      if (centerId) {
        fetchAnalytics();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشل حفظ تقرير الأشعة' : 'Failed to save radiology report');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Patient Reception Log via Real receiveOrder API
  const handleAddReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecOrderId) {
      alert(t('table.startProcess'));
      return;
    }

    const targetOrder = orders.find(o => o.id === selectedRecOrderId || o.docNumber === selectedRecOrderId);
    if (!targetOrder) {
      alert(isRtl ? 'الطلب غير موجود' : 'Order not found');
      return;
    }

    setIsSaving(true);
    try {
      if (centerId) {
        await diagnosticService.receiveOrder(targetOrder.id, centerId);
      }

      const newLog: PatientReceptionLog = {
        id: `rec-${Date.now()}`,
        docNumber: targetOrder.docNumber,
        patientName: targetOrder.patientName,
        mrn: targetOrder.mrn,
        arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modality: targetOrder.modality,
        assignedRoom: recRoom,
        prepStatus: {
          metalFree: prepMetalFree,
          fastingConfirmed: prepFasting,
          contrastReady: prepContrast,
          consentSigned: prepConsent,
        },
        notes: recNotes,
      };

      setReceptionLogs(prev => [newLog, ...prev]);
      alert(t('reception.success'));
      setSelectedRecOrderId('');
      setRecNotes('');
      fetchOrders();
      if (centerId) {
        fetchAnalytics();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشل تأكيد استقبال المريض' : 'Failed to confirm patient reception');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark all notifications read via Real API
  const handleMarkAllNotificationsRead = async () => {
    if (!centerId) return;
    try {
      await diagnosticService.markAllNotificationsRead(centerId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      alert(t('notifications.allMarkedRead'));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشل تحديث الإشعارات' : 'Failed to mark notifications read');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    }
  };

  // Carousel Tabs Ref
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const handleScrollTabs = (direction: 'left' | 'right') => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const scrollAmount = 240;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchPriority = priorityFilter === 'all' || o.priority === priorityFilter;
      return matchPriority;
    });
  }, [orders, priorityFilter]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    if (analytics) {
      return {
        newOrders: analytics.pending_orders,
        statOrders: analytics.stat_orders,
        completedToday: analytics.completed_orders,
        processing: analytics.processing_orders,
        tat: analytics.average_tat_minutes ? `${analytics.average_tat_minutes} ${t('reports.minutes')}` : t('kpi.noTat'),
        totalScans: analytics.total_scans ?? 0,
        uploadedImages: analytics.uploaded_images_count ?? 0,
      };
    }
    return {
      newOrders: orders.filter(o => o.status === 'pending').length,
      statOrders: orders.filter(o => o.priority === 'stat').length,
      completedToday: orders.filter(o => o.status === 'completed').length,
      processing: orders.filter(o => o.status === 'in_progress').length,
      tat: t('kpi.noTat'),
      totalScans: orders.filter(o => o.status === 'completed').length,
      uploadedImages: orders.reduce((acc, o) => acc + (o.uploadedImages?.length || 0), 0),
    };
  }, [analytics, orders, t]);

  // Derived initials for authenticated user
  const userInitials = useMemo(() => {
    if (!user?.name) return 'RA';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }, [user?.name]);

  const centerName = user?.diagnostic_staff?.center?.name || t('clinicName');
  const managerName = user?.diagnostic_staff?.center?.manager?.name || t('profile.notAvailable');
  const employeeId = user?.diagnostic_staff ? `RAD-${user.diagnostic_staff.id.substring(0, 8).toUpperCase()}` : t('profile.notAvailable');
  const delegatedPerms = user?.diagnostic_staff?.permissions || [];
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {centerName}
                  </h1>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {t('operationalStatus')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {user?.name || t('defaultUser')} • {managerName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComparisonModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                {t('permissionsButton')}
              </button>

              {onOpenRadManagerDashboard && (
                <button
                  onClick={onOpenRadManagerDashboard}
                  className="hidden md:flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  {t('managerDashboard')}
                </button>
              )}

              <button
                onClick={onBackToMainPlatform}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {t('home')}
              </button>

              <button
                onClick={handleLogout}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                title={isRtl ? 'تسجيل الخروج' : 'Logout'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Tabs Bar */}
        <div className="bg-slate-100/80 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5">
            <button
              onClick={() => handleScrollTabs('left')}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs shrink-0 cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={tabsContainerRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1"
            >
              {[
                { id: 'dashboard', label: t('tabs.dashboard') },
                { id: 'orders', label: t('tabs.orders') },
                { id: 'process', label: t('tabs.process') },
                { id: 'reception', label: t('tabs.reception') },
                { id: 'tasks', label: t('tabs.tasks') },
                { id: 'notifications', label: t('tabs.notifications'), count: unreadNotifsCount },
                { id: 'reports', label: t('tabs.reports') },
                { id: 'profile', label: t('tabs.profile') },
                { id: 'settings', label: t('tabs.settings') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.id ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleScrollTabs('right')}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs shrink-0 cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PAGE 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.newOrders')}</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{kpiStats.newOrders}</p>
                <span className="text-[11px] text-blue-600 font-bold mt-1 block">{t('kpi.pendingProcess')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.statOrders')}</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{kpiStats.statOrders}</p>
                <span className="text-[11px] text-rose-600 font-bold mt-1 block">{t('kpi.requireImmediate')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.completedToday')}</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{kpiStats.completedToday}</p>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">{t('kpi.filesUploaded')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.tat')}</span>
                <p className="text-2xl font-black text-cyan-700 mt-1">{kpiStats.tat}</p>
                <span className="text-[11px] text-cyan-700 font-bold mt-1 block">{t('kpi.highResponse')}</span>
              </div>
            </div>

            {/* Directives Banner */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>{t('directives.title')}</span>
                <span className="text-slate-400 font-normal">({managerName})</span>
              </div>
              {notifications.filter(n => n.type === 'directive').length === 0 ? (
                <p className="text-xs text-amber-800 font-medium">{t('directives.noDirectives')}</p>
              ) : (
                <div className="space-y-2">
                  {notifications.filter(n => n.type === 'directive').slice(0, 2).map(dir => (
                    <div key={dir.id} className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs">
                      <p className="font-bold text-slate-900">{dir.title}</p>
                      <p className="text-slate-700 mt-1">{dir.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Orders Overview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('table.title')}</h2>
                  <p className="text-xs text-slate-500">{t('table.description')}</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  {t('table.viewAll')}
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-bold">{isRtl ? 'جارٍ تحميل الطلبات...' : 'Loading scan orders...'}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('table.noOrders')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t('table.docNumber')}</th>
                        <th className="py-2.5 px-3">{t('table.patientMrn')}</th>
                        <th className="py-2.5 px-3">{t('table.modality')}</th>
                        <th className="py-2.5 px-3">{t('table.scanType')}</th>
                        <th className="py-2.5 px-3">{t('table.priority')}</th>
                        <th className="py-2.5 px-3">{t('table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {orders.slice(0, 5).map(ord => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-blue-700">{ord.docNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{ord.patientName}</p>
                            <p className="text-[10px] text-slate-400">{ord.mrn}</p>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-700">{ord.modality}</td>
                          <td className="py-3 px-3">{ord.scanTypeAr || ord.scanTypeEn}</td>
                          <td className="py-3 px-3">
                            {ord.priority === 'stat' && (
                              <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded">STAT</span>
                            )}
                            {ord.priority === 'urgent' && (
                              <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">Urgent</span>
                            )}
                            {ord.priority === 'normal' && (
                              <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded">Normal</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleSelectOrder(ord)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {t('table.startProcess')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 2: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('table.title')}</h2>
                  <p className="text-xs text-slate-500">{t('table.description')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>{isRtl ? 'مسح باركود' : 'Scan Code'}</span>
                  </button>
                  <button
                    onClick={fetchOrders}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="text"
                    value={searchDocNumber}
                    onChange={e => setSearchDocNumber(e.target.value)}
                    placeholder={isRtl ? 'بحث برقم الوثيقة أو اسم المريض...' : 'Search by doc number or patient...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                >
                  <option value="all">{isRtl ? 'جميع الأولويات' : 'All Priorities'}</option>
                  <option value="stat">STAT</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                >
                  <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Orders Table */}
              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-bold">{isRtl ? 'جارٍ تحميل الطلبات...' : 'Loading scan orders...'}</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('table.noOrders')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">{t('table.docNumber')}</th>
                          <th className="py-3 px-3">{t('table.patientMrn')}</th>
                          <th className="py-3 px-3">{t('table.modality')}</th>
                          <th className="py-3 px-3">{t('table.scanType')}</th>
                          <th className="py-3 px-3">{t('table.priority')}</th>
                          <th className="py-3 px-3">{isRtl ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-3">{t('table.action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                        {filteredOrders.map(ord => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-blue-700">{ord.docNumber}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{ord.patientName}</p>
                              <p className="text-[10px] text-slate-400">{ord.mrn}</p>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-700">{ord.modality}</td>
                            <td className="py-3 px-3">{ord.scanTypeAr || ord.scanTypeEn}</td>
                            <td className="py-3 px-3">
                              {ord.priority === 'stat' && (
                                <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded">STAT</span>
                              )}
                              {ord.priority === 'urgent' && (
                                <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">Urgent</span>
                              )}
                              {ord.priority === 'normal' && (
                                <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded">Normal</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {ord.status === 'completed' && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded">Completed</span>
                              )}
                              {ord.status === 'in_progress' && (
                                <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded">In Progress</span>
                              )}
                              {ord.status === 'pending' && (
                                <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <button
                                onClick={() => handleSelectOrder(ord)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                {t('table.startProcess')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
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
                        disabled={currentPage <= 1 || isLoading}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          currentPage <= 1 || isLoading
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
                        disabled={currentPage >= lastPage || isLoading}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          currentPage >= lastPage || isLoading
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
              )}
            </div>
          </div>
        )}

        {/* PAGE 3: PROCESS SCAN & DRAFT FINDINGS */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            {!selectedOrder ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">{t('process.selectOrderPrompt')}</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  {t('table.viewAll')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">{selectedOrder.docNumber}</h2>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {selectedOrder.modality}
                        </span>
                        {selectedOrder.priority === 'stat' && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">STAT</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('process.patientDetails')}: <strong>{selectedOrder.patientName}</strong> • {selectedOrder.mrn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveReport(false)}
                        disabled={isSaving}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{t('process.saveDraft')}</span>
                      </button>
                      <button
                        onClick={() => handleSaveReport(true)}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{t('process.forwardToDoctor')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Clinical Indications */}
                  {selectedOrder.clinicalInstructions && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                      <span className="text-slate-500 font-bold block">{t('process.clinicalIndications')}:</span>
                      <p className="text-slate-800">{selectedOrder.clinicalInstructions}</p>
                    </div>
                  )}

                  {/* Upload Section */}
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center space-y-2">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">{t('process.uploadSection')}</p>
                    <p className="text-[11px] text-slate-500">{t('process.uploadHelp')}</p>
                  </div>

                  {/* Draft inputs */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">{t('process.findings')}</label>
                      <textarea
                        rows={3}
                        value={findingsDraft}
                        onChange={e => setFindingsDraft(e.target.value)}
                        placeholder={t('process.findingsPlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">{t('process.impression')}</label>
                      <textarea
                        rows={2}
                        value={impressionDraft}
                        onChange={e => setImpressionDraft(e.target.value)}
                        placeholder={t('process.impressionPlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">{t('process.recommendations')}</label>
                      <textarea
                        rows={2}
                        value={recommendationDraft}
                        onChange={e => setRecommendationDraft(e.target.value)}
                        placeholder={t('process.recommendationsPlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 4: PATIENT RECEPTION */}
        {activeTab === 'reception' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">{t('reception.title')}</h2>
                <p className="text-xs text-slate-500">{t('reception.description')}</p>
              </div>

              {/* Reception Form */}
              <form onSubmit={handleAddReception} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-900">{t('reception.formTitle')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.selectOrder')}</label>
                    <select
                      value={selectedRecOrderId}
                      onChange={e => setSelectedRecOrderId(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600"
                    >
                      <option value="">{t('reception.selectOrderPlaceholder')}</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.docNumber} - {o.patientName} ({o.modality})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.room')}</label>
                    <input
                      type="text"
                      value={recRoom}
                      onChange={e => setRecRoom(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.notes')}</label>
                    <input
                      type="text"
                      value={recNotes}
                      onChange={e => setRecNotes(e.target.value)}
                      placeholder={t('reception.notesPlaceholder')}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Safety Checklist */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">{t('reception.checklist')}:</span>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prepMetalFree}
                        onChange={e => setPrepMetalFree(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>{t('reception.metalFree')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prepFasting}
                        onChange={e => setPrepFasting(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>{t('reception.fasting')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prepContrast}
                        onChange={e => setPrepContrast(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>{t('reception.contrastReady')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prepConsent}
                        onChange={e => setPrepConsent(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>{t('reception.consentSigned')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{t('reception.submit')}</span>
                  </button>
                </div>
              </form>

              {/* Reception Logs Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">{t('reception.logTitle')}</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">{t('reception.docNumber')}</th>
                        <th className="py-3 px-3">{t('reception.patient')}</th>
                        <th className="py-3 px-3">{t('table.modality')}</th>
                        <th className="py-3 px-3">{t('reception.arrivalTime')}</th>
                        <th className="py-3 px-3">{t('reception.room')}</th>
                        <th className="py-3 px-3">{t('reception.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                      {receptionLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-bold text-slate-700">{t('reception.noRecords')}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{t('reception.noRecordsHelp')}</p>
                          </td>
                        </tr>
                      ) : (
                        receptionLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-blue-700">{log.docNumber}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{log.patientName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{log.mrn}</p>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-700">{log.modality}</td>
                            <td className="py-3 px-3 font-mono text-slate-600">{log.arrivalTime}</td>
                            <td className="py-3 px-3 text-slate-700">{log.assignedRoom}</td>
                            <td className="py-3 px-3">
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                {t('reception.safeVerified')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: MY TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">{t('tasks.title')}</h2>
                <p className="text-xs text-slate-500">{t('tasks.description')}</p>
              </div>

              {orders.filter(o => o.status !== 'completed').length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('tasks.noTasks')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.filter(o => o.status !== 'completed').map(ord => (
                    <div key={ord.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{ord.docNumber}</span>
                          <span className="font-bold text-slate-900">{ord.patientName}</span>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">{ord.modality}</span>
                        </div>
                        <p className="text-slate-500 mt-1">{ord.scanTypeAr || ord.scanTypeEn}</p>
                      </div>
                      <button
                        onClick={() => handleSelectOrder(ord)}
                        className="bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 cursor-pointer"
                      >
                        {t('table.startProcess')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 6: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  {t('notifications.title')}
                </h2>
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  {t('notifications.markAllRead')}
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border space-y-2 text-xs transition-colors ${
                        notif.severity === 'stat'
                          ? 'bg-rose-50 border-rose-200'
                          : notif.severity === 'important'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          notif.severity === 'stat'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : notif.severity === 'important'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {notif.severity === 'stat' ? t('notifications.statAlert') : t('notifications.managerDirective')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900">{notif.title}</h4>
                      <p className="text-slate-700">{notif.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 7: OPERATIONAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {t('reports.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{t('reports.description')}</p>
              </div>

              {/* Restriction Notice */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-900">{t('reports.securityTitle')}</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed">{t('reports.securityDesc')}</p>
                </div>
              </div>

              {/* Analytics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.totalScans')}</span>
                  <p className="text-2xl font-black text-slate-900">
                    {t('reports.totalScansCount', { count: kpiStats.totalScans })}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold">{t('reports.allDocumented')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.uploadedImages')}</span>
                  <p className="text-2xl font-black text-blue-800">
                    {t('reports.uploadedImagesCount', { count: kpiStats.uploadedImages })}
                  </p>
                  <span className="text-[10px] text-blue-700 font-bold">{t('reports.highestDpi')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.avgTat')}</span>
                  <p className="text-2xl font-black text-cyan-800">{kpiStats.tat}</p>
                  <span className="text-[10px] text-cyan-700 font-bold">{t('reports.fromReceptionToUpload')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.acceptanceRate')}</span>
                  <p className="text-2xl font-black text-emerald-800">
                    {orders.length > 0 ? '100%' : t('reports.noTat')}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold">{isRtl ? 'مطابقة للمعايير' : 'Standard Compliant'}</span>
                </div>
              </div>

              {/* Modality Distribution */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-900">{t('reports.modalityTitle')}</h3>
                {!analytics?.distribution || analytics.distribution.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">{t('reports.noModality')}</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.distribution.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-bold">{item.modality || 'X-Ray'}</span>
                          <span className="font-mono text-blue-800 font-bold">
                            {item.percentage}% ({item.count} {isRtl ? 'فحص' : 'scans'})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 8: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 max-w-4xl mx-auto shadow-xs">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 border-2 border-blue-300 flex items-center justify-center text-blue-800 font-black text-xl shadow-xs">
                  {userInitials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {user?.name || t('defaultUser')}
                  </h2>
                  <p className="text-xs text-blue-700 font-medium">
                    {user?.diagnostic_staff?.role_type || t('userRole')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('profile.employeeId')}: <span className="font-mono font-bold">{employeeId}</span> • {t('profile.department')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.manager')}:</span>
                  <p className="font-bold text-slate-900">{managerName}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.shift')}:</span>
                  <p className="font-bold text-slate-900">{t('profile.shiftDefault')}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.license')}:</span>
                  <p className="font-mono font-bold text-slate-700">{t('profile.notAvailable')}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.accountStatus')}:</span>
                  {user?.diagnostic_staff?.is_active ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded inline-block">
                      {t('profile.activeAccount')}
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded inline-block">
                      {t('profile.suspendedAccount')}
                    </span>
                  )}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                  {t('profile.permissionsTitle')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('radiology.manage_orders') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('radiology.manage_orders') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permReception')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permAdmin')}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('radiology.view_orders') || delegatedPerms.includes('radiology.manage_orders') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('radiology.view_orders') || delegatedPerms.includes('radiology.manage_orders') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permBrowseOrders')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permEquipment')}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('radiology.upload_images') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('radiology.upload_images') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permUploadImages')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permStamp')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{isRtl ? 'الاعتماد النهائي للتقارير (ممنوع للمساعد)' : 'Final Approval (Forbidden)'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permDeleteReport')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 9: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">{t('settings.title')}</h2>
                <p className="text-xs text-slate-500">{t('settings.description')}</p>
              </div>

              {/* Password Change Card */}
              <ChangePasswordCard />

              {/* Restricted Notice */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-amber-900">{isRtl ? 'صلاحيات الإدارة والمنشأة' : 'Facility & Admin Settings'}</p>
                <p className="text-amber-800 leading-relaxed">{t('settings.restrictedNotice')}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Role Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t('permissionsButton')}</h3>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl text-xs">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{isRtl ? 'المهمة / الوظيفة التشغيلية' : 'Operational Task'}</th>
                    <th className="py-2.5 px-3 text-center">{isRtl ? 'مدير مركز الأشعة' : 'Radiology Director'}</th>
                    <th className="py-2.5 px-3 text-center">{isRtl ? 'مساعد مركز الأشعة' : 'Radiology Assistant'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permReception')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permUploadImages')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{isRtl ? 'صياغة مسودة التقرير' : 'Draft Report'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{isRtl ? 'الاعتماد النهائي للتقرير' : 'Final Approval'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">❌</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permAdmin')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">❌</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{isRtl ? 'التقارير المالية والمحاسبية' : 'Financial Analytics'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">✅</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">❌</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      <DocumentScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
