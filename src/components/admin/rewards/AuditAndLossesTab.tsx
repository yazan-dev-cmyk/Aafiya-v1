'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Lock,
  Unlock,
  Download,
  Ban,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Coins,
  Building2,
  UserCheck
} from 'lucide-react';
import {
  adminAssistantRewardsService,
  SecurityAuditLogItem,
  PlatformLossItem
} from '@/services/adminAssistantRewardsService';

export function AuditAndLossesTab() {
  const [activeSection, setActiveSection] = useState<'audit' | 'losses'>('audit');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // Operational Losses State
  const [losses, setLosses] = useState<PlatformLossItem[]>([]);
  const [lossesLoading, setLossesLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async (page: number, action?: string) => {
    try {
      setAuditLoading(true);
      setError(null);
      const res = await adminAssistantRewardsService.getAuditLogs({
        page,
        action: action || undefined,
      });
      if (res.status === 'success' && res.data) {
        setAuditLogs(res.data.data || []);
        setAuditPage(res.data.current_page || 1);
        setAuditTotalPages(res.data.last_page || 1);
        setAuditTotalCount(res.data.total || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل جلب سجلات التدقيق الأمني');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch Losses
  const fetchLosses = useCallback(async () => {
    try {
      setLossesLoading(true);
      setError(null);
      const res = await adminAssistantRewardsService.getLosses();
      if (res.status === 'success' && res.data) {
        setLosses(res.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل جلب بيانات الخسائر التشغيلية');
    } finally {
      setLossesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'audit') {
      fetchAuditLogs(auditPage, auditActionFilter);
    } else {
      fetchLosses();
    }
  }, [activeSection, auditPage, auditActionFilter, fetchAuditLogs, fetchLosses]);

  // Action badge renderer
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'view_full_rip':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <Unlock className="w-3 h-3 text-amber-700" />
            كشف كامل رقم الـ RIP (D-03)
          </span>
        );
      case 'download_cheque_document':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Download className="w-3 h-3 text-indigo-700" />
            تحميل صك مشطوب (D-01)
          </span>
        );
      case 'cancel_payout_batch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-200">
            <Ban className="w-3 h-3 text-rose-700" />
            إلغاء دفعة مستحقات (D-02)
          </span>
        );
      case 'approve_payout_profile':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-900 border border-teal-200">
            <CheckCircle2 className="w-3 h-3 text-teal-700" />
            اعتماد حساب بنكي
          </span>
        );
      case 'reject_payout_profile':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-700" />
            رفض حساب بنكي
          </span>
        );
      case 'generate_payout_batch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
            <Coins className="w-3 h-3 text-blue-700" />
            توليد دفعة شهرية
          </span>
        );
      case 'confirm_payout_item':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            تأكيد تحويل مستحقات
          </span>
        );
      case 'fail_payout_item':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-200">
            <AlertOctagon className="w-3 h-3 text-orange-700" />
            تسجيل فشل تحويل
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  // Filter audit logs by user search locally
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const term = auditSearch.toLowerCase();
    const actorMatch = log.user?.name?.toLowerCase().includes(term) || log.user?.email?.toLowerCase().includes(term);
    const actionMatch = log.action?.toLowerCase().includes(term);
    const ipMatch = log.ip_address?.includes(term);
    return actorMatch || actionMatch || ipMatch;
  });

  // Calculate cumulative loss totals
  const totalLossesAmount = losses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const departureDeficitLoss = losses
    .filter((l) => l.reason_code === 'departure_deficit_absorption' || l.category?.includes('deficit'))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const postDepartureCancellationLoss = losses
    .filter((l) => l.reason_code === 'post_departure_cancellation' || l.category?.includes('cancellation'))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-teal-600" />
            التدقيق الأمني والخسائر التشغيلية
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            سجل غير قابل للتعديل لكافة الإجراءات الحساسة والخسائر التي تتحملها المنصة بموجب قرارات REW-DEC
          </p>
        </div>

        {/* Section Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSection('audit')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSection === 'audit'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            سجل التدقيق الأمني (Security Audit)
          </button>
          <button
            onClick={() => setActiveSection('losses')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSection === 'losses'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4" />
            الخسائر التشغيلية (REW-DEC)
          </button>
        </div>
      </div>

      {/* SECTION 1: SECURITY AUDIT LOG */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="بحث بالمستخدم، البريد، أو عنوان الـ IP..."
                className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">جميع الإجراءات الأمنية</option>
                <option value="view_full_rip">كشف كامل رقم الـ RIP (D-03)</option>
                <option value="download_cheque_document">تحميل الصك المشطوب (D-01)</option>
                <option value="cancel_payout_batch">إلغاء دفعة المستحقات (D-02)</option>
                <option value="approve_payout_profile">اعتماد الحساب البنكي</option>
                <option value="reject_payout_profile">رفض الحساب البنكي</option>
                <option value="generate_payout_batch">توليد دفعة جديدة</option>
                <option value="confirm_payout_item">تأكيد تحويل مستحقات</option>
                <option value="fail_payout_item">تسجيل فشل تحويل</option>
              </select>

              <button
                onClick={() => fetchAuditLogs(auditPage, auditActionFilter)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {auditLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-sm">جاري جلب سجلات التدقيق الأمني المشفرة...</p>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-slate-300" />
                <p className="text-base font-medium text-slate-600">لا توجد سجلات تدقيق أمني</p>
                <p className="text-xs text-slate-400 mt-1">
                  كافة العمليات الحساسة (كشف RIP، تحميل صكوك، إلغاء دفعات) تسجل تلقائياً هنا.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">التاريخ والوقت</th>
                      <th className="py-3.5 px-4">الإجراء المنفذ</th>
                      <th className="py-3.5 px-4">المسؤول (Actor)</th>
                      <th className="py-3.5 px-4">المورد المستهدف</th>
                      <th className="py-3.5 px-4">التفاصيل / السبب</th>
                      <th className="py-3.5 px-4">عنوان IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('ar-DZ') : '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderActionBadge(log.action)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            {log.user?.name || `مستخدم #${log.user_id}`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.user?.email || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">
                          {log.auditable_type ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                          {log.details ? (
                            <span className="truncate block" title={JSON.stringify(log.details)}>
                              {typeof log.details === 'string'
                                ? log.details
                                : log.details.reason || JSON.stringify(log.details)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {auditTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div>
                  إجمالي السجلات الأمنية: <span className="font-semibold text-slate-800">{auditTotalCount}</span> (الصفحة {auditPage} من {auditTotalPages})
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage <= 1 || auditLoading}
                    className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    disabled={auditPage >= auditTotalPages || auditLoading}
                    className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: OPERATIONAL LOSSES (REW-DEC) */}
      {activeSection === 'losses' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">إجمالي الخسائر التشغيلية للمنصة</div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {totalLossesAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">دج</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                تتحملها المنصة بالكامل كخسارة تشغيلية بموجب القاعدة REW-DEC
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">استيعاب عجز المغادرة (Departure Deficit)</div>
              <div className="text-xl font-bold text-slate-800 mt-2">
                {departureDeficitLoss.toLocaleString()} <span className="text-xs font-normal text-slate-500">دج</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                تصفير الرصيد السالب دون مطالبة المساعد المغادر
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">إلغاءات ما بعد المغادرة (Post-Departure)</div>
              <div className="text-xl font-bold text-slate-800 mt-2">
                {postDepartureCancellationLoss.toLocaleString()} <span className="text-xs font-normal text-slate-500">دج</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                إلغاء حجوزات بعد مغادرة المساعد للعيادة
              </div>
            </div>
          </div>

          {/* Losses Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  تفاصيل وقائع الخسائر التشغيلية ({losses.length})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  سجل تفصيلي لكافة حالات الخسارة المحاسبية الناتجة عن مغادرة المساعدين وإلغاءات الحجوزات
                </p>
              </div>
              <button
                onClick={fetchLosses}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${lossesLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>

            {lossesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-sm">جاري جلب تفاصيل الخسائر التشغيلية...</p>
              </div>
            ) : losses.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-emerald-400" />
                <p className="text-base font-medium text-slate-600">لا توجد أي خسائر تشغيلية مسجلة</p>
                <p className="text-xs text-slate-400 mt-1">
                  لم يسجل النظام أي عجز ناتج عن مغادرة المساعدين أو إلغاءات بعد المغادرة.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">التاريخ</th>
                      <th className="py-3.5 px-4">المساعد الطبيب</th>
                      <th className="py-3.5 px-4">العيادة المعنية</th>
                      <th className="py-3.5 px-4">تصنيف الخسارة</th>
                      <th className="py-3.5 px-4">المبلغ المستوعب</th>
                      <th className="py-3.5 px-4">البيان والسبب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {losses.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-DZ') : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {item.assistant?.name || `مساعد #${item.assistant_id}`}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.assistant?.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.clinic?.name || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {item.category || item.reason_code || 'خسارة تشغيلية'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-rose-600">
                            {Number(item.amount).toLocaleString()}
                          </span>{' '}
                          <span className="text-xs text-slate-500 font-normal">دج</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md">
                          {item.description || item.reason || 'تم استيعاب العجز بالكامل من قِبل المنصة'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
