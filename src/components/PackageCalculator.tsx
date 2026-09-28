'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PACKAGES_DATA } from '../data/content';
import { bookingCenterService } from '@/services/bookingCenterService';
import { 
  Calculator, 
  PackageCheck, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Target 
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
            quota_units: p.quota_units || p.quota || 100,
            price_dzd: p.price_dzd || p.price || 5000,
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

  // Calculator state
  const [dailyBookings, setDailyBookings] = useState<number>(15);
  const [serviceFeePerBooking, setServiceFeePerBooking] = useState<number>(300); // DZD charged to patient by center

  const displayPackages: DisplayPackage[] = packages.length > 0 ? packages : PACKAGES_DATA.map((p) => ({
    id: p.id,
    name: p.name,
    package_code: p.id.toUpperCase(),
    quota_units: p.operationsCount,
    price_dzd: p.priceDzd,
    description: '',
    popular: p.popular,
  }));

  const activePackage = displayPackages.find(p => p.popular) || displayPackages[0] || {
    id: 'default',
    name: 'Standard',
    quota_units: 500,
    price_dzd: 25000,
  };

  // Calculations
  const monthlyBookings = dailyBookings * 25; // 25 working days
  const costPerOperation = activePackage.price_dzd / (activePackage.quota_units || 1);
  const grossMonthlyRevenue = monthlyBookings * serviceFeePerBooking;
  const packagesNeeded = Math.ceil(monthlyBookings / (activePackage.quota_units || 1));
  const totalPackageCost = packagesNeeded * activePackage.price_dzd;
  const netMonthlyProfit = grossMonthlyRevenue - totalPackageCost;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
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
                    <div className="text-4xl font-black tracking-tight font-sans">
                      {pkg.price_dzd.toLocaleString()} <span className="text-sm font-bold opacity-60">{t('currency')}</span>
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

        {/* Interactive ROI Calculator Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card variant="elevated" padding="none" className="border-transparent shadow-2xl shadow-slate-900/10 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              
              {/* Inputs Side */}
              <div className="lg:col-span-7 p-8 md:p-12 space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Calculator className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{t('calc_title')}</h3>
                    <p className="text-sm text-slate-500 font-bold">{t('calc_subtitle')}</p>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Daily Bookings */}
                  <div className="space-y-4 text-start">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        {t('daily_bookings_label')}
                      </label>
                      <Badge variant="info" className="px-3 py-1 text-sm font-black">{dailyBookings} {t('daily_bookings_unit')}</Badge>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={dailyBookings}
                      onChange={(e) => setDailyBookings(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>5 {t('daily_bookings_unit')}</span>
                      <span>50 {t('daily_bookings_unit')}</span>
                      <span>100 {t('daily_bookings_unit')}</span>
                    </div>
                  </div>

                  {/* Service Fee */}
                  <div className="space-y-4 text-start">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        {t('service_fee_label')}
                      </label>
                      <Badge variant="info" className="px-3 py-1 text-sm font-black">{serviceFeePerBooking} {t('currency')}</Badge>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="800"
                      step="50"
                      value={serviceFeePerBooking}
                      onChange={(e) => setServiceFeePerBooking(Number(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>150 {t('currency')}</span>
                      <span>400 {t('currency')}</span>
                      <span>800 {t('currency')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4 text-start">
                  <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900">{t('rules_title')}</h4>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      {t('rules_description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Outputs Side */}
              <div className="lg:col-span-5 bg-slate-900 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden text-start">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('summary_title')}</span>
                    <Badge variant="info" className="bg-primary/20 border-transparent text-white" icon={<TrendingUp className="w-3 h-3" />}>{t('summary_badge')}</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: t('total_fees'), value: grossMonthlyRevenue, color: 'text-primary' },
                      { label: t('required_cost'), value: totalPackageCost, color: 'text-rose-400' },
                      { label: t('monthly_total'), value: `${monthlyBookings} ${t('daily_bookings_unit')}`, color: 'text-white' }
                    ].map((stat, i) => (
                      <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">{stat.label}</span>
                        <span className={`text-lg font-black ${stat.color}`}>
                          {typeof stat.value === 'number' ? `${stat.value.toLocaleString()} ${t('currency')}` : stat.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 text-center space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('net_profit')}</span>
                      <div className="text-5xl font-black text-white font-sans tracking-tight">
                        {netMonthlyProfit > 0 ? `+${netMonthlyProfit.toLocaleString()}` : 0} <span className="text-lg opacity-40 font-bold">{t('currency')}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold max-w-[200px] mx-auto">{t('calc_note')}</p>
                  </div>
                </div>

                <div className="relative z-10 mt-12">
                  <Button
                    fullWidth
                    size="lg"
                    onClick={() => onOpenAuth('booking_center', true)}
                    className="h-16 rounded-[24px] bg-white text-slate-900 hover:bg-slate-50 font-black shadow-2xl shadow-primary/20"
                  >
                    <span>{t('start_cta')}</span>
                    <ArrowLeft className={cn("w-5 h-5", locale === 'en' && "rotate-180")} />
                  </Button>
                </div>

              </div>

            </div>
          </Card>
        </motion.div>

      </div>
    </section>
  );
};
