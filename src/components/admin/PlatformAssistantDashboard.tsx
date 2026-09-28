'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileCheck,
  ShieldCheck,
  Headphones,
  Bell,
  BarChart2,
  Clock,
  User,
  Settings,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ListFilter,
  Plus,
  ArrowRight,
  Send,
  Eye,
  FileText,
  Lock,
  Unlock,
  RefreshCw,
  TrendingUp,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Sliders,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Globe,
  Info,
  QrCode,
  CreditCard,
  Building
} from 'lucide-react';

import { DocumentScanner } from '../shared/DocumentScanner';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

import { authService, UserProfile } from '@/services/authService';
import { adminService, AdminDoctorItem, AdminBookingCenterItem, AdminAuditLogItem } from '@/services/adminService';
import { PackagePurchaseRequestItem } from '@/services/bookingCenterService';
import {
  AssistantPermissions,
  DEFAULT_NO_PERMISSIONS,
  mapBackendPermissionsToUI,
} from '@/constants/permissions';

export type { AssistantPermissions };
export { DEFAULT_NO_PERMISSIONS };

interface PlatformAssistantDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenAdminDashboard: () => void;
}

export type AssistantTab =
  | 'dashboard'
  | 'requests'
  | 'verification'
  | 'support'
  | 'notifications'
  | 'reports'
  | 'activity'
  | 'profile'
  | 'settings';

export function PlatformAssistantDashboard({
  onBackToMainPlatform,
  onOpenAdminDashboard,
}: PlatformAssistantDashboardProps) {
  const t = useTranslations('assistant');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = (searchParams?.get('tab') as AssistantTab) || 'dashboard';
  const [activeTab, setActiveTab] = useState<AssistantTab>(tabFromUrl);

  useEffect(() => {
    const urlTab = (searchParams?.get('tab') as AssistantTab) || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as AssistantTab);
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<AssistantPermissions>(DEFAULT_NO_PERMISSIONS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctorItem[]>([]);
  const [pendingBookingCenters, setPendingBookingCenters] = useState<AdminBookingCenterItem[]>([]);
  const [packageRequests, setPackageRequests] = useState<PackagePurchaseRequestItem[]>([]);
  const [requestSubTab, setRequestSubTab] = useState<'doctors' | 'packages' | 'booking_centers'>('doctors');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch real data on mount & hydrate effective permissions
  useEffect(() => {
    let isMounted = true;

    const fetchAssistantData = async () => {
      setIsLoading(true);
      try {
        // 1. Current Profile & Dynamic Permission Hydration
        try {
          const user = await authService.me();
          if (isMounted) {
            setCurrentUser(user);
            const userPerms = Array.isArray(user?.permissions)
              ? user.permissions
              : (Array.isArray(user?.scoped_permissions) ? user.scoped_permissions : []);
            setPermissions(mapBackendPermissionsToUI(userPerms));
          }
        } catch (e) {
          console.warn('Auth user fetch error in AssistantDashboard:', e);
        }

        // 2. Pending Doctors
        try {
          const docRes = await adminService.getDoctors();
          if (isMounted && docRes.data && Array.isArray(docRes.data)) {
            setPendingDoctors(docRes.data.filter(d => !d.is_verified));
          }
        } catch (e) {
          console.warn('Pending doctors fetch error in AssistantDashboard:', e);
        }

        // 2.5. Pending Booking Centers
        try {
          const bcRes = await adminService.getBookingCenters({ status: 'pending', page: 1, per_page: 20 });
          if (isMounted && bcRes.data && Array.isArray(bcRes.data)) {
            setPendingBookingCenters(bcRes.data);
          }
        } catch (e) {
          console.warn('Pending booking centers fetch error in AssistantDashboard:', e);
        }

        // 3. Package Purchase Requests
        try {
          const pkgRes = await adminService.getPackagePurchaseRequests();
          if (isMounted && pkgRes.data && Array.isArray(pkgRes.data)) {
            setPackageRequests(pkgRes.data);
          }
        } catch (e) {
          console.warn('Package requests fetch error in AssistantDashboard:', e);
        }

        // 4. Audit Logs
        try {
          const auditRes = await adminService.getAuditLogs();
          if (isMounted && auditRes.data && Array.isArray(auditRes.data)) {
            setAuditLogs(auditRes.data);
          }
        } catch (e) {
          console.warn('Audit logs fetch error in AssistantDashboard:', e);
        }

      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAssistantData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprovePackageRequest = async (req: PackagePurchaseRequestItem) => {
    try {
      const res = await adminService.approvePackagePurchaseRequest(req.id);
      if (res.data) {
        setAlertMessage({
          type: 'success',
          text: isRtl ? `تم اعتماد طلب الشراء (${req.request_reference}) بنجاح وشحن الرصيد.` : `Request ${req.request_reference} approved!`,
        });
        const updatedRes = await adminService.getPackagePurchaseRequests();
        if (updatedRes.data) setPackageRequests(updatedRes.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'تم رفض الوصول: ليس لديك الصلاحية المطلوبة (platform.approve_requests)' : 'Access Denied: Missing platform.approve_requests permission');
      setAlertMessage({ type: 'error', text: msg });
    }
  };

  const handleRejectPackageRequest = async (req: PackagePurchaseRequestItem) => {
    const reason = prompt(isRtl ? 'يرجى إدخال سبب رفض طلب الشراء:' : 'Please enter rejection reason:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await adminService.rejectPackagePurchaseRequest(req.id, reason.trim());
      if (res.data) {
        setAlertMessage({
          type: 'success',
          text: isRtl ? `تم رفض طلب الشراء (${req.request_reference}) وتوثيق السبب.` : `Request ${req.request_reference} rejected.`,
        });
        const updatedRes = await adminService.getPackagePurchaseRequests();
        if (updatedRes.data) setPackageRequests(updatedRes.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'تم رفض الوصول: ليس لديك الصلاحية المطلوبة' : 'Access Denied');
      setAlertMessage({ type: 'error', text: msg });
    }
  };

  const triggerAccessDenied = (requiredPermissionName: string) => {
    setAlertMessage({
      type: 'error',
      text: `${isRtl ? 'تم رفض الوصول (Access Denied): ليس لديك الصلاحية المطلوبة' : 'Access Denied: You do not possess the required permission'} [${requiredPermissionName}].`,
    });
  };

  const handleScanSuccess = (code: string) => {
    setIsScannerOpen(false);
    setAlertMessage({
      type: 'success',
      text: `${isRtl ? 'تم مسح الوثيقة والتحقق منها بنجاح: ' : 'Document scanned and verified successfully: '} [${code}]`
    });
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: LayoutDashboard },
    { id: 'requests', label: t('tabs.requests'), icon: FileCheck, badge: pendingDoctors.length > 0 ? String(pendingDoctors.length) : undefined },
    { id: 'verification', label: t('tabs.verification'), icon: ShieldCheck },
    { id: 'support', label: t('tabs.support'), icon: Headphones },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart2 },
    { id: 'activity', label: t('tabs.activity'), icon: Clock },
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'settings', label: t('tabs.settings'), icon: Settings },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsScannerOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs border border-slate-700 transition-all"
      >
        <QrCode className="w-4 h-4 text-blue-400" />
        {t('scannerBtn')}
      </button>
    </div>
  );

  return (
    <DashboardLayout
      title={t('title')}
      userName={currentUser?.name || t('userName')}
      userRole={t('userRole')}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      navItems={navItems}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onBackToMain={onBackToMainPlatform}
      sidebarTitle={t('sidebarTitle')}
      icon={<Shield className="w-6 h-6" />}
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Alert Banner if present */}
        {alertMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-xs border ${
              alertMessage.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-900'
                : alertMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-100 text-amber-900'
                : 'bg-emerald-50 border-emerald-100 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                alertMessage.type === 'error' ? 'bg-rose-100 text-rose-600' : 
                alertMessage.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {alertMessage.type === 'error' ? (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                ) : alertMessage.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
              </div>
              <span className="text-sm font-bold">{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <XCircle className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        {/* 1. ASSISTANT DASHBOARD PAGE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!permissions.viewDashboard ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t('dashboard.accessDenied.title')}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    {t('dashboard.accessDenied.description')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* KPI Cards (Derived dynamically from backend) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                    <span className="text-xs text-slate-500 font-bold block">{t('dashboard.kpis.pendingTasks')}</span>
                    <p className="text-2xl font-black text-blue-600">{pendingDoctors.length}</p>
                    <span className="text-[10px] text-slate-500">{isRtl ? "طلبات أطباء بانتظار المراجعة" : "Pending doctor applications"}</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                    <span className="text-xs text-slate-500 font-bold block">{t('dashboard.kpis.reviewedRequests')}</span>
                    <p className="text-2xl font-black text-emerald-600">{pendingDoctors.length}</p>
                    <span className="text-[10px] text-emerald-700 font-medium">{isRtl ? "جاهزة للتدقيق المبدئي" : "Ready for initial review"}</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                    <span className="text-xs text-slate-500 font-bold block">{t('dashboard.kpis.supportTickets')}</span>
                    <p className="text-2xl font-black text-amber-600">0</p>
                    <span className="text-[10px] text-amber-700">{isRtl ? "لا توجد تذاكر معلقة" : "No open tickets"}</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                    <span className="text-xs text-slate-500 font-bold block">{t('dashboard.kpis.dailyActivity')}</span>
                    <p className="text-2xl font-black text-slate-900">{auditLogs.length} {isRtl ? 'سجلات' : 'logs'}</p>
                    <span className="text-[10px] text-slate-500">{isRtl ? "مسجلة في Audit Log" : "Logged in Audit Trail"}</span>
                  </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pending Tasks & Assigned Requests */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        {isRtl ? 'المهام والطلبات المسندة إليك (Assigned Requests)' : 'Assigned Verification Tasks'}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">{pendingDoctors.length} {isRtl ? 'طلبات قيد المراجعة' : 'pending'}</span>
                    </div>

                    {pendingDoctors.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-700">{isRtl ? 'تم إنجاز كافة المهام والطلبات المسندة بنجاح' : 'All assigned verification tasks completed'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        {pendingDoctors.map((doc) => (
                          <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900 block">{doc.name} ({doc.specialty})</span>
                              <span className="text-[10px] text-slate-500">{doc.license_number ? `الترخيص: ${doc.license_number}` : 'الوثائق مرفقة'}</span>
                            </div>
                            <button
                              onClick={() => {
                                if (permissions.reviewRequests) {
                                  setAlertMessage({ type: 'success', text: `تم تسجيل مراجعة طلب الطبيب (${doc.name}) وإحالته للاعتماد.` });
                                } else {
                                  triggerAccessDenied('reviewRequests');
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {isRtl ? 'مراجعة الطلب' : 'Review'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Zap className="w-5 h-5 text-amber-500" />
                      {isRtl ? 'إجراءات سريعة (Quick Actions)' : 'Quick Actions'}
                    </h3>

                    <div className="space-y-2 text-xs font-bold">
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl text-slate-800 text-right transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{isRtl ? 'مراجعة طلبات التسجيل' : 'Review Registration Requests'}</span>
                        <FileCheck className="w-4 h-4 text-blue-600" />
                      </button>

                      <button
                        onClick={() => setActiveTab('verification')}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl text-slate-800 text-right transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{isRtl ? 'فحص وثائق التراخيص' : 'Inspect Credentials'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </button>

                      <button
                        onClick={() => setActiveTab('reports')}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl text-slate-800 text-right transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{isRtl ? 'عرض التقرير التشغيلي' : 'Operational Summary'}</span>
                        <BarChart2 className="w-4 h-4 text-teal-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. REGISTRATION & PACKAGE REQUESTS PAGE */}
        {activeTab === 'requests' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  {isRtl ? 'طلبات التسجيل والشراء المرفوعة' : 'Registration & Package Purchase Requests'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'مراجعة وتدقيق طلبات انضمام الأطباء وطلبات شراء باقات الحجز (وفق الصلاحيات المفوضة)' : 'Review practitioner onboarding and package purchase requests according to delegated permissions'}
                </p>
              </div>

              {/* Sub-tab Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setRequestSubTab('doctors')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    requestSubTab === 'doctors'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isRtl ? `توثيق الأطباء (${pendingDoctors.length})` : `Doctors (${pendingDoctors.length})`}
                </button>
                <button
                  onClick={() => setRequestSubTab('packages')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    requestSubTab === 'packages'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isRtl ? `شراء الباقات (${packageRequests.filter(r => r.status === 'pending').length})` : `Package Requests (${packageRequests.filter(r => r.status === 'pending').length})`}
                </button>
                <button
                  onClick={() => setRequestSubTab('booking_centers')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    requestSubTab === 'booking_centers'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isRtl ? `مراكز الحجز (${pendingBookingCenters.length})` : `Booking Centers (${pendingBookingCenters.length})`}
                </button>
              </div>
            </div>

            {/* DOCTOR REGISTRATION REQUESTS SUB-TAB */}
            {requestSubTab === 'doctors' && (
              pendingDoctors.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد طلبات تسجيل أطباء معلقة حالياً' : 'No pending doctor registration requests'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">{isRtl ? 'اسم مقدم الطلب' : 'Applicant'}</th>
                        <th className="p-3">{isRtl ? 'التخصص' : 'Specialty'}</th>
                        <th className="p-3">{isRtl ? 'الترخيص' : 'License'}</th>
                        <th className="p-3">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingDoctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{doc.name}</td>
                          <td className="p-3">{doc.specialty}</td>
                          <td className="p-3 font-mono">{doc.license_number || '--'}</td>
                          <td className="p-3">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {isRtl ? 'قيد المراجعة 🟡' : 'Pending 🟡'}
                            </span>
                          </td>
                          <td className="p-3 text-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => {
                                if (permissions.reviewRequests) {
                                  setAlertMessage({ type: 'success', text: `تمت مراجعة وثائق ${doc.name} وتوثيق الملاحظات.` });
                                } else {
                                  triggerAccessDenied('reviewRequests');
                                }
                              }}
                              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded font-bold cursor-pointer"
                            >
                              {isRtl ? 'مراجعة الطلب' : 'Review'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* PACKAGE PURCHASE REQUESTS SUB-TAB */}
            {requestSubTab === 'packages' && (
              packageRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد طلبات شراء باقات معلقة حالياً' : 'No package purchase requests currently'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">{isRtl ? 'رقم المرجع' : 'Reference'}</th>
                        <th className="p-3">{isRtl ? 'مركز الحجز' : 'Booking Center'}</th>
                        <th className="p-3">{isRtl ? 'الباقة' : 'Package'}</th>
                        <th className="p-3">{isRtl ? 'الحصص' : 'Units'}</th>
                        <th className="p-3">{isRtl ? 'المبلغ' : 'Amount'}</th>
                        <th className="p-3">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isRtl ? 'قرار الاعتماد' : 'Decision'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {packageRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">{req.request_reference}</td>
                          <td className="p-3 font-bold text-slate-900">{req.booking_center?.name || 'مركز الحجز'}</td>
                          <td className="p-3">{req.package_name}</td>
                          <td className="p-3 font-bold text-emerald-700">+{req.quota_units}</td>
                          <td className="p-3 font-mono">{Number(req.price_dzd).toLocaleString()} {isRtl ? 'دج' : 'DZD'}</td>
                          <td className="p-3">
                            {req.status === 'pending' && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                {isRtl ? 'قيد المراجعة 🟡' : 'Pending 🟡'}
                              </span>
                            )}
                            {req.status === 'approved' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                {isRtl ? 'معتمد 🟢' : 'Approved 🟢'}
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                {isRtl ? 'مرفوض 🔴' : 'Rejected 🔴'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center space-x-1.5 space-x-reverse">
                            {req.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApprovePackageRequest(req)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold text-[11px] cursor-pointer shadow-xs"
                                >
                                  {isRtl ? 'اعتماد' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectPackageRequest(req)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded font-bold text-[11px] cursor-pointer shadow-xs"
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {req.reviewed_by?.name || '--'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* BOOKING CENTERS REGISTRATION REQUESTS SUB-TAB */}
            {requestSubTab === 'booking_centers' && (
              pendingBookingCenters.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد طلبات تسجيل مراكز حجز معلقة حالياً' : 'No pending booking center registration requests'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">{isRtl ? 'اسم مركز الحجز' : 'Center Name'}</th>
                        <th className="p-3">{isRtl ? 'المدير المسؤول' : 'Manager'}</th>
                        <th className="p-3">{isRtl ? 'السجل التجاري' : 'Commercial Reg'}</th>
                        <th className="p-3">{isRtl ? 'الولاية / الهاتف' : 'Wilaya / Phone'}</th>
                        <th className="p-3">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingBookingCenters.map((bc) => (
                        <tr key={bc.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{bc.name}</td>
                          <td className="p-3">{bc.manager?.name || bc.user?.name || '--'}</td>
                          <td className="p-3 font-mono">{bc.commercial_register || '--'}</td>
                          <td className="p-3">{bc.wilaya} • {bc.phone}</td>
                          <td className="p-3">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {isRtl ? 'قيد المراجعة 🟡' : 'Pending 🟡'}
                            </span>
                          </td>
                          <td className="p-3 text-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => {
                                if (permissions.reviewRequests) {
                                  setAlertMessage({ type: 'success', text: isRtl ? `تمت مراجعة وثائق مركز الحجز (${bc.name}) وتوثيق الملاحظات.` : `Reviewed documents for ${bc.name}.` });
                                } else {
                                  triggerAccessDenied('reviewRequests');
                                }
                              }}
                              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded font-bold cursor-pointer"
                            >
                              {isRtl ? 'مراجعة' : 'Review'}
                            </button>

                            {permissions.approveRequests && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!confirm(isRtl ? `هل أنت متأكد من اعتماد مركز الحجز (${bc.name})؟` : `Approve ${bc.name}?`)) return;
                                    try {
                                      await adminService.verifyBookingCenter(bc.id);
                                      setAlertMessage({ type: 'success', text: isRtl ? `تم اعتماد وتوثيق مركز الحجز (${bc.name}) بنجاح!` : `Booking Center ${bc.name} approved!` });
                                      const res = await adminService.getBookingCenters({ status: 'pending' });
                                      if (res.data) setPendingBookingCenters(res.data);
                                    } catch (err: any) {
                                      setAlertMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'فشل اعتماد المركز.' });
                                    }
                                  }}
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded font-bold cursor-pointer"
                                >
                                  {isRtl ? 'اعتماد' : 'Approve'}
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = prompt(isRtl ? `سبب رفض مركز الحجز (${bc.name}):` : `Rejection reason:`);
                                    if (!reason || !reason.trim()) return;
                                    try {
                                      await adminService.rejectBookingCenter(bc.id, reason.trim());
                                      setAlertMessage({ type: 'warning', text: isRtl ? `تم رفض طلب مركز الحجز (${bc.name}).` : `Booking Center ${bc.name} rejected.` });
                                      const res = await adminService.getBookingCenters({ status: 'pending' });
                                      if (res.data) setPendingBookingCenters(res.data);
                                    } catch (err: any) {
                                      setAlertMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'فشل رفض المركز.' });
                                    }
                                  }}
                                  className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-2.5 py-1 rounded font-bold cursor-pointer"
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* 3. VERIFICATION CENTER PAGE */}
        {activeTab === 'verification' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {isRtl ? 'مركز التحقق والوثائق (Verification Center)' : 'Credentials Verification Center'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'مطابقة شهادات التخصص والتراخيص الطبية المعتمدة' : 'Verify medical certifications and facility licenses'}
              </p>
            </div>

            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد وثائق تراخيص بانتظار التحقق حالياً' : 'No documents awaiting credentials verification currently'}</p>
            </div>
          </div>
        )}

        {/* 4. SUPPORT CENTER PAGE */}
        {activeTab === 'support' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                {isRtl ? 'مركز الدعم الفني وتذاكر الشكاوى (Support Center)' : 'Support Center & Tickets'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'استقبال تذاكر وملاحظات المستخدمين ومتابعتها' : 'User inquiries and support requests'}
              </p>
            </div>

            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
              <Headphones className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد تذاكر دعم فني مفتوحة حالياً' : 'No open support tickets currently'}</p>
            </div>
          </div>
        )}

        {/* 5. NOTIFICATION CENTER PAGE */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                {isRtl ? 'مركز إعداد وجدولة الإشعارات (Notification Center)' : 'Notification Center'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'صياغة وتجهيز مسودات التعميمات لإحالتها للاعتماد' : 'Draft bulletins and notifications for administrator approval'}
              </p>
            </div>

            <div className="space-y-4 text-xs max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isRtl ? 'عنوان الإشعار' : 'Title'}</label>
                <input
                  type="text"
                  placeholder={isRtl ? 'عنوان الإشعار...' : 'Notification title...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isRtl ? 'تفاصيل الرسالة' : 'Details'}</label>
                <textarea
                  rows={3}
                  placeholder={isRtl ? 'اكتب نص الإشعار هنا...' : 'Message content...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>
              <button
                onClick={() => {
                  if (permissions.createNotifications) {
                    setAlertMessage({ type: 'success', text: isRtl ? 'تم حفظ مسودة الإشعار بنجاح وإحالتها للمدير.' : 'Draft saved and sent to admin.' });
                  } else {
                    triggerAccessDenied('createNotifications');
                  }
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                {isRtl ? 'حفظ كمسودة للإدارة' : 'Save Draft'}
              </button>
            </div>
          </div>
        )}

        {/* 6. OPERATIONAL REPORTS PAGE */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                {isRtl ? 'التقارير التشغيلية (Operational Reports)' : 'Operational Reports'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'مؤشرات الأداء التشغيلي العام للمنصة' : 'Operational performance indicators'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold block">{isRtl ? 'إجمالي الأطباء الموثقين' : 'Verified Doctors'}</span>
                <p className="text-xl font-black text-slate-900">{pendingDoctors.length} {isRtl ? 'قيد المراجعة' : 'Pending'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold block">{isRtl ? 'سجلات النشاط الموثقة' : 'Audited Operations'}</span>
                <p className="text-xl font-black text-emerald-600">{auditLogs.length} {isRtl ? 'سجل' : 'events'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold block">{isRtl ? 'حالة المنظومة' : 'Platform State'}</span>
                <p className="text-xl font-black text-blue-600">Active 🟢</p>
              </div>
            </div>
          </div>
        )}

        {/* 7. ACTIVITY LOG PAGE */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                {isRtl ? 'سجل عمليات النظام (Audit Activity Log)' : 'System Audit Log'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'سجل العمليات والوصول السريري الموثق في قاعدة البيانات' : 'Immutable audit trail of access events'}
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد سجلات تدقيق مسجلة حالياً' : 'No audit trail records logged currently'}</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-mono">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{log.action}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-sans font-bold bg-white border border-slate-200">
                          {log.resource_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-sans">User: {log.user?.email || log.user_id} • IP: {log.ip_address}</p>
                    </div>
                    <div className="text-left text-[10px] text-slate-500">{log.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. MY PROFILE PAGE */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                {isRtl ? 'الملف الشخصي والصلاحيات' : 'Profile & Authorized Permissions'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'بيانات الحساب الموثق والأدوار الممنوحة من قبل مدير المنصة' : 'Authenticated credentials and RBAC assignments'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">{isRtl ? 'البيانات الأساسية' : 'User Demographics'}</h3>
                <div className="space-y-2 text-slate-700">
                  <p><span className="font-bold">{isRtl ? 'الاسم:' : 'Name:'}</span> {currentUser?.name || t('userName')}</p>
                  <p><span className="font-bold">{isRtl ? 'البريد الإلكتروني:' : 'Email:'}</span> {currentUser?.email || '--'}</p>
                  <p><span className="font-bold">{isRtl ? 'الدور الوظيفي:' : 'Role:'}</span> {currentUser?.roles?.join(', ') || 'Platform Admin Assistant'}</p>
                  <p><span className="font-bold">{isRtl ? 'حالة الحساب:' : 'Account Status:'}</span> <span className="text-emerald-700 font-bold">Active 🟢</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. SETTINGS PAGE */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                {isRtl ? 'الإعدادات الشخصية (Personal Settings)' : 'Account Settings'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'تغيير كلمة المرور وتفضيلات الحساب' : 'Password and preferences management'}
              </p>
            </div>

            <div className="max-w-xl">
              <ChangePasswordCard isRtl={isRtl} />
            </div>
          </div>
        )}
      </div>

      <DocumentScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </DashboardLayout>
  );
}
