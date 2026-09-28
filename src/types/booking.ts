import { PatientType } from './patient';

export type BookingStatus = 'pending' | 'approved' | 'rescheduled' | 'rejected' | 'cancelled' | 'completed';

export interface BookingRecord {
  id: string;
  refNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientType: PatientType;
  doctorId: string;
  doctorName: string;
  specialty: string;
  facilityName: string;
  wilaya: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  notes?: string;
  rejectionReason?: string;
  rescheduledTime?: string;
  createdAt: string;
  createdBy: string;
}
