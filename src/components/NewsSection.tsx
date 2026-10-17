'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { NEWS_LIST } from '../data/content';
import { BookOpen, CalendarClock, ShieldCheck, ArrowLeft, ArrowRight, BookMarked } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { motion } from 'motion/react';

const guideIcons: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-8 h-8 text-teal-300" />,
  CalendarClock: <CalendarClock className="w-8 h-8 text-teal-300" />,
  ShieldCheck: <ShieldCheck className="w-8 h-8 text-teal-300" />
};

export const NewsSection: React.FC = () => {
  const t = useTranslations('news');
  const locale = useLocale();

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 text-start">
          <div className="space-y-4">
            <Badge variant="info" icon={<BookMarked className="w-4 h-4" />}>{t('section_badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {t('title')} <br />
              <span className="text-primary underline decoration-primary/20 underline-offset-8">{t('subtitle')}</span>
            </h2>
          </div>
          <a href="#faq" className="inline-flex">
            <Button variant="ghost" className="font-black text-primary hover:text-primary hover:bg-primary/5">
              <span>{t('view_all')}</span>
              {locale === 'ar' ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
            </Button>
          </a>
        </div>

        {/* Guides Cards Grid */}
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
                  <div className="relative h-44 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center border-b border-slate-100 overflow-hidden group-hover:from-teal-950 group-hover:to-slate-900 transition-colors duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      {guideIcons[item.icon || 'BookOpen'] || <BookOpen className="w-8 h-8 text-teal-300" />}
                    </div>
                    <div className="absolute top-4 end-4">
                      <Badge variant="neutral" className="bg-white/90 backdrop-blur-md text-slate-900 border-transparent font-black uppercase tracking-wider text-[10px]">
                        {t(`categories.${item.categoryKey}`)}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-8 space-y-4 text-start">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Badge variant="info" className="bg-primary/10 border-transparent text-primary text-[10px]">
                        {t(`${item.id}.readTime`)}
                      </Badge>
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
                  <a href="#faq" className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest group-hover:gap-4 transition-all cursor-pointer">
                    <span>{t('read_more')}</span>
                    {locale === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </a>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
