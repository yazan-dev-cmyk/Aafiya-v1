'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FAQS_LIST } from '../data/content';
import { CircleHelp, ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';

export const FaqSection: React.FC = () => {
  const t = useTranslations('faq');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('faq_3');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: t('categories.all') },
    { id: 'booking_center', label: t('categories.booking_center') },
    { id: 'patients', label: t('categories.patients') },
    { id: 'doctors', label: t('categories.doctors') },
    { id: 'labs_rad', label: t('categories.labs_rad') },
    { id: 'security', label: t('categories.security') },
  ];

  const filteredFaqs = FAQS_LIST.filter(faq => {
    const matchesCat = activeCategory === 'all' || faq.category === activeCategory;
    const q = t(`${faq.id}.question`).toLowerCase();
    const a = t(`${faq.id}.answer`).toLowerCase();
    const s = searchQuery.toLowerCase();
    const matchesQuery = searchQuery.trim() === '' || q.includes(s) || a.includes(s);
    return matchesCat && matchesQuery;
  });

  return (
    <section id="faq" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <Badge variant="info" icon={<CircleHelp className="w-4 h-4" />}>{t('section_badge')}</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')} <br />
            <span className="text-primary">{t('subtitle')}</span>
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-10 group">
          <Search className="w-6 h-6 text-slate-400 absolute start-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-14 pe-6 h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all shadow-sm focus:shadow-xl focus:shadow-primary/5"
          />
        </div>

        {/* Category ListFilter Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-12 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all cursor-pointer border-2 ${
                activeCategory === cat.id
                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion Questions List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = expandedId === faq.id;
                return (
                  <motion.div
                    key={faq.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-3xl border-2 transition-all duration-300 ${
                      isOpen ? 'border-primary bg-white shadow-2xl shadow-primary/5' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedId(isOpen ? null : faq.id)}
                      className="w-full p-6 text-start font-black text-slate-900 text-sm md:text-base flex items-center justify-between gap-6 cursor-pointer"
                    >
                      <span className="leading-snug">{t(`${faq.id}.question`)}</span>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isOpen ? 'bg-primary text-white rotate-180' : 'bg-white text-slate-400'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 text-slate-500 text-sm font-bold leading-relaxed border-t border-slate-50 text-start">
                            <p>{t(`${faq.id}.answer`)}</p>
                            <div className="mt-6 flex items-center gap-3 text-[11px] text-primary font-black uppercase tracking-widest pt-4 border-t border-slate-50">
                              <ShieldCheck className="w-4 h-4" />
                              <span>{t('source_note')}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold">{t('no_results')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};
