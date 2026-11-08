'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Award,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  adminAssistantRewardsService,
  RewardsOverviewData
} from '@/services/adminAssistantRewardsService';

interface RewardsOverviewTabProps {
  overview?: RewardsOverviewData | null;
  onNavigateTab?: (tab: 'overview' | 'assistants' | 'profiles' | 'batches' | 'audit') => void;
  onNavigateToTab?: (tab: 'assistants' | 'batches' | 'profiles' | 'audit_losses') => void;
}

export function RewardsOverviewTab({
  overview: initialOverview,
  onNavigateTab,
  onNavigateToTab,
}: RewardsOverviewTabProps) {
  const [data, setData] = useState<RewardsOverviewData | null>(initialOverview || null);
  const [loading, setLoading] = useState<boolean>(!initialOverview);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOverview) {
      setData(initialOverview);
      return;
    }

    let isMounted = true;
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await adminAssistantRewardsService.getOverview();
        if (isMounted && res.status === 'success' && res.data) {
          setData(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'تعذر تحميل مؤشرات المكافآت المالية');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, [initialOverview]);

  const handleNavigate = (tab: 'assistants' | 'batches' | 'profiles' | 'audit') => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (onNavigateToTab) {
      onNavigateToTab(tab === 'audit' ? 'audit_losses' : tab);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm">جاري جلب مؤشرات الأداء المالي لمكافآت المساعدين...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
        <p className="text-sm font-medium">{error || 'لم يتم العثور على بيانات'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">إجمالي المكافآت المكتسبة</span>
            <Coins className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {data.total_earned.toLocaleString('ar-DZ')} <span className="text-xs text-slate-500 font-sans">د.ج</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">تراكمي لجميع المواعيد المؤكدة</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">إجمالي المبالغ المسددة فعلياً</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
            {data.total_paid.toLocaleString('ar-DZ')} <span className="text-xs text-slate-500 font-sans">د.ج</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">تم تأكيد تحويلها بإشعار مصرفي</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">الالتزامات المعلقة (أرصدة إيجابية)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono">
            {data.current_pending_liability.toLocaleString('ar-DZ')} <span className="text-xs text-slate-500 font-sans">د.ج</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">مستحقات بأرصدة المساعدين الحالية</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">خسائر تشغيلية امتصتها المنصة</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2 font-mono">
            {data.total_operational_losses.toLocaleString('ar-DZ')} <span className="text-xs text-slate-500 font-sans">د.ج</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">عجز مغادرة وإلغاءات ما بعد التحويل</span>
        </div>
      </div>

      {/* Roster & Pending Action Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Roster metrics */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">إجمالي المساعدين بالمنصة</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono">{data.roster_metrics.total_assistants}</p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('assistants')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            استعراض الدليل
          </button>
        </div>

        {/* Eligibility summary */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">المساعدون المؤهلون للصرف اللحظي</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
                {data.roster_metrics.eligible_assistants}{' '}
                <span className="text-xs text-slate-400 font-sans font-normal">(حد {data.roster_metrics.payout_threshold.toLocaleString('ar-DZ')} د.ج)</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('batches')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            تجهيز الدفعة
          </button>
        </div>
      </div>

      {/* Operational Losses Breakdown (REW-DEC Binding) */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          تفصيل الخسائر التشغيلية المحملة على المنصة (القرارات المعتمدة REW-DEC)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">عجز المغادرة الممتص (السيناريو A)</span>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
              {data.losses_breakdown.departure_deficit_absorption.toLocaleString('ar-DZ')} د.ج
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">إعفاء العجز السالب عند مغادرة العيادة</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">إلغاءات ما بعد التحويل للمغادرين (السيناريو B)</span>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
              {data.losses_breakdown.post_departure_cancellation.toLocaleString('ar-DZ')} د.ج
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">إلغاء موعد تم صرف مكافأته بعد مغادرة المساعد</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">إلغاءات قبل تسوية المغادرة (السيناريو C)</span>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
              {data.losses_breakdown.post_departure_pre_payout_cancellation.toLocaleString('ar-DZ')} د.ج
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">تحمل المنصة للعجز لضمان تسوية المغادرة المعلقة</span>
          </div>
        </div>
      </div>
    </div>
  );
}
