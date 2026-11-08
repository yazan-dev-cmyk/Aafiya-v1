'use client';

import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Megaphone, ExternalLink, ChevronLeft, ChevronRight, Pause, Play, ArrowRight, ArrowLeft } from 'lucide-react';
import { TickerCampaign } from '@/types/adsTicker';
import { adsTickerService } from '@/services/adsTickerService';

/**
 * Validates whether a target URL is safe for navigation.
 * - External URLs must strictly use https:// with no embedded credentials.
 * - Internal URLs must strictly start with a single '/' and contain no backslashes or traversal.
 */
export function validateTargetUrl(rawUrl: string | null | undefined): {
  isSafe: boolean;
  isExternal: boolean;
  url: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, isExternal: false, url: '' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isSafe: false, isExternal: false, url: '' };
  }

  const lower = trimmed.toLowerCase();

  // Reject dangerous schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:')
  ) {
    return { isSafe: false, isExternal: false, url: '' };
  }

  // Reject protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return { isSafe: false, isExternal: false, url: '' };
  }

  // Reject backslashes
  if (trimmed.includes('\\')) {
    return { isSafe: false, isExternal: false, url: '' };
  }

  // External URLs: strictly HTTPS only
  if (lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
        return { isSafe: true, isExternal: true, url: trimmed };
      }
    } catch {
      return { isSafe: false, isExternal: false, url: '' };
    }
    return { isSafe: false, isExternal: false, url: '' };
  }

  // Reject unencrypted HTTP external URLs
  if (lower.startsWith('http://')) {
    return { isSafe: false, isExternal: false, url: '' };
  }

  // Internal URLs: must start with a single '/' and prevent traversal
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('..')) {
      return { isSafe: false, isExternal: false, url: '' };
    }
    return { isSafe: true, isExternal: false, url: trimmed };
  }

  return { isSafe: false, isExternal: false, url: '' };
}

export interface PublicAdsTickerProps {
  embedded?: boolean;
}

export function PublicAdsTicker({ embedded = false }: PublicAdsTickerProps = {}) {
  const t = useTranslations('ticker');
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';
  const [, startTransition] = useTransition();

  const [campaigns, setCampaigns] = useState<TickerCampaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const clickedAdIdsRef = useRef<Set<string>>(new Set());

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // 2. Fetch campaigns and maintain lifecycle synchronization
  useEffect(() => {
    let isMounted = true;

    const loadCampaigns = async () => {
      const items = await adsTickerService.getPublicCampaigns();
      if (!isMounted) return;

      setCampaigns(items);
      setCurrentIndex((prev) => (items.length > 0 ? prev % items.length : 0));
    };

    loadCampaigns();

    // Re-verify on window focus / tab visibility
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadCampaigns();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic synchronization every 5 minutes (matching Backend public cache TTL)
    const intervalId = setInterval(loadCampaigns, 300000);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // Pause conditions cohesion
  const isMotionPaused = isManualPaused || isHovered || isFocused || prefersReducedMotion;

  // Build a continuous flow of campaigns that wraps seamlessly
  const displayItems = useMemo(() => {
    if (campaigns.length === 0) return [];
    if (campaigns.length === 1) {
      return [campaigns[0], campaigns[0], campaigns[0]];
    }
    if (campaigns.length === 2) {
      return [...campaigns, ...campaigns];
    }
    return campaigns;
  }, [campaigns]);

  // Proportional animation duration: ~14s per campaign item, minimum 30s
  const animationDuration = useMemo(() => {
    return Math.max(30, displayItems.length * 14);
  }, [displayItems.length]);

  // If there are no eligible campaigns, render nothing (zero DOM footprint, zero layout shift)
  if (campaigns.length === 0) {
    return null;
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % campaigns.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);
  };

  const toggleManualPause = () => {
    setIsManualPaused((prev) => !prev);
  };

  const handleCampaignNavigate = (campaign: TickerCampaign) => {
    const urlValidation = validateTargetUrl(campaign.target_url);
    if (!urlValidation.isSafe) return;

    // Non-blocking telemetry dispatch with duplicate prevention within 5s
    if (!clickedAdIdsRef.current.has(campaign.id)) {
      clickedAdIdsRef.current.add(campaign.id);
      adsTickerService.recordClick(campaign.id).catch((err) => {
        console.warn('[TickerTelemetry] Failed to record ticker click:', err);
      });
      setTimeout(() => {
        clickedAdIdsRef.current.delete(campaign.id);
      }, 5000);
    }

    // Immediate navigation (never blocked by click recording)
    if (urlValidation.isExternal) {
      window.open(urlValidation.url, '_blank', 'noopener,noreferrer');
    } else {
      startTransition(() => {
        router.push(urlValidation.url);
      });
    }
  };

  /**
   * Helper to render an individual campaign chunk within the continuous stream.
   * isClone = true marks copy as decorative for smooth infinite scrolling.
   */
  const renderCampaignItem = (campaign: TickerCampaign, isClone: boolean, keySuffix: string) => {
    const urlValidation = validateTargetUrl(campaign.target_url);
    const isClickable = urlValidation.isSafe;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleCampaignNavigate(campaign);
      }
    };

    return (
      <div
        key={`${campaign.id}-${keySuffix}`}
        tabIndex={!isClone && isClickable ? 0 : undefined}
        role={!isClone && isClickable ? 'link' : undefined}
        aria-hidden={isClone ? true : undefined}
        aria-label={!isClone && isClickable ? `${campaign.title} - ${t('openLink')}` : undefined}
        onClick={isClickable ? () => handleCampaignNavigate(campaign) : undefined}
        onKeyDown={!isClone ? handleKeyDown : undefined}
        className={`shrink-0 flex items-center pe-12 sm:pe-16 min-w-0 ${
          isClickable
            ? 'cursor-pointer group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded-md px-1 py-0.5'
            : 'cursor-default'
        } ${isClone ? 'select-none' : ''}`}
      >
        {/* Moving Campaign Emblem / Logo in front of each announcement */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 border border-white/40 shadow-xs flex items-center justify-center p-0.5 shrink-0 me-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.banner_image_url || '/logo/aafiya_emblem.png'}
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

        {/* Title (Text Only — Safe from XSS) */}
        <span className="text-xs sm:text-sm font-bold text-white shrink-0 group-hover:text-emerald-200 transition-colors">
          {campaign.title}
        </span>

        {/* Separator */}
        <span className="text-white/40 shrink-0 select-none mx-2">•</span>

        {/* Content Body (Text Only — Safe from XSS) */}
        <span className="text-xs sm:text-sm text-white/90 font-medium shrink-0 group-hover:text-white transition-colors">
          {campaign.content}
        </span>

        {/* Navigation indicator icon if clickable */}
        {isClickable && (
          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-300 group-hover:text-white shrink-0 ms-2.5 underline underline-offset-2 transition-colors">
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

        {/* Campaign delimiter star between consecutive announcements */}
        <span className="text-emerald-300/60 shrink-0 select-none ms-6 sm:ms-8 text-xs font-bold">✦</span>
      </div>
    );
  };

  return (
    <>
      {/* Scoped Keyframes for GPU-accelerated continuous movement & clean fade transitions */}
      <style>{`
        @keyframes aafiyaTickerLTR {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes aafiyaTickerRTL {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(50%, 0, 0);
          }
        }
        .aafiya-ticker-track-ltr {
          display: flex;
          align-items: center;
          width: max-content;
          will-change: transform;
          animation: aafiyaTickerLTR linear infinite;
        }
        .aafiya-ticker-track-rtl {
          display: flex;
          align-items: center;
          width: max-content;
          will-change: transform;
          animation: aafiyaTickerRTL linear infinite;
        }
      `}</style>

      <aside
        aria-label={t('ariaLabel')}
        role="region"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-gradient-to-r from-navy via-primary to-navy text-white relative z-30 select-none ${
          embedded ? 'border-b border-white/15 py-1.5 px-3 sm:px-4 shadow-2xs' : 'border-y border-white/15 py-2 px-3 sm:px-6 shadow-xs'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
          
          {/* 1. Leading Brand Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold shrink-0 shadow-xs backdrop-blur-xs select-none">
            <Megaphone className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span>{t('badge')}</span>
          </div>

          {/* 2. Center Animated Ticker Viewport with Soft Edge Fade Masks */}
          <div className="flex-1 min-w-0 overflow-hidden relative mx-1 sm:mx-2 py-0.5">
            {/* Edge fade masks */}
            {!prefersReducedMotion && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 start-0 w-6 sm:w-10 bg-gradient-to-r rtl:bg-gradient-to-l from-navy to-transparent z-10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 end-0 w-6 sm:w-10 bg-gradient-to-l rtl:bg-gradient-to-r from-navy to-transparent z-10"
                />
              </>
            )}

            {/* If reduced motion is preferred: render static authoritative copy with manual controls */}
            {prefersReducedMotion ? (
              <div className="flex items-center truncate">
                {renderCampaignItem(campaigns[currentIndex] || campaigns[0], false, 'static')}
              </div>
            ) : (
              /* Continuous Animated Horizontal Track (All Campaigns Streamed Sequentially) */
              <div
                className={isRtl ? 'aafiya-ticker-track-rtl' : 'aafiya-ticker-track-ltr'}
                style={{
                  animationDuration: `${animationDuration}s`,
                  animationPlayState: isMotionPaused ? 'paused' : 'running',
                }}
              >
                {/* Authoritative Set 1: All active campaigns */}
                {displayItems.map((camp, idx) => renderCampaignItem(camp, false, `orig-${idx}`))}

                {/* Clone Set 2: Exact mirror for seamless 50% infinite marquee loop */}
                {displayItems.map((camp, idx) => renderCampaignItem(camp, true, `clone-${idx}`))}
              </div>
            )}
          </div>

          {/* 3. Controls Toolbar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 border-s border-white/20 ps-2 sm:ps-3">
            {/* Pause / Play Control */}
            <button
              type="button"
              onClick={toggleManualPause}
              aria-label={isManualPaused ? t('play') : t('pause')}
              title={isManualPaused ? t('play') : t('pause')}
              className="p-1 sm:p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              {isManualPaused ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Manual previous / next controls when reduced motion is preferred */}
            {prefersReducedMotion && campaigns.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevious}
                  aria-label={t('previous')}
                  title={t('previous')}
                  className="p-1 sm:p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  {isRtl ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5" />
                  )}
                </button>

                <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-white/90 px-1 select-none">
                  {currentIndex + 1}/{campaigns.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={t('next')}
                  title={t('next')}
                  className="p-1 sm:p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  {isRtl ? (
                    <ChevronLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}

            {/* Active campaigns count badge in continuous mode */}
            {!prefersReducedMotion && campaigns.length > 1 && (
              <span
                className="text-[10px] sm:text-[11px] font-mono font-semibold text-white/75 px-1 select-none"
                title={`${campaigns.length} ${t('badge')}`}
              >
                {campaigns.length}
              </span>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
