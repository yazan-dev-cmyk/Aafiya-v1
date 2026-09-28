export interface RadiologyOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET-Scan';
  bodyPart: string;
  status: 'pending' | 'scheduled' | 'scanning' | 'reported' | 'archived';
  urgent: boolean;
  createdAt: string;
}
