'use client';

import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  Clock, 
  CircleHelp, 
  Sparkles, 
  ArrowLeft,
  Zap
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

interface WhyUsSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const WhyUsSection: React.FC<WhyUsSectionProps> = ({ onOpenAuth }) => {
  const painPoints = [
    {
      title: 'الذهاب المبكر لحجز الموعد',
      description: 'ذهبت إلى العيادة فقط للحصول على موعد شخصياً واستهلاك مصاريف التنقل.'
    },
    {
      title: 'ساعات الانتظار الطويلة والازدحام',
      description: 'انتظرت ساعات طويلة في العيادة أو خرجت قبل الفجر في البرد أو الحر للحصول على رقم دور.'
    },
    {
      title: 'تكرار المشاق والرحلات',
      description: 'عدت مرة أخرى في يوم آخر فقط لمقابلة الطبيب دون التأكد المسبق من جاهزية العيادة.'
    }
  ];

  const solutions = [
    {
      title: 'حجز أكثر تنظيمًا عبر مراكز الحجز المعتمدة',
      description: 'تنسيق مباشر ومضمون من أقرب مركز حجز معتمد دون عناء السفر بنفسك.'
    },
    {
      title: 'تقليل الازدحام داخل العيادات',
      description: 'تنظيم تدفق المرضى بأوقات محددة مسبقاً يضمن راحة الجميع وسلامتهم.'
    },
    {
      title: 'توفير الوقت والجهد على المرضى',
      description: 'استغلال الوقت في الرعاية والصحة بدلاً من إضاعته في طوابير الانتظار العشوائية.'
    },
    {
      title: 'تنظيم أفضل لمواعيد الأطباء',
      description: 'جدول عمل واضح للعيادة والأطباء يحترم طاقة الكادر الطبي وزمن المعاينة.'
    },
    {
      title: 'ملف طبي إلكتروني للمريض المسجل',
      description: 'سجل صحي رقمي دائم وموحد يضمن حفظ تاريخك المرضي وفحوصاتك بأمان تام.'
    }
  ];

  return (
    <section id="why-us" className="py-24 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative ambient backdrop */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="info" icon={<CircleHelp className="w-4 h-4" />}>رؤية المنصة وقيمتها الحقيقية</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            لماذا <span className="text-primary font-satisfy">Aafiya</span>؟
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            نحدث فرقاً حقيقياً في حياة المريض اليومية عبر الانتقال من المعاناة التقليدية إلى حل رقمي منظم ومنسق.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Pain Points Box */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 h-full"
          >
            <Card variant="elevated" padding="lg" className="h-full border-rose-100 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
              
              <div className="space-y-8 flex-1">
                <div className="flex items-center gap-4 border-b border-rose-50 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">هل سبق أن...</h3>
                    <p className="text-xs text-rose-500 font-black uppercase tracking-widest mt-1">تحديات النظام التقليدي</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {painPoints.map((item, idx) => (
                    <div key={idx} className="p-5 bg-rose-50/30 rounded-2xl border border-rose-100/50 flex items-start gap-4">
                      <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900">{item.title}</h4>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-rose-50 text-xs text-rose-600 font-black flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>تؤدي هذه العوائق إلى إرهاق المريض وضياع الوقت وتدهور جودة الخدمة.</span>
              </div>
            </Card>
          </motion.div>

          {/* Solutions Box */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 h-full"
          >
            <Card variant="elevated" padding="lg" className="h-full border-primary/20 shadow-2xl shadow-primary/5 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
              
              <div className="space-y-8 flex-1">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900">مع <span className="text-primary font-satisfy">Aafiya</span></h3>
                      <p className="text-xs text-primary font-black uppercase tracking-widest mt-1">التحول الرقمي الموثوق</p>
                    </div>
                  </div>
                  <Badge variant="info">حلول معتمدة</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {solutions.map((sol, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-[24px] border-2 transition-all group ${
                        idx === 4 
                          ? 'sm:col-span-2 bg-gradient-to-l from-primary/5 to-transparent border-primary/20' 
                          : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900">{sol.title}</h4>
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">{sol.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-sm text-slate-400 font-black">
                  جاهز لإنهاء طوابير الانتظار والانضمام للمنظومة؟
                </div>
                <Button
                  onClick={() => onOpenAuth('patient_registered', true)}
                  className="px-8"
                >
                  <span>ابدأ الآن وتسجل مجاناً</span>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>

            </Card>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
