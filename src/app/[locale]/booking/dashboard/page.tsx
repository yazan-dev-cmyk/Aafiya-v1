'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { BookingCenterDashboard } from '@/components/booking-center/BookingCenterDashboard';
import { AuthGuard } from '@/auth';

export default function BookingCenterDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'booking_center']}>
      <BookingCenterDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
      />
    </AuthGuard>
  );
}
