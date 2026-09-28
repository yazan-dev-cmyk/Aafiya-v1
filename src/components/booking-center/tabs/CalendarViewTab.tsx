import React, { useState } from 'react';
import { BookingRecord } from '../../../types';
import { CalendarGridHeader } from '@/components/shared/CalendarGridHeader';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Clock,
  ListFilter,
  Plus
} from 'lucide-react';

interface CalendarViewTabProps {
  bookings: BookingRecord[];
  onSelectBooking: (booking: BookingRecord) => void;
  onOpenNewBooking: () => void;
}

export const CalendarViewTab: React.FC<CalendarViewTabProps> = ({
  bookings,
  onSelectBooking,
  onOpenNewBooking,
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);

  const filteredBookings = bookings.filter((b) => {
    if (selectedDoctorFilter === 'all') return true;
    return b.doctorId === selectedDoctorFilter;
  });

  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const today = new Date();
  const weekDays = Array.from({ length: 5 }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (idx - today.getDay()));
    const dateStr = d.toISOString().split('T')[0];
    const isCurrent = dateStr === today.toISOString().split('T')[0];
    return {
      name: isCurrent ? `${dayNames[d.getDay()]} (اليوم)` : dayNames[d.getDay()],
      date: dateStr
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">التقويم التفاعلي للمواعيد (Interactive Calendar)</h2>
          <p className="text-xs text-slate-500 mt-1">
            عرض بصري موحد للمواعيد على مدار الأيام والأسابيع مع إمكانية الحجز المباشر بالضغط على الخانة
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Modes */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض يومي
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض أسبوعي
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض شهري
            </button>
          </div>

          <button
            onClick={onOpenNewBooking}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>حجز جديد</span>
          </button>
        </div>
      </div>

      {/* Shared Calendar Grid Header */}
      <CalendarGridHeader
        year={currentYear}
        month={currentMonth}
        onMonthChange={(y, m) => {
          setCurrentYear(y);
          setCurrentMonth(m);
        }}
      />

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        
        {/* Color Legend */}
        <div className="flex items-center gap-4 text-xs font-medium pb-3 border-b border-slate-100 flex-wrap">
          <span className="text-slate-500">دليل الألوان:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> مؤكد (Approved)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> بانتظار الاعتماد (Pending)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> معدّل (Rescheduled)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> ملغى / مرفوض
          </span>
        </div>

        {/* Weekly View Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3 w-20 border-l border-slate-200 text-center">التوقيت</th>
                {weekDays.map((day) => (
                  <th key={day.date} className="p-3 text-center border-l border-slate-200">
                    <div>{day.name}</div>
                    <div className="text-[10px] font-normal text-slate-500">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour} className="border-b border-slate-100">
                  <td className="p-2 font-mono text-center font-bold text-slate-500 border-l border-slate-200 bg-slate-50/50 dir-ltr text-right">
                    {hour}
                  </td>

                  {weekDays.map((day) => {
                    // find booking matching date and hour prefix
                    const matchedBookings = filteredBookings.filter(
                      (b) => b.date === day.date && b.timeSlot.startsWith(hour.substring(0, 2))
                    );

                    return (
                      <td
                        key={day.date}
                        onClick={() => {
                          if (matchedBookings.length === 0) {
                            onOpenNewBooking();
                          }
                        }}
                        className="p-1.5 border-l border-slate-200 align-top min-h-[60px] hover:bg-slate-50/60 transition-colors cursor-pointer"
                      >
                        {matchedBookings.length > 0 ? (
                          <div className="space-y-1">
                            {matchedBookings.map((b) => (
                              <div
                                key={b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectBooking(b);
                                }}
                                className={`p-2 rounded-xl text-right transition-all hover:scale-102 cursor-pointer shadow-xs border ${
                                  b.status === 'approved'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : b.status === 'pending'
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : b.status === 'rescheduled'
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                                    : 'bg-rose-50 border-rose-300 text-rose-900'
                                }`}
                              >
                                <div className="font-bold text-[11px] truncate">{b.patientName}</div>
                                <div className="text-[10px] opacity-80 truncate">{b.doctorName}</div>
                                <div className="text-[10px] font-mono font-bold mt-0.5 dir-ltr text-right">{b.timeSlot}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center opacity-0 hover:opacity-100 text-[10px] text-blue-600 font-semibold bg-blue-50/50 rounded-lg">
                            + حجز في هذا الوقت
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
