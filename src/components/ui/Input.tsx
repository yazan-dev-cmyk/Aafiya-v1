import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label className="block text-xs font-bold text-slate-700 me-1">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Leading Icon (if password + icon passed) */}
          {isPassword && icon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}

          {/* Trailing Icon (if non-password + icon passed) */}
          {!isPassword && icon && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}

          <input
            type={effectiveType}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm transition-all duration-200",
              "placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
              "disabled:cursor-not-allowed disabled:opacity-50 font-bold",
              !isPassword && icon && "pe-12",
              isPassword && icon && "ps-10 pe-10",
              isPassword && !icon && "pe-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          />

          {/* Password Toggle Button */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
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

Input.displayName = 'Input';

