'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { STATISTICS_DATA } from '../data/content';
import { CheckCircle2, MapPin, Lock, Stethoscope, ShieldCheck } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

const iconMap: Record<string, React.ReactNode> = {
  quota_governance: <CheckCircle2 className="w-6 h-6" />,
  national_directory: <MapPin className="w-6 h-6" />,
  data_security: <Lock className="w-6 h-6" />,
  care_coordination: <Stethoscope className="w-6 h-6" />
};

export const StatsSection: React.FC = () => {
  const t = useTranslations('statistics');

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STATISTICS_DATA.map((stat, idx) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card 
                variant="elevated"
                padding="lg"
                className="bg-slate-50 border-transparent hover:border-primary/20 hover:shadow-xl group transition-all duration-500 overflow-hidden relative h-full flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                  {React.cloneElement((iconMap[stat.id] || <ShieldCheck className="w-6 h-6" />) as React.ReactElement<any>, {
                    className: "w-20 h-20 text-primary"
                  })}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white text-primary shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                      {iconMap[stat.id] || <ShieldCheck className="w-6 h-6" />}
                    </div>
                    <Badge variant="info" className="bg-primary/10 border-transparent text-primary text-[10px]" icon={<ShieldCheck className="w-3 h-3" />}>
                      {t('operational_pillar')}
                    </Badge>
                  </div>

                  <div className="space-y-2 relative z-10 text-start">
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                      {t(`${stat.id}_highlight`)}
                    </div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {t(stat.id)}
                    </div>
                    <div className="text-xs text-slate-500 font-bold leading-relaxed">
                      {t(`${stat.id}_desc`)}
                    </div>
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
