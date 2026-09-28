import { api, ApiResponse } from '../lib/api';

export interface ClinicDoctorStaff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  license_number?: string;
  position?: 'director' | 'doctor';
  is_primary?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  joined_at?: string;
}

export interface ClinicAssistantStaff {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  permissions_json?: string[];
  delegated_permissions?: string[];
  is_active?: boolean;
  joined_at?: string;
  created_at?: string;
}

export interface ClinicDetails {
  id: string;
  name: string;
  address: string;
  wilaya: string;
  phone: string;
  director?: {
    id: string;
    name: string;
    specialty?: string;
    license_number?: string;
  };
  doctors?: ClinicDoctorStaff[];
  assistants?: ClinicAssistantStaff[];
  max_patients_per_slot?: number;
  slot_duration_min?: number;
  is_active?: boolean;
}

export interface CreateEmployedDoctorDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  specialty: string;
  license_number: string;
  bio?: string;
}

export interface CreateAssistantDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  permissions_json?: string[];
}

export interface OnboardingStatusResponse {
  user_id: string;
  email: string;
  name: string;
  has_doctor_role: boolean;
  has_doctor_profile: boolean;
  is_verified: boolean;
  is_profile_complete: boolean;
  is_active: boolean;
  provisioning_state: 'complete' | 'pending_profile' | 'pending_verification' | 'deactivated';
  doctor_profile?: {
    id: string;
    specialty: string;
    license_number: string;
    bio?: string;
  } | null;
  clinic_affiliation?: {
    id: string;
    name: string;
    wilaya: string;
    position: 'director' | 'doctor';
    is_primary: boolean;
    is_director: boolean;
  } | null;
}

export const clinicService = {
  /**
   * Get clinic full details with doctors and assistants staff.
   */
  async getClinic(clinicId: string): Promise<ApiResponse<ClinicDetails>> {
    return api.get<ClinicDetails>(`/clinics/${clinicId}`);
  },

  /**
   * Get authenticated doctor's onboarding and clinic affiliation status.
   */
  async getOnboardingStatus(): Promise<ApiResponse<OnboardingStatusResponse>> {
    return api.get<OnboardingStatusResponse>('/doctors/onboarding-status');
  },

  /**
   * Create and provision a new employed doctor for the clinic.
   */
  async createEmployedDoctor(clinicId: string, data: CreateEmployedDoctorDto): Promise<ApiResponse<any>> {
    return api.post<any>(`/clinics/${clinicId}/doctors`, data);
  },

  /**
   * Create and provision a new clinic assistant with delegated permissions.
   */
  async createAssistant(clinicId: string, data: CreateAssistantDto): Promise<ApiResponse<any>> {
    return api.post<any>(`/clinics/${clinicId}/assistants`, data);
  },

  /**
   * Update delegated permissions for a clinic assistant.
   */
  async updateAssistantPermissions(
    clinicId: string,
    assistantId: string,
    permissions: string[]
  ): Promise<ApiResponse<any>> {
    return api.put<any>(`/clinics/${clinicId}/assistants/${assistantId}/permissions`, {
      permissions,
    });
  },

  /**
   * Update active/suspended status of an employed doctor.
   */
  async updateDoctorStatus(clinicId: string, doctorId: string, isActive: boolean): Promise<ApiResponse<any>> {
    return api.put<any>(`/clinics/${clinicId}/doctors/${doctorId}/status`, { is_active: isActive });
  },

  /**
   * Detach an employed doctor from clinic staff.
   */
  async detachDoctor(clinicId: string, doctorId: string): Promise<ApiResponse<any>> {
    return api.delete<any>(`/clinics/${clinicId}/doctors/${doctorId}`);
  },

  /**
   * Update active/suspended status of a clinic assistant.
   */
  async updateAssistantStatus(clinicId: string, assistantId: string, isActive: boolean): Promise<ApiResponse<any>> {
    return api.put<any>(`/clinics/${clinicId}/assistants/${assistantId}/status`, { is_active: isActive });
  },

  /**
   * Remove an assistant from clinic staff.
   */
  async deleteAssistant(clinicId: string, assistantId: string): Promise<ApiResponse<any>> {
    return api.delete<any>(`/clinics/${clinicId}/assistants/${assistantId}`);
  },

  /**
   * Retrieve single staff member details.
   */
  async getStaffDetail(clinicId: string, staffId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/clinics/${clinicId}/staff/${staffId}`);
  },

  /**
   * Look up existing doctor by email for invitation (Director only).
   */
  async lookupDoctor(clinicId: string, email: string): Promise<ApiResponse<DoctorLookupResult>> {
    return api.get<DoctorLookupResult>(`/clinics/${clinicId}/doctors/lookup?email=${encodeURIComponent(email)}`);
  },

  /**
   * Send an invitation to an existing verified doctor to join clinic staff.
   */
  async sendDoctorInvitation(
    clinicId: string,
    doctorId: string,
    notes?: string
  ): Promise<ApiResponse<ClinicDoctorInvitation>> {
    return api.post<ClinicDoctorInvitation>(`/clinics/${clinicId}/doctor-invitations`, {
      doctor_id: doctorId,
      notes: notes || undefined,
    });
  },

  /**
   * Cancel a pending invitation (Director only).
   */
  async cancelDoctorInvitation(
    clinicId: string,
    invitationId: string
  ): Promise<ApiResponse<ClinicDoctorInvitation>> {
    return api.post<ClinicDoctorInvitation>(`/clinics/${clinicId}/doctor-invitations/${invitationId}/cancel`);
  },

  /**
   * List all doctor invitations sent by a clinic.
   */
  async getClinicInvitations(clinicId: string): Promise<ApiResponse<ClinicDoctorInvitation[]>> {
    return api.get<ClinicDoctorInvitation[]>(`/clinics/${clinicId}/doctor-invitations`);
  },

  /**
   * Get invitations received by the authenticated doctor.
   */
  async getMyInvitations(): Promise<ApiResponse<ClinicDoctorInvitation[]>> {
    return api.get<ClinicDoctorInvitation[]>('/doctor/invitations');
  },

  /**
   * Accept an invitation to join a clinic.
   */
  async acceptInvitation(invitationId: string): Promise<ApiResponse<ClinicDoctorInvitation>> {
    return api.post<ClinicDoctorInvitation>(`/doctor/invitations/${invitationId}/accept`);
  },

  /**
   * Reject an invitation to join a clinic.
   */
  async rejectInvitation(invitationId: string): Promise<ApiResponse<ClinicDoctorInvitation>> {
    return api.post<ClinicDoctorInvitation>(`/doctor/invitations/${invitationId}/reject`);
  },

  /**
   * Get all clinic affiliations for the authenticated doctor.
   */
  async getMyClinics(): Promise<ApiResponse<DoctorClinicAffiliation[]>> {
    return api.get<DoctorClinicAffiliation[]>('/doctor/clinics');
  },
};

export interface DoctorLookupResult {
  id: string;
  full_name: string;
  specialty?: string;
  license_number?: string;
  is_verified?: boolean;
  is_already_member?: boolean;
  has_pending_invitation?: boolean;
}

export interface ClinicDoctorInvitation {
  id: string;
  clinic_id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_email?: string;
  doctor_specialty?: string;
  invited_by_id?: string;
  position: 'doctor' | 'director' | string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  notes?: string;
  expires_at?: string | null;
  responded_at?: string | null;
  created_at?: string;
  clinic?: {
    id: string;
    name: string;
    wilaya?: string;
    address?: string;
    phone?: string;
  };
  doctor?: {
    id: string;
    full_name?: string;
    specialty?: string;
    license_number?: string;
  };
}

export interface DoctorClinicAffiliation {
  id: string;
  name: string;
  wilaya?: string;
  address?: string;
  phone?: string;
  position: 'director' | 'doctor';
  is_director: boolean;
  is_active: boolean;
  is_primary: boolean;
  joined_at: string | null;
}
