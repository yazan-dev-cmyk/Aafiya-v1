import React from 'react';
import { Calendar, Filter, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '../../lib/utils';

export type HistoricalPeriodType = 'today' | 'week' | 'month' | 'custom';

export interface HistoricalPeriodValue {
  period: HistoricalPeriodType;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

export interface HistoricalPeriodBarProps {
  value?: HistoricalPeriodValue;
  onChange?: (value: HistoricalPeriodValue) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * HistoricalPeriodBar: Shared period filter selector (Today, This Week, This Month, Custom Range).
 * Pure presentation component - zero API calls.
 */
export const HistoricalPeriodBar: React.FC<HistoricalPeriodBarProps> = ({
  value = { period: 'today' },
  onChange,
  disabled = false,
  className,
}) => {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const currentPeriod = value.period || 'today';

  const handlePeriodSelect = (period: HistoricalPeriodType) => {
    if (disabled || !onChange) return;
    if (period === 'custom') {
      onChange({
        period: 'custom',
        fromDate: value.fromDate || '',
        toDate: value.toDate || '',
      });
    } else {
      onChange({
        period,
        fromDate: undefined,
        toDate: undefined,
      });
    }
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !onChange) return;
    onChange({
      ...value,
      period: 'custom',
      fromDate: e.target.value,
    });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !onChange) return;
    onChange({
      ...value,
      period: 'custom',
      toDate: e.target.value,
    });
  };

  const labels = {
    today: isArabic ? 'اليوم' : locale === 'fr' ? 'Aujourd\'hui' : 'Today',
    week: isArabic ? 'هذا الأسبوع' : locale === 'fr' ? 'Cette semaine' : 'This Week',
    month: isArabic ? 'هذا الشهر' : locale === 'fr' ? 'Ce mois' : 'This Month',
    custom: isArabic ? 'فترة مخصصة' : locale === 'fr' ? 'Période personnalisée' : 'Custom Range',
    from: isArabic ? 'من' : locale === 'fr' ? 'Du' : 'From',
    to: isArabic ? 'إلى' : locale === 'fr' ? 'Au' : 'To',
  };

  const periodOptions: { id: HistoricalPeriodType; label: string }[] = [
    { id: 'today', label: labels.today },
    { id: 'week', label: labels.week },
    { id: 'month', label: labels.month },
    { id: 'custom', label: labels.custom },
  ];

  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-all',
        className
      )}
    >
      {/* Period Selection Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-slate-400 p-1 me-1 shrink-0">
          <Filter className="w-4 h-4" />
        </span>
        {periodOptions.map((opt) => {
          const isActive = currentPeriod === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodSelect(opt.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 active:scale-[0.98]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Inputs (only visible when 'custom' is active) */}
      {currentPeriod === 'custom' && (
        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 shrink-0">{labels.from}:</span>
            <input
              type="date"
              value={value.fromDate || ''}
              onChange={handleFromDateChange}
              disabled={disabled}
              aria-label={labels.from}
              className="h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-primary focus:outline-none transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 shrink-0">{labels.to}:</span>
            <input
              type="date"
              value={value.toDate || ''}
              onChange={handleToDateChange}
              disabled={disabled}
              aria-label={labels.to}
              className="h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-primary focus:outline-none transition-all disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
};
