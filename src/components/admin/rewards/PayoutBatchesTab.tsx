'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Coins,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  ArrowRight,
  Send,
  Ban,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
  Search,
  Check,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';
import {
  adminAssistantRewardsService,
  AdminPayoutBatch,
  AdminPayoutBatchItem,
  BatchPreviewData
} from '@/services/adminAssistantRewardsService';

export function PayoutBatchesTab() {
  const [batches, setBatches] = useState<AdminPayoutBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<AdminPayoutBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Transfer references state per item: itemId -> string
  const [transferRefs, setTransferRefs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Batch Wizard Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1, 1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setDate(0); // Last day of previous month
    return d.toISOString().split('T')[0];
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<BatchPreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Cancel Batch Modal state (D-02)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fail Item Modal state
  const [failingItem, setFailingItem] = useState<AdminPayoutBatchItem | null>(null);
  const [failReason, setFailReason] = useState('');
  const [failError, setFailError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAssistantRewardsService.getBatches();
      if (res.status === 'success' && res.data) {
        setBatches(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل جلب دفعات المستحقات');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBatchDetails = useCallback(async (batchId: string) => {
    try {
      setLoading(true);
      const res = await adminAssistantRewardsService.getBatch(batchId);
      if (res.status === 'success' && res.data) {
        setSelectedBatch(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل جلب تفاصيل الدفعة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Preview Batch Handler
  const handlePreview = async () => {
    if (!periodStart || !periodEnd) {
      setPreviewError('يرجى تحديد تاريخ البداية والنهاية للفترة');
      return;
    }
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await adminAssistantRewardsService.previewMonthlyBatch(periodStart, periodEnd);
      if (res.status === 'success' && res.data) {
        setPreviewData(res.data);
      }
    } catch (err: any) {
      setPreviewError(err?.response?.data?.message || 'فشل معاينة الدفعة');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Generate Batch Handler
  const handleGenerateBatch = async () => {
    if (!previewData || previewData.eligible_assistants_count === 0) {
      alert('لا يوجد أي مساعد مؤهل للدفع في هذه الفترة');
      return;
    }
    if (!confirm(`هل أنت متأكد من إنشاء دفعة تحويل شهرية بإجمالي ${previewData.total_estimated_payout.toLocaleString()} دج لـ ${previewData.eligible_assistants_count} مساعد؟`)) {
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await adminAssistantRewardsService.generateMonthlyBatch({
        period_start: periodStart,
        period_end: periodEnd,
      });
      if (res.status === 'success' && res.data) {
        setSuccessMessage('تم إنشاء دفعة التحويل وتجميد المستحقات بنجاح.');
        setTimeout(() => setSuccessMessage(null), 5000);
        setShowCreateModal(false);
        setPreviewData(null);
        await loadBatches();
        loadBatchDetails(res.data.id);
      }
    } catch (err: any) {
      setPreviewError(err?.response?.data?.message || 'فشل إنشاء الدفعة');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm Single Item Transfer
  const handleConfirmItem = async (itemId: string) => {
    if (!selectedBatch) return;
    const ref = transferRefs[itemId];
    if (!ref || !ref.trim()) {
      alert('يرجى إدخال رقم مرجع الحوالة البنكية / البريدية (CCP Transfer Reference)');
      return;
    }

    try {
      setActionLoading(itemId);
      setError(null);
      await adminAssistantRewardsService.confirmBatchItem(selectedBatch.id, itemId, {
        transfer_reference: ref.trim(),
      });
      setSuccessMessage('تم تأكيد تحويل المستحقات وتسجيل رقم المرجع بنجاح.');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadBatchDetails(selectedBatch.id);
      loadBatches();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل تأكيد التحويل');
    } finally {
      setActionLoading(null);
    }
  };

  // Fail Single Item Transfer
  const handleFailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !failingItem) return;
    if (!failReason.trim()) {
      setFailError('يرجى تقديم سبب الفشل');
      return;
    }

    try {
      setActionLoading(failingItem.id);
      setFailError(null);
      await adminAssistantRewardsService.failBatchItem(selectedBatch.id, failingItem.id, {
        failure_reason: failReason.trim(),
      });
      setSuccessMessage('تم تسجيل فشل التحويل واسترجاع الرصيد للمساعد بنجاح.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setFailingItem(null);
      setFailReason('');
      loadBatchDetails(selectedBatch.id);
      loadBatches();
    } catch (err: any) {
      setFailError(err?.response?.data?.message || 'فشل تسجيل فشل التحويل');
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel Batch (D-02)
  const handleCancelBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setCancelError('يرجى ذكر سبب إلغاء الدفعة (5 أحرف على الأقل)');
      return;
    }

    try {
      setActionLoading(`cancel-batch-${selectedBatch.id}`);
      setCancelError(null);
      await adminAssistantRewardsService.cancelBatch(selectedBatch.id, {
        reason: cancelReason.trim(),
      });
      setSuccessMessage('تم إلغاء الدفعة بالكامل بنجاح وإعادة جميع البنود إلى الرصيد النشط للمساعدين.');
      setTimeout(() => setSuccessMessage(null), 5000);
      setShowCancelModal(false);
      setCancelReason('');
      loadBatchDetails(selectedBatch.id);
      loadBatches();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'فشل إلغاء الدفعة');
    } finally {
      setActionLoading(null);
    }
  };

  // Can batch be cancelled? (Only if status is pending and all items are pending)
  const canCancelSelectedBatch =
    selectedBatch &&
    selectedBatch.status === 'pending' &&
    selectedBatch.items &&
    selectedBatch.items.length > 0 &&
    selectedBatch.items.every((it) => it.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-6 h-6 text-teal-600" />
            دفعات المستحقات المالية الشهرية
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            إنشاء ومعاينة ومتابعة تحويلات المكافآت المالية المجمعة لمساعدي الأطباء
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowCreateModal(true);
              setPreviewData(null);
              setPreviewError(null);
            }}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إنشاء دفعة شهرية جديدة
          </button>
          <button
            onClick={() => {
              if (selectedBatch) loadBatchDetails(selectedBatch.id);
              else loadBatches();
            }}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Content: Split between Batches List and Batch Detail */}
      {selectedBatch ? (
        /* Batch Detail View */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      تفاصيل الدفعة: {selectedBatch.batch_reference || selectedBatch.id.substring(0, 8)}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        selectedBatch.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedBatch.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedBatch.status === 'completed'
                        ? 'مكتملة بالكامل'
                        : selectedBatch.status === 'cancelled'
                        ? 'ملغاة'
                        : 'قيد التنفيذ والتحويل'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    الفترة المحاسبية: من {selectedBatch.period_start} إلى {selectedBatch.period_end}
                  </p>
                </div>
              </div>

              {/* Actions on Batch */}
              <div className="flex items-center gap-2">
                {canCancelSelectedBatch && (
                  <button
                    onClick={() => {
                      setShowCancelModal(true);
                      setCancelReason('');
                      setCancelError(null);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    إلغاء الدفعة (D-02)
                  </button>
                )}
              </div>
            </div>

            {/* Batch KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">إجمالي المبلغ المحسوب</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {Number(selectedBatch.total_amount).toLocaleString()} دج
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">عدد المساعدين المستفيدين</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {selectedBatch.total_assistants_count || selectedBatch.items?.length || 0} مساعد
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">الحوالات المكتملة</div>
                <div className="text-base font-bold text-emerald-600 mt-1">
                  {selectedBatch.items?.filter((it) => it.status === 'paid').length || 0} من{' '}
                  {selectedBatch.items?.length || 0}
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">تاريخ الإنشاء</div>
                <div className="text-xs font-semibold text-slate-700 mt-1.5">
                  {new Date(selectedBatch.created_at).toLocaleDateString('ar-DZ')}
                </div>
              </div>
            </div>
          </div>

          {/* Batch Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                قائمة بنود التحويل الفردية ({selectedBatch.items?.length || 0})
              </h4>
              <div className="text-xs text-slate-500">
                يتوجب إدخال رقم مرجع الحوالة البنكية وتأكيدها لكل مساعد على حدة
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">المساعد الطبيب</th>
                    <th className="py-3.5 px-4">رقم الـ RIP</th>
                    <th className="py-3.5 px-4">المبلغ المستحق</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">مرجع التحويل</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBatch.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.assistant?.name || 'مساعد'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.assistant?.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
                          {item.rip_masked || item.rip}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {Number(item.amount).toLocaleString()}
                        </span>{' '}
                        <span className="text-xs text-slate-500 font-normal">دج</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            بانتظار التحويل
                          </span>
                        )}
                        {item.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            تم التحويل
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" />
                            فشل التحويل
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            ملغى
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === 'paid' ? (
                          <div className="font-mono text-xs text-emerald-700 font-medium">
                            {item.transfer_reference}
                            {item.paid_at && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(item.paid_at).toLocaleDateString('ar-DZ')}
                              </div>
                            )}
                          </div>
                        ) : item.status === 'pending' ? (
                          <input
                            type="text"
                            placeholder="رقم إيصال CCP..."
                            value={transferRefs[item.id] || ''}
                            onChange={(e) =>
                              setTransferRefs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-mono w-44"
                          />
                        ) : item.status === 'failed' ? (
                          <div className="text-xs text-rose-600 max-w-[200px]" title={item.failure_reason || ''}>
                            السبب: {item.failure_reason || 'غير محدد'}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleConfirmItem(item.id)}
                              disabled={actionLoading === item.id}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              تأكيد التحويل
                            </button>
                            <button
                              onClick={() => {
                                setFailingItem(item);
                                setFailReason('');
                                setFailError(null);
                              }}
                              disabled={actionLoading === item.id}
                              className="px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
                            >
                              فشل
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">مكتمل</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Batches List */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-sm">جاري جلب دفعات المستحقات...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Coins className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-slate-300" />
              <p className="text-base font-medium text-slate-600">لا توجد دفعات مسجلة حتى الآن</p>
              <p className="text-xs text-slate-400 mt-1">
                اضغط على زر "إنشاء دفعة شهرية جديدة" لمعاينة واستخراج مستحقات الشهر.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم / مرجع الدفعة</th>
                    <th className="py-3.5 px-4">الفترة المحاسبية</th>
                    <th className="py-3.5 px-4">المبلغ الإجمالي</th>
                    <th className="py-3.5 px-4">عدد المستفيدين</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-900">
                          {batch.batch_reference || batch.id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        من {batch.period_start} إلى {batch.period_end}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {Number(batch.total_amount).toLocaleString()}
                        </span>{' '}
                        <span className="text-xs text-slate-500 font-normal">دج</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {batch.total_assistants_count || batch.items_count || 0} مساعد
                      </td>
                      <td className="py-3.5 px-4">
                        {batch.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            مكتملة
                          </span>
                        )}
                        {batch.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            ملغاة
                          </span>
                        )}
                        {batch.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            قيد التنفيذ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(batch.created_at).toLocaleDateString('ar-DZ')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => loadBatchDetails(batch.id)}
                          className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض ومتابعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Preview & Generate Monthly Batch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                معاينة واستخراج دفعة المستحقات الشهرية
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاريخ بداية الفترة
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاريخ نهاية الفترة
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {previewLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  معاينة الحسابات المؤهلة (قراءة فقط)
                </button>
              </div>

              {previewError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {/* Preview Results Display */}
              {previewData && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-teal-800 font-semibold bg-teal-50 p-2 rounded-lg border border-teal-100">
                    <Info className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>تمت المعاينة بدون أي تعديل على قاعدة البيانات. تحقق من النتائج قبل الاعتماد.</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500">المساعدين المؤهلين</div>
                      <div className="text-base font-bold text-teal-700 mt-0.5">
                        {previewData.eligible_assistants_count} مساعد
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500">إجمالي المبلغ المقدر</div>
                      <div className="text-base font-bold text-slate-900 mt-0.5">
                        {previewData.total_estimated_payout.toLocaleString()} دج
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                      <div className="text-[11px] text-slate-500">المساعدين المستبعدين</div>
                      <div className="text-base font-bold text-slate-600 mt-0.5">
                        {previewData.excluded_assistants_count} مساعد
                      </div>
                    </div>
                  </div>

                  {/* Exclusions Breakdown */}
                  {previewData.excluded_breakdown && (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-700 mb-1">أسباب الاستبعاد:</div>
                      <div>
                        • دون الحد الأدنى (10,000 دج):{' '}
                        <span className="font-semibold">{previewData.excluded_breakdown.below_threshold_count}</span>
                      </div>
                      <div>
                        • لا يملك حساب RIP معتمد ونشط:{' '}
                        <span className="font-semibold">{previewData.excluded_breakdown.missing_active_profile_count}</span>
                      </div>
                      <div>
                        • رصيد سالب أو عجز مالي:{' '}
                        <span className="font-semibold">{previewData.excluded_breakdown.negative_balance_count}</span>
                      </div>
                    </div>
                  )}

                  {/* Eligible items preview list */}
                  {previewData.eligible_assistants && previewData.eligible_assistants.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">المساعد</th>
                            <th className="py-2 px-3">رقم الـ RIP</th>
                            <th className="py-2 px-3">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.eligible_assistants.map((ast: any) => (
                            <tr key={ast.assistant_id}>
                              <td className="py-2 px-3 font-medium text-slate-800">{ast.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{ast.masked_rip}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {Number(ast.amount).toLocaleString()} دج
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={previewLoading || !previewData || previewData.eligible_assistants_count === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  تأكيد وإنشاء الدفعة الرسمية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Batch (D-02) */}
      {showCancelModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                إلغاء دفعة المستحقات بالكامل (قرار D-02)
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelBatchSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl space-y-1">
                <div className="font-semibold">تنبيه أماني وإجرائي:</div>
                <div>
                  • سيتم إلغاء الدفعة وإعادة كافة المبالغ إلى الأرصدة النشطة للمساعدين.
                </div>
                <div>
                  • لا يمكن إلغاء هذه العملية بعد تنفيذها، ويتم تسجيلها في سجل التدقيق الأمني للأبد.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  سبب الإلغاء الإلزامي <span className="text-rose-500">* (5 أحرف على الأقل)</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="مثال: اكتشاف خطأ في حساب ساعات العمل، أو إعادة جدولة الدورة المحاسبية..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {cancelError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `cancel-batch-${selectedBatch.id}`}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {actionLoading === `cancel-batch-${selectedBatch.id}` && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  تأكيد الإلغاء النهائي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fail Item */}
      {failingItem && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                تسجيل فشل تحويل مستحقات المساعد
              </h3>
              <button
                onClick={() => setFailingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFailSubmit} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">المساعد:</span> {failingItem.assistant?.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">المبلغ:</span>{' '}
                  <span className="font-bold">{Number(failingItem.amount).toLocaleString()} دج</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  سبب فشل التحويل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  placeholder="مثال: رقم الحساب البريدي مغلق أو مرفوض من بريد الجزائر..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              {failError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {failError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFailingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === failingItem.id}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {actionLoading === failingItem.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  تسجيل الفشل واسترجاع الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
