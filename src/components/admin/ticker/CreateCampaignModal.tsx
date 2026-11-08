'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2, AlertCircle, Loader2, Calendar, Target, Layers } from 'lucide-react';
import {
  AdDestination,
  AdAudience,
  AdCampaignStatus,
  TICKER_DESTINATIONS,
  TICKER_AUDIENCES,
  TICKER_STATUSES,
  CreateTickerCampaignPayload,
} from '../../../types/adsTicker';
import { adminAdsTickerService } from '../../../services/adminAdsTickerService';
import { ApiError } from '../../../lib/api';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const t = useTranslations('admin.adsTicker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [status, setStatus] = useState<AdCampaignStatus>('active');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');

  // Placements State (Default to ticker:public)
  const [placements, setPlacements] = useState<Array<{ destination: AdDestination; audience: AdAudience }>>([
    { destination: 'ticker', audience: 'public' },
  ]);
  const [newDest, setNewDest] = useState<AdDestination>('ticker');
  const [newAudience, setNewAudience] = useState<AdAudience>('patient');

  if (!isOpen) return null;

  const showError = (msg: string) => {
    setErrorMessage(msg);
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPlacement = () => {
    const exists = placements.some((p) => p.destination === newDest && p.audience === newAudience);
    if (exists) {
      showError(t('errors.duplicatePlacement'));
      return;
    }
    setErrorMessage(null);
    setPlacements((prev) => [...prev, { destination: newDest, audience: newAudience }]);
  };

  const handleRemovePlacement = (index: number) => {
    setPlacements((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Convert Algiers local input string to UTC ISO
  const algiersToUtcIso = (localStr: string): string | null => {
    if (!localStr || !localStr.trim()) return null;
    const trimmed = localStr.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2}))?$/);
    if (!match) {
      throw new Error('invalid_date');
    }
    const base = match[1];
    const sec = match[2] || '00';
    const dt = new Date(`${base}:${sec}+01:00`);
    if (isNaN(dt.getTime())) {
      throw new Error('invalid_date');
    }
    return dt.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      showError(t('form.errors.titleRequired'));
      return;
    }
    if (!content.trim()) {
      showError(t('form.errors.contentRequired'));
      return;
    }
    if (placements.length === 0) {
      showError(t('form.errors.placementRequired'));
      return;
    }

    let startsAtUtc: string | null = null;
    let endsAtUtc: string | null = null;
    try {
      startsAtUtc = algiersToUtcIso(startsAtLocal);
      endsAtUtc = algiersToUtcIso(endsAtLocal);
    } catch {
      showError(t('form.errors.endsAfterStarts'));
      return;
    }

    if (startsAtUtc && endsAtUtc && new Date(endsAtUtc) <= new Date(startsAtUtc)) {
      showError(t('form.errors.endsAfterStarts'));
      return;
    }

    const payload: CreateTickerCampaignPayload = {
      title: title.trim(),
      content: content.trim(),
      banner_image_url: bannerImageUrl.trim() || null,
      target_url: targetUrl.trim() || null,
      priority: Number(priority),
      status,
      starts_at: startsAtUtc,
      ends_at: endsAtUtc,
      placements,
    };

    setIsSubmitting(true);
    try {
      await adminAdsTickerService.createCampaign(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.errors) {
          const firstErrKey = Object.keys(err.errors)[0];
          showError(err.errors[firstErrKey]?.[0] || err.message);
        } else {
          showError(err.message);
        }
      } else {
        showError(err.message || t('errors.unknown'));
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
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('createModal.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('createModal.subtitle')}
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
        <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('form.titlePlaceholder')}
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
              rows={3}
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('form.contentPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Target URL & Banner Image */}
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

          {/* Initial Placements Builder */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Layers className="w-4 h-4 text-teal-500" />
                <span>{t('form.placementsTitle')}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {t('form.minOnePlacementRequired')}
              </span>
            </div>

            {/* List of currently selected placements */}
            <div className="flex flex-wrap gap-2">
              {placements.map((p, idx) => (
                <div
                  key={`${p.destination}-${p.audience}-${idx}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-xs text-teal-900 dark:text-teal-200"
                >
                  <span className="font-semibold">{t(`destinations.${p.destination}`)}</span>
                  <span className="text-teal-400">/</span>
                  <span>{t(`audiences.${p.audience}`)}</span>
                  {placements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlacement(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Placement Row */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="sm:col-span-2">
                <select
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value as AdDestination)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {TICKER_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t(`destinations.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as AdAudience)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {TICKER_AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {t(`audiences.${a}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddPlacement}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('form.addPlacementBtn')}</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold truncate">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{errorMessage}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
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
                <span>{t('form.createSubmitBtn')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
