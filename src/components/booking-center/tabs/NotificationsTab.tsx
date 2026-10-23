import React, { useState, useEffect } from 'react';
import { SystemNotification } from '../../../types';
import {
  Bell,
  CheckCheck,
  ListFilter,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  Phone,
  Calendar,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { clinicNotificationService, ClinicEscalationItem } from '@/services/clinicNotificationService';

interface NotificationsTabProps {
  notifications: SystemNotification[];
  onMarkAllRead: () => void;
  onSelectBookingByRef?: (refNumber: string) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  onMarkAllRead,
  onSelectBookingByRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'urgent' | 'today' | 'yesterday' | 'older'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [escalations, setEscalations] = useState<ClinicEscalationItem[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEscalations = async () => {
      try {
        const data = await clinicNotificationService.getEscalations(undefined, 'pending');
        if (isMounted) {
          setEscalations(data);
        }
      } catch (err) {
        console.warn('Failed to load clinic escalations in booking center:', err);
      }
    };

    fetchEscalations();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAcknowledgeEscalation = async (id: string, clinicId?: string) => {
    setAcknowledgingId(id);
    try {
      await clinicNotificationService.acknowledgeEscalation(id, clinicId);
      setEscalations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge escalation:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const matchesSource = sourceFilter === 'all' || n.source === sourceFilter;
    return matchesCategory && matchesSource;
  });

  const urgentCount = notifications.filter((n) => n.category === 'urgent').length + escalations.length;
  const todayCount = notifications.filter((n) => n.category === 'today').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">مركز الإشعارات والتنبيهات (Notifications Center)</h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة إشعارات اعتماد الأطباء، تعديلات المواعيد، وتنبيهات استهلاك الباقة مجمعة ومصنفة زمنياً
          </p>
        </div>

        <button
          onClick={onMarkAllRead}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-blue-600" />
          <span>تحديد الكل كمقروء</span>
        </button>
      </div>

      {/* Category Tabs & Source Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'urgent', label: 'عاجل ومهم', badge: urgentCount, isUrgent: true },
            { id: 'today', label: 'اليوم', badge: todayCount },
            { id: 'yesterday', label: 'أمس' },
            { id: 'older', label: 'أقدم' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span>{cat.label}</span>
              {Boolean(cat.badge) && cat.badge! > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    cat.isUrgent
                      ? activeCategory === cat.id ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
                      : activeCategory === cat.id ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-slate-400" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">كل المصادر (All Sources)</option>
            <option value="doctor">الأطباء (Doctors)</option>
            <option value="patient">المرضى (Patients)</option>
            <option value="billing">المالية والباقات (Billing)</option>
            <option value="system">النظام والمنصة (System)</option>
          </select>
        </div>
      </div>

      {/* Escalations Queue (Visible on All or Urgent) */}
      {(activeCategory === 'all' || activeCategory === 'urgent') && escalations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-700 text-sm font-bold">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>طابور التصعيدات العاجلة للعيادات (مرور 24 ساعة دون استجابة المريض)</span>
          </div>

          <div className="space-y-3">
            {escalations.map((esc) => (
              <div
                key={esc.id}
                className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-xs font-bold">
                      تصعيد هاتفي عاجل
                    </span>
                    <strong className="text-slate-900 text-sm">{esc.patient_name}</strong>
                    <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{esc.patient_phone}</span>
                    </span>
                    <span className="text-xs text-slate-500">| عيادة: {esc.clinic_name} | الطبيب: {esc.doctor_name}</span>
                  </div>

                  <p className="text-xs text-rose-900 font-medium leading-relaxed">
                    {esc.instruction}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                    {esc.original_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>الموعد الأصلي: {esc.original_date} ({esc.original_time_slot})</span>
                      </span>
                    )}
                    {esc.new_date && (
                      <span className="flex items-center gap-1 font-bold text-teal-700">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span>الموعد البديل: {esc.new_date} ({esc.new_slot})</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  disabled={acknowledgingId === esc.id}
                  onClick={() => handleAcknowledgeEscalation(esc.id, esc.clinic_id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {acknowledgingId === esc.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإقرار...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم التواصل وإغلاق التصعيد</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {filteredNotifications.length === 0 && escalations.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            لا توجد إشعارات حالية تنطبق على الفلتر المختار
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                !n.read ? 'bg-blue-50/40 font-medium' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                    n.category === 'urgent'
                      ? 'bg-rose-100 text-rose-600'
                      : n.source === 'doctor'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">({n.source})</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  {n.bookingRef && (
                    <button
                      onClick={() => onSelectBookingByRef && onSelectBookingByRef(n.bookingRef!)}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض الحجز المرجعي ({n.bookingRef})</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <span className="text-xs text-slate-400 whitespace-nowrap">{n.timestamp}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
