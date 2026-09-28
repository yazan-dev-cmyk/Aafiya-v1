'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { LaboratoryDashboard } from '@/components/laboratory/LaboratoryDashboard';
import { AuthGuard } from '@/auth';

export default function LaboratoryDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'lab']}>
      <LaboratoryDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenLabAssistantDashboard={() => {
          router.push('/laboratory/assistants-dashboard');
        }}
      />
    </AuthGuard>
  );
}
