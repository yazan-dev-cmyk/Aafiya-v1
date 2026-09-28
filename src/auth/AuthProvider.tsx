'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserProfile, AuthResponse } from '../services/authService';
import { getActiveClinicId, setActiveClinicId as setApiActiveClinicId } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeClinicId: string | null;
  switchActiveClinic: (clinicId: string) => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  register: (data: any) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeClinicId: null,
  switchActiveClinic: async () => {},
  login: async () => ({} as AuthResponse),
  register: async () => ({} as AuthResponse),
  logout: async () => {},
  refreshUser: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null);

  const resolveActiveClinic = useCallback((profile: UserProfile | null): string | null => {
    if (!profile) return null;

    // Doctor role: multi-clinic resolution
    if (profile.roles?.includes('doctor') && profile.clinics && profile.clinics.length > 0) {
      const activeClinics = profile.clinics.filter((c) => c.is_active !== false);
      const storedClinicId = getActiveClinicId();

      // Check if stored clinic is still valid and active
      if (storedClinicId && activeClinics.some((c) => c.id === storedClinicId)) {
        return storedClinicId;
      }
      if (activeClinics.length === 1) {
        return activeClinics[0].id;
      }
      if (profile.clinic?.id && activeClinics.some((c) => c.id === profile.clinic?.id)) {
        return profile.clinic.id;
      }
      return null;
    }

    // Doctor Assistant role: strictly single-clinic from authorized affiliation
    if (profile.roles?.includes('doctor_assistant')) {
      if (profile.clinic?.id) {
        return profile.clinic.id;
      }
      return null;
    }

    return null;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.me();
      setUser(profile);

      const clinicId = resolveActiveClinic(profile);
      setApiActiveClinicId(clinicId);
      setActiveClinicId(clinicId);
    } catch {
      setUser(null);
      setApiActiveClinicId(null);
      setActiveClinicId(null);
    } finally {
      setIsLoading(false);
    }
  }, [resolveActiveClinic]);

  const switchActiveClinic = useCallback(async (clinicId: string) => {
    // Doctor Assistants are strictly single-clinic; ignore switch attempts
    if (user?.roles?.includes('doctor_assistant')) {
      return;
    }
    setApiActiveClinicId(clinicId);
    setActiveClinicId(clinicId);
    try {
      const profile = await authService.me();
      setUser(profile);
    } catch (err) {
      console.error('Failed to reload profile after switching clinic:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      const clinicId = resolveActiveClinic(response.user);
      setApiActiveClinicId(clinicId);
      setActiveClinicId(clinicId);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      setUser(response.user);
      const clinicId = resolveActiveClinic(response.user);
      setApiActiveClinicId(clinicId);
      setActiveClinicId(clinicId);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setApiActiveClinicId(null);
      setActiveClinicId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeClinicId,
        switchActiveClinic,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
