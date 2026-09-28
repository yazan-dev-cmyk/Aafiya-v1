export type AdPlacement = 
  | 'HOMEPAGE' 
  | 'PATIENT_DASHBOARD' 
  | 'DOCTOR_DASHBOARD' 
  | 'BOOKING_CENTER' 
  | 'LABORATORY' 
  | 'RADIOLOGY';

export type AdAudience = 
  | 'PATIENTS' 
  | 'DOCTORS' 
  | 'LAB_STAFF' 
  | 'RAD_STAFF' 
  | 'BOOKING_AGENTS'
  | 'ALL';

export type AdStatus = 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'ENDED';

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement[];
  audience: AdAudience[];
  targetSpecialty?: string; // Optional specialty targeting for doctors
  startDate: string;
  endDate: string;
  status: AdStatus;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  createdAt: string;
}
