'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { DoctorDashboard } from '@/components/doctor/DoctorDashboard';
import { AuthGuard } from '@/auth';

export default function DoctorDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'doctor']}>
      <DoctorDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
      />
    </AuthGuard>
  );
}
