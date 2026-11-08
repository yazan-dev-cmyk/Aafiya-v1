'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AuthModals } from '@/components/AuthModals';

function ResetPasswordContent() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRtl = locale === 'ar';

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [verifying, setVerifying] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token || !emailParam) {
        if (isMounted) {
          setVerifying(false);
          setTokenValid(false);
          setVerifyError(t('invalidOrExpiredToken'));
        }
        return;
      }

      try {
        await api.publicPost('/auth/verify-reset-token', {
          token,
          email: emailParam.trim().toLowerCase(),
        });
        if (isMounted) {
          setTokenValid(true);
          setVerifying(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setTokenValid(false);
          setVerifying(false);
          setVerifyError(err?.message || t('invalidOrExpiredToken'));
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token, emailParam, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError(t('passwordMinLength'));
      return;
    }

    if (password !== passwordConfirmation) {
      setFormError(t('passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);

    try {
      await api.publicPost('/auth/reset-password', {
        token,
        email: emailParam.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
        locale,
      });
      setSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || t('invalidOrExpiredToken'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-primary font-black text-2xl tracking-tight">
          <span className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">
            ع
          </span>
          AAFIYA
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-8 shadow-xl shadow-slate-200/50 border-slate-100 rounded-3xl bg-white">
          {verifying ? (
            <div className="text-center py-12 space-y-4">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-500">جاري التحقق من صلاحية الرابط...</p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  {t('resetPasswordTitle')}
                </h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  {verifyError || t('invalidOrExpiredToken')}
                </p>
              </div>
              <div className="pt-2">
                <Link href={`/${locale}`}>
                  <Button fullWidth size="lg">
                    {t('requestNewLink')}
                    {isRtl ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  {t('resetPasswordTitle')}
                </h3>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  {t('passwordResetSuccess')}
                </p>
              </div>
              <div className="pt-4">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => setShowLoginModal(true)}
                >
                  <ShieldCheck className={cn("w-5 h-5", isRtl ? "ml-2" : "mr-2")} />
                  {t('signInOnWeb')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center space-y-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {t('resetPasswordTitle')}
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  {t('resetPasswordDesc')}
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                  {formError}
                </div>
              )}

              <Input
                label={t('newPassword')}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5" />}
              />

              <Input
                label={t('confirmNewPassword')}
                type="password"
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5" />}
              />

              <div className="pt-2">
                <Button type="submit" fullWidth size="lg" loading={submitting}>
                  <ShieldCheck className={cn("w-5 h-5", isRtl ? "ml-2" : "mr-2")} />
                  {t('submitResetPassword')}
                </Button>
              </div>

              <div className="text-center pt-2">
                <Link
                  href={`/${locale}`}
                  className="text-xs font-black text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  {t('backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>

      <AuthModals
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          router.push(`/${locale}`);
        }}
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
