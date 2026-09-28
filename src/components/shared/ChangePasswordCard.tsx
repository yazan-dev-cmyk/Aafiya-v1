'use client';

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { authService } from '@/services/authService';

interface ChangePasswordCardProps {
  isRtl?: boolean;
  isDarkMode?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({
  isRtl = true,
  isDarkMode = false,
  className = '',
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage(isRtl ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(isRtl ? 'كلمة المرور الجديدة يجب أن تتكون من 8 محارف على الأقل.' : 'New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(isRtl ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' : 'New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage(isRtl ? 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.' : 'New password must be different from current password.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      setSuccessMessage(isRtl ? 'تم تحديث كلمة المرور وحفظها في قاعدة البيانات بنجاح.' : 'Password updated and saved successfully in the database.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Password change error:', err);
      const serverMsg = err?.errors?.current_password?.[0] ||
        err?.errors?.new_password?.[0] ||
        err?.message ||
        (isRtl ? 'فشل تحديث كلمة المرور، يرجى التحقق من كلمة المرور الحالية.' : 'Failed to update password. Please check your current password.');
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const bgClass = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const inputBgClass = isDarkMode
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${bgClass} ${className} ${isRtl ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 ${isRtl ? 'flex-row' : ''}`}>
        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm">
            {isRtl ? 'تغيير كلمة المرور وأمان الحساب' : 'Change Password & Security'}
          </h3>
          <p className="text-[11px] text-slate-500">
            {isRtl ? 'تحديث كلمة المرور لحسابك وحفظها مشفرة في قاعدة البيانات' : 'Update your account password securely in the database'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold mb-1">
            {isRtl ? 'كلمة المرور الحالية' : 'Current Password'}
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-teal-600 ${inputBgClass} ${isRtl ? 'pr-3 pl-10' : 'pl-3 pr-10'}`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer ${isRtl ? 'left-2.5' : 'right-2.5'}`}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold mb-1">
              {isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-teal-600 ${inputBgClass} ${isRtl ? 'pr-3 pl-10' : 'pl-3 pr-10'}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer ${isRtl ? 'left-2.5' : 'right-2.5'}`}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isRtl ? '8 محارف على الأقل' : 'Minimum 8 characters'}
            </p>
          </div>

          <div>
            <label className="block font-bold mb-1">
              {isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-teal-600 ${inputBgClass} ${isRtl ? 'pr-3 pl-10' : 'pl-3 pr-10'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer ${isRtl ? 'left-2.5' : 'right-2.5'}`}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isRtl ? 'جاري تحديث كلمة المرور في قاعدة البيانات...' : 'Updating password in database...'}</span>
              </>
            ) : (
              <span>{isRtl ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
