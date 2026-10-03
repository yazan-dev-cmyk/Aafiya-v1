'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Activity, ShieldCheck, Mail, Phone, MapPin, Globe, Linkedin, Twitter } from 'lucide-react';
import { ViewMode } from '../types';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface FooterProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  const t = useTranslations('footer');
  const navT = useTranslations('navigation');
  const locale = useLocale();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-white/5 font-sans">
      
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-8">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-5 space-y-8 text-start">
            <div className="inline-flex items-center p-3 px-5 rounded-2xl bg-white/95 shadow-sm border border-white/10">
              <img 
                src="/logo/Aafiya_Logo_Full.png" 
                alt="Aafiya — Your Gateway to Aafiya / بوابتك إلى العافية" 
                className="h-12 w-auto object-contain" 
              />
            </div>

            <p className="text-slate-400 leading-relaxed text-base font-bold max-w-md">
              {t('slogan')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Badge variant="info" className="bg-white/5 border-white/10 text-white py-2 px-4" icon={<ShieldCheck className="w-4 h-4" />}>
                {t('official_ref')}
              </Badge>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-500">
                  <Linkedin className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-500">
                  <Twitter className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Nav */}
          <div className="lg:col-span-2 space-y-6 text-start">
            <h4 className="font-black text-white text-[10px] uppercase tracking-[0.2em] border-b border-white/5 pb-4">{t('quick_links')}</h4>
            <ul className="space-y-4 text-sm font-black uppercase tracking-widest text-slate-500">
              <li><a href="#hero" className="hover:text-primary transition-colors">{navT('home')}</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">{navT('features')}</a></li>
              <li><a href="#benefits" className="hover:text-primary transition-colors">{navT('benefits')}</a></li>
              <li><a href="#workflow" className="hover:text-primary transition-colors">{navT('workflow')}</a></li>
              <li><a href="#packages" className="hover:text-primary transition-colors">{navT('packages')}</a></li>
            </ul>
          </div>

          {/* Col 3: Role Portals */}
          <div className="lg:col-span-2 space-y-6 text-start">
            <h4 className="font-black text-white text-[10px] uppercase tracking-[0.2em] border-b border-white/5 pb-4">{t('role_portals')}</h4>
            <ul className="space-y-4 text-sm font-black uppercase tracking-widest text-slate-500">
              <li><a href="#benefits" className="hover:text-primary transition-colors">{t('booking_center_portal')}</a></li>
              <li><a href="#benefits" className="hover:text-primary transition-colors">{t('doctor_portal')}</a></li>
              <li><a href="#emr" className="hover:text-primary transition-colors">{t('emr_portal')}</a></li>
              <li><a href="#benefits" className="hover:text-primary transition-colors">{t('lab_portal')}</a></li>
              <li><a href="#benefits" className="hover:text-primary transition-colors">{t('radiology_portal')}</a></li>
            </ul>
          </div>

          {/* Col 4: Contact & Support */}
          <div className="lg:col-span-3 space-y-6 text-start">
            <h4 className="font-black text-white text-[10px] uppercase tracking-[0.2em] border-b border-white/5 pb-4">{t('contact')}</h4>
            <ul className="space-y-4 font-black">
              <li className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm">support@aafiya.dz</span>
              </li>
              <li className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm">+213 (0) 23 45 67 89</span>
              </li>
              <li className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm">{t('address')}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Rights Bar */}
      <div className="border-t border-white/5 bg-black/40 py-8 px-4 sm:px-6 lg:px-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Globe className="w-4 h-4 text-primary" />
            <span>{t('copyright_prefix')} <strong className="text-white font-satisfy">Aafiya Platforms Inc.</strong></span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#faq" className="hover:text-white transition-colors">{t('privacy')}</a>
            <a href="#faq" className="hover:text-white transition-colors">{t('terms')}</a>
            <a href="#faq" className="hover:text-white transition-colors">{t('compliance')}</a>
          </div>
        </div>
      </div>

    </footer>
  );
};
