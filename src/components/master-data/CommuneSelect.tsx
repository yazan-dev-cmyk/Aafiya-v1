'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { masterDataService, Commune } from '../../services/masterDataService';
import { cn } from '../../lib/utils';
import { Building2, Loader2, AlertCircle } from 'lucide-react';

export interface CommuneSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  wilayaCode?: string;
  value?: string;
  onChange?: (communeCode: string, commune?: Commune) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  icon?: React.ReactNode;
}

export const CommuneSelect: React.FC<CommuneSelectProps> = ({
  wilayaCode = '',
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
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const previousWilayaRef = useRef<string>(wilayaCode);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const isWilayaSelected = Boolean(wilayaCode && wilayaCode.trim() !== '' && wilayaCode !== 'all');
  const isControlDisabled = disabled || !isWilayaSelected || loading;

  useEffect(() => {
    // If wilayaCode changed, reset commune selection if it does not belong to new Wilaya
    if (previousWilayaRef.current !== wilayaCode) {
      previousWilayaRef.current = wilayaCode;
      if (valueRef.current && onChangeRef.current) {
        onChangeRef.current('', undefined);
      }
    }

    if (!wilayaCode || wilayaCode.trim() === '' || wilayaCode === 'all') {
      setCommunes([]);
      setLoading(false);
      setFetchError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setFetchError(null);

    masterDataService
      .getCommunes(wilayaCode)
      .then((data) => {
        if (mounted) {
          setCommunes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setFetchError(err?.message || t('errorCommunes'));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [wilayaCode, t]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const selectedCommune = communes.find((c) => c.code === selectedCode);
    if (onChange) {
      onChange(selectedCode, selectedCommune);
    }
  };

  // Resolve value to match a commune code or name
  const resolvedValue = React.useMemo(() => {
    if (!value) return '';
    if (value === 'all') return 'all';
    const directMatch = communes.find((c) => c.code === value);
    if (directMatch) return directMatch.code;
    const trimmed = value.trim().toLowerCase();
    const nameMatch = communes.find(
      (c) =>
        c.name_ar === value.trim() ||
        c.name_fr.toLowerCase() === trimmed ||
        c.name_en.toLowerCase() === trimmed
    );
    if (nameMatch) return nameMatch.code;
    return value;
  }, [value, communes]);

  const selectId = id || (label ? `commune-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

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
            <Building2 className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <select
          id={selectId}
          value={resolvedValue}
          onChange={handleChange}
          disabled={isControlDisabled}
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
            <option value="all">{allOptionLabel || t('allCommunes')}</option>
          ) : (
            <option value="" disabled={required}>
              {!isWilayaSelected
                ? t('selectWilayaFirst')
                : loading
                ? t('loadingCommunes')
                : fetchError
                ? t('errorCommunes')
                : communes.length === 0
                ? t('noCommunes')
                : placeholder || t('selectCommune')}
            </option>
          )}

          {communes.map((commune) => (
            <option key={commune.code} value={commune.code}>
              {masterDataService.getLocalizedName(commune, locale)}
              {commune.postal_code ? ` (${commune.postal_code})` : ''}
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
