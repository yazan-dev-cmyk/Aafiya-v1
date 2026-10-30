import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'center',
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[90vh] sm:h-[90dvh]',
  };

  const positions = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-3 sm:pt-20',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className={cn(
            "fixed inset-0 z-50 flex p-2 sm:p-4 pointer-events-none overflow-y-auto",
            positions[position]
          )}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? -20 : 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? -20 : 20 }}
              className={cn(
                "w-full bg-white rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-white/20",
                "max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]",
                "max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2.5rem)]",
                position === 'center' ? 'my-auto' : 'my-0',
                sizes[size],
                className
              )}
            >
              {/* Header */}
              <div className="px-4 py-3.5 sm:px-8 sm:py-6 flex items-start justify-between border-b border-slate-100 bg-white/50 backdrop-blur-md shrink-0">
                <div className="space-y-1 pe-3">
                  {title && (
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-8 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-4 py-3 sm:px-8 sm:py-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
