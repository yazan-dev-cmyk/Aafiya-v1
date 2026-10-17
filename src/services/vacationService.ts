import { api, ApiResponse } from '../lib/api';

export interface DoctorVacationClinic {
  id?: string;
  clinic_id: string;
  name?: string;
  wilaya?: string;
}

export interface DoctorVacationItem {
  id: string;
  doctor_id: string;
  vacation_start: string; // YYYY-MM-DD
  vacation_end: string;   // YYYY-MM-DD
  status: 'effective' | 'cancelled' | string;
  reason?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  clinics?: DoctorVacationClinic[];
}

export interface RegisterVacationPayload {
  vacation_start: string;
  vacation_end: string;
  clinic_ids?: string[];
  reason?: string;
  notes?: string;
}

export interface UnresolvedRescheduleItem {
  id: string;
  doctor_vacation_id: string;
  clinic_id: string;
  status: 'urgent_unresolved' | string;
  failure_reason?: string | null;
  resolved_at?: string | null;
  resolved_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
  original_appointment?: {
    id: string;
    booking_reference?: string;
    appointment_date: string;
    time_slot: string;
    status: string;
    patient_name?: string | null;
    patient_phone?: string | null;
    patient_mrn?: string | null;
    doctor?: {
      id: string;
      name?: string | null;
      specialty?: string | null;
    };
  } | null;
  replacement_appointment?: {
    id: string;
    booking_reference?: string;
    appointment_date: string;
    time_slot: string;
    status: string;
  } | null;
  vacation?: {
    id: string;
    vacation_start: string;
    vacation_end: string;
    status: string;
    reason?: string | null;
  } | null;
}

export const vacationService = {
  /**
   * List vacations for the authenticated doctor (DEC-VAC-01 / DEC-VAC-05).
   */
  async getDoctorVacations(page: number = 1, perPage: number = 20): Promise<ApiResponse<DoctorVacationItem[]>> {
    return api.get<DoctorVacationItem[]>(`/doctor/vacations?page=${page}&per_page=${perPage}`);
  },

  /**
   * Register a new vacation with immediate effectiveness (DEC-VAC-01).
   */
  async registerVacation(payload: RegisterVacationPayload): Promise<ApiResponse<DoctorVacationItem>> {
    return api.post<DoctorVacationItem>('/doctor/vacations', payload);
  },

  /**
   * Cancel an active vacation by transitioning status to 'cancelled' (DEC-VAC-05).
   * Physical deletion is strictly prohibited by backend.
   */
  async cancelVacation(vacationId: string): Promise<ApiResponse<DoctorVacationItem>> {
    return api.delete<DoctorVacationItem>(`/doctor/vacations/${vacationId}`);
  },

  /**
   * List unresolved rescheduled appointments strictly for the active clinic context (DEC-VAC-06 / DEC-GAP-03).
   */
  async getClinicUnresolvedReschedules(
    clinicId?: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<ApiResponse<UnresolvedRescheduleItem[]>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.get<UnresolvedRescheduleItem[]>(
      `/clinic/reschedule-dashboard/unresolved?page=${page}&per_page=${perPage}`,
      headers
    );
  },
};
