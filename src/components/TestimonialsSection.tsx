'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { TESTIMONIALS_LIST } from '../data/content';
import { Building2, Stethoscope, UserCheck, FlaskConical, Quote } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

const roleIcons: Record<string, React.ReactNode> = {
  Building2: <Building2 className="w-5 h-5" />,
  Stethoscope: <Stethoscope className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  FlaskConical: <FlaskConical className="w-5 h-5" />
};

export const TestimonialsSection: React.FC = () => {
  const t = useTranslations('testimonials');

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <Badge variant="info">{t('section_badge')}</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')} <br />
            <span className="text-primary underline decoration-primary/20 underline-offset-8 font-satisfy">{t('subtitle')}</span>
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Testimonials / Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TESTIMONIALS_LIST.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                variant="elevated"
                padding="lg"
                className="h-full border-transparent hover:border-primary/20 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Quote className="w-6 h-6" />
                    </div>
                    <Badge variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                      {t('sample_scenario_badge')}
                    </Badge>
                  </div>

                  <p className="text-slate-600 text-sm font-bold leading-relaxed relative">
                    <span className="relative z-10">&ldquo;{t(`${item.id}_comment`)}&rdquo;</span>
                  </p>
                </div>

                <div className="pt-8 border-t border-slate-50 mt-8 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    {roleIcons[item.icon || 'Building2'] || <Building2 className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5 text-start min-w-0">
                    <h4 className="font-black text-slate-900 text-sm truncate">{t(`${item.id}_name`)}</h4>
                    <p className="text-[11px] text-primary font-black uppercase tracking-wider truncate">{t(`${item.id}_role`)}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate">{t(`${item.id}_entity`)}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
