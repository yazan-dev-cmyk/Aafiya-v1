'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RecaptchaCheckboxProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  locale?: string;
  className?: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
          hl?: string;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoaded?: () => void;
  }
}

export const RecaptchaCheckbox: React.FC<RecaptchaCheckboxProps> = ({
  siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  onVerify,
  onExpire,
  locale = 'ar',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [mockChecked, setMockChecked] = useState<boolean>(false);

  useEffect(() => {
    // If no real site key is provided in local/dev environment, enable graceful mock fallback
    if (!siteKey) {
      return;
    }

    const scriptId = 'google-recaptcha-v2-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (!window.grecaptcha || !containerRef.current) return;
      window.grecaptcha.ready(() => {
        try {
          if (containerRef.current && containerRef.current.children.length === 0) {
            widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
              sitekey: siteKey,
              callback: onVerify,
              'expired-callback': onExpire,
              theme: 'light',
              hl: locale,
            });
            setIsLoaded(true);
          }
        } catch {
          // Prevent multiple render errors
        }
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=${locale}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      renderWidget();
    }
  }, [siteKey, locale, onVerify, onExpire]);

  // Fallback interactive mock for testing / development without active Google credentials
  if (!siteKey) {
    return (
      <div className={`p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600 ${className}`}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mockChecked}
            onChange={(e) => {
              setMockChecked(e.target.checked);
              if (e.target.checked) {
                onVerify('test_recaptcha_valid_token');
              } else {
                onExpire?.();
              }
            }}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
          />
          <span className="font-bold">
            {locale === 'ar' ? 'أنا لست روبوت (وضع الاختبار المحلي)' : 'I am not a robot (Test Mode)'}
          </span>
        </label>
        <div className="flex flex-col items-center text-[10px] text-slate-400">
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          <span>reCAPTCHA</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-2 flex justify-center ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};
