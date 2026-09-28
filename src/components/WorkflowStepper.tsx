'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { WORKFLOW_STEPS } from '../data/content';
import { 
  MapPin, 
  UserCheck, 
  BadgeCheck, 
  Stethoscope, 
  FileSpreadsheet, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface WorkflowStepperProps {}

const stepIconMap: Record<string, React.ReactNode> = {
  MapPin: <MapPin className="w-6 h-6" />,
  UserCheck: <UserCheck className="w-6 h-6" />,
  BadgeCheck: <BadgeCheck className="w-6 h-6" />,
  Stethoscope: <Stethoscope className="w-6 h-6" />,
  FileSpreadsheet: <FileSpreadsheet className="w-6 h-6" />
};

export const WorkflowStepper: React.FC<WorkflowStepperProps> = () => {
  const t = useTranslations('workflow');
  const locale = useLocale();
  const [activeStep, setActiveStep] = useState(0);

  const currentStep = WORKFLOW_STEPS[activeStep];

  return (
    <section id="workflow" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <Badge variant="info" icon={<Zap className="w-4 h-4" />}>{t('section_badge')}</Badge>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Desktop Step Nav Bar (Side/Left) */}
          <div className="lg:col-span-4 space-y-4">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isCurrent = idx === activeStep;
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full p-5 rounded-[24px] border-2 text-start transition-all group relative overflow-hidden ${
                    isCurrent
                      ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105 z-10'
                      : isCompleted
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : step.stepNumber}
                    </div>
                    <div className="flex flex-col text-start">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-white/60' : 'text-slate-400'}`}>{t('step_prefix')} {step.stepNumber}</span>
                      <span className="text-sm font-black">{t(`step${idx + 1}.title`)}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <motion.div 
                      layoutId="active-step-glow"
                      className="absolute inset-0 bg-gradient-to-l from-white/10 to-transparent pointer-events-none"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Detail View */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card variant="elevated" padding="lg" className="min-h-[400px] flex flex-col justify-between group">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-500">
                        {stepIconMap[currentStep.icon]}
                      </div>
                      <Badge variant="success" dot>{t('active_phase')}</Badge>
                    </div>

                    <div className="space-y-4 text-start">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        {t(`step${activeStep + 1}.title`)}
                      </h3>
                      <p className="text-lg text-slate-500 font-bold leading-relaxed max-w-2xl">
                        {t(`step${activeStep + 1}.description`)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-10 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={activeStep === 0}
                        onClick={() => setActiveStep(prev => prev - 1)}
                        className="rounded-2xl bg-slate-50"
                      >
                        <ArrowRight className={cn("w-5 h-5", locale === 'en' && "rotate-180")} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={activeStep === WORKFLOW_STEPS.length - 1}
                        onClick={() => setActiveStep(prev => prev + 1)}
                        className="rounded-2xl bg-slate-50"
                      >
                        <ArrowLeft className={cn("w-5 h-5", locale === 'en' && "rotate-180")} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
};
