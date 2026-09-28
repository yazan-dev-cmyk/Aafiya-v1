import { api, ApiResponse } from '../lib/api';

export interface DiagnosticOrderRecord {
  id: string;
  order_reference: string;
  secure_token?: string;
  patient_id: string;
  doctor_id: string;
  clinic_id?: string;
  diagnostic_center_id?: string;
  order_type: 'laboratory' | 'radiology' | 'both';
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'received' | 'processing' | 'resulted' | 'finalized' | 'cancelled';
  clinical_indication?: string;
  ordered_at: string;
  patient?: { first_name?: string; last_name?: string; name?: string; mrn: string; phone?: string; gender?: string };
  doctor?: { id: string; name?: string; specialty?: string };
  clinic?: { id: string; name?: string };
  items?: Array<{
    id: string;
    test_code: string;
    test_name: string;
    category?: string;
    status: string;
    result_value?: string;
    reference_range?: string;
    unit?: string;
    is_critical?: boolean;
    critical_flag?: string;
    notes?: string;
  }>;
  radiology_report?: {
    id: string;
    modality: string;
    study_instance_uid?: string;
    image_urls?: string[];
    findings?: string;
    impression?: string;
    recommendations?: string;
    status: string;
    is_finalized: boolean;
    reported_by?: string;
    reported_at?: string;
  };
}

export interface DiagnosticOrderPublicData {
  order_reference: string;
  order_type: 'laboratory' | 'radiology';
  clinical_indication?: string;
  priority: string;
  status: 'created' | 'received' | 'processing' | 'resulted' | 'finalized' | 'cancelled';
  is_finalized: boolean;
  ordered_at: string;
  privacy_notice?: string | null;
  patient?: {
    name?: string;
    mrn?: string;
    gender?: string;
  } | null;
  doctor?: {
    name?: string;
    specialty?: string;
  } | null;
  clinic?: {
    name?: string;
    wilaya?: string;
  } | null;
  diagnostic_center?: {
    name?: string;
    type?: string;
    license_number?: string;
  } | null;
  items?: Array<{
    test_name: string;
    test_code?: string;
    status: string;
    is_finalized: boolean;
    result_value?: string | null;
    reference_range?: string | null;
    unit?: string | null;
    interpretation?: string | null;
    notes?: string | null;
  }>;
  radiology_report?: {
    modality: string;
    status: string;
    is_finalized: boolean;
    findings?: string | null;
    impression?: string | null;
    recommendations?: string | null;
    reported_by?: string | null;
    reported_at?: string | null;
  } | null;
}

export interface DiagnosticAnalyticsRecord {
  center_id: string;
  center_type: 'laboratory' | 'radiology';
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  stat_orders: number;
  urgent_orders: number;
  samples_received?: number;
  samples_rejected?: number;
  tests_completed?: number;
  average_tat_minutes?: number | null;
  acceptance_rate?: number | null;
  total_scans?: number;
  uploaded_images_count?: number;
  distribution?: Array<{
    name?: string;
    modality?: string;
    count: number;
    percentage: number;
  }>;
}

export interface DiagnosticNotificationRecord {
  id: string;
  type: string;
  title: string;
  content: string;
  severity: 'normal' | 'important' | 'stat' | string;
  author?: string | null;
  created_at: string;
  read: boolean;
  order_id?: string | null;
}

export interface LaboratorySampleRecord {
  id: string;
  diagnostic_order_id: string;
  sample_barcode: string;
  sample_type: string;
  status: string;
  collected_at?: string;
  received_at?: string;
  rejection_reason?: string;
  collector?: { id: string; name?: string };
  receiver?: { id: string; name?: string };
}

export interface GetOrdersParams {
  search?: string;
  order_type?: string;
  type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc' | 'ASC' | 'DESC';
  page?: number;
  per_page?: number;
}

export const diagnosticService = {
  getOrders: async (params?: GetOrdersParams | Record<string, any>): Promise<ApiResponse<DiagnosticOrderRecord[]>> => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          cleanParams[key] = val;
        }
      });
    }
    const query = new URLSearchParams(cleanParams).toString();
    return api.get<DiagnosticOrderRecord[]>(`/diagnostic-orders${query ? `?${query}` : ''}`);
  },

  getOrder: async (id: string): Promise<ApiResponse<DiagnosticOrderRecord>> => {
    return api.get<DiagnosticOrderRecord>(`/diagnostic-orders/${id}`);
  },

  createOrder: async (data: {
    patient_id: string;
    clinic_id?: string;
    order_type: string;
    priority?: string;
    items: Array<{ test_code: string; test_name: string; item_type: string }>;
    clinical_notes?: string;
  }): Promise<ApiResponse<DiagnosticOrderRecord>> => {
    return api.post<DiagnosticOrderRecord>('/diagnostic-orders', data);
  },

  receiveOrder: async (id: string, centerId: string): Promise<ApiResponse<DiagnosticOrderRecord>> => {
    return api.post<DiagnosticOrderRecord>(`/diagnostic-orders/${id}/receive`, {
      diagnostic_center_id: centerId,
    });
  },

  submitResult: async (itemId: string, data: { result_value: string; status?: string; interpretation?: string; notes?: string; unit?: string; reference_range?: string }): Promise<ApiResponse<any>> => {
    return api.post(`/diagnostic-order-items/${itemId}/result`, data);
  },

  finalizeOrder: async (id: string): Promise<ApiResponse<DiagnosticOrderRecord>> => {
    return api.post<DiagnosticOrderRecord>(`/diagnostic-orders/${id}/finalize`);
  },

  getRadiologyReport: async (orderId: string): Promise<ApiResponse<any>> => {
    return api.get(`/diagnostic-orders/${orderId}/radiology-report`);
  },

  saveRadiologyReport: async (orderId: string, data: {
    modality: string;
    findings?: string;
    impression?: string;
    recommendations?: string;
    study_instance_uid?: string;
    image_urls_json?: string[];
  }): Promise<ApiResponse<any>> => {
    return api.post(`/diagnostic-orders/${orderId}/radiology-report`, data);
  },

  getAnalytics: async (centerId: string): Promise<ApiResponse<DiagnosticAnalyticsRecord>> => {
    return api.get<DiagnosticAnalyticsRecord>(`/diagnostic-centers/${centerId}/analytics`);
  },

  getNotifications: async (centerId: string): Promise<ApiResponse<DiagnosticNotificationRecord[]>> => {
    return api.get<DiagnosticNotificationRecord[]>(`/diagnostic-centers/${centerId}/notifications`);
  },

  markNotificationRead: async (centerId: string, notificationId: string): Promise<ApiResponse<any>> => {
    return api.post(`/diagnostic-centers/${centerId}/notifications/${notificationId}/read`);
  },

  markAllNotificationsRead: async (centerId: string): Promise<ApiResponse<any>> => {
    return api.post(`/diagnostic-centers/${centerId}/notifications/mark-all-read`);
  },

  createDirective: async (centerId: string, data: { title: string; content: string; priority?: string }): Promise<ApiResponse<any>> => {
    return api.post(`/diagnostic-centers/${centerId}/directives`, data);
  },

  getMyStaffProfile: async (): Promise<ApiResponse<any>> => {
    return api.get('/diagnostic-staff/me');
  },

  getOrderSamples: async (orderId: string): Promise<ApiResponse<LaboratorySampleRecord[]>> => {
    return api.get<LaboratorySampleRecord[]>(`/diagnostic-orders/${orderId}/samples`);
  },

  createSample: async (orderId: string, data: { sample_type: string }): Promise<ApiResponse<LaboratorySampleRecord>> => {
    return api.post<LaboratorySampleRecord>(`/diagnostic-orders/${orderId}/samples`, data);
  },

  updateSampleStatus: async (sampleId: string, data: { status: string; rejection_reason?: string }): Promise<ApiResponse<LaboratorySampleRecord>> => {
    return api.post<LaboratorySampleRecord>(`/laboratory-samples/${sampleId}/status`, data);
  },

  /**
   * Public verification of Diagnostic Order QR Token (No auth required, rate-limited).
   */
  verifyToken: async (token: string): Promise<ApiResponse<DiagnosticOrderPublicData>> => {
    return api.get<DiagnosticOrderPublicData>(`/diagnostics/verify/${token}`);
  },
};
