'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Server,
  Eye,
  EyeOff
} from 'lucide-react';
import { api, setStoredToken } from '@/lib/api';

export default function AdminSetupPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';

  const [checking, setChecking] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // Password Visibility Control
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get<{ status: string; is_initialized: boolean; message: string }>('/system/setup-status');
        if (res.data?.is_initialized) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error('Setup status error', err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError(isRtl ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        status: string;
        message: string;
        data: { user: any; token: string; token_type: string };
      }>('/system/setup-admin', {
        name,
        email,
        phone,
        password,
      });

      if (res.data?.data?.token) {
        setStoredToken(res.data.data.token);
        setSuccess(true);
        setTimeout(() => {
          window.location.assign(`/${locale}/admin/dashboard`);
        }, 1500);
      } else {
        setError(res.data?.message || (isRtl ? 'فشلت عملية التهيئة.' : 'Setup failed.'));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || (isRtl ? 'حدث خطأ أثناء تهيئة حساب المسؤول.' : 'An error occurred during admin setup.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300 font-bold">
          <Server className="w-5 h-5 animate-spin text-teal-400" />
          <span>{isRtl ? 'جاري فحص حالة تهيئة المنصة...' : 'Checking system setup status...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-800 text-teal-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isRtl ? 'التهيئة الأولية للمنصة — ROOT BOOTSTRAP' : 'SYSTEM INITIALIZATION — ROOT BOOTSTRAP'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {isRtl ? 'إنشاء حساب مسؤول المنصة الأول (Super Admin)' : 'First Platform Administrator Setup'}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          {isRtl
            ? 'هذه الواجهة مخصصة لإنشاء حساب المسؤول العام الأول للمنصة عند التثبيت الأولي. بعد إنشاء هذا الحساب، سيتم قفل مسار التهيئة تلقائياً لأسباب أمنية.'
            : 'This interface is dedicated to provisioning the first root platform administrator. Once provisioned, this route will lock automatically.'}
        </p>
      </div>

      {isInitialized ? (
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {isRtl ? 'تمت تهيئة مسؤول المنصة بالفعل' : 'Platform Administrator Already Initialized'}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {isRtl
                ? 'يوجد مسؤول عام مسجل ومعتمد مسبقاً في النظام. لإدارة المنصة أو إضافة مساعدين، يرجى تسجيل الدخول مباشرة.'
                : 'A platform administrator is already configured. Please log in directly.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => window.location.assign(`/${locale}`)}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
            >
              <span>{isRtl ? 'الذهاب إلى تسجيل الدخول' : 'Go to Login'}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      ) : success ? (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isRtl ? 'تم إنشاء وتفعيل حساب المسؤول بنجاح!' : 'Platform Administrator Created Successfully!'}
          </h2>
          <p className="text-sm text-emerald-300">
            {isRtl ? 'جاري توجيهك إلى لوحة تحكم المسؤول العام...' : 'Redirecting to Admin Dashboard...'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isRtl ? 'الاسم الكامل للمسؤول' : 'Full Name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRtl ? 'مثال: مصطفى بن علي' : 'e.g. Mustapha Benali'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
                />
                <User className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'left-3' : 'right-3'}`} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isRtl ? 'البريد الإلكتروني الرسمي' : 'Official Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="val.admin@aafiya.dz"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
                />
                <Mail className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'left-3' : 'right-3'}`} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isRtl ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213550000001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
                />
                <Phone className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'left-3' : 'right-3'}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isRtl ? 'كلمة المرور المعتمدة' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                  />
                  <Lock className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    title={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    className={`absolute top-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                  />
                  <Lock className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    title={showConfirmPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    className={`absolute top-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <span>{isRtl ? 'جاري تهيئة الحساب...' : 'Initializing account...'}</span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>{isRtl ? 'إنشاء وتفعيل مسؤول المنصة' : 'Create & Initialize Administrator'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
