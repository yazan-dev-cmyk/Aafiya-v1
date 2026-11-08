'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { ViewMode, RoleType } from './types';
import { Header } from './components/Header';
import { PublicAdsTicker } from './components/ticker/PublicAdsTicker';
import { Hero } from './components/Hero';
import { DoctorSearchSection } from './components/DoctorSearchSection';
import { FeaturesSection } from './components/FeaturesSection';
import { StakeholderBenefits } from './components/StakeholderBenefits';
import { WorkflowStepper } from './components/WorkflowStepper';
import { TrustPrivacySection } from './components/TrustPrivacySection';
import { PackageCalculator } from './components/PackageCalculator';
import { FaqSection } from './components/FaqSection';
import { AppDownloadSection } from './components/AppDownloadSection';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { DoctorAssistantDashboard } from './components/assistant/DoctorAssistantDashboard';
import { BookingCenterDashboard } from './components/booking-center/BookingCenterDashboard';
import { LaboratoryDashboard } from './components/laboratory/LaboratoryDashboard';
import { LabAssistantDashboard } from './components/laboratory/LabAssistantDashboard';
import { RadiologyDashboard } from './components/radiology/RadiologyDashboard';
import { RadiologyAssistantDashboard } from './components/radiology/RadiologyAssistantDashboard';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { PlatformAdminDashboard } from './components/admin/PlatformAdminDashboard';
import { PlatformAssistantDashboard } from './components/admin/PlatformAssistantDashboard';
import { AuthModals } from './components/AuthModals';
import { SearchModal } from './components/SearchModal';

export default function App() {
  const locale = useLocale();
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  
  // Modals
  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<RoleType | undefined>('patient_registered');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [searchOpen, setSearchOpen] = useState(false);

  const handleOpenAuth = (role?: RoleType, isRegister: boolean = false) => {
    setAuthRole(role || 'patient_registered');
    setIsRegisterMode(isRegister);
    setAuthOpen(true);
  };

  const scrollToCalculator = () => {
    setViewMode('landing');
    setTimeout(() => {
      const el = document.getElementById('packages');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-500 selection:text-white" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {viewMode === 'doctor_dashboard' ? (
        /* Doctor Interactive Enterprise Dashboard */
        <DoctorDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
        />
      ) : viewMode === 'assistant_dashboard' ? (
        /* Doctor Assistant Interactive Enterprise Dashboard */
        <DoctorAssistantDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
        />
      ) : viewMode === 'booking_center_dashboard' ? (
        /* Booking Center Interactive Enterprise Dashboard */
        <BookingCenterDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
        />
      ) : viewMode === 'laboratory_dashboard' ? (
        /* Laboratory Manager Interactive Console */
        <LaboratoryDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenLabAssistantDashboard={() => setViewMode('lab_assistant_dashboard')}
        />
      ) : viewMode === 'lab_assistant_dashboard' ? (
        /* Laboratory Assistant Interactive Operational Console */
        <LabAssistantDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenLabManagerDashboard={() => setViewMode('laboratory_dashboard')}
        />
      ) : viewMode === 'radiology_dashboard' ? (
        /* Radiology Center Interactive Console */
        <RadiologyDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenRadAssistantDashboard={() => setViewMode('rad_assistant_dashboard')}
        />
      ) : viewMode === 'patient_dashboard' ? (
        /* Patient Interactive Digital Portal (11-Page Architecture) */
        <PatientDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenDoctorDashboard={() => setViewMode('doctor_dashboard')}
          onOpenLabDashboard={() => setViewMode('laboratory_dashboard')}
          onOpenRadDashboard={() => setViewMode('radiology_dashboard')}
        />
      ) : viewMode === 'platform_admin_dashboard' ? (
        /* Platform Administration Control Center (16 Sections) */
        <PlatformAdminDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenAssistantDashboard={() => setViewMode('platform_assistant_dashboard')}
        />
      ) : viewMode === 'platform_assistant_dashboard' ? (
        /* Platform Admin Assistant Dashboard (Operational Module with Strict RBAC) */
        <PlatformAssistantDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenAdminDashboard={() => setViewMode('platform_admin_dashboard')}
        />
      ) : viewMode === 'rad_assistant_dashboard' ? (
        /* Radiology Assistant Interactive Console */
        <RadiologyAssistantDashboard
          onBackToMainPlatform={() => setViewMode('landing')}
          onOpenRadManagerDashboard={() => setViewMode('radiology_dashboard')}
        />
      ) : (
        /* Interactive Landing Page Preview */
        <main>
          {/* Section 1: Navigation Header */}
          <Header
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenAuth={handleOpenAuth}
          />

          {/* Public Advertising Ticker */}
          <PublicAdsTicker />

          {/* Section 2: Hero Section */}
          <Hero
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 3: Healthcare Services */}
          <FeaturesSection
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 4: Interactive 5-Step Workflow (كيف تعمل عافية؟) */}
          <WorkflowStepper />

          {/* Section 5: Unified Healthcare Directory (ابحث في شبكة عافية) */}
          <DoctorSearchSection
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 6: Mobile Applications (عافية معك أينما كنت) */}
          <AppDownloadSection />

          {/* Section 7: Stakeholder Benefits (عافية لكل طرف) */}
          <StakeholderBenefits
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 8: Trust & Privacy (الثقة والخصوصية) */}
          <TrustPrivacySection
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 9: Operational Packages (باقات مراكز الحجز والعمليات) */}
          <PackageCalculator
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 10: FAQs (الأسئلة الشائعة) */}
          <FaqSection />

          {/* Section 11: Final Call to Action (كن جزءاً من شبكة عافية الصحية) */}
          <CtaSection
            onOpenAuth={handleOpenAuth}
          />

          {/* Section 12: Footer */}
          <Footer
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </main>
      )}

      {/* Auth Modals */}
      <AuthModals
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialRole={authRole}
        isRegisterMode={isRegisterMode}
      />

      {/* Global Quick Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

    </div>
  );
}
