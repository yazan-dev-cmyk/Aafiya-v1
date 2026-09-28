import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  X,
  User,
  Stethoscope,
  Mail,
  Phone,
  Calendar,
  Award,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  UserMinus,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { clinicService } from '@/services/clinicService';

export interface StaffDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  staffId: string | null;
  staffType: 'doctor' | 'assistant';
  isDarkMode?: boolean;
  currentUserId?: string;
  currentDoctorId?: string;
  onStaffUpdated: () => void;
  onEditAssistantPermissions?: (assistant: any) => void;
}

type ConfirmActionType = 'suspend' | 'reactivate' | 'detach' | 'remove' | null;

export const StaffDetailDrawer: React.FC<StaffDetailDrawerProps> = ({
  isOpen,
  onClose,
  clinicId,
  staffId,
  staffType,
  isDarkMode = false,
  currentUserId,
  currentDoctorId,
  onStaffUpdated,
  onEditAssistantPermissions,
}) => {
  const t = useTranslations('doctor.staff');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [staff, setStaff] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!clinicId || !staffId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clinicService.getStaffDetail(clinicId, staffId);
      if (res.data) {
        setStaff(res.data);
      } else {
        setError(t('loadStaffError'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('loadStaffError'));
    } finally {
      setLoading(false);
    }
  }, [clinicId, staffId, t]);

  useEffect(() => {
    if (isOpen && staffId) {
      fetchDetail();
    } else {
      setStaff(null);
      setConfirmAction(null);
      setActionError(null);
    }
  }, [isOpen, staffId, fetchDetail]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmAction) {
          setConfirmAction(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmAction, onClose]);

  if (!isOpen) return null;

  const isDoctor = staffType === 'doctor' || staff?.type === 'doctor';
  const isSelf = Boolean(
    staff &&
    ((currentDoctorId && staff.id === currentDoctorId) ||
      (currentUserId && staff.user_id === currentUserId) ||
      staff.position === 'director')
  );

  const containerClass = isDarkMode
    ? 'bg-slate-900 text-white border-slate-800'
    : 'bg-white text-slate-900 border-slate-200';

  const cardBgClass = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200/80';

  const handleExecuteAction = async () => {
    if (!clinicId || !staffId || !confirmAction) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      if (confirmAction === 'suspend') {
        if (isDoctor) {
          await clinicService.updateDoctorStatus(clinicId, staffId, false);
        } else {
          await clinicService.updateAssistantStatus(clinicId, staffId, false);
        }
      } else if (confirmAction === 'reactivate') {
        if (isDoctor) {
          await clinicService.updateDoctorStatus(clinicId, staffId, true);
        } else {
          await clinicService.updateAssistantStatus(clinicId, staffId, true);
        }
      } else if (confirmAction === 'detach') {
        await clinicService.detachDoctor(clinicId, staffId);
      } else if (confirmAction === 'remove') {
        await clinicService.deleteAssistant(clinicId, staffId);
      }

      setConfirmAction(null);
      onStaffUpdated();

      if (confirmAction === 'detach' || confirmAction === 'remove') {
        onClose();
      } else {
        await fetchDetail();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('actionInProgress');
      setActionError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  const getConfirmationTitle = () => {
    if (confirmAction === 'suspend') return isDoctor ? t('confirmSuspendDoctorTitle') : t('confirmSuspendAssistantTitle');
    if (confirmAction === 'reactivate') return isDoctor ? t('confirmReactivateDoctorTitle') : t('confirmReactivateAssistantTitle');
    if (confirmAction === 'detach') return t('confirmDetachDoctorTitle');
    if (confirmAction === 'remove') return t('confirmRemoveAssistantTitle');
    return '';
  };

  const getConfirmationDesc = () => {
    if (confirmAction === 'suspend') return isDoctor ? t('confirmSuspendDoctorDesc') : t('confirmSuspendAssistantDesc');
    if (confirmAction === 'reactivate') return isDoctor ? t('confirmReactivateDoctorDesc') : t('confirmReactivateAssistantDesc');
    if (confirmAction === 'detach') return t('confirmDetachDoctorDesc');
    if (confirmAction === 'remove') return t('confirmRemoveAssistantDesc');
    return '';
  };

  const formatPermissionLabel = (p: string) => {
    switch (p) {
      case 'booking.manage_queue':
        return locale === 'ar' ? 'إدارة قائمة الانتظار' : locale === 'fr' ? "Gestion de la file d'attente" : 'Live Queue Management';
      case 'booking.confirm_attendance':
        return locale === 'ar' ? 'تأكيد حضور المرضى' : locale === 'fr' ? 'Confirmation de présence' : 'Confirm Patient Attendance';
      case 'booking.create':
        return locale === 'ar' ? 'حجز وإنشاء المواعيد' : locale === 'fr' ? 'Prise de rendez-vous' : 'Create & Book Appointments';
      case 'booking.confirm':
      case 'booking.confirm_quota':
        return locale === 'ar' ? 'تأكيد المواعيد الطبية' : locale === 'fr' ? 'Confirmation des rendez-vous' : 'Confirm Medical Appointments';
      case 'patient.view_contacts':
        return locale === 'ar' ? 'الاطلاع على بيانات الاتصال' : locale === 'fr' ? 'Consulter les coordonnées' : 'View Patient Contacts';
      case 'clinical.write_rx':
        return locale === 'ar' ? 'إصدار الوصفات الطبية' : locale === 'fr' ? 'Prescriptions médicales' : 'Write Prescriptions';
      case 'clinical.view_ehr':
        return locale === 'ar' ? 'الاطلاع على السجل الطبي' : locale === 'fr' ? 'Dossier médical unifié' : 'View Patient EHR';
      default:
        return p;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-drawer-title"
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
                {isDoctor ? (
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                ) : (
                  <User className="w-5 h-5 text-blue-600" />
                )}
                <h3 id="staff-drawer-title" className="font-bold text-base sm:text-lg">
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
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">{t('actionInProgress')}</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p>
                <button
                  onClick={fetchDetail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {t('retry')}
                </button>
              </div>
            ) : staff ? (
              <>
                {/* Status & Identity Card */}
                <div className={`${cardBgClass} p-5 rounded-2xl border space-y-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {staff.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-500">
                        {isDoctor ? (
                          staff.position === 'director' ? t('doctorPositionDirector') : t('doctorPositionEmployed')
                        ) : (
                          t('assistantPosition')
                        )}
                      </p>
                    </div>

                    {/* Dynamic Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        staff.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${staff.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {staff.is_active ? t('statusActive') : t('statusSuspended')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-mono truncate">{staff.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-mono">{staff.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 sm:col-span-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{t('joinedDateLabel')}: </span>
                      <strong className="font-mono">{staff.joined_at ? staff.joined_at.split('T')[0] : '—'}</strong>
                    </div>
                  </div>
                </div>

                {/* Professional Information (If Doctor) */}
                {isDoctor && (
                  <div className={`${cardBgClass} p-5 rounded-2xl border space-y-3`}>
                    <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                      {t('professionalInfoLabel')}
                    </h5>
                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      <div className="flex justify-between items-center border-b pb-2 border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">{t('specialtyLabel')}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{staff.specialty || 'طب عام'}</strong>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2 border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">{t('licenseLabel')}</span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          {staff.license_number || 'DZ-2026-DOC'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('positionLabel')}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {staff.position === 'director' ? t('doctorPositionDirector') : t('doctorPositionEmployed')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Effective Permissions */}
                <div className={`${cardBgClass} p-5 rounded-2xl border space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      {t('effectivePermissionsLabel')}
                    </h5>
                    {!isDoctor && onEditAssistantPermissions && (
                      <button
                        onClick={() => onEditAssistantPermissions(staff)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{t('editPermissions')}</span>
                      </button>
                    )}
                  </div>

                  {isDoctor ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(staff.permissions || []).map((perm: string) => (
                          <span
                            key={perm}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                          >
                            {formatPermissionLabel(perm)}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        {t('roleBasedPermissionsNotice')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(staff.delegated_permissions || staff.permissions_json || []).length === 0 ? (
                        <span className="text-xs text-slate-400 italic">لا توجد صلاحيات مفوضة حالياً</span>
                      ) : (
                        (staff.delegated_permissions || staff.permissions_json || []).map((perm: string) => (
                          <span
                            key={perm}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                          >
                            {formatPermissionLabel(perm)}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lifecycle Management Actions */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                    إجراءات دورة الحياة المهنية
                  </h5>

                  {isSelf ? (
                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                      <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{t('directorRoleNotice')}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Toggle Status Button */}
                      {staff.is_active ? (
                        <button
                          onClick={() => setConfirmAction('suspend')}
                          className="w-full py-2.5 px-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                        >
                          <PauseCircle className="w-4 h-4 text-amber-600" />
                          <span>{isDoctor ? t('suspendDoctor') : t('suspendAssistant')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction('reactivate')}
                          className="w-full py-2.5 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                        >
                          <PlayCircle className="w-4 h-4 text-emerald-600" />
                          <span>{isDoctor ? t('reactivateDoctor') : t('reactivateAssistant')}</span>
                        </button>
                      )}

                      {/* Detach / Remove Button */}
                      <button
                        onClick={() => setConfirmAction(isDoctor ? 'detach' : 'remove')}
                        className="w-full py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                      >
                        <UserMinus className="w-4 h-4 text-rose-600" />
                        <span>{isDoctor ? t('detachDoctor') : t('removeAssistant')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${containerClass} w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmAction === 'reactivate'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
                    : confirmAction === 'suspend'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {getConfirmationTitle()}
                </h4>
                <p className="text-xs text-slate-500 font-mono">{staff?.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {getConfirmationDesc()}
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={submittingAction}
                className={`px-5 py-2 rounded-xl font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                  confirmAction === 'reactivate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmAction === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingAction && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{t('confirmAction')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
