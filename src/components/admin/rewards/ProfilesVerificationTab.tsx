'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  FileX2,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Lock,
  Unlock,
  X,
  FileText,
  Building2,
  User,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Check,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/auth';
import {
  adminAssistantRewardsService,
  AdminPayoutProfile
} from '@/services/adminAssistantRewardsService';

export function ProfilesVerificationTab() {
  const { user, hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole ? hasRole('admin') : false;
  const canViewFullRip = isAdmin || (hasPermission ? hasPermission('platform.rewards.view_full_rip') : false);
  const canDownloadCheque = isAdmin || (hasPermission ? hasPermission('platform.rewards.download_cheque_document') : false);
  const canVerify = isAdmin || (hasPermission ? hasPermission('platform.rewards.verify_payout_profile') : false);
  const canReject = isAdmin || (hasPermission ? hasPermission('platform.rewards.reject_payout_profile') : false);

  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'rejected' | 'superseded'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState<AdminPayoutProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick Reject Modal state (from table)
  const [selectedProfileForReject, setSelectedProfileForReject] = useState<AdminPayoutProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // RIP Reveal Cache & Copying
  const [revealedRips, setRevealedRips] = useState<Record<string, string>>({});
  const [revealingRipId, setRevealingRipId] = useState<string | null>(null);
  const [copiedRip, setCopiedRip] = useState<string | null>(null);

  // Comprehensive Review Modal State
  const [previewProfile, setPreviewProfile] = useState<AdminPayoutProfile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/jpeg');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Document Viewer Zoom & Rotate State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // Interactive Cross-Check Helper in Review Modal
  const [manualChequeInput, setManualChequeInput] = useState<string>('');
  const [modalConfirmApprove, setModalConfirmApprove] = useState(false);
  const [modalShowRejectForm, setModalShowRejectForm] = useState(false);
  const [modalRejectionReason, setModalRejectionReason] = useState('');
  const [modalRejectionError, setModalRejectionError] = useState<string | null>(null);

  const loadProfiles = useCallback(async (page: number, status: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAssistantRewardsService.getProfiles(status, page);
      if (res.status === 'success' && res.data) {
        setProfiles(res.data.data || []);
        setCurrentPage(res.data.current_page || 1);
        setTotalPages(res.data.last_page || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل تحميل ملفات الحسابات البنكية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles(1, statusFilter);
  }, [statusFilter, loadProfiles]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadProfiles(newPage, statusFilter);
    }
  };

  const handleRevealRip = async (profile: AdminPayoutProfile) => {
    try {
      setRevealingRipId(profile.id);
      const res = await adminAssistantRewardsService.revealFullRip(profile.id);
      if (res.status === 'success' && res.data?.rip) {
        setRevealedRips((prev) => ({
          ...prev,
          [profile.id]: res.data.rip,
        }));
        if (previewProfile && previewProfile.id === profile.id) {
          setPreviewProfile((prev) => (prev ? { ...prev, rip_full: res.data.rip } : null));
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'فشل كشف رقم RIP. قد لا تملك الصلاحية اللازمة.');
    } finally {
      setRevealingRipId(null);
    }
  };

  const handleCopyRip = (ripNumber: string) => {
    navigator.clipboard.writeText(ripNumber);
    setCopiedRip(ripNumber);
    setTimeout(() => setCopiedRip(null), 2500);
  };

  const handleDownloadCheque = async (profile: AdminPayoutProfile) => {
    try {
      setActionLoading(`download-${profile.id}`);
      await adminAssistantRewardsService.downloadCheque(profile.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'فشل تحميل الصك المشطوب. تأكد من توفر الصلاحية ووجود الملف.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReviewModal = async (profile: AdminPayoutProfile) => {
    setPreviewProfile(profile);
    setZoomLevel(100);
    setRotation(0);
    setManualChequeInput('');
    setModalConfirmApprove(false);
    setModalShowRejectForm(false);
    setModalRejectionReason('');
    setModalRejectionError(null);

    // Auto-reveal RIP if permitted and not yet in cache
    if ((canViewFullRip || profile.rip_full) && !revealedRips[profile.id]) {
      if (profile.rip_full) {
        setRevealedRips((prev) => ({ ...prev, [profile.id]: profile.rip_full! }));
      } else {
        handleRevealRip(profile);
      }
    }

    if (profile.has_document) {
      try {
        setLoadingPreview(true);
        if (previewBlobUrl) {
          window.URL.revokeObjectURL(previewBlobUrl);
          setPreviewBlobUrl(null);
        }
        const blobData = await adminAssistantRewardsService.getChequeBlob(profile.id);
        setPreviewBlobUrl(blobData.url);
        setPreviewMimeType(blobData.mimeType);
      } catch (err: any) {
        alert(err?.response?.data?.message || 'فشل جلب وثيقة الصك المشطوب من التخزين الآمن.');
      } finally {
        setLoadingPreview(false);
      }
    } else {
      setPreviewBlobUrl(null);
    }
  };

  const handleCloseReviewModal = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewProfile(null);
    setModalConfirmApprove(false);
    setModalShowRejectForm(false);
    setModalRejectionReason('');
    setModalRejectionError(null);
  };

  const executeApproval = async (profileId: string, assistantName: string) => {
    try {
      setActionLoading(profileId);
      setError(null);
      await adminAssistantRewardsService.verifyProfile(profileId, { approved: true });
      setSuccessMessage(`تم اعتماد ملف RIP الخاص بالمساعد ${assistantName} بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 6000);

      // Close modal if open on this profile
      if (previewProfile && previewProfile.id === profileId) {
        handleCloseReviewModal();
      }

      loadProfiles(currentPage, statusFilter);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل اعتماد الملف';
      setError(msg);
      if (previewProfile && previewProfile.id === profileId) {
        alert(msg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const executeRejection = async (profileId: string, reason: string) => {
    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 5) {
      throw new Error('يرجى تقديم سبب واضح للرفض لا يقل عن 5 أحرف ولا يحتوي مسافات فقط.');
    }

    try {
      setActionLoading(profileId);
      setError(null);
      await adminAssistantRewardsService.verifyProfile(profileId, {
        approved: false,
        rejection_reason: cleanReason,
      });
      setSuccessMessage('تم رفض ملف RIP بنجاح وإرسال السبب للمساعد.');
      setTimeout(() => setSuccessMessage(null), 6000);

      // Close quick modal if open
      setSelectedProfileForReject(null);
      setRejectionReason('');
      setRejectionError(null);

      // Close review modal if open on this profile
      if (previewProfile && previewProfile.id === profileId) {
        handleCloseReviewModal();
      }

      loadProfiles(currentPage, statusFilter);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل رفض الملف';
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Reject Form submit
  const handleQuickRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForReject) return;
    try {
      setRejectionError(null);
      await executeRejection(selectedProfileForReject.id, rejectionReason);
    } catch (err: any) {
      setRejectionError(err.message || 'فشل تنفيذ الرفض.');
    }
  };

  // Modal Reject Submit
  const handleModalRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewProfile) return;
    try {
      setModalRejectionError(null);
      await executeRejection(previewProfile.id, modalRejectionReason);
    } catch (err: any) {
      setModalRejectionError(err.message || 'فشل تنفيذ الرفض.');
    }
  };

  // Filter profiles locally for search term
  const filteredProfiles = profiles.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = p.assistant?.name?.toLowerCase().includes(term);
    const phoneMatch = p.assistant?.phone?.includes(term);
    const emailMatch = p.assistant?.email?.toLowerCase().includes(term);
    const clinicMatch = p.clinic?.name?.toLowerCase().includes(term);
    const ripMatch = (p.masked_rip || p.rip || p.rip_masked || '').includes(term);
    return nameMatch || phoneMatch || emailMatch || clinicMatch || ripMatch;
  });

  // Format 20-digit RIP into readable 4-digit groups (e.g., 0079 9999 0001 2345 6789)
  const formatRipBlocks = (rip: string) => {
    const cleaned = rip.replace(/\s+/g, '');
    if (cleaned.length !== 20) return rip;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12, 16)} ${cleaned.slice(16, 20)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            تدقيق واعتماد الحسابات البنكية البريدية (RIP)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            مراجعة وفحص أرقام الـ RIP ووثائق الصك المشطوب المسجلة من قِبل مساعدي الأطباء
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>بانتظار المراجعة والاعتماد</span>
            {statusFilter === 'pending' && totalCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النشطة والمعتمدة
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المرفوضة
          </button>
          <button
            onClick={() => setStatusFilter('superseded')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'superseded'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الملغاة والمستبدلة
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المساعد، العيادة، رقم الهاتف، أو رقم الحساب..."
            className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => loadProfiles(currentPage, statusFilter)}
          className="px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث القائمة
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-sm">جاري جلب ملفات الحسابات البنكية...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-slate-300" />
            <p className="text-base font-medium text-slate-600">لا توجد سجلات مطابقة</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter === 'pending'
                ? 'لا توجد طلبات اعتماد حسابات بنكية بانتظار المراجعة حالياً.'
                : 'لم يتم العثور على أي ملفات في هذه الفئة.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-start">المساعد والعيادة</th>
                  <th className="py-3.5 px-4 text-start">رقم الـ RIP المسجل</th>
                  <th className="py-3.5 px-4 text-start">الصك المشطوب</th>
                  <th className="py-3.5 px-4 text-start">الإصدار والتاريخ</th>
                  <th className="py-3.5 px-4 text-start">الحالة</th>
                  <th className="py-3.5 px-4 text-start">بيانات التدقيق</th>
                  <th className="py-3.5 px-4 text-center">اتخاذ القرار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((p) => {
                  const isRevealed = !!revealedRips[p.id] || !!p.rip_full;
                  const fullRipVal = revealedRips[p.id] || p.rip_full;
                  const displayRip = isRevealed && fullRipVal
                    ? formatRipBlocks(fullRipVal)
                    : (p.masked_rip || p.rip_masked || p.rip || 'غير متوفر');

                  const isPending = p.status === 'pending' || p.status === 'pending_verification';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Assistant & Clinic Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {p.assistant?.name || 'مساعد غير معروف'}
                        </div>
                        {p.clinic && (
                          <div className="text-xs text-teal-700 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{p.clinic.name}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.assistant?.phone} {p.assistant?.email && `• ${p.assistant?.email}`}
                        </div>
                      </td>

                      {/* RIP with Masking & Reveal */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs px-2.5 py-1 rounded-lg border tracking-wider select-all ${
                              isRevealed
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {displayRip}
                          </span>
                          {!isRevealed ? (
                            <button
                              onClick={() => handleRevealRip(p)}
                              disabled={revealingRipId === p.id}
                              title="كشف كامل الرقم (20 رقماً - مسجل أمنياً)"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              {revealingRipId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCopyRip(fullRipVal!)}
                              title="نسخ رقم الـ RIP"
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                            >
                              {copiedRip === fullRipVal ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Crossed Cheque Document Preview / Download */}
                      <td className="py-3.5 px-4">
                        {p.has_document ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenReviewModal(p)}
                              className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-teal-200/60"
                              title="معاينة وتدقيق وثيقة الصك"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              معاينة وتدقيق
                            </button>
                            {canDownloadCheque && (
                              <button
                                onClick={() => handleDownloadCheque(p)}
                                disabled={actionLoading === `download-${p.id}`}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="تحميل الصك المشطوب (D-01)"
                              >
                                {actionLoading === `download-${p.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            غير مرفق
                          </span>
                        )}
                      </td>

                      {/* Version & Submitted Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="font-mono font-bold text-slate-700">الإصدار v{p.version}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('ar-DZ') : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            معلق للمراجعة
                          </span>
                        )}
                        {p.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            معتمد ونشط
                          </span>
                        )}
                        {p.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            مرفوض
                          </span>
                        )}
                        {p.status === 'superseded' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            ملغى / مستبدل
                          </span>
                        )}
                      </td>

                      {/* Review details */}
                      <td className="py-3.5 px-4 text-xs">
                        {p.reviewed_by || p.reviewer_name ? (
                          <div>
                            <div className="font-semibold text-slate-700">
                              بواسطة: {p.reviewer_name || 'مسؤول النظام'}
                            </div>
                            {p.reviewed_at && (
                              <div className="text-slate-400 text-[11px]">
                                {new Date(p.reviewed_at).toLocaleDateString('ar-DZ')}
                              </div>
                            )}
                            {p.rejection_reason && (
                              <div
                                className="text-rose-600 text-[11px] mt-0.5 max-w-[180px] truncate font-medium"
                                title={p.rejection_reason}
                              >
                                السبب: {p.rejection_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenReviewModal(p)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                              title="فتح نافذة المراجعة والتدقيق الشاملة"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              مراجعة الملف
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProfileForReject(p);
                                setRejectionReason('');
                                setRejectionError(null);
                              }}
                              disabled={actionLoading === p.id}
                              className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                              title="رفض الحساب المسجل"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              رفض
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenReviewModal(p)}
                            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            عرض التفاصيل
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              إجمالي السجلات: <span className="font-semibold text-slate-800">{totalCount}</span> (الصفحة {currentPage} من {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1.5 rounded border cursor-pointer ${
                      currentPage === page
                        ? 'bg-teal-600 text-white border-teal-600 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Reject Profile Modal (from Table Action) */}
      {selectedProfileForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileX2 className="w-5 h-5 text-rose-600" />
                رفض الحساب البريدي المسجل
              </h3>
              <button
                onClick={() => setSelectedProfileForReject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRejectSubmit} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">المساعد:</span> {selectedProfileForReject.assistant?.name}
                </div>
                {selectedProfileForReject.clinic && (
                  <div>
                    <span className="font-semibold text-slate-700">العيادة:</span> {selectedProfileForReject.clinic.name}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">رقم RIP:</span>{' '}
                  <span className="font-mono font-bold">{selectedProfileForReject.masked_rip}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  سبب الرفض <span className="text-rose-500">* (إلزامي — يظهر للمساعد لتصحيح الملف)</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثال: صورة الصك غير واضحة، أو الاسم المطبوع على الصك لا يطابق اسم المساعد المسجل، أو أرقام الـ RIP ناقصة..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              {rejectionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {rejectionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProfileForReject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedProfileForReject.id}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === selectedProfileForReject.id && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  تأكيد الرفض وإشعار المساعد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE REVIEW & DECISION MODAL (نافذة المراجعة والتدقيق المتكاملة) */}
      {previewProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 md:px-6 md:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    تدقيق واعتماد ملف الحساب البريدي (RIP)
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-200 text-slate-700">
                      v{previewProfile.version}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    مراجعة وتدقيق المستندات المسجلة من قِبل المساعد قبل تفعيل صرف المكافآت
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canDownloadCheque && previewProfile.has_document && (
                  <button
                    onClick={() => handleDownloadCheque(previewProfile)}
                    disabled={actionLoading === `download-${previewProfile.id}`}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تحميل الوثيقة
                  </button>
                )}
                <button
                  onClick={handleCloseReviewModal}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Screen */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Cheque Document Preview (Col 12 on mobile, Col 6 on desktop) */}
              <div className="lg:col-span-6 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    معاينة وثيقة الصك المشطوب
                  </h4>
                  {previewBlobUrl && !previewMimeType.includes('pdf') && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                        className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                        title="تصغير (-)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono px-1 font-bold text-slate-700">{zoomLevel}%</span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(z + 25, 300))}
                        className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                        title="تكبير (+)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                        title="تدوير (90°)"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Document Display Box */}
                <div className="flex-1 bg-slate-900/5 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center min-h-[420px] max-h-[600px] relative p-2">
                  {loadingPreview ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400 py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                      <span className="text-xs font-semibold">جاري جلب الوثيقة المشفرة بأمان...</span>
                    </div>
                  ) : previewBlobUrl ? (
                    previewMimeType.includes('pdf') ? (
                      <iframe
                        src={previewBlobUrl}
                        title="Cheque PDF Document"
                        className="w-full h-full min-h-[480px] border-none rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                        <img
                          src={previewBlobUrl}
                          alt="Crossed Cheque Document"
                          style={{
                            transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                            transition: 'transform 0.15s ease-out',
                          }}
                          className="max-h-[500px] object-contain rounded-lg shadow-sm"
                        />
                      </div>
                    )
                  ) : (
                    <div className="text-center text-slate-400 p-8">
                      <FileX2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold">لم يتم إرفاق أي وثيقة صك بهذا الطلب</p>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>الوثيقة محفوظة في التخزين المشفر الخاص وتخضع لقانون حماية البيانات 18-07 وسجل التدقيق الأمني (D-01 / D-03).</span>
                </div>
              </div>

              {/* RIGHT COLUMN: Assistant Info, RIP Verification, Cross-Check, Decision */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                {/* 1. Assistant Identity Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        بيانات المساعد الطبيب
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {previewProfile.assistant?.name || 'مساعد غير معروف'}
                      </h4>
                    </div>
                    <div>
                      {previewProfile.status === 'pending' || previewProfile.status === 'pending_verification' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          معلق للمراجعة
                        </span>
                      ) : previewProfile.status === 'active' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          معتمد ونشط
                        </span>
                      ) : previewProfile.status === 'rejected' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          مرفوض
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-200 text-slate-700">
                          ملغى / مستبدل
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[10px]">العيادة المرتبطة:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        {previewProfile.clinic?.name || 'غير مسجل بعيادة'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">تاريخ التقديم:</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {previewProfile.created_at
                          ? new Date(previewProfile.created_at).toLocaleString('ar-DZ')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">معرف الحساب:</span>
                      <span className="font-mono text-[11px] text-slate-600 truncate block select-all">
                        {previewProfile.assistant_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">بيانات الاتصال:</span>
                      <span className="font-medium text-slate-700 block truncate">
                        {previewProfile.assistant?.phone || previewProfile.assistant?.email || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Registered RIP vs Cheque Visual Cross-Check */}
                <div className="p-4 bg-white rounded-2xl border-2 border-teal-500/30 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-teal-600" />
                      رقم الـ RIP المسجل في المنصة (20 رقماً)
                    </div>
                    {previewProfile.rip_full || revealedRips[previewProfile.id] ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        مكشوف أمنياً
                      </span>
                    ) : (
                      canViewFullRip && (
                        <button
                          onClick={() => handleRevealRip(previewProfile)}
                          disabled={revealingRipId === previewProfile.id}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" />
                          كشف كامل الرقم
                        </button>
                      )
                    )}
                  </div>

                  {/* Registered RIP Display Box */}
                  {(() => {
                    const isRevealed = !!previewProfile.rip_full || !!revealedRips[previewProfile.id];
                    const fullRip = previewProfile.rip_full || revealedRips[previewProfile.id];
                    const ripDisplay = isRevealed && fullRip
                      ? formatRipBlocks(fullRip)
                      : (previewProfile.masked_rip || previewProfile.rip_masked || previewProfile.rip);

                    return (
                      <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-xl font-mono text-base tracking-widest select-all shadow-inner">
                        <span className="font-bold text-emerald-400">{ripDisplay}</span>
                        {isRevealed && fullRip && (
                          <button
                            onClick={() => handleCopyRip(fullRip)}
                            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white cursor-pointer"
                            title="نسخ رقم الـ RIP"
                          >
                            {copiedRip === fullRip ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Manual Interactive Cross-Check Helper */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      أداة المطابقة الآنية مع الصك المقابل (تحقق يدوي):
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={manualChequeInput}
                      onChange={(e) => setManualChequeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="اكتب الـ 20 رقماً المقروءة من الصك للمطابقة الفورية..."
                      className="w-full p-2.5 text-xs font-mono tracking-wider border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />

                    {/* Live Match Verification Feedback */}
                    {manualChequeInput.length > 0 && (() => {
                      const registeredClean = (previewProfile.rip_full || revealedRips[previewProfile.id] || '').replace(/\D/g, '');
                      const isComplete = manualChequeInput.length === 20;

                      if (!registeredClean) {
                        return (
                          <div className="text-[11px] text-slate-500">
                            (اكشف الرقم المسجل أعلاه أولاً لإتمام المطابقة الآلية)
                          </div>
                        );
                      }

                      const isMatch = isComplete && manualChequeInput === registeredClean;
                      const hasMismatch = manualChequeInput !== registeredClean.slice(0, manualChequeInput.length);

                      if (isMatch) {
                        return (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>الأرقام متطابقة بنسبة 100% مع وثيقة الصك البريدي (20 رقماً).</span>
                          </div>
                        );
                      } else if (hasMismatch) {
                        return (
                          <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>تنبيه: الأرقام غير متطابقة! يرجى إعادة فحص الصك بدقة.</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-[11px] text-slate-500 font-medium">
                            أدخلت {manualChequeInput.length} من 20 رقماً (حتى الآن الأرقام مطابقة).
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* 3. Decision & Action Controls */}
                <div className="mt-auto pt-2 space-y-3">
                  {(previewProfile.status === 'pending' || previewProfile.status === 'pending_verification') ? (
                    <>
                      {/* Confirm Approval Box */}
                      {modalConfirmApprove && (
                        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3">
                          <div className="flex items-start gap-2.5 text-emerald-900">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold">تأكيد اعتماد الحساب البريدي</h5>
                              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                هل أنت متأكد من صحة رقم الـ RIP ومطابقته للصك المرفق للمساعد{' '}
                                <strong className="font-bold">{previewProfile.assistant?.name}</strong>؟
                                سيتم تفعيل الحساب فوراً لصرف المكافآت المالية الشهرية.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setModalConfirmApprove(false)}
                              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                            >
                              تراجع
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === previewProfile.id}
                              onClick={() => executeApproval(previewProfile.id, previewProfile.assistant?.name || '')}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {actionLoading === previewProfile.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              تأكيد الاعتماد النهائي
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Modal Rejection Form */}
                      {modalShowRejectForm && (
                        <form
                          onSubmit={handleModalRejectSubmit}
                          className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between text-rose-900">
                            <h5 className="text-xs font-bold flex items-center gap-1.5">
                              <FileX2 className="w-4 h-4 text-rose-600" />
                              رفض الحساب البريدي وإشعار المساعد
                            </h5>
                            <button
                              type="button"
                              onClick={() => setModalShowRejectForm(false)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-rose-900 mb-1">
                              سبب الرفض <span className="text-rose-600">* (إلزامي — لا يقل عن 5 أحرف)</span>
                            </label>
                            <textarea
                              rows={3}
                              value={modalRejectionReason}
                              onChange={(e) => setModalRejectionReason(e.target.value)}
                              placeholder="مثال: صورة الصك غير واضحة، أو الاسم المطبوع على الصك لا يطابق اسم المساعد المسجل، أو رقم الحساب ناقص..."
                              className="w-full p-2.5 text-xs border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                              required
                            />
                          </div>

                          {modalRejectionError && (
                            <div className="p-2 bg-rose-100 text-rose-800 text-xs rounded-lg font-medium">
                              {modalRejectionError}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setModalShowRejectForm(false)}
                              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              disabled={actionLoading === previewProfile.id}
                              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {actionLoading === previewProfile.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              تأكيد الرفض الآن
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Main Decision Buttons (When forms closed) */}
                      {!modalConfirmApprove && !modalShowRejectForm && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setModalConfirmApprove(true);
                              setModalShowRejectForm(false);
                            }}
                            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            اعتماد الحساب البنكي
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalShowRejectForm(true);
                              setModalConfirmApprove(false);
                              setModalRejectionReason('');
                              setModalRejectionError(null);
                            }}
                            className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            رفض الحساب المسجل
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Review Summary Card for completed profiles */
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-teal-600" />
                        حالة التدقيق والمراجعة
                      </div>
                      <div className="text-slate-600">
                        بواسطة المسؤول:{' '}
                        <strong className="text-slate-900">{previewProfile.reviewer_name || 'مسؤول المنصة'}</strong>
                      </div>
                      {previewProfile.reviewed_at && (
                        <div className="text-slate-500">
                          تاريخ المراجعة:{' '}
                          <span>{new Date(previewProfile.reviewed_at).toLocaleString('ar-DZ')}</span>
                        </div>
                      )}
                      {previewProfile.rejection_reason && (
                        <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                          <span className="font-bold block mb-0.5">سبب الرفض:</span>
                          <p>{previewProfile.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
