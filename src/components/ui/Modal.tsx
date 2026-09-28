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
    full: 'max-w-[95vw] h-[90vh]',
  };

  const positions = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
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
            "fixed inset-0 z-50 flex p-4 pointer-events-none",
            positions[position]
          )}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? -20 : 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? -20 : 20 }}
              className={cn(
                "w-full bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-white/20",
                sizes[size],
                className
              )}
            >
              {/* Header */}
              <div className="px-8 py-6 flex items-start justify-between border-b border-slate-100 bg-white/50 backdrop-blur-md">
                <div className="space-y-1">
                  {title && (
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
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
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
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
