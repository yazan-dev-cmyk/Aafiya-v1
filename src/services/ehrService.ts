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

export interface SharedPatientMedicalRecord {
  scope: 'all_emr';
  patient: {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    full_name: string;
    gender: 'male' | 'female' | string;
    date_of_birth: string;
    blood_group: string;
    allergies: Array<{
      id: string;
      patient_id: string;
      allergen: string;
      severity: string;
      reaction: string;
      diagnosed_at?: string | null;
      notes?: string | null;
      created_at?: string;
    }>;
    chronic_conditions: Array<{
      id: string;
      patient_id: string;
      condition_name: string;
      icd10_code?: string | null;
      diagnosed_date?: string | null;
      status: string;
      notes?: string | null;
      created_at?: string;
    }>;
    current_medications: Array<{
      id: string;
      patient_id: string;
      medication_name: string;
      dosage?: string | null;
      frequency?: string | null;
      start_date?: string | null;
      prescribed_by?: string | null;
      is_active: boolean;
      notes?: string | null;
      created_at?: string;
    }>;
  };
  share_metadata: {
    scope: 'all_emr';
    access_granted_at: string;
    expires_at: string;
    authorized_clinical_scope: string;
  };
}

export interface PatientShareTokenCreated {
  id: string;
  token: string;
  scope: 'all_emr';
  duration: '24h' | '7d' | '30d';
  expires_at: string;
  share_url: string;
  has_pin: boolean;
  status: 'active';
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
    pin: string;
    duration: '24h' | '7d' | '30d';
    scope?: 'all_emr';
  }): Promise<ApiResponse<PatientShareTokenCreated>> => {
    return api.post<PatientShareTokenCreated>('/patients/share-token', {
      scope: 'all_emr',
      duration: data.duration,
      pin: data.pin.trim(),
    });
  },

  getSharedRecord: async (token: string): Promise<ApiResponse<any>> => {
    return api.publicGet(`/shared-records/${token}`);
  },

  /**
   * Public resolution of an encrypted shared medical record with mandatory PIN (DEC-P05-02, DEC-P05-03, DEC-P05-04)
   */
  resolveSharedRecord: async (data: {
    token: string;
    pin: string;
  }): Promise<ApiResponse<SharedPatientMedicalRecord>> => {
    return api.publicPost<SharedPatientMedicalRecord>('/shared-records/resolve', data);
  },
};
