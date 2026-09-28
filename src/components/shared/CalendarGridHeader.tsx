import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface CalendarGridHeaderProps {
  /** Year number (e.g. 2026) */
  year: number;
  /** Month index (1 to 12) */
  month: number;
  /** Callback for month/year changes */
  onMonthChange: (year: number, month: number) => void;
  /** Optional callback when "Today" button is clicked */
  onTodayClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * CalendarGridHeader: Shared calendar navigation header for month/year grid views.
 * Pure presentation component - zero API calls.
 */
export const CalendarGridHeader: React.FC<CalendarGridHeaderProps> = ({
  year,
  month,
  onMonthChange,
  onTodayClick,
  disabled = false,
  className,
}) => {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const isArabic = locale === 'ar';

  const monthNamesArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const formattedMonthYear = React.useMemo(() => {
    try {
      const dateObj = new Date(year, month - 1, 1);
      return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      return `${monthNamesArabic[month - 1] || month} ${year}`;
    }
  }, [year, month, locale]);

  const handlePrevMonth = () => {
    if (disabled) return;
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    if (disabled) return;
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleToday = () => {
    if (disabled) return;
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
    if (onTodayClick) {
      onTodayClick();
    }
  };

  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 flex items-center justify-between gap-4 transition-all',
        className
      )}
    >
      {/* Active Month & Year Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 capitalize">
            {formattedMonthYear}
          </h3>
        </div>
      </div>

      {/* Month Navigation Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          disabled={disabled}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {isArabic ? 'اليوم' : locale === 'fr' ? 'Aujourd\'hui' : 'Today'}
        </Button>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={isRtl ? handleNextMonth : handlePrevMonth}
            disabled={disabled}
            aria-label={isArabic ? 'الشهر السابق' : 'Previous Month'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={isRtl ? handlePrevMonth : handleNextMonth}
            disabled={disabled}
            aria-label={isArabic ? 'الشهر التالي' : 'Next Month'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
