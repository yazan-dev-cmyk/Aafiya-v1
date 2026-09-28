export const BOOKING_STATUSES = {
  PENDING: { label: 'قيد الانتظار', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  APPROVED: { label: 'مؤكد', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  RESCHEDULED: { label: 'مُعاد جدولته', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  REJECTED: { label: 'مرفوض', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  CANCELLED: { label: 'ملغى', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  COMPLETED: { label: 'مكتمل', badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' },
} as const;
