'use client';

import React, { useState } from 'react';
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
  EyeOff
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
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.date === todayStr);

  const approvedToday = todayBookings.filter((b) => b.status === 'approved').length;
  const pendingToday = todayBookings.filter((b) => b.status === 'pending').length;
  const rescheduledToday = todayBookings.filter((b) => b.status === 'rescheduled').length;

  const recentBookings = [...bookings].reverse().slice(0, 5);
  const quickNotifications = notifications.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 1. Quick Actions Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>مرحباً بك، {user?.name || 'مركز الحجز'}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              متصل الآن
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة سريعة وعملية للمواعيد والحجوزات بأقل عدد من النقرات | {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onOpenNewBooking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ إنشاء حجز جديد</span>
          </button>

          <button
            onClick={onSearchPatient}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>البحث السريع عن مريض</span>
          </button>

          <button
            onClick={onPrintSchedule}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة جدول اليوم</span>
          </button>
        </div>
      </div>

      {/* 2. Today's Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">جدول مواعيد اليوم ({todayStr})</h3>
              <p className="text-xs text-slate-500">الحجوزات المجدولة لليوم مرتبة حسب التوقيت الزمني</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('bookings')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>عرض جميع الحجوزات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {todayBookings.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">لا توجد حجوزات مسجلة لليوم حتى الآن</p>
            <p className="text-xs text-slate-400 mt-1">قم بإنشاء حجز جديد فور اتصال المريض</p>
            <button
              onClick={onOpenNewBooking}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs hover:bg-blue-700"
            >
              + إنشاء حجز الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">توقيت الموعد</th>
                  <th className="px-5 py-3.5">رقم المرجع</th>
                  <th className="px-5 py-3.5">اسم المريض</th>
                  <th className="px-5 py-3.5">النوع</th>
                  <th className="px-5 py-3.5">الطبيب / العيادة</th>
                  <th className="px-5 py-3.5">التخصص</th>
                  <th className="px-5 py-3.5">حالة الموعد</th>
                  <th className="px-5 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dir-ltr text-right">
                      {b.timeSlot}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">
                      {b.refNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {b.patientName}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {b.patientType === 'registered' ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">مسجل</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">زائر</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {b.doctorName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {b.specialty}
                    </td>
                    <td className="px-5 py-3.5">
                      {b.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          مؤكد
                        </span>
                      )}
                      {b.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          بانتظار الاعتماد
                        </span>
                      )}
                      {b.status === 'rescheduled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          معدّل ({b.rescheduledTime})
                        </span>
                      )}
                      {b.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          مرفوض
                        </span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          ملغى
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => onSelectBooking(b)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
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
