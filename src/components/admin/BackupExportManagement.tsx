'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Shield,
  KeyRound,
  Lock,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldAlert,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslations, useLocale } from 'next-intl';
import { adminService, BackupExportItem } from '@/services/adminService';
import { getStoredToken } from '@/lib/api';

export function BackupExportManagement() {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [exportsList, setExportsList] = useState<BackupExportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Step-up modal state
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [password, setPassword] = useState('');
  const [submittingStepUp, setSubmittingStepUp] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  const fetchExports = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await adminService.listBackupExports();
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : []);
      setExportsList(list);
    } catch (err: any) {
      console.error('Failed to load backup exports:', err);
    } finally {
      if (!isSilent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const activeExport = exportsList.find(
    (exp) => exp.status === 'pending' || exp.status === 'processing'
  );

  // Polling for pending or processing exports
  useEffect(() => {
    if (!activeExport) return;

    const interval = setInterval(() => {
      fetchExports(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeExport, fetchExports]);

  const handleOpenExportModal = () => {
    if (activeExport) return;
    setPassword('');
    setStepUpError(null);
    setShowStepUpModal(true);
  };

  const handleConfirmExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setStepUpError(isRtl ? 'يرجى إدخال كلمة المرور لتأكيد الهوية.' : 'Please enter your password to confirm identity.');
      return;
    }

    setSubmittingStepUp(true);
    setStepUpError(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Step 1: Request step-up token
      const tokenRes = await adminService.requestBackupStepUpToken(password);
      const token = tokenRes.data?.token || (tokenRes as any)?.data?.data?.token;

      if (!token) {
        throw new Error(isRtl ? 'فشل الحصول على رمز المصادقة المتقدم.' : 'Failed to obtain step-up authentication token.');
      }

      // Step 2: Initiate export using the single-use token
      await adminService.initiateBackupExport(token);

      setShowStepUpModal(false);
      setPassword('');
      setActionSuccess(
        isRtl
          ? 'تم بنجاح طلب تصدير نسخة احتياطية مشفرة. تجري معالجة النسخة في الخلفية الآن.'
          : 'Encrypted backup export successfully initiated. Processing in background.'
      );

      // Refresh list immediately
      fetchExports();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || (isRtl ? 'حدث خطأ أثناء طلب التصدير.' : 'An error occurred.');
      setStepUpError(msg);
    } finally {
      setSubmittingStepUp(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (exp: BackupExportItem) => {
    if (exp.is_expired || exp.status === 'expired') {
      return (
        <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300">
          <Clock className="w-3 h-3 me-1" />
          {isRtl ? 'منتهية الصلاحية' : 'Expired'}
        </Badge>
      );
    }

    switch (exp.status) {
      case 'completed':
        return (
          <Badge variant="success" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300">
            <CheckCircle2 className="w-3 h-3 me-1" />
            {isRtl ? 'جاهزة للتحميل' : 'Ready'}
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="info" className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 animate-pulse">
            <RefreshCw className="w-3 h-3 me-1 animate-spin" />
            {isRtl ? 'قيد التشفير والتصدير...' : 'Processing...'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300">
            <Clock className="w-3 h-3 me-1" />
            {isRtl ? 'في قائمة الانتظار' : 'Pending'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="error" className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300">
            <XCircle className="w-3 h-3 me-1" />
            {isRtl ? 'فشلت العملية' : 'Failed'}
          </Badge>
        );
      default:
        return <Badge variant="neutral">{exp.status}</Badge>;
    }
  };

  const handleDownload = async (exportId: string, filename?: string) => {
    try {
      const token = getStoredToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const downloadUrl = adminService.getBackupDownloadUrl(exportId);

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/octet-stream',
        },
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || (isRtl ? 'تعذر تحميل الملف.' : 'Download failed.'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `aafiya_backup_${exportId}.sql.gz.enc`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      fetchExports(true);
    } catch (err: any) {
      setActionError(err.message || (isRtl ? 'حدث خطأ أثناء تحميل الملف.' : 'Error downloading file.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isRtl ? 'النسخ الاحتياطي المشفر وتصدير البيانات' : 'Encrypted Database Backup & Export'}
                </h2>
                <Badge variant="info" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                  AES-256-CBC + HMAC-SHA-256
                </Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isRtl
                  ? 'تصدير مؤمن لقاعدة البيانات في حزم مشفرة موقعة رقمياً مع دعم سياسة التحقق المزدوج والتنزيل المؤقت لمدة ساعة واحدة.'
                  : 'Secure database export into authenticated encrypted artifacts with step-up verification and 1-hour ephemeral download window.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchExports()}
              disabled={refreshing}
              className="text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 me-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {isRtl ? 'تحديث' : 'Refresh'}
            </Button>
            <Button
              onClick={handleOpenExportModal}
              disabled={!!activeExport}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={activeExport ? (isRtl ? 'هناك عملية تصدير قيد المعالجة حالياً' : 'An export is currently in progress') : undefined}
            >
              <Shield className="w-4 h-4 me-1.5" />
              {isRtl ? 'تصدير نسخة احتياطية جديدة' : 'New Backup Export'}
            </Button>
          </div>
        </div>

        {/* Global Security Guidance Note */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <Terminal className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              {isRtl
                ? 'سياسة الأمان الصارم وحظر الاستعادة عبر الويب (Defense-in-Depth Restatement):'
                : 'Strict Security Policy — Web Restore Strictly Forbidden:'}
            </p>
            <p className="leading-relaxed">
              {isRtl
                ? 'تتيح واجهة الإدارة تصدير النسخ المشفرة فقط. عمليات الاستعادة، وحقن استعلامات SQL، وإدارة أهداف الاستعادة محظورة كلياً عبر الويب، وتتم حصرياً عبر أوامر الطرفية المعتمدة (CLI) على الخادم المعزول وفق بروتوكول AUDIT-OPS.'
                : 'Web interface supports export only. Database restoration, SQL ingestion, and restore targets are strictly prohibited over HTTP/Web and must be executed host-side via hardened CLI tools in isolated environments.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Active Export Banner */}
      {activeExport && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <div>
              <p className="font-semibold">
                {isRtl ? 'توجد عملية تصدير جارية حالياً' : 'A backup export is currently in progress'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                {isRtl
                  ? `المعرف: ${activeExport.id} | الحالة: ${activeExport.status === 'processing' ? 'قيد التشفير والمعالجة' : 'في قائمة الانتظار'}`
                  : `Export ID: ${activeExport.id} | Status: ${activeExport.status}`}
              </p>
            </div>
          </div>
          <Badge variant="info" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300">
            {activeExport.status === 'processing'
              ? (isRtl ? 'قيد التشفير' : 'Processing')
              : (isRtl ? 'في الانتظار' : 'Pending')}
          </Badge>
        </div>
      )}

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)} className="h-7 px-2">
            ×
          </Button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-7 px-2">
            ×
          </Button>
        </div>
      )}

      {/* Exports Table Card */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            {isRtl ? 'سجل النسخ الاحتياطية المصدَّرة' : 'Exported Backup Records'}
          </h3>
          <span className="text-xs text-slate-400">
            {isRtl ? `${exportsList.length} سجل متاح` : `${exportsList.length} records found`}
          </span>
        </div>

        {exportsList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium text-slate-600 dark:text-slate-300">
              {isRtl ? 'لا توجد نسخ احتياطية مصدرة حالياً' : 'No backup exports available'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isRtl
                ? 'اضغط على "تصدير نسخة احتياطية جديدة" لإنشاء وتشفير نسخة احتياطية كاملة من قاعدة البيانات.'
                : 'Click "New Backup Export" to initiate an encrypted database dump.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3 text-start">{isRtl ? 'الملف والحالة' : 'Artifact & Status'}</th>
                  <th className="px-5 py-3 text-start">{isRtl ? 'الحجم' : 'Size'}</th>
                  <th className="px-5 py-3 text-start">{isRtl ? 'تاريخ الإنشاء' : 'Created At'}</th>
                  <th className="px-5 py-3 text-start">{isRtl ? 'صلاحية التنزيل' : 'Expires At'}</th>
                  <th className="px-5 py-3 text-start">{isRtl ? 'توقيع SHA-256' : 'SHA-256 Digest'}</th>
                  <th className="px-5 py-3 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exportsList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {exp.filename || `export-${exp.id.slice(0, 8)}`}
                          </span>
                          {getStatusBadge(exp)}
                        </div>
                        {exp.error_message && (
                          <span className="text-xs text-red-500 line-clamp-1">{exp.error_message}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {formatFileSize(exp.file_size_bytes)}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {exp.created_at ? new Date(exp.created_at).toLocaleString(locale) : '—'}
                    </td>

                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      {exp.expires_at ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(exp.expires_at).toLocaleTimeString(locale)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {exp.sha256_hash ? (
                        <span title={exp.sha256_hash} className="cursor-help bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {exp.sha256_hash.slice(0, 10)}...{exp.sha256_hash.slice(-8)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-5 py-4 text-end">
                      {exp.status === 'completed' && !exp.is_expired ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(exp.id, exp.filename)}
                          className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                          <Download className="w-3.5 h-3.5 me-1.5" />
                          {isRtl ? 'تنزيل آمن' : 'Download'}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {exp.is_expired ? (isRtl ? 'انتهت' : 'Expired') : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Step-Up Authentication Modal */}
      {showStepUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {isRtl ? 'المصادقة المتقدمة لتصدير البيانات' : 'Step-Up Authentication'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تأكيد كلمة المرور مطلوب للعمليات الحساسة' : 'Re-confirm password for privileged export'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmExport} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300">
                <p>
                  {isRtl
                    ? 'لحماية السجلات الصحية وبيانات المنظومة، يتطلب تصدير النسخ المشفرة مصادقة إضافية عبر تأكيد كلمة المرور الشخصية للمشرف. تظل صلاحية الرمز 5 دقائق فقط.'
                    : 'To protect health records, exporting database archives requires high-assurance authentication. The single-use authorization token is valid for 5 minutes.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isRtl ? 'كلمة المرور الحالية' : 'Current Account Password'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute top-3 end-3" />
                </div>
              </div>

              {stepUpError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{stepUpError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStepUpModal(false)}
                  disabled={submittingStepUp}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={submittingStepUp}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingStepUp ? (
                    <RefreshCw className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <Shield className="w-4 h-4 me-2" />
                  )}
                  {isRtl ? 'تأكيد وبدء التصدير' : 'Confirm & Export'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
