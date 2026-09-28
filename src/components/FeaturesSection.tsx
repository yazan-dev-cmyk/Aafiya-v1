'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FEATURES_LIST } from '../data/content';
import { 
  CalendarCheck2, 
  FileText, 
  UserCheck, 
  Pill, 
  Microscope, 
  PackageCheck,
  ChevronLeft
} from 'lucide-react';
import { RoleType } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface FeaturesSectionProps {
  onSelectFeature?: (featureId: string) => void;
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

const featureIcons: Record<string, React.ReactNode> = {
  CalendarCheck2: <CalendarCheck2 className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
  UserCheck: <UserCheck className="w-6 h-6" />,
  Pill: <Pill className="w-6 h-6" />,
  Microscope: <Microscope className="w-6 h-6" />,
  PackageCheck: <PackageCheck className="w-6 h-6" />
};

export const FeaturesSection: React.FC<FeaturesSectionProps> = () => {
  const t = useTranslations('features');
  const locale = useLocale();

  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <Badge variant="info" className="px-5 py-2">{t('section_badge')}</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES_LIST.map((feat, idx) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                variant="elevated"
                padding="lg"
                className="h-full border-transparent hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                      {React.cloneElement(featureIcons[feat.icon] as React.ReactElement<any>, {
                        className: "w-7 h-7 text-primary group-hover:text-white transition-colors"
                      })}
                    </div>
                    <Badge variant="warning" className="animate-pulse">
                      {t(`${feat.id}.badge`)}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-start">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                      {t(`${feat.id}.title`)}
                    </h3>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">
                      {t(`${feat.id}.description`)}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 mt-8 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    {t('official_function')}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all cursor-pointer">
                    <ChevronLeft className={cn("w-4 h-4", locale === 'en' && "rotate-180")} />
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
