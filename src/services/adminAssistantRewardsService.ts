import { api, getStoredToken } from '@/lib/api';


export interface RewardRateSchedule {
  id: string;
  rate_amount: number | string;
  effective_from: string;
  status: 'scheduled' | 'active' | 'superseded' | 'cancelled';
  decision_reference: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  cancelled_at: string | null;
  creator?: {
    id: string;
    name: string;
  } | null;
  canceller?: {
    id: string;
    name: string;
  } | null;
}

export interface ProgramLifecycleEvent {
  id: string;
  event_type: 'state_transition' | 'policy_update';
  from_state: 'active' | 'suspended' | 'terminated' | null;
  to_state: 'active' | 'suspended' | 'terminated';
  effective_at: string;
  notice_deadline_at: string | null;
  reason: string;
  decision_reference: string | null;
  created_at: string;
  authorizer?: {
    id: string;
    name: string;
  } | null;
}

export interface RewardSettingsData {
  current_rate: {
    amount: number;
    source?: 'default' | 'schedule';
    currency?: string;
    decision_reference?: string | null;
    is_custom_schedule?: boolean;
    schedule_id?: string | null;
    effective_from?: string | null;
    effective_since?: string | null;
    schedule?: RewardRateSchedule | null;
  };
  lifecycle: {
    current_state: 'active' | 'suspended' | 'terminated';
    is_active: boolean;
    is_suspended: boolean;
    is_terminated: boolean;
    last_event?: ProgramLifecycleEvent | null;
  };
  payout_threshold: number;
}

export interface AssistantDirectoryItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  membership_status: 'active' | 'departed';
  is_active_member: boolean;
  clinic: {
    id: string;
    name: string;
    wilaya: string | null;
    wilaya_id: number | null;
  } | null;
  balance: {
    current_balance: number;
    total_earned: number;
    total_paid: number;
    total_deducted: number;
    total_relieved: number;
  };
  payout_profile: {
    id: string;
    version: number;
    status: 'pending' | 'pending_verification' | 'active' | 'rejected' | 'superseded';
    rip_masked: string | null;
    rip_full: string | null;
    is_active: boolean;
  } | null;
  payout_eligibility: {
    is_eligible: boolean;
    reason: string | null;
    threshold: number;
  };
  created_at: string;
}

export interface AssistantLedgerItem {
  id: string;
  assistant_id: string;
  transaction_type: string;
  direction: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
  creator?: {
    id: string;
    name: string;
  } | null;
}

export interface AdminPayoutProfile {
  id: string;
  assistant_id: string;
  assistant?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  clinic?: {
    id: string;
    name: string;
  } | null;
  version: number;
  status: 'pending' | 'pending_verification' | 'active' | 'rejected' | 'superseded';
  status_display?: string;
  rip: string;
  masked_rip: string;
  rip_masked?: string;
  rip_full?: string | null;
  has_document: boolean;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_name?: string | null;
  created_at: string;
}

export type PayoutProfileItem = AdminPayoutProfile;

export interface AdminPayoutBatchItem {
  id: string;
  payout_batch_id: string;
  assistant_id: string;
  assistant?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  amount: number;
  rip: string;
  rip_masked: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  transfer_reference: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface AdminPayoutBatch {
  id: string;
  batch_reference: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  total_assistants_count: number;
  items_count?: number;
  items?: AdminPayoutBatchItem[];
  created_by?: string;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
}

export interface BatchPreviewData {
  period_start: string;
  period_end: string;
  threshold: number;
  eligible_assistants_count: number;
  total_estimated_payout: number;
  excluded_assistants_count: number;
  excluded_breakdown: {
    below_threshold_count: number;
    missing_active_profile_count: number;
    negative_balance_count: number;
  };
  eligible_assistants: Array<{
    assistant_id: string;
    name: string;
    amount: number;
    masked_rip: string;
  }>;
  excluded_assistants?: Array<{
    assistant_id: string;
    name: string;
    reason: string;
  }>;
}

export interface RewardsOverviewData {
  total_earned: number;
  total_paid: number;
  total_deducted: number;
  total_relieved: number;
  current_pending_liability: number;
  current_negative_balances: number;
  total_operational_losses: number;
  losses_breakdown: {
    departure_deficit_absorption: number;
    post_departure_cancellation: number;
    post_departure_pre_payout_cancellation: number;
  };
  pending_actions: {
    pending_verification_profiles: number;
    pending_batches: number;
  };
  roster_metrics: {
    total_assistants: number;
    eligible_assistants: number;
    payout_threshold: number;
  };
}

export interface SecurityAuditLogItem {
  id: string;
  user_id: string | null;
  action: string;
  auditable_type: string | null;
  auditable_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PlatformLossItem {
  id: string;
  assistant_id: string;
  clinic_id?: string | null;
  category: string;
  reason_code?: string;
  amount: number;
  description?: string;
  reason?: string;
  created_at: string;
  assistant?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  clinic?: {
    id: string;
    name: string;
  } | null;
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

export const adminAssistantRewardsService = {
  async getOverview(): Promise<{ status: string; data: RewardsOverviewData }> {
    const res = await api.get<RewardsOverviewData>('/admin/rewards/overview');
    return { status: 'success', data: res.data };
  },

  async getAssistants(params: {
    page?: number;
    per_page?: number;
    search?: string;
    clinic_id?: string;
    wilaya_id?: string;
    membership?: 'active' | 'departed';
    eligibility?: 'eligible' | 'below_threshold' | 'deficit' | 'missing_profile';
    profile_status?: string;
  }): Promise<{ status: string; data: { data: AssistantDirectoryItem[]; meta?: any; current_page?: number; last_page?: number; total?: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.per_page) query.append('per_page', String(params.per_page));
    if (params.search) query.append('search', params.search);
    if (params.clinic_id) query.append('clinic_id', params.clinic_id);
    if (params.wilaya_id) query.append('wilaya_id', params.wilaya_id);
    if (params.membership) query.append('membership', params.membership);
    if (params.eligibility) query.append('eligibility', params.eligibility);
    if (params.profile_status) query.append('profile_status', params.profile_status);

    const queryString = query.toString();
    const endpoint = `/admin/rewards/assistants${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: {
        data: res.data?.data || res.data || [],
        meta: res.meta || res.data?.meta,
        current_page: res.meta?.current_page || res.data?.current_page || 1,
        last_page: res.meta?.last_page || res.data?.last_page || 1,
        total: res.meta?.total || res.data?.total || 0,
      },
    };
  },

  async getAssistant(assistantId: string): Promise<{ status: string; data: AssistantDirectoryItem }> {
    const res = await api.get<AssistantDirectoryItem>(`/admin/rewards/assistants/${assistantId}`);
    return { status: 'success', data: res.data };
  },

  async getAssistantLedger(
    assistantId: string,
    params: { page?: number; per_page?: number } = {}
  ): Promise<{ status: string; data: { data: AssistantLedgerItem[]; current_page?: number; last_page?: number; total?: number; meta?: any }; assistant?: any }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    const endpoint = `/admin/rewards/assistants/${assistantId}/ledger${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: {
        data: res.data?.data || res.data || [],
        current_page: res.meta?.current_page || res.data?.current_page || 1,
        last_page: res.meta?.last_page || res.data?.last_page || 1,
        total: res.meta?.total || res.data?.total || 0,
        meta: res.meta || res.data?.meta,
      },
      assistant: res.data?.assistant,
    };
  },

  async getProfiles(
    status?: string,
    page: number = 1
  ): Promise<{ status: string; data: { data: AdminPayoutProfile[]; current_page: number; last_page: number; total: number } }> {
    const query = new URLSearchParams();
    if (status) {
      const normalizedStatus = status === 'pending' ? 'pending_verification' : status;
      query.append('status', normalizedStatus);
    }
    if (page) query.append('page', String(page));
    const queryString = query.toString();
    const endpoint = `/admin/rewards/profiles${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: {
        data: res.data?.data || res.data || [],
        current_page: res.meta?.current_page || res.data?.current_page || 1,
        last_page: res.meta?.last_page || res.data?.last_page || 1,
        total: res.meta?.total || res.data?.total || 0,
      },
    };
  },

  async getPendingProfiles(): Promise<{ status: string; data: AdminPayoutProfile[] }> {
    const res = await api.get<any>('/admin/rewards/profiles/pending');
    return {
      status: 'success',
      data: res.data?.data || res.data || [],
    };
  },

  async verifyProfile(
    profileId: string,
    payload: { approved: boolean; rejection_reason?: string }
  ): Promise<{ status: string; data: any; message?: string }> {
    const res = await api.put<any>(`/admin/rewards/profiles/${profileId}/verify`, payload);
    return { status: 'success', data: res.data, message: res.message };
  },

  async revealFullRip(profileId: string): Promise<{ status: string; data: { rip: string } }> {
    const res = await api.post<any>(`/admin/rewards/profiles/${profileId}/reveal-rip`, {});
    return {
      status: 'success',
      data: { rip: res.data?.rip || res.data?.rip_full || res.data },
    };
  },

  async downloadCheque(profileId: string): Promise<void> {
    const token = getStoredToken();
    const url = `${getApiBaseUrl()}/admin/rewards/profiles/${profileId}/cheque/download`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download cheque: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = `cheque_${profileId}.pdf`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async getChequeBlobUrl(profileId: string): Promise<string> {
    const token = getStoredToken();
    const url = `${getApiBaseUrl()}/admin/rewards/profiles/${profileId}/cheque`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load cheque preview: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  },

  async getChequeBlob(profileId: string): Promise<{ url: string; mimeType: string }> {
    const token = getStoredToken();
    const url = `${getApiBaseUrl()}/admin/rewards/profiles/${profileId}/cheque`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load cheque preview: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return {
      url: window.URL.createObjectURL(blob),
      mimeType: blob.type || 'image/jpeg',
    };
  },

  async getBatches(): Promise<{ status: string; data: AdminPayoutBatch[] }> {
    const res = await api.get<any>('/admin/rewards/batches');
    return {
      status: 'success',
      data: res.data?.data || res.data || [],
    };
  },

  async getBatch(batchId: string): Promise<{ status: string; data: AdminPayoutBatch }> {
    const res = await api.get<any>(`/admin/rewards/batches/${batchId}`);
    return {
      status: 'success',
      data: res.data?.data || res.data,
    };
  },

  async previewMonthlyBatch(periodStart: string, periodEnd: string): Promise<{ status: string; data: BatchPreviewData }> {
    const query = new URLSearchParams({ period_start: periodStart, period_end: periodEnd }).toString();
    const res = await api.get<any>(`/admin/rewards/batches/preview?${query}`);
    return {
      status: 'success',
      data: res.data?.data || res.data,
    };
  },

  async generateMonthlyBatch(payload: { period_start: string; period_end: string }): Promise<{ status: string; data: AdminPayoutBatch }> {
    const res = await api.post<any>('/admin/rewards/batches/generate', payload);
    return {
      status: 'success',
      data: res.data?.data || res.data,
    };
  },

  async confirmBatchItem(
    batchId: string,
    itemId: string,
    payload: { transfer_reference: string }
  ): Promise<{ status: string; data: any }> {
    const res = await api.post<any>(`/admin/rewards/batches/${batchId}/items/${itemId}/confirm`, payload);
    return { status: 'success', data: res.data };
  },

  async failBatchItem(
    batchId: string,
    itemId: string,
    payload: { failure_reason: string }
  ): Promise<{ status: string; data: any }> {
    const res = await api.post<any>(`/admin/rewards/batches/${batchId}/items/${itemId}/fail`, payload);
    return { status: 'success', data: res.data };
  },

  async cancelBatch(
    batchId: string,
    payload: { reason: string }
  ): Promise<{ status: string; data: any }> {
    const res = await api.post<any>(`/admin/rewards/batches/${batchId}/cancel`, payload);
    return { status: 'success', data: res.data };
  },

  async getLosses(): Promise<{ status: string; data: PlatformLossItem[] }> {
    const res = await api.get<any>('/admin/rewards/losses');
    return {
      status: 'success',
      data: res.data?.data || res.data || [],
    };
  },

  async getAuditLogs(params: {
    page?: number;
    action?: string;
  } = {}): Promise<{ status: string; data: { data: SecurityAuditLogItem[]; current_page: number; last_page: number; total: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.action) query.append('action', params.action);
    const queryString = query.toString();
    const endpoint = `/admin/rewards/audit-logs${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: {
        data: res.data?.data || res.data || [],
        current_page: res.meta?.current_page || res.data?.current_page || 1,
        last_page: res.meta?.last_page || res.data?.last_page || 1,
        total: res.meta?.total || res.data?.total || 0,
      },
    };
  },

  async getSettings(): Promise<{ status: string; data: RewardSettingsData }> {
    const res = await api.get<any>('/admin/rewards/settings');
    return {
      status: 'success',
      data: res.data?.data || res.data,
    };
  },

  async getRates(params: {
    page?: number;
    per_page?: number;
    status?: string;
  } = {}): Promise<{
    status: string;
    data: RewardRateSchedule[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.per_page) query.append('per_page', String(params.per_page));
    if (params.status && params.status !== 'all') query.append('status', params.status);
    const queryString = query.toString();
    const endpoint = `/admin/rewards/rates${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: res.data?.data || res.data || [],
      meta: res.data?.meta || {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: (res.data?.data || res.data || []).length,
      },
    };
  },

  async scheduleRate(payload: {
    rate_amount: number;
    effective_from: string;
    decision_reference?: string;
    notes?: string;
  }): Promise<{ status: string; message?: string; data: RewardRateSchedule }> {
    const res = await api.post<any>('/admin/rewards/rates/schedule', payload);
    return {
      status: 'success',
      message: res.data?.message,
      data: res.data?.data || res.data,
    };
  },

  async cancelScheduledRate(
    id: string,
    payload: { cancellation_reason: string }
  ): Promise<{ status: string; message?: string; data: RewardRateSchedule }> {
    const res = await api.post<any>(`/admin/rewards/rates/${id}/cancel`, payload);
    return {
      status: 'success',
      message: res.data?.message,
      data: res.data?.data || res.data,
    };
  },

  async getLifecycleHistory(params: {
    page?: number;
    per_page?: number;
  } = {}): Promise<{
    status: string;
    data: ProgramLifecycleEvent[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    const endpoint = `/admin/rewards/lifecycle/history${queryString ? `?${queryString}` : ''}`;
    const res = await api.get<any>(endpoint);
    return {
      status: 'success',
      data: res.data?.data || res.data || [],
      meta: res.data?.meta || {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: (res.data?.data || res.data || []).length,
      },
    };
  },

  async transitionLifecycle(payload: {
    target_state: 'active' | 'suspended' | 'terminated';
    effective_at: string;
    notice_deadline_at?: string;
    reason: string;
    decision_reference?: string;
  }): Promise<{ status: string; message?: string; data: ProgramLifecycleEvent }> {
    const res = await api.post<any>('/admin/rewards/lifecycle/transition', payload);
    return {
      status: 'success',
      message: res.data?.message,
      data: res.data?.data || res.data,
    };
  },

};
