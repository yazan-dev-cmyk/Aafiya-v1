export type Language = 'ar' | 'en' | 'fr';

export type ViewMode = 
  | 'landing' 
  | 'booking_center_dashboard' 
  | 'doctor_dashboard' 
  | 'assistant_dashboard'
  | 'laboratory_dashboard'
  | 'lab_assistant_dashboard'
  | 'radiology_dashboard'
  | 'rad_assistant_dashboard'
  | 'patient_dashboard'
  | 'platform_admin_dashboard'
  | 'platform_assistant_dashboard';

export interface FAQItem {
  id: string;
  category: 'general' | 'booking_center' | 'patients' | 'doctors' | 'labs_rad' | 'security';
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  entity: string;
  location: string;
  avatar: string;
  comment: string;
  rating: number;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
  categoryKey: string;
  summary: string;
  image: string;
  readTime: string;
}
