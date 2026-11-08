'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  MousePointer2,
  Layers,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Shield,
  Settings2,
} from 'lucide-react';
import {
  TickerCampaign,
  AdCampaignStatus,
} from '../../../types/adsTicker';
import { adminAdsTickerService, TickerAudienceSettings } from '../../../services/adminAdsTickerService';
import { CreateCampaignModal } from './CreateCampaignModal';
import { EditCampaignModal } from './EditCampaignModal';
import { ManagePlacementsModal } from './ManagePlacementsModal';

export function AdsTickerManagement() {
  const t = useTranslations('admin.adsTicker');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // API State
  const [campaigns, setCampaigns] = useState<TickerCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TickerCampaign | null>(null);
  const [placementsCampaign, setPlacementsCampaign] = useState<TickerCampaign | null>(null);

  // Quick Action feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Settings State (Clinical Audience Controls DEC-01)
  const [settings, setSettings] = useState<TickerAudienceSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [updatingSettingKey, setUpdatingSettingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const res = await adminAdsTickerService.getSettings();
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      console.warn('[AdsTickerManagement] Failed to fetch ticker settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleAudienceSetting = async (key: string, currentValue: boolean) => {
    setUpdatingSettingKey(key);
    try {
      const nextVal = !currentValue;
      await adminAdsTickerService.updateSetting(key, nextVal);
      setSettings((prev) => {
        if (!prev) return prev;
        if (key === 'ads.ticker.enabled') {
          return { ...prev, global_enabled: nextVal };
        }
        const audKey = key.replace('ads.audience.', '').replace('.enabled', '');
        return {
          ...prev,
          audiences: {
            ...prev.audiences,
            [audKey]: nextVal,
          },
        };
      });
      setActionNotice(
        isRtl
          ? 'تم حفظ إعداد الجمهور بنجاح وتوثيقه أمنياً'
          : 'Audience setting updated and logged to audit trail'
      );
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'فشل تحديث الإعداد' : 'Failed to update setting'));
    } finally {
      setUpdatingSettingKey(null);
    }
  };

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminAdsTickerService.getCampaigns({
        page: currentPage,
        per_page: perPage,
      });

      if (res.data) {
        setCampaigns(res.data);
      }
      if (res.meta) {
        setCurrentPage(res.meta.current_page || 1);
        setTotalPages(res.meta.last_page || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('errors.fetchFailed'));
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, t]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Algiers Timezone Formatting (Africa/Algiers)
  const formatAlgiersDate = (isoStr: string | null): string => {
    if (!isoStr) return '—';
    try {
      const dt = new Date(isoStr);
      return new Intl.DateTimeFormat(isRtl ? 'ar-DZ' : 'en-GB', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dt);
    } catch {
      return isoStr;
    }
  };

  // Quick status toggle (active <-> paused) via dedicated PATCH /toggle-status
  const handleToggleStatus = async (camp: TickerCampaign) => {
    try {
      const res = await adminAdsTickerService.toggleStatus(camp.id);
      const nextStatus = res.data?.status || (camp.status === 'active' ? 'paused' : 'active');
      setActionNotice(
        t('notices.statusUpdated', {
          title: camp.title,
          status: t(`statuses.${nextStatus}`),
        })
      );
      setTimeout(() => setActionNotice(null), 4000);
      fetchCampaigns();
    } catch (err: any) {
      setErrorMessage(err.message || t('errors.unknown'));
    }
  };

  // Client-side filtering across the loaded page dataset
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesStatus =
        statusFilter === 'ALL' || camp.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        camp.title.toLowerCase().includes(q) ||
        camp.content.toLowerCase().includes(q) ||
        (camp.target_url && camp.target_url.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [campaigns, statusFilter, searchQuery]);

  // Operational Metrics
  const stats = useMemo(() => {
    const total = totalItems || campaigns.length;
    const active = campaigns.filter((c) => c.status === 'active').length;
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.ticker_clicks_count || 0), 0);
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    return { total, active, totalClicks, draft };
  }, [campaigns, totalItems]);

  const paginationTotal = totalItems || campaigns.length;
  const paginationFrom =
    paginationTotal === 0 || filteredCampaigns.length === 0
      ? 0
      : (currentPage - 1) * perPage + 1;
  const paginationTo =
    paginationTotal === 0 || filteredCampaigns.length === 0
      ? 0
      : Math.min((currentPage - 1) * perPage + filteredCampaigns.length, paginationTotal);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'draft':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      case 'paused':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'expired':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'pending_approval':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('title')}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold border border-teal-300/40">
                  AAFIYA TICKER V1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => fetchCampaigns()}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createNewCampaign')}</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{t('stats.total')}</span>
              <Megaphone className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.total}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
              <span>{t('stats.active')}</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {stats.active}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/10">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 text-xs">
              <span>{t('stats.clicks')}</span>
              <MousePointer2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-teal-700 dark:text-teal-300 mt-1">
              {stats.totalClicks}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{t('stats.draft')}</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.draft}
            </p>
          </div>
        </div>
      </div>

      {/* DEC-01 Clinical Audience Controls Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isRtl ? 'إعدادات تفعيل الجماهير السريرية (Clinical Audience Controls)' : 'Clinical Audience Controls'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  DEC-01 Fail-Closed
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'الجماهير الطبية معطلة افتراضياً ولا تُفعل إلا بقرار صريح. أي تعديل يُسجل في سجل التدقيق الأمني.'
                  : 'Medical audiences are fail-closed by default. Modifications are recorded in the security audit log.'}
              </p>
            </div>
          </div>

          {/* Global Killswitch */}
          {settings && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isRtl ? 'الشريط العام:' : 'Global Ticker:'}
              </span>
              <button
                type="button"
                disabled={updatingSettingKey === 'ads.ticker.enabled'}
                onClick={() => handleToggleAudienceSetting('ads.ticker.enabled', settings.global_enabled)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settings.global_enabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                } ${updatingSettingKey === 'ads.ticker.enabled' ? 'opacity-50 animate-pulse' : ''}`}
              >
                {settings.global_enabled
                  ? (isRtl ? 'مفعّل' : 'Enabled')
                  : (isRtl ? 'معطّل' : 'Disabled')}
              </button>
            </div>
          )}
        </div>

        {/* Clinical Audience Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-4">
          {[
            {
              key: 'doctor',
              settingKey: 'ads.audience.doctor.enabled',
              label: isRtl ? 'الأطباء (Doctors)' : 'Doctors',
              desc: isRtl ? 'إعلانات الشريط في لوحة الطبيب' : 'Doctor dashboard feed',
            },
            {
              key: 'doctor_assistant',
              settingKey: 'ads.audience.doctor_assistant.enabled',
              label: isRtl ? 'مساعدو الأطباء' : 'Doctor Assistants',
              desc: isRtl ? 'إعلانات لوحة مساعد الطبيب' : 'Doctor assistant feed',
            },
            {
              key: 'booking_center',
              settingKey: 'ads.audience.booking_center.enabled',
              label: isRtl ? 'مراكز الحجز' : 'Booking Centers',
              desc: isRtl ? 'إعلانات لوحة مركز الحجز' : 'Booking center feed',
            },
            {
              key: 'lab',
              settingKey: 'ads.audience.lab.enabled',
              label: isRtl ? 'المخابر الطبية' : 'Laboratories',
              desc: isRtl ? 'إعلانات لوحة مسؤول المخبر' : 'Lab manager feed',
            },
            {
              key: 'lab_assistant',
              settingKey: 'ads.audience.lab_assistant.enabled',
              label: isRtl ? 'مساعدو المخابر' : 'Lab Assistants',
              desc: isRtl ? 'إعلانات لوحة فني المخبر' : 'Lab assistant feed',
            },
            {
              key: 'radiology',
              settingKey: 'ads.audience.radiology.enabled',
              label: isRtl ? 'مراكز الأشعة' : 'Radiology Centers',
              desc: isRtl ? 'إعلانات لوحة مسؤول الأشعة' : 'Radiology manager feed',
            },
            {
              key: 'rad_assistant',
              settingKey: 'ads.audience.rad_assistant.enabled',
              label: isRtl ? 'مساعدو الأشعة' : 'Radiology Assistants',
              desc: isRtl ? 'إعلانات لوحة فني الأشعة' : 'Radiology assistant feed',
            },
          ].map((item) => {
            const isEnabled = settings ? Boolean(settings.audiences[item.key as keyof typeof settings.audiences]) : false;
            const isUpdating = updatingSettingKey === item.settingKey;

            return (
              <div
                key={item.key}
                className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between gap-2.5 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdating || isLoadingSettings}
                  onClick={() => handleToggleAudienceSetting(item.settingKey, isEnabled)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  } ${isUpdating ? 'opacity-50 animate-pulse' : ''}`}
                  title={isEnabled ? (isRtl ? 'انقر للتعطيل' : 'Click to disable') : (isRtl ? 'انقر للتفعيل' : 'Click to enable')}
                >
                  {isUpdating ? '...' : isEnabled ? (isRtl ? 'مفعّل' : 'Active') : (isRtl ? 'معطّل' : 'Inactive')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action / Error Notices */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-teal-500 hover:text-teal-700">
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchCampaigns()}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 text-[11px]"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'active', 'draft', 'paused', 'expired'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'ALL' ? t('statuses.all') : t(`statuses.${st}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
            <p className="text-xs font-semibold">{t('loadingCampaigns')}</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('empty.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {searchQuery || statusFilter !== 'ALL'
                  ? t('empty.filterMatchNone')
                  : t('empty.description')}
              </p>
            </div>
            {searchQuery || statusFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t('empty.clearFilters')}
              </button>
            ) : (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('createNewCampaign')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">{t('table.campaign')}</th>
                  <th className="py-3.5 px-4">{t('table.status')}</th>
                  <th className="py-3.5 px-4">{t('table.priority')}</th>
                  <th className="py-3.5 px-4">{t('table.schedule')}</th>
                  <th className="py-3.5 px-4">{t('table.placements')}</th>
                  <th className="py-3.5 px-4">{t('table.clicks')}</th>
                  <th className="py-3.5 px-4 text-right rtl:text-left">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCampaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Title & Content */}
                    <td className="py-4 px-4 max-w-xs sm:max-w-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {camp.title}
                          </span>
                          {camp.target_url && (
                            <a
                              href={camp.target_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-teal-500"
                              title={camp.target_url}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {camp.content}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getStatusBadgeClass(
                          camp.status
                        )}`}
                      >
                        {t(`statuses.${camp.status}`)}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {camp.priority > 0 ? `+${camp.priority}` : camp.priority}
                    </td>

                    {/* Schedule (Africa/Algiers) */}
                    <td className="py-4 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                      {camp.starts_at || camp.ends_at ? (
                        <div className="space-y-0.5 font-mono text-[10px]">
                          <div>
                            <span className="text-slate-400">{t('table.from')}: </span>
                            <span>{formatAlgiersDate(camp.starts_at)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">{t('table.to')}: </span>
                            <span>{formatAlgiersDate(camp.ends_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">{t('table.continuous')}</span>
                      )}
                    </td>

                    {/* Placements */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                        {camp.placements && camp.placements.length > 0 ? (
                          camp.placements.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {p.destination}:{p.audience}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">{t('table.noPlacements')}</span>
                        )}
                        {camp.placements && camp.placements.length > 3 && (
                          <span className="text-[10px] text-teal-600 font-bold">
                            +{camp.placements.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Clicks */}
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold font-mono">
                        <MousePointer2 className="w-3 h-3 text-teal-500" />
                        <span>{camp.ticker_clicks_count}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                        {/* Quick Pause / Play */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(camp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={camp.status === 'active' ? t('actions.pause') : t('actions.activate')}
                        >
                          {camp.status === 'active' ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Placements Manager */}
                        <button
                          type="button"
                          onClick={() => setPlacementsCampaign(camp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('actions.managePlacements')}
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Metadata */}
                        <button
                          type="button"
                          onClick={() => setEditingCampaign(camp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('actions.edit')}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              {t('pagination.showing', {
                from: paginationFrom,
                to: paginationTo,
                total: paginationTotal,
                count: filteredCampaigns.length,
              })}
            </span>
            <div className="flex items-center gap-1.5">
              <span>{t('pagination.perPage')}:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="font-mono px-2">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchCampaigns();
          setActionNotice(t('notices.createdSuccess'));
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <EditCampaignModal
        isOpen={!!editingCampaign}
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSuccess={() => {
          fetchCampaigns();
          setActionNotice(t('notices.updatedSuccess'));
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <ManagePlacementsModal
        isOpen={!!placementsCampaign}
        campaign={placementsCampaign}
        onClose={() => setPlacementsCampaign(null)}
        onChanged={() => {
          fetchCampaigns();
        }}
      />
    </div>
  );
}
