'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Mail,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  RotateCw,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { clinicService, ClinicDoctorInvitation } from '@/services/clinicService';

interface DoctorInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationAccepted?: (acceptedInvitation: ClinicDoctorInvitation) => void;
  isDarkMode?: boolean;
}

export const DoctorInvitationsModal: React.FC<DoctorInvitationsModalProps> = ({
  isOpen,
  onClose,
  onInvitationAccepted,
  isDarkMode = false,
}) => {
  const t = useTranslations('doctor.invitations');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [invitations, setInvitations] = useState<ClinicDoctorInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clinicService.getMyInvitations();
      if (res.data) {
        setInvitations(res.data);
      } else {
        setInvitations([]);
      }
    } catch (err: any) {
      setError(err?.message || (isRtl ? 'تعذر جلب دعوات العيادات' : 'Failed to fetch clinic invitations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = async (invitation: ClinicDoctorInvitation) => {
    setActionInProgressId(invitation.id);
    setActionType('accept');
    setError(null);
    setSuccessMessage(null);
    try {
      await clinicService.acceptInvitation(invitation.id);
      setSuccessMessage(t('acceptSuccess'));
      await fetchInvitations();
      if (onInvitationAccepted) {
        onInvitationAccepted(invitation);
      }
    } catch (err: any) {
      setError(err?.message || (isRtl ? 'فشل قبول الدعوة' : 'Failed to accept invitation'));
    } finally {
      setActionInProgressId(null);
      setActionType(null);
    }
  };

  const handleReject = async (invitation: ClinicDoctorInvitation) => {
    setActionInProgressId(invitation.id);
    setActionType('reject');
    setError(null);
    setSuccessMessage(null);
    try {
      await clinicService.rejectInvitation(invitation.id);
      setSuccessMessage(t('rejectSuccess'));
      await fetchInvitations();
    } catch (err: any) {
      setError(err?.message || (isRtl ? 'فشل رفض الدعوة' : 'Failed to reject invitation'));
    } finally {
      setActionInProgressId(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            {t('statusPending')}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            {t('statusAccepted')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            {t('statusRejected')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {t('statusCancelled')}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            {t('statusExpired')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  const containerBg = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900 shadow-xl';

  const cardBg = isDarkMode
    ? 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
    : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitations-modal-title"
    >
      <div className={`${containerBg} rounded-3xl border max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl transition-all`}>
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 id="invitations-modal-title" className="text-base sm:text-lg font-black tracking-tight">
                {t('title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Alert Banner */}
        {successMessage && (
          <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">{isRtl ? 'جاري تحميل الدعوات...' : 'Loading invitations...'}</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {t('noInvitations')}
              </p>
            </div>
          ) : (
            invitations.map((inv) => {
              const isPending = inv.status === 'pending';
              const isActioningThis = actionInProgressId === inv.id;

              return (
                <div
                  key={inv.id}
                  className={`${cardBg} rounded-2xl p-4 sm:p-5 border transition-all space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-black">
                          {inv.clinic?.name || (isRtl ? 'عيادة طبية' : 'Medical Clinic')}
                        </h3>
                      </div>
                      {(inv.clinic?.wilaya || inv.clinic?.address) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {[inv.clinic.wilaya, inv.clinic.address].filter(Boolean).join(' — ')}
                          </span>
                        </div>
                      )}
                      {inv.clinic?.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span dir="ltr">{inv.clinic.phone}</span>
                        </div>
                      )}
                    </div>
                    <div>{getStatusBadge(inv.status)}</div>
                  </div>

                  {/* Position & Dates Row */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t('positionLabel')}:</span>
                      <strong className="font-bold text-slate-800 dark:text-slate-200">
                        {inv.position === 'director'
                          ? (isRtl ? 'طبيب مدير' : 'Clinic Director')
                          : (isRtl ? 'طبيب ممارس' : 'Employed Doctor')}
                      </strong>
                    </div>

                    {inv.created_at && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{t('sentDate')}: {new Date(inv.created_at).toLocaleDateString(locale)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes if any */}
                  {inv.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 italic">
                      &quot;{inv.notes}&quot;
                    </div>
                  )}

                  {/* Actions for Pending */}
                  {isPending && (
                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleReject(inv)}
                        disabled={isActioningThis}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isActioningThis && actionType === 'reject' ? t('rejecting') : t('rejectBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(inv)}
                        disabled={isActioningThis}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {isActioningThis && actionType === 'accept' ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{t('accepting')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('acceptBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={fetchInvitations}
            disabled={loading}
            className="text-xs font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isRtl ? 'تحديث القائمة' : 'Refresh List'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
