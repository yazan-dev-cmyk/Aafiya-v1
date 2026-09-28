import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: React.ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  icon,
  dot,
  className,
  ...props 
}) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-600/5',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-600/5',
    error: 'bg-red-50 text-red-700 border-red-200/60 shadow-sm shadow-red-600/5',
    info: 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm shadow-blue-600/5',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200 shadow-sm shadow-slate-600/5',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black whitespace-nowrap tracking-wider uppercase",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
};
