'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { 
  Smartphone, 
  Stethoscope, 
  Download, 
  Check, 
  Copy, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Info, 
  QrCode, 
  ExternalLink 
} from 'lucide-react';

interface TestAppsClientProps {
  locale: string;
}

export default function TestAppsClient({ locale }: TestAppsClientProps) {
  const isRtl = locale === 'ar';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrPatient, setShowQrPatient] = useState(false);
  const [showQrPro, setShowQrPro] = useState(false);

  const getOrigin = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://aafiya.site';
  };

  const patientDownloadUrl = `${getOrigin()}/downloads/aafiya-patient.apk`;
  const proDownloadUrl = `${getOrigin()}/downloads/aafiya-pro.apk`;

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo/Aafiya_Master_Logo.svg" 
              alt="AAFIYA Logo" 
              className="h-10 w-auto object-contain" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-tight">AAFIYA</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {isRtl ? 'إصدار تجريبي سريري' : 'TEST / STAGING / PILOT'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {isRtl ? 'بوابة التحميل المباشر لتطبيقات أندرويد الداخلية' : 'Internal Android Release Distribution Portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 text-xs">
              <Link 
                href="/ar/test-apps" 
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${locale === 'ar' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                العربية
              </Link>
              <Link 
                href="/en/test-apps" 
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${locale === 'en' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </Link>
              <Link 
                href="/fr/test-apps" 
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${locale === 'fr' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                FR
              </Link>
            </div>

            <Link
              href={`/${locale}`}
              className="text-xs text-slate-400 hover:text-teal-400 font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Notice Banner */}
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {isRtl ? 'تنبيه بيئة الاختبار والتحقق' : 'STAGING DISTRIBUTION ONLY'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {isRtl ? 'حزم تطبيقات AAFIYA المعتمدة — مرحلة الاختبار التجريبي' : 'AAFIYA Android Mobile Test Artifacts'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {isRtl 
                  ? 'هذه الصفحة مخصصة حصرياً لفريق العمل والأطباء والمختبرين المعتمدين ضمن المرحلة التجريبية (Pilot Testing). هذه التطبيقات متصلة بالواجهة البرمجية السحابية الموثقة (https://api.aafiya.site/api/v1) وليست نسخاً عامة منشورة على متجر Google Play.'
                  : 'This page is designated strictly for authorized clinical staff, engineers, and verified pilot testers. These artifacts connect directly to the verified AAFIYA cloud infrastructure (https://api.aafiya.site/api/v1) and are not public Google Play releases.'}
              </p>
            </div>
          </div>
        </div>

        {/* APK Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PATIENT APP CARD */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative group hover:border-teal-500/50 transition-colors">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest font-bold">
                      {isRtl ? 'تطبيق المرضى' : 'Patient Application'}
                    </span>
                    <h2 className="text-2xl font-black text-white">AAFIYA</h2>
                    <p className="text-xs text-slate-400 font-mono">com.aafiya.aafiya_patient</p>
                  </div>
                </div>

                <span className="bg-teal-900/40 text-teal-300 text-[11px] font-bold px-3 py-1 rounded-full border border-teal-500/30 shrink-0">
                  v0.1.0 (Code 1)
                </span>
              </div>

              {/* Technical Specifications */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'حجم الملف:' : 'File Size:'}</span>
                  <span className="text-white font-mono font-bold">48.5 MB (50,905,925 bytes)</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'النظام المدعوم:' : 'Target OS:'}</span>
                  <span className="text-white font-mono font-bold">Android 7.0+ (API 24 - 36)</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'التوقيع الرقمي:' : 'Signature:'}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> RSA 4096-bit Official
                  </span>
                </div>

                {/* SHA-256 Hash Display */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">SHA-256 Checksum:</span>
                    <button
                      onClick={() => copyToClipboard('b4f4b81ffe4a616d1b191b229dc4ec538b3c2f9320d0ceac7f396064f9ef8bea', 'patient-hash')}
                      className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'patient-hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'patient-hash' ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ البصمة' : 'Copy Hash')}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-300 break-all select-all">
                    b4f4b81ffe4a616d1b191b229dc4ec538b3c2f9320d0ceac7f396064f9ef8bea
                  </div>
                </div>
              </div>

              {/* QR Code Collapsible View */}
              {showQrPatient && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-2 flex flex-col items-center">
                  <QRCode
                    value={patientDownloadUrl}
                    size={180}
                    style={{ height: "auto", maxWidth: "100%", width: "180px" }}
                    viewBox={`0 0 256 256`}
                  />
                  <p className="text-[11px] text-slate-700 font-bold">
                    {isRtl ? 'امسح الكاميرا من هاتف أندرويد للتحميل المباشر' : 'Scan with Android camera to download directly'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <a
                href="/downloads/aafiya-patient.apk"
                download="aafiya-patient-v0.1.0.apk"
                className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{isRtl ? 'تحميل تطبيق المرضى (APK)' : 'Download AAFIYA Patient (APK)'}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowQrPatient(!showQrPatient)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>{showQrPatient ? (isRtl ? 'إخفاء رمز QR' : 'Hide QR Code') : (isRtl ? 'عرض رمز الاستجابة السريعة (QR)' : 'Show Mobile QR Code')}</span>
              </button>
            </div>
          </div>

          {/* PRO APP CARD */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative group hover:border-emerald-500/50 transition-colors">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                      {isRtl ? 'تطبيق الأطباء والعيادات' : 'Clinical & Professional App'}
                    </span>
                    <h2 className="text-2xl font-black text-white">AAFIYA Pro</h2>
                    <p className="text-xs text-slate-400 font-mono">com.aafiya.aafiya_pro</p>
                  </div>
                </div>

                <span className="bg-emerald-900/40 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 shrink-0">
                  v0.1.0 (Code 1)
                </span>
              </div>

              {/* Technical Specifications */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'حجم الملف:' : 'File Size:'}</span>
                  <span className="text-white font-mono font-bold">51.9 MB (54,366,833 bytes)</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'النظام المدعوم:' : 'Target OS:'}</span>
                  <span className="text-white font-mono font-bold">Android 7.0+ (API 24 - 36)</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isRtl ? 'التوقيع الرقمي:' : 'Signature:'}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> RSA 4096-bit Official
                  </span>
                </div>

                {/* SHA-256 Hash Display */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">SHA-256 Checksum:</span>
                    <button
                      onClick={() => copyToClipboard('2cb3f661e0235b06ed915287417bd5b7432ba16ed0ccca63764e0612e3985a4e', 'pro-hash')}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'pro-hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'pro-hash' ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ البصمة' : 'Copy Hash')}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-300 break-all select-all">
                    2cb3f661e0235b06ed915287417bd5b7432ba16ed0ccca63764e0612e3985a4e
                  </div>
                </div>
              </div>

              {/* QR Code Collapsible View */}
              {showQrPro && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-2 flex flex-col items-center">
                  <QRCode
                    value={proDownloadUrl}
                    size={180}
                    style={{ height: "auto", maxWidth: "100%", width: "180px" }}
                    viewBox={`0 0 256 256`}
                  />
                  <p className="text-[11px] text-slate-700 font-bold">
                    {isRtl ? 'امسح الكاميرا من هاتف أندرويد للتحميل المباشر' : 'Scan with Android camera to download directly'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <a
                href="/downloads/aafiya-pro.apk"
                download="aafiya-pro-v0.1.0.apk"
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{isRtl ? 'تحميل تطبيق الأطباء (APK)' : 'Download AAFIYA Pro (APK)'}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowQrPro(!showQrPro)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>{showQrPro ? (isRtl ? 'إخفاء رمز QR' : 'Hide QR Code') : (isRtl ? 'عرض رمز الاستجابة السريعة (QR)' : 'Show Mobile QR Code')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sideloading Instructions */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-teal-400 text-sm font-bold">
            <Info className="w-5 h-5" />
            <span>{isRtl ? 'إرشادات التثبيت على هواتف أندرويد (Sideloading Instructions)' : 'Android Installation Guide (Sideloading Instructions)'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center font-bold text-xs mb-2">1</span>
              <p className="font-bold text-white">{isRtl ? 'تحميل الملف' : 'Download File'}</p>
              <p className="text-slate-400 leading-relaxed">
                {isRtl 
                  ? 'اضغط زر التحميل أو امسح رمز الاستجابة السريعة (QR) باستخدام كاميرا الهاتف عبر متصفح كروم.'
                  : 'Tap download or scan the QR code with your Android camera in Chrome.'}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center font-bold text-xs mb-2">2</span>
              <p className="font-bold text-white">{isRtl ? 'السماح بالتثبيت' : 'Allow Unknown Apps'}</p>
              <p className="text-slate-400 leading-relaxed">
                {isRtl 
                  ? 'عند ظهور رسالة النظام، فعّل خيار "السماح بتثبيت التطبيقات غير المعروفة" من إعدادات المتصفح.'
                  : 'When prompted by Android, enable "Install unknown apps" in Settings for your browser.'}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center font-bold text-xs mb-2">3</span>
              <p className="font-bold text-white">{isRtl ? 'تأكيد حماية Google Play' : 'Play Protect Confirmation'}</p>
              <p className="text-slate-400 leading-relaxed">
                {isRtl 
                  ? 'إذا ظهر تنبيه Play Protect، اضغط "مزيد من التفاصيل" ثم "التثبيت على أي حال" لإتمام العملية.'
                  : 'If Google Play Protect displays a prompt, tap "More details" and select "Install anyway".'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
