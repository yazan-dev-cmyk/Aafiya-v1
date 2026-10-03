'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  FlaskConical, 
  Radio, 
  User, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { diagnosticService, DiagnosticOrderPublicData } from '@/services/diagnosticService';

export default function PublicDiagnosticOrderVerifyPage() {
  const params = useParams();
  const token = params?.token as string;
  const locale = (params?.locale as string) || 'ar';
  const isRtl = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticOrderPublicData | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVerification() {
      if (!token) {
        setErrorMessage(isRtl ? 'رمز التحقق مفقود' : 'Verification token is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorStatus(null);
        setErrorMessage(null);
        const res = await diagnosticService.verifyToken(token);
        if (isMounted) {
          if (res.data) {
            setData(res.data);
          } else {
            setErrorStatus(404);
            setErrorMessage(isRtl ? 'الطلب التشخيصي غير موجود أو أن رمز التحقق غير صالح.' : 'Diagnostic order not found or invalid token.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const status = err?.status || err?.response?.status;
          setErrorStatus(status || 500);
          if (status === 404) {
            setErrorMessage(isRtl ? 'الطلب التشخيصي غير موجود أو أن رمز التحقق غير صالح.' : 'Diagnostic order not found or invalid token.');
          } else if (status === 429) {
            setErrorMessage(isRtl ? 'تم تجاوز عدد محاولات التحقق المسموح بها. يرجى المحاولة لاحقاً.' : 'Too many verification requests. Please try again later.');
          } else {
            setErrorMessage(isRtl ? 'تعذر الاتصال بمركز التحقق السحابي.' : 'Unable to connect to verification server.');
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

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized || status === 'finalized') {
      return {
        label: isRtl ? '🟢 تم الاعتماد رسمياً' : '🟢 Officially Finalized',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    if (status === 'resulted' || status === 'processing') {
      return {
        label: isRtl ? '🔵 قيد المعالجة المخبرية' : '🔵 In Processing',
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    }
    if (status === 'received') {
      return {
        label: isRtl ? '🟡 تم استلام الطلب' : '🟡 Received at Center',
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    return {
      label: isRtl ? '⚪ طلب جديد' : '⚪ Order Created',
      bg: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Brand Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo/Aafiya_Logo_No_Tagline.png" 
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
                {isRtl ? 'المنظومة الوطنية للتحقق من الفحوصات والتقارير الطبية' : 'National Digital Diagnostic Verification Network'}
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
              {isRtl ? 'جاري التحقق الرقمي من الطلب التشخيصي...' : 'Verifying Diagnostic Order Signature...'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isRtl ? 'يتم مطابقة الرمز المشفر مع قاعدة البيانات السريرية المركزية لشبكة عافية.' : 'Matching cryptographic token against Aafiya central clinical ledger.'}
            </p>
          </div>
        ) : errorStatus === 404 || !data ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-rose-900">
              {isRtl ? 'الطلب التشخيصي غير موجود أو أن رمز التحقق غير صالح' : 'Invalid or Unrecognized Diagnostic Token'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {isRtl 
                ? 'لم يتم العثور على طلب فحوصات أو تحاليل طبية مطابقة لهذا الرمز في سجلات عافية المعتمدة. تأكد من مسح الرمز الصحيح.' 
                : 'No active diagnostic order matches this token in the certified Aafiya database.'}
            </p>
          </div>
        ) : errorStatus === 429 ? (
          <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-amber-900">
              {isRtl ? 'تم تجاوز عدد محاولات التحقق المسموح بها' : 'Rate Limit Exceeded'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {errorMessage || (isRtl ? 'يرجى الانتظار دقيقة قبل المحاولة مرة أخرى للحفاظ على أمان النظام.' : 'Please wait a minute before retrying.')}
            </p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{errorMessage}</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-colors cursor-pointer"
            >
              {isRtl ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          /* AUTHENTIC DIAGNOSTIC ORDER VERIFICATION CARD */
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-teal-500/30 text-teal-300">
                    {data.order_type === 'radiology' ? (
                      <Radio className="w-8 h-8" />
                    ) : (
                      <FlaskConical className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest bg-teal-900/80 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-700/50 font-bold">
                        {isRtl ? 'موثق رقمياً' : 'OFFICIALLY VERIFIED'}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                        {data.order_type === 'radiology' ? (isRtl ? 'تصوير وأشعة' : 'Radiology') : (isRtl ? 'تحاليل مخبرية' : 'Laboratory')}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black mt-1">
                      {isRtl ? 'التحقق من صحة الطلب التشخيصي' : 'Diagnostic Order Verification'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {isRtl ? 'الرقم المرجعي:' : 'Reference:'} <strong className="text-teal-300">{data.order_reference}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-center self-stretch sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">
                    {isRtl ? 'حالة الطلب' : 'Status'}
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block">
                    {getStatusBadge(data.status, data.is_finalized).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Doctor Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <User className="w-4 h-4" />
                  <span>{isRtl ? 'الطبيب المعالج' : 'Ordering Doctor'}</span>
                </div>
                <p className="text-base font-black text-slate-900">{data.doctor?.name || (isRtl ? 'طبيب معتمد' : 'Certified Doctor')}</p>
                <p className="text-xs text-slate-500 font-medium">{data.doctor?.specialty || (isRtl ? 'طب عام' : 'General Practice')}</p>
              </div>

              {/* Clinic Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <Building2 className="w-4 h-4" />
                  <span>{isRtl ? 'العيادة المصدرة' : 'Originating Clinic'}</span>
                </div>
                <p className="text-base font-black text-slate-900">{data.clinic?.name || (isRtl ? 'عيادة معتمدة' : 'Certified Clinic')}</p>
                <p className="text-xs text-slate-500 font-medium">{data.clinic?.wilaya || (isRtl ? 'الجزائر' : 'Algeria')}</p>
              </div>

              {/* Patient & Center Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 text-xs font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>{isRtl ? 'المريض والمركز' : 'Patient & Facility'}</span>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>{isRtl ? 'المريض:' : 'Patient:'}</strong> {data.patient?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'الملف:' : 'MRN:'} <span className="font-mono text-teal-700 font-bold">{data.patient?.mrn}</span>
                </p>
                {data.diagnostic_center && (
                  <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <strong>{isRtl ? 'المركز التشخيصي:' : 'Center:'}</strong> {data.diagnostic_center.name}
                  </p>
                )}
              </div>
            </div>

            {/* Diagnostic Content / Results Section */}
            {data.order_type === 'laboratory' ? (
              /* Laboratory Orders View */
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        {isRtl ? 'قائمة الفحوصات والتحاليل المخبرية' : 'Laboratory Diagnostic Tests'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {isRtl ? `إجمالي الفحوصات المطلوبة: ${data.items?.length || 0}` : `Total tests: ${data.items?.length || 0}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice Banner if not finalized */}
                {!data.is_finalized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">{isRtl ? 'النتائج قيد المعالجة والاعتماد المخبري' : 'Results In Processing'}</p>
                      <p className="text-amber-700 leading-relaxed">
                        {data.privacy_notice || (isRtl ? 'النتائج الطبية محجوبة حتى الاعتماد الرسمي من مدير المركز الطبي.' : 'Medical results are pending official diagnostic center sign-off.')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tests Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">{isRtl ? 'اسم التحليل' : 'Test Name'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'الرمز' : 'Code'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'النتيجة المعتمدة' : 'Final Result'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'المعدل الطبيعي' : 'Reference Range'}</th>
                        <th className="py-3 px-3.5">{isRtl ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {data.items && data.items.length > 0 ? (
                        data.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3.5 px-3.5 font-bold text-slate-900">{item.test_name}</td>
                            <td className="py-3.5 px-3.5 font-mono text-slate-500">{item.test_code || '—'}</td>
                            <td className="py-3.5 px-3.5 font-mono font-bold">
                              {data.is_finalized && item.result_value ? (
                                <span className="text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                                  {item.result_value} {item.unit || ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal italic">
                                  {isRtl ? 'قيد التحليل 🔒' : 'Pending 🔒'}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3.5 text-slate-600 font-mono">
                              {data.is_finalized ? (item.reference_range || '—') : '—'}
                            </td>
                            <td className="py-3.5 px-3.5">
                              {data.is_finalized ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {isRtl ? 'معتمد ✅' : 'Finalized ✅'}
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {isRtl ? 'قيد الإجراء' : 'In Progress'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            {isRtl ? 'لا توجد فحوصات مدرجة.' : 'No tests found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Radiology Orders View */
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        {isRtl ? 'تقرير فحص الأشعة والتصوير الطبي' : 'Radiology Imaging & Diagnostic Report'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {data.radiology_report?.modality || (isRtl ? 'تصوير تشخيصي' : 'Diagnostic Imaging')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice Banner if not finalized */}
                {!data.is_finalized ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">{isRtl ? 'تقرير الأشعة قيد المراجعة والاعتماد' : 'Report Pending Sign-off'}</p>
                      <p className="text-amber-700 leading-relaxed">
                        {data.privacy_notice || (isRtl ? 'النتائج الطبية محجوبة حتى الاعتماد الرسمي من مدير المركز الطبي.' : 'Medical results are pending official diagnostic center sign-off.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Finalized Radiology Findings & Impression */
                  <div className="space-y-4 text-xs">
                    {data.radiology_report?.findings && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-900 block text-xs">
                          {isRtl ? 'النتائج والمشاهدات السريرية (Findings):' : 'Radiological Findings:'}
                        </span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {data.radiology_report.findings}
                        </p>
                      </div>
                    )}

                    {data.radiology_report?.impression && (
                      <div className="bg-teal-50/70 border border-teal-200 p-4 rounded-2xl space-y-1.5">
                        <span className="font-bold text-teal-900 block text-xs">
                          {isRtl ? 'الانطباع التشخيصي المعتمد (Diagnostic Impression):' : 'Diagnostic Impression:'}
                        </span>
                        <p className="text-slate-900 font-bold leading-relaxed">
                          &ldquo;{data.radiology_report.impression}&rdquo;
                        </p>
                      </div>
                    )}

                    {data.radiology_report?.recommendations && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                        <span className="font-bold text-slate-700 block">
                          {isRtl ? 'التوصيات السريرية (Recommendations):' : 'Recommendations:'}
                        </span>
                        <p className="text-slate-600 leading-relaxed">
                          {data.radiology_report.recommendations}
                        </p>
                      </div>
                    )}

                    {data.radiology_report?.reported_by && (
                      <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
                        <span>{isRtl ? 'الاستشاري المعتمد:' : 'Signed By:'} <strong>{data.radiology_report.reported_by}</strong></span>
                        {data.radiology_report.reported_at && (
                          <span>{isRtl ? 'تاريخ التقرير:' : 'Date:'} {new Date(data.radiology_report.reported_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Wall & Forensic Integrity Notice */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
              <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">
                  {isRtl ? 'جدار السرية الطبية وموثوقية السجلات (EHR Privacy Wall):' : 'Forensic Audit & Privacy Safeguard:'}
                </p>
                <p className="leading-relaxed text-[11px]">
                  {isRtl 
                    ? 'هذه الوثيقة صادرة رقمياً وموقعة إلكترونياً من المركز الطبي المعتمد عبر شبكة عافية. وفق معايير الحوكمة وحماية بيانات المرضى، لا يتم كشف نتائج التحاليل غير المكتملة أو غير الموقعة من مدير المخبر أو استشاري الأشعة لحين استكمال الاعتماد النهائي.' 
                    : 'This diagnostic document is digitally verified. In adherence to medical privacy standards, draft and intermediate laboratory/radiology findings remain masked until official sign-off is completed.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
