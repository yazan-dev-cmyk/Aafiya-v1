import React, { useState } from 'react';
import { BookingRecord, BookingStatus } from '../../../types';
import {
  Clock,
  CheckCircle2,
  Calendar,
  XCircle,
  AlertCircle,
  Check,
  Send,
  Eye,
  RefreshCw,
  MessageSquare
} from 'lucide-react';

interface BookingStatusTrackerTabProps {
  bookings: BookingRecord[];
  onSelectBooking: (booking: BookingRecord) => void;
  onUpdateStatus: (bookingId: string, status: BookingStatus, extra?: any) => void;
}

export const BookingStatusTrackerTab: React.FC<BookingStatusTrackerTabProps> = ({
  bookings,
  onSelectBooking,
  onUpdateStatus,
}) => {
  const [activeStatus, setActiveStatus] = useState<BookingStatus | 'all'>('pending');

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const approvedCount = bookings.filter((b) => b.status === 'approved').length;
  const rescheduledCount = bookings.filter((b) => b.status === 'rescheduled').length;
  const rejectedCount = bookings.filter((b) => b.status === 'rejected').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const filteredBookings = bookings.filter((b) => {
    if (activeStatus === 'all') return true;
    return b.status === activeStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">متابعة ومراقبة حالات الحجز (Booking Status Tracker)</h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة ولحظية للحجوزات موزعة على الحالات الست المعتمدة في النظام
          </p>
        </div>
      </div>

      {/* 6 Core Status Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: Pending */}
        <div
          onClick={() => setActiveStatus('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'pending'
              ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">بانتظار الاعتماد</span>
          <span className="text-2xl font-bold text-amber-600 block mt-1">{pendingCount}</span>
        </div>

        {/* Card 2: Approved */}
        <div
          onClick={() => setActiveStatus('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'approved'
              ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">مؤكد ومقر</span>
          <span className="text-2xl font-bold text-emerald-600 block mt-1">{approvedCount}</span>
        </div>

        {/* Card 3: Rescheduled */}
        <div
          onClick={() => setActiveStatus('rescheduled')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'rescheduled'
              ? 'border-indigo-500 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">معدّل الموعد</span>
          <span className="text-2xl font-bold text-indigo-600 block mt-1">{rescheduledCount}</span>
        </div>

        {/* Card 4: Rejected */}
        <div
          onClick={() => setActiveStatus('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'rejected'
              ? 'border-rose-500 bg-rose-50/80 shadow-xs ring-2 ring-rose-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-2">
            <XCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">مرفوض من الطبيب</span>
          <span className="text-2xl font-bold text-rose-600 block mt-1">{rejectedCount}</span>
        </div>

        {/* Card 5: Cancelled */}
        <div
          onClick={() => setActiveStatus('cancelled')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'cancelled'
              ? 'border-slate-400 bg-slate-100 shadow-xs ring-2 ring-slate-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">ملغى</span>
          <span className="text-2xl font-bold text-slate-700 block mt-1">{cancelledCount}</span>
        </div>

        {/* Card 6: Completed */}
        <div
          onClick={() => setActiveStatus('completed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${
            activeStatus === 'completed'
              ? 'border-cyan-500 bg-cyan-50/80 shadow-xs ring-2 ring-cyan-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto mb-2">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 block">مكتمل</span>
          <span className="text-2xl font-bold text-cyan-600 block mt-1">{completedCount}</span>
        </div>

      </div>

      {/* Filtered Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            قائمة الحجوزات بالحالة: <span className="text-blue-600 uppercase">{activeStatus}</span>
          </h3>
          <button
            onClick={() => setActiveStatus('all')}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            عرض الكل
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            لا توجد حجوزات تندرج تحت هذه الحالة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">رقم المرجع</th>
                  <th className="px-5 py-3.5">المريض</th>
                  <th className="px-5 py-3.5">الطبيب والعيادة</th>
                  <th className="px-5 py-3.5">التاريخ والوقت</th>
                  <th className="px-5 py-3.5">الملاحظات / سبب الرفض</th>
                  <th className="px-5 py-3.5 text-center">الإجراءات المتاحة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600">
                      {b.refNumber}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {b.patientName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {b.doctorName} ({b.specialty})
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 dir-ltr text-right">
                      {b.date} • {b.timeSlot}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 max-w-xs">
                      {b.status === 'rejected' && (
                        <span className="text-rose-600 font-medium">سبب الرفض: {b.rejectionReason || 'ظروف العيادة'} (تم إعادة الرصيد 0-deduct)</span>
                      )}
                      {b.status === 'rescheduled' && (
                        <span className="text-indigo-600 font-medium">الوقت الجديد: {b.rescheduledTime}</span>
                      )}
                      {b.notes && b.status !== 'rejected' && b.status !== 'rescheduled' && (
                        <span>{b.notes}</span>
                      )}
                      {!b.notes && b.status === 'pending' && (
                        <span className="text-amber-600">في انتظار موافقة العيادة</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {b.status === 'pending' && (
                          <button
                            onClick={() => alert(`تم إرسال تذكير عاجل إلى الطبيب ${b.doctorName} لاعتماد الحجز ${b.refNumber}`)}
                            className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>تذكير العيادة</span>
                          </button>
                        )}

                        {b.status === 'rescheduled' && (
                          <button
                            onClick={() => onUpdateStatus(b.id, 'approved')}
                            className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>تأكيد مع المريض</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium"
                        >
                          التفاصيل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
