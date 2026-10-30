'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PACKAGES_DATA } from '../data/content';
import { bookingCenterService } from '@/services/bookingCenterService';
import {
  PackageCheck,
  Check,
  Sparkles
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

interface PackageCalculatorProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

interface DisplayPackage {
  id: string;
  name: string;
  package_code?: string;
  quota_units: number;
  price_dzd: number;
  description?: string;
  popular?: boolean;
}

export const PackageCalculator: React.FC<PackageCalculatorProps> = ({ onOpenAuth }) => {
  const t = useTranslations('packages');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // Live packages state
  const [packages, setPackages] = useState<DisplayPackage[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await bookingCenterService.getPackages();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const live: DisplayPackage[] = res.data.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name,
            package_code: p.package_code,
            quota_units: p.quota_units ?? p.quota ?? 100,
            price_dzd: p.price_dzd !== undefined && p.price_dzd !== null ? Number(p.price_dzd) : (p.price !== undefined ? Number(p.price) : 5000),
            description: p.description || '',
            popular: idx === 1 || p.quota_units === 500,
          }));
          setPackages(live);
        }
      } catch (e) {
        console.warn('Failed to fetch packages for homepage:', e);
      }
    };
    fetchPackages();
  }, []);

  const displayPackages: DisplayPackage[] = packages.length > 0 ? packages : PACKAGES_DATA.map((p) => ({
    id: p.id,
    name: p.name,
    package_code: p.id.toUpperCase(),
    quota_units: p.operationsCount,
    price_dzd: p.priceDzd,
    description: '',
    popular: p.popular,
  }));

  return (
    <section id="packages" className="py-24 bg-slate-50 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <Badge variant="info" icon={<PackageCheck className="w-4 h-4" />}>{t('section_badge')}</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')} <br />
            <span className="text-primary">{t('subtitle')}</span>
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayPackages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                variant={pkg.popular ? 'elevated' : 'default'}
                padding="lg"
                className={`h-full flex flex-col justify-between transition-all duration-500 relative group ${
                  pkg.popular ? 'bg-slate-900 text-white ring-4 ring-primary/20 scale-105 z-10' : 'hover:-translate-y-2 bg-white'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 right-1/2 translate-x-1/2">
                    <Badge variant="warning" className="shadow-lg animate-bounce" icon={<Sparkles className="w-3 h-3" />}>{t('most_popular')}</Badge>
                  </div>
                )}

                <div className="space-y-6 text-start">
                  <div className="flex items-center justify-between">
                    <div>
                      {pkg.package_code && (
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {pkg.package_code}
                        </span>
                      )}
                      <h3 className={`text-xl font-black mt-1 ${pkg.popular ? 'text-white' : 'text-slate-900'}`}>
                        {pkg.name}
                      </h3>
                    </div>
                  </div>

                  <div className={`pb-6 border-b ${pkg.popular ? 'border-white/10' : 'border-slate-100'}`}>
                    <div className="text-3xl font-black tracking-tight font-sans">
                      {pkg.price_dzd <= 0 ? (
                        <span className="text-emerald-500 font-bold">{t('free')}</span>
                      ) : (
                        <>
                          {pkg.price_dzd.toLocaleString()} <span className="text-sm font-bold opacity-60">{t('currency')}</span>
                        </>
                      )}
                    </div>
                    <div className={`text-xs mt-2 font-black uppercase tracking-widest ${pkg.popular ? 'text-primary' : 'text-primary'}`}>
                      {pkg.quota_units} {t('op_confirmed')}
                    </div>
                  </div>

                  {pkg.description ? (
                    <p className={`text-xs leading-relaxed ${pkg.popular ? 'text-slate-400' : 'text-slate-600'}`}>
                      {pkg.description}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pkg.popular ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                          <Check className="w-3 h-3" strokeWidth={4} />
                        </div>
                        <span className={`text-xs font-bold ${pkg.popular ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isRtl ? 'حجز وإدارة المواعيد المباشرة' : 'Direct appointment management'}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pkg.popular ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                          <Check className="w-3 h-3" strokeWidth={4} />
                        </div>
                        <span className={`text-xs font-bold ${pkg.popular ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isRtl ? 'إشعارات الرسائل والتأكيد الفوري' : 'Instant confirmation notifications'}
                        </span>
                      </li>
                    </ul>
                  )}
                </div>

                <div className="mt-8">
                  <Button
                    fullWidth
                    variant={pkg.popular ? 'primary' : 'outline'}
                    onClick={() => onOpenAuth('booking_center', true)}
                    className="font-black"
                  >
                    {t('buy_cta')}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
