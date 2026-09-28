'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { RadiologyAssistantDashboard } from '@/components/radiology/RadiologyAssistantDashboard';
import { AuthGuard } from '@/auth';

export default function RadiologyAssistantDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'rad_assistant']}>
      <RadiologyAssistantDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenRadManagerDashboard={() => {
          router.push('/radiology/dashboard');
        }}
      />
    </AuthGuard>
  );
}
