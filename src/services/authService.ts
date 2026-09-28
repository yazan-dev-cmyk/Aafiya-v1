import { api, setStoredToken } from '../lib/api';

export interface ClinicAffiliation {
  id: string;
  name: string;
  wilaya?: string;
  address?: string;
  phone?: string;
  position?: 'director' | 'doctor' | 'assistant' | string;
  is_director?: boolean;
  is_active?: boolean;
  is_primary?: boolean;
  joined_at?: string | null;
}

export interface DiagnosticCenterInfo {
  id: string;
  name: string;
  type: 'laboratory' | 'radiology';
  license_number?: string;
  phone?: string;
  email?: string;
  wilaya?: string;
  address?: string;
  is_active: boolean;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface DiagnosticStaffInfo {
  id: string;
  diagnostic_center_id: string;
  role_type: string;
  is_active: boolean;
  permissions: string[];
  created_at?: string;
  center?: DiagnosticCenterInfo | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions: string[];
  scoped_permissions?: string[];
  is_active: boolean;
  doctor?: {
    id: string;
    specialty: string;
    license_number: string;
    is_verified?: boolean;
    bio?: string;
  };
  clinic?: ClinicAffiliation;
  clinics?: ClinicAffiliation[];
  active_clinic?: ClinicAffiliation;
  diagnostic_staff?: DiagnosticStaffInfo | null;
  managed_diagnostic_center?: DiagnosticCenterInfo | null;
  booking_center?: {
    id: string;
    name: string;
    commercial_register?: string;
    phone: string;
    email?: string;
    wilaya?: string;
    address?: string;
    quota_balance: number;
    verification_status: 'pending' | 'verified' | 'rejected';
    verified_at?: string | null;
    rejection_reason?: string | null;
    is_active: boolean;
  } | null;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
  token_type: string;
}

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data?.token) {
      setStoredToken(response.data.token);
    }
    return response.data;
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    role?: string;
    specialty?: string;
    license_number?: string;
    clinic_name?: string;
    clinic_phone?: string;
    commercial_register?: string;
    manager_name?: string;
    wilaya?: string;
    address?: string;
    [key: string]: any;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data?.token) {
      setStoredToken(response.data.token);
    }
    return response.data;
  },

  me: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setStoredToken(null);
    }
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/auth/change-password', data);
    return response.data;
  },
};
