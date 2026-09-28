'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallbackPath?: string;
}

const hasSessionCookie = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((item) => {
    const trimmed = item.trim();
    return trimmed.startsWith('medi_session_token=') && trimmed.split('=')[1]?.length > 0;
  });
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  allowedRoles,
  fallbackPath,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const locale = useLocale();

  const targetFallback = fallbackPath || `/${locale}`;

  // Handle bfcache page restoration event (Back/Forward Cache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !hasSessionCookie()) {
        if (!hasSessionCookie()) {
          window.location.replace(targetFallback);
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [targetFallback]);

  // Auth State Evaluation
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user || !hasSessionCookie()) {
        window.location.replace(targetFallback);
        return;
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user.roles || [];
        const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasAllowedRole) {
          window.location.replace(targetFallback);
          return;
        }

        // Diagnostic Staff Institutional Operational Access Verification
        const isDiagnosticRole = userRoles.includes('lab_assistant') || userRoles.includes('rad_assistant');
        const requiresDiagnosticRole = allowedRoles.includes('lab_assistant') || allowedRoles.includes('rad_assistant');
        if (isDiagnosticRole && requiresDiagnosticRole && !userRoles.includes('admin')) {
          const staff = user.diagnostic_staff;
          if (!staff || !staff.is_active || !staff.center || !staff.center.is_active) {
            window.location.replace(`${targetFallback}?error=institutional_access_denied`);
            return;
          }
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, targetFallback]);

  // While checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // If not authenticated or cookie missing, render nothing (ZERO UI LEAK)
  if (!isAuthenticated || !user || !hasSessionCookie()) {
    return null;
  }

  // If not authorized for role, render nothing (ZERO UI LEAK)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user.roles || [];
    const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasAllowedRole) {
      return null;
    }

    const isDiagnosticRole = userRoles.includes('lab_assistant') || userRoles.includes('rad_assistant');
    const requiresDiagnosticRole = allowedRoles.includes('lab_assistant') || allowedRoles.includes('rad_assistant');
    if (isDiagnosticRole && requiresDiagnosticRole && !userRoles.includes('admin')) {
      const staff = user.diagnostic_staff;
      if (!staff || !staff.is_active || !staff.center || !staff.center.is_active) {
        return null;
      }
    }
  }

  // Render protected content smoothly for authorized user
  return <>{children}</>;
};
