'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Pill, 
  User, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';
import Link from 'next/link';
import { prescriptionService, PrescriptionVerificationData } from '@/services/prescriptionService';

export default function PublicPrescriptionVerifyPage() {
  const params = useParams();
  const token = params?.token as string;
  const locale = (params?.locale as string) || 'ar';
  const isRtl = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PrescriptionVerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVerification() {
      if (!token) {
        setError(isRtl ? 'رمز التحقق مفقود' : 'Verification token is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await prescriptionService.verifyToken(token);
        if (isMounted) {
          if (res.data) {
            setData(res.data);
          } else {
            setError(isRtl ? 'لم يتم العثور على الوصفة الطبية' : 'Prescription not found');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          if (err?.status === 404) {
            setData({
              is_valid: false,
              verification_status: 'not_found'
            });
          } else {
            setError(isRtl ? 'تعذر الاتصال بمركز التحقق السحابي' : 'Unable to connect to verification server');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadVerification();

    return () => {
      isMounted = false;
    };
  }, [token, isRtl]);

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Brand Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo/Aafiya_Master_Logo.svg" 
              alt="Aafiya / Aafiya Logo" 
              className="h-10 w-auto object-contain" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">Aafiya</span>
                <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                  {isRtl ? 'التحقق السحابي الموثق' : 'Certified Cloud Verification'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isRtl ? 'المنصة الوطنية للخدمات الطبية والوصفات الرقمية' : 'National Digital Health & E-Prescription Platform'}
              </p>
            </div>
          </div>

          <Link
            href={`/${locale}`}
            className="text-xs text-slate-600 hover:text-teal-700 font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm space-y-4">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-800">
              {isRtl ? 'جاري التحقق الرقمي من الوصفة الطبية...' : 'Verifying E-Prescription Signature...'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isRtl ? 'يتم مطابقة الرمز المشفر مع قاعدة البيانات السريرية المركزية لشبكة عافية.' : 'Matching cryptographic token against Aafiya central clinical ledger.'}
            </p>
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{error}</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isRtl ? 'يرجى إعادة مسح الرمز أو مراجعة الطبيب المعالج / إدارة العيادة.' : 'Please scan the code again or contact the prescribing clinic.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-colors cursor-pointer"
            >
              {isRtl ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : !data || !data.is_valid || data.verification_status === 'not_found' || data.verification_status === 'invalid' ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-rose-900">
              {isRtl ? 'رمز الوصفة غير صالح أو غير موجود' : 'Invalid or Unrecognized Prescription Code'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {isRtl 
                ? 'لم يتم العثور على وصفة طبية نشطة مطابقة لهذا الرمز في سجلات عافية المعتمدة. تأكد من صحة رمز الاستجابة السريعة أو انتهاء مدة الصلاحية.' 
                : 'No active prescription matches this token in the certified Aafiya database. Please check the QR code or verify issuance.'}
            </p>
          </div>
        ) : data.verification_status === 'voided' ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-rose-900">
              {isRtl ? 'تم إلغاء هذه الوصفة الطبية من قِبل الطبيب' : 'Prescription Voided / Revoked'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {isRtl 
                ? `الوصفة رقم ${data.prescription_reference || ''} تم إلغاؤها رسمياً ولا يُسمح بصرف أدويتها.` 
                : `Prescription ${data.prescription_reference || ''} has been revoked and cannot be dispensed.`}
            </p>
          </div>
        ) : data.verification_status === 'expired' ? (
          <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-amber-900">
              {isRtl ? 'الوصفة الطبية منتهية الصلاحية' : 'Prescription Has Expired'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {isRtl 
                ? `انتهت صلاحية هذه الوصفة بتاريخ ${data.expiry_date || ''}. يرجى استشارة الطبيب لتجديد خطة العلاج.` 
                : `This prescription expired on ${data.expiry_date || ''}. Please consult your doctor for a refill.`}
            </p>
          </div>
        ) : (
          /* ACTIVE & CERTIFIED PRESCRIPTION */
          <div className="space-y-6">
            {/* Success Header Banner */}
            <div className="bg-emerald-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-600/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest bg-emerald-700/80 px-2.5 py-0.5 rounded-full border border-white/20">
                        {isRtl ? 'موثقة رسمياً' : 'OFFICIALLY CERTIFIED'}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black mt-1">
                      {isRtl ? 'وصفة طبية إلكترونية نشطة' : 'Active Certified E-Prescription'}
                    </h1>
                    <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                      {isRtl ? 'الرقم المرجعي:' : 'Reference:'} <strong>{data.prescription_reference}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center self-stretch sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-emerald-100 block">
                    {isRtl ? 'حالة الصرف' : 'Dispense Status'}
                  </span>
                  <span className="text-sm font-black text-white flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    {isRtl ? 'مصرح بالصرف' : 'Authorized'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribing Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Doctor Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <User className="w-4 h-4" />
                  <span>{isRtl ? 'الطبيب المعالج' : 'Prescribing Doctor'}</span>
                </div>
                <p className="text-base font-black text-slate-900">{data.doctor_name || (isRtl ? 'طبيب مرخص' : 'Licensed Doctor')}</p>
                <p className="text-xs text-slate-500 font-medium">{data.doctor_specialty || (isRtl ? 'الطب العام' : 'General Medicine')}</p>
              </div>

              {/* Clinic Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <Building2 className="w-4 h-4" />
                  <span>{isRtl ? 'المؤسسة الطبية' : 'Healthcare Facility'}</span>
                </div>
                <p className="text-base font-black text-slate-900">{data.clinic_name || (isRtl ? 'عيادة الأمل الطبية' : 'Medical Clinic')}</p>
                <p className="text-xs text-slate-500 font-medium">{isRtl ? 'معتمدة ضمن شبكة عافية' : 'Affiliated Aafiya Network'}</p>
              </div>

              {/* Patient & Validity Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>{isRtl ? 'بيانات الصلاحية' : 'Validity Dates'}</span>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>{isRtl ? 'المريض:' : 'Patient:'}</strong> {data.patient_name}
                </p>
                <p className="text-xs text-slate-500">
                  <span>{isRtl ? 'الإصدار:' : 'Issued:'} {data.issue_date}</span> • <span>{isRtl ? 'الانتهاء:' : 'Expires:'} {data.expiry_date}</span>
                </p>
              </div>
            </div>

            {/* Prescribed Medications Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {isRtl ? 'قائمة الأدوية الموصوفة للصرف' : 'Authorized Medications to Dispense'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isRtl ? `إجمالي الأدوية المصرح بها: ${data.items?.length || data.items_count || 0} أدوية` : `Total items: ${data.items?.length || data.items_count || 0}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Medications List */}
              <div className="space-y-4">
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h3 className="text-base font-black text-slate-900">{item.medication_name}</h3>
                        </div>
                        <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-teal-200">
                          {item.dosage}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'التكرار والجرعة:' : 'Frequency:'}</span>
                          <p className="font-bold">{item.frequency}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'مدة العلاج:' : 'Duration:'}</span>
                          <p className="font-bold">{item.duration}</p>
                        </div>
                      </div>

                      {item.instructions && (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs text-slate-600 font-medium">
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{isRtl ? 'تعليمات الاستعمال للصيدلي والمريض:' : 'Instructions:'}</span>
                          {item.instructions}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">{isRtl ? 'لا توجد بنود دوائية مسجلة.' : 'No medication items found.'}</p>
                )}
              </div>
            </div>

            {/* Privacy Wall & Forensic Integrity Notice */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
              <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">
                  {isRtl ? 'جدار السرية الطبية وموثوقية السجلات (EHR Privacy Wall):' : 'Forensic Audit & Privacy Safeguard:'}
                </p>
                <p className="leading-relaxed text-[11px]">
                  {isRtl 
                    ? 'هذه الوثيقة صادرة رقمياً وموقعة إلكترونياً من الطبيب المرخص عبر شبكة عافية. وفق معايير الحوكمة وحماية بيانات المرضى، لا يتم كشف التشخيص السريري أو الملاحظات الطبية الخاصة خارج النطاق الدوائي المصرح به للصيدليات.' 
                    : 'This document is digitally signed by a certified practitioner. In adherence to medical privacy standards (P10), clinical diagnoses and private notes remain protected within the treating clinic and are not exposed during pharmacy dispensing.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
