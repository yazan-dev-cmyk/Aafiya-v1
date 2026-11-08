'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Building2,
  Calendar,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  adminAssistantRewardsService,
  AssistantDirectoryItem,
  AssistantLedgerItem
} from '@/services/adminAssistantRewardsService';

interface AssistantDetailDrawerProps {
  assistant: AssistantDirectoryItem;
  onClose: () => void;
}

export function AssistantDetailDrawer({ assistant, onClose }: AssistantDetailDrawerProps) {
  const [ledger, setLedger] = useState<AssistantLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const fetchLedger = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await adminAssistantRewardsService.getAssistantLedger(assistant.id, { page: pageNum, per_page: 15 });
      setLedger(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err: any) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  }, [assistant.id]);

  useEffect(() => {
    fetchLedger(page);
  }, [page, fetchLedger]);

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'reward_earned':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold">مكافأة تأكيد موعد</span>;
      case 'cancellation_deduction':
        return <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md text-[11px] font-bold">خصم إلغاء موعد</span>;
      case 'payout_settlement':
        return <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md text-[11px] font-bold">صرف مستحقات بنكية</span>;
      case 'departure_deficit_relief':
        return <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md text-[11px] font-bold">إعفاء عجز مغادرة (المنصة)</span>;
      case 'reversal':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">تسوية تصحيحية عكسية</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-bold">{type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
              {assistant.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{assistant.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{assistant.phone || assistant.email || assistant.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity & Clinic Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block font-medium">العيادة الحالية / الأخيرة</span>
              <p className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                {assistant.clinic?.name || 'غير معين بعيادة'}
              </p>
              {assistant.clinic?.wilaya && (
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">الولاية: {assistant.clinic.wilaya}</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block font-medium">حالة العضوية التشغيلية</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  assistant.is_active_member ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {assistant.is_active_member ? 'عضوية نشطة حالياً' : 'مغادر للعيادة (سابقة)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {assistant.is_active_member ? 'مؤهل للمكافآت عن التأكيدات الجديدة' : 'تنطبق عليه قواعد امتصاص العجز عند المغادرة'}
              </span>
            </div>
          </div>

          {/* Financial Balances Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-[11px] text-teal-700 font-bold block">الرصيد اللحظي</span>
              <p className="text-lg font-bold text-teal-900 mt-1 font-mono">
                {assistant.balance.current_balance.toLocaleString('ar-DZ')} د.ج
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-700 font-bold block">إجمالي المكتسب</span>
              <p className="text-lg font-bold text-emerald-900 mt-1 font-mono">
                {assistant.balance.total_earned.toLocaleString('ar-DZ')} د.ج
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-600 font-bold block">المبالغ المسددة</span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {assistant.balance.total_paid.toLocaleString('ar-DZ')} د.ج
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[11px] text-rose-700 font-bold block">الاستقطاعات</span>
              <p className="text-lg font-bold text-rose-900 mt-1 font-mono">
                {assistant.balance.total_deducted.toLocaleString('ar-DZ')} د.ج
              </p>
            </div>
          </div>

          {/* RIP Payout Profile Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-medium block">الحساب البريدي المعتمد (RIP / CCP)</span>
              <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                {assistant.payout_profile?.rip_masked || 'لم يقدم حساباً بريدياً بعد'}
              </p>
              {assistant.payout_profile && (
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">الإصدار: v{assistant.payout_profile.version}</span>
              )}
            </div>
            <div>
              {assistant.payout_profile ? (
                <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  assistant.payout_profile.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : assistant.payout_profile.status === 'pending_verification'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {assistant.payout_profile.status === 'active' ? 'معتمد ونشط' : assistant.payout_profile.status === 'pending_verification' ? 'قيد المراجعة' : 'مرفوض'}
                </span>
              ) : (
                <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold text-[11px]">غير مسجل</span>
              )}
            </div>
          </div>

          {/* Ledger Transactions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                دفتر الأستاذ المحاسبي المفصل (Audit Ledger)
              </h4>
              <span className="text-[11px] text-slate-400">سجل غير قابل للتعديل</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                جاري جلب قيود دفتر الأستاذ...
              </div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                لا توجد معاملات مسجلة في دفتر الأستاذ لهذا المساعد بعد.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 px-3 font-bold">التاريخ والوقت</th>
                      <th className="py-2.5 px-3 font-bold">نوع القيد</th>
                      <th className="py-2.5 px-3 font-bold">المبلغ</th>
                      <th className="py-2.5 px-3 font-bold">الرصيد بعد القيد</th>
                      <th className="py-2.5 px-3 font-bold">المرجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {tx.created_at ? tx.created_at.replace('T', ' ').substring(0, 19) : '--'}
                        </td>
                        <td className="py-2.5 px-3">
                          {getTransactionTypeBadge(tx.transaction_type)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={tx.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}>
                            {tx.direction === 'credit' ? '+' : '-'}{tx.amount.toLocaleString('ar-DZ')} د.ج
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {tx.balance_after.toLocaleString('ar-DZ')} د.ج
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {tx.reference_type ? `${tx.reference_type}` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1 bg-slate-100 rounded-md font-bold disabled:opacity-40 cursor-pointer"
                >
                  السابق
                </button>
                <span className="font-mono text-slate-500">
                  صفحة {meta.current_page} من {meta.last_page} ({meta.total} قيد)
                </span>
                <button
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                  className="px-3 py-1 bg-slate-100 rounded-md font-bold disabled:opacity-40 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
