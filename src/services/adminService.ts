import { api, ApiResponse } from '../lib/api';

export interface PlatformDashboardStats {
  total_users: number;
  total_doctors: number;
  verified_doctors: number;
  pending_doctors: number;
  verified_booking_centers: number;
  laboratories: number;
  radiology_centers: number;
}

export interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  pendingDoctorsCount: number;
  totalCenters: number;
  totalLabs: number;
  totalRadCenters: number;
  dailyBookings: number;
  labOrders: number;
  radOrders: number;
  monthlyRevenue: string;
  activeSubscriptions: number;
}

export interface AdminDoctorItem {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty: string;
  license_number: string;
  is_verified: boolean;
  wilaya?: string;
  clinic?: {
    id: string;
    name: string;
    wilaya?: string;
  };
  clinics?: Array<{
    id: string;
    name: string;
    wilaya?: string;
    address?: string;
    phone?: string;
  }>;
  created_at?: string;
}

export interface AdminCenterItem {
  id: string;
  name: string;
  type: string;
  wilaya: string;
  address: string;
  phone: string;
  email?: string;
  is_active: boolean;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AdminBookingCenterItem {
  id: string;
  name: string;
  commercial_register?: string;
  license_number?: string;
  wilaya: string;
  address: string;
  phone: string;
  email?: string;
  quota_balance: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  reviewed_by?: {
    id: string;
    name: string;
  } | null;
  rejection_reason?: string | null;
  is_active: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  created_at?: string;
}

export interface AdminPackageItem {
  id: string;
  package_code: string;
  name: string;
  quota_units: number;
  price_dzd: number;
  description?: string;
  is_active: boolean;
  price?: number;
  quota?: number;
  duration_days?: number;
}

export interface AdminAuditLogItem {
  id: string;
  user_id: string;
  patient_id?: string;
  resource_type: string;
  resource_id: string;
  action: string;
  ip_address: string;
  user_agent?: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
}

export const adminService = {
  getDashboardStats: async (): Promise<ApiResponse<PlatformDashboardStats>> => {
    return api.get<PlatformDashboardStats>('/admin/dashboard/stats');
  },

  getDoctors: async (params?: Record<string, any>): Promise<ApiResponse<AdminDoctorItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdminDoctorItem[]>(`/doctors${query ? `?${query}` : ''}`);
  },

  verifyDoctor: async (id: string, is_verified: boolean = true): Promise<ApiResponse<AdminDoctorItem>> => {
    return api.put<AdminDoctorItem>(`/admin/doctors/${id}/verify`, { is_verified });
  },

  getClinics: async (params?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<any[]>(`/clinics${query ? `?${query}` : ''}`);
  },

  getBookingCenters: async (params?: Record<string, any>): Promise<ApiResponse<AdminBookingCenterItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdminBookingCenterItem[]>(`/booking-centers${query ? `?${query}` : ''}`);
  },

  verifyBookingCenter: async (id: string): Promise<ApiResponse<AdminBookingCenterItem>> => {
    return api.put<AdminBookingCenterItem>(`/admin/booking-centers/${id}/verify`);
  },

  rejectBookingCenter: async (id: string, rejection_reason: string): Promise<ApiResponse<AdminBookingCenterItem>> => {
    return api.post<AdminBookingCenterItem>(`/admin/booking-centers/${id}/reject`, { rejection_reason });
  },

  getDiagnosticCenters: async (params?: Record<string, any>): Promise<ApiResponse<AdminCenterItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdminCenterItem[]>(`/diagnostic-centers${query ? `?${query}` : ''}`);
  },

  getBookingPackages: async (params?: Record<string, any>): Promise<ApiResponse<AdminPackageItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdminPackageItem[]>(`/booking-packages${query ? `?${query}` : ''}`);
  },

  createBookingPackage: async (data: {
    name: string;
    package_code: string;
    quota_units: number;
    price_dzd: number;
    description?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AdminPackageItem>> => {
    return api.post<AdminPackageItem>('/booking-packages', data);
  },

  updateBookingPackage: async (
    id: string,
    data: Partial<{
      name: string;
      package_code: string;
      quota_units: number;
      price_dzd: number;
      description?: string;
      is_active?: boolean;
    }>
  ): Promise<ApiResponse<AdminPackageItem>> => {
    return api.put<AdminPackageItem>(`/booking-packages/${id}`, data);
  },

  deleteBookingPackage: async (id: string): Promise<ApiResponse<any>> => {
    return api.delete(`/booking-packages/${id}`);
  },

  getAppointments: async (params?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<any[]>(`/appointments${query ? `?${query}` : ''}`);
  },

  getDiagnosticOrders: async (params?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<any[]>(`/diagnostic-orders${query ? `?${query}` : ''}`);
  },

  getAuditLogs: async (params?: Record<string, any>): Promise<ApiResponse<AdminAuditLogItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdminAuditLogItem[]>(`/audit/clinical-access-logs${query ? `?${query}` : ''}`);
  },

  getPatients: async (params?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<any[]>(`/patients${query ? `?${query}` : ''}`);
  },

  getPackagePurchaseRequests: async (params?: Record<string, any>): Promise<ApiResponse<import('./bookingCenterService').PackagePurchaseRequestItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<import('./bookingCenterService').PackagePurchaseRequestItem[]>(`/admin/package-purchase-requests${query ? `?${query}` : ''}`);
  },

  getPackagePurchaseRequest: async (id: string): Promise<ApiResponse<import('./bookingCenterService').PackagePurchaseRequestItem>> => {
    return api.get<import('./bookingCenterService').PackagePurchaseRequestItem>(`/admin/package-purchase-requests/${id}`);
  },

  approvePackagePurchaseRequest: async (id: string): Promise<ApiResponse<import('./bookingCenterService').PackagePurchaseRequestItem>> => {
    return api.post<import('./bookingCenterService').PackagePurchaseRequestItem>(`/admin/package-purchase-requests/${id}/approve`);
  },

  rejectPackagePurchaseRequest: async (id: string, rejectionReason: string): Promise<ApiResponse<import('./bookingCenterService').PackagePurchaseRequestItem>> => {
    return api.post<import('./bookingCenterService').PackagePurchaseRequestItem>(`/admin/package-purchase-requests/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
  },

  getPlatformFinancialSummary: async (): Promise<ApiResponse<PlatformFinancialSummary>> => {
    return api.get<PlatformFinancialSummary>('/admin/financial-reports/summary');
  },

  getPlatformPayments: async (params?: Record<string, any>): Promise<ApiResponse<import('./bookingCenterService').PackagePurchaseRequestItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<import('./bookingCenterService').PackagePurchaseRequestItem[]>(`/admin/financial-reports/payments${query ? `?${query}` : ''}`);
  },

  getAssistants: async (params?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<any[]>(`/admin/assistants${query ? `?${query}` : ''}`);
  },

  getBookingPolicies: async (): Promise<ApiResponse<import('./bookingCenterService').BookingPoliciesData>> => {
    return api.get<import('./bookingCenterService').BookingPoliciesData>('/booking-policies');
  },

  updateBookingPolicies: async (data: {
    cancellation_cutoff_hours: number;
    max_daily_bookings_per_patient: number;
  }): Promise<ApiResponse<import('./bookingCenterService').BookingPoliciesData>> => {
    return api.put<import('./bookingCenterService').BookingPoliciesData>('/admin/booking-policies', data);
  },
};

export interface PlatformFinancialSummary {
  total_revenue_dzd: number;
  current_month_revenue_dzd: number;
  revenue_sources: {
    package_sales: {
      name: string;
      active: boolean;
      total_amount_dzd: number;
      current_month_amount_dzd: number;
      approved_requests_count: number;
      total_quota_units_sold: number;
    };
    advertising: { name: string; active: boolean; total_amount_dzd: number };
    contracts: { name: string; active: boolean; total_amount_dzd: number };
    other: { name: string; active: boolean; total_amount_dzd: number };
  };
  metrics: {
    total_approved_sales_count: number;
    total_quota_units_sold: number;
    average_sale_amount_dzd: number;
  };
  revenue_by_package: Array<{
    package_code: string;
    package_name: string;
    quota_units: number;
    sales_count: number;
    total_quota_units: number;
    total_revenue_dzd: number;
  }>;
}

