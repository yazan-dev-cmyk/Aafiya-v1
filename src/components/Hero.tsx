'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Building2, 
  Stethoscope, 
  ArrowLeft, 
  ArrowRight,
  Sparkles, 
  ShieldCheck, 
  CalendarCheck2,
  CheckCircle2,
  Lock,
  QrCode,
  Clock,
  MapPin,
  FlaskConical,
  Radio,
  LogIn
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface HeroProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
  onOpenCalculator?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenAuth,
}) => {
  const t = useTranslations('hero');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const scrollToDirectory = (category?: string) => {
    const el = document.getElementById('search-directory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      if (category) {
        window.dispatchEvent(new CustomEvent('aafiya:select-category', { detail: { category } }));
      }
    }
  };

  return (
    <section id="hero" className="relative pt-8 pb-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/80 border-b border-slate-200/60">
      
      {/* Background Soft Radial Glows & Authentic Geometric Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#0077B6_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] pointer-events-none" />
      <div className={cn("absolute top-12 w-[32rem] h-[32rem] bg-sky-200/35 rounded-full blur-3xl pointer-events-none", isRtl ? "-right-20" : "-left-20")} />
      <div className={cn("absolute bottom-6 w-[28rem] h-[28rem] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none", isRtl ? "-left-20" : "-right-20")} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Content Column (7 cols) */}
          <div className="lg:col-span-7 space-y-7 text-start">
            
            {/* Top Operational Trust Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-xs backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>{t('badge')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 animate-pulse" />
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.2] tracking-tight">
              <span>{t('title_part1')}</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-[#005F92] to-secondary bg-clip-text text-transparent">
                {t('title_accent')}
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
              {t('description')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => scrollToDirectory()}
                className="shadow-xl shadow-primary/25 text-base font-bold px-8 h-13 rounded-2xl group cursor-pointer"
              >
                <span>{isRtl ? 'احجز موعدك الآن' : t('cta_register')}</span>
                {isRtl ? (
                  <ArrowLeft className="w-5 h-5 ms-1 group-hover:-translate-x-1 transition-transform" />
                ) : (
                  <ArrowRight className="w-5 h-5 ms-1 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => onOpenAuth('doctor', false)}
                className="h-13 px-6 rounded-2xl font-bold text-slate-700 hover:text-primary hover:border-primary/40 border-slate-300 bg-white/80 backdrop-blur-xs cursor-pointer"
              >
                <LogIn className="w-4.5 h-4.5 text-primary" />
                <span>{isRtl ? 'دخول الكوادر والمراكز' : 'Professional Portal'}</span>
              </Button>
            </div>

            {/* Quick Category Jump Badges */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-slate-400 me-1">{isRtl ? 'خدمات سريعة:' : 'Quick access:'}</span>
              <button
                type="button"
                onClick={() => scrollToDirectory('doctor')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all hover:border-primary/30 cursor-pointer shadow-2xs"
              >
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                <span>{isRtl ? 'أطباء معتمدون' : 'Doctors'}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToDirectory('clinic')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all hover:border-primary/30 cursor-pointer shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isRtl ? 'عيادات تخصصية' : 'Clinics'}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToDirectory('booking_center')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all hover:border-primary/30 cursor-pointer shadow-2xs"
              >
                <CalendarCheck2 className="w-3.5 h-3.5 text-sky-600" />
                <span>{isRtl ? 'مراكز الحجز' : 'Booking Centers'}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToDirectory('lab')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all hover:border-primary/30 cursor-pointer shadow-2xs"
              >
                <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                <span>{isRtl ? 'مخابر التحاليل' : 'Laboratories'}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToDirectory('radiology')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all hover:border-primary/30 cursor-pointer shadow-2xs"
              >
                <Radio className="w-3.5 h-3.5 text-purple-600" />
                <span>{isRtl ? 'مراكز الأشعة' : 'Radiology'}</span>
              </button>
            </div>

          </div>

          {/* Graphic Column (5 cols) - Authentic Algerian Digital Visit Pass Preview */}
          <div className="lg:col-span-5 relative">
            
            {/* Ambient Background Glow */}
            <div className={cn("absolute -top-12 w-72 h-72 bg-gradient-to-br from-primary/30 to-secondary/20 rounded-full blur-3xl opacity-70 pointer-events-none", isRtl ? "-left-8" : "-right-8")} />
            
            <div className="relative z-10 transition-transform duration-500 hover:-translate-y-1">
              
              {/* Outer Card with layered border */}
              <div className="p-1 rounded-3xl bg-gradient-to-br from-primary/30 via-slate-200 to-secondary/30 shadow-2xl shadow-slate-900/10">
                <div className="bg-white rounded-[22px] p-6 sm:p-7 space-y-6 relative overflow-hidden">
                  
                  {/* Subtle Khatam Star Pattern Watermark */}
                  <div 
                    aria-hidden="true"
                    className="absolute -end-10 -bottom-10 w-44 h-44 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0 L52 28 L80 40 L52 52 L40 80 L28 52 L0 40 L28 28 Z' fill='%230077B6'/%3E%3C/svg%3E")`,
                      backgroundSize: '80px 80px'
                    }}
                  />

                  {/* Real Medical Consultation Showcase Banner */}
                  <div className="relative h-44 sm:h-48 w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm group">
                    <img 
                      src="/images/hero/doctor-consultation-hero.jpg" 
                      alt={isRtl ? 'استشارة طبية ورعاية صحية معتمدة' : 'Accredited healthcare consultation'} 
                      className="w-full h-full object-cover object-[center_30%] transition-transform duration-700 group-hover:scale-105"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-xs font-bold text-slate-800 shadow-xs border border-white/50">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{isRtl ? 'استشارة طبية مباشرة' : 'Direct Consultation'}</span>
                      </div>
                      <div className="text-[11px] font-bold text-white/90 bg-slate-900/60 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20">
                        {isRtl ? 'شبكة عافية المعتمدة' : 'AAFIYA Verified'}
                      </div>
                    </div>
                  </div>

                  {/* Pass Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black shadow-md shadow-primary/20">
                        <CalendarCheck2 className="w-5 h-5" />
                      </div>
                      <div className="text-start">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-slate-900 text-sm">{isRtl ? 'تذكرة موعد معتمدة' : 'Official Visit Pass'}</h3>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">AAF-2026-DZ849</p>
                      </div>
                    </div>
                    
                    <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'حجز مؤكد' : 'Confirmed'}</span>
                    </Badge>
                  </div>

                  {/* Doctor & Clinic Identity Block */}
                  <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-3 text-start">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[#005F92] text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                        أ.م
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className={`text-[10px] font-bold text-primary ${isRtl ? '' : 'uppercase tracking-wider'}`}>
                          {isRtl ? 'طبيب أخصائي معتمد' : 'Certified Specialist'}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {isRtl ? 'د. أمين منصوري' : 'Dr. Amine Mansouri'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {isRtl ? 'طب وجراحة العيون وجراحة الشبكية' : 'Ophthalmology & Retinal Surgery'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>10:30 صباحاً</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{isRtl ? 'الجزائر العاصمة' : 'Algiers'}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Security & Verification Badge */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-gradient-to-r from-sky-50 to-emerald-50 rounded-2xl border border-sky-100">
                    <div className="flex items-center gap-2.5 text-start">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center shadow-xs shrink-0">
                        <QrCode className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {isRtl ? 'مسح سريع عند الاستقبال' : 'Fast Reception QR Pass'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {isRtl ? 'تسجيل وصول فوري بدون انتظار' : 'Instant check-in without paper'}
                        </span>
                      </div>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  </div>

                  {/* Footer Security Notice */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>{isRtl ? 'حماية البيانات وخصوصية السجلات الطبية' : 'Protected data & medical record privacy'}</span>
                    </span>
                    <span className="font-bold text-primary">{isRtl ? 'شبكة عافية المعتمدة' : 'AAFIYA'}</span>
                  </div>

                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

