'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { STATISTICS_DATA } from '../data/content';
import { Building2, Stethoscope, CheckCircle2, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

const iconMap: Record<string, React.ReactNode> = {
  centers: <Building2 className="w-6 h-6" />,
  doctors: <Stethoscope className="w-6 h-6" />,
  appointments: <CheckCircle2 className="w-6 h-6" />,
  patients: <FileSpreadsheet className="w-6 h-6" />
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
                className="bg-slate-50 border-transparent hover:border-primary/20 hover:shadow-xl group transition-all duration-500 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                  {React.cloneElement(iconMap[stat.id] as React.ReactElement<any>, {
                    className: "w-20 h-20 text-primary"
                  })}
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white text-primary shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                    {iconMap[stat.id]}
                  </div>
                  <Badge variant="info" className="bg-primary/10 border-transparent text-primary" icon={<TrendingUp className="w-3 h-3" />}>
                    {t('performance_indicator')}
                  </Badge>
                </div>

                <div className="space-y-2 relative z-10 text-start">
                  <div className="text-4xl font-black text-slate-900 tracking-tight font-sans group-hover:text-primary transition-colors">
                    {stat.count}
                  </div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    {t(stat.id)}
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-relaxed">
                    {t(`${stat.id}_desc`)}
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
