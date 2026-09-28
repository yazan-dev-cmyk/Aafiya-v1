import { api, ApiResponse } from '../lib/api';

export interface ClinicalAccessLogItem {
  id: string;
  actor_id: string;
  actor_role: string;
  actor_position?: string;
  patient_id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  access_reason: string;
  ip_address?: string;
  created_at: string;
  actor?: { name: string; email: string };
  patient?: { first_name: string; last_name: string; mrn: string };
}

export const auditService = {
  getClinicalAccessLogs: async (params?: Record<string, any>): Promise<ApiResponse<ClinicalAccessLogItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<ClinicalAccessLogItem[]>(`/audit/clinical-access-logs${query ? `?${query}` : ''}`);
  },
};
