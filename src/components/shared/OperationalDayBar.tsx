import React from 'react';
import { Calendar, Clock, RotateCcw } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface OperationalDayBarProps {
  /** YYYY-MM-DD string representation of selected date */
  selectedDate?: string;
  /** Callback when a new date is selected */
  onDateChange?: (date: string) => void;
  /** Optional title override */
  title?: string;
  /** Whether live queue indicator is visible */
  isLive?: boolean;
  /** Optional subtitle or metadata string */
  subtitle?: string;
  /** Disable interaction */
  disabled?: boolean;
  className?: string;
}

/**
 * OperationalDayBar: Shared UI bar for live operational days (Queue, Today's appointments).
 * Pure presentation component - zero API calls.
 */
export const OperationalDayBar: React.FC<OperationalDayBarProps> = ({
  selectedDate,
  onDateChange,
  title,
  isLive = true,
  subtitle,
  disabled = false,
  className,
}) => {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  // Format today's date string YYYY-MM-DD
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const activeDate = selectedDate || todayStr;
  const isTodayActive = activeDate === todayStr;

  // Format human-readable date for display
  const formattedDisplayDate = React.useMemo(() => {
    try {
      const [y, m, d] = activeDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch {
      return activeDate;
    }
  }, [activeDate, locale]);

  const handleResetToToday = () => {
    if (onDateChange && !disabled) {
      onDateChange(todayStr);
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && onDateChange && !disabled) {
      onDateChange(val);
    }
  };

  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all',
        className
      )}
    >
      {/* Left / Start: Operational Title & Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {title || (isArabic ? 'اليوم التشغيلي' : locale === 'fr' ? 'Jour d\'exploitation' : 'Operational Day')}
            </h3>
            {isLive && isTodayActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isArabic ? 'مباشر' : locale === 'fr' ? 'En direct' : 'Live'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {subtitle || formattedDisplayDate}
          </p>
        </div>
      </div>

      {/* Right / End: Date Picker & Quick Actions */}
      <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto">
        <div className="relative flex-1 md:w-48">
          <input
            type="date"
            value={activeDate}
            onChange={handleCustomDateChange}
            disabled={disabled}
            aria-label={isArabic ? 'اختر التاريخ' : 'Select date'}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-primary focus:outline-none transition-all disabled:opacity-50"
          />
        </div>

        {!isTodayActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToToday}
            disabled={disabled}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title={isArabic ? 'العودة لليوم' : 'Reset to Today'}
          >
            {isArabic ? 'اليوم' : locale === 'fr' ? 'Aujourd\'hui' : 'Today'}
          </Button>
        )}
      </div>
    </div>
  );
};
