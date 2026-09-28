import { api, ApiResponse } from '../lib/api';
import {
  ClinicDoctorStatsData,
  ClinicDoctorStatsQueryParams,
} from '../types/clinicStats';

export const clinicStatsService = {
  /**
   * Get clinic-level doctor statistics for the authorized Clinic Director.
   * Strictly consumes GET /api/v1/clinic/doctor-stats
   *
   * @param params Optional query parameters: from_date, to_date, doctor_id
   * @returns ApiResponse containing ClinicDoctorStatsData
   */
  async getClinicDoctorStats(
    params?: ClinicDoctorStatsQueryParams
  ): Promise<ApiResponse<ClinicDoctorStatsData>> {
    const searchParams = new URLSearchParams();

    if (params?.from_date) {
      searchParams.set('from_date', params.from_date);
    }
    if (params?.to_date) {
      searchParams.set('to_date', params.to_date);
    }
    if (params?.doctor_id && params.doctor_id.trim() !== '') {
      searchParams.set('doctor_id', params.doctor_id.trim());
    }

    const queryString = searchParams.toString();
    const endpoint = `/clinic/doctor-stats${queryString ? `?${queryString}` : ''}`;

    return api.get<ClinicDoctorStatsData>(endpoint);
  },
};
