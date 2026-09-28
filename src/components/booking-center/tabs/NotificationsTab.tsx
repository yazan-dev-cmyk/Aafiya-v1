import React, { useState } from 'react';
import { SystemNotification } from '../../../types';
import {
  Bell,
  CheckCheck,
  ListFilter,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  ChevronLeft
} from 'lucide-react';

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

  const filteredNotifications = notifications.filter((n) => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const matchesSource = sourceFilter === 'all' || n.source === sourceFilter;
    return matchesCategory && matchesSource;
  });

  const urgentCount = notifications.filter((n) => n.category === 'urgent').length;
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
        {/* Category Tabs (Categorized Architecture) */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCategory === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الإشعارات ({notifications.length})
          </button>
          <button
            onClick={() => setActiveCategory('urgent')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'urgent' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>عاجل (Urgent - {urgentCount})</span>
          </button>
          <button
            onClick={() => setActiveCategory('today')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCategory === 'today' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اليوم (Today - {todayCount})
          </button>
          <button
            onClick={() => setActiveCategory('yesterday')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCategory === 'yesterday' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الأمس (Yesterday)
          </button>
          <button
            onClick={() => setActiveCategory('older')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCategory === 'older' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أقدَم (Older)
          </button>
        </div>

        {/* Source ListFilter */}
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-slate-400" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">كل المصادر</option>
            <option value="doctor">إشعارات الأطباء</option>
            <option value="system">إشعارات النظام والباقة</option>
            <option value="admin">إشعارات إدارة المنصة</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
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
