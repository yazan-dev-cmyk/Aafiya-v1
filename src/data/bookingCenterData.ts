import {
  BookingRecord,
  PatientRecord,
  EmployeeRecord,
  AuditLogEntry,
  SystemNotification,
  PackageDetails,
  BillingInvoice
} from '../types';

export const DEFAULT_EMPTY_PACKAGE_DETAILS: PackageDetails = {
  packageName: 'باقة الحجز المعتمدة',
  totalQuota: 0,
  remainingQuota: 0,
  usedQuota: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  dailyAverageRate: 0,
  estimatedDaysRemaining: 0,
  projectedDepletionDate: '--',
};
