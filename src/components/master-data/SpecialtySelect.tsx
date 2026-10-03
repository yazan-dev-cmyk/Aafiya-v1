'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { masterDataService, MedicalSpecialty } from '../../services/masterDataService';
import { cn } from '../../lib/utils';
import { Stethoscope, Loader2, AlertCircle } from 'lucide-react';

export interface SpecialtySelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (specialtyId: string, specialty?: MedicalSpecialty) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  icon?: React.ReactNode;
}

export const SpecialtySelect: React.FC<SpecialtySelectProps> = ({
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
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    masterDataService
      .getSpecialties()
      .then((data) => {
        if (mounted) {
          setSpecialties(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setFetchError(err?.message || t('errorSpecialties'));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    const selectedSpecialty = specialties.find(
      (s) => String(s.id) === selectedVal || s.code === selectedVal
    );
    if (onChange) {
      onChange(selectedVal, selectedSpecialty);
    }
  };

  // Resolve value to match specialty ID if code or name is passed
  const resolvedValue = React.useMemo(() => {
    if (!value) return '';
    if (value === 'all') return 'all';
    const valStr = String(value).trim();
    // Direct match by ID
    const directIdMatch = specialties.find((s) => String(s.id) === valStr);
    if (directIdMatch) return String(directIdMatch.id);
    // Match by code
    const codeMatch = specialties.find((s) => s.code.toUpperCase() === valStr.toUpperCase());
    if (codeMatch) return String(codeMatch.id);
    // Match by name
    const lower = valStr.toLowerCase();
    const nameMatch = specialties.find(
      (s) =>
        s.name_ar === valStr ||
        s.name_fr.toLowerCase() === lower ||
        s.name_en.toLowerCase() === lower
    );
    if (nameMatch) return String(nameMatch.id);
    return valStr;
  }, [value, specialties]);

  const selectId = id || (label ? `specialty-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

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
            <Stethoscope className="w-4 h-4 text-slate-400" />
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
            <option value="all">{allOptionLabel || t('allSpecialties')}</option>
          ) : (
            <option value="" disabled={required}>
              {loading ? t('loadingSpecialties') : fetchError ? t('errorSpecialties') : placeholder || t('selectSpecialty')}
            </option>
          )}

          {specialties.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {masterDataService.getLocalizedName(spec, locale)}
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
