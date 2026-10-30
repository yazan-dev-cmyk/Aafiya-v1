'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '../../lib/utils';

export interface LockedActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLocked?: boolean;
  onLockedClick?: () => void;
  noticePosition?: 'top' | 'bottom';
  showNoticeOnHover?: boolean;
  lockIconClassName?: string;
  tooltipClassName?: string;
}

export const LockedActionButton = React.forwardRef<HTMLButtonElement, LockedActionButtonProps>(
  (
    {
      children,
      className,
      isLocked = true,
      onClick,
      onLockedClick,
      noticePosition = 'top',
      showNoticeOnHover = true,
      lockIconClassName,
      tooltipClassName,
      disabled,
      title,
      ...props
    },
    ref
  ) => {
    const t = useTranslations('common');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const noticeText = t('featureLockedNotice');

    const [showNotice, setShowNotice] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerNotice = () => {
      setShowNotice(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setShowNotice(false);
      }, 3500);
      if (onLockedClick) {
        onLockedClick();
      }
    };

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    if (!isLocked) {
      return (
        <button
          ref={ref}
          onClick={onClick}
          disabled={disabled}
          className={className}
          title={title}
          {...props}
        >
          {children}
        </button>
      );
    }

    const handleContainerClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerNotice();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        triggerNotice();
      }
    };

    return (
      <div
        className="relative inline-flex items-center"
        onClick={handleContainerClick}
        onMouseEnter={() => {
          if (showNoticeOnHover) triggerNotice();
        }}
        onMouseLeave={() => setShowNotice(false)}
      >
        <button
          ref={ref}
          type="button"
          tabIndex={0}
          aria-disabled="true"
          aria-description={noticeText}
          onKeyDown={handleKeyDown}
          title={title || noticeText}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 cursor-not-allowed opacity-65 select-none transition-all',
            'border border-amber-300/40 hover:border-amber-400/60 bg-amber-50/20',
            className
          )}
          {...props}
        >
          <Lock className={cn('w-3.5 h-3.5 shrink-0 text-amber-500', lockIconClassName)} />
          {children}
        </button>

        {/* Floating Localized Administrative Notice */}
        {showNotice && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'absolute z-50 px-3 py-1.5 rounded-xl shadow-lg border text-xs font-medium whitespace-nowrap',
              'bg-slate-900 text-white border-slate-700/80 shadow-slate-950/40 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150',
              noticePosition === 'top' ? 'bottom-full mb-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2' : 'top-full mt-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
              tooltipClassName
            )}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{noticeText}</span>
          </div>
        )}
      </div>
    );
  }
);

LockedActionButton.displayName = 'LockedActionButton';
