'use client';

import React from 'react';
import { 
  FileText, 
  Lock, 
  Fingerprint, 
  History, 
  ShieldAlert, 
  Pill, 
  FlaskConical, 
  CheckCircle2, 
  ArrowLeft,
  Activity,
  Cpu
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

interface MedicalFileSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const MedicalFileSection: React.FC<MedicalFileSectionProps> = ({ onOpenAuth }) => {
  return (
    <section id="emr" className="py-24 bg-white relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-teal-50 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
          
          {/* Left Side: Mockup Card of EMR */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <Card variant="default" padding="none" className="bg-[#0F172A] border-slate-800 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)] relative overflow-hidden">
              
              {/* Animated scanning line effect */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent z-10 pointer-events-none" 
              />

              <div className="p-8 space-y-8 relative z-20">
                {/* Patient Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xl border border-teal-500/30">
                      م.س
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-white">سامي عبد الرحمن</h4>
                      <p className="text-xs text-slate-400 font-bold">مريض مسجل برقم دائم</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full mb-1">
                      <Cpu className="w-3 h-3 text-teal-400" />
                      <span className="text-[10px] text-teal-400 font-black font-mono">UUID-8841-9023</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">مشفر AES-256</div>
                  </div>
                </div>

                {/* Health Metrics Strip */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'فصيلة الدم', value: 'O+ Positive', color: 'teal' },
                    { label: 'الحساسية', value: 'البنسلين', color: 'rose' },
                    { label: 'الأمراض المزمنة', value: 'الضغط', color: 'amber' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-center">
                      <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">{metric.label}</span>
                      <span className={`text-sm font-black text-${metric.color}-400`}>{metric.value}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline mockup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">التاريخ الطبي الأخير</span>
                    <Badge variant="info" className="bg-primary/10 border-primary/20 text-primary">نشط</Badge>
                  </div>

                  <div className="bg-white/[0.05] rounded-3xl p-5 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-black text-white">زيارة طبيب القلب — د. سليم</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">01 أغسطس 2026</span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">التشخيص: ارتفاع طفيف في ضغط الدم. تم إصدار وصفة طبية وتحاليل دورية.</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral" className="bg-teal-500/10 border-teal-500/20 text-teal-400 text-[10px]" icon={<Pill className="w-3 h-3" />}>وصفة معتمدة</Badge>
                      <Badge variant="neutral" className="bg-primary/10 border-primary/20 text-primary text-[10px]" icon={<FlaskConical className="w-3 h-3" />}>رفع نتائج المختبر</Badge>
                    </div>
                  </div>
                </div>

                {/* Security Footer Note */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t border-white/5 pt-6 font-bold">
                  <Lock className="w-4 h-4 text-teal-500" />
                  <span>الفصل 7.10: لا يجوز حذف السجل الطبي التاريخي، وأي تصحيح يُحفظ بسجل جديد.</span>
                </div>

              </div>
            </Card>
          </motion.div>

          {/* Right Side: Description */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 order-1 lg:order-2 space-y-8"
          >
            
            <div className="space-y-4">
              <Badge variant="info" icon={<Fingerprint className="w-4 h-4" />}>الفصل السابع من وثيقة الأعمال</Badge>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                الملف الطبي الإلكتروني <br />
                <span className="text-primary underline decoration-primary/20 underline-offset-8">سجل صحي رقمي موحد</span>
              </h2>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                يُنشأ الملف الطبي الإلكتروني تلقائياً عند تسجيل المريض في منصة عافية، ويُمنح معرفاً داخلياً فريداً (UUID) يضمن استمرارية وتكامل ملفك الصحى.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { 
                  icon: <History className="w-5 h-5" />, 
                  title: 'التراكم الصحي الموثوق', 
                  desc: 'تُضاف جميع التشخيصات والوصفات ونتائج التحاليل والأشعة تلقائياً إلى مسارك دون خطورة فقدان الورقيات.' 
                },
                { 
                  icon: <Lock className="w-5 h-5" />, 
                  title: 'سرية تامة ومبدأ أقل صلاحية', 
                  desc: 'الاطلاع مقتصر على الطبيب المعالج أثناء الزيارة المعتمدة فقط، مع تشفير البيانات وتسجيل جميع عمليات الوصول.' 
                },
                { 
                  icon: <ShieldAlert className="w-5 h-5" />, 
                  title: 'المريض الزائر (Guest Patient)', 
                  desc: 'المريض الزائر يحصل على الوصفات والطلبات المطبوعة فوراً دون فتح سجل طبي دائم داخل قاعدة البيانات.' 
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5 p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <Button
                size="lg"
                onClick={() => onOpenAuth('patient_registered', true)}
                className="px-10 h-14 rounded-2xl shadow-2xl shadow-primary/20"
              >
                <span>إنشاء حساب مريض مسجل (UUID)</span>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
};
