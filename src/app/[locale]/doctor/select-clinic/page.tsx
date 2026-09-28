'use client';

import React, { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth, AuthGuard } from '@/auth';
import { DoctorClinicSelectorView } from '@/components/doctor/DoctorClinicSelectorView';
import { DoctorNoClinicView } from '@/components/doctor/DoctorNoClinicView';

export default function SelectClinicPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const affiliatedClinics = user?.clinics || (user?.clinic ? [user.clinic] : []);
  const activeClinics = affiliatedClinics.filter((c) => c.is_active !== false);

  useEffect(() => {
    if (!isLoading && activeClinics.length === 1) {
      // Case 1: Exactly 1 active clinic -> auto-enter dashboard directly
      router.replace('/doctor/dashboard');
    }
  }, [isLoading, activeClinics.length, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Case 4: Zero active clinics
  if (activeClinics.length === 0) {
    return (
      <AuthGuard allowedRoles={['admin', 'doctor']}>
        <DoctorNoClinicView onBackToMain={() => router.push('/')} />
      </AuthGuard>
    );
  }

  // Case 2 & 3: Multiple active clinics / suspended clinics
  return (
    <AuthGuard allowedRoles={['admin', 'doctor']}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
        <DoctorClinicSelectorView
          onSelectClinic={() => {
            router.push('/doctor/dashboard');
          }}
        />
      </div>
    </AuthGuard>
  );
}
