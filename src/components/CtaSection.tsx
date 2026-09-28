'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Rocket, Building2, Stethoscope, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CtaSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('cta');
  const locale = useLocale();

  return (
    <section className="py-32 bg-[#0F172A] relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2" />
      
      {/* Abstract background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-10">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Badge variant="info" className="bg-primary/20 border-primary/20 text-white font-black uppercase tracking-widest px-6 py-2" icon={<Rocket className="w-4 h-4" />}>
            {t('badge')}
          </Badge>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.1]"
        >
          {t('title_prefix')} <span className="text-primary font-satisfy">Aafiya</span> {t('title_suffix')}
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed"
        >
          {t('description')}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6"
        >
          <Button
            size="lg"
            variant="primary"
            onClick={() => onOpenAuth('booking_center', true)}
            className="w-full sm:w-auto px-12 h-16 rounded-2xl shadow-2xl shadow-primary/40 font-black text-lg group"
          >
            <Building2 className="w-6 h-6" />
            <span>{t('cta_booking')}</span>
            <ArrowLeft className={cn("w-6 h-6 transition-transform", locale === 'ar' ? "group-hover:-translate-x-2" : "group-hover:translate-x-2 rotate-180")} />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => onOpenAuth('doctor', true)}
            className="w-full sm:w-auto px-12 h-16 rounded-2xl border-white/10 text-white hover:bg-white hover:text-slate-900 font-black text-lg group"
          >
            <Stethoscope className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
            <span>{t('cta_doctor')}</span>
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="pt-10 flex flex-wrap items-center justify-center gap-8"
        >
          {[
            t('trust1'),
            t('trust2')
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-widest">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
                <ShieldCheck className="w-4 h-4" />
              </div>
              {text}
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};
