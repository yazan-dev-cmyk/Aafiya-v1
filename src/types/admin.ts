export interface EmployeeRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'manager' | 'receptionist';
  status: 'active' | 'suspended';
  createdDate: string;
  lastLogin?: string;
  totalBookingsHandled?: number;
}

export interface AuditLogEntry {
  id: string;
  employeeId?: string;
  employeeName: string;
  action: string;
  targetRef?: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  category: 'urgent' | 'today' | 'yesterday' | 'older';
  source: 'doctor' | 'system' | 'admin';
  timestamp: string;
  read: boolean;
  bookingRef?: string;
  type?: string;
  targetRef?: string;
}

export interface PackageDetails {
  packageName: string;
  totalQuota: number;
  remainingQuota: number;
  usedQuota: number;
  startDate: string;
  endDate: string;
  dailyAverageRate: number;
  estimatedDaysRemaining: number;
  projectedDepletionDate: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  packageName: string;
  operationsCount: number;
  amountDzd: number;
  paymentMethod: string;
  status: 'paid' | 'pending';
}

export type RoleType = 
  | 'patient_registered'
  | 'patient_guest'
  | 'booking_center'
  | 'doctor'
  | 'doctor_assistant'
  | 'lab'
  | 'lab_assistant'
  | 'radiology'
  | 'rad_assistant'
  | 'admin'
  | 'admin_assistant';

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
  ctaText?: string;
  targetRole?: RoleType;
}

export interface Benefit {
  id: string;
  role: RoleType;
  title: string;
  description: string;
  points: string[];
  icon: string;
  highlight?: string;
}

export interface PackageOption {
  id: string;
  name: string;
  operationsCount: number;
  priceDzd: number;
  popular?: boolean;
  features: string[];
  discountBadge?: string;
}

export interface WorkflowStep {
  stepNumber: number;
  title: string;
  role: string;
  description: string;
  icon: string;
  businessRule: string;
  guestVsRegisteredNote: string;
}
