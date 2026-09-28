export type PatientType = 'registered' | 'guest';

export interface PatientRecord {
  id: string;
  uuid?: string;
  fullName: string;
  phone: string;
  email?: string;
  type: PatientType;
  wilaya: string;
  age?: number;
  lastVisitDate?: string;
  lastDoctorBooked?: string;
  totalBookings: number;
}
