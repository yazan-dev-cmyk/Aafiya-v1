import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  FileText, 
  Lock, 
  Fingerprint, 
  History, 
  ShieldAlert, 
  Pill, 
  FlaskConical, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight,
  Activity,
  Cpu
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion } from 'motion/react';

interface MedicalFileSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const MedicalFileSection: React.FC<MedicalFileSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('medical_file');
  const locale = useLocale();

  return (
    <section id="emr" className="py-24 bg-white relative overflow-hidden [contain:paint]">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-teal-50 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
          
          {/* Left Side: Mockup Card of EMR */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <Card variant="default" padding="none" className="bg-[#0F172A] border-slate-800 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)] relative overflow-hidden">
              
              {/* Animated scanning line effect */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent z-10 pointer-events-none" 
              />

              <div className="p-8 space-y-6 relative z-20">
                {/* Demo Watermark Notice */}
                <div className="flex items-center justify-center p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-black text-center">
                  <ShieldAlert className="w-4 h-4 me-2 text-teal-400 shrink-0" />
                  <span>{t('demo_watermark')}</span>
                </div>

                {/* Patient Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xl border border-teal-500/30">
                      EMR
                    </div>
                    <div className="text-start">
                      <h4 className="font-black text-lg text-white">{t('demo_patient_name')}</h4>
                      <p className="text-xs text-slate-400 font-bold">{t('demo_patient_sub')}</p>
                    </div>
                  </div>

                  <div className="text-end">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full mb-1">
                      <Cpu className="w-3 h-3 text-teal-400" />
                      <span className="text-[10px] text-teal-400 font-black font-mono">ENCRYPTED-ARCH</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">{t('encryption_standard')}</div>
                  </div>
                </div>

                {/* Health Metrics Strip - Architectural Security Indicators */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t('spec_encryption'), value: 'AES-256', color: 'teal' },
                    { label: t('spec_integrity'), value: 'SHA-256', color: 'sky' },
                    { label: t('spec_governance'), value: 'RBAC Strict', color: 'emerald' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-center">
                      <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">{metric.label}</span>
                      <span className={`text-sm font-black text-${metric.color}-400`}>{metric.value}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline mockup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('latest_medical_event')}</span>
                    <Badge variant="info" className="bg-primary/10 border-primary/20 text-primary text-[10px]">{t('status_active')}</Badge>
                  </div>

                  <div className="bg-white/[0.05] rounded-3xl p-5 border border-white/5 space-y-4 text-start">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-black text-white">{t('simulated_consultation_title')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{t('sample_record_label')}</span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">{t('simulated_consultation_desc')}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral" className="bg-teal-500/10 border-teal-500/20 text-teal-400 text-[10px]" icon={<Pill className="w-3 h-3" />}>{t('prescription_approved')}</Badge>
                      <Badge variant="neutral" className="bg-primary/10 border-primary/20 text-primary text-[10px]" icon={<FlaskConical className="w-3 h-3" />}>{t('lab_results_uploaded')}</Badge>
                    </div>
                  </div>
                </div>

                {/* Security Footer Note */}
                <div className="flex items-center gap-3 text-[10px] text-slate-400 border-t border-white/5 pt-6 font-bold text-start">
                  <Lock className="w-4 h-4 text-teal-500 shrink-0" />
                  <span>{t('immutability_note')}</span>
                </div>

              </div>
            </Card>
          </motion.div>

          {/* Right Side: Description */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6 order-1 lg:order-2 space-y-8 text-start"
          >
            
            <div className="space-y-4">
              <Badge variant="info" icon={<Fingerprint className="w-4 h-4" />}>{t('section_badge')}</Badge>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {t('title')} <br />
                <span className="text-primary underline decoration-primary/20 underline-offset-8">{t('subtitle')}</span>
              </h2>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                {t('desc')}
              </p>
            </div>

            <div className="space-y-6">
              {[
                { 
                  icon: <History className="w-5 h-5" />, 
                  title: t('points.emr_history_title'), 
                  desc: t('points.emr_history_desc') 
                },
                { 
                  icon: <Lock className="w-5 h-5" />, 
                  title: t('points.least_privilege_title'), 
                  desc: t('points.least_privilege_desc') 
                },
                { 
                  icon: <ShieldAlert className="w-5 h-5" />, 
                  title: t('points.guest_patient_title'), 
                  desc: t('points.guest_patient_desc') 
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5 p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <Button
                size="lg"
                onClick={() => onOpenAuth('patient_registered', true)}
                className="px-10 h-14 rounded-2xl shadow-2xl shadow-primary/20"
              >
                <span>{t('create_account_cta')}</span>
                {locale === 'ar' ? <ArrowLeft className="w-5 h-5 ms-2" /> : <ArrowRight className="w-5 h-5 ms-2" />}
              </Button>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
};
