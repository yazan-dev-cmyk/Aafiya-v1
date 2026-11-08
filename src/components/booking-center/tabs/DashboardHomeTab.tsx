'use client';

import React, { useState, useMemo } from 'react';
import {
  BookingRecord,
  PackageDetails,
  SystemNotification
} from '../../../types';
import {
  PlusCircle,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  ArrowUpRight,
  ChevronLeft,
  AlertTriangle,
  Bell,
  TrendingUp,
  UserCheck,
  Stethoscope,
  Activity,
  FileText,
  DollarSign,
  Receipt,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/auth';
import { BookingCenterFinancialSummary } from '@/services/bookingCenterService';

interface DashboardHomeTabProps {
  bookings: BookingRecord[];
  packageDetails: PackageDetails;
  financialSummary?: BookingCenterFinancialSummary | null;
  notifications: SystemNotification[];
  onOpenNewBooking: () => void;
  onNavigateTab: (tabId: string) => void;
  onSelectBooking: (booking: BookingRecord) => void;
  onSearchPatient: () => void;
  onPrintSchedule: () => void;
}

export const DashboardHomeTab: React.FC<DashboardHomeTabProps> = ({
  bookings,
  packageDetails,
  financialSummary,
  notifications,
  onOpenNewBooking,
  onNavigateTab,
  onSelectBooking,
  onSearchPatient,
  onPrintSchedule,
}) => {
  const { user } = useAuth();
  const [isAmountMasked, setIsAmountMasked] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.date === todayStr);

  const approvedToday = todayBookings.filter((b) => b.status === 'approved').length;
  const pendingToday = todayBookings.filter((b) => b.status === 'pending').length;
  const rescheduledToday = todayBookings.filter((b) => b.status === 'rescheduled').length;
  const rejectedToday = todayBookings.filter((b) => b.status === 'rejected').length;
  const cancelledToday = todayBookings.filter((b) => b.status === 'cancelled').length;

  const filteredTodayBookings = useMemo(() => {
    return todayBookings.filter((b) => {
      const matchesSearch =
        !searchFilter.trim() ||
        b.patientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        b.refNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (b.patientPhone && b.patientPhone.includes(searchFilter)) ||
        (b.doctorName && b.doctorName.toLowerCase().includes(searchFilter.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      return b.status === statusFilter;
    });
  }, [todayBookings, searchFilter, statusFilter]);

  const totalQuota = packageDetails.totalQuota || 1;
  const remainingQuota = packageDetails.remainingQuota || 0;
  const quotaPercentage = Math.min(100, Math.round((remainingQuota / totalQuota) * 100));

  return (
    <div className="space-y-6">
      {/* 1. Quick Dispatcher Hero Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 bg-gradient-to-l from-blue-500/5 via-transparent to-transparent">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              مركز حجز معتمد
            </span>
            <span className="text-xs font-mono text-slate-400">/booking-center</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <span>مرحباً بك، {user?.name || 'مركز الحجز'}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              الجلسة نشطة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            منصة الإرسال والحجز الميداني المعتمدة للعيادات الطبية الشريكة | {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenNewBooking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer ring-1 ring-blue-700/20"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ إنشاء حجز جديد</span>
          </button>

          <button
            onClick={onSearchPatient}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>البحث السريع عن مريض</span>
          </button>

          <button
            onClick={onPrintSchedule}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة جدول اليوم</span>
          </button>
        </div>
      </div>

      {/* 2. Quota & Balance Pulse Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2 max-w-md z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
              باقة العمليات النشطة
            </span>
            <span className="text-xs text-slate-400 font-medium">{packageDetails.packageName || 'باقة الحجوزات المعتمدة'}</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {remainingQuota}
            </span>
            <span className="text-xs font-bold text-slate-300">
              عملية حجز متبقية في الرصيد
            </span>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-slate-700/80 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  remainingQuota > 20 ? 'bg-emerald-400' : remainingQuota > 5 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${quotaPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10.5px] text-slate-400 font-mono">
              <span>المستخدم: {packageDetails.usedQuota || 0}</span>
              <span>الإجمالي: {packageDetails.totalQuota || 0}</span>
            </div>
          </div>
        </div>

        {/* Depletion Forecast & Quick Recharge CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 z-10 pt-3 md:pt-0 border-t md:border-t-0 md:border-r border-slate-700/80 md:pr-6">
          <div className="text-xs space-y-1">
            <span className="text-slate-400 font-bold block text-[11px]">التوقع التشغيلي للرصيد:</span>
            <p className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>متبقي حوالي {packageDetails.estimatedDaysRemaining || 0} يوم تشغيلي</span>
            </p>
            <span className="text-[10px] text-slate-400 block">
              تاريخ النفاد المتوقع: {packageDetails.projectedDepletionDate || '2026-12-31'}
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('packages')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <CreditCard className="w-4 h-4" />
            <span>شحن الرصيد الآن</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3. Today's Operational Schedule Table & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header & Controls */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>جدول مواعيد اليوم ({todayStr})</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-bold">
                  {todayBookings.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">الحجوزات المجدولة لليوم مرتبة زمنياً مع الحالة الفورية</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute top-2.5 right-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="بحث في مواعيد اليوم..."
                className="w-full py-1.5 pr-8 pl-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
              />
            </div>

            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كل الحجوزات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: 'الكل', count: todayBookings.length },
            { id: 'approved', label: 'مؤكد', count: approvedToday },
            { id: 'pending', label: 'بانتظار الاعتماد', count: pendingToday },
            { id: 'rescheduled', label: 'معدل', count: rescheduledToday },
            { id: 'rejected', label: 'مرفوض', count: rejectedToday },
            { id: 'cancelled', label: 'ملغى', count: cancelledToday },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === chip.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/80'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table Content */}
        {filteredTodayBookings.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-sm">لا توجد حجوزات مطابقة لخيارات الفلترة المحددة اليوم</p>
            <p className="text-xs text-slate-400 mt-1">قم بإنشاء حجز جديد فور اتصال المريض بالمركز</p>
            <button
              onClick={onOpenNewBooking}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              + إنشاء حجز الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">توقيت الموعد</th>
                  <th className="px-4 py-3">رقم المرجع</th>
                  <th className="px-4 py-3">اسم المريض</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">الطبيب / العيادة</th>
                  <th className="px-4 py-3">التخصص</th>
                  <th className="px-4 py-3">حالة الموعد</th>
                  <th className="px-4 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTodayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dir-ltr text-right">
                      {b.timeSlot}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                      {b.refNumber}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-900 font-bold">{b.patientName}</strong>
                      <span className="text-[10.5px] text-slate-400 font-mono">{b.patientPhone}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.patientType === 'registered' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">مسجل</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">زائر</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-800 font-bold">{b.doctorName}</strong>
                      <span className="text-[10px] text-slate-400 block">{b.facilityName}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {b.specialty}
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          مؤكد ومقر
                        </span>
                      )}
                      {b.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          بانتظار الاعتماد
                        </span>
                      )}
                      {b.status === 'rescheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          معدّل ({b.rescheduledTime})
                        </span>
                      )}
                      {b.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          مرفوض
                        </span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          ملغى
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onSelectBooking(b)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                      >
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* 3. KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">حجوزات اليوم الإجمالية</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{todayBookings.length}</span>
            <span className="text-[11px] font-semibold text-slate-500">
              موعد مجدول
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">الحجوزات المعتمدة</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{approvedToday}</span>
            <span className="text-[11px] font-medium text-slate-500">موافق عليها</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">بانتظار الاعتماد</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{pendingToday}</span>
            <span className="text-[11px] font-medium text-slate-500">تحتاج مراجعة</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">رصيد العمليات المتاح</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-700">{packageDetails.remainingQuota}</span>
            <span className="text-[11px] font-medium text-slate-500">عملية متاحة</span>
          </div>
        </div>

        {/* KPI 5: Total Amount Spent with Privacy Toggle */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">إجمالي المبالغ المنفقة</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAmountMasked(!isAmountMasked)}
                title="إخفاء / إظهار المبالغ عن المتلصصين"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isAmountMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {isAmountMasked
                ? '••••••••'
                : `${(financialSummary?.total_amount_spent_dzd || 0).toLocaleString()} دج`}
            </span>
            <button
              onClick={() => onNavigateTab('billing')}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              الفواتير
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
