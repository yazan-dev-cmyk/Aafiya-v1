'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { PlatformAssistantDashboard } from '@/components/admin/PlatformAssistantDashboard';
import { AuthGuard } from '@/auth';

export default function AdminAssistantDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'admin_assistant']}>
      <PlatformAssistantDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenAdminDashboard={() => {
          router.push('/admin/dashboard');
        }}
      />
    </AuthGuard>
  );
}
