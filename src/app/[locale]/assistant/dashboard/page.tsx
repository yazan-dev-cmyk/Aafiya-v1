'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { DoctorAssistantDashboard } from '@/components/assistant/DoctorAssistantDashboard';
import { AuthGuard } from '@/auth';

export default function AssistantDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'doctor', 'doctor_assistant']}>
      <DoctorAssistantDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
      />
    </AuthGuard>
  );
}
