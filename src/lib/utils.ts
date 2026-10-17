import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Canonical URL resolver for Shared Medical Records (AAFIYA EMR).
 * Ensures correct environment origin, preserves #token=... fragment,
 * and strictly prevents localhost emission in production environments.
 */
export function resolveCanonicalShareUrl(
  rawUrl?: string,
  token?: string,
  options?: {
    origin?: string;
    isProduction?: boolean;
    appUrl?: string;
  }
): string {
  const rawToken = token || (rawUrl ? rawUrl.split('#token=')[1] : '');
  if (!rawToken || !rawToken.trim()) {
    throw new Error('Share token is missing or invalid');
  }

  const cleanToken = rawToken.trim();

  // Determine base origin
  let baseOrigin = options?.origin;

  if (!baseOrigin && typeof window !== 'undefined' && window.location?.origin) {
    baseOrigin = window.location.origin;
  }

  if (!baseOrigin) {
    baseOrigin = options?.appUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  }

  if (!baseOrigin && rawUrl) {
    try {
      baseOrigin = new URL(rawUrl).origin;
    } catch {
      // not a full URL
    }
  }

  const isLocalhost = Boolean(baseOrigin && (baseOrigin.includes('localhost') || baseOrigin.includes('127.0.0.1')));
  
  const isProduction = options?.isProduction !== undefined
    ? options.isProduction
    : (process.env.NODE_ENV === 'production' || 
       (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1'));

  // Strict fail-safe: In production, never permit localhost or 127.0.0.1
  if (isProduction && isLocalhost) {
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
      baseOrigin = window.location.origin;
    } else {
      baseOrigin = 'https://aafiya.site';
    }
  }

  if (!baseOrigin) {
    baseOrigin = isProduction ? 'https://aafiya.site' : 'http://localhost:3000';
  }

  const cleanOrigin = baseOrigin.trim().replace(/\/+$/, '');
  return `${cleanOrigin}/records/view#token=${cleanToken}`;
}

