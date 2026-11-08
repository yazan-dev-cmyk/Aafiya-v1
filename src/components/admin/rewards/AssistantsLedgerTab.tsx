'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Award,
  Clock,
  ShieldAlert
} from 'lucide-react';
import {
  adminAssistantRewardsService,
  AssistantDirectoryItem
} from '@/services/adminAssistantRewardsService';
import { AssistantDetailDrawer } from './AssistantDetailDrawer';

export function AssistantsLedgerTab() {
  const [assistants, setAssistants] = useState<AssistantDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<'all' | 'active' | 'departed'>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<string>('all');
  const [profileStatusFilter, setProfileStatusFilter] = useState<string>('all');

  // Selected assistant for drawer
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantDirectoryItem | null>(null);

  const fetchAssistants = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (membershipFilter !== 'all') params.membership = membershipFilter;
      if (eligibilityFilter !== 'all') params.eligibility = eligibilityFilter;
      if (profileStatusFilter !== 'all') params.profile_status = profileStatusFilter;

      const res = await adminAssistantRewardsService.getAssistants(params);
      setAssistants(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err: any) {
      console.error('Failed to load assistants directory', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, membershipFilter, eligibilityFilter, profileStatusFilter]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssistants();
  };

  const getEligibilityBadge = (item: AssistantDirectoryItem) => {
    if (item.payout_eligibility.is_eligible) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          مؤهل للصرف
        </span>
      );
    }

    switch (item.payout_eligibility.reason) {
      case 'threshold_not_met':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
            <Clock className="w-3 h-3 text-amber-600" />
            دون الحد (10k د.ج)
          </span>
        );
      case 'missing_active_profile':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            غياب RIP معتمد
          </span>
        );
      case 'deficit':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            رصيد سالب (عجز)
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold text-[11px]">
            غير مؤهل
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالاسم، البريد، الهاتف، أو المعرف..."
              className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </form>

          <button
            type="button"
            onClick={() => { setPage(1); fetchAssistants(); }}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium">العضوية:</span>
            <select
              value={membershipFilter}
              onChange={(e) => { setMembershipFilter(e.target.value as any); setPage(1); }}
              className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="active">نشط بالعيادة</option>
              <option value="departed">مغادر للعيادة</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium">أهلية الصرف:</span>
            <select
              value={eligibilityFilter}
              onChange={(e) => { setEligibilityFilter(e.target.value); setPage(1); }}
              className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="eligible">مؤهل للصرف (≥ 10,000 د.ج + RIP)</option>
              <option value="below_threshold">دون الحد الأدنى (&lt; 10,000 د.ج)</option>
              <option value="deficit">رصيد سالب / عجز</option>
              <option value="missing_profile">يتطلب RIP معتمد</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 font-medium">حالة الحساب البريدي:</span>
            <select
              value={profileStatusFilter}
              onChange={(e) => { setProfileStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="active">معتمد ونشط</option>
              <option value="pending_verification">قيد المراجعة</option>
              <option value="rejected">مرفوض</option>
              <option value="none">لم يقدم حساباً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Roster */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-xs">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            جاري تحميل دليل المساعدين...
          </div>
        ) : assistants.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            لا يوجد مساعدون مطابقون لشروط البحث والفلترة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-3 px-4 font-bold">المساعد</th>
                  <th className="py-3 px-4 font-bold">العيادة والولاية</th>
                  <th className="py-3 px-4 font-bold">العضوية</th>
                  <th className="py-3 px-4 font-bold">الرصيد المتاح</th>
                  <th className="py-3 px-4 font-bold">المكتسب التراكمي</th>
                  <th className="py-3 px-4 font-bold">الحساب البريدي (RIP)</th>
                  <th className="py-3 px-4 font-bold">أهلية الصرف</th>
                  <th className="py-3 px-4 font-bold">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assistants.map((assistant) => (
                  <tr key={assistant.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{assistant.name}</p>
                      <p className="font-mono text-slate-400 text-[11px]">{assistant.phone || assistant.email || assistant.id.substring(0, 8)}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {assistant.clinic?.name || 'غير محدد'}
                      </p>
                      {assistant.clinic?.wilaya && (
                        <span className="text-[10px] text-slate-400 font-mono block">{assistant.clinic.wilaya}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        assistant.is_active_member ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {assistant.is_active_member ? 'نشط' : 'مغادر'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={assistant.balance.current_balance < 0 ? 'text-rose-600' : 'text-teal-700'}>
                        {assistant.balance.current_balance.toLocaleString('ar-DZ')} د.ج
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {assistant.balance.total_earned.toLocaleString('ar-DZ')} د.ج
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {assistant.payout_profile?.rip_masked ? (
                        <div>
                          <span>{assistant.payout_profile.rip_masked}</span>
                          <span className={`mr-1 px-1.5 py-0.2 rounded text-[10px] ${
                            assistant.payout_profile.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            v{assistant.payout_profile.version}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-sans">--</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {getEligibilityBadge(assistant)}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedAssistant(assistant)}
                        className="bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        الملف المالي
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.last_page > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              السابق
            </button>
            <span className="font-mono text-slate-500">
              صفحة {meta.current_page} من {meta.last_page} (إجمالي {meta.total} مساعد)
            </span>
            <button
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
              className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              التالي
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Assistant Detail Drawer Modal */}
      {selectedAssistant && (
        <AssistantDetailDrawer
          assistant={selectedAssistant}
          onClose={() => setSelectedAssistant(null)}
        />
      )}
    </div>
  );
}
