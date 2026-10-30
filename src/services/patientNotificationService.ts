import { api } from '../lib/api';

export interface PatientNotificationPayload {
  appointment_id?: string;
  replacement_appointment_id?: string;
  booking_reference?: string;
  clinic_id?: string;
  new_date?: string;
  new_slot?: string;
  vacation_id?: string;
  message?: string;
  reason?: string;
  instruction?: string;
  [key: string]: any;
}

export interface PatientNotificationItem {
  id: string;
  appointment_id?: string | null;
  recipient_phone: string;
  recipient_type: 'patient' | string;
  channel: string;
  template: string;
  payload: PatientNotificationPayload;
  status: string;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientNotificationsResponse {
  data: PatientNotificationItem[];
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
}

export const patientNotificationService = {
  getNotifications: async (page = 1): Promise<PatientNotificationsResponse> => {
    const res = await api.get<PatientNotificationsResponse>(`/patient/notifications?page=${page}`);
    return ((res as any)?.data?.data ? (res as any).data : res) as PatientNotificationsResponse;
  },

  getNotificationById: async (id: string): Promise<PatientNotificationItem> => {
    const res = await api.get<PatientNotificationItem>(`/patient/notifications/${id}`);
    return res.data;
  },

  acknowledgeNotification: async (id: string): Promise<{ message: string; notification?: PatientNotificationItem }> => {
    const res = await api.post<{ message: string; notification?: PatientNotificationItem }>(`/patient/notifications/${id}/acknowledge`);
    return (res as any)?.data || res;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const res = await api.get<{ unread_count: number }>('/patient/notifications/unread-count');
    return res.data;
  },
};
