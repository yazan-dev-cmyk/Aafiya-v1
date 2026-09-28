import { api, ApiResponse } from '../lib/api';

export interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  duration?: string;
  instructions?: string;
}

export interface PrescriptionRecord {
  id: string;
  prescription_reference: string;
  secure_token: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'voided' | 'expired';
  notes?: string;
  items?: PrescriptionItem[];
  patient?: { first_name: string; last_name: string; mrn: string; full_name?: string };
  doctor?: { specialty: string; user?: { name: string } };
  clinic?: { name: string; phone?: string };
}

export interface PrescriptionVerificationData {
  is_valid: boolean;
  verification_status: 'active' | 'expired' | 'voided' | 'not_found' | 'invalid';
  prescription_reference?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  clinic_name?: string;
  patient_name?: string;
  issue_date?: string;
  expiry_date?: string;
  items_count?: number;
  items?: Array<{
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
}

export const prescriptionService = {
  getPrescriptions: async (params?: Record<string, any>): Promise<ApiResponse<PrescriptionRecord[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<PrescriptionRecord[]>(`/prescriptions${query ? `?${query}` : ''}`);
  },

  getPrescription: async (id: string): Promise<ApiResponse<PrescriptionRecord>> => {
    return api.get<PrescriptionRecord>(`/prescriptions/${id}`);
  },

  createPrescription: async (data: {
    patient_id: string;
    clinic_id: string;
    items: Array<{ medication_name: string; dosage: string; frequency: string; duration_days: number; instructions?: string }>;
    notes?: string;
  }): Promise<ApiResponse<PrescriptionRecord>> => {
    return api.post<PrescriptionRecord>('/prescriptions', data);
  },

  voidPrescription: async (id: string, reason: string): Promise<ApiResponse<PrescriptionRecord>> => {
    return api.post<PrescriptionRecord>(`/prescriptions/${id}/void`, { reason });
  },

  verifyToken: async (token: string): Promise<ApiResponse<PrescriptionVerificationData>> => {
    return api.get<PrescriptionVerificationData>(`/v/${token}`);
  },
};
