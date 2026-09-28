import { Advertisement } from '../types/advertisement';

export const MOCK_ADVERTISEMENTS: Advertisement[] = [
  {
    id: 'AD-001',
    title: 'تخفيضات الفحص الشامل',
    description: 'خصم 30% على جميع فحوصات الدم الشاملة لمشتركي Aafiya',
    imageUrl: 'https://images.unsplash.com/photo-1579152276503-34988636b13e?q=80&w=400&h=200&auto=format&fit=crop',
    targetUrl: '/packages',
    placement: ['PATIENT_DASHBOARD', 'HOMEPAGE'],
    audience: ['PATIENTS'],
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    status: 'ACTIVE',
    metrics: {
      impressions: 12450,
      clicks: 840,
      ctr: 6.7
    },
    createdAt: '2026-07-25'
  },
  {
    id: 'AD-002',
    title: 'جديد: منصة DICOM السحابية',
    description: 'اربط مركز الأشعة الخاص بك بأحدث منصة عرض سحابية متوافقة مع معايير HL7',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=400&h=200&auto=format&fit=crop',
    targetUrl: '/radiology/upgrade',
    placement: ['RADIOLOGY'],
    audience: ['RAD_STAFF'],
    startDate: '2026-08-10',
    endDate: '2026-09-10',
    status: 'ACTIVE',
    metrics: {
      impressions: 3200,
      clicks: 150,
      ctr: 4.6
    },
    createdAt: '2026-08-01'
  },
  {
    id: 'AD-003',
    title: 'مؤتمر أمراض القلب 2026',
    description: 'سجل الآن في المؤتمر الدولي السنوي لأمراض القلب والشرايين',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=400&h=200&auto=format&fit=crop',
    targetUrl: 'https://cardiology-conf.sa',
    placement: ['DOCTOR_DASHBOARD'],
    audience: ['DOCTORS'],
    targetSpecialty: 'Cardiology',
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    status: 'SCHEDULED',
    metrics: {
      impressions: 0,
      clicks: 0,
      ctr: 0
    },
    createdAt: '2026-08-05'
  },
  {
    id: 'AD-FREE-001',
    title: 'ترحيب: عيادة د. سارة العلي',
    description: 'انضمت حديثاً لشبكة عافية - تخصص طب الأطفال - حي الملقا، الرياض',
    imageUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400&h=200&auto=format&fit=crop',
    targetUrl: '/doctor/sara-alali',
    placement: ['PATIENT_DASHBOARD'],
    audience: ['PATIENTS'],
    startDate: '2026-08-11',
    endDate: '2026-08-25',
    status: 'ACTIVE',
    metrics: {
      impressions: 450,
      clicks: 22,
      ctr: 4.8
    },
    createdAt: '2026-08-11'
  }
];
