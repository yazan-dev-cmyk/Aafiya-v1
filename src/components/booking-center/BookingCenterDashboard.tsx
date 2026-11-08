'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import {
  BookingRecord,
  BookingStatus,
  PatientRecord,
  EmployeeRecord,
  AuditLogEntry,
  SystemNotification,
  PackageDetails,
  BillingInvoice
} from '../../types';
import { DEFAULT_EMPTY_PACKAGE_DETAILS } from '../../data/bookingCenterData';

// Sub-Tabs imports
import { DashboardHomeTab } from './tabs/DashboardHomeTab';
import { NewBookingWizardTab } from './tabs/NewBookingWizardTab';
import { BookingsListTab } from './tabs/BookingsListTab';
import { CalendarViewTab } from './tabs/CalendarViewTab';
import { PatientsDirectoryTab } from './tabs/PatientsDirectoryTab';
import { BookingStatusTrackerTab } from './tabs/BookingStatusTrackerTab';
import { PackagesQuotaTab } from './tabs/PackagesQuotaTab';
import { BillingInvoicesTab } from './tabs/BillingInvoicesTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { ReportsAnalyticsTab } from './tabs/ReportsAnalyticsTab';
import { EmployeesAuditTab } from './tabs/EmployeesAuditTab';
import { ProfileSettingsTab } from './tabs/ProfileSettingsTab';
import { BookingCenterPendingVerificationView } from './BookingCenterPendingVerificationView';
import { BookingCenterRejectedView } from './BookingCenterRejectedView';
import { BookingCenterSuspendedView } from './BookingCenterSuspendedView';

// Icons
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Calendar,
  Users,
  Activity,
  Package,
  Receipt,
  Bell,
  BarChart3,
  UserCheck,
  Settings,
  X,
  Lock,
  MessageSquare,
  Printer,
  Building,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  QrCode,
  Download,
  Loader2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  openWhatsAppAppointmentShare,
  downloadAppointmentCardPng,
  AppointmentTicketData,
  WhatsAppLanguage
} from '@/lib/appointmentTicketCard';

import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '@/auth';
import { appointmentService } from '@/services/appointmentService';
import { bookingCenterService, BookingCenterFinancialSummary } from '@/services/bookingCenterService';

interface BookingCenterDashboardProps {
  onBackToMainPlatform: () => void;
}

export const BookingCenterDashboard: React.FC<BookingCenterDashboardProps> = ({
  onBackToMainPlatform,
}) => {
  const t = useTranslations('bookingCenter');
  const { user } = useAuth();
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [showZeroBalanceModal, setShowZeroBalanceModal] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Application State
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [packageDetails, setPackageDetails] = useState<PackageDetails>(DEFAULT_EMPTY_PACKAGE_DETAILS);
  const [financialSummary, setFinancialSummary] = useState<BookingCenterFinancialSummary | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [preselectedPatient, setPreselectedPatient] = useState<PatientRecord | null>(null);
  const [employees] = useState<EmployeeRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [invoices] = useState<BillingInvoice[]>([]);

  // Authoritative operational balance sourced directly from backend (live quota or user profile)
  const currentBalance = Number(packageDetails?.remainingQuota ?? user?.booking_center?.quota_balance ?? 0);
  const currentBalanceFormatted = (Number.isFinite(currentBalance) ? currentBalance : 0).toFixed(2);

  React.useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'dashboard';
    if (urlTab === 'new-booking') {
      if (currentBalance <= 0) {
        setShowZeroBalanceModal(true);
        setActiveTab('dashboard');
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        params.delete('tab');
        const qs = params.toString();
        const targetUrl = qs ? `${pathname}?${qs}` : pathname;
        router.replace(targetUrl, { scroll: false });
        return;
      }
    }
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, currentBalance]);

  const handleTabChange = (newTab: string) => {
    if (newTab === 'new-booking') {
      if (currentBalance <= 0) {
        setShowZeroBalanceModal(true);
        return;
      }
    }
    setActiveTab(newTab);
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

  const handleOpenNewBooking = () => {
    if (currentBalance <= 0) {
      setShowZeroBalanceModal(true);
      return;
    }
    handleTabChange('new-booking');
  };

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!user?.booking_center || user.booking_center.verification_status !== 'verified' || !user.booking_center.is_active) {
        return;
      }
      try {
        const [appRes, quotaRes, txRes, finRes] = await Promise.allSettled([
          appointmentService.getAppointments(),
          bookingCenterService.getQuotaBalance(),
          bookingCenterService.getTransactions({ page: 1, per_page: 20 }),
          bookingCenterService.getFinancialSummary(),
        ]);

        if (isMounted && finRes.status === 'fulfilled' && finRes.value.data) {
          setFinancialSummary(finRes.value.data);
        }

        if (isMounted && appRes.status === 'fulfilled' && appRes.value.data && Array.isArray(appRes.value.data)) {
          const liveBookings: BookingRecord[] = appRes.value.data.map((app) => {
            const isRegistered = Boolean(app.patient?.id || app.patient_id);
            const patientIdVal = app.patient?.id || app.patient_id || `P-${app.id.substring(0, 6)}`;
            const patientNameVal = app.patient?.name || app.patient_name || 'غير متوفر';
            const patientPhoneVal = app.patient?.phone || app.patient_phone || 'غير متوفر';
            const doctorIdVal = app.doctor?.id || app.doctor_id || '';
            const doctorNameVal = app.doctor?.name || app.doctor?.user?.name || 'غير متوفر';
            const specialtyVal = app.doctor?.specialty || 'طب عام';
            const facilityNameVal = app.clinic?.name || 'العيادة المركزية';
            const wilayaVal = app.clinic?.wilaya || 'الجزائر';

            return {
              id: app.id,
              refNumber: app.booking_reference,
              patientId: patientIdVal,
              patientName: patientNameVal,
              patientPhone: patientPhoneVal,
              patientType: (isRegistered ? 'registered' : 'guest') as 'registered' | 'guest',
              doctorId: doctorIdVal,
              doctorName: doctorNameVal,
              specialty: specialtyVal,
              facilityName: facilityNameVal,
              wilaya: wilayaVal,
              date: app.appointment_date,
              timeSlot: app.time_slot,
              status: (app.status === 'confirmed' ? 'approved' : app.status) as any,
              notes: app.notes,
              createdAt: app.appointment_date || new Date().toISOString().split('T')[0],
              createdBy: user?.name || 'موظف الحجز',
              secureToken: app.secure_token,
            };
          });
          setBookings(liveBookings);

          // Populate PatientsDirectoryTab strictly with patients who have bookings with this center
          const bookedPatientsMap = new Map<string, PatientRecord>();
          liveBookings.forEach((b) => {
            const key = b.patientPhone || b.patientId || b.id;
            if (key && !bookedPatientsMap.has(key)) {
              bookedPatientsMap.set(key, {
                id: b.patientId || b.id,
                uuid: b.patientType === 'registered' ? b.patientId : undefined,
                fullName: b.patientName,
                phone: b.patientPhone,
                type: b.patientType,
                wilaya: b.wilaya || 'الجزائر العاصمة',
                age: 35,
                lastVisitDate: b.date,
                totalBookings: liveBookings.filter((x) => x.patientPhone === b.patientPhone).length,
              });
            }
          });
          setPatients(Array.from(bookedPatientsMap.values()));
        } else if (isMounted) {
          setBookings([]);
          setPatients([]);
        }

        if (isMounted && quotaRes.status === 'fulfilled' && quotaRes.value.data) {
          const qData = quotaRes.value.data;
          const quotaBalance = qData.quota_balance ?? 0;
          const usedDeductions = (txRes.status === 'fulfilled' && txRes.value.data && Array.isArray(txRes.value.data))
            ? txRes.value.data.filter((t: any) => t.transaction_type === 'confirmation').length
            : 0;

          setPackageDetails({
            packageName: 'باقة الحجوزات المعتمدة',
            totalQuota: quotaBalance + usedDeductions,
            usedQuota: usedDeductions,
            remainingQuota: quotaBalance,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            dailyAverageRate: 5,
            estimatedDaysRemaining: quotaBalance > 0 ? Math.ceil(quotaBalance / 5) : 0,
            projectedDepletionDate: quotaBalance > 0 ? '2026-12-31' : 'منتهية',
          });
        }
      } catch (err) {
        console.warn('Failed to load booking center live data:', err);
        if (isMounted) {
          setBookings([]);
          setPatients([]);
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Selected Booking Details Modal
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const modalQrCardRef = React.useRef<HTMLDivElement>(null);
  const [isExportingModalPng, setIsExportingModalPng] = useState(false);
  const [ticketLanguage, setTicketLanguage] = useState<WhatsAppLanguage>('ar');
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const qrSvgRef = React.useRef<SVGSVGElement | null>(null);

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Navigation Items according to the Navigation Architecture in Design Bible
  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: LayoutDashboard },
    { id: 'new-booking', label: t('tabs.newBooking'), icon: PlusCircle, highlight: true },
    { id: 'bookings', label: t('tabs.bookings'), icon: FileText },
    { id: 'calendar', label: t('tabs.calendar'), icon: Calendar },
    { id: 'patients', label: t('tabs.patients'), icon: Users },
    {
      id: 'status-tracker',
      label: t('tabs.statusTracker'),
      icon: Activity,
      badge: pendingCount > 0 ? `${pendingCount} معلق` : undefined,
    },
    {
      id: 'packages',
      label: t('tabs.packages'),
      icon: Package,
      badge: `${packageDetails.remainingQuota} ${t('remaining')}`,
    },
    { id: 'billing', label: t('tabs.billing'), icon: Receipt },
    {
      id: 'notifications',
      label: t('tabs.notifications'),
      icon: Bell,
      badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
    },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart3 },
    { id: 'employees', label: t('tabs.employees'), icon: UserCheck },
    { id: 'settings', label: t('tabs.settings'), icon: Settings },
  ];

  // Action: Create New Booking
  const handleCreateBooking = (newRecord: BookingRecord) => {
    setBookings((prev) => [newRecord, ...prev]);

    setPackageDetails((prev) => ({
      ...prev,
      usedQuota: prev.usedQuota + 1,
      remainingQuota: Math.max(0, prev.remainingQuota - 1),
    }));

    const newAuditLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employeeId: 'emp-1',
      employeeName: 'محمد أحمد (استقبال)',
      action: 'إنشاء حجز جديد',
      targetRef: newRecord.refNumber,
      details: `تم حجز موعد للمريض ${newRecord.patientName} لدى الطبيب ${newRecord.doctorName} بتاريخ ${newRecord.date} الساعة ${newRecord.timeSlot}`,
      ipAddress: '192.168.1.45',
    };
    setAuditLogs((prev) => [newAuditLog, ...prev]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: `تم إنشاء الحجز ${newRecord.refNumber}`,
      message: `حجز جديد للمريض ${newRecord.patientName} بانتظار موافقة العيادة`,
      timestamp: 'الآن',
      read: false,
      category: 'today',
      source: 'system',
      bookingRef: newRecord.refNumber,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Action: Update Booking Status
  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    extra?: { notes?: string; rejectionReason?: string; rescheduledTime?: string }
  ) => {
    if (newStatus === 'cancelled') {
      const reasonText = extra?.notes || 'Cancelled by Booking Center staff';
      await appointmentService.cancelAppointment(bookingId, reasonText);

      // Refresh authoritative live quota balance from backend to reflect the ledger refund
      try {
        const balanceRes = await bookingCenterService.getQuotaBalance();
        if (balanceRes?.data) {
          setPackageDetails((prev) => ({
            ...prev,
            remainingQuota: balanceRes.data.quota_balance,
          }));
        }
      } catch (quotaErr) {
        console.warn('Failed to refresh quota balance after cancellation:', quotaErr);
      }
    }

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: newStatus,
            notes: extra?.notes || b.notes,
            rejectionReason: extra?.rejectionReason || b.rejectionReason,
            rescheduledTime: extra?.rescheduledTime || b.rescheduledTime,
          };
        }
        return b;
      })
    );

    if (newStatus === 'rejected') {
      setPackageDetails((prev) => ({
        ...prev,
        usedQuota: Math.max(0, prev.usedQuota - 1),
        remainingQuota: prev.remainingQuota + 1,
      }));
    }

    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (targetBooking) {
      const newAuditLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        employeeId: user?.id || 'emp-1',
        employeeName: user?.name || 'مركز الحجز',
        action: `تحديث حالة الحجز إلى ${newStatus}`,
        targetRef: targetBooking.refNumber,
        details: extra?.notes || extra?.rejectionReason || `تعديل حالة الحجز ${targetBooking.refNumber}`,
        ipAddress: '127.0.0.1',
      };
      setAuditLogs((prev) => [newAuditLog, ...prev]);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const center = user?.booking_center;

  // Verification & Activation Lifecycle Guards (Fail-Closed)
  if (user?.roles?.includes('booking_center')) {
    if (!center || center.verification_status === 'pending') {
      return <BookingCenterPendingVerificationView isDarkMode={isDarkMode} />;
    }

    if (center.verification_status === 'rejected') {
      return <BookingCenterRejectedView isDarkMode={isDarkMode} rejectionReason={center.rejection_reason} />;
    }

    if (center.verification_status === 'verified' && !center.is_active) {
      return <BookingCenterSuspendedView isDarkMode={isDarkMode} />;
    }
  }

  return (
    <DashboardLayout
      title={t('title')}
      userName={user?.name || t('userName')}
      userRole={user?.roles?.[0] ? `${user.roles[0]} | ${t('userRole')}` : t('userRole')}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      navItems={navItems}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onBackToMain={onBackToMainPlatform}
      sidebarTitle={t('sidebarTitle')}
      icon={<Building className="w-6 h-6" />}
    >
      
      {/* Top Clinical Dispatcher Strip */}
      <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                {user?.booking_center?.name || user?.name || 'مركز الحجز المعتمد'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                معتمد رسمياً
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>جدار خصوصية مطلق مشفر • {t('privacyNotice')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quota Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">الرصيد:</span>
            <span className={`font-mono font-black ${currentBalance > 10 ? 'text-emerald-600 dark:text-emerald-400' : currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {currentBalance}
            </span>
            <span className="text-[10.5px] text-slate-400">عملية</span>
          </div>

          <button
            onClick={() => handleTabChange('packages')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            شحن الباقة
          </button>

          <button
            onClick={handleOpenNewBooking}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>حجز جديد</span>
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <DashboardHomeTab
          bookings={bookings}
          packageDetails={packageDetails}
          financialSummary={financialSummary}
          notifications={notifications}
          onOpenNewBooking={handleOpenNewBooking}
          onNavigateTab={(tabId) => handleTabChange(tabId)}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onSearchPatient={() => handleTabChange('patients')}
          onPrintSchedule={() => alert('جارٍ طباعة جدول مواعيد اليوم...')}
        />
      )}

      {activeTab === 'new-booking' && (
        currentBalance > 0 ? (
          <NewBookingWizardTab
            patients={patients}
            packageDetails={packageDetails}
            onCreateBooking={handleCreateBooking}
            onCancel={() => {
              setPreselectedPatient(null);
              handleTabChange('dashboard');
            }}
            initialPatient={preselectedPatient}
          />
        ) : null
      )}

      {activeTab === 'bookings' && (
        <BookingsListTab
          bookings={bookings}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onUpdateStatus={handleUpdateStatus}
          onOpenNewBooking={handleOpenNewBooking}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarViewTab
          bookings={bookings}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onOpenNewBooking={handleOpenNewBooking}
        />
      )}

      {activeTab === 'patients' && (
        <PatientsDirectoryTab
          patients={patients}
          onOpenNewBooking={handleOpenNewBooking}
        />
      )}

      {activeTab === 'status-tracker' && (
        <BookingStatusTrackerTab
          bookings={bookings}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'packages' && (
        <PackagesQuotaTab
          packageDetails={packageDetails}
          onUpdatePackageDetails={(updated) => setPackageDetails(updated)}
          onAddAuditLog={(entry) => setAuditLogs((prev) => [entry, ...prev])}
          onAddNotification={(notif) => setNotifications((prev) => [notif, ...prev])}
        />
      )}

      {activeTab === 'billing' && (
        <BillingInvoicesTab invoices={invoices} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          notifications={notifications}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onSelectBookingByRef={(ref) => {
            const b = bookings.find((x) => x.refNumber === ref);
            if (b) setSelectedBooking(b);
          }}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsAnalyticsTab 
          bookings={bookings} 
          packageDetails={packageDetails} 
        />
      )}

      {activeTab === 'employees' && (
        <EmployeesAuditTab employees={employees} auditLogs={auditLogs} />
      )}

      {activeTab === 'settings' && <ProfileSettingsTab />}

      {/* BOOKING DETAILS MODAL - CLINICAL VOUCHER */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 text-right max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            
            {/* Voucher Top Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedBooking.refNumber}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">سند موعد معتمد</span>
                </div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                  {t('detailsModal.title')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operational Status Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{t('detailsModal.operationalStatus')}:</span>
              {selectedBooking.status === 'approved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مؤكد ومعتمد بالعيادة
                </span>
              )}
              {selectedBooking.status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  بانتظار موافقة الطبيب
                </span>
              )}
              {selectedBooking.status === 'rescheduled' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  معدل التوقيت ({selectedBooking.rescheduledTime})
                </span>
              )}
              {selectedBooking.status === 'rejected' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  مرفوض (رصيد مسترجع)
                </span>
              )}
              {selectedBooking.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  ملغى
                </span>
              )}
              {selectedBooking.status === 'completed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                  مكتمل الفحص
                </span>
              )}
            </div>

            {/* Patient & Clinic Split Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-slate-50/80 rounded-2xl space-y-1.5 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('detailsModal.patientData')}</span>
                <span className="font-extrabold text-slate-900 text-sm block">{selectedBooking.patientName}</span>
                <span className="text-slate-600 block dir-ltr text-right font-mono text-xs font-semibold">{selectedBooking.patientPhone}</span>
                <div className="pt-1">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                    {selectedBooking.patientType === 'registered' ? t('detailsModal.registeredPatient') : t('detailsModal.visitorPatient')}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl space-y-1.5 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('detailsModal.medicalFacility')}</span>
                <span className="font-extrabold text-slate-900 text-sm block">{selectedBooking.doctorName}</span>
                <span className="text-blue-600 font-bold block text-xs">{selectedBooking.specialty}</span>
                <span className="text-slate-500 block text-[11px] font-medium">{selectedBooking.facilityName} ({selectedBooking.wilaya})</span>
              </div>
            </div>

            {/* Appointment Schedule Box */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">{t('detailsModal.bookingDate')}:</span>
                <strong className="text-slate-900 font-black font-mono">{selectedBooking.date}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">{t('detailsModal.bookingTime')}:</span>
                <strong className="text-blue-700 font-black text-sm dir-ltr text-right font-mono">{selectedBooking.timeSlot}</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200/60 text-[11px]">
                <span className="text-slate-500">{t('detailsModal.createdBy')}:</span>
                <span className="text-slate-800 font-bold">{selectedBooking.createdBy}</span>
              </div>
            </div>

            {/* Visual QR Code Voucher Pass & Ticket Actions */}
            {(() => {
              const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://aafiya.site';
              const rawToken = selectedBooking.secureToken?.trim() || '';
              const isValidToken = /^[A-Za-z0-9]{64}$/.test(rawToken);
              const qrPassUrl = isValidToken ? `${origin}/ar/appointment/pass/${rawToken}` : '';
              const isTicketEligible = (selectedBooking.status === 'pending' || selectedBooking.status === 'approved') && isValidToken;

              const ticketData: AppointmentTicketData = {
                patientName: selectedBooking.patientName,
                patientPhone: selectedBooking.patientPhone,
                doctorName: selectedBooking.doctorName,
                specialty: selectedBooking.specialty,
                clinicName: selectedBooking.facilityName,
                date: selectedBooking.date,
                timeSlot: selectedBooking.timeSlot,
                refNumber: selectedBooking.refNumber,
                ticketUrl: qrPassUrl,
                status: selectedBooking.status === 'approved' ? 'confirmed' : 'pending',
              };

              return (
                <div className="space-y-3.5">
                  {isValidToken ? (
                    <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
                      <div 
                        ref={(node) => {
                          if (node) {
                            const svg = node.querySelector('svg');
                            if (svg) qrSvgRef.current = svg;
                          }
                        }}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center"
                      >
                        <QRCode
                          value={qrPassUrl}
                          size={96}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox="0 0 256 256"
                        />
                      </div>
                      <div className="space-y-1 text-center sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">رمز الحضور السريع (QR Check-In Pass)</span>
                        <p className="font-mono text-xs font-black text-blue-600 dir-ltr text-right">
                          {selectedBooking.refNumber}
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          نظام المسح المعتمد: متوافق كلياً مع كاميرا الماسح لمساعد الطبيب وقارئ الباركود لتسجيل الحضور وتأكيد الموعد فوراً.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">تنبيه أمني: الرمز السري الآمن للموعد (secure_token) غير متوفر أو غير مطابق للصيغة المعتمدة.</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          تم منع إنشاء رمز QR للموعد لعدم توفر الرمز الأمني المشفر المكون من 64 محرفاً. يرجى مراجعة إدارة النظام لتحديث سجل الموعد.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="p-3 rounded-2xl bg-slate-900 text-slate-300 text-[11px] flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="font-medium leading-relaxed">{t('detailsModal.securityWarning')}</span>
                  </div>

                  {/* Conditional Ticket Actions */}
                  {isTicketEligible ? (
                    <div className="space-y-3 pt-1">
                      {/* Language Selection */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">لغة رسالة WhatsApp المصاحبة:</span>
                          <span className="text-[10px] text-slate-400">تحدد لغة الرسالة الموجهة للمريض</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => setTicketLanguage('ar')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${ticketLanguage === 'ar' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            العربية (افتراضي)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTicketLanguage('fr')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${ticketLanguage === 'fr' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Français
                          </button>
                          <button
                            type="button"
                            onClick={() => setTicketLanguage('en')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${ticketLanguage === 'en' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            English
                          </button>
                        </div>
                      </div>

                      {/* Download PNG Button */}
                      <button
                        type="button"
                        disabled={isExportingModalPng}
                        onClick={async () => {
                          try {
                            setIsExportingModalPng(true);
                            await downloadAppointmentCardPng(ticketData, qrSvgRef.current);
                          } catch (err) {
                            console.error('Failed to download PNG ticket:', err);
                          } finally {
                            setIsExportingModalPng(false);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isExportingModalPng ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري إنشاء وتنزيل بطاقة PNG...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>تنزيل بطاقة الموعد PNG</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp & Print Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={isOpeningWhatsApp}
                          onClick={() => {
                            setIsOpeningWhatsApp(true);
                            openWhatsAppAppointmentShare(ticketData, ticketLanguage);
                            setTimeout(() => setIsOpeningWhatsApp(false), 2000);
                          }}
                          className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{isOpeningWhatsApp ? 'جاري الفتح...' : 'فتح WhatsApp للمشاركة اليدوية'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer active:scale-95"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                          <span>{t('detailsModal.printTicket')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        {!isValidToken 
                          ? 'تنبيه: لا يمكن تنزيل بطاقة الموعد أو مشاركتها عبر WhatsApp لعدم توفر رمز أمني صالح للموعد.'
                          : 'تنبيه: تنزيل بطاقة الموعد والمشاركة عبر WhatsApp مقتصران فقط على المواعيد المعلّقة والمؤكدة.'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Zero Balance Guard Modal */}
      <Modal
        isOpen={showZeroBalanceModal}
        onClose={() => setShowZeroBalanceModal(false)}
        size="md"
        title={t('zeroBalanceGuard.title')}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowZeroBalanceModal(false)}
            >
              {t('zeroBalanceGuard.closeAction')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setShowZeroBalanceModal(false);
                handleTabChange('packages');
              }}
              icon={<Package className="w-4 h-4" />}
            >
              {t('zeroBalanceGuard.rechargeAction')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {t('zeroBalanceGuard.availableBalancePrefix')}{' '}
              <strong className="font-mono font-bold text-slate-900 text-base underline decoration-amber-400 underline-offset-4">
                {currentBalanceFormatted}
              </strong>
              .
            </p>

            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {t('zeroBalanceGuard.message')}
            </p>
          </div>
        </div>
      </Modal>

    </DashboardLayout>
  );
};
