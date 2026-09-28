'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { STAKEHOLDER_BENEFITS } from '../data/content';
import { 
  UserCheck, 
  UserX, 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  ScanLine, 
  CheckCircle2, 
  ArrowLeft,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface StakeholderBenefitsProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

const roleIcons: Record<string, React.ReactNode> = {
  UserCheck: <UserCheck className="w-6 h-6" />,
  UserX: <UserX className="w-6 h-6" />,
  Building2: <Building2 className="w-6 h-6" />,
  Stethoscope: <Stethoscope className="w-6 h-6" />,
  FlaskConical: <FlaskConical className="w-6 h-6" />,
  ScanLine: <ScanLine className="w-6 h-6" />
};

export const StakeholderBenefits: React.FC<StakeholderBenefitsProps> = ({ onOpenAuth }) => {
  const t = useTranslations('benefits');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<RoleType>('patient_registered');

  const selectedBenefit = STAKEHOLDER_BENEFITS.find(b => b.role === activeTab) || STAKEHOLDER_BENEFITS[0];

  return (
    <section id="benefits" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge variant="info" icon={<ShieldCheck className="w-4 h-4" />}>{t('section_badge')}</Badge>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Role Navigation Tabs */}
        <div className="flex items-center justify-start md:justify-center gap-3 overflow-x-auto pb-6 mb-12 no-scrollbar">
          {STAKEHOLDER_BENEFITS.map((b) => {
            const isActive = activeTab === b.role;
            return (
              <button
                key={b.id}
                onClick={() => setActiveTab(b.role)}
                className={`flex items-center gap-3 px-6 py-4 rounded-[20px] font-black text-sm whitespace-nowrap transition-all group relative ${
                  isActive
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                    : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-200'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'} transition-colors`}>
                  {roleIcons[b.icon]}
                </span>
                <span>{t(`${b.id}.title`)}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-benefit-indicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated" padding="lg" className="overflow-hidden border-transparent shadow-2xl shadow-slate-900/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                <div className="lg:col-span-12 space-y-8">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      {roleIcons[selectedBenefit.icon]}
                    </div>
                    <div className="text-start">
                      <Badge variant="success" className="mb-1">{t(`${selectedBenefit.id}.highlight`)}</Badge>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        {t(`${selectedBenefit.id}.title`)}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xl text-slate-500 font-bold leading-relaxed max-w-4xl text-start">
                    {t(`${selectedBenefit.id}.description`)}
                  </p>

                  {/* Bullet Points Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedBenefit.points.map((_, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 hover:border-primary/20 transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black text-slate-700 leading-relaxed text-start">
                          {t(`${selectedBenefit.id}.points.${idx}`)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Section */}
                  <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      size="lg"
                      onClick={() => onOpenAuth(selectedBenefit.role, true)}
                      className="px-10"
                    >
                      <span>{t('cta_prefix')} {t(`${selectedBenefit.id}.title`).split('(')[0]}</span>
                      <ArrowLeft className={cn("w-5 h-5", locale === 'en' && "rotate-180")} />
                    </Button>
                    
                    <div className="text-xs font-black text-slate-400 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      {t('trust_text')}
                    </div>
                  </div>

                </div>

              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
