'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ShieldCheck, UserCheck, Lock, FileCheck2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';
import { RoleType } from '../types';

interface TrustPrivacySectionProps {
  onOpenAuth?: (role?: RoleType, isRegister?: boolean) => void;
}

export const TrustPrivacySection: React.FC<TrustPrivacySectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('trust_privacy');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const pillars = [
    {
      id: 'rbac',
      icon: UserCheck,
      title: t('pillars.rbac.title'),
      description: t('pillars.rbac.description'),
      badge: t('pillars.rbac.badge')
    },
    {
      id: 'protection',
      icon: Lock,
      title: t('pillars.protection.title'),
      description: t('pillars.protection.description'),
      badge: t('pillars.protection.badge')
    },
    {
      id: 'policy',
      icon: FileCheck2,
      title: t('pillars.policy.title'),
      description: t('pillars.policy.description'),
      badge: t('pillars.policy.badge')
    }
  ];

  return (
    <section id="trust" className="py-24 bg-[#F2F8F7] relative overflow-hidden border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge 
            variant="info" 
            className="px-4 py-1.5 text-xs font-bold bg-[#087F83]/10 text-[#087F83] border-[#087F83]/20"
            icon={<ShieldCheck className="w-4 h-4 text-[#087F83]" />}
          >
            {t('section_badge')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#123B50] tracking-tight leading-tight">
            {t('title')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, idx) => {
            const IconComponent = pillar.icon;
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="h-full"
              >
                <Card
                  variant="elevated"
                  padding="lg"
                  className="h-full bg-white border-slate-200/80 hover:border-[#087F83]/30 hover:shadow-xl hover:shadow-[#087F83]/5 transition-all duration-300 flex flex-col justify-between text-start"
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="w-13 h-13 rounded-2xl bg-[#087F83]/10 flex items-center justify-center text-[#087F83] shrink-0 shadow-2xs">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <Badge variant="neutral" className="text-[11px] font-bold border-slate-200 text-slate-500 bg-slate-50">
                        {pillar.badge}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#123B50]">
                        {pillar.title}
                      </h3>
                      <p className="text-sm text-slate-600 font-normal leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-6 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-[#087F83]">
                    <span className="w-2 h-2 rounded-full bg-[#087F83]" />
                    <span>{t('pillar_footer')}</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Governance & Trust Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs text-start">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#087F83]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#123B50]">
                {t('governance_notice.title')}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {t('governance_notice.description')}
              </p>
            </div>
          </div>
          {onOpenAuth && (
            <button
              onClick={() => onOpenAuth('doctor', false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 hover:bg-[#087F83]/10 border border-slate-200 hover:border-[#087F83]/30 text-xs font-bold text-[#123B50] transition-colors shrink-0"
            >
              <span>{t('governance_notice.cta')}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5 text-[#087F83]" /> : <ArrowRight className="w-3.5 h-3.5 text-[#087F83]" />}
            </button>
          )}
        </div>

      </div>
    </section>
  );
};
