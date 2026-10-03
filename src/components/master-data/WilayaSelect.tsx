'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { masterDataService, Wilaya } from '../../services/masterDataService';
import { cn } from '../../lib/utils';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

export interface WilayaSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (wilayaCode: string, wilaya?: Wilaya) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  icon?: React.ReactNode;
}

export const WilayaSelect: React.FC<WilayaSelectProps> = ({
  value = '',
  onChange,
  label,
  error,
  placeholder,
  includeAllOption = false,
  allOptionLabel,
  disabled = false,
  className,
  id,
  required,
  icon,
  ...props
}) => {
  const locale = useLocale();
  const t = useTranslations('masterData');
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    masterDataService
      .getWilayas()
      .then((data) => {
        if (mounted) {
          setWilayas(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setFetchError(err?.message || t('errorWilayas'));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const selectedWilaya = wilayas.find((w) => w.code === selectedCode);
    if (onChange) {
      onChange(selectedCode, selectedWilaya);
    }
  };

  // Resolve value to match a code if a legacy name or alias is passed
  const resolvedValue = React.useMemo(() => {
    if (!value) return '';
    if (value === 'all') return 'all';
    const directMatch = wilayas.find((w) => w.code === value);
    if (directMatch) return directMatch.code;
    const trimmed = value.trim().toLowerCase();
    const nameMatch = wilayas.find(
      (w) =>
        w.name_ar === value.trim() ||
        w.name_fr.toLowerCase() === trimmed ||
        w.name_en.toLowerCase() === trimmed
    );
    if (nameMatch) return nameMatch.code;
    return value;
  }, [value, wilayas]);

  const selectId = id || (label ? `wilaya-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-start">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-700 me-1">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Leading Icon or Loading Indicator */}
        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : fetchError ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : icon !== undefined ? (
            icon
          ) : (
            <MapPin className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <select
          id={selectId}
          value={resolvedValue}
          onChange={handleChange}
          disabled={disabled || loading}
          required={required}
          className={cn(
            'flex h-11 w-full rounded-xl border-2 border-slate-200 bg-white ps-10 pe-8 text-sm font-bold text-slate-900 transition-all duration-200 cursor-pointer appearance-none',
            'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-60',
            (error || fetchError) && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          {...props}
        >
          {includeAllOption ? (
            <option value="all">{allOptionLabel || t('allWilayas')}</option>
          ) : (
            <option value="" disabled={required}>
              {loading ? t('loadingWilayas') : fetchError ? t('errorWilayas') : placeholder || t('selectWilaya')}
            </option>
          )}

          {wilayas.map((wilaya) => (
            <option key={wilaya.code} value={wilaya.code}>
              {wilaya.code} - {masterDataService.getLocalizedName(wilaya, locale)}
            </option>
          ))}
        </select>

        {/* Custom Trailing Chevron */}
        <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {(error || fetchError) && (
        <p className="text-xs font-semibold text-red-500 mt-1">
          {error || fetchError}
        </p>
      )}
    </div>
  );
};
