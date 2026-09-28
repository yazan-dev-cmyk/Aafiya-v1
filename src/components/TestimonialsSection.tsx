'use client';

import React from 'react';
import { TESTIMONIALS_LIST } from '../data/content';
import { Star, Quote } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';
import Image from 'next/image';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <Badge variant="info">آراء الشركاء والمستخدمين</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            ماذا يقول شبكة شركاء <br />
            <span className="text-primary underline decoration-primary/20 underline-offset-8 font-satisfy">Aafiya</span>؟
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            شهادات حقيقية من مدراء مراكز الحجز، الأطباء، المرضى، وأصحاب المختبرات الطبية المعتمدة.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TESTIMONIALS_LIST.map((t, idx) => (
            <motion.div
              key={t.id}
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
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm font-bold leading-relaxed italic relative">
                    <span className="relative z-10">&ldquo;{t.comment}&rdquo;</span>
                  </p>
                </div>

                <div className="pt-8 border-t border-slate-50 mt-8 flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-primary/20 transition-colors">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-black text-slate-900 text-sm">{t.name}</h4>
                    <p className="text-[11px] text-primary font-black uppercase tracking-widest">{t.role}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{t.entity}</p>
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
