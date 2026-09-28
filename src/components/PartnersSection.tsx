'use client';

import React from 'react';
import { ShieldCheck, Building2, Stethoscope, FlaskConical, ScanLine } from 'lucide-react';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

export const PartnersSection: React.FC = () => {
  const partners = [
    { name: 'شبكة العيادات الطبية المتخصصة', icon: <Stethoscope className="w-5 h-5" /> },
    { name: 'مخابر التحاليل الطبية الجزائرية', icon: <FlaskConical className="w-5 h-5" /> },
    { name: 'مراكز التصوير بالأشعة والرنين', icon: <ScanLine className="w-5 h-5" /> },
    { name: 'وكالات ومكاتب خدمات الحجز', icon: <Building2 className="w-5 h-5" /> },
    { name: 'جمعيات رعاية المرضى والتضامن', icon: <ShieldCheck className="w-5 h-5" /> }
  ];

  return (
    <section className="py-16 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="neutral" className="bg-transparent border-transparent text-slate-400 font-black uppercase tracking-widest text-[10px]">
            مؤسسات ومراكز صحية تثق بمنظومة عافية عبر 48 ولاية
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {partners.map((p, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default group"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:shadow-md transition-all">
                {p.icon}
              </div>
              <span className="text-sm font-black text-slate-500 group-hover:text-slate-900 transition-colors">{p.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
