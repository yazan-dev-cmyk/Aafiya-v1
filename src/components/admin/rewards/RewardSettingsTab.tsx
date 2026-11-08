"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Calendar,
  Clock,
  PlusCircle,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldCheck,
  RefreshCw,
  Loader2,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Sliders,
  History,
  Sparkles
} from "lucide-react";
import {
  adminAssistantRewardsService,
  RewardSettingsData,
  RewardRateSchedule,
  ProgramLifecycleEvent
} from "@/services/adminAssistantRewardsService";

export function RewardSettingsTab() {
  const [settings, setSettings] = useState<RewardSettingsData | null>(null);
  const [rates, setRates] = useState<RewardRateSchedule[]>([]);
  const [ratesMeta, setRatesMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [rateFilter, setRateFilter] = useState<string>("all");
  const [lifecycleEvents, setLifecycleEvents] = useState<ProgramLifecycleEvent[]>([]);
  const [showLifecycleHistory, setShowLifecycleHistory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to format Date to local YYYY-MM-DDTHH:mm
  const toLocalIso = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Min datetime is 5 minutes from now
  const minFutureIso = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    return toLocalIso(d);
  };

  // Schedule Rate Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAmount, setScheduleAmount] = useState<string>("8.25");
  const [scheduleEffectiveFrom, setScheduleEffectiveFrom] = useState<string>(() => {
    // Tomorrow at 00:00 local time
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return toLocalIso(d);
  });
  const [scheduleRef, setScheduleRef] = useState<string>("");
  const [scheduleNotes, setScheduleNotes] = useState<string>("");
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);

  // Cancel Scheduled Rate Modal state
  const [cancellingRate, setCancellingRate] = useState<RewardRateSchedule | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);

  // Lifecycle Modal state
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [targetLifecycleState, setTargetLifecycleState] = useState<"active" | "suspended" | "terminated">("suspended");
  const [lifecycleEffectiveAt, setLifecycleEffectiveAt] = useState<string>(() => toLocalIso(new Date()));
  const [noticeDeadlineAt, setNoticeDeadlineAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toLocalIso(d);
  });
  const [lifecycleReason, setLifecycleReason] = useState<string>("");
  const [lifecycleRef, setLifecycleRef] = useState<string>("");
  const [lifecycleModalError, setLifecycleModalError] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1, status = rateFilter) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [settingsRes, ratesRes] = await Promise.all([
        adminAssistantRewardsService.getSettings(),
        adminAssistantRewardsService.getRates({ page, per_page: 15, status })
      ]);

      if (settingsRes.status === "success") {
        setSettings(settingsRes.data);
      }
      if (ratesRes.status === "success") {
        setRates(ratesRes.data);
        setRatesMeta(ratesRes.meta);
      }
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || "تعذر تحميل إعدادات برنامج المكافآت";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [rateFilter]);

  const loadLifecycleHistory = async () => {
    try {
      setActionLoading(true);
      const res = await adminAssistantRewardsService.getLifecycleHistory({ page: 1, per_page: 20 });
      if (res.status === "success") {
        setLifecycleEvents(res.data);
        setShowLifecycleHistory(true);
      }
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || "تعذر جلب سجل أحداث دورة الحياة";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleModalError(null);

    // Normalize comma or space
    const cleaned = scheduleAmount.trim().replace(",", ".");
    const amountNum = parseFloat(cleaned);

    if (isNaN(amountNum) || amountNum < 1) {
      setScheduleModalError("قيمة المكافأة يجب أن تكون رقماً أكبر من أو يساوي 1 د.ج (مثال: 8.25 أو 10)");
      return;
    }

    if (!scheduleEffectiveFrom) {
      setScheduleModalError("تاريخ ووقت السريان إلزامي.");
      return;
    }

    // Verify future datetime
    const effectiveDate = new Date(scheduleEffectiveFrom);
    if (effectiveDate.getTime() <= Date.now()) {
      setScheduleModalError("تاريخ ووقت السريان يجب أن يكون لاحقاً للوقت الحالي (في المستقبل).");
      return;
    }

    try {
      setActionLoading(true);

      const effectiveFormatted = scheduleEffectiveFrom.replace("T", " ") + (scheduleEffectiveFrom.length === 16 ? ":00" : "");

      const res = await adminAssistantRewardsService.scheduleRate({
        rate_amount: amountNum,
        effective_from: effectiveFormatted,
        decision_reference: scheduleRef.trim() || undefined,
        notes: scheduleNotes.trim() || undefined
      });

      if (res.status === "success") {
        setSuccessMessage(res.message || `تمت جدولة قيمة المكافأة (${amountNum.toFixed(2)} د.ج) بنجاح.`);
        setShowScheduleModal(false);
        setScheduleRef("");
        setScheduleNotes("");
        setScheduleModalError(null);
        setRateFilter("all");
        await fetchData(1, "all");
      }
    } catch (err: any) {
      const msg =
        err?.responseData?.message ||
        err?.message ||
        (err?.errors ? Object.values(err.errors).flat().join(" - ") : null) ||
        "فشل جدولة السعر الجديد. تأكد من أن التاريخ مستقبلي ولم تتم جدولته مسبقاً.";
      setScheduleModalError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRate) return;
    setCancelModalError(null);

    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancelModalError("سبب إلغاء الجدولة إلزامي ويجب ألا يقل عن 5 أحرف.");
      return;
    }

    try {
      setActionLoading(true);

      const res = await adminAssistantRewardsService.cancelScheduledRate(cancellingRate.id, {
        cancellation_reason: cancellationReason.trim()
      });

      if (res.status === "success") {
        setSuccessMessage(res.message || "تم إلغاء الجدولة المحددة بنجاح.");
        setCancellingRate(null);
        setCancellationReason("");
        setCancelModalError(null);
        await fetchData(ratesMeta.current_page, rateFilter);
      }
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || "فشل إلغاء الجدولة.";
      setCancelModalError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLifecycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLifecycleModalError(null);

    if (!lifecycleReason.trim() || lifecycleReason.trim().length < 5) {
      setLifecycleModalError("سبب تغيير حالة البرنامج إلزامي ويجب ألا يقل عن 5 أحرف.");
      return;
    }

    if (targetLifecycleState === "terminated" && !noticeDeadlineAt) {
      setLifecycleModalError("تاريخ نهاية مهلة الإشعار إلزامي عند إنهاء البرنامج بموجب DEC-05/06.");
      return;
    }

    try {
      setActionLoading(true);

      const effectiveFormatted = lifecycleEffectiveAt.replace("T", " ") + (lifecycleEffectiveAt.length === 16 ? ":00" : "");
      const noticeFormatted = noticeDeadlineAt ? noticeDeadlineAt.replace("T", " ") + (noticeDeadlineAt.length === 16 ? ":00" : "") : undefined;

      const res = await adminAssistantRewardsService.transitionLifecycle({
        target_state: targetLifecycleState,
        effective_at: effectiveFormatted,
        notice_deadline_at: targetLifecycleState === "terminated" ? noticeFormatted : undefined,
        reason: lifecycleReason.trim(),
        decision_reference: lifecycleRef.trim() || undefined
      });

      if (res.status === "success") {
        setSuccessMessage(res.message || "تم تحويل دورة حياة البرنامج بنجاح.");
        setShowLifecycleModal(false);
        setLifecycleReason("");
        setLifecycleRef("");
        setLifecycleModalError(null);
        await fetchData();
      }
    } catch (err: any) {
      const msg = err?.responseData?.message || err?.message || "فشل تغيير حالة دورة حياة البرنامج.";
      setLifecycleModalError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("ar-DZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            نشط حالياً
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            مجدول مستقبلاً
          </span>
        );
      case "superseded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            سابق (مستبدل)
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5" />
            ملغى
          </span>
        );
      default:
        return <span className="text-xs text-slate-500 font-medium">{status}</span>;
    }
  };

  const getLifecycleStateBadge = (state?: string) => {
    switch (state) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            البرنامج نشط ويعمل
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            البرنامج معلق مؤقتاً
          </span>
        );
      case "terminated":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-200 border border-rose-400/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            البرنامج منتهي نهائياً
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Configuration & Control Hero Card */}
      <div className="bg-gradient-to-l from-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-400/20 text-teal-200 border border-teal-300/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                برنامج مكافآت مساعدي أطباء العيادات (ARP)
              </span>
              {getLifecycleStateBadge(settings?.lifecycle?.current_state)}
              <span className="text-xs text-slate-300 font-mono">
                كود: <span className="text-teal-300 font-bold">ARP-CLINIC-ASSISTANTS</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              إدارة وتسعير مكافآت مساعدي أطباء العيادات
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              تحديد قيمة المكافأة المستحقة لمساعد الطبيب عن كل موعد مؤكد، وإدارة دورة حياة البرنامج وجدولة التغييرات المستقبلية مع سريانها في تواريخ وأوقات محددة دون التأثير بأثر رجعي على المواعيد السابقة (مبدأ ثبات اللقطة المحاسبية).
            </p>
          </div>

          {/* Current Rate Value Showcase & CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-xs">
            <div className="text-center sm:text-right px-4">
              <span className="text-xs text-teal-200 font-semibold block">القيمة الفعالة حالياً</span>
              <div className="flex items-baseline gap-1 mt-1 justify-center sm:justify-start">
                <span className="text-4xl font-extrabold text-white font-mono">
                  {settings ? Number(settings.current_rate.amount).toFixed(2) : "..."}
                </span>
                <span className="text-sm text-teal-300 font-bold">د.ج / موعد</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {settings?.current_rate?.source === "default"
                  ? "السعر الافتراضي الأساسي للنظام (10.00 د.ج)"
                  : `سعر مجدول ساري منذ ${formatDate(settings?.current_rate?.effective_since || settings?.current_rate?.effective_from)}`}
              </span>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setScheduleModalError(null);
                  setShowScheduleModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-sm shadow-md transition-all cursor-pointer hover:shadow-teal-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>جدولة قيمة جديدة</span>
              </button>

              <button
                onClick={() => {
                  setErrorMessage(null);
                  setLifecycleModalError(null);
                  setTargetLifecycleState(settings?.lifecycle?.current_state === "active" ? "suspended" : "active");
                  setShowLifecycleModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 text-teal-300" />
                <span>إدارة حالة البرنامج</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice & Governance Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-teal-50/70 border border-teal-200/80 p-4 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-teal-900">
            <strong className="font-bold text-sm block">ثبات اللقطة المحاسبية (DEC-03)</strong>
            <p className="leading-relaxed text-teal-800">
              أي موعد تم تأكيده يحتفظ بسعر المكافأة في لحظة التأكيد الفعلي بشكل دائم ولا يتأثر نهائياً بأي تحديثات أو جدولة أسعار لاحقة.
            </p>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-amber-900">
            <strong className="font-bold text-sm block">سلامة دفتر الأستاذ عند الإلغاء (DEC-01)</strong>
            <p className="leading-relaxed text-amber-800">
              عند إلغاء موعد مؤكد، يقوم النظام تلقائياً بخصم القيمة التاريخية المسجلة للموعد بالضبط، مما يمنع حدوث أي فوارق أو أرصدة متبقية.
            </p>
          </div>
        </div>
      </div>

      {/* Rate Schedules List Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              سجل جدولة وتغيير أسعار المكافأة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              استعراض الأسعار الحالية والسابقة والمجدولة مع إمكانية إلغاء الجدولة قبل سريانها.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              {[
                { key: "all", label: "الكل" },
                { key: "scheduled", label: "المجدولة" },
                { key: "active", label: "النشطة" },
                { key: "superseded", label: "السابقة" },
                { key: "cancelled", label: "الملغاة" }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setRateFilter(f.key);
                    fetchData(1, f.key);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    rateFilter === f.key
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchData(ratesMeta.current_page, rateFilter)}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-teal-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table of Rate Schedules */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">قيمة المكافأة</th>
                <th className="py-3 px-4">تاريخ ووقت السريان</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">المرجع الإداري</th>
                <th className="py-3 px-4">تاريخ الإنشاء / المُنشئ</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                    جاري تحميل جدول الأسعار...
                  </td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    لا توجد أي جدولة أسعار مطابقة للفلتر المحدد.
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="text-base">{Number(rate.rate_amount).toFixed(2)}</span>{" "}
                      <span className="text-xs text-slate-500 font-sans font-normal">د.ج</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(rate.effective_from)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(rate.status)}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                      {rate.decision_reference || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>{rate.creator?.name || "النظام الإداري"}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{formatDate(rate.created_at)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {rate.status === "scheduled" ? (
                        <button
                          onClick={() => {
                            setErrorMessage(null);
                            setCancelModalError(null);
                            setCancellingRate(rate);
                            setCancellationReason("");
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          إلغاء الجدولة
                        </button>
                      ) : rate.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          سارٍ ومطبق حالياً
                        </span>
                      ) : rate.status === "cancelled" ? (
                        <span className="text-[11px] text-rose-600 block max-w-xs truncate" title={rate.cancellation_reason || ""}>
                          سبب الإلغاء: {rate.cancellation_reason || "بدون سبب"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">سابق (مستبدل)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {ratesMeta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>
              إجمالي السجلات: {ratesMeta.total} • الصفحة {ratesMeta.current_page} من {ratesMeta.last_page}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={ratesMeta.current_page <= 1 || loading}
                onClick={() => fetchData(ratesMeta.current_page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={ratesMeta.current_page >= ratesMeta.last_page || loading}
                onClick={() => fetchData(ratesMeta.current_page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Program Lifecycle Audit Trail Toggle & Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">سجل أحداث وقرارات دورة حياة البرنامج</h4>
              <p className="text-xs text-slate-500">
                توثيق التغييرات والتعليق والاستئناف مع هوية المسؤول الإداري والأسباب.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (showLifecycleHistory) {
                setShowLifecycleHistory(false);
              } else {
                loadLifecycleHistory();
              }
            }}
            disabled={actionLoading}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{showLifecycleHistory ? "إخفاء السجل" : "عرض السجل التاريخي"}</span>
          </button>
        </div>

        {showLifecycleHistory && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {lifecycleEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لم تسجل أي أحداث دورة حياة سابقة.</p>
            ) : (
              lifecycleEvents.map((evt) => (
                <div key={evt.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        تحويل من: {evt.from_state || "البداية"} ⬅️ إلى: {evt.to_state}
                      </span>
                      {evt.decision_reference && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono text-[10px]">
                          {evt.decision_reference}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">السبب: {evt.reason}</p>
                    {evt.notice_deadline_at && (
                      <p className="text-amber-700 font-semibold">
                        مهلة الإشعار المحددة: {formatDate(evt.notice_deadline_at)}
                      </p>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-left sm:text-right shrink-0">
                    <div>{evt.authorizer?.name || "الإدارة"}</div>
                    <span>{formatDate(evt.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Schedule New Rate */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-teal-700 mb-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200">
                    برنامج: مكافآت مساعدي أطباء العيادات (ARP)
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <PlusCircle className="w-5 h-5 text-teal-600" />
                  جدولة قيمة مكافأة جديدة للمساعدين
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleScheduleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* Current Active Rate Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">قيمة المكافأة الحالية السارية:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-base font-extrabold text-teal-800">
                      {settings ? Number(settings.current_rate.amount).toFixed(2) : "10.00"}
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans font-medium">د.ج / موعد مؤكد</span>
                  </div>
                </div>

                {/* In-Modal Error Display */}
                {scheduleModalError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{scheduleModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قيمة المكافأة الجديدة لكل موعد (د.ج) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="10000"
                      required
                      value={scheduleAmount}
                      onChange={(e) => setScheduleAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-base font-bold text-slate-900"
                      placeholder="مثال: 08.25 أو 8.00 أو 15"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      د.ج
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    يمكن إدخال كسور الدينار (مثل 8.25 د.ج أو 12.50 د.ج). الحد الأدنى 1 د.ج.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      تاريخ ووقت السريان المستقبلي <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-teal-700 font-medium">توقيت الجزائر (Africa/Algiers)</span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    min={minFutureIso()}
                    value={scheduleEffectiveFrom}
                    onChange={(e) => setScheduleEffectiveFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-sm text-slate-900"
                  />

                  {/* Quick Date Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">خيارات سريعة:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(0, 0, 0, 0);
                        setScheduleEffectiveFrom(toLocalIso(d));
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[10px] transition-colors cursor-pointer"
                    >
                      غداً 00:00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 24 * 3600 * 1000);
                        setScheduleEffectiveFrom(toLocalIso(d));
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[10px] transition-colors cursor-pointer"
                    >
                      بعد 24 ساعة بالضبط
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1, 1);
                        d.setHours(0, 0, 0, 0);
                        setScheduleEffectiveFrom(toLocalIso(d));
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[10px] transition-colors cursor-pointer"
                    >
                      بداية الشهر القادم
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المرجع الإداري / رقم القرار
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={scheduleRef}
                    onChange={(e) => setScheduleRef(e.target.value)}
                    placeholder="مثال: DEC-2026-11-REV"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الملاحظات ومبررات التغيير
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="أدخل أي ملاحظات أو حيثيات لقرار تغيير السعر..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs text-slate-900"
                  />
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    ستطبق هذه القيمة تلقائياً وفورياً على أي موعد يؤكد بعد تاريخ ووقت السريان المحدد. المواعيد السابقة تحتفظ بقيمتها الأصلية دون تغيير (مبدأ ثبات اللقطة).
                  </span>
                </div>
              </div>

              {/* Modal Fixed Footer with Action Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تأكيد الجدولة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cancel Scheduled Rate */}
      {cancellingRate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
                <Ban className="w-5 h-5" />
                إلغاء جدولة سعر المكافأة للمساعدين
              </h3>
              <button
                onClick={() => setCancellingRate(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {cancelModalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{cancelModalError}</span>
                  </div>
                )}

                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-rose-900 font-bold">قيمة المكافأة المراد إلغاؤها:</span>
                  <span className="font-mono font-extrabold text-rose-700 text-sm">
                    {Number(cancellingRate.rate_amount).toFixed(2)} د.ج / موعد
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  أنت على وشك إلغاء هذا التغيير المقرر سريانه في{" "}
                  <strong className="text-slate-900 font-mono">
                    {formatDate(cancellingRate.effective_from)}
                  </strong>
                  . لن يتم تطبيق هذا السعر، وسيظل السعر الساري حالياً (
                  <strong className="font-mono font-bold text-teal-800">
                    {settings ? Number(settings.current_rate.amount).toFixed(2) : "10.00"} د.ج
                  </strong>
                  ) هو المعتمد لاحتساب المكافآت.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سبب الإلغاء الإلزامي <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    minLength={5}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="أدخل مبرر أو قرار إلغاء الجدولة المسبقة..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCancellingRate(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  <span>تأكيد الإلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* MODAL 3: Lifecycle Governance */}
      {showLifecycleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  نطاق النظام: ARP-CLINIC-ASSISTANTS
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <Activity className="w-5 h-5 text-teal-600" />
                  إدارة دورة حياة برنامج مكافآت مساعدي الأطباء
                </h3>
              </div>
              <button
                onClick={() => setShowLifecycleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleLifecycleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* Target Program Identity Card with Explicit Reward Value Display */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">البرنامج المستهدف:</span>
                    <span className="font-extrabold text-teal-800 text-sm">مكافآت مساعدي أطباء العيادات (ARP)</span>
                  </div>

                  {/* PROMINENT REWARD VALUE DISPLAY */}
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                    <span className="font-bold text-slate-700">قيمة المكافأة الحالية المعتمدة:</span>
                    <span className="font-mono font-extrabold text-teal-700 text-sm bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      {settings ? Number(settings.current_rate.amount).toFixed(2) : "10.00"} د.ج / موعد مؤكد
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="text-slate-500">الفئة الخاضعة للتغيير:</span>
                    <span className="text-slate-900 font-medium">مساعدو الأطباء بالعيادات الطبية المسجلة بالمنصة</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="text-slate-500">نوع الاستحقاق:</span>
                    <span className="text-slate-900 font-medium">مكافأة تأكيد المواعيد الطبية الحضورية</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="text-slate-500">الحالة المطبقة حالياً:</span>
                    <span>{getLifecycleStateBadge(settings?.lifecycle?.current_state)}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 mt-2 flex items-start gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      هذا القرار يقتصر أثره حصراً على مكافآت مساعدي الأطباء عند تأكيد المواعيد، ولا يؤثر إطلاقاً على حجز المواعيد أو حسابات المرضى أو الأطباء.
                    </span>
                  </div>
                </div>

                {lifecycleModalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{lifecycleModalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    الحالة المستهدفة للبرنامج <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { state: "active", label: "نشط (تفعيل)", desc: "سريان المكافآت كالمعتاد" },
                      { state: "suspended", label: "معلق مؤقتاً", desc: "إيقاف الاستحقاق الجديد" },
                      { state: "terminated", label: "إنهاء نهائي", desc: "إغلاق البرنامج مع مهلة" }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.state}
                        onClick={() => setTargetLifecycleState(item.state as any)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          targetLifecycleState === item.state
                            ? "border-teal-600 bg-teal-50/60 ring-1 ring-teal-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ ووقت سريان القرار <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={lifecycleEffectiveAt}
                    onChange={(e) => setLifecycleEffectiveAt(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-xs text-slate-900"
                  />
                </div>

                {targetLifecycleState === "terminated" && (
                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1">
                      تاريخ انتهاء مهلة إشعار المساعدين (DEC-05/06) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={noticeDeadlineAt}
                      onChange={(e) => setNoticeDeadlineAt(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-rose-300 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 font-mono text-xs text-slate-900"
                    />
                    <span className="text-[11px] text-rose-600 mt-1 block">
                      يجب أن يكون تاريخ انتهاء المهلة لاحقاً لتاريخ السريان لتمكين تسوية المواعيد المحجوزة مسبقاً.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    السبب الإلزامي للتحويل <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    minLength={5}
                    value={lifecycleReason}
                    onChange={(e) => setLifecycleReason(e.target.value)}
                    placeholder="أدخل مبرر تغيير حالة البرنامج (مثال: تحديث السياسة المالية السنوية)..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المرجع الإداري / القرار
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={lifecycleRef}
                    onChange={(e) => setLifecycleRef(e.target.value)}
                    placeholder="مثال: RES-2026-BOARD-01"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Fixed Modal Action Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLifecycleModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تطبيق التغيير</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RewardSettingsTab;
