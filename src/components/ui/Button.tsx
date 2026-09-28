import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, icon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]',
      secondary: 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 hover:bg-secondary/90 active:scale-[0.98]',
      outline: 'bg-transparent border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
      danger: 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98]',
      success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-9 px-4 text-xs font-bold rounded-lg',
      md: 'h-11 px-6 text-sm font-bold rounded-xl',
      lg: 'h-14 px-8 text-base font-bold rounded-2xl',
      icon: 'w-11 h-11 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans tracking-tight',
          fullWidth && 'w-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
