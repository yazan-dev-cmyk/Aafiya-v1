'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { PlatformAdminDashboard } from '@/components/admin/PlatformAdminDashboard';
import { AuthGuard } from '@/auth';

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin']}>
      <PlatformAdminDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenAssistantDashboard={() => {
          router.push('/admin/assistant-dashboard');
        }}
      />
    </AuthGuard>
  );
}
