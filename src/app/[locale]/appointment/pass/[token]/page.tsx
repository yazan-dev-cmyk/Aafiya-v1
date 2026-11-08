'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  Building2, 
  User, 
  Stethoscope, 
  Printer, 
  ShieldCheck, 
  ArrowRight,
  Info
} from 'lucide-react';
import { appointmentService, AppointmentPublicPassData } from '@/services/appointmentService';

export default function PublicAppointmentPassPage() {
  const params = useParams();
  const token = params?.token as string;
  const locale = (params?.locale as string) || 'ar';
  const isRtl = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppointmentPublicPassData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPass() {
      if (!token) {
        setErrorMessage(isRtl ? 'رمز التحقق مفقود' : 'Verification token is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await appointmentService.getPublicPass(token);
        if (isMounted) {
          if (res.data) {
            setData(res.data);
          } else {
            setErrorMessage(isRtl ? 'لم يتم العثور على تذكرة الموعد أو أن الرمز غير صالح.' : 'Appointment ticket not found or token invalid.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const status = err?.status || err?.response?.status;
          if (status === 404) {
            setErrorMessage(isRtl ? 'تذكرة الموعد غير موجودة أو أن الرمز غير صالح.' : 'Appointment ticket not found or token invalid.');
          } else if (status === 429) {
            setErrorMessage(isRtl ? 'تم تجاوز معدل الاستعلام عن التذاكر. يرجى الانتظار دقيقة والمحاولة مجدداً.' : 'Rate limit exceeded. Please wait a minute and retry.');
          } else {
            setErrorMessage(isRtl ? 'تعذر تحميل بيانات التذكرة حالياً. يرجى إعادة المحاولة لاحقاً.' : 'Unable to load ticket data. Please try again later.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPass();

    return () => {
      isMounted = false;
    };
  }, [token, isRtl]);

  const langKey = locale === 'fr' ? 'fr' : (locale === 'en' ? 'en' : 'ar');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <h2 className="text-base font-bold text-slate-800">
            {isRtl ? 'جاري التحقق من تذكرة الموعد...' : 'Verifying appointment ticket...'}
          </h2>
          <p className="text-xs text-slate-500">
            {isRtl ? 'يتم استرجاع بيانات التذكرة الرقمية الآمنة من منصة عافية' : 'Retrieving secure digital ticket from AAFIYA'}
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white p-8 rounded-3xl shadow-md border border-rose-100 flex flex-col items-center gap-4 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isRtl ? 'تعذر عرض التذكرة الرقمية' : 'Ticket Unavailable'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMessage}
          </p>
          <Link
            href={`/${locale}`}
            className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            <ArrowRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
            <span>{isRtl ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = data.status === 'confirmed';
  const isPending = data.status === 'pending';
  const statusLabel = data.status_label?.[langKey] || data.status;

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 flex flex-col items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* Brand Header */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col items-center text-center">
          <div className="relative w-44 h-16 mb-2">
            <Image
              src="/logo/Aafiya_Logo_Full.png"
              alt="AAFIYA"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[11px] font-bold text-emerald-700 tracking-wider">
            {isRtl ? 'بوابتك إلى العافية • بطاقة موعد معتمدة' : 'Your Gateway To Aafiya • Verified Pass'}
          </span>
        </div>

        {/* Navy Title & Status Banner */}
        <div className="bg-[#061835] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wide">
                {isRtl ? 'تذكرة موعد طبي' : 'Appointment Ticket'}
              </h1>
              <span className="text-[10px] text-slate-300 block">
                {isRtl ? 'Medical Pass' : 'Document Officiel'}
              </span>
            </div>
          </div>

          <div>
            {isConfirmed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 text-white font-bold text-[11px] border border-emerald-400/40 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/90 text-white font-bold text-[11px] border border-amber-400/40 shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </span>
            )}
            {!isConfirmed && !isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-600/90 text-white font-bold text-[11px] border border-slate-400/40 shadow-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* Pass Body Content */}
        <div className="p-5 space-y-4">
          
          {/* Quick Notice if Pending or Inactive */}
          {isPending && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {isRtl 
                  ? 'هذا الطلب قيد المراجعة والاعتماد من الفريق الطبي. سيتم تفعيل رمز الحضور فور اعتماده رسمياً.' 
                  : 'This request is pending medical review. Check-in pass will be activated upon official approval.'}
              </span>
            </div>
          )}

          {!data.is_active_pass && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/80 flex items-start gap-2.5 text-rose-900 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                {isRtl 
                  ? 'تنبيه: هذا الموعد غير نشط حالياً (ملغى، منتهي، أو تم حضوره سابقاً).' 
                  : 'Notice: This appointment pass is currently inactive (cancelled, expired, or completed).'}
              </span>
            </div>
          )}

          {/* Details & QR Card */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3">
            
            {/* Patient Name */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  {isRtl ? 'اسم المريض' : 'Patient Name'}
                </span>
                <p className="text-sm font-black text-slate-900 truncate">
                  {data.patient_name || (isRtl ? 'مريض معتمد' : 'Patient')}
                </p>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  {isRtl ? 'الطبيب المعالج' : 'Doctor'}
                </span>
                <p className="text-xs font-black text-slate-900 truncate">
                  {data.doctor?.name ? `د. ${data.doctor.name}` : (isRtl ? 'الطبيب المعالج' : 'Doctor')}
                </p>
                {data.doctor?.specialty && (
                  <p className="text-[11px] font-medium text-slate-500">
                    {data.doctor.specialty}
                  </p>
                )}
              </div>
            </div>

            {/* Clinic */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  {isRtl ? 'العيادة / المركز الطبي' : 'Clinic / Medical Center'}
                </span>
                <p className="text-xs font-black text-slate-900 truncate">
                  {data.clinic?.name || 'AAFIYA Clinic'}
                </p>
                {data.clinic?.wilaya && (
                  <p className="text-[11px] font-medium text-slate-500">
                    {data.clinic.wilaya}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {isRtl ? 'التاريخ' : 'Date'}
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {data.appointment_date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {isRtl ? 'التوقيت' : 'Time'}
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {data.time_slot}
                  </p>
                </div>
              </div>
            </div>

            {/* Reference Number */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isRtl ? 'الرقم المرجعي المعتمد' : 'Reference Number'}
              </span>
              <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                {data.booking_reference}
              </span>
            </div>
          </div>

          {/* QR Code Pass Box */}
          <div className="p-4 bg-gradient-to-b from-white to-slate-50 rounded-2xl border-2 border-emerald-500/30 flex flex-col items-center text-center gap-3 shadow-xs">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isRtl ? 'رمز الحضور السريع (QR Check-In)' : 'Fast Reception Check-In QR'}</span>
            </span>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
              <QRCode
                value={data.qr_pass_url}
                size={148}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
              />
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              {isRtl 
                ? 'امسح هذا الرمز عند وصولك إلى مكتب استقبال العيادة لتأكيد تسجيل حضورك فورياً.' 
                : 'Present this QR code at clinic reception desk for instant check-in confirmation.'}
            </p>
          </div>

          {/* Instructions Box */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 text-[11px] text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Info className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تعليمات الحضور:' : 'Visit Instructions:'}</span>
            </p>
            <p className="leading-relaxed font-medium">
              {data.instructions?.[langKey] || data.instructions?.ar}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isRtl ? 'طباعة تذكرة الموعد' : 'Print Appointment Ticket'}</span>
            </button>
          </div>

        </div>

        {/* Footer Banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-600">
            {isRtl ? 'نتمنى لكم دوام الصحة والعافية' : 'Wishing you good health and wellness'}
          </p>
          <span className="text-[9px] text-slate-400 block mt-0.5">
            {isRtl ? 'وثيقة رقمية معتمدة صادرة عبر منصة عافية الطبية' : 'Official Digital Pass by AAFIYA Platform'}
          </span>
        </div>

      </div>
    </div>
  );
}
