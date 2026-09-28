import React, { useState } from 'react';
import { BookingRecord, BookingStatus } from '../../../types';
import {
  Search,
  ListFilter,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Edit3,
  Trash2,
  Eye,
  ChevronDown
} from 'lucide-react';

import { useTranslations, useLocale } from 'next-intl';
import { HistoricalPeriodBar, HistoricalPeriodValue } from '@/components/shared/HistoricalPeriodBar';

interface BookingsListTabProps {
  bookings: BookingRecord[];
  onSelectBooking: (booking: BookingRecord) => void;
  onUpdateStatus: (bookingId: string, status: BookingStatus, extra?: { notes?: string; rejectionReason?: string; rescheduledTime?: string }) => void;
  onOpenNewBooking: () => void;
}

export const BookingsListTab: React.FC<BookingsListTabProps> = ({
  bookings,
  onSelectBooking,
  onUpdateStatus,
  onOpenNewBooking,
}) => {
  const t = useTranslations('bookingCenter.list');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [periodValue, setPeriodValue] = useState<HistoricalPeriodValue>({ period: 'today' });

  // Modals
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<BookingRecord | null>(null);
  const [newRescheduledSlot, setNewRescheduledSlot] = useState('16:00');

  const [cancelModalBooking, setCancelModalBooking] = useState<BookingRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('patientRequest');

  // ListFilter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.refNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patientName.includes(searchQuery) ||
      b.doctorName.includes(searchQuery) ||
      b.patientPhone.includes(searchQuery);

    const matchesStatus =
      selectedStatusFilter === 'all' || b.status === selectedStatusFilter;

    const todayStr = new Date().toISOString().split('T')[0];
    const matchesDate =
      selectedDateFilter === 'all' ||
      (selectedDateFilter === 'today' && b.date === todayStr);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleConfirmReschedule = () => {
    if (!rescheduleModalBooking) return;
    onUpdateStatus(rescheduleModalBooking.id, 'rescheduled', {
      rescheduledTime: newRescheduledSlot,
      notes: `${t('modals.confirmReschedule')}: ${newRescheduledSlot}`,
    });
    setRescheduleModalBooking(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    onUpdateStatus(cancelModalBooking.id, 'cancelled', {
      notes: `Reason: ${cancelReason}`,
    });
    setCancelModalBooking(null);
  };

  return (
    <div className="space-y-6 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="text-start">
          <h2 className="text-xl font-bold text-slate-900">{t('tableHeader')}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('tableSubtitle')}
          </p>
        </div>

        <button
          onClick={onOpenNewBooking}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
        >
          {t('newBookingBtn')}
        </button>
      </div>

      {/* Shared Historical Period Bar */}
      <HistoricalPeriodBar
        value={periodValue}
        onChange={setPeriodValue}
      />

      {/* Search & Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ps-9 pe-4"
          />
        </div>

        {/* Status ListFilter */}
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.allStatuses')}</option>
            <option value="approved">{t('status.approved')}</option>
            <option value="pending">{t('status.pending')}</option>
            <option value="rescheduled">{t('status.rescheduled')}</option>
            <option value="rejected">{t('status.rejected')}</option>
            <option value="cancelled">{t('status.cancelled')}</option>
            <option value="completed">{t('status.completed')}</option>
          </select>
        </div>

        {/* Date ListFilter */}
        <select
          value={selectedDateFilter}
          onChange={(e) => setSelectedDateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('filters.allDates')}</option>
          <option value="today">{t('filters.todayOnly')}</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-semibold text-sm">{t('noResults')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">{t('tableColumns.ref')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.patient')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.phone')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.doctor')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.specialty')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.dateTime')}</th>
                  <th className="px-5 py-3.5">{t('tableColumns.status')}</th>
                  <th className="px-5 py-3.5 text-center">{t('tableColumns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600">
                      {b.refNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {b.patientName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dir-ltr text-start">
                      {b.patientPhone}
                    </td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">
                      {b.doctorName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {b.specialty}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dir-ltr text-start">
                      {b.date} • {b.timeSlot}
                    </td>
                    <td className="px-5 py-3.5">
                      {b.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t('status.approved')}
                        </span>
                      )}
                      {b.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {t('status.pending')}
                        </span>
                      )}
                      {b.status === 'rescheduled' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {t('status.rescheduled')} ({b.rescheduledTime || b.timeSlot})
                        </span>
                      )}
                      {b.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {t('status.rejected')}
                        </span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {t('status.cancelled')}
                        </span>
                      )}
                      {b.status === 'completed' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          {t('status.completed')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectBooking(b)}
                          title={t('actions.view')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => alert('الخاصية معطلة حاليًا، قد يتم تفعيلها لاحقًا')}
                          title={t('actions.edit')}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setCancelModalBooking(b)}
                          title={t('actions.cancel')}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => alert(`${t('actions.print')} ${b.refNumber}...`)}
                          title={t('actions.print')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
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

      {/* Reschedule Modal */}
      {rescheduleModalBooking && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-start">
            <h3 className="font-bold text-slate-900 text-lg">{t('modals.rescheduleTitle')} ({rescheduleModalBooking.refNumber})</h3>
            <p className="text-xs text-slate-500">
              {t('modals.patient')}: {rescheduleModalBooking.patientName} | {t('modals.doctor')}: {rescheduleModalBooking.doctorName}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('modals.newTime')}</label>
              <select
                value={newRescheduledSlot}
                onChange={(e) => setNewRescheduledSlot(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="15:00">15:00</option>
                <option value="15:30">15:30</option>
                <option value="16:00">16:00</option>
                <option value="16:30">16:30</option>
                <option value="17:00">17:00</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRescheduleModalBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
              >
                {t('modals.back')}
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 cursor-pointer"
              >
                {t('modals.confirmReschedule')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-start">
            <h3 className="font-bold text-rose-600 text-lg">{t('modals.cancelTitle')} ({cancelModalBooking.refNumber})</h3>
            <p className="text-xs text-slate-500">
              {t('modals.cancelReasonPrompt', { name: cancelModalBooking.patientName })}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('modals.cancelReasonLabel')}</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="patientRequest">{t('modals.cancelReasonOptions.patientRequest')}</option>
                <option value="doctorEmergency">{t('modals.cancelReasonOptions.doctorEmergency')}</option>
                <option value="noShow">{t('modals.cancelReasonOptions.noShow')}</option>
                <option value="other">{t('modals.cancelReasonOptions.other')}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
              >
                {t('modals.back')}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 cursor-pointer"
              >
                {t('modals.cancelOfficially')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
