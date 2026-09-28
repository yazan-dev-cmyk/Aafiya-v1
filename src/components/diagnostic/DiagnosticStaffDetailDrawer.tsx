'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  X,
  User,
  FlaskConical,
  Activity,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  UserMinus,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Sliders,
  Check,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface DiagnosticStaffDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  centerId: string;
  staffId: string | null;
  centerType: 'laboratory' | 'radiology';
  isDarkMode?: boolean;
  onStaffUpdated: () => void;
}

type ConfirmActionType = 'suspend' | 'reactivate' | 'remove' | null;

interface DelegablePermissionItem {
  key: string;
  titleKey: string;
  descKey: string;
  isManagerOnly?: boolean;
}

const LAB_PERMISSIONS: DelegablePermissionItem[] = [
  {
    key: 'lab.manage_orders',
    titleKey: 'permLabManageOrders',
    descKey: 'permLabManageOrdersDesc',
  },
  {
    key: 'lab.enter_results',
    titleKey: 'permLabEnterResults',
    descKey: 'permLabEnterResultsDesc',
  },
  {
    key: 'lab.finalize_results',
    titleKey: 'managerOnly',
    descKey: 'permissionNotDelegable',
    isManagerOnly: true,
  },
];

const RAD_PERMISSIONS: DelegablePermissionItem[] = [
  {
    key: 'radiology.manage_orders',
    titleKey: 'permRadManageOrders',
    descKey: 'permRadManageOrdersDesc',
  },
  {
    key: 'radiology.upload_images',
    titleKey: 'permRadUploadImages',
    descKey: 'permRadUploadImagesDesc',
  },
  {
    key: 'radiology.finalize_report',
    titleKey: 'managerOnly',
    descKey: 'permissionNotDelegable',
    isManagerOnly: true,
  },
];

export const DiagnosticStaffDetailDrawer: React.FC<DiagnosticStaffDetailDrawerProps> = ({
  isOpen,
  onClose,
  centerId,
  staffId,
  centerType,
  isDarkMode = false,
  onStaffUpdated,
}) => {
  const t = useTranslations('diagnostic.staff');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [staff, setStaff] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Permission editing state
  const [isEditingPermissions, setIsEditingPermissions] = useState<boolean>(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!centerId || !staffId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/diagnostic-centers/${centerId}/staff/${staffId}`);
      const data = res?.data?.data || res?.data;
      if (data && (data.id || data.user_id)) {
        setStaff(data);
        setSelectedPermissions(data.delegated_permissions || data.permissions || []);
      } else {
        setError(t('loadStaffError'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('loadStaffError'));
    } finally {
      setLoading(false);
    }
  }, [centerId, staffId, t]);

  useEffect(() => {
    if (isOpen && staffId) {
      fetchDetail();
      setIsEditingPermissions(false);
      setActionFeedback(null);
    } else {
      setStaff(null);
      setConfirmAction(null);
      setActionFeedback(null);
    }
  }, [isOpen, staffId, fetchDetail]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmAction) {
          setConfirmAction(null);
        } else if (isEditingPermissions) {
          setIsEditingPermissions(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmAction, isEditingPermissions, onClose]);

  if (!isOpen) return null;

  const handleExecuteAction = async () => {
    if (!centerId || !staffId || !confirmAction) return;
    setSubmittingAction(true);
    setActionFeedback(null);

    try {
      if (confirmAction === 'suspend') {
        await api.put(`/diagnostic-centers/${centerId}/staff/${staffId}/status`, {
          is_active: false,
        });
      } else if (confirmAction === 'reactivate') {
        await api.put(`/diagnostic-centers/${centerId}/staff/${staffId}/status`, {
          is_active: true,
        });
      } else if (confirmAction === 'remove') {
        await api.delete(`/diagnostic-centers/${centerId}/staff/${staffId}`);
      }

      setConfirmAction(null);
      onStaffUpdated();

      if (confirmAction === 'remove') {
        onClose();
      } else {
        await fetchDetail();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('actionFailed');
      setActionFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!centerId || !staffId) return;
    setSavingPermissions(true);
    setActionFeedback(null);

    try {
      await api.put(`/diagnostic-centers/${centerId}/staff/${staffId}/permissions`, {
        permissions: selectedPermissions,
      });

      setIsEditingPermissions(false);
      onStaffUpdated();
      await fetchDetail();
      setActionFeedback({ type: 'success', message: t('actionSuccess') });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('actionFailed');
      setActionFeedback({ type: 'error', message: msg });
    } finally {
      setSavingPermissions(false);
    }
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const availablePermissions = centerType === 'radiology' ? RAD_PERMISSIONS : LAB_PERMISSIONS;

  const containerClass = isDarkMode
    ? 'bg-slate-900 text-white border-slate-800'
    : 'bg-white text-slate-900 border-slate-200';

  const cardBgClass = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200/80';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-staff-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmAction) onClose();
      }}
    >
      <div
        className={`fixed inset-y-0 ${
          isRtl ? 'left-0' : 'right-0'
        } max-w-full flex pl-0 sm:pl-10`}
      >
        <div
          className={`w-screen max-w-md sm:max-w-lg ${containerClass} border-x shadow-2xl flex flex-col h-full`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {centerType === 'radiology' ? (
                  <Activity className="w-5 h-5 text-indigo-600" />
                ) : (
                  <FlaskConical className="w-5 h-5 text-teal-600" />
                )}
                <h3 id="diagnostic-staff-drawer-title" className="font-bold text-base sm:text-lg">
                  {t('staffDetailsTitle')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('staffDetailsSubtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={t('close')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">{t('savingPermissions')}</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <p className="text-xs font-bold text-rose-600">{error}</p>
                <button
                  onClick={fetchDetail}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl"
                >
                  {t('loadStaffError')}
                </button>
              </div>
            ) : staff ? (
              <div className="space-y-6">
                {/* Feedback notice */}
                {actionFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      actionFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span>{actionFeedback.message}</span>
                    <button onClick={() => setActionFeedback(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Profile Overview Card */}
                <div className={`p-5 rounded-2xl border ${cardBgClass} space-y-4 shadow-xs`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {staff.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          {staff.name}
                        </h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-mono font-bold">
                          {staff.role_type || 'technician'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                        staff.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {staff.is_active ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('statusActive')}</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('statusSuspended')}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{staff.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Delegated Permissions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-teal-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('permissions')}
                      </h4>
                    </div>

                    {!isEditingPermissions && (
                      <button
                        onClick={() => setIsEditingPermissions(true)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{t('editPermissions')}</span>
                      </button>
                    )}
                  </div>

                  {isEditingPermissions ? (
                    <div className={`p-4 rounded-xl border ${cardBgClass} space-y-3`}>
                      <div className="space-y-2">
                        {availablePermissions.map((perm) => (
                          <div
                            key={perm.key}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              perm.isManagerOnly
                                ? 'opacity-60 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                : selectedPermissions.includes(perm.key)
                                ? 'bg-teal-50/70 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                disabled={perm.isManagerOnly}
                                checked={selectedPermissions.includes(perm.key)}
                                onChange={() => togglePermission(perm.key)}
                                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                              />
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {t(perm.titleKey as any)}
                                  </span>
                                  {perm.isManagerOnly && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      {t('managerOnly')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {t(perm.descKey as any)}
                                </p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPermissions(false);
                            setSelectedPermissions(staff.delegated_permissions || staff.permissions || []);
                          }}
                          className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={savingPermissions}
                          onClick={handleSavePermissions}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {savingPermissions ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{t('savePermissions')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {staff.delegated_permissions && staff.delegated_permissions.length > 0 ? (
                        staff.delegated_permissions.map((p: string) => {
                          const item = availablePermissions.find((perm) => perm.key === p);
                          return (
                            <div
                              key={p}
                              className={`p-3 rounded-xl border ${cardBgClass} text-xs flex items-center gap-2`}
                            >
                              <Check className="w-4 h-4 text-teal-600 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item ? t(item.titleKey as any) : p}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 italic p-3 rounded-xl border border-dashed border-slate-200">
                          {t('permissionNotDelegable')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Historical Records Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{t('historicalRecordsNotice')}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {staff && (
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
              <div className="flex items-center gap-3">
                {staff.is_active ? (
                  <button
                    onClick={() => setConfirmAction('suspend')}
                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>{t('suspend')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction('reactivate')}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{t('reactivate')}</span>
                  </button>
                )}

                <button
                  onClick={() => setConfirmAction('remove')}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>{t('remove')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmAction && (
            <div
              className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div
                className={`w-full max-w-sm rounded-2xl p-6 ${containerClass} border shadow-2xl space-y-4`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1">
                  <h4 className="text-sm sm:text-base font-black">
                    {confirmAction === 'suspend'
                      ? t('confirmSuspendTitle')
                      : confirmAction === 'reactivate'
                      ? t('confirmReactivateTitle')
                      : t('confirmRemoveTitle')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {confirmAction === 'suspend'
                      ? t('confirmSuspendDesc')
                      : confirmAction === 'reactivate'
                      ? t('confirmReactivateDesc')
                      : t('confirmRemoveDesc')}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={submittingAction}
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    disabled={submittingAction}
                    onClick={handleExecuteAction}
                    className={`flex-1 px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                      confirmAction === 'remove'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : confirmAction === 'suspend'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {submittingAction ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{t('confirmAction')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
