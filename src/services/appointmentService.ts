import { api, ApiResponse } from '../lib/api';

export interface AppointmentItem {
  id: string;
  booking_reference: string;
  secure_token?: string;
  checked_in_at?: string | null;
  clinic?: {
    id: string;
    name: string;
    phone?: string;
    wilaya?: string;
  };
  clinic_id?: string;
  doctor?: {
    id: string;
    name?: string;
    specialty?: string;
    user?: {
      name: string;
    };
  };
  doctor_id?: string;
  patient?: {
    id?: string | null;
    name?: string;
    phone?: string;
    mrn?: string | null;
    national_id?: string | null;
  };
  patient_id?: string | null;
  patient_name?: string;
  patient_phone?: string;
  patient_mrn?: string;
  appointment_date: string;
  time_slot: string;
  status: string;
  creator_type: string;
  notes?: string;
}

export const appointmentService = {
  getAppointments: async (params?: Record<string, any>): Promise<ApiResponse<AppointmentItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AppointmentItem[]>(`/appointments${query ? `?${query}` : ''}`);
  },

  getSlots: async (clinicId: string, doctorId: string, date: string): Promise<ApiResponse<any>> => {
    return api.get(`/appointments/slots?clinic_id=${clinicId}&doctor_id=${doctorId}&date=${date}`);
  },

  createAppointment: async (data: {
    clinic_id: string;
    doctor_id: string;
    patient_name: string;
    patient_phone: string;
    appointment_date: string;
    time_slot: string;
    patient_id?: string;
    patient_mrn?: string;
    notes?: string;
  }): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>('/appointments', data);
  },

  checkIn: async (token: string): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>('/appointments/check-in', { token });
  },

  confirmAppointment: async (id: string): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>(`/appointments/${id}/confirm`);
  },

  cancelAppointment: async (id: string, reason?: string): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>(`/appointments/${id}/cancel`, { reason });
  },

  rescheduleAppointment: async (id: string, data: { appointment_date: string; time_slot: string; notes?: string }): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>(`/appointments/${id}/reschedule`, data);
  },

  rejectAppointment: async (id: string, reason?: string): Promise<ApiResponse<AppointmentItem>> => {
    return api.post<AppointmentItem>(`/appointments/${id}/reject`, { reason });
  },
};
