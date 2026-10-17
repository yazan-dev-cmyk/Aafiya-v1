import { api, ApiResponse } from '../lib/api';

export interface ClinicOperatingPeriod {
  period_index?: number;
  open_time: string;
  close_time: string;
}

export interface ClinicOperatingDay {
  day_of_week: number; // 0=Sat, 1=Sun, ..., 6=Fri
  is_closed: boolean;
  periods: ClinicOperatingPeriod[];
}

export interface ClinicOperatingHoursData {
  clinic_id: string;
  is_configured: boolean;
  days: ClinicOperatingDay[];
}

export interface DoctorDayScheduleItem {
  day_of_week: number; // 0=Sat, 1=Sun, ..., 6=Fri
  is_closed: boolean;
  slots: string[]; // ['08:00', '09:00', ...]
}

export interface DoctorWorkingHoursData {
  clinic_id: string;
  doctor_id: string;
  is_activated: boolean;
  activated_at: string | null;
  schedule_version: number;
  days: DoctorDayScheduleItem[];
}

export const ALLOWED_HOURLY_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
] as const;

export const WEEKDAYS_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export const workingHoursService = {
  /**
   * Retrieve clinic weekly operating hours.
   */
  async getClinicOperatingHours(clinicId?: string): Promise<ApiResponse<ClinicOperatingHoursData>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.get<ClinicOperatingHoursData>('/clinic/operating-hours', headers);
  },

  /**
   * Save clinic weekly operating hours (Clinic Director or clinic.manage_settings).
   */
  async saveClinicOperatingHours(
    days: ClinicOperatingDay[],
    clinicId?: string
  ): Promise<ApiResponse<ClinicOperatingHoursData>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.put<ClinicOperatingHoursData>('/clinic/operating-hours', { days }, headers);
  },

  /**
   * Retrieve weekly working schedule for a doctor in a clinic.
   */
  async getDoctorWorkingHours(
    doctorId: string,
    clinicId?: string
  ): Promise<ApiResponse<DoctorWorkingHoursData>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.get<DoctorWorkingHoursData>(`/doctors/${doctorId}/working-hours`, headers);
  },

  /**
   * Save draft weekly schedule for a doctor before activation.
   */
  async saveDoctorScheduleDraft(
    doctorId: string,
    days: DoctorDayScheduleItem[],
    clinicId?: string
  ): Promise<ApiResponse<DoctorWorkingHoursData>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.put<DoctorWorkingHoursData>(`/doctors/${doctorId}/working-hours`, { days }, headers);
  },

  /**
   * Atomically activate and permanently lock the doctor's weekly working schedule.
   */
  async activateDoctorSchedule(
    doctorId: string,
    clinicId?: string
  ): Promise<ApiResponse<DoctorWorkingHoursData>> {
    const headers = clinicId ? { 'X-Clinic-ID': clinicId } : undefined;
    return api.post<DoctorWorkingHoursData>(`/doctors/${doctorId}/working-hours/activate`, {}, headers);
  },
};
