'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { PatientDashboard } from '@/components/patient/PatientDashboard';
import { AuthGuard } from '@/auth';

export default function PatientDashboardPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'patient_registered', 'patient_guest']}>
      <PatientDashboard
        onBackToMainPlatform={() => {
          router.push('/');
        }}
        onOpenDoctorDashboard={() => {
          router.push('/doctor/dashboard');
        }}
        onOpenLabDashboard={() => {
          router.push('/laboratory/dashboard');
        }}
        onOpenRadDashboard={() => {
          router.push('/radiology/dashboard');
        }}
      />
    </AuthGuard>
  );
}
