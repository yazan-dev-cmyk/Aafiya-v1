/**
 * Aafiya Centralized API Client (P19)
 * Strongly-typed HTTP client for Laravel API communication.
 */

export class ApiError extends Error {
  public status: number;
  public code?: number;
  public errors?: Record<string, string[]>;
  public responseData?: any;

  constructor(message: string, status: number, code?: number, errors?: Record<string, string[]>, responseData?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.responseData = responseData;
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

export const getStoredToken = (): string | null => {
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

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  requiresAuth?: boolean;
  includeClinicContext?: boolean;
}

function normalizeOptions(options?: RequestOptions | Record<string, string>): RequestOptions {
  if (!options) return {};
  if ('headers' in options || 'requiresAuth' in options || 'includeClinicContext' in options || 'signal' in options || 'cache' in options) {
    return options as RequestOptions;
  }
  return { headers: options as HeadersInit };
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    requiresAuth = true,
    includeClinicContext = true,
    headers: customHeaders,
    ...fetchInit
  } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = getStoredToken();
  const activeClinicId = getActiveClinicId();

  const headers = new Headers(customHeaders);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('Content-Type') && !(fetchInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!requiresAuth) {
    headers.delete('Authorization');
  } else if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!includeClinicContext) {
    headers.delete('X-Clinic-ID');
  } else if (activeClinicId && !headers.has('X-Clinic-ID')) {
    headers.set('X-Clinic-ID', activeClinicId);
  }

  try {
    const response = await fetch(url, {
      ...fetchInit,
      headers,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const isAuthHandshake = cleanEndpoint.startsWith('/auth/login') || cleanEndpoint.startsWith('/auth/register');
      if (response.status === 401 && requiresAuth && token && !isAuthHandshake) {
        setStoredToken(null);
      }

      const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMessage, response.status, data?.code, data?.errors, data);
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
  get: <T = any>(endpoint: string, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, { ...normalizeOptions(options), method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, {
      ...normalizeOptions(options),
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, {
      ...normalizeOptions(options),
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, { ...normalizeOptions(options), method: 'DELETE' }),

  publicGet: <T = any>(endpoint: string, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, {
      ...normalizeOptions(options),
      method: 'GET',
      requiresAuth: false,
      includeClinicContext: false,
    }),

  publicPost: <T = any>(endpoint: string, body?: any, options?: RequestOptions | Record<string, string>) =>
    apiClient<T>(endpoint, {
      ...normalizeOptions(options),
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      requiresAuth: false,
      includeClinicContext: false,
    }),
};
