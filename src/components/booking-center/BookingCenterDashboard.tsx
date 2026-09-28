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
  AlertCircle
} from 'lucide-react';

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

  // Navigation Items according to the Navigation Architecture in Design Bible
  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: LayoutDashboard },
    { id: 'new-booking', label: t('tabs.newBooking'), icon: PlusCircle, highlight: true },
    { id: 'bookings', label: t('tabs.bookings'), icon: FileText },
    { id: 'calendar', label: t('tabs.calendar'), icon: Calendar },
    { id: 'patients', label: t('tabs.patients'), icon: Users },
    { id: 'status-tracker', label: t('tabs.statusTracker'), icon: Activity },
    { id: 'packages', label: t('tabs.packages'), icon: Package, badge: `${packageDetails.remainingQuota} ${t('remaining')}` },
    { id: 'billing', label: t('tabs.billing'), icon: Receipt },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell, badge: `${notifications.filter(n => !n.read).length}` },
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
  const handleUpdateStatus = (
    bookingId: string,
    newStatus: BookingStatus,
    extra?: { notes?: string; rejectionReason?: string; rescheduledTime?: string }
  ) => {
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
        employeeId: 'emp-1',
        employeeName: 'محمد أحمد (استقبال)',
        action: `تحديث حالة الحجز إلى ${newStatus}`,
        targetRef: targetBooking.refNumber,
        details: extra?.notes || extra?.rejectionReason || `تعديل حالة الحجز ${targetBooking.refNumber}`,
        ipAddress: '192.168.1.45',
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
      
      {/* Privacy Notice Banner */}
      <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <Lock className="w-5 h-5 text-primary" />
        <p className="text-xs font-bold text-slate-600">
          {t('privacyNotice')}
        </p>
        <Badge variant="success" className="ms-auto">{t('privacyStatus')}</Badge>
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
            onCancel={() => handleTabChange('dashboard')}
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

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-8 space-y-6 text-right max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-mono font-bold text-primary block mb-1">{selectedBooking.refNumber}</span>
                <h3 className="font-black text-slate-900 text-xl">{t('detailsModal.title')}</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{t('detailsModal.operationalStatus')}:</span>
              <Badge variant={selectedBooking.status === 'approved' ? 'success' : 'warning'}>
                {selectedBooking.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('detailsModal.patientData')}</span>
                <span className="font-bold text-slate-900 text-sm block">{selectedBooking.patientName}</span>
                <span className="text-slate-600 block dir-ltr text-start text-xs">{selectedBooking.patientPhone}</span>
                <Badge variant="neutral" className="text-[10px]">
                  {selectedBooking.patientType === 'registered' ? t('detailsModal.registeredPatient') : t('detailsModal.visitorPatient')}
                </Badge>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('detailsModal.medicalFacility')}</span>
                <span className="font-bold text-slate-900 text-sm block">{selectedBooking.doctorName}</span>
                <span className="text-primary font-bold block text-xs">{selectedBooking.specialty}</span>
                <span className="text-slate-500 block text-[11px]">{selectedBooking.facilityName} ({selectedBooking.wilaya})</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">{t('detailsModal.bookingDate')}:</span>
                <strong className="text-slate-900 font-black">{selectedBooking.date}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">{t('detailsModal.bookingTime')}:</span>
                <strong className="text-primary font-black text-sm dir-ltr text-start">{selectedBooking.timeSlot}</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                <span className="text-slate-500">{t('detailsModal.createdBy')}:</span>
                <span className="text-slate-700 font-bold">{selectedBooking.createdBy}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 text-slate-400 text-[11px] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-emerald-500" />
              </div>
              <span>{t('detailsModal.securityWarning')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => alert(`إعادة إرسال تذكرة الموعد ${selectedBooking.refNumber} عبر SMS/WhatsApp...`)}
                className="py-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-emerald-200"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('detailsModal.sendTicket')}</span>
              </button>

              <button
                onClick={() => alert(`جارٍ طباعة التذكرة الرسمية...`)}
                className="py-3.5 rounded-2xl bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all border border-primary/20"
              >
                <Printer className="w-4 h-4" />
                <span>{t('detailsModal.printTicket')}</span>
              </button>
            </div>

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
