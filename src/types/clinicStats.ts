/**
 * Clinic Director Doctor Statistics Types
 * Strictly matching the authoritative Laravel backend contract from:
 * - backend/app/Http/Controllers/Api/V1/ClinicDoctorStatsController.php
 * - backend/app/Services/ClinicStatisticsService.php
 * - backend/app/Http/Requests/Clinic/ClinicDoctorStatsRequest.php
 */

export interface ClinicStatsSummary {
  total_appointments: number;
  pending_check_in: number;
  in_waiting_room: number;
  completed: number;
  no_show: number;
  cancelled: number;
  rejected: number;
  expired: number;
  rescheduled: number;
  walk_in_visits: number;
}

export interface ClinicDoctorItem {
  id: string;
  name: string;
  specialty: string | null;
  position: string;
  metrics: ClinicStatsSummary;
}

export interface ClinicSelectedDoctor {
  id: string;
  name: string;
  specialty: string | null;
  position: string;
}

export interface ClinicStatsFilters {
  from_date: string;
  to_date: string;
  doctor_id: string | null;
}

export interface ClinicDoctorStatsData {
  clinic: {
    id: string;
    name: string;
  };
  filters: ClinicStatsFilters;
  summary: ClinicStatsSummary;
  doctors?: ClinicDoctorItem[];
  selected_doctor?: ClinicSelectedDoctor;
}

export interface ClinicDoctorStatsQueryParams {
  from_date?: string;
  to_date?: string;
  doctor_id?: string;
}

export type DateFilterPreset = 'today' | 'specific' | 'range';
