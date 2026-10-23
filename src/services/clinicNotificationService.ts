import { api } from '../lib/api';

export interface ClinicEscalationItem {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  clinic_id: string;
  clinic_name: string;
  escalation_reason: string;
  instruction: string;
  original_date?: string | null;
  original_time_slot?: string | null;
  replacement_appointment_id?: string | null;
  new_date?: string | null;
  new_slot?: string | null;
  escalated_at?: string | null;
  acknowledged_at?: string | null;
  is_acknowledged: boolean;
}

export interface ClinicEscalationsResponse {
  data: ClinicEscalationItem[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export const clinicNotificationService = {
  getEscalations: async (
    clinicId?: string,
    status: 'pending' | 'acknowledged' | 'all' = 'pending',
    page = 1
  ): Promise<ClinicEscalationItem[]> => {
    const headers: Record<string, string> = {};
    if (clinicId) {
      headers['X-Clinic-ID'] = clinicId;
    }

    const res = await api.get<ClinicEscalationsResponse>(
      `/clinic/notifications/escalations?status=${status}&page=${page}`,
      { headers }
    );

    const items = Array.isArray(res.data) ? res.data : (res as any)?.data?.data || [];
    return items as ClinicEscalationItem[];
  },

  acknowledgeEscalation: async (
    id: string,
    clinicId?: string
  ): Promise<{ message: string; data?: ClinicEscalationItem }> => {
    const headers: Record<string, string> = {};
    if (clinicId) {
      headers['X-Clinic-ID'] = clinicId;
    }

    const res = await api.post<{ message: string; data?: ClinicEscalationItem }>(
      `/clinic/notifications/escalations/${id}/acknowledge`,
      {},
      { headers }
    );

    return (res as any)?.data || res;
  },
};
