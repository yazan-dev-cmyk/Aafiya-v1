'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { LabAssistantDashboard } from '@/components/laboratory/LabAssistantDashboard';
import { AuthGuard } from '@/auth';

export default function LabAssistantDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'lab_assistant']}>
      <LabAssistantDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenLabManagerDashboard={() => {
          router.push('/laboratory/dashboard');
        }}
      />
    </AuthGuard>
  );
}
