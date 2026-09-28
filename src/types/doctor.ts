export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  wilaya: string;
  commune: string;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  status: 'active' | 'suspended' | 'pending';
  rating: number;
}

export interface DoctorScheduleSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  maxPatientsPerSlot: number;
  bookedCount: number;
}
