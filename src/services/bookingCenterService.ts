import { api, ApiResponse } from '../lib/api';

export interface QuotaBalanceData {
  booking_center_id: string;
  name: string;
  quota_balance: number;
}

export interface BookingTransactionItem {
  id: string;
  transaction_type: 'purchase' | 'confirmation' | 'refund';
  units: number;
  balance_after: number;
  reference_note?: string;
  created_at: string;
  package?: {
    id: string;
    name: string;
    quota_units: number;
  };
  appointment?: {
    id: string;
    booking_reference: string;
  };
}

export interface PackagePurchaseRequestItem {
  id: string;
  request_reference: string;
  booking_center_id: string;
  booking_center?: {
    id: string;
    name: string;
    quota_balance: number;
  };
  booking_package_id: string;
  package_name: string;
  package_code: string;
  quota_units: number;
  price_dzd: number;
  payment_method?: string;
  transaction_reference?: string;
  receipt_document_path?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  reviewed_by?: {
    id: string;
    name: string;
  };
  reviewed_at?: string;
  rejection_reason?: string;
  booking_transaction_id?: string;
  created_by?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at?: string;
}

export const bookingCenterService = {
  getQuotaBalance: async (): Promise<ApiResponse<QuotaBalanceData>> => {
    return api.get<QuotaBalanceData>('/booking-centers/quota-balance');
  },

  getTransactions: async (params?: Record<string, any>): Promise<ApiResponse<BookingTransactionItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<BookingTransactionItem[]>(`/booking-centers/transactions${query ? `?${query}` : ''}`);
  },

  purchasePackage: async (packageId: string): Promise<ApiResponse<any>> => {
    return api.post('/booking-centers/purchase-package', { package_id: packageId });
  },

  createPurchaseRequest: async (data: {
    package_id: string;
    payment_method?: string;
    transaction_reference?: string;
    receipt_document_path?: string;
    notes?: string;
  }): Promise<ApiResponse<PackagePurchaseRequestItem>> => {
    return api.post<PackagePurchaseRequestItem>('/booking-centers/purchase-requests', data);
  },

  getPurchaseRequests: async (params?: Record<string, any>): Promise<ApiResponse<PackagePurchaseRequestItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<PackagePurchaseRequestItem[]>(`/booking-centers/purchase-requests${query ? `?${query}` : ''}`);
  },

  grantQuota: async (bookingCenterId: string, units: number, referenceNote?: string): Promise<ApiResponse<any>> => {
    return api.post(`/booking-centers/${bookingCenterId}/grant-quota`, {
      units,
      reference_note: referenceNote,
    });
  },

  getPackages: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/booking-packages');
  },

  getFinancialSummary: async (): Promise<ApiResponse<BookingCenterFinancialSummary>> => {
    return api.get<BookingCenterFinancialSummary>('/booking-centers/financial-summary');
  },

  getBillingRecords: async (params?: Record<string, any>): Promise<ApiResponse<PackagePurchaseRequestItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<PackagePurchaseRequestItem[]>(`/booking-centers/billing-records${query ? `?${query}` : ''}`);
  },

  updateSettings: async (data: UpdateBookingCenterSettingsPayload): Promise<ApiResponse<any>> => {
    return api.put('/booking-centers/profile', data);
  },

  getBookingPolicies: async (): Promise<ApiResponse<BookingPoliciesData>> => {
    return api.get<BookingPoliciesData>('/booking-policies');
  },
};

export interface BookingPoliciesData {
  cancellation_cutoff_hours: number;
  max_daily_bookings_per_patient: number;
}

export interface UpdateBookingCenterSettingsPayload {
  name: string;
  phone: string;
  email?: string;
  wilaya: string;
  address: string;
}

export interface BookingCenterFinancialSummary {
  booking_center_id: string;
  booking_center_name: string;
  current_quota_balance: number;
  total_amount_spent_dzd: number;
  current_month_spent_dzd: number;
  total_quota_purchased: number;
  approved_purchases_count: number;
}

