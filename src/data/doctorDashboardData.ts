export interface WaitingPatient {
  id: string;
  queueNumber: number;
  patientName: string;
  patientType: 'registered' | 'guest';
  arrivalTime: string;
  waitingMinutes: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'absent' | 'pending';
  reasonForVisit: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  emergencyFlag?: boolean;
}

export interface CurrentConsultationPatient {
  id: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female';
  type: 'registered' | 'guest';
  bloodGroup: string;
  chronicDiseases: string[];
  allergies: string[];
  currentMedications: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  vitals: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    sugar: number;
  };
}

export interface ClinicalTimelineItem {
  id: string;
  year: string;
  date: string;
  type: 'visit' | 'prescription' | 'lab' | 'lab_result' | 'radiology' | 'review';
  title: string;
  details: string;
  badgeColor: string;
}

export interface LabResultComparison {
  id: string;
  testName: string;
  category: string;
  previousValue: string;
  currentValue: string;
  unit: string;
  referenceRange: string;
  difference: string;
  trend: 'up' | 'down' | 'stable';
  isCritical?: boolean;
}

export interface RadiologyItem {
  id: string;
  studyType: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound';
  date: string;
  facility: string;
  radiologistReport: string;
  dicomAvailable: boolean;
  dicomImagesCount: number;
  status: 'completed' | 'pending';
}

export interface DrugTemplate {
  id: string;
  templateName: string;
  category: string;
  medications: {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
}

export interface ClinicalActivityLog {
  id: string;
  timestamp: string;
  actionType: 'prescription' | 'lab_order' | 'radiology_order' | 'consultation' | 'diagnosis' | 'waiting_queue';
  title: string;
  details: string;
  patientName: string;
  ipAddress: string;
}

export const PRESCRIPTION_TEMPLATES: DrugTemplate[] = [
  {
    id: 'tpl-1',
    templateName: 'بروتوكول السكري والضغط الشائع (Diabetes & HTN Standard)',
    category: 'أمراض مزمنة',
    medications: [
      {
        drugName: 'Metformin 1000mg (Glucophage)',
        dosage: 'قرص واحد',
        frequency: 'مرتان يومياً (مع الوجبات)',
        duration: '30 يوماً',
        instructions: 'يؤخذ وسط الأكل لمنع اضطراب المعدة.'
      },
      {
        drugName: 'Amlodipine 5mg (Amlor)',
        dosage: 'قرص واحد',
        frequency: 'مرة واحدة صباحاً',
        duration: '30 يوماً',
        instructions: 'متابعة قياس الضغط أسبوعياً.'
      }
    ]
  },
  {
    id: 'tpl-2',
    templateName: 'بروتوكول نزلات البرد الحادة (Acute Respiratory Infection)',
    category: 'عامة',
    medications: [
      {
        drugName: 'Paracetamol 1000mg (Doliprane)',
        dosage: 'قرص واحد',
        frequency: 'عند الحاجة (كل 8 ساعات)',
        duration: '5 أيام',
        instructions: 'لا تتجاوز 4 أقرص يومياً.'
      },
      {
        drugName: 'Vitamin C + Zinc 500mg',
        dosage: 'فوار واحد',
        frequency: 'مرة واحدة يومياً صباحاً',
        duration: '10 أيام',
        instructions: 'يُذاب في كأس ماء كبير.'
      }
    ]
  }
];

export const LABORATORY_FAVORITE_PANELS = [
  { id: 'p-cbc', name: 'حزمة الدم الكاملة (CBC / NFP)', testsCount: 8, badge: 'شائعة جداً' },
  { id: 'p-liver', name: 'حزمة وظائف الكبد (Liver Function / Bilirubin, ALT, AST)', testsCount: 5, badge: 'مفضلة' },
  { id: 'p-kidney', name: 'حزمة وظائف الكلى (Kidney Profile / Urea, Creatinine)', testsCount: 4, badge: 'مفضلة' },
  { id: 'p-thyroid', name: 'حزمة الغدة الدرقية (Thyroid Profile / TSH, FT4, FT3)', testsCount: 3, badge: 'هرمونات' },
  { id: 'p-diabetes', name: 'حزمة متابعة السكري (Diabetes Panel / HbA1c, Glycemia)', testsCount: 3, badge: 'مزمن' }
];

export const RADIOLOGY_FAVORITE_STUDIES = [
  { id: 'r-cxr', name: 'أشعة الصدر (Chest X-Ray PA View)', modality: 'X-Ray', badge: 'سريعة' },
  { id: 'r-us-abd', name: 'الموجات فوق الصوتية للبطن (Abdominal Ultrasound)', modality: 'Ultrasound', badge: 'شائعة' },
  { id: 'r-mri-brain', name: 'الرنين المغناطيسي للمخ (Brain MRI)', modality: 'MRI', badge: 'دقيقة' },
  { id: 'r-ct-chest', name: 'الأشعة المقطعية للصدر (Chest CT Scan)', modality: 'CT', badge: 'متقدمة' }
];
