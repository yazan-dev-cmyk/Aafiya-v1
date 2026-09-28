'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { RadiologyAssistantsManagementDashboard } from '@/components/radiology/RadiologyAssistantsManagementDashboard';
import { AuthGuard } from '@/auth';

export default function RadiologyAssistantsManagementDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'radiology']}>
      <RadiologyAssistantsManagementDashboard
        onBackToRadDashboard={() => {
          router.push('/radiology/dashboard');
        }}
      />
    </AuthGuard>
  );
}
