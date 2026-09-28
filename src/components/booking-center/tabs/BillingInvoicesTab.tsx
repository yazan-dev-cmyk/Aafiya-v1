'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Printer,
  Receipt,
  RefreshCw,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { bookingCenterService, PackagePurchaseRequestItem, BookingCenterFinancialSummary } from '@/services/bookingCenterService';

interface BillingInvoicesTabProps {
  invoices?: any[];
}

export const BillingInvoicesTab: React.FC<BillingInvoicesTabProps> = () => {
  const [summary, setSummary] = useState<BookingCenterFinancialSummary | null>(null);
  const [billingRecords, setBillingRecords] = useState<PackagePurchaseRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PackagePurchaseRequestItem | null>(null);
  const [isAmountMasked, setIsAmountMasked] = useState<boolean>(false);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Financial Summary
      const summaryRes = await bookingCenterService.getFinancialSummary();
      if (summaryRes.data) {
        setSummary(summaryRes.data);
      }

      // 2. Fetch Approved Billing Records
      const recordsRes = await bookingCenterService.getBillingRecords();
      if (recordsRes.data && Array.isArray(recordsRes.data)) {
        setBillingRecords(recordsRes.data);
      }
    } catch (err) {
      console.warn('Failed to fetch billing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const totalAmount = summary?.total_amount_spent_dzd ?? billingRecords.reduce((acc, r) => acc + Number(r.price_dzd), 0);
  const totalOperations = summary?.total_quota_purchased ?? billingRecords.reduce((acc, r) => acc + Number(r.quota_units), 0);
  const recordsCount = summary?.approved_purchases_count ?? billingRecords.length;

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>سجل الفواتير وسندات الدفع (Billing & Invoices)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            توثيق كافة معاملات شراء الباقات المعتمدة، استخراج وصولات الاستلام، وتتبع إجمالي المبالغ المنفقة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAmountMasked(!isAmountMasked)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isAmountMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isAmountMasked ? 'إظهار المبالغ' : 'إخفاء المبالغ'}</span>
          </button>
          <button
            onClick={fetchBillingData}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث الحساب</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 block">إجمالي المبالغ المسددة</span>
            <button
              onClick={() => setIsAmountMasked(!isAmountMasked)}
              title="إخفاء / إظهار المبالغ عن المتلصصين"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isAmountMasked ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono tracking-tight block">
            {isAmountMasked ? '•••••••• دج' : `${totalAmount.toLocaleString()} دج`}
          </span>
          <span className="text-xs text-emerald-600 font-medium block">
            +{totalOperations.toLocaleString()} عملية حجز مشحونة إجمالاً
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">طرق الدفع المعتمدة</span>
          <span className="text-sm font-bold text-slate-900 block mt-1">
            تحويل بنكي رسمي & BaridiMob
          </span>
          <span className="text-[11px] text-slate-400 block">
            مطابقة وتدقيق إداري فوري مع دفتر الأستاذ
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">حالة الحساب المالي</span>
          <span className="text-sm font-bold text-emerald-700 block mt-1">
            {recordsCount > 0 ? 'حساب مالي نشط ومحدث 🟢' : 'لا توجد فواتير معتمدة بعد'}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {recordsCount} سندات استلام مسددة وموثقة
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-sm">سجل سندات الشراء والفواتير المعتمدة</span>
          <span className="text-xs text-slate-400 font-mono">{billingRecords.length} سجلات</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-700">جاري تحميل سجل الفواتير المعتمدة...</p>
          </div>
        ) : billingRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">لا توجد فواتير أو مدفوعات معتمدة حالياً</h3>
            <p className="text-xs text-slate-400 mt-1">
              عند اعتماد طلب شراء باقة من إدارة المنصة ستظهر سندات الدفع والفواتير هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">رقم السند/المرجع</th>
                  <th className="px-5 py-3.5">تاريخ الاعتماد</th>
                  <th className="px-5 py-3.5">اسم الباقة وكودها</th>
                  <th className="px-5 py-3.5">العمليات المشحونة</th>
                  <th className="px-5 py-3.5">المبلغ المسدد</th>
                  <th className="px-5 py-3.5">طريقة الدفع</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">السند الإلكتروني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-700">
                      {record.request_reference}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                      {record.reviewed_at ? record.reviewed_at.substring(0, 16).replace('T', ' ') : record.created_at.substring(0, 10)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 block">{record.package_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{record.package_code}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700">
                      +{record.quota_units} عملية
                    </td>
                    <td className="px-5 py-3.5 font-black text-slate-900 font-mono text-sm">
                      {isAmountMasked ? '•••••• دج' : `${Number(record.price_dzd).toLocaleString()} دج`}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                        {record.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'BaridiMob'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        معتمد ومسدد 🟢
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedReceipt(record)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معاينة السند</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 text-start shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  سند استلام باقة حجز رسمية ({selectedReceipt.request_reference})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                &times;
              </button>
            </div>

            {/* Printable Content */}
            <div className="space-y-4 text-xs text-slate-800 border border-slate-200 p-5 rounded-2xl bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="font-black text-blue-900 text-sm block">منصة عافية الجزائر</span>
                  <span className="text-[10px] text-slate-500">نظام إدارة ومتابعة الحجوزات الطبية</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-slate-400 block">رقم المرجع:</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedReceipt.request_reference}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">الباقة المشتراة:</span>
                  <strong className="text-slate-900 text-sm block">{selectedReceipt.package_name}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedReceipt.package_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">العمليات المشحونة:</span>
                  <strong className="text-emerald-700 text-sm block">+{selectedReceipt.quota_units} عملية حجز</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">المبلغ الإجمالي المسدد:</span>
                  <strong className="text-slate-900 text-sm font-mono block">
                    {Number(selectedReceipt.price_dzd).toLocaleString()} دج
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">وسيلة الدفع:</span>
                  <strong className="text-slate-900 block">
                    {selectedReceipt.payment_method === 'bank_transfer' ? 'تحويل بنكي رسمي' : 'BaridiMob'}
                  </strong>
                </div>
              </div>

              <div className="space-y-1 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-emerald-950">
                <span className="font-bold text-xs block">بيانات الاعتماد المالي:</span>
                <p className="text-[11px]">تاريخ الاعتماد: <strong className="font-mono">{selectedReceipt.reviewed_at ? selectedReceipt.reviewed_at.substring(0, 16).replace('T', ' ') : '--'}</strong></p>
                {selectedReceipt.transaction_reference && (
                  <p className="text-[11px]">رقم الحوالة: <strong className="font-mono">{selectedReceipt.transaction_reference}</strong></p>
                )}
                {selectedReceipt.booking_transaction_id && (
                  <p className="text-[10px] font-mono text-emerald-800">معرف القيد المالي: {selectedReceipt.booking_transaction_id}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

