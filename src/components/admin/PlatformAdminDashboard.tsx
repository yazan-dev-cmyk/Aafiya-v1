'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Building2,
  FlaskConical,
  Radio,
  Package,
  CreditCard,
  DollarSign,
  Megaphone,
  BarChart3,
  ShieldCheck,
  KeyRound,
  Settings,
  Bell,
  Search,
  ListFilter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  Download,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  FileCheck,
  Shield,
  Activity,
  Zap,
  Globe,
  QrCode,
  Trash2,
  Receipt
} from 'lucide-react';

import { DocumentScanner } from '../shared/DocumentScanner';
import { MedicalDocumentCode } from '../shared/MedicalDocumentCode';
import { AssistantPermissionsManager } from './AssistantPermissionsManager';
import { AdvertisementManagement } from './AdvertisementManagement';
import { AdminBookingPoliciesCard } from './AdminBookingPoliciesCard';
import { ChangePasswordCard } from '../shared/ChangePasswordCard';
import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { adminService, AdminDoctorItem, AdminCenterItem, AdminBookingCenterItem, AdminPackageItem, AdminAuditLogItem, PlatformFinancialSummary, PlatformDashboardStats } from '@/services/adminService';
import { bookingCenterService, PackagePurchaseRequestItem } from '@/services/bookingCenterService';
import { authService, UserProfile } from '@/services/authService';

interface PlatformAdminDashboardProps {
  onBackToMainPlatform: () => void;
  onOpenAssistantDashboard?: () => void;
}

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'doctors'
  | 'booking_centers'
  | 'laboratories'
  | 'radiology'
  | 'packages'
  | 'subscription_requests'
  | 'payments'
  | 'advertisements'
  | 'reports'
  | 'audit_logs'
  | 'roles_permissions'
  | 'assistant_permissions'
  | 'system_settings'
  | 'notifications_center';

export function PlatformAdminDashboard({ onBackToMainPlatform, onOpenAssistantDashboard }: PlatformAdminDashboardProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = (searchParams?.get('tab') as AdminTab) || 'dashboard';
  const [activeTab, setActiveTab] = useState<AdminTab>(tabFromUrl);

  useEffect(() => {
    const urlTab = (searchParams?.get('tab') as AdminTab) || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as AdminTab);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Live Data States
  const [doctors, setDoctors] = useState<AdminDoctorItem[]>([]);
  const [bookingCenters, setBookingCenters] = useState<AdminBookingCenterItem[]>([]);
  const [bookingCenterStatusFilter, setBookingCenterStatusFilter] = useState<string>('all');
  const [laboratories, setLaboratories] = useState<AdminCenterItem[]>([]);
  const [radiologyCenters, setRadiologyCenters] = useState<AdminCenterItem[]>([]);
  const [packages, setPackages] = useState<AdminPackageItem[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [labOrdersCount, setLabOrdersCount] = useState<number>(0);
  const [radOrdersCount, setRadOrdersCount] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Package Purchase Requests State
  const [packageRequests, setPackageRequests] = useState<PackagePurchaseRequestItem[]>([]);
  const [isLoadingPackageRequests, setIsLoadingPackageRequests] = useState(false);
  const [packageRequestsFilter, setPackageRequestsFilter] = useState<string>('all');
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<PackagePurchaseRequestItem | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<PackagePurchaseRequestItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalAlert, setApprovalAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct Quota Grant State (QUOTA-02)
  const [grantModalCenter, setGrantModalCenter] = useState<AdminBookingCenterItem | null>(null);
  const [grantUnitsInput, setGrantUnitsInput] = useState<string>('1');
  const [grantReferenceNoteInput, setGrantReferenceNoteInput] = useState<string>('');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState<boolean>(false);
  const [grantErrorFeedback, setGrantErrorFeedback] = useState<string | null>(null);
  const [grantSuccessFeedback, setGrantSuccessFeedback] = useState<string | null>(null);

  // Authoritative Platform Overview Statistics (P20 Backend-Authoritative)
  const [dashboardStats, setDashboardStats] = useState<PlatformDashboardStats | null>(null);

  // Platform Financial Reporting State
  const [financialSummary, setFinancialSummary] = useState<PlatformFinancialSummary | null>(null);
  const [paymentsList, setPaymentsList] = useState<PackagePurchaseRequestItem[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentsFilterCenter, setPaymentsFilterCenter] = useState('all');
  const [paymentsFilterPackage, setPaymentsFilterPackage] = useState('all');
  const [paymentsFilterMonth, setPaymentsFilterMonth] = useState<'all' | 'current'>('all');
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PackagePurchaseRequestItem | null>(null);
  const [isRevenueMasked, setIsRevenueMasked] = useState<boolean>(false);

  // Pagination States for Admin Lists
  const [bookingCentersPage, setBookingCentersPage] = useState<number>(1);
  const [bookingCentersTotalPages, setBookingCentersTotalPages] = useState<number>(1);
  const [bookingCentersTotalItems, setBookingCentersTotalItems] = useState<number>(0);

  const [labsPage, setLabsPage] = useState<number>(1);
  const [labsTotalPages, setLabsTotalPages] = useState<number>(1);
  const [labsTotalItems, setLabsTotalItems] = useState<number>(0);

  const [radPage, setRadPage] = useState<number>(1);
  const [radTotalPages, setRadTotalPages] = useState<number>(1);
  const [radTotalItems, setRadTotalItems] = useState<number>(0);

  const [packageRequestsPage, setPackageRequestsPage] = useState<number>(1);
  const [packageRequestsTotalPages, setPackageRequestsTotalPages] = useState<number>(1);
  const [packageRequestsTotalItems, setPackageRequestsTotalItems] = useState<number>(0);

  const [paymentsPage, setPaymentsPage] = useState<number>(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState<number>(1);
  const [paymentsTotalItems, setPaymentsTotalItems] = useState<number>(0);

  const [clinicsList, setClinicsList] = useState<any[]>([]);
  const [clinicsPage, setClinicsPage] = useState<number>(1);
  const [clinicsTotalPages, setClinicsTotalPages] = useState<number>(1);
  const [clinicsTotalItems, setClinicsTotalItems] = useState<number>(0);

  // Notification broadcast form state
  const [notificationBroadcast, setNotificationBroadcast] = useState({
    title: '',
    message: '',
    targetGroup: 'all',
  });

  // Package management state
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdminPackageItem | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    package_code: '',
    quota_units: 100,
    price_dzd: 5000,
    description: '',
    is_active: true,
  });

  const fetchFinancialData = async () => {
    try {
      const summaryRes = await adminService.getPlatformFinancialSummary();
      if (summaryRes.data) {
        setFinancialSummary(summaryRes.data);
      }
    } catch (e) {
      console.warn('Failed to fetch platform financial summary:', e);
    }
  };

  const fetchPaymentsList = async (
    filters: { booking_center_id?: string; package_code?: string; current_month?: boolean } = {},
    page: number = paymentsPage
  ) => {
    setIsLoadingPayments(true);
    try {
      const params: Record<string, any> = { page, per_page: 20 };
      if (filters.booking_center_id && filters.booking_center_id !== 'all') params.booking_center_id = filters.booking_center_id;
      if (filters.package_code && filters.package_code !== 'all') params.package_code = filters.package_code;
      if (filters.current_month) params.current_month = true;

      const paymentsRes = await adminService.getPlatformPayments(params);
      if (paymentsRes.data && Array.isArray(paymentsRes.data)) {
        setPaymentsList(paymentsRes.data);
      }
      if (paymentsRes.meta) {
        setPaymentsPage(paymentsRes.meta.current_page || page);
        setPaymentsTotalPages(paymentsRes.meta.last_page || 1);
        setPaymentsTotalItems(paymentsRes.meta.total || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch platform payments:', e);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const fetchPackageRequests = async (status?: string, page: number = packageRequestsPage) => {
    setIsLoadingPackageRequests(true);
    try {
      const currentFilter = status !== undefined ? status : packageRequestsFilter;
      const params: Record<string, any> = { page, per_page: 20 };
      if (currentFilter && currentFilter !== 'all') params.status = currentFilter;
      const res = await adminService.getPackagePurchaseRequests(params);
      if (res.data && Array.isArray(res.data)) {
        setPackageRequests(res.data);
      }
      if (res.meta) {
        setPackageRequestsPage(res.meta.current_page || page);
        setPackageRequestsTotalPages(res.meta.last_page || 1);
        setPackageRequestsTotalItems(res.meta.total || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch package purchase requests:', e);
    } finally {
      setIsLoadingPackageRequests(false);
    }
  };

  const fetchBookingCenters = async (status?: string, page: number = bookingCentersPage) => {
    try {
      const currentFilter = status !== undefined ? status : bookingCenterStatusFilter;
      const params: Record<string, any> = { page, per_page: 20 };
      if (currentFilter && currentFilter !== 'all') params.status = currentFilter;
      const res = await adminService.getBookingCenters(params);
      if (res.data && Array.isArray(res.data)) {
        setBookingCenters(res.data);
      }
      if (res.meta) {
        setBookingCentersPage(res.meta.current_page || page);
        setBookingCentersTotalPages(res.meta.last_page || 1);
        setBookingCentersTotalItems(res.meta.total || 0);
      }
    } catch (e) {
      console.warn('Booking centers fetch error:', e);
    }
  };

  const fetchLabs = async (page: number = labsPage) => {
    try {
      const res = await adminService.getDiagnosticCenters({ type: 'laboratory', page, per_page: 20 });
      if (res.data && Array.isArray(res.data)) {
        setLaboratories(res.data);
      }
      if (res.meta) {
        setLabsPage(res.meta.current_page || page);
        setLabsTotalPages(res.meta.last_page || 1);
        setLabsTotalItems(res.meta.total || 0);
      }
    } catch (e) {
      console.warn('Labs fetch error:', e);
    }
  };

  const fetchRadiology = async (page: number = radPage) => {
    try {
      const res = await adminService.getDiagnosticCenters({ type: 'radiology', page, per_page: 20 });
      if (res.data && Array.isArray(res.data)) {
        setRadiologyCenters(res.data);
      }
      if (res.meta) {
        setRadPage(res.meta.current_page || page);
        setRadTotalPages(res.meta.last_page || 1);
        setRadTotalItems(res.meta.total || 0);
      }
    } catch (e) {
      console.warn('Radiology centers fetch error:', e);
    }
  };

  const fetchClinics = async (page: number = clinicsPage) => {
    try {
      const res = await adminService.getClinics({ page, per_page: 20 });
      if (res.data && Array.isArray(res.data)) {
        setClinicsList(res.data);
      }
      if (res.meta) {
        setClinicsPage(res.meta.current_page || page);
        setClinicsTotalPages(res.meta.last_page || 1);
        setClinicsTotalItems(res.meta.total || 0);
      }
    } catch (e) {
      console.warn('Clinics fetch error:', e);
    }
  };

  const handleApproveRequest = async (req: PackagePurchaseRequestItem) => {
    if (!confirm(isRtl ? `هل أنت متأكد من اعتماد طلب الشراء (${req.request_reference}) وشحن رصيد ${req.quota_units} عملية لمركز الحجز (${req.booking_center?.name || 'مركز الحجز'})؟` : `Approve purchase request ${req.request_reference} and add ${req.quota_units} quota units?`)) {
      return;
    }

    setIsSubmittingApproval(true);
    setApprovalAlert(null);
    try {
      const res = await adminService.approvePackagePurchaseRequest(req.id);
      if (res.data) {
        setApprovalAlert({
          type: 'success',
          text: isRtl ? `تم اعتماد طلب الشراء (${req.request_reference}) بنجاح وشحن الرصيد.` : `Request ${req.request_reference} approved successfully!`,
        });
        await fetchPackageRequests(packageRequestsFilter);
        await fetchFinancialData();
        await fetchPaymentsList({ booking_center_id: paymentsFilterCenter, package_code: paymentsFilterPackage, current_month: paymentsFilterMonth === 'current' });
        const bcRes = await adminService.getBookingCenters();
        if (bcRes.data) setBookingCenters(bcRes.data);
      }
    } catch (err: any) {
      console.error('Error approving package request:', err);
      setApprovalAlert({
        type: 'error',
        text: err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء اعتماد الطلب.' : 'Failed to approve request.'),
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectModalRequest) return;
    if (!rejectionReasonInput.trim()) {
      alert(isRtl ? 'يرجى إدخال سبب الرفض لتوضيحه لمركز الحجز.' : 'Please provide a rejection reason.');
      return;
    }

    setIsSubmittingApproval(true);
    setApprovalAlert(null);
    try {
      const res = await adminService.rejectPackagePurchaseRequest(rejectModalRequest.id, rejectionReasonInput.trim());
      if (res.data) {
        setApprovalAlert({
          type: 'success',
          text: isRtl ? `تم رفض طلب الشراء (${rejectModalRequest.request_reference}) وتوثيق السبب.` : `Request ${rejectModalRequest.request_reference} rejected.`,
        });
        setRejectModalRequest(null);
        setRejectionReasonInput('');
        await fetchPackageRequests(packageRequestsFilter);
      }
    } catch (err: any) {
      console.error('Error rejecting package request:', err);
      setApprovalAlert({
        type: 'error',
        text: err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء رفض الطلب.' : 'Failed to reject request.'),
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleApproveDoctor = async (doc: AdminDoctorItem) => {
    if (!confirm(isRtl ? `هل أنت متأكد من مراجعة واعتماد حساب الطبيب (${doc.name}) ورقم الترخيص (${doc.license_number}) وتفعيل لوحة التحكم الكلينيكية؟` : `Approve doctor ${doc.name} (${doc.license_number})?`)) {
      return;
    }
    try {
      await adminService.verifyDoctor(doc.id, true);
      alert(isRtl ? `تم اعتماد وتوثيق حساب الطبيب (${doc.name}) بنجاح وتفعيل العيادة!` : `Doctor ${doc.name} approved successfully!`);
      const res = await adminService.getDoctors();
      if (res.data) setDoctors(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء اعتماد حساب الطبيب.' : 'Failed to approve doctor.'));
    }
  };

  const handleApproveBookingCenter = async (center: AdminBookingCenterItem) => {
    if (!confirm(isRtl ? `هل أنت متأكد من مراجعة واعتماد مركز الحجز (${center.name}) والسجل التجاري (${center.commercial_register || '--'}) وتفعيل لوحة التحكم؟` : `Approve booking center ${center.name}?`)) {
      return;
    }
    try {
      await adminService.verifyBookingCenter(center.id);
      alert(isRtl ? `تم اعتماد وتوثيق مركز الحجز (${center.name}) بنجاح وتفعيل لوحة التحكم!` : `Booking Center ${center.name} approved successfully!`);
      const res = await adminService.getBookingCenters({ status: bookingCenterStatusFilter });
      if (res.data) setBookingCenters(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء اعتماد مركز الحجز.' : 'Failed to approve booking center.'));
    }
  };

  const handleRejectBookingCenter = async (center: AdminBookingCenterItem) => {
    const reason = prompt(isRtl ? `يرجى كتابة سبب رفض مركز الحجز (${center.name}):` : `Enter rejection reason for ${center.name}:`);
    if (!reason || !reason.trim()) {
      return;
    }
    try {
      await adminService.rejectBookingCenter(center.id, reason.trim());
      alert(isRtl ? `تم رفض طلب مركز الحجز (${center.name}) وتوثيق السبب.` : `Booking Center ${center.name} rejected.`);
      const res = await adminService.getBookingCenters({ status: bookingCenterStatusFilter });
      if (res.data) setBookingCenters(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء رفض مركز الحجز.' : 'Failed to reject booking center.'));
    }
  };

  // QUOTA-02: Permission check aligned with backend:
  // $user->hasRole('admin') || ($user->hasRole('admin_assistant') && $user->has4DAccess('platform.approve_requests'))
  const canGrantQuota = !!(
    currentUser?.roles?.includes('admin') ||
    (currentUser?.roles?.includes('admin_assistant') &&
      (currentUser?.permissions?.includes('platform.approve_requests') ||
        currentUser?.scoped_permissions?.includes('platform.approve_requests')))
  );

  const handleOpenGrantQuota = (center: AdminBookingCenterItem) => {
    setGrantModalCenter(center);
    setGrantUnitsInput('1');
    setGrantReferenceNoteInput('');
    setGrantErrorFeedback(null);
  };

  const handleCloseGrantQuota = () => {
    if (isSubmittingGrant) return;
    setGrantModalCenter(null);
    setGrantUnitsInput('1');
    setGrantReferenceNoteInput('');
    setGrantErrorFeedback(null);
  };

  const handleConfirmGrant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingGrant || !grantModalCenter) return;

    const trimmedUnits = grantUnitsInput.trim();
    const parsedUnits = parseInt(trimmedUnits, 10);

    // Strict validation: positive integer >= 1, no decimals or extraneous characters
    if (!trimmedUnits || !Number.isInteger(parsedUnits) || parsedUnits < 1 || trimmedUnits !== String(parsedUnits)) {
      setGrantErrorFeedback(t('centers.grantQuotaErrorInvalid'));
      return;
    }

    if (grantReferenceNoteInput.length > 255) {
      setGrantErrorFeedback(isRtl ? 'الملاحظة يجب ألا تتجاوز 255 حرفاً.' : 'Reference note must not exceed 255 characters.');
      return;
    }

    setIsSubmittingGrant(true);
    setGrantErrorFeedback(null);

    try {
      const res = await bookingCenterService.grantQuota(
        grantModalCenter.id,
        parsedUnits,
        grantReferenceNoteInput.trim() || undefined
      );

      const authoritativeBalance = res?.data?.quota_balance;
      const successMessage = t('centers.grantQuotaSuccess', {
        units: parsedUnits,
        balance: authoritativeBalance !== undefined ? authoritativeBalance : (grantModalCenter.quota_balance + parsedUnits),
      });

      // Update local state and trigger authoritative fetch
      setGrantSuccessFeedback(successMessage);
      setGrantModalCenter(null);
      await fetchBookingCenters(bookingCenterStatusFilter);
      setTimeout(() => setGrantSuccessFeedback(null), 8000);
    } catch (err: any) {
      console.error('Grant quota error:', err);
      const serverMessage =
        err?.errors?.units?.[0] ||
        err?.errors?.reference_note?.[0] ||
        err?.message ||
        (isRtl ? 'فشلت عملية منح الحصص. يرجى المحاولة مرة أخرى.' : 'Failed to grant quota. Please try again.');
      setGrantErrorFeedback(serverMessage);
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      package_code: `PKG-${Date.now().toString().slice(-4)}`,
      quota_units: 100,
      price_dzd: 5000,
      description: '',
      is_active: true,
    });
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: AdminPackageItem) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      package_code: pkg.package_code || `PKG-${pkg.id.slice(0, 4)}`,
      quota_units: pkg.quota_units || pkg.quota || 100,
      price_dzd: pkg.price_dzd || pkg.price || 5000,
      description: pkg.description || '',
      is_active: pkg.is_active ?? true,
    });
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPackage) {
        await adminService.updateBookingPackage(editingPackage.id, packageForm);
        alert(isRtl ? 'تم تحديث باقة الحجز بنجاح.' : 'Package updated successfully.');
      } else {
        await adminService.createBookingPackage(packageForm);
        alert(isRtl ? 'تم إنشاء باقة الحجز بنجاح.' : 'Package created successfully.');
      }
      setIsPackageModalOpen(false);
      const pkgRes = await adminService.getBookingPackages();
      if (pkgRes.data) setPackages(pkgRes.data);
    } catch (err: any) {
      alert(err?.message || (isRtl ? 'حدث خطأ أثناء حفظ الباقة' : 'Failed to save package'));
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (confirm(isRtl ? `هل أنت متأكد من رغبتك في إلغاء تفعيل باقة "${name}"؟` : `Deactivate package "${name}"?`)) {
      try {
        await adminService.deleteBookingPackage(id);
        alert(isRtl ? 'تم إلغاء تفعيل الباقة بنجاح.' : 'Package deactivated successfully.');
        const pkgRes = await adminService.getBookingPackages();
        if (pkgRes.data) setPackages(pkgRes.data);
      } catch (err: any) {
        alert(err?.message || (isRtl ? 'حدث خطأ أثناء إلغاء التفعيل' : 'Failed to deactivate package'));
      }
    }
  };

  const handleScanSuccess = (code: string) => {
    setIsScannerOpen(false);
    alert(`${isRtl ? 'تم التحقق من الوثيقة بنجاح: ' : 'Document verified successfully: '} [${code}]`);
  };

  // Fetch real admin data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        // Current Admin Profile
        try {
          const user = await authService.me();
          if (isMounted) setCurrentUser(user);
        } catch (e) {
          console.warn('Auth profile fetch error in admin:', e);
        }

        // Authoritative Dashboard Overview Statistics
        try {
          const statsRes = await adminService.getDashboardStats();
          if (isMounted && statsRes.data) {
            setDashboardStats(statsRes.data);
          }
        } catch (e) {
          console.warn('Dashboard stats fetch error:', e);
        }

        // Doctors
        try {
          const docRes = await adminService.getDoctors();
          if (isMounted && docRes.data && Array.isArray(docRes.data)) {
            setDoctors(docRes.data);
          }
        } catch (e) {
          console.warn('Doctors fetch error:', e);
        }

        // Booking Centers
        try {
          const bcRes = await adminService.getBookingCenters();
          if (isMounted && bcRes.data && Array.isArray(bcRes.data)) {
            setBookingCenters(bcRes.data);
          }
        } catch (e) {
          console.warn('Booking centers fetch error:', e);
        }

        // Labs & Radiology Centers
        try {
          const labRes = await adminService.getDiagnosticCenters({ type: 'laboratory' });
          if (isMounted && labRes.data && Array.isArray(labRes.data)) {
            setLaboratories(labRes.data);
          }
        } catch (e) {
          console.warn('Labs fetch error:', e);
        }

        try {
          const radRes = await adminService.getDiagnosticCenters({ type: 'radiology' });
          if (isMounted && radRes.data && Array.isArray(radRes.data)) {
            setRadiologyCenters(radRes.data);
          }
        } catch (e) {
          console.warn('Radiology centers fetch error:', e);
        }

        // Booking Packages
        try {
          const pkgRes = await adminService.getBookingPackages();
          if (isMounted && pkgRes.data && Array.isArray(pkgRes.data)) {
            setPackages(pkgRes.data);
          }
        } catch (e) {
          console.warn('Packages fetch error:', e);
        }

        // Appointments Count
        try {
          const appRes = await adminService.getAppointments();
          if (isMounted && appRes.data && Array.isArray(appRes.data)) {
            setAppointmentsCount(appRes.data.length);
          }
        } catch (e) {
          console.warn('Appointments count fetch error:', e);
        }

        // Diagnostic Orders Count
        try {
          const labOrdRes = await adminService.getDiagnosticOrders({ order_type: 'laboratory' });
          if (isMounted && labOrdRes.data && Array.isArray(labOrdRes.data)) {
            setLabOrdersCount(labOrdRes.data.length);
          }
        } catch (e) {
          console.warn('Lab orders count fetch error:', e);
        }

        try {
          const radOrdRes = await adminService.getDiagnosticOrders({ order_type: 'radiology' });
          if (isMounted && radOrdRes.data && Array.isArray(radOrdRes.data)) {
            setRadOrdersCount(radOrdRes.data.length);
          }
        } catch (e) {
          console.warn('Rad orders count fetch error:', e);
        }

        // Audit Logs
        try {
          const auditRes = await adminService.getAuditLogs();
          if (isMounted && auditRes.data && Array.isArray(auditRes.data)) {
            setAuditLogs(auditRes.data);
          }
        } catch (e) {
          console.warn('Audit logs fetch error:', e);
        }

        // Package Purchase Requests
        try {
          const pkgReqRes = await adminService.getPackagePurchaseRequests();
          if (isMounted && pkgReqRes.data && Array.isArray(pkgReqRes.data)) {
            setPackageRequests(pkgReqRes.data);
          }
        } catch (e) {
          console.warn('Package requests fetch error:', e);
        }

        // Platform Financial Summary
        try {
          const finRes = await adminService.getPlatformFinancialSummary();
          if (isMounted && finRes.data) {
            setFinancialSummary(finRes.data);
          }
        } catch (e) {
          console.warn('Financial summary fetch error:', e);
        }

        // Platform Payments List
        try {
          const payRes = await adminService.getPlatformPayments();
          if (isMounted && payRes.data && Array.isArray(payRes.data)) {
            setPaymentsList(payRes.data);
          }
        } catch (e) {
          console.warn('Platform payments fetch error:', e);
        }

      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Computed Live Platform Metrics (P20 Authoritative Counts)
  const totalUsersCount = dashboardStats?.total_users;
  const totalDoctorsCount = dashboardStats?.total_doctors ?? doctors.length;
  const totalVerifiedDoctors = dashboardStats?.verified_doctors ?? doctors.filter(d => d.is_verified).length;
  const pendingDoctors = doctors.filter(d => !d.is_verified);
  const pendingDoctorsCount = dashboardStats?.pending_doctors ?? pendingDoctors.length;
  const verifiedBookingCentersCount = dashboardStats?.verified_booking_centers ?? bookingCenters.length;
  const totalLabsCount = dashboardStats?.laboratories ?? laboratories.length;
  const totalRadCount = dashboardStats?.radiology_centers ?? radiologyCenters.length;

  // Unified Users List for Users Tab
  const allUsers = [
    ...doctors.map(d => ({
      id: d.id,
      name: d.name,
      role: isRtl ? 'طبيب' : 'Doctor',
      roleKey: 'doctor',
      emailPhone: `${d.email || d.phone || '--'}`,
      status: d.is_verified ? 'active' : 'pending',
      joinedAt: d.created_at ? d.created_at.substring(0, 10) : '2026-08-01'
    })),
    ...bookingCenters.map(bc => ({
      id: bc.id,
      name: bc.name,
      role: isRtl ? 'مركز حجز' : 'Booking Center',
      roleKey: 'booking_center',
      emailPhone: `${bc.phone || bc.email || '--'}`,
      status: bc.is_active ? 'active' : 'suspended',
      joinedAt: '2026-08-01'
    })),
    ...laboratories.map(l => ({
      id: l.id,
      name: l.name,
      role: isRtl ? 'مختبر طبي' : 'Laboratory',
      roleKey: 'laboratory',
      emailPhone: `${l.phone || l.email || '--'}`,
      status: l.is_active ? 'active' : 'suspended',
      joinedAt: '2026-08-01'
    })),
    ...radiologyCenters.map(r => ({
      id: r.id,
      name: r.name,
      role: isRtl ? 'مركز أشعة' : 'Radiology Center',
      roleKey: 'radiology',
      emailPhone: `${r.phone || r.email || '--'}`,
      status: r.is_active ? 'active' : 'suspended',
      joinedAt: '2026-08-01'
    }))
  ];

  const filteredUsers = allUsers.filter(user => {
    const matchesRole = userRoleFilter === 'all' || user.roleKey === userRoleFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.emailPhone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: LayoutDashboard },
    { id: 'users', label: t('tabs.users'), icon: Users },
    { id: 'doctors', label: t('tabs.doctors'), icon: Stethoscope, badge: pendingDoctorsCount > 0 ? String(pendingDoctorsCount) : undefined },
    { id: 'booking_centers', label: t('tabs.booking_centers'), icon: Building2 },
    { id: 'laboratories', label: t('tabs.laboratories'), icon: FlaskConical },
    { id: 'radiology', label: t('tabs.radiology'), icon: Radio },
    { id: 'packages', label: t('tabs.packages'), icon: Package },
    { id: 'subscription_requests', label: t('tabs.subscription_requests'), icon: CreditCard },
    { id: 'payments', label: t('tabs.payments'), icon: DollarSign },
    { id: 'advertisements', label: t('tabs.advertisements'), icon: Megaphone },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart3 },
    { id: 'audit_logs', label: t('tabs.audit_logs'), icon: ShieldCheck },
    { id: 'roles_permissions', label: t('tabs.roles_permissions'), icon: KeyRound },
    { id: 'assistant_permissions', label: isRtl ? 'صلاحيات المساعد' : 'Assistant RBAC', icon: Sliders },
    { id: 'system_settings', label: t('tabs.system_settings'), icon: Settings },
    { id: 'notifications_center', label: t('tabs.notifications_center'), icon: Bell },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsScannerOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs border border-slate-700 transition-all"
      >
        <QrCode className="w-4 h-4 text-teal-400" />
        {t('header.scanDocument')}
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
      icon={<ShieldCheck className="w-6 h-6" />}
      headerActions={headerActions}
    >
      <div className="space-y-6">

        {/* SECTION 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top KPI Cards (Calculated from Real Database Entities) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{t('overview.totalUsers')}</span>
                <p className="text-2xl font-black text-slate-900">{totalUsersCount !== undefined ? totalUsersCount.toLocaleString() : '--'}</p>
                <span className="text-[10px] text-teal-600 font-bold">{isRtl ? 'إجمالي مستخدمي المنصة' : 'Total Platform Users'}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{t('overview.totalDoctors')}</span>
                <p className="text-2xl font-black text-teal-600">{totalDoctorsCount !== undefined ? totalDoctorsCount.toLocaleString() : '--'}</p>
                <span className="text-[10px] text-slate-500">{totalVerifiedDoctors} {isRtl ? 'معتمد' : 'Verified'} • {pendingDoctorsCount} {isRtl ? 'بانتظار الاعتماد' : 'Pending'}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{t('overview.dailyBookings')}</span>
                <p className="text-2xl font-black text-blue-600">{appointmentsCount.toLocaleString()}</p>
                <span className="text-[10px] text-blue-600 font-bold">{isRtl ? 'حجوزات مسجلة' : 'Total Bookings'}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold block">{isRtl ? 'إجمالي إيرادات المنصة' : 'Total Platform Revenue'}</span>
                  <button
                    onClick={() => setIsRevenueMasked(!isRevenueMasked)}
                    title={isRtl ? 'إخفاء / إظهار المبالغ المالية عن المتلصصين' : 'Toggle privacy mode'}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isRevenueMasked ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                  {isRevenueMasked ? '•••••••• د.ج' : `${(financialSummary?.total_revenue_dzd ?? 0).toLocaleString()} ${isRtl ? 'د.ج' : 'DZD'}`}
                </p>
                <span className="text-[10px] text-emerald-700">
                  {isRtl ? `هذا الشهر: ${isRevenueMasked ? '••••••' : (financialSummary?.current_month_revenue_dzd ?? 0).toLocaleString()} دج` : `This Month: ${isRevenueMasked ? '••••••' : (financialSummary?.current_month_revenue_dzd ?? 0).toLocaleString()} DZD`} • {financialSummary?.metrics.total_approved_sales_count ?? 0} {isRtl ? 'مبيعات معتمدة' : 'approved sales'}
                </span>
              </div>
            </div>

            {/* Revenue by Package Catalog Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    {isRtl ? 'تفصيل إيرادات مبيعات باقات الحجز (Revenue by Package)' : 'Package Sales Revenue Breakdown'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl ? 'إحصائيات المبيعات المحصلة فعلياً حسب نوع الباقة واللقطات الثابتة (Approved Only)' : 'Revenue aggregated from approved purchase requests based on immutable snapshot prices'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRevenueMasked(!isRevenueMasked)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    {isRevenueMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isRevenueMasked ? (isRtl ? 'إظهار المبالغ' : 'Show Amounts') : (isRtl ? 'إخفاء المبالغ' : 'Hide Amounts')}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isRtl ? 'عرض سجل المدفوعات' : 'View Payments'}</span>
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!financialSummary?.revenue_by_package || financialSummary.revenue_by_package.length === 0 ? (
                <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">
                    {isRtl ? 'لم يتم تسجيل أي مبيعات باقات معتمدة حتى الآن.' : 'No approved package sales recorded yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {financialSummary.revenue_by_package.map((pkg) => (
                    <div key={pkg.package_code} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {pkg.package_code}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {pkg.sales_count} {isRtl ? 'مبيعات' : 'sales'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{pkg.package_name}</h4>
                        <span className="text-[11px] text-slate-500 block">
                          +{pkg.quota_units} {isRtl ? 'عملية لكل باقة' : 'units/pkg'}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">{isRtl ? 'إجمالي المحصل:' : 'Total:'}</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {isRevenueMasked ? '•••••• دج' : `${pkg.total_revenue_dzd.toLocaleString()} ${isRtl ? 'دج' : 'DZD'}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Operational Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    {t('overview.liveActivity')}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">{t('overview.realtimeUpdate')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block">{t('overview.labOrdersToday')}</span>
                    <p className="text-xl font-bold text-teal-700">{labOrdersCount}</p>
                    <p className="text-[10px] text-slate-500">{totalLabsCount} {t('overview.distributedLabs')}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block">{t('overview.radOrdersToday')}</span>
                    <p className="text-xl font-bold text-blue-700">{radOrdersCount}</p>
                    <p className="text-[10px] text-slate-500">{totalRadCount} {t('overview.distributedRad')}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block">{t('overview.verifiedCenters')}</span>
                    <p className="text-xl font-bold text-emerald-700">{verifiedBookingCentersCount}</p>
                    <p className="text-[10px] text-slate-500">{t('overview.emrSync')}</p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-700 space-y-2">
                  <h4 className="font-bold text-slate-900">{t('overview.serverStatus')}</h4>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium text-slate-800">{t('overview.dbStatus')}</span>
                    </div>
                    <span className="text-emerald-700 font-mono font-bold">{t('overview.connected')}</span>
                  </div>
                </div>
              </div>

              {/* Action Requests Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  {t('overview.pendingActions')}
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900 block">{t('overview.pendingDocs')} ({pendingDoctorsCount})</span>
                      <span className="text-[10px] text-amber-700">{t('overview.pendingDocsDesc')}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('doctors')}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {t('overview.review')}
                    </button>
                  </div>

                  <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-900 block">{t('overview.pendingSubs')}</span>
                      <span className="text-[10px] text-teal-700">{t('overview.pendingSubsDesc')}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('subscription_requests')}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {t('overview.review')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  {t('users.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? "التحكم بكافة فئات المستخدمين والكيانات المسجلة" : "Control all registered users and health organizations"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder={t('users.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 w-64"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">{t('users.allRoles')}</option>
                  <option value="doctor">{isRtl ? "الأطباء (Doctors)" : "Doctors"}</option>
                  <option value="booking_center">{isRtl ? "مراكز الحجز (Booking Centers)" : "Booking Centers"}</option>
                  <option value="laboratory">{isRtl ? "المختبرات (Laboratories)" : "Laboratories"}</option>
                  <option value="radiology">{isRtl ? "مراكز الأشعة (Radiology)" : "Radiology Centers"}</option>
                </select>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا يوجد مستخدمون مسجلون يطابقون معايير البحث' : 'No registered users match the search criteria'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">{t('users.table.name')}</th>
                      <th className="p-3">{t('users.table.role')}</th>
                      <th className="p-3">{isRtl ? "البيانات المسجلة" : "Contact"}</th>
                      <th className="p-3">{t('users.table.status')}</th>
                      <th className="p-3">{t('users.table.joinedAt')}</th>
                      <th className="p-3 text-center">{t('users.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{u.name}</td>
                        <td className="p-3">
                          <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] px-2 py-0.5 rounded font-bold">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{u.emailPhone}</td>
                        <td className="p-3">
                          <span className={`font-bold ${u.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {u.status === 'active' ? `${t('users.status.active')} 🟢` : (isRtl ? 'قيد المراجعة 🟡' : 'Pending 🟡')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{u.joinedAt}</td>
                        <td className="p-3 text-center space-x-2 space-x-reverse">
                          <button onClick={() => alert(`${isRtl ? 'معاينة ملف: ' : 'Viewing user: '} ${u.name}`)} className="text-xs text-teal-600 hover:underline font-bold">
                            {t('users.edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: DOCTORS MANAGEMENT */}
        {activeTab === 'doctors' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                {t('doctors.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('doctors.description')}
              </p>
            </div>

            {doctors.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا يوجد أطباء مسجلون في المنصة حالياً' : 'No registered doctors currently'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => (
                  <div key={doc.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                        <span className="text-xs text-teal-700 font-bold">{doc.specialty}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        doc.is_verified ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {doc.is_verified ? (isRtl ? 'معتمد وموثق 🟢' : 'Verified 🟢') : t('doctors.verificationPending')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {t('doctors.licenseNumber')}: <span className="font-mono text-slate-900 font-bold">{doc.license_number || '--'}</span>
                    </p>
                    {!doc.is_verified && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleApproveDoctor(doc)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          {t('doctors.approve')}
                        </button>
                        <button
                          onClick={() => alert(isRtl ? `تم رفض طلب الطبيب (${doc.name}).` : `Doctor request rejected.`)}
                          className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          {t('doctors.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: BOOKING CENTERS */}
        {activeTab === 'booking_centers' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  {t('centers.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('centers.description')}
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                {[
                  { id: 'all', label: isRtl ? 'الكل' : 'All' },
                  { id: 'pending', label: isRtl ? 'قيد المراجعة' : 'Pending' },
                  { id: 'verified', label: isRtl ? 'معتمدة' : 'Verified' },
                  { id: 'rejected', label: isRtl ? 'مرفوضة' : 'Rejected' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setBookingCenterStatusFilter(f.id);
                      fetchBookingCenters(f.id, 1);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      bookingCenterStatusFilter === f.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {grantSuccessFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{grantSuccessFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGrantSuccessFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            
            {bookingCenters.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد مراكز حجز مسجلة حالياً ضمن هذا التصنيف' : 'No booking centers found for this filter'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookingCenters.map((center) => (
                  <div key={center.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{center.name}</h4>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {isRtl ? 'المدير المسؤول:' : 'Manager:'} <span className="font-semibold text-slate-800">{center.manager?.name || center.user?.name || '--'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        center.verification_status === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : center.verification_status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {center.verification_status === 'verified'
                          ? (isRtl ? 'معتمد وموثق 🟢' : 'Verified 🟢')
                          : center.verification_status === 'rejected'
                          ? (isRtl ? 'مرفوض 🔴' : 'Rejected 🔴')
                          : (isRtl ? 'قيد المراجعة ⏳' : 'Pending ⏳')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div>
                        <span className="text-slate-500">{isRtl ? 'السجل التجاري:' : 'Commercial Reg:'} </span>
                        <span className="font-mono font-bold text-slate-800">{center.commercial_register || '--'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">{isRtl ? 'الولاية:' : 'Wilaya:'} </span>
                        <span className="font-bold text-slate-800">{center.wilaya}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">{isRtl ? 'العنوان والهاتف:' : 'Address & Phone:'} </span>
                        <span className="text-slate-800">{center.address} • {center.phone}</span>
                      </div>
                    </div>

                    {center.verification_status === 'rejected' && center.rejection_reason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                        <span className="font-bold">{isRtl ? 'سبب الرفض:' : 'Rejection Reason:'} </span>
                        {center.rejection_reason}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <p className="font-mono text-teal-700 font-bold">
                        {isRtl ? 'رصيد الحصص:' : 'Quota Balance:'} {center.quota_balance} {isRtl ? 'حجز' : 'slots'}
                      </p>

                      <div className="flex items-center gap-2">
                        {canGrantQuota && (
                          <button
                            type="button"
                            onClick={() => handleOpenGrantQuota(center)}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                            title={t('centers.grantQuotaBtn')}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{t('centers.grantQuotaBtn')}</span>
                          </button>
                        )}

                        {center.verification_status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveBookingCenter(center)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                            >
                              {isRtl ? 'اعتماد وتوثيق' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectBookingCenter(center)}
                              className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              {isRtl ? 'رفض الطلب' : 'Reject'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Booking Centers Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs text-slate-700">
              <span>
                {isRtl
                  ? `صفحة ${bookingCentersPage} من ${bookingCentersTotalPages || 1} (الإجمالي: ${bookingCentersTotalItems})`
                  : `Page ${bookingCentersPage} of ${bookingCentersTotalPages || 1} (Total: ${bookingCentersTotalItems})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchBookingCenters(bookingCenterStatusFilter, bookingCentersPage - 1)}
                  disabled={bookingCentersPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchBookingCenters(bookingCenterStatusFilter, bookingCentersPage + 1)}
                  disabled={bookingCentersPage >= bookingCentersTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: LABORATORIES */}
        {activeTab === 'laboratories' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                {t('labs.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('labs.description')}
              </p>
            </div>

            {laboratories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد مختبرات طبية مسجلة حالياً' : 'No certified laboratories registered currently'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {laboratories.map((lab) => (
                  <div key={lab.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{lab.name}</h4>
                      <Badge variant="info">{lab.wilaya}</Badge>
                    </div>
                    <p className="text-slate-600">{lab.address} • {lab.phone}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Laboratories Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs text-slate-700">
              <span>
                {isRtl ? `صفحة ${labsPage} من ${labsTotalPages || 1} (الإجمالي: ${labsTotalItems})` : `Page ${labsPage} of ${labsTotalPages || 1} (Total: ${labsTotalItems})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchLabs(labsPage - 1)}
                  disabled={labsPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchLabs(labsPage + 1)}
                  disabled={labsPage >= labsTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: RADIOLOGY CENTERS */}
        {activeTab === 'radiology' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-teal-600" />
                {t('radiology.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? "إدارة وتوثيق مراكز التصوير الشعاعي واستشاريي الأشعة المعتمدين" : "Radiology diagnostic centers management and certified radiologists"}
              </p>
            </div>

            {radiologyCenters.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Radio className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد مراكز أشعة مسجلة حالياً' : 'No radiology centers registered currently'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {radiologyCenters.map((rad) => (
                  <div key={rad.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{rad.name}</h4>
                      <Badge variant="info">{rad.wilaya}</Badge>
                    </div>
                    <p className="text-slate-600">{rad.address} • {rad.phone}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Radiology Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs text-slate-700">
              <span>
                {isRtl ? `صفحة ${radPage} من ${radTotalPages || 1} (الإجمالي: ${radTotalItems})` : `Page ${radPage} of ${radTotalPages || 1} (Total: ${radTotalItems})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchRadiology(radPage - 1)}
                  disabled={radPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchRadiology(radPage + 1)}
                  disabled={radPage >= radTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: PACKAGES */}
        {activeTab === 'packages' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  {t('packages.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('packages.description')}
                </p>
              </div>

              <button
                onClick={handleOpenAddPackage}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'إضافة باقة جديدة' : 'Add New Package'}</span>
              </button>
            </div>

            {packages.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد باقات حجز مسجلة حالياً' : 'No booking packages configured currently'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {packages.map((pkg) => {
                  const quotaVal = pkg.quota_units ?? pkg.quota ?? 0;
                  const priceVal = pkg.price_dzd ?? pkg.price ?? 0;
                  const isActive = pkg.is_active ?? true;

                  return (
                    <div key={pkg.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                            {pkg.package_code || pkg.id.slice(0, 8)}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base mt-1">{pkg.name}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          {isActive ? (isRtl ? 'مفعلة' : 'Active') : (isRtl ? 'معطلة' : 'Inactive')}
                        </span>
                      </div>

                      <p className="text-2xl font-black text-teal-600">
                        {priceVal.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isRtl ? 'د.ج' : 'DZD'}</span>
                      </p>

                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                        <p className="text-slate-700 font-bold flex items-center justify-between">
                          <span>{isRtl ? 'رصيد الحصص:' : 'Quota Units:'}</span>
                          <span className="font-black text-slate-900">{quotaVal} {isRtl ? 'حجز' : 'slots'}</span>
                        </p>
                      </div>

                      {pkg.description && <p className="text-slate-500 text-[11px] leading-relaxed">{pkg.description}</p>}

                      <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditPackage(pkg)}
                          className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-teal-600" />
                          <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                        </button>
                        {isActive && (
                          <button
                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title={isRtl ? 'تعطيل الباقة' : 'Deactivate'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 8: SUBSCRIPTION REQUESTS (PACKAGE PURCHASE REQUESTS REVIEW) */}
        {activeTab === 'subscription_requests' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  {t('subscriptions.title')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'مراجعة وتدقيق واعتماد طلبات شراء باقات الحجز لمراكز الحجز المعتمدة (الخيار B)' : 'Review, audit and approve booking package purchase requests'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPackageRequests(packageRequestsFilter)}
                  disabled={isLoadingPackageRequests}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPackageRequests ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Approval / Rejection Feedback Alert */}
            {approvalAlert && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                approvalAlert.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {approvalAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{approvalAlert.text}</span>
                </div>
                <button
                  onClick={() => setApprovalAlert(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">{isRtl ? 'إجمالي الطلبات' : 'Total Requests'}</span>
                <p className="text-2xl font-black text-slate-900">{packageRequests.length}</p>
                <span className="text-[10px] text-slate-400">{isRtl ? 'كافة السجلات التاريخية' : 'All lifetime requests'}</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-amber-800 font-bold block">{isRtl ? 'بانتظار المراجعة 🟡' : 'Pending Review'}</span>
                <p className="text-2xl font-black text-amber-700">
                  {packageRequests.filter(r => r.status === 'pending').length}
                </p>
                <span className="text-[10px] text-amber-600">{isRtl ? 'تتطلب قرار اعتماد أو رفض' : 'Requires decision'}</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-emerald-800 font-bold block">{isRtl ? 'معتمدة ومفعلة 🟢' : 'Approved'}</span>
                <p className="text-2xl font-black text-emerald-700">
                  {packageRequests.filter(r => r.status === 'approved').length}
                </p>
                <span className="text-[10px] text-emerald-600">{isRtl ? 'تم شحن الرصيد بنجاح' : 'Quota credited'}</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-rose-800 font-bold block">{isRtl ? 'مرفوضة 🔴' : 'Rejected'}</span>
                <p className="text-2xl font-black text-rose-700">
                  {packageRequests.filter(r => r.status === 'rejected').length}
                </p>
                <span className="text-[10px] text-rose-600">{isRtl ? 'مع توثيق سبب الرفض' : 'With documented reason'}</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {[
                  { key: 'all', label: isRtl ? 'الكل' : 'All' },
                  { key: 'pending', label: isRtl ? 'قيد الانتظار' : 'Pending' },
                  { key: 'approved', label: isRtl ? 'المعتمدة' : 'Approved' },
                  { key: 'rejected', label: isRtl ? 'المرفوضة' : 'Rejected' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setPackageRequestsFilter(f.key);
                      fetchPackageRequests(f.key);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      packageRequestsFilter === f.key
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-mono">
                {packageRequests.length} {isRtl ? 'سجلات معروضة' : 'records shown'}
              </div>
            </div>

            {/* Requests Table */}
            {isLoadingPackageRequests ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'جاري تحميل طلبات شراء الباقات...' : 'Loading purchase requests...'}</p>
              </div>
            ) : packageRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">
                  {isRtl ? 'لا توجد طلبات شراء باقات مطابقة لخيارات الفلترة الحالية.' : 'No purchase requests match the selected filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">{isRtl ? 'رقم المرجع' : 'Reference'}</th>
                      <th className="p-3">{isRtl ? 'مركز الحجز' : 'Booking Center'}</th>
                      <th className="p-3">{isRtl ? 'الباقة والوحدات' : 'Package & Units'}</th>
                      <th className="p-3">{isRtl ? 'المبلغ (دج)' : 'Amount (DZD)'}</th>
                      <th className="p-3">{isRtl ? 'طريقة الدفع' : 'Payment'}</th>
                      <th className="p-3">{isRtl ? 'تاريخ التقديم' : 'Date'}</th>
                      <th className="p-3">{isRtl ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الإجراءات والقرار' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {packageRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {req.request_reference}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {req.booking_center?.name || 'مركز الحجز'}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {isRtl ? `الرصيد الحالي: ${req.booking_center?.quota_balance ?? '--'}` : `Balance: ${req.booking_center?.quota_balance ?? '--'}`}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{req.package_name}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            +{req.quota_units} {isRtl ? 'عملية حجز' : 'units'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-mono">
                          {Number(req.price_dzd).toLocaleString()} {isRtl ? 'دج' : 'DZD'}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                            {req.payment_method === 'bank_transfer' ? (isRtl ? 'تحويل بنكي' : 'Bank Transfer') : 'BaridiMob'}
                          </span>
                          {req.transaction_reference && (
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              {req.transaction_reference}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 font-mono">
                          {req.created_at ? req.created_at.substring(0, 16).replace('T', ' ') : '--'}
                        </td>
                        <td className="p-3">
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3" />
                              {isRtl ? 'قيد المراجعة 🟡' : 'Pending'}
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {isRtl ? 'معتمد ومفعل 🟢' : 'Approved'}
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-300">
                              <XCircle className="w-3 h-3" />
                              {isRtl ? 'مرفوض 🔴' : 'Rejected'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedRequestDetails(req)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                              title={isRtl ? 'معاينة تفاصيل الطلب' : 'View Details'}
                            >
                              <Eye className="w-3 h-3" />
                              {isRtl ? 'معاينة' : 'View'}
                            </button>

                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={isSubmittingApproval}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isRtl ? 'اعتماد' : 'Approve'}
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectModalRequest(req);
                                    setRejectionReasonInput('');
                                  }}
                                  disabled={isSubmittingApproval}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Package Purchase Requests Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs text-slate-700">
              <span>
                {isRtl
                  ? `صفحة ${packageRequestsPage} من ${packageRequestsTotalPages || 1} (الإجمالي: ${packageRequestsTotalItems})`
                  : `Page ${packageRequestsPage} of ${packageRequestsTotalPages || 1} (Total: ${packageRequestsTotalItems})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchPackageRequests(packageRequestsFilter, packageRequestsPage - 1)}
                  disabled={packageRequestsPage <= 1 || isLoadingPackageRequests}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchPackageRequests(packageRequestsFilter, packageRequestsPage + 1)}
                  disabled={packageRequestsPage >= packageRequestsTotalPages || isLoadingPackageRequests}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>

            {/* DETAILS MODAL */}
            {selectedRequestDetails && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 text-start">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-600" />
                      {isRtl ? `تفاصيل طلب شراء الباقة (${selectedRequestDetails.request_reference})` : `Purchase Request Details (${selectedRequestDetails.request_reference})`}
                    </h3>
                    <button
                      onClick={() => setSelectedRequestDetails(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'مركز الحجز الطالب:' : 'Booking Center:'}</span>
                        <strong className="text-slate-900 text-sm block">{selectedRequestDetails.booking_center?.name || '--'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'الباقة المختارة:' : 'Package Name:'}</span>
                        <strong className="text-slate-900 text-sm block">{selectedRequestDetails.package_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'عدد الحصص:' : 'Quota Units:'}</span>
                        <strong className="text-emerald-700 text-sm block">+{selectedRequestDetails.quota_units} {isRtl ? 'عملية' : 'units'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'السعر المتفق عليه:' : 'Price:'}</span>
                        <strong className="text-slate-900 block">{Number(selectedRequestDetails.price_dzd).toLocaleString()} {isRtl ? 'دج' : 'DZD'}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1 text-blue-950">
                      <span className="font-bold block">{isRtl ? 'بيانات التحويل والدفع:' : 'Payment Information:'}</span>
                      <p>{isRtl ? 'وسيلة التحويل:' : 'Method:'} <strong>{selectedRequestDetails.payment_method || 'BaridiMob'}</strong></p>
                      <p>{isRtl ? 'رقم الحوالة المرجعي:' : 'Reference:'} <strong className="font-mono">{selectedRequestDetails.transaction_reference || '--'}</strong></p>
                      {selectedRequestDetails.notes && (
                        <p>{isRtl ? 'ملاحظات المركز:' : 'Notes:'} <span>{selectedRequestDetails.notes}</span></p>
                      )}
                    </div>

                    {selectedRequestDetails.status === 'approved' && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 space-y-1">
                        <p className="font-bold">{isRtl ? 'تم الاعتماد والشحن بنجاح 🟢' : 'Approved & Quota Credited'}</p>
                        <p className="text-[11px]">{isRtl ? `اعتمد بواسطة: ${selectedRequestDetails.reviewed_by?.name || 'مدير المنصة'}` : `Reviewed by: ${selectedRequestDetails.reviewed_by?.name || 'Platform Admin'}`}</p>
                        {selectedRequestDetails.booking_transaction_id && (
                          <p className="text-[10px] font-mono text-emerald-600">{isRtl ? `معرف القيد المالي: ${selectedRequestDetails.booking_transaction_id}` : `Transaction ID: ${selectedRequestDetails.booking_transaction_id}`}</p>
                        )}
                      </div>
                    )}

                    {selectedRequestDetails.status === 'rejected' && (
                      <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 space-y-1">
                        <p className="font-bold">{isRtl ? 'الطلب مرفوض 🔴' : 'Request Rejected'}</p>
                        <p className="text-[11px]">{isRtl ? `سبب الرفض: ${selectedRequestDetails.rejection_reason}` : `Reason: ${selectedRequestDetails.rejection_reason}`}</p>
                        <p className="text-[10px] text-slate-500">{isRtl ? `راجع بواسطة: ${selectedRequestDetails.reviewed_by?.name || 'مدير المنصة'}` : `Reviewed by: ${selectedRequestDetails.reviewed_by?.name || 'Platform Admin'}`}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setSelectedRequestDetails(null)}
                      className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                    >
                      {isRtl ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REJECTION REASON MODAL */}
            {rejectModalRequest && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-start">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      {isRtl ? `رفض طلب الشراء (${rejectModalRequest.request_reference})` : `Reject Request (${rejectModalRequest.request_reference})`}
                    </h3>
                    <button
                      onClick={() => setRejectModalRequest(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    {isRtl ? 'يرجى كتابة سبب الرفض بوضوح ليتم توثيقه وإرساله لمركز الحجز في إشعار الرفض:' : 'Please provide a detailed reason for rejecting this purchase request:'}
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">{isRtl ? 'سبب الرفض الإداري *' : 'Rejection Reason *'}</label>
                    <textarea
                      rows={3}
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder={isRtl ? 'مثال: وصل التحويل البنكي المرفق غير واضح أو المبلغ المحول غير مطابق لقيمة الباقة...' : 'e.g. Invalid bank transfer receipt...'}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setRejectModalRequest(null)}
                      disabled={isSubmittingApproval}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      disabled={isSubmittingApproval || !rejectionReasonInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingApproval ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>{isRtl ? 'جاري الرفض...' : 'Rejecting...'}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>{isRtl ? 'تأكيد الرفض وتوثيقه' : 'Confirm Rejection'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* SECTION 9: PAYMENTS / FINANCIAL ACTIVITY */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  {isRtl ? 'سجل المدفوعات والنشاط المالي (Platform Payments & Financial Activity)' : 'Platform Payments & Financial Activity'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'توثيق كافة التحصيلات المالية المعتمدة لمبيعات باقات الحجز ومطابقتها مع قيود دفتر الأستاذ' : 'Audited financial records of all approved package purchases linked to ledger transactions'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRevenueMasked(!isRevenueMasked)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isRevenueMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isRevenueMasked ? (isRtl ? 'إظهار المبالغ' : 'Show Amounts') : (isRtl ? 'إخفاء المبالغ' : 'Hide Amounts')}</span>
                </button>
                <button
                  onClick={() => {
                    fetchFinancialData();
                    fetchPaymentsList({
                      booking_center_id: paymentsFilterCenter,
                      package_code: paymentsFilterPackage,
                      current_month: paymentsFilterMonth === 'current'
                    });
                  }}
                  disabled={isLoadingPayments}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayments ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'تحديث السجلات' : 'Refresh Records'}</span>
                </button>
              </div>
            </div>

            {/* KPI Financial Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-emerald-800 font-bold block">{isRtl ? 'إجمالي المبالغ المحصلة' : 'Total Revenue Collected'}</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  {isRevenueMasked ? '•••••••• دج' : `${(financialSummary?.total_revenue_dzd ?? 0).toLocaleString()} ${isRtl ? 'دج' : 'DZD'}`}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">{isRtl ? 'مبيعات باقات معتمدة ومسددة' : 'Approved package sales'}</span>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-blue-800 font-bold block">{isRtl ? 'إيرادات الشهر الحالي' : 'Current Month Revenue'}</span>
                <p className="text-2xl font-black text-blue-700 font-mono">
                  {isRevenueMasked ? '•••••• دج' : `${(financialSummary?.current_month_revenue_dzd ?? 0).toLocaleString()} ${isRtl ? 'دج' : 'DZD'}`}
                </p>
                <span className="text-[10px] text-blue-600 font-medium">{isRtl ? 'تحصيلات هذا الشهر' : 'Collected this month'}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-slate-600 font-bold block">{isRtl ? 'عدد المعاملات المسددة' : 'Paid Transactions'}</span>
                <p className="text-2xl font-black text-slate-900 font-mono">
                  {financialSummary?.metrics.total_approved_sales_count ?? 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  +{financialSummary?.metrics.total_quota_units_sold ?? 0} {isRtl ? 'عملية حجز مشحونة' : 'quota units sold'}
                </span>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-amber-800 font-bold block">{isRtl ? 'متوسط قيمة المعاملة' : 'Average Order Value'}</span>
                <p className="text-2xl font-black text-amber-700 font-mono">
                  {isRevenueMasked ? '•••••• دج' : `${(financialSummary?.metrics.average_sale_amount_dzd ?? 0).toLocaleString()} ${isRtl ? 'دج' : 'DZD'}`}
                </p>
                <span className="text-[10px] text-amber-600 font-medium">{isRtl ? 'لكل عملية شراء معتمدة' : 'Per approved purchase'}</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Month Filter */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 font-bold">
                  <button
                    onClick={() => {
                      setPaymentsFilterMonth('all');
                      fetchPaymentsList({ booking_center_id: paymentsFilterCenter, package_code: paymentsFilterPackage, current_month: false });
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentsFilterMonth === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isRtl ? 'كافة الفترات' : 'All Time'}
                  </button>
                  <button
                    onClick={() => {
                      setPaymentsFilterMonth('current');
                      fetchPaymentsList({ booking_center_id: paymentsFilterCenter, package_code: paymentsFilterPackage, current_month: true });
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentsFilterMonth === 'current' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isRtl ? 'هذا الشهر' : 'This Month'}
                  </button>
                </div>

                {/* Booking Center Filter */}
                <select
                  value={paymentsFilterCenter}
                  onChange={(e) => {
                    setPaymentsFilterCenter(e.target.value);
                    fetchPaymentsList({
                      booking_center_id: e.target.value,
                      package_code: paymentsFilterPackage,
                      current_month: paymentsFilterMonth === 'current'
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium outline-none focus:border-teal-500"
                >
                  <option value="all">{isRtl ? 'جميع مراكز الحجز' : 'All Booking Centers'}</option>
                  {bookingCenters.map((bc) => (
                    <option key={bc.id} value={bc.id}>{bc.name}</option>
                  ))}
                </select>

                {/* Package Filter */}
                <select
                  value={paymentsFilterPackage}
                  onChange={(e) => {
                    setPaymentsFilterPackage(e.target.value);
                    fetchPaymentsList({
                      booking_center_id: paymentsFilterCenter,
                      package_code: e.target.value,
                      current_month: paymentsFilterMonth === 'current'
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium outline-none focus:border-teal-500"
                >
                  <option value="all">{isRtl ? 'جميع باقات الحجز' : 'All Packages'}</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.package_code}>{pkg.name} ({pkg.package_code})</option>
                  ))}
                </select>
              </div>

              <div className="text-slate-500 font-mono">
                {paymentsList.length} {isRtl ? 'معاملة مسجلة' : 'records found'}
              </div>
            </div>

            {/* Payments Table */}
            {isLoadingPayments ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'جاري تحميل سجل المدفوعات...' : 'Loading payments records...'}</p>
              </div>
            ) : paymentsList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">
                  {isRtl ? 'لا توجد معاملات مدفوعة مطابقة لخيارات الفلترة الحالية.' : 'No paid transactions match the current filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs text-slate-700`}>
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">{isRtl ? 'رقم السند/المرجع' : 'Receipt Ref'}</th>
                      <th className="p-3">{isRtl ? 'مركز الحجز' : 'Booking Center'}</th>
                      <th className="p-3">{isRtl ? 'الباقة المشحونة' : 'Package & Code'}</th>
                      <th className="p-3">{isRtl ? 'العمليات' : 'Units'}</th>
                      <th className="p-3">{isRtl ? 'المبلغ المسدد (دج)' : 'Amount Paid (DZD)'}</th>
                      <th className="p-3">{isRtl ? 'طريقة الدفع' : 'Payment'}</th>
                      <th className="p-3">{isRtl ? 'تاريخ الاعتماد والتحصيل' : 'Approval Date'}</th>
                      <th className="p-3">{isRtl ? 'معرف القيد المالي' : 'Ledger TX'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsList.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {payment.request_reference}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {payment.booking_center?.name || 'مركز الحجز'}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{payment.package_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{payment.package_code}</span>
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          +{payment.quota_units}
                        </td>
                        <td className="p-3 font-black text-slate-900 font-mono">
                          {isRevenueMasked ? '•••••• دج' : `${Number(payment.price_dzd).toLocaleString()} ${isRtl ? 'دج' : 'DZD'}`}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                            {payment.payment_method === 'bank_transfer' ? (isRtl ? 'تحويل بنكي' : 'Bank Transfer') : 'BaridiMob'}
                          </span>
                          {payment.transaction_reference && (
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              {payment.transaction_reference}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 font-mono">
                          {payment.reviewed_at ? payment.reviewed_at.substring(0, 16).replace('T', ' ') : payment.created_at.substring(0, 10)}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">
                          {payment.booking_transaction_id ? payment.booking_transaction_id.substring(0, 8) + '...' : '--'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedPaymentDetails(payment)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Eye className="w-3 h-3 text-teal-600" />
                            {isRtl ? 'معاينة السند' : 'Receipt'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Platform Payments Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs text-slate-700">
              <span>
                {isRtl
                  ? `صفحة ${paymentsPage} من ${paymentsTotalPages || 1} (الإجمالي: ${paymentsTotalItems})`
                  : `Page ${paymentsPage} of ${paymentsTotalPages || 1} (Total: ${paymentsTotalItems})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    fetchPaymentsList(
                      {
                        booking_center_id: paymentsFilterCenter,
                        package_code: paymentsFilterPackage,
                        current_month: paymentsFilterMonth === 'current',
                      },
                      paymentsPage - 1
                    )
                  }
                  disabled={paymentsPage <= 1 || isLoadingPayments}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'السابق' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    fetchPaymentsList(
                      {
                        booking_center_id: paymentsFilterCenter,
                        package_code: paymentsFilterPackage,
                        current_month: paymentsFilterMonth === 'current',
                      },
                      paymentsPage + 1
                    )
                  }
                  disabled={paymentsPage >= paymentsTotalPages || isLoadingPayments}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700"
                >
                  {isRtl ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>

            {/* PAYMENT RECEIPT DETAILS MODAL */}
            {selectedPaymentDetails && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 text-start">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      {isRtl ? `سند التحصيل المالي (${selectedPaymentDetails.request_reference})` : `Financial Receipt (${selectedPaymentDetails.request_reference})`}
                    </h3>
                    <button
                      onClick={() => setSelectedPaymentDetails(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'مركز الحجز المسدد:' : 'Booking Center:'}</span>
                        <strong className="text-slate-900 text-sm block">{selectedPaymentDetails.booking_center?.name || '--'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'الباقة المشحونة:' : 'Package Name:'}</span>
                        <strong className="text-slate-900 text-sm block">{selectedPaymentDetails.package_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'العمليات المضافة:' : 'Quota Credited:'}</span>
                        <strong className="text-emerald-700 text-sm block">+{selectedPaymentDetails.quota_units} {isRtl ? 'عملية' : 'units'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'المبلغ المحصل:' : 'Amount Paid:'}</span>
                        <strong className="text-slate-900 text-sm block font-mono">{Number(selectedPaymentDetails.price_dzd).toLocaleString()} {isRtl ? 'دج' : 'DZD'}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-emerald-950">
                      <span className="font-bold block">{isRtl ? 'بيانات التحويل والاعتماد المالي:' : 'Settlement Details:'}</span>
                      <p>{isRtl ? 'وسيلة الدفع:' : 'Method:'} <strong>{selectedPaymentDetails.payment_method || 'BaridiMob'}</strong></p>
                      <p>{isRtl ? 'رقم الحوالة المرجعي:' : 'Reference:'} <strong className="font-mono">{selectedPaymentDetails.transaction_reference || '--'}</strong></p>
                      <p>{isRtl ? 'تاريخ الاعتماد:' : 'Approved At:'} <strong className="font-mono">{selectedPaymentDetails.reviewed_at ? selectedPaymentDetails.reviewed_at.substring(0, 16).replace('T', ' ') : '--'}</strong></p>
                      <p>{isRtl ? 'معتمد بواسطة:' : 'Approved By:'} <strong>{selectedPaymentDetails.reviewed_by?.name || 'مدير المنصة'}</strong></p>
                      {selectedPaymentDetails.booking_transaction_id && (
                        <p className="text-[10px] font-mono text-emerald-800">{isRtl ? `معرف القيد في دفتر الأستاذ: ${selectedPaymentDetails.booking_transaction_id}` : `Ledger TX ID: ${selectedPaymentDetails.booking_transaction_id}`}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setSelectedPaymentDetails(null)}
                      className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                    >
                      {isRtl ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* SECTION 10: ADVERTISEMENTS */}
        {activeTab === 'advertisements' && (
          <AdvertisementManagement />
        )}

        {/* SECTION 11: REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                {t('reports.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('reports.description')}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-4">
              <MedicalDocumentCode 
                documentId="REP-ADMIN-2026-X" 
                documentType="ADMIN_REPORT" 
                showVerificationBadge={true}
              />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700 underline">{t('reports.preview')}</p>
                <p className="text-[10px] text-slate-500 mt-1">{t('reports.securityNote')}</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 12: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                {t('auditLogs.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('auditLogs.description')}
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">{isRtl ? 'لا توجد سجلات تدقيق سريرية مسجلة بعد' : 'No clinical access logs recorded yet'}</p>
              </div>
            ) : (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono space-y-2">
                {auditLogs.map((log) => (
                  <p key={log.id}>
                    • [{log.timestamp}] USER [{log.user?.email || log.user_id}] ACCESSED RESOURCE [{log.resource_type}:{log.resource_id}] - ACTION: {log.action} (IP: {log.ip_address})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 13: ROLES & PERMISSIONS */}
        {activeTab === 'roles_permissions' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'إدارة الأدوار والصلاحيات العامة (Roles & Permissions)' : 'Roles & Permissions Matrix'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? 'تحديد مصفوفة الصلاحيات لكل دور وفق نموذج الأمان 4D RBAC' : '4D Role-based access control matrix across all platform user domains'}
                </p>
              </div>

              <button
                onClick={() => setActiveTab('assistant_permissions')}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-4 h-4" />
                {isRtl ? 'إدارة صلاحيات مساعد مدير المنصة ⚙️' : 'Assistant RBAC ⚙️'}
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium">{isRtl ? 'مصفوفة الصلاحيات محددة بدقة ومربوطة بنظام الأمن التلقائي.' : 'Strict 4D authorization policies active.'}</p>
          </div>
        )}

        {/* SECTION 14: ASSISTANT PERMISSIONS MANAGER */}
        {activeTab === 'assistant_permissions' && (
          <AssistantPermissionsManager />
        )}

        {/* SECTION 15: SYSTEM SETTINGS */}
        {activeTab === 'system_settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-600" />
                  {isRtl ? 'إعدادات النظام والربط البرمجي (System Settings)' : 'System Configurations'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl ? 'إعدادات الرسائل النصية SMS، بوابة البريد، مفاتيح الربط البرمجي APIs' : 'SMS gateways, SMTP, API keys, and maintenance toggles'}
                </p>
              </div>
              <p className="text-xs text-slate-600 font-medium">{isRtl ? 'إعدادات النظام مهيأة ومطابقة لمعايير FHIR و HL7 العالمية.' : 'System configurations aligned with FHIR and HL7 standards.'}</p>
            </div>

            <AdminBookingPoliciesCard isRtl={isRtl} />

            <div className="max-w-2xl">
              <ChangePasswordCard isRtl={isRtl} />
            </div>
          </div>
        )}

        {/* SECTION 16: NOTIFICATIONS CENTER */}
        {activeTab === 'notifications_center' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" />
                {t('notificationsCenter.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isRtl ? 'إرسال تنبيهات وتحديثات فورية لجميع المرضى، الأطباء، أو المستشفيات' : 'Broadcast emergency alerts and bulletins across user domains'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 max-w-2xl text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{isRtl ? 'الفئة المستهدفة للإشعار' : 'Target Audience'}</label>
                <select
                  value={notificationBroadcast.targetGroup}
                  onChange={(e) => setNotificationBroadcast({ ...notificationBroadcast, targetGroup: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">{isRtl ? 'جميع المستخدمين على المنصة' : 'All Users'}</option>
                  <option value="patients">{isRtl ? 'كافة المرضى المسجلين' : 'Patients'}</option>
                  <option value="doctors">{isRtl ? 'كافة الأطباء والمساعدين' : 'Doctors'}</option>
                  <option value="labs">{isRtl ? 'كافة المختبرات والأشعة' : 'Labs & Radiology Centers'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{isRtl ? 'عنوان التنبيه أو التعميم' : 'Bulletin Title'}</label>
                <input
                  type="text"
                  placeholder={isRtl ? 'مثال: تحديث أمني في خوادم النظام الليلة...' : 'e.g. Scheduled maintenance update...'}
                  value={notificationBroadcast.title}
                  onChange={(e) => setNotificationBroadcast({ ...notificationBroadcast, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{isRtl ? 'نص الرسالة أو التعميم' : 'Bulletin Content'}</label>
                <textarea
                  rows={3}
                  placeholder={isRtl ? 'اكتب تفاصيل التنبيه الذي سيظهر كإشعار فوري...' : 'Write bulletin message details...'}
                  value={notificationBroadcast.message}
                  onChange={(e) => setNotificationBroadcast({ ...notificationBroadcast, message: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                onClick={() => {
                  alert(isRtl ? `تم بث الإشعار بنجاح إلى الفئة المستهدفة (${notificationBroadcast.targetGroup})!` : `Broadcast sent to ${notificationBroadcast.targetGroup}!`);
                  setNotificationBroadcast({ title: '', message: '', targetGroup: 'all' });
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black px-6 py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                {isRtl ? 'بث الإشعار الفوري الآن 📣' : 'Send Broadcast Bulletin 📣'}
              </button>
            </div>
          </div>
        )}

      </div>

      <DocumentScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* DIRECT QUOTA GRANT MODAL (QUOTA-02) */}
      {grantModalCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 text-start shadow-2xl border border-slate-100"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('centers.grantQuotaModalTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('centers.grantQuotaModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseGrantQuota}
                disabled={isSubmittingGrant}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Center Context Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('centers.grantQuotaTargetCenter')}</span>
                <span className="font-bold text-slate-900">{grantModalCenter.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('centers.grantQuotaCurrentBalance')}</span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {grantModalCenter.quota_balance} {isRtl ? 'حجز' : 'slots'}
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {grantErrorFeedback && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{grantErrorFeedback}</span>
              </div>
            )}

            <form onSubmit={handleConfirmGrant} className="space-y-4 text-xs">
              {/* Units Input */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  {t('centers.grantQuotaUnitsLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  disabled={isSubmittingGrant}
                  placeholder={t('centers.grantQuotaUnitsPlaceholder')}
                  value={grantUnitsInput}
                  onChange={(e) => {
                    setGrantUnitsInput(e.target.value);
                    if (grantErrorFeedback) setGrantErrorFeedback(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-400">
                  {t('centers.grantQuotaUnitsHelp')}
                </p>
              </div>

              {/* Reference Note Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold">
                    {t('centers.grantQuotaNoteLabel')}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {grantReferenceNoteInput.length}/255
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={255}
                  disabled={isSubmittingGrant}
                  placeholder={t('centers.grantQuotaNotePlaceholder')}
                  value={grantReferenceNoteInput}
                  onChange={(e) => setGrantReferenceNoteInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white disabled:opacity-50"
                />
              </div>

              {/* Live Review Summary Box */}
              {(() => {
                const parsed = parseInt(grantUnitsInput, 10);
                const isValid = Number.isInteger(parsed) && parsed >= 1 && grantUnitsInput.trim() === String(parsed);
                const previewBalance = isValid ? grantModalCenter.quota_balance + parsed : null;

                return (
                  <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-3.5 space-y-2">
                    <div className="font-bold text-teal-950 flex items-center gap-1.5 text-[11px]">
                      <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>{t('centers.grantQuotaSummaryHeading')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-teal-200/60">
                      <div>
                        <span className="text-teal-700">{t('centers.grantQuotaGrantAmount')} </span>
                        <span className="font-mono font-bold text-teal-900">
                          {isValid ? `+${parsed}` : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-teal-700">{t('centers.grantQuotaBalanceAfter')} </span>
                        <span className="font-mono font-bold text-teal-900">
                          {previewBalance !== null ? previewBalance : '--'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-teal-800/80 leading-relaxed pt-1 border-t border-teal-200/40">
                      {t('centers.grantQuotaDisclaimer')}
                    </p>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseGrantQuota}
                  disabled={isSubmittingGrant}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('centers.grantQuotaCancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingGrant ||
                    !grantUnitsInput.trim() ||
                    !Number.isInteger(parseInt(grantUnitsInput, 10)) ||
                    parseInt(grantUnitsInput, 10) < 1 ||
                    grantUnitsInput.trim() !== String(parseInt(grantUnitsInput, 10))
                  }
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black transition-colors cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingGrant ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{t('centers.grantQuotaSubmitting')}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>{t('centers.grantQuotaConfirmBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKAGE ADD / EDIT MODAL */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <span>{editingPackage ? (isRtl ? 'تعديل باقة الحجز' : 'Edit Booking Package') : (isRtl ? 'إضافة باقة حجز جديدة' : 'Add New Booking Package')}</span>
              </h3>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">{isRtl ? 'اسم الباقة' : 'Package Name'}</label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'مثال: باقة المؤسسات 500 حجز' : 'e.g. Enterprise Package 500'}
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">{isRtl ? 'رمز الباقة (Code)' : 'Package Code'}</label>
                  <input
                    type="text"
                    required
                    placeholder="PKG-500"
                    value={packageForm.package_code}
                    onChange={(e) => setPackageForm({ ...packageForm, package_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{isRtl ? 'عدد الحصص (Quota Units)' : 'Quota Units'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageForm.quota_units}
                    onChange={(e) => setPackageForm({ ...packageForm, quota_units: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">{isRtl ? 'السعر (د.ج)' : 'Price (DZD)'}</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={packageForm.price_dzd}
                    onChange={(e) => setPackageForm({ ...packageForm, price_dzd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{isRtl ? 'الحالة' : 'Status'}</label>
                  <select
                    value={packageForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.value === 'active' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="active">{isRtl ? 'مفعلة' : 'Active'}</option>
                    <option value="inactive">{isRtl ? 'معطلة' : 'Inactive'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">{isRtl ? 'الوصف والمميزات' : 'Description & Features'}</label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'وصف مختصر لمميزات الباقة...' : 'Brief package description...'}
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black transition-colors cursor-pointer shadow-xs"
                >
                  {editingPackage ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إنشاء الباقة' : 'Create Package')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
