'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Search,
  QrCode,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Printer,
  Sparkles,
  Download,
  Settings,
  ShieldCheck,
  Building,
  User,
  Check,
  X,
  RefreshCw,
  Activity,
  AlertTriangle,
  Info,
  Lock,
  ListTodo,
  Bell,
  BarChart3,
  KeyRound,
  ShieldAlert,
  Sliders,
  Calendar,
  Phone,
  FileSpreadsheet,
  CheckSquare,
  ListFilter,
  Eye,
  FileUp,
  Image as ImageIcon,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

import { DocumentScanner } from '../shared/DocumentScanner';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import {
  diagnosticService,
  DiagnosticOrderRecord,
  DiagnosticAnalyticsRecord,
  DiagnosticNotificationRecord,
  LaboratorySampleRecord
} from '../../services/diagnosticService';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { useAuth } from '@/auth';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

interface LabAssistantDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenLabManagerDashboard?: () => void;
}

export type PriorityLevel = 'normal' | 'urgent' | 'stat';
export type OrderStatus = 'pending' | 'in_progress' | 'completed';
export type SampleCondition = 'good' | 'clotted' | 'hemolyzed' | 'insufficient';

interface TestItem {
  id: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  refRange: string;
  value: string;
  isAbnormal?: boolean;
}

interface LabOrder {
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
  tests: TestItem[];
  clinicalInstructions?: string;
  pdfFileUrl?: string;
  sampleCondition?: SampleCondition;
  sampleReceivedTime?: string;
}

interface ManagerDirective {
  id: string;
  date: string;
  time: string;
  title: string;
  content: string;
  priority: 'high' | 'normal';
  author: string;
}

export const LabAssistantDashboard: React.FC<LabAssistantDashboardProps> = ({
  onBackToMainPlatform,
  onOpenLabManagerDashboard
}) => {
  const t = useTranslations('labAssistant');
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
    'dashboard' | 'orders' | 'order_details' | 'reception' | 'tasks' | 'notifications' | 'reports' | 'profile' | 'settings'
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

  // Diagnostic center ID resolution
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
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [samples, setSamples] = useState<LaboratorySampleRecord[]>([]);
  const [notifications, setNotifications] = useState<DiagnosticNotificationRecord[]>([]);
  const [analytics, setAnalytics] = useState<DiagnosticAnalyticsRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ListFilter States
  const [searchDocNumber, setSearchDocNumber] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // QR Modal Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const mapApiOrderToLabOrder = (apiOrder: any): LabOrder => ({
    id: String(apiOrder.id),
    docNumber: apiOrder.order_reference || `LAB-${apiOrder.id}`,
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
    priority: (apiOrder.priority as PriorityLevel) || 'normal',
    status: (apiOrder.status === 'finalized' || apiOrder.status === 'completed') ? 'completed' : (apiOrder.status === 'processing' || apiOrder.status === 'received') ? 'in_progress' : 'pending',
    clinicalInstructions: apiOrder.clinical_indication || '',
    sampleCondition: 'good',
    sampleReceivedTime: apiOrder.ordered_at ? new Date(apiOrder.ordered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    tests: (apiOrder.items || []).map((item: any) => ({
      id: String(item.id),
      nameAr: item.test_name,
      nameEn: item.test_name,
      unit: item.unit || '',
      refRange: item.reference_range || '',
      value: item.result_value || '',
      isAbnormal: Boolean(item.is_abnormal)
    }))
  });

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
        order_type: 'laboratory',
        search: debouncedSearch || undefined,
        status: apiStatus,
        page: currentPage,
        per_page: 20
      });
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiOrderToLabOrder);
        setOrders(mapped);
        if (mapped.length > 0 && !selectedOrder) {
          setSelectedOrder(mapped[0]);
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
      console.error('Failed to fetch laboratory orders:', err);
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

  // Fetch real operational analytics
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

  // Fetch samples for selected order
  const fetchOrderSamples = async (orderId: string) => {
    try {
      const res = await diagnosticService.getOrderSamples(orderId);
      if (res.data && Array.isArray(res.data)) {
        setSamples(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch order samples:', err);
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

  useEffect(() => {
    if (selectedOrder) {
      fetchOrderSamples(selectedOrder.id);
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

  // Comparison Matrix Drawer
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // New Reception Form State
  const [newRecDoc, setNewRecDoc] = useState('');
  const [newRecSampleType, setNewRecSampleType] = useState('دم وريدي (EDTA)');
  const [newRecCondition, setNewRecCondition] = useState<SampleCondition>('good');
  const [newRecNotes, setNewRecNotes] = useState('');

  // Unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Derived real directives from notifications
  const directives: ManagerDirective[] = useMemo(() => {
    return notifications
      .filter(n => n.type === 'directive')
      .map(n => ({
        id: n.id,
        date: new Date(n.created_at).toISOString().split('T')[0],
        time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: n.title,
        content: n.content,
        priority: n.severity === 'stat' ? 'high' : 'normal',
        author: n.author || t('directives.managerName')
      }));
  }, [notifications, t]);

  // Tabs Horizontal Carousel Ref & Handler
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const handleScrollTabs = (direction: 'left' | 'right') => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const scrollAmount = 240;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
  };

  // Handle Order Select
  const handleSelectOrder = (ord: LabOrder) => {
    setSelectedOrder(ord);
    setActiveTab('order_details');
  };

  // Handle Update Result Value
  const handleTestValueChange = (testId: string, val: string) => {
    if (!selectedOrder) return;
    const updatedTests = selectedOrder.tests.map(t => {
      if (t.id === testId) {
        let abnormal = false;
        if (t.nameEn.includes('Sugar') && parseFloat(val) > 126) abnormal = true;
        if (t.nameEn.includes('A1c') && parseFloat(val) > 6.0) abnormal = true;
        if (t.nameEn.includes('CRP') && parseFloat(val) > 5.0) abnormal = true;
        return { ...t, value: val, isAbnormal: abnormal };
      }
      return t;
    });

    const updatedOrder = { ...selectedOrder, tests: updatedTests };
    setSelectedOrder(updatedOrder);
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  // Handle Save Order Results via Real API
  const handleSaveResults = async (markCompleted: boolean = false) => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      for (const test of selectedOrder.tests) {
        if (test.value) {
          await diagnosticService.submitResult(test.id, {
            result_value: test.value,
            status: markCompleted ? 'resulted' : 'processing',
            unit: test.unit,
            reference_range: test.refRange,
          });
        }
      }
      alert(markCompleted ? (isRtl ? 'تم تسجيل وحفظ نتائج الفحوصات بنجاح' : 'Results submitted successfully') : (isRtl ? 'تم حفظ مسودة نتائج الفحوصات بنجاح' : 'Draft saved successfully'));
      
      const refRes = await diagnosticService.getOrder(selectedOrder.id);
      if (refRes.data) {
        const mapped = mapApiOrderToLabOrder(refRes.data);
        setSelectedOrder(mapped);
        setOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o));
      }
      if (centerId) {
        fetchAnalytics();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشلت عملية حفظ النتائج في الخادم' : 'Failed to save results to backend');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Add Reception Log via Real API
  const handleAddReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecDoc) {
      alert(t('alerts.fillRequired'));
      return;
    }
    const targetOrder = orders.find(
      o => o.docNumber.toUpperCase() === newRecDoc.toUpperCase() || o.id === newRecDoc
    );
    if (!targetOrder) {
      alert(isRtl ? 'الطلب غير موجود في قائمة الطلبات الواردة' : 'Order not found in incoming requisitions');
      return;
    }

    setIsSaving(true);
    try {
      const res = await diagnosticService.createSample(targetOrder.id, {
        sample_type: newRecSampleType || 'دم وريدي (EDTA)',
      });
      if (res.data) {
        setSamples(prev => [res.data, ...prev]);
        alert(isRtl ? `تم تسجيل واستلام العينة بنجاح برمز: ${res.data.sample_barcode}` : `Sample received with barcode: ${res.data.sample_barcode}`);
        setNewRecDoc('');
        setNewRecNotes('');
        if (centerId) {
          fetchAnalytics();
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشل تسجيل استلام العينة' : 'Failed to record sample reception');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Mark All Notifications as Read via Real API
  const handleMarkAllNotificationsRead = async () => {
    if (!centerId) return;
    try {
      await diagnosticService.markAllNotificationsRead(centerId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      alert(isRtl ? 'تم تحديد جميع الإشعارات كمرئية بنجاح' : 'All notifications marked as read');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'فشل تحديث الإشعارات' : 'Failed to mark notifications read');
      alert(`${isRtl ? 'خطأ' : 'Error'}: ${msg}`);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchPriority = priorityFilter === 'all' || o.priority === priorityFilter;
      return matchPriority;
    });
  }, [orders, priorityFilter]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    if (analytics) {
      return {
        newOrders: analytics.pending_orders,
        statOrders: analytics.stat_orders,
        completedToday: analytics.completed_orders,
        samplesReceived: analytics.samples_received ?? 0,
        testsCompleted: analytics.tests_completed ?? 0,
        avgTat: analytics.average_tat_minutes ? `${analytics.average_tat_minutes} ${t('reports.minutes')}` : t('reports.noTat'),
        acceptanceRate: analytics.acceptance_rate ? `${analytics.acceptance_rate}%` : t('reports.noAcceptanceRate'),
      };
    }
    return {
      newOrders: orders.filter(o => o.status === 'pending').length,
      statOrders: orders.filter(o => o.priority === 'stat').length,
      completedToday: orders.filter(o => o.status === 'completed').length,
      samplesReceived: samples.length,
      testsCompleted: orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.tests.length, 0),
      avgTat: t('reports.noTat'),
      acceptanceRate: t('reports.noAcceptanceRate'),
    };
  }, [analytics, orders, samples, t]);

  // Derived initials for authenticated user
  const userInitials = useMemo(() => {
    if (!user?.name) return 'LA';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }, [user?.name]);

  const centerName = user?.diagnostic_staff?.center?.name || t('defaultCenter');
  const managerName = user?.diagnostic_staff?.center?.manager?.name || t('profile.notAvailable');
  const employeeId = user?.diagnostic_staff ? `LAB-${user.diagnostic_staff.id.substring(0, 8).toUpperCase()}` : t('profile.notAvailable');
  const delegatedPerms = user?.diagnostic_staff?.permissions || [];

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Top Header / Context Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left / Brand Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {centerName}
                  </h1>
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {t('operationalStatus')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {user?.name || t('defaultUser')} • {managerName}
                </p>
              </div>
            </div>

            {/* Actions / Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComparisonModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                {t('permissionsButton')}
              </button>

              {onOpenLabManagerDashboard && (
                <button
                  onClick={onOpenLabManagerDashboard}
                  className="hidden md:flex items-center gap-1.5 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-2 rounded-xl border border-teal-200 transition-colors cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-teal-600" />
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

        {/* Carousel Navigation Tabs Bar */}
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
                { id: 'order_details', label: t('tabs.orderDetails') },
                { id: 'reception', label: t('tabs.reception') },
                { id: 'tasks', label: t('tabs.tasks') },
                { id: 'notifications', label: t('tabs.notifications'), count: unreadNotificationsCount },
                { id: 'reports', label: t('tabs.reports') },
                { id: 'profile', label: t('tabs.profile') },
                { id: 'settings', label: t('tabs.settings') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.id ? 'bg-white text-teal-700' : 'bg-rose-500 text-white'
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PAGE 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.newOrders')}</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{kpiStats.newOrders}</p>
                <span className="text-[11px] text-teal-600 font-bold mt-1 block">{t('kpi.pendingProcess')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.statOrders')}</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{kpiStats.statOrders}</p>
                <span className="text-[11px] text-rose-600 font-bold mt-1 block">{t('kpi.requireImmediate')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.completedToday')}</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{kpiStats.completedToday}</p>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">{t('kpi.resultsLogged')}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <span className="text-xs text-slate-500 block">{t('kpi.tat')}</span>
                <p className="text-2xl font-black text-cyan-700 mt-1">{kpiStats.avgTat}</p>
                <span className="text-[11px] text-cyan-700 font-bold mt-1 block">{t('kpi.highEfficiency')}</span>
              </div>
            </div>

            {/* Directives Banner */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>{t('directives.title')}</span>
                <span className="text-slate-400 font-normal">({managerName})</span>
              </div>
              {directives.length === 0 ? (
                <p className="text-xs text-amber-800 font-medium">
                  {isRtl ? 'لا توجد تعليمات موجهة حالياً من مدير المختبر' : 'No directives currently issued by laboratory management'}
                </p>
              ) : (
                <div className="space-y-2">
                  {directives.slice(0, 2).map(dir => (
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
                  className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                >
                  {t('table.viewAll')}
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs font-bold">{isRtl ? 'جارٍ تحميل الطلبات...' : 'Loading orders...'}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('emptyOrders')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t('table.docNumber')}</th>
                        <th className="py-2.5 px-3">{t('table.patient')}</th>
                        <th className="py-2.5 px-3">{t('table.tests')}</th>
                        <th className="py-2.5 px-3">{t('table.priority')}</th>
                        <th className="py-2.5 px-3">{t('table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {orders.slice(0, 5).map(ord => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-teal-700">{ord.docNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{ord.patientName}</p>
                            <p className="text-[10px] text-slate-400">{ord.mrn}</p>
                          </td>
                          <td className="py-3 px-3">{ord.tests.map(t => t.nameAr || t.nameEn).join(', ') || '—'}</td>
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
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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

        {/* PAGE 2: ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('orders.title')}</h2>
                  <p className="text-xs text-slate-500">{t('orders.description')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-teal-600" />
                    <span>{t('orders.scanQr')}</span>
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
                    placeholder={t('orders.searchPlaceholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-600"
                >
                  <option value="all">{t('priority.all')}</option>
                  <option value="stat">STAT</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-600"
                >
                  <option value="all">{t('status.all')}</option>
                  <option value="pending">{t('status.pending')}</option>
                  <option value="in_progress">{t('status.inProgress')}</option>
                  <option value="completed">{t('status.completed')}</option>
                </select>
              </div>

              {/* Orders Table */}
              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs font-bold">{isRtl ? 'جارٍ تحميل الطلبات...' : 'Loading orders...'}</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{t('emptyOrders')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">{t('table.docNumber')}</th>
                          <th className="py-3 px-3">{t('table.patient')}</th>
                          <th className="py-3 px-3">{t('table.doctor')}</th>
                          <th className="py-3 px-3">{t('table.tests')}</th>
                          <th className="py-3 px-3">{t('table.priority')}</th>
                          <th className="py-3 px-3">{t('table.status')}</th>
                          <th className="py-3 px-3">{t('table.action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                        {filteredOrders.map(ord => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-teal-700">{ord.docNumber}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{ord.patientName}</p>
                              <p className="text-[10px] text-slate-400">{ord.mrn}</p>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{ord.doctorName}</td>
                            <td className="py-3 px-3">{ord.tests.map(t => t.nameAr || t.nameEn).join(', ') || '—'}</td>
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
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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

        {/* PAGE 3: ORDER DETAILS & RESULTS ENTRY */}
        {activeTab === 'order_details' && (
          <div className="space-y-6">
            {!selectedOrder ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">{isRtl ? 'لم يتم تحديد طلب بعد' : 'No order selected yet'}</h3>
                <p className="text-xs text-slate-400">{isRtl ? 'يرجى تحديد طلب من قائمة الطلبات للبدء بإدخال النتائج' : 'Please select an order from the list to enter results'}</p>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-700 cursor-pointer"
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
                        {selectedOrder.priority === 'stat' && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">STAT</span>
                        )}
                        {selectedOrder.priority === 'urgent' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">Urgent</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('orderDetails.patient')}: <strong>{selectedOrder.patientName}</strong> • {selectedOrder.mrn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveResults(false)}
                        disabled={isSaving}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                        <span>{t('orderDetails.saveDraft')}</span>
                      </button>
                      <button
                        onClick={() => handleSaveResults(true)}
                        disabled={isSaving}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{t('orderDetails.completeOrder')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Doctor instructions */}
                  {selectedOrder.clinicalInstructions && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                      <span className="text-slate-500 font-bold block">{t('orderDetails.doctorInstructions')}:</span>
                      <p className="text-slate-800">{selectedOrder.clinicalInstructions}</p>
                    </div>
                  )}

                  {/* Tests table */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-slate-900">{t('orderDetails.testsTable')}</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3">{t('orderDetails.testName')}</th>
                            <th className="py-3 px-3">{t('orderDetails.resultValue')}</th>
                            <th className="py-3 px-3">{t('orderDetails.unit')}</th>
                            <th className="py-3 px-3">{t('orderDetails.refRange')}</th>
                            <th className="py-3 px-3">{t('orderDetails.status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                          {selectedOrder.tests.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">
                                {isRtl ? 'لا توجد فحوصات مدرجة في هذا الطلب' : 'No tests listed in this requisition'}
                              </td>
                            </tr>
                          ) : (
                            selectedOrder.tests.map(test => (
                              <tr key={test.id} className="hover:bg-slate-50">
                                <td className="py-3 px-3 font-bold text-slate-900">
                                  {test.nameAr || test.nameEn}
                                </td>
                                <td className="py-3 px-3">
                                  <input
                                    type="text"
                                    value={test.value}
                                    onChange={e => handleTestValueChange(test.id, e.target.value)}
                                    placeholder={t('orderDetails.valuePlaceholder')}
                                    className={`w-36 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border focus:outline-none ${
                                      test.isAbnormal
                                        ? 'border-rose-400 bg-rose-50 text-rose-800'
                                        : 'border-slate-300 bg-white text-slate-900 focus:border-teal-600'
                                    }`}
                                  />
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-600">{test.unit || '—'}</td>
                                <td className="py-3 px-3 font-mono text-slate-600">{test.refRange || '—'}</td>
                                <td className="py-3 px-3">
                                  {test.value ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                      {isRtl ? 'تم الإدخال' : 'Entered'}
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">
                                      {isRtl ? 'بانتظار النتيجة' : 'Pending'}
                                    </span>
                                  )}
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
          </div>
        )}

        {/* PAGE 4: SAMPLE RECEPTION */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.docNumber')}</label>
                    <input
                      type="text"
                      value={newRecDoc}
                      onChange={e => setNewRecDoc(e.target.value)}
                      placeholder={t('reception.docPlaceholder')}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{isRtl ? 'نوع العينة' : 'Sample Type'}</label>
                    <input
                      type="text"
                      value={newRecSampleType}
                      onChange={e => setNewRecSampleType(e.target.value)}
                      placeholder="e.g. EDTA, Serum"
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.conditionLabel')}</label>
                    <select
                      value={newRecCondition}
                      onChange={e => setNewRecCondition(e.target.value as SampleCondition)}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600"
                    >
                      <option value="good">🟢 {t('reception.conditionGood')}</option>
                      <option value="clotted">🔴 {t('reception.conditionClotted')}</option>
                      <option value="hemolyzed">🔴 {t('reception.conditionHemolyzed')}</option>
                      <option value="insufficient">🟠 {t('reception.conditionInsufficient')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">{t('reception.notesLabel')}</label>
                    <input
                      type="text"
                      value={newRecNotes}
                      onChange={e => setNewRecNotes(e.target.value)}
                      placeholder={t('reception.notesPlaceholder')}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{t('reception.submitButton')}</span>
                  </button>
                </div>
              </form>

              {/* Real Samples Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">{t('reception.logTitle')}</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">{isRtl ? 'رمز الباركود' : 'Barcode'}</th>
                        <th className="py-3 px-3">{isRtl ? 'نوع العينة' : 'Sample Type'}</th>
                        <th className="py-3 px-3">{t('reception.receivedTime')}</th>
                        <th className="py-3 px-3">{t('table.status')}</th>
                        <th className="py-3 px-3">{isRtl ? 'المستلم' : 'Received By'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                      {samples.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-bold text-slate-700">{t('emptySamples')}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {isRtl ? 'استخدم النموذج أعلاه لتسجيل العينات المستلمة الجديدة' : 'Use the form above to log received samples'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        samples.map(sample => (
                          <tr key={sample.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-teal-700">{sample.sample_barcode}</td>
                            <td className="py-3 px-3 font-medium text-slate-900">{sample.sample_type}</td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {sample.received_at ? new Date(sample.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                {sample.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {sample.receiver?.name || user?.name || '—'}
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
                  <p className="font-bold text-slate-700">{t('emptyTasks')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.filter(o => o.status !== 'completed').map(ord => (
                    <div key={ord.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-700">{ord.docNumber}</span>
                          <span className="font-bold text-slate-900">{ord.patientName}</span>
                          {ord.priority === 'stat' && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">STAT</span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-1">
                          {ord.tests.map(t => t.nameAr || t.nameEn).join(', ') || '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectOrder(ord)}
                        className="bg-teal-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-teal-700 cursor-pointer"
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
                  <Bell className="w-5 h-5 text-teal-600" />
                  {t('notifications.title')}
                </h2>
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs text-teal-700 hover:underline font-bold cursor-pointer"
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
                          {notif.severity === 'stat' ? t('notifications.urgentStat') : t('notifications.managerDirectives')}
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
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  {t('reports.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{t('reports.description')}</p>
              </div>

              {/* Financial Restriction Notice */}
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-teal-900">{t('reports.securityTitle')}</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed">{t('reports.securityDescription')}</p>
                </div>
              </div>

              {/* Real Analytics Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.totalSamplesWeek')}</span>
                  <p className="text-2xl font-black text-slate-900">
                    {t('reports.totalSamplesCount', { count: kpiStats.samplesReceived })}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold">{t('reports.receptionMetric')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.totalTestsCompleted')}</span>
                  <p className="text-2xl font-black text-teal-800">
                    {t('reports.totalTestsCount', { count: kpiStats.testsCompleted })}
                  </p>
                  <span className="text-[10px] text-teal-700 font-bold">{t('reports.distributionMetric')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.avgTAT')}</span>
                  <p className="text-2xl font-black text-cyan-800">{kpiStats.avgTat}</p>
                  <span className="text-[10px] text-cyan-700 font-bold">{t('reports.tatMetric')}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 block">{t('reports.acceptedSamplesRate')}</span>
                  <p className="text-2xl font-black text-emerald-800">{kpiStats.acceptanceRate}</p>
                  <span className="text-[10px] text-emerald-700 font-bold">{t('reports.qualityMetric')}</span>
                </div>
              </div>

              {/* Real Distribution from Server */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-900">{t('reports.distributionTitle')}</h3>
                {!analytics?.distribution || analytics.distribution.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">{t('reports.noDistribution')}</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.distribution.map((cat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-bold">{cat.name || 'General'}</span>
                          <span className="font-mono text-teal-800 font-bold">
                            {cat.percentage}% ({cat.count} {t('reports.testsSuffix')})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-600 h-full transition-all duration-300" style={{ width: `${cat.percentage}%` }} />
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
                <div className="w-16 h-16 rounded-2xl bg-teal-100 border-2 border-teal-300 flex items-center justify-center text-teal-800 font-black text-xl shadow-xs">
                  {userInitials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {user?.name || t('defaultUser')}
                  </h2>
                  <p className="text-xs text-teal-700 font-medium">
                    {user?.diagnostic_staff?.role_type || t('userRole')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('profile.employeeID')}: <span className="font-mono font-bold">{employeeId}</span> • {t('profile.department')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.directManager')}:</span>
                  <p className="font-bold text-slate-900">{managerName}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.shift')}:</span>
                  <p className="font-bold text-slate-900">{t('profile.shiftDefault')}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block">{t('profile.license')}:</span>
                  <p className="font-mono font-bold text-slate-700">{t('profile.licenseNotSet')}</p>
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

              {/* Dynamic Permissions Checklist */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                  {t('profile.permissionsTitle')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('lab.manage_orders') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('lab.manage_orders') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permReception')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permAdmin')}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('lab.view_orders') || delegatedPerms.includes('lab.manage_orders') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('lab.view_orders') || delegatedPerms.includes('lab.manage_orders') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permBrowseOrders')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permEquipment')}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${delegatedPerms.includes('lab.enter_results') ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {delegatedPerms.includes('lab.enter_results') ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>{t('profile.permEnterResults')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permStamp')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{isRtl ? 'الاعتماد النهائي للنتائج (ممنوع للمساعد)' : 'Final Approval (Forbidden)'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <X className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{t('profile.permDelete')}</span>
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

              {/* Restricted Settings Notice */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-amber-900">{t('settings.restrictedBoxTitle')}</p>
                <p className="text-amber-800 leading-relaxed">{t('settings.restrictedBoxDesc')}</p>
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
              <h3 className="text-sm font-bold text-slate-900">{t('comparisonModal.title')}</h3>
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
                    <th className="py-2.5 px-3">{t('comparisonModal.taskColumn')}</th>
                    <th className="py-2.5 px-3 text-center">{t('comparisonModal.managerColumn')}</th>
                    <th className="py-2.5 px-3 text-center">{t('comparisonModal.assistantColumn')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permReception')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.available')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.availableFull')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permEnterResults')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.available')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.policyDependent')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{isRtl ? 'الاعتماد النهائي للتحاليل' : 'Final Approval'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.finalApproval')}</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{t('comparisonModal.prohibited')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{t('profile.permAdmin')}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.adminPowers')}</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{t('comparisonModal.denied')}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">{isRtl ? 'التقارير المالية والمحاسبية' : 'Financial Reports'}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{t('comparisonModal.financialReports')}</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{t('comparisonModal.denied')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {t('comparisonModal.understandButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Document Scanner */}
      <DocumentScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
