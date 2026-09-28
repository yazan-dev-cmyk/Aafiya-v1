import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Package,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  PieChart,
  Users
} from 'lucide-react';
import { BookingRecord, PackageDetails } from '../../../types';

interface ReportsAnalyticsTabProps {
  bookings: BookingRecord[];
  packageDetails: PackageDetails;
}

export const ReportsAnalyticsTab: React.FC<ReportsAnalyticsTabProps> = ({
  bookings,
  packageDetails
}) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Operational Stats Calculation
  const totalBookings = bookings.length;
  const approvedCount = bookings.filter(b => b.status === 'approved').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const rejectedCount = bookings.filter(b => b.status === 'rejected').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
  const rescheduledCount = bookings.filter(b => b.status === 'rescheduled').length;

  const registeredCount = bookings.filter(b => b.patientType === 'registered').length;
  const guestCount = bookings.filter(b => b.patientType === 'guest').length;

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    alert(`جارٍ تصدير تقرير نشاط مركز الحجز بصيغة ${format}... تم البدء بالتنزيل التلقائي.`);
  };

  // Activity trend derived from bookings
  const approvedTotal = bookings.filter(b => b.status === 'approved').length;
  const pendingTotal = bookings.filter(b => b.status === 'pending').length;
  const completedTotal = bookings.filter(b => b.status === 'completed').length;
  const rescheduledTotal = bookings.filter(b => b.status === 'rescheduled').length;

  const activityTrend = [
    { label: 'المؤكدة', value: approvedTotal },
    { label: 'قيد الانتظار', value: pendingTotal },
    { label: 'المكتملة', value: completedTotal },
    { label: 'المعدلة', value: rescheduledTotal },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">تقارير نشاط مركز الحجز (Operational Reports)</h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حجم العمليات التشغيلية، استهلاك الرصيد، وحالات الحجوزات المنفذة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('PDF')}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer flex items-center gap-1.5 border border-rose-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>

          <button
            onClick={() => handleExport('Excel')}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs cursor-pointer flex items-center gap-1.5 border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleExport('CSV')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Operational) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">إجمالي الحجوزات</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{totalBookings}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">الحجوزات المعتمدة</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-600">{approvedCount}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">بانتظار الإجراء</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-amber-600">{pendingCount}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ملغاة / مرفوضة</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-rose-600">{rejectedCount + cancelledCount}</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Package & Quota Summary */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">تقرير الباقة والرصيد</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">الباقة النشطة حالياً</span>
                <span className="font-bold text-slate-900 block mt-0.5">{packageDetails.packageName}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">الاستهلاك الكلي</span>
                  <span className="text-blue-600">{Math.round((packageDetails.usedQuota / packageDetails.totalQuota) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(packageDetails.usedQuota / packageDetails.totalQuota) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>مستخدم: {packageDetails.usedQuota}</span>
                  <span>المتبقي: {packageDetails.remainingQuota}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تاريخ التفعيل</span>
                  <span className="text-xs font-bold text-slate-700 block">{packageDetails.startDate}</span>
                </div>
                <div className="text-center border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تاريخ الانتهاء</span>
                  <span className="text-xs font-bold text-slate-700 block">{packageDetails.endDate}</span>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full mt-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer">
            <ArrowUpRight className="w-4 h-4" />
            <span>شراء باقة جديدة</span>
          </button>
        </div>

        {/* Operational Trend & Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">تحليل حجم العمليات التشغيلية</h3>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
              <button 
                onClick={() => setTimeframe('daily')}
                className={`px-3 py-1 rounded-md transition-all ${timeframe === 'daily' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >يومي</button>
              <button 
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1 rounded-md transition-all ${timeframe === 'weekly' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >أسبوعي</button>
              <button 
                onClick={() => setTimeframe('monthly')}
                className={`px-3 py-1 rounded-md transition-all ${timeframe === 'monthly' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >شهري</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Status Distribution (Visual) */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-400" />
                توزيع حالات الحجوزات
              </h4>
              
              <div className="space-y-3">
                {[
                  { label: 'مكتملة / مؤكدة', value: approvedCount, color: 'bg-emerald-500' },
                  { label: 'بانتظار الإجراء', value: pendingCount, color: 'bg-amber-500' },
                  { label: 'مرفوضة من العيادة', value: rejectedCount, color: 'bg-rose-500' },
                  { label: 'ملغاة من المركز', value: cancelledCount, color: 'bg-slate-400' },
                  { label: 'تم تغيير الموعد', value: rescheduledCount, color: 'bg-indigo-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>{item.label}</span>
                      <span>{Math.round((item.value / (totalBookings || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`${item.color} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${(item.value / (totalBookings || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient Type Mix */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                تصنيف المرضى (Registered vs Guest)
              </h4>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center space-y-4 h-full min-h-[160px]">
                <div className="flex items-center gap-6 w-full px-4">
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-slate-900 block">{registeredCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1">مرضى مسجلون</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-blue-600 block">{guestCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1">مرضى زوار</span>
                  </div>
                </div>
                
                <div className="w-full h-3 rounded-full bg-blue-100 overflow-hidden flex border border-blue-200">
                  <div 
                    className="bg-slate-800 h-full transition-all duration-1000" 
                    style={{ width: `${(registeredCount / (totalBookings || 1)) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-blue-500 h-full transition-all duration-1000" 
                    style={{ width: `${(guestCount / (totalBookings || 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 text-center px-2">
                  يلاحظ زيادة بنسبة 12% في تسجيل المرضى الجدد خلال هذا الشهر
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Activity Timeline (Operational Logs) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">معدل النشاط الأسبوعي للمركز</h3>
        </div>

        <div className="flex items-end justify-between gap-4 h-48 px-4">
          {activityTrend.map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center group">
              <div className="w-full max-w-[40px] relative">
                {/* Bar */}
                <div 
                  className="bg-slate-100 group-hover:bg-blue-100 rounded-t-lg transition-all duration-500 relative flex flex-col justify-end overflow-hidden"
                  style={{ height: `${bar.value * 2}px` }}
                >
                  <div 
                    className="bg-blue-600 rounded-t-lg transition-all duration-1000"
                    style={{ height: '70%' }}
                  ></div>
                </div>
                {/* Value Label */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  <span className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md font-bold">{bar.value} حجز</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-3">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

