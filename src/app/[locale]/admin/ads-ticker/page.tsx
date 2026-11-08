'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { AuthGuard } from '@/auth';
import { AdsTickerManagement } from '@/components/admin/ticker/AdsTickerManagement';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export default function AdminAdsTickerPage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const t = useTranslations('admin.adsTicker');

  return (
    <AuthGuard allowedRoles={['admin', 'admin_assistant']}>
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{t('backToAdmin')}</span>
          </button>
        </div>
        <AdsTickerManagement />
      </div>
    </AuthGuard>
  );
}
