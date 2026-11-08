'use client';

import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Megaphone, ExternalLink, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { TickerCampaign } from '@/types/adsTicker';
import { adsTickerService } from '@/services/adsTickerService';
import { validateTargetUrl } from './PublicAdsTicker';

const STORAGE_KEY = 'aafiya_admin_dismissed_tickers';

export function AdminMultiTickerStack() {
  const t = useTranslations('ticker');
  const tAudiences = useTranslations('admin.adsTicker.audiences');
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';
  const [, startTransition] = useTransition();

  const [campaigns, setCampaigns] = useState<TickerCampaign[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const clickedAdIdsRef = useRef<Set<string>>(new Set());

  // 1. Load dismissed IDs from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDismissedIds(parsed);
        }
      }
    } catch (e) {
      console.warn('[AdminMultiTickerStack] Failed to read dismissed tickers:', e);
    }
  }, []);

  // 2. Fetch campaigns and sync periodically
  useEffect(() => {
    let isMounted = true;

    const loadCampaigns = async () => {
      try {
        const items = await adsTickerService.getPublicCampaigns();
        if (isMounted) {
          setCampaigns(items);
        }
      } catch (err) {
        console.warn('[AdminMultiTickerStack] Failed to load campaigns:', err);
      }
    };

    loadCampaigns();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadCampaigns();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = setInterval(loadCampaigns, 300000);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // 3. Filter out dismissed campaigns
  const visibleCampaigns = useMemo(() => {
    return campaigns.filter((camp) => !dismissedIds.includes(camp.id));
  }, [campaigns, dismissedIds]);

  // If no visible campaigns, zero DOM footprint
  if (visibleCampaigns.length === 0) {
    return null;
  }

  // 4. Handle dismiss button [x]
  const handleDismiss = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextDismissed = [...dismissedIds, campaignId];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextDismissed));
      setDismissedIds(nextDismissed);
    } catch (err) {
      console.warn('[AdminMultiTickerStack] Failed to dismiss ticker:', err);
    }
  };

  // 5. Handle campaign click / navigation
  const handleCampaignNavigate = (campaign: TickerCampaign) => {
    const urlValidation = validateTargetUrl(campaign.target_url);
    if (!urlValidation.isSafe) return;

    if (!clickedAdIdsRef.current.has(campaign.id)) {
      clickedAdIdsRef.current.add(campaign.id);
      adsTickerService.recordClick(campaign.id).catch((err) => {
        console.warn('[AdminMultiTickerStack] Failed to record ticker click:', err);
      });
      setTimeout(() => {
        clickedAdIdsRef.current.delete(campaign.id);
      }, 5000);
    }

    if (urlValidation.isExternal) {
      window.open(urlValidation.url, '_blank', 'noopener,noreferrer');
    } else {
      startTransition(() => {
        router.push(urlValidation.url);
      });
    }
  };

  // Helper to extract audience name and badge color
  const getAudienceInfo = (camp: TickerCampaign): { label: string; colorClass: string } => {
    const placement =
      camp.placements?.find((p) => p.destination === 'ticker') ||
      camp.placements?.[0];
    const aud = placement?.audience || 'all';

    let label: string = aud.replace(/_/g, ' ');
    if (tAudiences.has(aud)) {
      label = tAudiences(aud as any);
    }

    let colorClass = 'bg-slate-700/80 text-slate-200 border-slate-600/50';
    switch (aud) {
      case 'doctor':
      case 'doctor_assistant':
        colorClass = 'bg-sky-500/20 text-sky-200 border-sky-400/40';
        break;
      case 'patient':
        colorClass = 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
        break;
      case 'public':
        colorClass = 'bg-slate-500/20 text-slate-200 border-slate-400/40';
        break;
      case 'booking_center':
        colorClass = 'bg-amber-500/20 text-amber-200 border-amber-400/40';
        break;
      case 'lab':
      case 'lab_assistant':
        colorClass = 'bg-purple-500/20 text-purple-200 border-purple-400/40';
        break;
      case 'radiology':
      case 'rad_assistant':
        colorClass = 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40';
        break;
      case 'all':
        colorClass = 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40';
        break;
      default:
        colorClass = 'bg-slate-700/80 text-slate-200 border-slate-600/50';
    }

    return { label, colorClass };
  };

  return (
    <div
      aria-label="Admin Ticker Previews"
      className="w-full flex flex-col space-y-1 bg-slate-950/90 border-b border-slate-800 z-30 select-none shadow-xs"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {visibleCampaigns.map((camp) => {
        const urlValidation = validateTargetUrl(camp.target_url);
        const isClickable = urlValidation.isSafe;
        const { label: audienceLabel, colorClass: audienceColorClass } = getAudienceInfo(camp);

        return (
          <div
            key={camp.id}
            className={`w-full py-1.5 px-3 sm:px-6 flex items-center justify-between gap-3 text-white transition-colors bg-gradient-to-r from-navy via-slate-900 to-navy border-b border-white/5 last:border-b-0 ${
              isClickable ? 'cursor-pointer hover:bg-slate-800/80 group' : ''
            }`}
            onClick={isClickable ? () => handleCampaignNavigate(camp) : undefined}
          >
            {/* Left: Badge + Logo + Content */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              {/* Audience Target Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border shrink-0 ${audienceColorClass}`}
                title={`Target: ${audienceLabel}`}
              >
                <Megaphone className="w-3 h-3 shrink-0" />
                <span>{audienceLabel}</span>
              </div>

              {/* Logo / Emblem */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/95 border border-white/40 shadow-xs flex items-center justify-center p-0.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={camp.banner_image_url || '/logo/aafiya_emblem.png'}
                  alt="Aafiya"
                  aria-hidden="true"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith('/logo/aafiya_emblem.png')) {
                      target.src = '/logo/aafiya_emblem.png';
                    }
                  }}
                />
              </div>

              {/* Title & Body */}
              <div className="flex items-center gap-2 truncate text-xs sm:text-sm">
                <span className="font-bold text-white shrink-0 group-hover:text-teal-200 transition-colors">
                  {camp.title}
                </span>
                <span className="text-white/40 shrink-0">•</span>
                <span className="text-white/80 font-normal truncate group-hover:text-white transition-colors">
                  {camp.content}
                </span>
              </div>

              {/* Link indicator */}
              {isClickable && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-300 shrink-0 underline underline-offset-2">
                  <span>{t('openLink')}</span>
                  {urlValidation.isExternal ? (
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  ) : isRtl ? (
                    <ArrowLeft className="w-3 h-3 shrink-0" />
                  ) : (
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  )}
                </span>
              )}
            </div>

            {/* Right: Close/Dismiss Button [×] */}
            <div className="flex items-center shrink-0 ps-2">
              <button
                type="button"
                onClick={(e) => handleDismiss(camp.id, e)}
                title={isRtl ? 'إخفاء هذا الإعلان من الشريط' : 'Dismiss this announcement'}
                aria-label={isRtl ? 'إخفاء هذا الإعلان من الشريط' : 'Dismiss this announcement'}
                className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
