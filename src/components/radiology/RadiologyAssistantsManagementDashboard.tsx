'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Radio,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Lock,
  User,
  Activity,
  RefreshCw,
  KeyRound,
  X,
  ChevronRight,
  Sliders,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/auth';
import { DiagnosticStaffDetailDrawer } from '@/components/diagnostic/DiagnosticStaffDetailDrawer';

interface StaffMember {
  id: string;
  user_id: string;
  role_type: string;
  is_active: boolean;
  delegated_permissions?: string[];
  permissions?: string[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    is_active: boolean;
  };
  created_at?: string;
}

interface RadiologyAssistantsManagementDashboardProps {
  onBackToRadDashboard?: () => void;
}

export const RadiologyAssistantsManagementDashboard: React.FC<RadiologyAssistantsManagementDashboardProps> = ({
  onBackToRadDashboard,
}) => {
  const t = useTranslations('diagnostic.staff');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const router = useRouter();
  const { user } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Drawer state
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleType, setRoleType] = useState('technician');
  const [centerId, setCenterId] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const centersRes = await api.get<{ data: any[] }>('/diagnostic-centers?type=radiology');
      const centers = centersRes.data?.data || (Array.isArray(centersRes.data) ? centersRes.data : []);
      const myCenter = centers.find((c: any) => c.user_id === user?.id) || centers[0];

      if (myCenter?.id) {
        setCenterId(myCenter.id);
        const staffRes = await api.get<{ data: StaffMember[] }>(`/diagnostic-centers/${myCenter.id}/staff`);
        const list = staffRes.data?.data || (Array.isArray(staffRes.data) ? staffRes.data : []);
        setStaffList(list);
      } else {
        setStaffList([]);
      }
    } catch (err: any) {
      console.error('Fetch radiology staff error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      let targetCenterId = centerId;
      if (!targetCenterId) {
        const regRes = await api.post<any>('/diagnostic-centers', {
          name: `مركز ${user?.name || 'الأشعة والتصوير الطبي'}`,
          type: 'radiology',
          license_number: `RAD-LIC-${Date.now().toString().slice(-6)}`,
          phone: user?.phone || '+213550000000',
          wilaya: 'الجزائر العاصمة',
          address: 'الجزائر',
        });
        targetCenterId = regRes.data?.data?.id || regRes.data?.id;
        setCenterId(targetCenterId);
      }

      await api.post(`/diagnostic-centers/${targetCenterId}/staff`, {
        name,
        email,
        phone,
        password,
        role_type: roleType,
      });

      setFeedback({
        type: 'success',
        message: t('actionSuccess'),
      });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      fetchStaff();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('actionFailed');
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (staffMember: StaffMember) => {
    setSelectedStaffId(staffMember.id);
    setIsDrawerOpen(true);
  };

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.user?.name && s.user.name.toLowerCase().includes(q)) ||
      (s.user?.email && s.user.email.toLowerCase().includes(q)) ||
      (s.user?.phone && s.user.phone.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 md:p-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-indigo-700 tracking-wider uppercase">
                  {t('title')}
                </span>
                <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                  ROLE: radiology (MANAGER)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {t('title')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('staffDetailsSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <button
              onClick={() => {
                if (onBackToRadDashboard) onBackToRadDashboard();
                else router.push('/radiology/dashboard');
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer border border-slate-200 shadow-xs"
            >
              <span>{isRtl ? 'العودة للوحة تحكم الأشعة' : 'Back to Radiology Dashboard'}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRtl ? 'إضافة موظف أشعة' : 'Add Radiology Staff'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">{isRtl ? 'إجمالي الكوادر' : 'Total Staff'}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{staffList.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">{t('active')}</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {staffList.filter((s) => s.is_active && s.user?.is_active !== false).length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">{t('roleType')}</p>
              <h3 className="text-sm font-bold text-indigo-700 mt-1 font-mono">rad_assistant</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Staff Table Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث بالاسم، البريد أو رقم الهاتف...' : 'Search by name, email, phone...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
              <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`} />
            </div>

            <button
              onClick={fetchStaff}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>{isRtl ? 'تحديث القائمة' : 'Refresh'}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>{t('savingPermissions')}</span>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 p-8">
              <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {isRtl ? 'لا يوجد موظفو أشعة مسجلون حالياً' : 'No Radiology Staff Registered Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {isRtl
                  ? 'يمكنك إضافة فني تصوير طبي أو مساعد استقبال جديد وتعيين بيانات الدخول الخاصة به من خلال زر «إضافة موظف أشعة» أعلاه.'
                  : 'You can add a radiology technician or assistant and configure their credentials using the button above.'}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isRtl ? 'إضافة أول موظف أشعة' : 'Add First Radiology Staff'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">{t('employee')}</th>
                    <th className="py-3 px-4">{isRtl ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="py-3 px-4">{isRtl ? 'رقم الهاتف' : 'Phone'}</th>
                    <th className="py-3 px-4">{t('jobPosition')}</th>
                    <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleRowClick(s)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                          {s.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="block group-hover:text-indigo-700 transition-colors">
                            {s.user?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{s.user?.email || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600" dir="ltr">
                        {s.user?.phone || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-mono text-[11px] font-bold">
                          {s.role_type === 'technician'
                            ? t('technician')
                            : s.role_type === 'validator'
                            ? t('validator')
                            : t('assistant')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            s.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.is_active ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t('statusActive')}</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                              <span>{t('statusSuspended')}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 text-[11px] font-bold transition-all inline-flex items-center gap-1">
                          <Sliders className="w-3 h-3" />
                          <span>{t('editPermissions')}</span>
                          <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Staff Detail & Action Drawer */}
      <DiagnosticStaffDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStaffId(null);
        }}
        centerId={centerId || ''}
        staffId={selectedStaffId}
        centerType="radiology"
        onStaffUpdated={fetchStaff}
      />

      {/* Add Assistant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl ? 'إضافة موظف أشعة جديد' : 'Add New Radiology Staff'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('staffDetailsSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('employee')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isRtl ? 'مثال: عبد القادر عثماني' : 'e.g. Abdelkader Othmani'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <User className={`w-3.5 h-3.5 text-slate-400 absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="val.rad.tech@aafiya.dz"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <Mail className={`w-3.5 h-3.5 text-slate-400 absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+213550000011"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <Phone className={`w-3.5 h-3.5 text-slate-400 absolute top-3 ${isRtl ? 'left-3' : 'right-3'}`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                  />
                  <Lock className={`w-3.5 h-3.5 text-slate-400 absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    title={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
                    className={`absolute top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('jobPosition')}
                </label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="technician">{t('technician')}</option>
                  <option value="assistant">{t('assistant')}</option>
                  <option value="validator">{t('validator')}</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submitting ? t('savingPermissions') : isRtl ? 'تأكيد وحفظ' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
