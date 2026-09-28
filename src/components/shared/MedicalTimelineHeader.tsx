import React from 'react';
import { History, Activity, Calendar } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '../../lib/utils';

export type MedicalTimelineRange = 'all' | 'last_30_days' | 'this_year' | 'custom';

export interface MedicalTimelineValue {
  range: MedicalTimelineRange;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

export interface MedicalTimelineHeaderProps {
  value?: MedicalTimelineValue;
  onChange?: (value: MedicalTimelineValue) => void;
  totalCount?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * MedicalTimelineHeader: Header controls for patient-centric clinical histories and medical timeline.
 * Pure presentation component - zero API calls.
 */
export const MedicalTimelineHeader: React.FC<MedicalTimelineHeaderProps> = ({
  value = { range: 'all' },
  onChange,
  totalCount,
  disabled = false,
  className,
}) => {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const currentRange = value.range || 'all';

  const handleRangeSelect = (range: MedicalTimelineRange) => {
    if (disabled || !onChange) return;
    if (range === 'custom') {
      onChange({
        range: 'custom',
        fromDate: value.fromDate || '',
        toDate: value.toDate || '',
      });
    } else {
      onChange({
        range,
        fromDate: undefined,
        toDate: undefined,
      });
    }
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !onChange) return;
    onChange({
      ...value,
      range: 'custom',
      fromDate: e.target.value,
    });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !onChange) return;
    onChange({
      ...value,
      range: 'custom',
      toDate: e.target.value,
    });
  };

  const labels = {
    title: isArabic ? 'السجل الطبي الزمني' : locale === 'fr' ? 'Chronologie médicale' : 'Medical Timeline',
    all: isArabic ? 'الكل' : locale === 'fr' ? 'Tous' : 'All',
    last30: isArabic ? 'آخر 30 يوم' : locale === 'fr' ? '30 derniers jours' : 'Last 30 Days',
    thisYear: isArabic ? 'هذه السنة' : locale === 'fr' ? 'Cette année' : 'This Year',
    custom: isArabic ? 'مخصص' : locale === 'fr' ? 'Personnalisé' : 'Custom',
    from: isArabic ? 'من' : locale === 'fr' ? 'Du' : 'From',
    to: isArabic ? 'إلى' : locale === 'fr' ? 'Au' : 'To',
  };

  const options: { id: MedicalTimelineRange; label: string }[] = [
    { id: 'all', label: labels.all },
    { id: 'last_30_days', label: labels.last30 },
    { id: 'this_year', label: labels.thisYear },
    { id: 'custom', label: labels.custom },
  ];

  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all',
        className
      )}
    >
      {/* Title & Count Badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{labels.title}</h3>
            {typeof totalCount === 'number' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                {totalCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Range Selector Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {options.map((opt) => {
            const isActive = currentRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => handleRangeSelect(opt.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {currentRange === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={value.fromDate || ''}
              onChange={handleFromDateChange}
              disabled={disabled}
              aria-label={labels.from}
              className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none"
            />
            <span className="text-slate-400 text-xs font-bold">-</span>
            <input
              type="date"
              value={value.toDate || ''}
              onChange={handleToDateChange}
              disabled={disabled}
              aria-label={labels.to}
              className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
