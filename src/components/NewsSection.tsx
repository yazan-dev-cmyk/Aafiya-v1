'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { NEWS_LIST } from '../data/content';
import { Clock, ArrowLeft, Newspaper, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cn } from '../lib/utils';

export const NewsSection: React.FC = () => {
  const t = useTranslations('news');
  const locale = useLocale();

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 text-start">
          <div className="space-y-4">
            <Badge variant="info" icon={<Newspaper className="w-4 h-4" />}>{t('section_badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {t('title')} <br />
              <span className="text-primary underline decoration-primary/20 underline-offset-8">{t('subtitle')}</span>
            </h2>
          </div>
          <Button variant="ghost" className="font-black text-primary hover:text-primary hover:bg-primary/5">
            <span>{t('view_all')}</span>
            {locale === 'ar' ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
          </Button>
        </div>

        {/* News Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {NEWS_LIST.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                variant="elevated"
                padding="none"
                className="h-full border-transparent hover:border-primary/20 hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={t(`${item.id}.title`)}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                    <div className="absolute top-4 right-4">
                      <Badge variant="neutral" className="bg-white/90 backdrop-blur-md text-slate-900 border-transparent font-black uppercase tracking-widest text-[10px]">
                        {t(`categories.${item.categoryKey}`)}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-8 space-y-4 text-start">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>{item.date}</span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {t(`${item.id}.readTime`)}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors leading-snug">
                      {t(`${item.id}.title`)}
                    </h3>

                    <p className="text-sm text-slate-500 font-bold leading-relaxed line-clamp-3">
                      {t(`${item.id}.summary`)}
                    </p>
                  </div>
                </div>

                <div className="px-8 pb-8 pt-0">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest group-hover:gap-4 transition-all cursor-pointer">
                    <span>{t('read_more')}</span>
                    {locale === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
