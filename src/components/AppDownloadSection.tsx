'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Smartphone, 
  Stethoscope, 
  Download, 
  QrCode, 
  ShieldCheck 
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const AppDownloadSection: React.FC = () => {
  const t = useTranslations('appDownload');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <section id="download" className="py-24 bg-white relative overflow-hidden [contain:paint] border-b border-slate-200/60">
      {/* Background Subtle Gradient Blobs */}
      <div className={cn("absolute top-10 w-96 h-96 bg-blue-50/70 rounded-full blur-3xl pointer-events-none -z-10", isRtl ? "right-10" : "left-10")} />
      <div className={cn("absolute bottom-10 w-96 h-96 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none -z-10", isRtl ? "left-10" : "right-10")} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Badge variant="info" icon={<Smartphone className="w-4 h-4" />}>
              {t('sectionBadge')}
            </Badge>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight"
          >
            {t('title')} <span className="text-primary font-satisfy">{t('titleAccent')}</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 font-bold leading-relaxed max-w-2xl mx-auto"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* 2-Card App Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          
          {/* CARD 1: AAFIYA Patient */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              variant="elevated" 
              padding="lg" 
              className="h-full flex flex-col justify-between space-y-8 border-slate-200/80 hover:border-primary/40 hover:shadow-2xl transition-all"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 text-start">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" className="py-0.5 px-2.5 text-[10px]">
                          {t('patient.badge')}
                        </Badge>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {t('patient.platform')}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {t('patient.name')}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base text-slate-600 font-bold leading-relaxed text-start">
                  {t('patient.description')}
                </p>

                {/* Desktop QR Display */}
                <div className="hidden md:flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-md">
                    <Image 
                      src="/qr/qr-patient-apk.png" 
                      alt="AAFIYA Patient QR Code" 
                      width={160}
                      height={160}
                      className="w-40 h-40 object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-600 text-center flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-primary shrink-0" />
                    <span>{t('desktopScanNotice')}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <a 
                  href="/downloads/aafiya-patient.apk" 
                  download="aafiya-patient.apk"
                  className="w-full inline-flex"
                >
                  <Button 
                    variant="primary" 
                    size="lg" 
                    fullWidth 
                    className="h-14 font-black text-base shadow-xl shadow-primary/20 group"
                  >
                    <Download className="w-5 h-5 me-2 group-hover:-translate-y-0.5 transition-transform" />
                    <span>{t('patient.downloadButton')}</span>
                  </Button>
                </a>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('officialBuild')}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* CARD 2: AAFIYA Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Card 
              variant="elevated" 
              padding="lg" 
              className="h-full flex flex-col justify-between space-y-8 border-slate-200/80 hover:border-emerald-500/40 hover:shadow-2xl transition-all"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 text-start">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="py-0.5 px-2.5 text-[10px]">
                          {t('pro.badge')}
                        </Badge>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {t('pro.platform')}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {t('pro.name')}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base text-slate-600 font-bold leading-relaxed text-start">
                  {t('pro.description')}
                </p>

                {/* Desktop QR Display */}
                <div className="hidden md:flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-md">
                    <Image 
                      src="/qr/qr-pro-apk.png" 
                      alt="AAFIYA Pro QR Code" 
                      width={160}
                      height={160}
                      className="w-40 h-40 object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-600 text-center flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('desktopScanNotice')}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <a 
                  href="/downloads/aafiya-pro.apk" 
                  download="aafiya-pro.apk"
                  className="w-full inline-flex"
                >
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    fullWidth 
                    className="h-14 font-black text-base shadow-xl shadow-secondary/20 group"
                  >
                    <Download className="w-5 h-5 me-2 group-hover:-translate-y-0.5 transition-transform" />
                    <span>{t('pro.downloadButton')}</span>
                  </Button>
                </a>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('officialBuild')}</span>
                </div>
              </div>
            </Card>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
