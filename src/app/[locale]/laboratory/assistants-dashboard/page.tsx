'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { LabAssistantsManagementDashboard } from '@/components/laboratory/LabAssistantsManagementDashboard';
import { AuthGuard } from '@/auth';

export default function LabAssistantsManagementDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'lab']}>
      <LabAssistantsManagementDashboard
        onBackToLabDashboard={() => {
          router.push('/laboratory/dashboard');
        }}
      />
    </AuthGuard>
  );
}
