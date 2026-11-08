'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  TrendingUp,
  CreditCard,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { assistantRewardsService } from '@/services/assistantRewardsService';
import {
  AssistantRewardsSummary,
  AssistantRewardTransaction,
  AssistantPayoutBatchItem,
  AssistantPayoutProfile,
} from '@/types/assistantRewards';

interface AssistantRewardsViewProps {
  isDarkMode?: boolean;
  isRtl?: boolean;
}

export const AssistantRewardsView: React.FC<AssistantRewardsViewProps> = ({
  isDarkMode = false,
  isRtl = false,
}) => {
  const t = useTranslations('doctorAssistant.rewards');

  // Subtabs: 'ledger' | 'payouts' | 'profile'
  const [activeSubtab, setActiveSubtab] = useState<'ledger' | 'payouts' | 'profile'>('ledger');

  // Summary State
  const [summary, setSummary] = useState<AssistantRewardsSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Ledger Transactions State
  const [transactions, setTransactions] = useState<AssistantRewardTransaction[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txPage, setTxPage] = useState<number>(1);
  const [txTotalPages, setTxTotalPages] = useState<number>(1);

  // Payouts State
  const [payouts, setPayouts] = useState<AssistantPayoutBatchItem[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState<boolean>(false);
  const [payoutsPage, setPayoutsPage] = useState<number>(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState<number>(1);

  // Profile State
  const [profiles, setProfiles] = useState<AssistantPayoutProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState<boolean>(false);
  const [ripInput, setRipInput] = useState<string>('');
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Cheque Modal State
  const [chequeModalUrl, setChequeModalUrl] = useState<string | null>(null);
  const [viewingChequeId, setViewingChequeId] = useState<string | null>(null);

  // Load Summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const res = await assistantRewardsService.getSummary();
      if (res && res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load rewards summary');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Load Transactions
  const fetchTransactions = useCallback(async (page: number) => {
    try {
      setTxLoading(true);
      const res = await assistantRewardsService.getTransactions(page, 15);
      if (res && res.data) {
        setTransactions(res.data);
        if (res.meta?.last_page) {
          setTxTotalPages(res.meta.last_page);
        }
      }
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  // Load Payouts
  const fetchPayouts = useCallback(async (page: number) => {
    try {
      setPayoutsLoading(true);
      const res = await assistantRewardsService.getPayouts(page, 15);
      if (res && res.data) {
        setPayouts(res.data);
        if (res.meta?.last_page) {
          setPayoutsTotalPages(res.meta.last_page);
        }
      }
    } catch (err) {
      console.error('Failed to load payouts', err);
    } finally {
      setPayoutsLoading(false);
    }
  }, []);

  // Load Profiles
  const fetchProfiles = useCallback(async () => {
    try {
      setProfilesLoading(true);
      const res = await assistantRewardsService.getProfiles();
      if (res && res.data) {
        setProfiles(res.data);
      }
    } catch (err) {
      console.error('Failed to load payout profiles', err);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeSubtab === 'ledger') {
      fetchTransactions(txPage);
    } else if (activeSubtab === 'payouts') {
      fetchPayouts(payoutsPage);
    } else if (activeSubtab === 'profile') {
      fetchProfiles();
    }
  }, [activeSubtab, txPage, payoutsPage, fetchTransactions, fetchPayouts, fetchProfiles]);

  // Handle Profile Submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    const cleanRip = ripInput.replace(/\s+/g, '');
    if (!/^\d{20}$/.test(cleanRip)) {
      setProfileErrorMsg(t('profile.invalidRip'));
      return;
    }

    if (!chequeFile) {
      setProfileErrorMsg(t('profile.missingCheque'));
      return;
    }

    try {
      setSubmittingProfile(true);
      await assistantRewardsService.submitProfile(cleanRip, chequeFile);
      setProfileSuccessMsg(t('profile.successMsg'));
      setRipInput('');
      setChequeFile(null);
      await fetchProfiles();
      await fetchSummary();
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmittingProfile(false);
    }
  };

  // View Cheque
  const handleViewCheque = async (profileId: string) => {
    try {
      setViewingChequeId(profileId);
      const url = await assistantRewardsService.viewChequeBlobUrl(profileId);
      setChequeModalUrl(url);
    } catch (err: any) {
      alert(`Could not display cheque: ${err.message}`);
    } finally {
      setViewingChequeId(null);
    }
  };

  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs';
  const tableHeaderBg = isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-50 text-slate-600';

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className={`p-6 rounded-2xl border ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('title')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Current Active Reward Rate Badge / Lifecycle Status */}
            {summary && (
              summary.program_lifecycle?.is_suspended ? (
                <div className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>مكافأة التأكيد: <strong className="underline">معلّقة حالياً</strong></span>
                </div>
              ) : summary.program_lifecycle?.is_terminated ? (
                <div className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/40 shadow-xs">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>مكافأة التأكيد: <strong className="underline">البرنامج منتهي</strong></span>
                </div>
              ) : summary.current_reward_rate !== undefined ? (
                <div className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  <Coins className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>مكافأة تأكيد الموعد: <strong className="font-mono text-sm">{formatAmount(summary.current_reward_rate)}</strong> {t('currency')}</span>
                </div>
              ) : null
            )}

            {/* Payout Eligibility Indicator */}
            {summary && (
              <div
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
                  summary.is_eligible_for_payout
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {summary.is_eligible_for_payout ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('eligible')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {!summary.active_profile
                        ? t('missingProfile')
                        : `${t('thresholdNotMet')} (${formatAmount(summary.current_balance)} / ${formatAmount(summary.payout_threshold)} ${t('currency')})`}
                    </span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => {
                fetchSummary();
                if (activeSubtab === 'ledger') fetchTransactions(txPage);
                if (activeSubtab === 'payouts') fetchPayouts(payoutsPage);
                if (activeSubtab === 'profile') fetchProfiles();
              }}
              disabled={loadingSummary}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {summaryError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{summaryError}</span>
          </div>
        )}

        {/* Lifecycle Warning Banner if Suspended or Terminated */}
        {summary?.program_lifecycle?.is_suspended && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <span>تنبيه هام: مكافأة تأكيد المواعيد معلّقة حالياً (غير مفعّلة)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                  معلّق مؤقتاً
                </span>
              </h4>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                برنامج مكافآت تأكيد المواعيد معلّق مؤقتاً حالياً من قبل إدارة المنصة{summary.program_lifecycle.reason ? ` (السبب: ${summary.program_lifecycle.reason})` : ''}. خلال فترة التعليق، لا يتم احتساب أي مكافآت جديدة عند تأكيد المواعيد الطبية، ويمنع احتساب المكافآت بأثر رجعي للمواعيد المؤكدة أثناء فترة التعليق. سيتم استئناف احتساب المكافآت للمواعيد الجديدة فور قيام الإدارة بإعادة تفعيل البرنامج.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                * رصيدك المستحق الحالي ({formatAmount(summary.current_balance)} {t('currency')}) محفوظ بالكامل في دفتر الأستاذ ولا يتأثر بفترة التعليق.
              </p>
            </div>
          </div>
        )}

        {summary?.program_lifecycle?.is_terminated && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100 flex items-center gap-2">
                <span>برنامج مكافآت تأكيد المواعيد تم إنهاؤه نهائياً</span>
                <span className="text-[10px] bg-rose-200 text-rose-900 font-extrabold px-2 py-0.5 rounded-full">
                  منتهي
                </span>
              </h4>
              <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                تم إنهاء البرنامج بشكل رسمي من قبل الإدارة{summary.program_lifecycle.reason ? ` (السبب: ${summary.program_lifecycle.reason})` : ''}.
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                * مستحقاتك السابقة المؤكدة ({formatAmount(summary.current_balance)} {t('currency')}) محفوظة وتخضع لجدول الصرف المعتمد.
              </p>
            </div>
          </div>
        )}

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
          {/* 1. Current Available Balance */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {t('kpis.currentBalance')}
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
              <span>{summary ? formatAmount(summary.current_balance) : '—'}</span>
              <span className="text-[11px] font-normal text-slate-500">{t('currency')}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              {summary && summary.current_balance >= 10000 ? '>= 10,000 DZD' : '< 10,000 DZD min'}
            </span>
          </div>

          {/* 2. Total Earned */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {t('kpis.totalEarned')}
            </span>
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400 flex items-baseline gap-1">
              <span>{summary ? formatAmount(summary.total_earned) : '—'}</span>
              <span className="text-[11px] font-normal text-slate-500">{t('currency')}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Confirmed appts
            </span>
          </div>

          {/* 3. Total Paid */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {t('kpis.totalPaid')}
            </span>
            <div className="text-xl font-bold text-slate-700 dark:text-slate-200 flex items-baseline gap-1">
              <span>{summary ? formatAmount(summary.total_paid) : '—'}</span>
              <span className="text-[11px] font-normal text-slate-500">{t('currency')}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Transferred via CCP
            </span>
          </div>

          {/* 4. Pending Payout */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {t('kpis.pendingPayout')}
            </span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
              <span>{summary ? formatAmount(summary.pending_payout) : '—'}</span>
              <span className="text-[11px] font-normal text-slate-500">{t('currency')}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              In current batch
            </span>
          </div>

          {/* 5. Total Deductions */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {t('kpis.totalDeductions')}
            </span>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 flex items-baseline gap-1">
              <span>
                {summary
                  ? formatAmount((summary.total_reversed || 0) + (summary.total_deducted || 0))
                  : '—'}
              </span>
              <span className="text-[11px] font-normal text-slate-500">{t('currency')}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block" title="مجموع المبالغ المخصومة عن مواعيد تم إلغاؤها بعد تأكيدها">
              خصومات إلغاء مواعيد سابقة
            </span>
          </div>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubtab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'ledger'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t('subtabs.overview')}</span>
        </button>

        <button
          onClick={() => setActiveSubtab('payouts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'payouts'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{t('subtabs.payouts')}</span>
        </button>

        <button
          onClick={() => setActiveSubtab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'profile'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{t('subtabs.profile')}</span>
          {summary && !summary.active_profile && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* SUBTAB 1: LEDGER */}
      {activeSubtab === 'ledger' && (
        <div className={`p-6 rounded-2xl border ${cardBg}`}>
          <div className="mb-4">
            <h3 className="text-base font-bold">{t('ledger.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('ledger.description')}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${tableHeaderBg} border-slate-200 dark:border-slate-800`}>
                  <th className="py-3 px-3 text-start font-semibold">{t('ledger.columns.date')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('ledger.columns.type')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('ledger.columns.direction')}</th>
                  <th className="py-3 px-3 text-end font-semibold">{t('ledger.columns.amount')}</th>
                  <th className="py-3 px-3 text-end font-semibold">{t('ledger.columns.balanceAfter')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('ledger.columns.reference')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {txLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      {t('ledger.empty')}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.direction === 'credit';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              tx.transaction_type === 'reward_earned'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : tx.transaction_type === 'cancellation_deduction'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : tx.transaction_type === 'payout_settlement'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {t(`ledger.types.${tx.transaction_type}` as any) || tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              isCredit ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                            {isCredit ? t('ledger.credit') : t('ledger.debit')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-bold">
                          <span className={isCredit ? 'text-emerald-600' : 'text-rose-600'}>
                            {isCredit ? '+' : '-'}
                            {formatAmount(tx.amount)} {t('currency')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatAmount(tx.balance_after)} {t('currency')}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                          {tx.source_type} #{tx.source_id?.slice(0, 8)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {txTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Page {txPage} of {txTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage <= 1 || txLoading}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                  disabled={txPage >= txTotalPages || txLoading}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PAYOUTS */}
      {activeSubtab === 'payouts' && (
        <div className={`p-6 rounded-2xl border ${cardBg}`}>
          <div className="mb-4">
            <h3 className="text-base font-bold">{t('payouts.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('payouts.description')}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${tableHeaderBg} border-slate-200 dark:border-slate-800`}>
                  <th className="py-3 px-3 text-start font-semibold">{t('payouts.batch')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('payouts.period')}</th>
                  <th className="py-3 px-3 text-end font-semibold">{t('payouts.amount')}</th>
                  <th className="py-3 px-3 text-center font-semibold">{t('payouts.status')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('payouts.transferRef')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('payouts.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payoutsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading payouts...</span>
                      </div>
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      {t('payouts.empty')}
                    </td>
                  </tr>
                ) : (
                  payouts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-teal-600">
                        {item.batch?.batch_number || item.batch_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.batch?.period_start} → {item.batch?.period_end}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                        {formatAmount(item.amount)} {t('currency')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : item.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {t(`payouts.statuses.${item.status}` as any) || item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {item.transfer_reference || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {item.transferred_at ? new Date(item.transferred_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {payoutsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Page {payoutsPage} of {payoutsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPayoutsPage((p) => Math.max(1, p - 1))}
                  disabled={payoutsPage <= 1 || payoutsLoading}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPayoutsPage((p) => Math.min(payoutsTotalPages, p + 1))}
                  disabled={payoutsPage >= payoutsTotalPages || payoutsLoading}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: PROFILE */}
      {activeSubtab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Active Profile & Submission Form */}
          <div className="space-y-6">
            {/* Active Profile Card */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>{t('profile.activeProfile')}</span>
                </h3>
              </div>

              {summary?.active_profile ? (
                <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t('profile.ripLabel')}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      v{summary.active_profile.version} — {summary.active_profile.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-mono text-base font-bold tracking-wider text-teal-800 dark:text-teal-200">
                    {summary.active_profile.rip_number}
                  </div>
                  <div className="pt-2 border-t border-teal-500/10 flex justify-end">
                    <button
                      onClick={() => handleViewCheque(summary.active_profile!.id)}
                      disabled={viewingChequeId === summary.active_profile.id}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('profile.viewCheque')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('profile.noActive')}</span>
                </div>
              )}
            </div>

            {/* Submit New Profile Form */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className="text-sm font-bold">{t('profile.newProfileTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                {t('profile.newProfileDesc')}
              </p>

              {profileSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t('profile.ripLabel')} (20 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={ripInput}
                    onChange={(e) => setRipInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('profile.ripInputPlaceholder')}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {ripInput.length}/20 digits
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {t('profile.chequeFileLabel')}
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setChequeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                    required
                  />
                  {chequeFile && (
                    <span className="text-[10px] text-teal-600 mt-1 block font-mono">
                      Selected: {chequeFile.name} ({(chequeFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingProfile || ripInput.length !== 20 || !chequeFile}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {submittingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('profile.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{t('profile.submitBtn')}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Profile Version History */}
          <div className={`p-6 rounded-2xl border ${cardBg}`}>
            <h3 className="text-sm font-bold mb-4">{t('profile.historyTitle')}</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={`border-b ${tableHeaderBg} border-slate-200 dark:border-slate-800`}>
                    <th className="py-2.5 px-3 text-start font-semibold">v#</th>
                    <th className="py-2.5 px-3 text-start font-semibold">{t('profile.ripLabel')}</th>
                    <th className="py-2.5 px-3 text-center font-semibold">{t('profile.status')}</th>
                    <th className="py-2.5 px-3 text-end font-semibold">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {profilesLoading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : profiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No profile history found.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold">v{p.version}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{p.rip_number}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : p.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.status === 'rejected' && p.rejection_reason && (
                            <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-1 p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-start">
                              <span className="font-bold block text-[9px]">سبب الرفض:</span>
                              {p.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => handleViewCheque(p.id)}
                            disabled={viewingChequeId === p.id}
                            className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>عرض</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Modal Viewer */}
      {chequeModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} shadow-xl`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{t('profile.viewCheque')}</span>
              </h4>
              <button
                onClick={() => {
                  window.URL.revokeObjectURL(chequeModalUrl);
                  setChequeModalUrl(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 flex justify-center max-h-[70vh] overflow-auto">
              <iframe
                src={chequeModalUrl}
                title="Cheque Document"
                className="w-full h-[60vh] rounded-lg border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AssistantRewardsView;
