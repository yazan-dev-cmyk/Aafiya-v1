'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Building2, 
  Stethoscope, 
  ArrowLeft, 
  Sparkles,
  Zap,
  UserCheck,
  ShieldCheck,
  CalendarCheck2
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface HeroProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
  onOpenCalculator: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenAuth,
}) => {
  const t = useTranslations('hero');
  const locale = useLocale();

  return (
    <section id="hero" className="relative pt-6 pb-16 md:py-20 overflow-hidden gradient-mesh border-b border-slate-200/60">
      
      {/* Subtle Background Glows */}
      <div className={cn("absolute top-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none", locale === 'ar' ? 'right-10' : 'left-10')} />
      <div className={cn("absolute bottom-10 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none", locale === 'ar' ? 'left-10' : 'right-10')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Content Column */}
          <div className="lg:col-span-7 space-y-6 text-start">
            
            {/* Top Badge */}
            <Badge variant="info" icon={<Sparkles className="w-4 h-4" />} className="py-1.5 px-4">
              <span>{t('badge')}</span>
            </Badge>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] leading-[1.15] tracking-tight font-sans">
              {t('title_part1')} <br />
              <span className="text-primary font-satisfy">{t('title_accent')}</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
              {t('description')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => onOpenAuth('booking_center', true)}
                className="shadow-xl shadow-primary/20"
              >
                <span>{t('cta_register')}</span>
                <ArrowLeft className={cn("w-5 h-5", locale === 'en' && "rotate-180")} />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('why-us');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Zap className="w-5 h-5 text-primary" />
                <span>{t('cta_workflow')}</span>
              </Button>
            </div>

          </div>

          {/* Graphic Column */}
          <div className="lg:col-span-5 relative">
            <div className={cn("absolute -top-10 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none", locale === 'ar' ? '-left-10' : '-right-10')} />
            <Card variant="elevated" padding="lg" className="relative z-10 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <h3 className="font-extrabold text-[#0F172A] text-sm">{t('illustration_title')}</h3>
                    <p className="text-[11px] text-slate-500 font-bold">{t('illustration_subtitle')}</p>
                  </div>
                </div>
                <Badge variant="info">{t('unified_system')}</Badge>
              </div>

              {/* 3 Ecosystem Pillar Cards */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-primary flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <h4 className="text-sm font-bold text-[#0F172A]">{t('patients_title')}</h4>
                    <p className="text-xs text-slate-600 font-bold">{t('patients_desc')}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <h4 className="text-sm font-bold text-[#0F172A]">{t('centers_title')}</h4>
                    <p className="text-xs text-slate-600 font-bold">{t('centers_desc')}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <h4 className="text-sm font-bold text-[#0F172A]">{t('doctors_title')}</h4>
                    <p className="text-xs text-slate-600 font-bold">{t('doctors_desc')}</p>
                  </div>
                </div>
              </div>

              {/* Bottom badge */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-center">
                <span className="text-xs font-bold text-primary flex items-center justify-center gap-1.5">
                  <CalendarCheck2 className="w-4 h-4" />
                  {t('footer_badge')}
                </span>
              </div>

            </Card>
          </div>

        </div>
      </div>
    </section>
  );
};

