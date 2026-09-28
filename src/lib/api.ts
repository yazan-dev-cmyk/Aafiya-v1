/**
 * Aafiya Centralized API Client (P19)
 * Strongly-typed HTTP client for Laravel API communication.
 */

export class ApiError extends Error {
  public status: number;
  public code?: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  links?: Record<string, string | null>;
  message?: string;
  status?: string;
  code?: number;
}

const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

const getStoredToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )medi_session_token=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
};

export const setStoredToken = (token: string | null, days = 30): void => {
  if (typeof document === 'undefined') return;
  if (token) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `medi_session_token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`;
  } else {
    document.cookie = 'medi_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
  }
};

export const getActiveClinicId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('medi_active_clinic_id');
};

export const setActiveClinicId = (clinicId: string | null): void => {
  if (typeof window === 'undefined') return;
  if (clinicId) {
    localStorage.setItem('medi_active_clinic_id', clinicId);
  } else {
    localStorage.removeItem('medi_active_clinic_id');
  }
};

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = getStoredToken();
  const activeClinicId = getActiveClinicId();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeClinicId && !headers['X-Clinic-ID']) {
    headers['X-Clinic-ID'] = activeClinicId;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 401) {
        setStoredToken(null);
      }

      const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMessage, response.status, data?.code, data?.errors);
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network request failed', 0);
  }
}

export const api = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    apiClient<T>(endpoint, { method: 'DELETE', headers }),
};
