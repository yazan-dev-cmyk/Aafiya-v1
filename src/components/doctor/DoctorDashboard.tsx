'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

// Sub-Tabs
import { DoctorOverviewTab } from './tabs/DoctorOverviewTab';
import { WaitingRoomTab } from './tabs/WaitingRoomTab';
import { CurrentConsultationTab } from './tabs/CurrentConsultationTab';
import { EPrescriptionsTab } from './tabs/EPrescriptionsTab';
import { LabOrdersTab } from './tabs/LabOrdersTab';
import { RadiologyOrdersTab } from './tabs/RadiologyOrdersTab';
import { LabResultsComparisonTab } from './tabs/LabResultsComparisonTab';
import { RadiologyDicomTab } from './tabs/RadiologyDicomTab';
import { EhrSummaryTab } from './tabs/EhrSummaryTab';
import { ClinicalAnalyticsTab } from './tabs/ClinicalAnalyticsTab';
import { CategorizedNotificationsTab } from './tabs/CategorizedNotificationsTab';
import { DoctorSettingsTab } from './tabs/DoctorSettingsTab';
import { DoctorWorkingHoursEditor } from './tabs/DoctorWorkingHoursEditor';
import { DoctorStaffTab } from './tabs/DoctorStaffTab';
import { ClinicDirectorStatsTab } from './tabs/ClinicDirectorStatsTab';
import { DoctorActivityLogTab } from './tabs/DoctorActivityLogTab';
import { PatientsTab } from './tabs/PatientsTab';
import { VisitsHistoryTab } from './tabs/VisitsHistoryTab';
import { DoctorPendingVerificationView } from './DoctorPendingVerificationView';

import { WaitingPatient } from '../../data/doctorDashboardData';
import { DashboardLayout } from '../ui/DashboardLayout';
import { NavItem } from '../ui/Sidebar';
import { ClinicSwitcher } from './ClinicSwitcher';
import { DoctorClinicSelectorView } from './DoctorClinicSelectorView';
import { DoctorNoClinicView } from './DoctorNoClinicView';
import { DoctorInvitationsModal } from './invitations/DoctorInvitationsModal';
import { clinicService } from '@/services/clinicService';
import { workingHoursService } from '@/services/workingHoursService';
import { DoctorOnboardingModal } from './onboarding/DoctorOnboardingModal';
import { DoctorSetupReminderBanner } from './onboarding/DoctorSetupReminderBanner';

// Icons
import {
  Stethoscope,
  Users,
  Clock,
  FileText,
  FlaskConical,
  Scan,
  FileSpreadsheet,
  Eye,
  User,
  BarChart3,
  Bell,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  Calendar,
  UserCheck,
  Settings,
  UserPlus,
  TrendingUp
} from 'lucide-react';

interface DoctorDashboardProps {
  onBackToMainPlatform: () => void;
}

import { useAuth } from '@/auth';
import { appointmentService } from '@/services/appointmentService';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  onBackToMainPlatform
}) => {
  const t = useTranslations('doctor');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [queue, setQueue] = useState<WaitingPatient[]>([]);
  const [activeConsultationPatient, setActiveConsultationPatient] = useState<WaitingPatient | null>(null);
  const [selectedOperationalDate, setSelectedOperationalDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Multi-Clinic & Invitations Modal States
  const [showClinicSelector, setShowClinicSelector] = useState<boolean>(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState<boolean>(false);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState<number>(0);

  // Dynamic Doctor Context & Authorization Resolution (P2 & 4D RBAC Principles)
  const isDoctorDirector = user?.clinic?.position === 'director' || user?.clinic?.is_director === true;
  const hasSettingsPermission = isDoctorDirector || Boolean(user?.permissions?.includes('clinic.manage_settings'));
  const hasStaffPermission = isDoctorDirector || Boolean(user?.permissions?.includes('clinic.create_staff'));
  const hasClinicStatsPermission = isDoctorDirector;

  // Multi-clinic active affiliations evaluation
  const affiliatedClinics = user?.clinics || (user?.clinic ? [user.clinic] : []);
  const activeClinics = affiliatedClinics.filter((c) => c.is_active !== false);

  // Clinic Operating Hours & Schedule Onboarding Gates
  const [isClinicConfigured, setIsClinicConfigured] = useState<boolean | null>(null);
  const [isScheduleActivated, setIsScheduleActivated] = useState<boolean | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState<boolean>(false);
  const [onboardingLoadError, setOnboardingLoadError] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [onboardingModalStep, setOnboardingModalStep] = useState<1 | 2>(1);

  const effectiveClinicId = user?.clinic?.id;
  const effectiveDoctorId = user?.doctor?.id;

  const checkOnboardingStatus = React.useCallback(async (clinicId: string, doctorId: string) => {
    setIsOnboardingLoading(true);
    setOnboardingLoadError(null);
    try {
      const [clinicRes, docRes] = await Promise.all([
        workingHoursService.getClinicOperatingHours(clinicId),
        workingHoursService.getDoctorWorkingHours(doctorId, clinicId),
      ]);

      const clinicConfigured = Boolean(clinicRes.data?.is_configured);
      const scheduleActivated = Boolean(docRes.data?.is_activated);

      setIsClinicConfigured(clinicConfigured);
      setIsScheduleActivated(scheduleActivated);

      if (!clinicConfigured || !scheduleActivated) {
        const storageKey = `aafiya_onboarding_deferred_${clinicId}_${doctorId}`;
        const isDeferred = typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === 'true';
        if (!isDeferred) {
          const isDirector = user?.clinic?.position === 'director' || user?.clinic?.is_director === true;
          setOnboardingModalStep(!clinicConfigured && isDirector ? 1 : 2);
          setShowOnboardingModal(true);
        }
      } else {
        setShowOnboardingModal(false);
      }
    } catch (err: any) {
      console.error('Failed to load clinic operating hours onboarding state:', err);
      setOnboardingLoadError(err?.message || 'Failed to verify clinic configuration');
      // Explicitly do NOT assume complete on failure!
      setIsClinicConfigured(false);
      setIsScheduleActivated(false);
    } finally {
      setIsOnboardingLoading(false);
    }
  }, [user?.clinic?.position, user?.clinic?.is_director]);

  const handleDeferOnboarding = () => {
    if (effectiveClinicId && effectiveDoctorId && typeof window !== 'undefined') {
      const storageKey = `aafiya_onboarding_deferred_${effectiveClinicId}_${effectiveDoctorId}`;
      sessionStorage.setItem(storageKey, 'true');
    }
    setShowOnboardingModal(false);
  };

  React.useEffect(() => {
    if (effectiveClinicId && effectiveDoctorId && user?.doctor?.is_verified !== false) {
      checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
    } else {
      setIsClinicConfigured(null);
      setIsScheduleActivated(null);
      setShowOnboardingModal(false);
    }
  }, [effectiveClinicId, effectiveDoctorId, user?.doctor?.is_verified, checkOnboardingStatus]);

  const fetchPendingInvitationsCount = async () => {
    try {
      const res = await clinicService.getMyInvitations();
      if (res.data) {
        const count = res.data.filter((inv) => inv.status === 'pending').length;
        setPendingInvitationsCount(count);
      }
    } catch {
      // Retain previous count on error
    }
  };

  React.useEffect(() => {
    if (user?.roles?.includes('doctor')) {
      fetchPendingInvitationsCount();
    }
  }, [user?.id]);

  // Invalidate and reset workspace-scoped state on clinic switch
  React.useEffect(() => {
    setQueue([]);
    setActiveConsultationPatient(null);

    // Permission guard check: if current tab is Director-only and doctor is now Employed in this clinic, navigate to dashboard
    const isNowDirector = user?.clinic?.position === 'director' || user?.clinic?.is_director === true;
    if ((activeTab === 'staff' || activeTab === 'settings' || activeTab === 'clinic-stats') && !isNowDirector) {
      handleTabChange('dashboard');
    }
  }, [user?.clinic?.id]);

  // Sync state when URL searchParams change (Browser Back / Forward / Direct Link / Locale switch)
  React.useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'dashboard';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
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

  React.useEffect(() => {
    if (user?.roles?.includes('doctor') && user?.doctor?.is_verified === false) {
      return;
    }
    const fetchLiveQueue = async () => {
      try {
        const res = await appointmentService.getAppointments({
          appointment_date: selectedOperationalDate,
          status: 'pending'
        });
        if (res.data && res.data.length > 0) {
          const liveQueue: WaitingPatient[] = res.data.map((app, idx) => ({
            id: app.id,
            queueNumber: idx + 1,
            patientName: app.patient?.name || app.patient_name || 'مريض غير مسجل',
            patientType: (app.patient?.id || app.patient_id ? 'registered' : 'guest') as 'registered' | 'guest',
            arrivalTime: app.time_slot,
            waitingMinutes: idx * 10,
            status: 'waiting' as const,
            reasonForVisit: app.notes || 'استشارة طبية عامة',
            phone: app.patient?.phone || app.patient_phone || '',
            age: 35,
            gender: 'male' as const,
          }));
          setQueue(liveQueue);
        } else {
          setQueue([]);
        }
      } catch {
        // Retain initial queue on network/offline fallback
      }
    };
    fetchLiveQueue();
  }, [user, selectedOperationalDate]);

  // Dynamic Navigation Items based on verified permissions & clinic position
  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('tabs.dashboard'), icon: LayoutDashboard },
    { id: 'patients', label: t('tabs.patients'), icon: UserCheck, badge: t('badges.new') },
    { id: 'visits', label: t('tabs.visits'), icon: Calendar },
    { id: 'waiting-room', label: t('tabs.waitingRoom'), icon: Users, badge: `${queue.length}` },
    { id: 'consultation', label: t('tabs.consultation'), icon: Stethoscope, highlight: true },
    { id: 'prescriptions', label: t('tabs.prescriptions'), icon: FileText },
    { id: 'lab-orders', label: t('tabs.labOrders'), icon: FlaskConical },
    { id: 'radiology-orders', label: t('tabs.radiologyOrders'), icon: Scan },
    { id: 'lab-results', label: t('tabs.labResults'), icon: FileSpreadsheet },
    { id: 'radiology-results', label: t('tabs.radiologyResults'), icon: Eye },
    { id: 'ehr', label: t('tabs.ehr'), icon: User },
    { id: 'analytics', label: t('tabs.analytics'), icon: BarChart3 },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell, badge: t('badges.urgent') },
    ...(hasStaffPermission ? [{ id: 'staff', label: t('tabs.staff'), icon: UserPlus }] : []),
    ...(hasSettingsPermission
      ? [{ id: 'settings', label: t('tabs.settings'), icon: Settings, badge: t('badges.schedule') }]
      : (user?.doctor?.id ? [{ id: 'working-hours', label: t('tabs.workingHours'), icon: Clock, badge: t('badges.schedule') }] : [])),
    ...(hasClinicStatsPermission ? [{ id: 'clinic-stats', label: t('tabs.clinicStats'), icon: TrendingUp }] : []),
    { id: 'activity-log', label: t('tabs.activityLog'), icon: ShieldCheck }
  ];

  const handleConfirmAppointment = async (id: string) => {
    try {
      await appointmentService.confirmAppointment(id);
      alert(isRtl ? 'تم تأكيد الموعد الطبي بنجاح.' : 'Appointment confirmed successfully.');
      const res = await appointmentService.getAppointments();
      if (res.data) {
        const liveQueue: WaitingPatient[] = res.data.map((app, idx) => ({
          id: app.id,
          queueNumber: idx + 1,
          patientName: app.patient?.name || app.patient_name || 'مريض غير مسجل',
          patientType: (app.patient?.id || app.patient_id ? 'registered' : 'guest') as 'registered' | 'guest',
          arrivalTime: app.time_slot,
          waitingMinutes: idx * 10,
          status: (app.status === 'confirmed' ? 'waiting' : (app.status === 'pending' ? 'pending' : app.status)) as any,
          reasonForVisit: app.notes || 'استشارة طبية عامة',
          phone: app.patient?.phone || app.patient_phone || '',
          age: 35,
          gender: 'male' as const,
        }));
        setQueue(liveQueue);
      }
    } catch (err: any) {
      alert(err?.message || (isRtl ? 'فشل تأكيد الموعد' : 'Failed to confirm appointment'));
    }
  };

  const handleStartConsultation = (patient: WaitingPatient) => {
    setActiveConsultationPatient(patient);
    handleTabChange('consultation');
  };

  // If doctor director account is pending verification, render the welcome & pending view exclusively
  if (user?.roles?.includes('doctor') && user?.doctor?.is_verified === false) {
    return <DoctorPendingVerificationView isDarkMode={isDarkMode} />;
  }

  // Case 4: Doctor has 0 active clinics (fail-closed view)
  if (user?.roles?.includes('doctor') && activeClinics.length === 0) {
    return (
      <DoctorNoClinicView
        onBackToMain={onBackToMainPlatform}
        isDarkMode={isDarkMode}
      />
    );
  }

  // Clinic Selector overlay / view
  if (showClinicSelector) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} p-4 sm:p-6`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setShowClinicSelector(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isRtl ? 'العودة لمساحة العمل' : 'Back to Workspace'}
          </button>
        </div>
        <DoctorClinicSelectorView
          onSelectClinic={() => {
            setShowClinicSelector(false);
          }}
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  return (
    <DashboardLayout
      title={t('title')}
      userName={user?.name || t('userName')}
      userRole={user?.roles?.[0] ? `${user.roles[0]} | ${user.doctor?.specialty || 'Medical Staff'}` : t('userRole')}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      navItems={navItems}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onBackToMain={onBackToMainPlatform}
      sidebarTitle={t('sidebarTitle')}
      icon={<Stethoscope className="w-6 h-6" />}
      headerActions={
        <ClinicSwitcher
          onOpenSelector={() => setShowClinicSelector(true)}
          onOpenInvitations={() => setShowInvitationsModal(true)}
          pendingInvitationsCount={pendingInvitationsCount}
          isDarkMode={isDarkMode}
        />
      }
    >
      {/* Clinic Operating Hours & Schedule Setup Reminder Banner */}
      {effectiveClinicId && effectiveDoctorId && isClinicConfigured !== null && isScheduleActivated !== null && (
        <div className="mb-6">
          <DoctorSetupReminderBanner
            isDirector={isDoctorDirector}
            isClinicConfigured={isClinicConfigured}
            isScheduleActivated={isScheduleActivated}
            onOpenSetup={(targetStep) => {
              if (targetStep) setOnboardingModalStep(targetStep);
              setShowOnboardingModal(true);
            }}
            onRefresh={() => {
              if (effectiveClinicId && effectiveDoctorId) {
                checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
              }
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DoctorOverviewTab
          onNavigateTab={handleTabChange}
          isDarkMode={isDarkMode}
          queueLength={queue.length}
          selectedOperationalDate={selectedOperationalDate}
          onOperationalDateChange={setSelectedOperationalDate}
        />
      )}
      {activeTab === 'patients' && <PatientsTab isDarkMode={isDarkMode} />}
      {activeTab === 'visits' && <VisitsHistoryTab isDarkMode={isDarkMode} />}
      {activeTab === 'waiting-room' && (
        <WaitingRoomTab
          queue={queue}
          onCallPatient={(id) => {
            setQueue((prev) =>
              prev.map((q) => (q.id === id ? { ...q, status: 'called' } : q))
            );
          }}
          onStartConsultation={handleStartConsultation}
          onConfirmAppointment={handleConfirmAppointment}
          isDarkMode={isDarkMode}
        />
      )}
      {activeTab === 'consultation' && (
        <CurrentConsultationTab
          patient={activeConsultationPatient}
          onOpenPrescription={() => setActiveTab('prescriptions')}
          onOpenLabOrders={() => setActiveTab('lab-orders')}
          onOpenRadiologyOrders={() => setActiveTab('radiology-orders')}
          onCompleteConsultation={() => {
            alert(t('consultation.finishAlert'));
            setActiveTab('waiting-room');
          }}
          isDarkMode={isDarkMode}
        />
      )}
      {activeTab === 'prescriptions' && (
        <EPrescriptionsTab
          patientName={activeConsultationPatient?.patientName}
          patientType={activeConsultationPatient?.patientType}
          isDarkMode={isDarkMode}
        />
      )}
      {activeTab === 'lab-orders' && (
        <LabOrdersTab 
          patientName={activeConsultationPatient?.patientName} 
          patientType={activeConsultationPatient?.patientType}
          isDarkMode={isDarkMode} 
        />
      )}
      {activeTab === 'radiology-orders' && (
        <RadiologyOrdersTab 
          patientName={activeConsultationPatient?.patientName} 
          patientType={activeConsultationPatient?.patientType}
          isDarkMode={isDarkMode} 
        />
      )}
      {activeTab === 'lab-results' && <LabResultsComparisonTab isDarkMode={isDarkMode} />}
      {activeTab === 'radiology-results' && <RadiologyDicomTab isDarkMode={isDarkMode} />}
      {activeTab === 'ehr' && <EhrSummaryTab isDarkMode={isDarkMode} />}
      {activeTab === 'analytics' && <ClinicalAnalyticsTab isDarkMode={isDarkMode} />}
      {activeTab === 'notifications' && <CategorizedNotificationsTab isDarkMode={isDarkMode} clinicId={effectiveClinicId} />}
      
      {/* Staff Management Tab with Direct URL Guard */}
      {activeTab === 'staff' && (
        hasStaffPermission ? (
          <DoctorStaffTab isDarkMode={isDarkMode} />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'} rounded-2xl p-8 border text-center space-y-4 max-w-lg mx-auto my-12`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{t('unauthorized.title')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('unauthorized.staffMessage')}
              </p>
            </div>
            <button
              onClick={() => handleTabChange('dashboard')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('unauthorized.backToDashboard')}
            </button>
          </div>
        )
      )}

      {/* Personal Working Hours Tab (Accessible to any affiliated doctor for their own schedule) */}
      {activeTab === 'working-hours' && (
        hasSettingsPermission ? (
          <DoctorSettingsTab
            isDarkMode={isDarkMode}
            defaultSubTab="working-hours"
            onClinicHoursUpdated={() => {
              if (effectiveClinicId && effectiveDoctorId) {
                checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
              }
            }}
          />
        ) : user?.doctor?.id && user?.clinic?.id ? (
          <div className="space-y-6">
            <DoctorWorkingHoursEditor
              doctorId={user.doctor.id}
              clinicId={user.clinic.id}
              canManage={true}
              isDarkMode={isDarkMode}
              onActivated={() => {
                if (effectiveClinicId && effectiveDoctorId) {
                  checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
                }
              }}
            />
          </div>
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'} rounded-2xl p-8 border text-center space-y-4 max-w-lg mx-auto my-12`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{t('unauthorized.title')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('unauthorized.settingsMessage')}
              </p>
            </div>
            <button
              onClick={() => handleTabChange('dashboard')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('unauthorized.backToDashboard')}
            </button>
          </div>
        )
      )}

      {/* Settings Tab with Direct URL Guard (Clinic Director or clinic.manage_settings only) */}
      {activeTab === 'settings' && (
        hasSettingsPermission ? (
          <DoctorSettingsTab
            isDarkMode={isDarkMode}
            onClinicHoursUpdated={() => {
              if (effectiveClinicId && effectiveDoctorId) {
                checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
              }
            }}
          />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'} rounded-2xl p-8 border text-center space-y-4 max-w-lg mx-auto my-12`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{t('unauthorized.title')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('unauthorized.settingsMessage')}
              </p>
            </div>
            <button
              onClick={() => handleTabChange('dashboard')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('unauthorized.backToDashboard')}
            </button>
          </div>
        )
      )}

      {/* Clinic Director Doctor Statistics Tab with Direct URL Guard */}
      {activeTab === 'clinic-stats' && (
        hasClinicStatsPermission ? (
          <ClinicDirectorStatsTab isDarkMode={isDarkMode} />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'} rounded-2xl p-8 border text-center space-y-4 max-w-lg mx-auto my-12`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{t('unauthorized.title')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('unauthorized.clinicStatsMessage')}
              </p>
            </div>
            <button
              onClick={() => handleTabChange('dashboard')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('unauthorized.backToDashboard')}
            </button>
          </div>
        )
      )}

      {activeTab === 'activity-log' && <DoctorActivityLogTab isDarkMode={isDarkMode} />}

      {/* Invitations Inbox Modal */}
      <DoctorInvitationsModal
        isOpen={showInvitationsModal}
        onClose={() => {
          setShowInvitationsModal(false);
          fetchPendingInvitationsCount();
        }}
        onInvitationAccepted={async () => {
          await fetchPendingInvitationsCount();
        }}
        isDarkMode={isDarkMode}
      />

      {/* Role-Aware Working Hours Onboarding Modal */}
      {effectiveClinicId && effectiveDoctorId && (
        <DoctorOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          onLater={handleDeferOnboarding}
          isDirector={Boolean(user?.clinic?.position === 'director' || user?.clinic?.is_director === true)}
          clinicId={effectiveClinicId}
          doctorId={effectiveDoctorId}
          clinicName={user?.clinic?.name}
          isClinicConfigured={isClinicConfigured}
          isScheduleActivated={isScheduleActivated}
          initialStep={onboardingModalStep}
          onClinicConfigured={() => {
            checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
          }}
          onScheduleActivated={() => {
            checkOnboardingStatus(effectiveClinicId, effectiveDoctorId);
            setShowOnboardingModal(false);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </DashboardLayout>
  );
};
