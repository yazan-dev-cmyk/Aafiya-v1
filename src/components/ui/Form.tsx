import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label className="block text-xs font-bold text-slate-700 me-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "flex h-11 w-full appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 text-sm transition-all duration-200 font-bold",
              "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "ps-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <p className="text-[11px] font-bold text-red-600 mt-1 me-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-600" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "w-5 h-5 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary/20 focus:ring-offset-0 transition-all cursor-pointer",
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
