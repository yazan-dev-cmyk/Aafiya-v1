'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  TickerCampaign,
  TickerPlacement,
  AdDestination,
  AdAudience,
  TICKER_DESTINATIONS,
  TICKER_AUDIENCES,
} from '../../../types/adsTicker';
import { adminAdsTickerService } from '../../../services/adminAdsTickerService';
import { ApiError } from '../../../lib/api';

interface ManagePlacementsModalProps {
  isOpen: boolean;
  campaign: TickerCampaign | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ManagePlacementsModal({
  isOpen,
  campaign,
  onClose,
  onChanged,
}: ManagePlacementsModalProps) {
  const t = useTranslations('admin.adsTicker');
  const [placements, setPlacements] = useState<TickerPlacement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPlacementId, setDeletingPlacementId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New placement fields
  const [destination, setDestination] = useState<AdDestination>('ticker');
  const [audience, setAudience] = useState<AdAudience>('patient');

  // Confirmation dialog state for removal
  const [placementToRemove, setPlacementToRemove] = useState<TickerPlacement | null>(null);

  const fetchPlacements = async () => {
    if (!campaign) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminAdsTickerService.getPlacements(campaign.id);
      if (res.data) {
        setPlacements(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('errors.fetchPlacementsFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (campaign && isOpen) {
      fetchPlacements();
      setErrorMessage(null);
      setSuccessMessage(null);
      setPlacementToRemove(null);
    }
  }, [campaign, isOpen]);

  if (!isOpen || !campaign) return null;

  const handleAddPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Prevent duplicate placement submission on the frontend
    const isDuplicate = placements.some(
      (p) => p.destination === destination && p.audience === audience
    );
    if (isDuplicate) {
      setErrorMessage(t('errors.duplicatePlacement'));
      return;
    }

    setIsSubmitting(true);
    try {
      await adminAdsTickerService.addPlacement(campaign.id, { destination, audience });
      setSuccessMessage(t('placementsModal.addedSuccess'));
      await fetchPlacements();
      onChanged();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || t('errors.unknown'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePlacement = async () => {
    if (!placementToRemove) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingPlacementId(placementToRemove.id);

    try {
      await adminAdsTickerService.removePlacement(campaign.id, placementToRemove.id);
      setSuccessMessage(t('placementsModal.removedSuccess'));
      setPlacementToRemove(null);
      await fetchPlacements();
      onChanged();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || t('errors.unknown'));
      }
    } finally {
      setDeletingPlacementId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('placementsModal.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {campaign.title}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add Placement Form */}
          <form
            onSubmit={handleAddPlacement}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-teal-500" />
              <span>{t('placementsModal.addNewPlacement')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('placementsModal.destination')}
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value as AdDestination)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {TICKER_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t(`destinations.${d}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('placementsModal.audience')}
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as AdAudience)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {TICKER_AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {t(`audiences.${a}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{t('placementsModal.addBtn')}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Active Placements Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('placementsModal.currentPlacements')} ({placements.length})
            </h3>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                <span>{t('loading')}</span>
              </div>
            ) : placements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                {t('placementsModal.empty')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {placements.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">
                        {p.destination === 'ticker' ? 'T' : 'B'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {t(`destinations.${p.destination}`)}
                          </span>
                          <span className="text-slate-400 text-xs">→</span>
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-teal-800/50">
                            {t(`audiences.${p.audience}`)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {p.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingPlacementId === p.id}
                      onClick={() => setPlacementToRemove(p)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                      title={t('placementsModal.deletePlacementTooltip')}
                    >
                      {deletingPlacementId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Dialog Overlay for Delete */}
        {placementToRemove && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 z-10">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('placementsModal.confirmDeleteTitle')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('placementsModal.confirmDeletePrompt', {
                    destination: t(`destinations.${placementToRemove.destination}`),
                    audience: t(`audiences.${placementToRemove.audience}`),
                  })}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPlacementToRemove(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePlacement}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  {t('placementsModal.confirmDeleteBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 text-xs font-semibold transition-all"
          >
            {t('form.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
