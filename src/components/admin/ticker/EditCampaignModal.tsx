'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Edit, AlertCircle, Loader2, Calendar } from 'lucide-react';
import {
  TickerCampaign,
  AdCampaignStatus,
  TICKER_STATUSES,
  UpdateTickerCampaignPayload,
} from '../../../types/adsTicker';
import { adminAdsTickerService } from '../../../services/adminAdsTickerService';
import { ApiError } from '../../../lib/api';

interface EditCampaignModalProps {
  isOpen: boolean;
  campaign: TickerCampaign | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCampaignModal({ isOpen, campaign, onClose, onSuccess }: EditCampaignModalProps) {
  const t = useTranslations('admin.adsTicker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [status, setStatus] = useState<AdCampaignStatus>('active');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');

  // Helper to convert UTC ISO timestamp to Algiers local datetime-local string
  const utcIsoToAlgiersLocal = (isoStr: string | null): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      // Algiers is UTC+1 (offset +60 mins)
      const algiersMs = d.getTime() + 60 * 60 * 1000;
      return new Date(algiersMs).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Helper to convert Algiers local input string to UTC ISO
  const algiersToUtcIso = (localStr: string): string | null => {
    if (!localStr) return null;
    try {
      const dt = new Date(`${localStr}:00+01:00`);
      return dt.toISOString();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || '');
      setContent(campaign.content || '');
      setBannerImageUrl(campaign.banner_image_url || '');
      setTargetUrl(campaign.target_url || '');
      setPriority(campaign.priority ?? 0);
      setStatus(campaign.status || 'active');
      setStartsAtLocal(utcIsoToAlgiersLocal(campaign.starts_at));
      setEndsAtLocal(utcIsoToAlgiersLocal(campaign.ends_at));
      setErrorMessage(null);
    }
  }, [campaign]);

  if (!isOpen || !campaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage(t('form.errors.titleRequired'));
      return;
    }
    if (!content.trim()) {
      setErrorMessage(t('form.errors.contentRequired'));
      return;
    }

    const startsAtUtc = algiersToUtcIso(startsAtLocal);
    const endsAtUtc = algiersToUtcIso(endsAtLocal);

    if (startsAtUtc && endsAtUtc && new Date(endsAtUtc) <= new Date(startsAtUtc)) {
      setErrorMessage(t('form.errors.endsAfterStarts'));
      return;
    }

    const payload: UpdateTickerCampaignPayload = {
      title: title.trim(),
      content: content.trim(),
      banner_image_url: bannerImageUrl.trim() || null,
      target_url: targetUrl.trim() || null,
      priority: Number(priority),
      status,
      starts_at: startsAtUtc,
      ends_at: endsAtUtc,
    };

    setIsSubmitting(true);
    try {
      await adminAdsTickerService.updateCampaign(campaign.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.errors) {
          const firstErrKey = Object.keys(err.errors)[0];
          setErrorMessage(err.errors[firstErrKey]?.[0] || err.message);
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(err.message || t('errors.unknown'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('editModal.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('editModal.subtitle', { id: campaign.id.slice(0, 8) })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('form.title')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('form.priority')}
              </label>
              <input
                type="number"
                min={-1000}
                max={1000}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-center font-mono"
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('form.content')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Target URL & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('form.targetUrl')}
              </label>
              <input
                type="text"
                maxLength={1000}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="/clinics or https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('form.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdCampaignStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                {TICKER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {t(`statuses.${st}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('form.bannerImageUrl')}
            </label>
            <input
              type="text"
              maxLength={1000}
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Scheduling (Algiers Timezone UTC+1) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-teal-500" />
                <span>{t('form.schedulingTitle')}</span>
              </div>
              <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/50 dark:border-teal-800/50">
                Africa/Algiers (UTC+1)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('form.startsAt')} ({t('form.inclusive')})
                </label>
                <input
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={(e) => setStartsAtLocal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('form.endsAt')} ({t('form.exclusive')})
                </label>
                <input
                  type="datetime-local"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
            >
              {t('form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('form.saveChangesBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
