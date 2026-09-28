import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default', 
  padding = 'md',
  className,
  ...props 
}) => {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-sm shadow-slate-900/5',
    glass: 'glass-effect border border-white/40 shadow-xl shadow-slate-900/10',
    elevated: 'bg-white border border-slate-100 shadow-xl shadow-slate-900/10',
    flat: 'bg-slate-50/50 border-none shadow-none',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-10',
  };

  return (
    <div
      className={cn(
        "rounded-[32px] transition-all duration-300",
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
