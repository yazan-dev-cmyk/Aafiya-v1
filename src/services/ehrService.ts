import { api, ApiResponse } from '../lib/api';

export interface PatientRecord {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  email?: string;
  full_name?: string;
  wilaya?: string;
  address?: string;
  blood_group?: string;
  national_id?: string;
  allergies?: Array<{ id: string; allergen_name: string; severity: string; reaction_type?: string }>;
  chronic_conditions?: Array<{ id: string; condition_name: string; diagnosed_year?: number }>;
  medications?: Array<{ id: string; medication_name: string; dosage?: string }>;
}

export interface VitalSigns {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight_kg?: number;
  height_cm?: number;
  oxygen_saturation?: number;
  blood_glucose?: number;
}

export interface ClinicalVisitRecord {
  id: string;
  visit_reference: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis?: string;
  clinical_notes?: string;
  treatment_plan?: string;
  is_finalized: boolean;
  finalized_at?: string;
  vital_signs?: VitalSigns | null;
  patient?: PatientRecord;
  doctor?: { id: string; specialty?: string; user?: { name: string } };
  clinic?: { id: string; name: string; wilaya?: string };
}

export const ehrService = {
  getMyPatientProfile: async (): Promise<ApiResponse<PatientRecord>> => {
    return api.get<PatientRecord>('/patients/me');
  },

  getPatients: async (params?: Record<string, any>): Promise<ApiResponse<PatientRecord[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<PatientRecord[]>(`/patients${query ? `?${query}` : ''}`);
  },

  getPatient: async (id: string): Promise<ApiResponse<PatientRecord>> => {
    return api.get<PatientRecord>(`/patients/${id}`);
  },

  createPatient: async (data: Partial<PatientRecord>): Promise<ApiResponse<PatientRecord>> => {
    return api.post<PatientRecord>('/patients', data);
  },

  getVisits: async (params?: Record<string, any>): Promise<ApiResponse<ClinicalVisitRecord[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<ClinicalVisitRecord[]>(`/clinical-visits${query ? `?${query}` : ''}`);
  },

  getVisit: async (id: string): Promise<ApiResponse<ClinicalVisitRecord>> => {
    return api.get<ClinicalVisitRecord>(`/clinical-visits/${id}`);
  },

  createVisit: async (data: Partial<ClinicalVisitRecord>): Promise<ApiResponse<ClinicalVisitRecord>> => {
    return api.post<ClinicalVisitRecord>('/clinical-visits', data);
  },

  finalizeVisit: async (id: string): Promise<ApiResponse<ClinicalVisitRecord>> => {
    return api.post<ClinicalVisitRecord>(`/clinical-visits/${id}/finalize`);
  },

  addVitalSigns: async (id: string, vitals: Array<{ vital_name: string; value: string; unit: string }>): Promise<ApiResponse<any>> => {
    return api.post(`/clinical-visits/${id}/vital-signs`, { vitals });
  },

  generateShareToken: async (data: {
    scope: 'single_report' | 'all_emr';
    resource_type?: 'lab' | 'radiology' | 'prescription';
    resource_id?: string;
    duration: '24h' | '7d' | '30d';
  }): Promise<ApiResponse<{ token: string; share_url: string; expires_at: string }>> => {
    return api.post('/patients/share-token', data);
  },

  getSharedRecord: async (token: string): Promise<ApiResponse<any>> => {
    return api.get(`/shared-records/${token}`);
  },
};
