'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { RadiologyDashboard } from '@/components/radiology/RadiologyDashboard';
import { AuthGuard } from '@/auth';

export default function RadiologyDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'radiology']}>
      <RadiologyDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenRadAssistantDashboard={() => {
          router.push('/radiology/assistants-dashboard');
        }}
      />
    </AuthGuard>
  );
}
