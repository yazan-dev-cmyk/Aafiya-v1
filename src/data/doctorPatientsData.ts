export interface VisitRecord {
  id: string;
  patientId: string;
  patientMrn: string;
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female';
  date: string;
  time: string;
  visitType: 'first' | 'review' | 'followup' | 'emergency' | 'teleconsult';
  diagnosis: string;
  hasPrescription: boolean;
  hasLabOrder: boolean;
  hasRadiologyOrder: boolean;
  doctorName: string;
  status: 'completed' | 'ongoing' | 'cancelled' | 'scheduled';
  notes: string;
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
  };
}

export interface PatientRecord {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female';
  phone: string;
  stateLocation: string;
  firstVisitDate: string;
  lastVisitDate: string;
  visitCount: number;
  status: 'active' | 'followup' | 'completed' | 'absent';
  attendingDoctor: string;
  nextAppointment: string | null;
  primaryDiagnosis: string;
  bloodGroup: string;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  visitsHistory: VisitRecord[];
}
