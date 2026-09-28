export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  testCategory: string;
  tests: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  urgent: boolean;
}

export interface LabResult {
  id: string;
  orderId: string;
  testName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
}
