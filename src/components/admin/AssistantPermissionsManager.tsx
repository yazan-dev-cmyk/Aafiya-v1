'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Lock,
  Unlock,
  Check,
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
  FileCheck,
  Headphones,
  Bell,
  BarChart2,
  UserCheck,
  UserX,
  Plus,
  Loader2
} from 'lucide-react';
import {
  AssistantPermissions,
  DEFAULT_NO_PERMISSIONS,
  UI_TO_BACKEND_PERM_MAP,
  mapBackendPermissionsToUI,
  mapUIToBackendPermissions,
} from '@/constants/permissions';
import { api } from '@/lib/api';
import { adminService } from '@/services/adminService';

export { UI_TO_BACKEND_PERM_MAP, mapBackendPermissionsToUI, mapUIToBackendPermissions };

export interface AssistantUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin: string;
  permissions: AssistantPermissions;
}

const mapUserToAssistant = (user: any): AssistantUser => {
  const serverPerms = Array.isArray(user.permissions)
    ? user.permissions
    : (Array.isArray(user.scoped_permissions) ? user.scoped_permissions : []);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '--',
    status: user.is_active ? 'active' : 'suspended',
    createdAt: user.created_at ? user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    lastLogin: user.last_login_at ? new Date(user.last_login_at).toLocaleString('ar-DZ') : 'لم يسجل دخول بعد',
    permissions: mapBackendPermissionsToUI(serverPerms),
  };
};

export function AssistantPermissionsManager() {
  const [assistants, setAssistants] = useState<AssistantUser[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newAssistant, setNewAssistant] = useState({ name: '', email: '', phone: '', password: '' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchAssistants = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await adminService.getAssistants({ page, per_page: 20 });
      const userList = Array.isArray(response.data) ? response.data : [];
      const mapped = userList.map(mapUserToAssistant);
      setAssistants(mapped);
      if (response.meta) {
        setCurrentPage(response.meta.current_page || page);
        setTotalPages(response.meta.last_page || 1);
        setTotalItems(response.meta.total || mapped.length);
      }
      if (mapped.length > 0) {
        setSelectedAssistantId((current) => (current && mapped.some((m) => m.id === current) ? current : mapped[0].id));
      } else {
        setSelectedAssistantId('');
      }
    } catch (err: any) {
      console.error('Failed to fetch admin assistants from API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssistants(currentPage);
  }, [fetchAssistants, currentPage]);

  const selectedAssistant = assistants.find((a) => a.id === selectedAssistantId) || assistants[0];

  const handleTogglePermission = async (key: keyof AssistantPermissions) => {
    if (!selectedAssistant || savingPermissions) return;

    const nextPermissions: AssistantPermissions = {
      ...selectedAssistant.permissions,
      [key]: !selectedAssistant.permissions[key],
    };

    const backendPermList = mapUIToBackendPermissions(nextPermissions);
    setSavingPermissions(true);

    try {
      const response = await api.put(`/admin/assistants/${selectedAssistant.id}/permissions`, {
        permissions: backendPermList,
      });

      const returnedPerms = response?.data?.permissions || response?.data?.scoped_permissions || (response as any)?.delegated_permissions || backendPermList;
      const updatedUIPerms = mapBackendPermissionsToUI(returnedPerms);

      setAssistants((prev) =>
        prev.map((ast) => (ast.id === selectedAssistant.id ? { ...ast, permissions: updatedUIPerms } : ast))
      );

      setToastMessage(`تم تحديث الصلاحية [${String(key)}] وحفظها في قاعدة البيانات بنجاح.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`فشل حفظ الصلاحية: ${err?.message || 'خطأ في الخادم'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleGrantAll = async () => {
    if (!selectedAssistant || savingPermissions) return;

    const allGrantedKeys = Object.keys(UI_TO_BACKEND_PERM_MAP) as (keyof AssistantPermissions)[];
    const allGranted: AssistantPermissions = { ...DEFAULT_NO_PERMISSIONS };
    for (const k of allGrantedKeys) {
      allGranted[k] = true;
    }

    const backendPermList = mapUIToBackendPermissions(allGranted);
    setSavingPermissions(true);

    try {
      const response = await api.put(`/admin/assistants/${selectedAssistant.id}/permissions`, {
        permissions: backendPermList,
      });

      const returnedPerms = response?.data?.permissions || response?.data?.scoped_permissions || (response as any)?.delegated_permissions || backendPermList;
      const updatedUIPerms = mapBackendPermissionsToUI(returnedPerms);

      setAssistants((prev) =>
        prev.map((ast) => (ast.id === selectedAssistant.id ? { ...ast, permissions: updatedUIPerms } : ast))
      );

      setToastMessage(`تم منح وتثبيت جميع الصلاحيات المصرح بها للمساعد ${selectedAssistant.name}.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`فشل منح الصلاحيات: ${err?.message || 'خطأ في الخادم'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!selectedAssistant || savingPermissions) return;

    setSavingPermissions(true);

    try {
      const response = await api.put(`/admin/assistants/${selectedAssistant.id}/permissions`, {
        permissions: [],
      });

      const returnedPerms = response?.data?.permissions || response?.data?.scoped_permissions || (response as any)?.delegated_permissions || [];
      const updatedUIPerms = mapBackendPermissionsToUI(returnedPerms);

      setAssistants((prev) =>
        prev.map((ast) => (ast.id === selectedAssistant.id ? { ...ast, permissions: updatedUIPerms } : ast))
      );

      setToastMessage(`تم تجريد كافة الصلاحيات المفوضة من المساعد ${selectedAssistant.name} (Strict Zero Trust).`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`فشل سحب الصلاحيات: ${err?.message || 'خطأ في الخادم'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await api.put(`/admin/assistants/${id}/status`);
      const updatedUser = response.data;
      if (updatedUser) {
        setAssistants((prev) =>
          prev.map((ast) => (ast.id === id ? mapUserToAssistant(updatedUser) : ast))
        );
      }
      setToastMessage('تم تحديث حالة الحساب بنجاح في قاعدة البيانات.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`خطأ: ${err?.message || 'تعذر تغيير حالة الحساب'}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDeleteAssistant = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف حساب المساعد نهائياً من قاعدة البيانات؟')) {
      try {
        await api.delete(`/admin/assistants/${id}`);
        setAssistants((prev) => prev.filter((ast) => ast.id !== id));
        if (selectedAssistantId === id) {
          setSelectedAssistantId('');
        }
        setToastMessage('تم حذف حساب المساعد نهائياً من قاعدة البيانات.');
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err: any) {
        setToastMessage(`خطأ: ${err?.message || 'تعذر حذف الحساب'}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssistant.name || !newAssistant.email || !newAssistant.password) return;

    setSubmitting(true);
    try {
      const response = await api.post('/admin/assistants', {
        name: newAssistant.name,
        email: newAssistant.email,
        phone: newAssistant.phone || '+213550000000',
        password: newAssistant.password,
      });

      const createdUser = response.data;
      const createdAssistant = mapUserToAssistant(createdUser);

      setAssistants((prev) => [createdAssistant, ...prev.filter((a) => a.id !== createdAssistant.id)]);
      setSelectedAssistantId(createdAssistant.id);
      setNewAssistant({ name: '', email: '', phone: '', password: '' });
      setShowPassword(false);
      setShowCreateModal(false);
      setToastMessage(`تم حفظ حساب المساعد [${createdAssistant.name}] في قاعدة البيانات بنجاح.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      const errorMsg = err?.message || 'تعذر إنشاء حساب المساعد، يرجى المحاولة مرة أخرى.';
      setToastMessage(`خطأ: ${errorMsg}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600" />
            مصفوفة صلاحيات مساعدي مدير المنصة (Assistant RBAC Matrix)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            التحكم الدقيق في الصلاحيات الـ 27 لمساعدي الإدارة وفق نموذج الأمان 4D Zero-Trust
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAssistants(currentPage)}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            title="تحديث قائمة المساعدين من قاعدة البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            تحديث
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            + إضافة مساعد جديد
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">جاري تحميل حسابات المساعدين من قاعدة البيانات...</p>
        </div>
      ) : assistants.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-800">لا يوجد مساعدون معينون حالياً</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              يمكنك إضافة مساعدين لمدير المنصة وتحديد صلاحياتهم التشغيلية والفنية بدقة.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            إضافة أول مساعد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assistants List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>المساعدون المسجلون ({assistants.length})</span>
            </h3>

            <div className="space-y-2 text-xs">
              {assistants.map((ast) => {
                const isSelected = ast.id === (selectedAssistant?.id || '');
                return (
                  <div
                    key={ast.id}
                    onClick={() => setSelectedAssistantId(ast.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-50 border-teal-300 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">{ast.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ast.id} • {ast.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ast.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ast.status === 'active' ? 'نشط' : 'معلق'}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 mt-2">
              <span>صفحة {currentPage} من {totalPages || 1} (الإجمالي: {totalItems})</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  className="px-2.5 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 font-medium"
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || loading}
                  className="px-2.5 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 font-medium"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          {selectedAssistant && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-teal-600" />
                    صلاحيات: {selectedAssistant.name} ({selectedAssistant.id})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedAssistant.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGrantAll}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    منح الكل ✓
                  </button>
                  <button
                    onClick={handleRevokeAll}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    تجريد الكل ✕
                  </button>
                </div>
              </div>

              {/* Permissions Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Dashboard & Statistics */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-teal-600" />
                    لوحة المتابعة والإحصاءات
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.viewDashboard}
                      onChange={() => handleTogglePermission('viewDashboard')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>عرض لوحة المتابعة (viewDashboard)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.viewStatistics}
                      onChange={() => handleTogglePermission('viewStatistics')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>عرض الإحصاءات العامة (viewStatistics)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.viewTasks}
                      onChange={() => handleTogglePermission('viewTasks')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>عرض قائمة المهام (viewTasks)</span>
                  </label>
                </div>

                {/* 2. Requests Review */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    طلبات الانضمام والتسجيل
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.viewRequests}
                      onChange={() => handleTogglePermission('viewRequests')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>عرض الطلبات (viewRequests)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.reviewRequests}
                      onChange={() => handleTogglePermission('reviewRequests')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>مراجعة الطلبات وإبداء الملاحظات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-bold">
                    <input
                      type="checkbox"
                      checked={selectedAssistant.permissions.approveRequests}
                      onChange={() => handleTogglePermission('approveRequests')}
                      className="rounded text-teal-600 accent-teal-600"
                    />
                    <span>الاعتماد النهائي للطلب (approveRequests) ⚠️</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                <button
                  onClick={() => handleToggleStatus(selectedAssistant.id)}
                  className="text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                >
                  {selectedAssistant.status === 'active' ? 'تعليق الحساب مؤقتاً' : 'إلغاء تعليق الحساب'}
                </button>

                <button
                  onClick={() => handleDeleteAssistant(selectedAssistant.id)}
                  className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الحساب نهائياً
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE ASSISTANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowPassword(false);
              }}
              className="absolute top-4 left-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" />
              إضافة حساب مساعد مدير المنصة جديد
            </h3>

            <form onSubmit={handleCreateAssistant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عبد الله أحمد"
                  value={newAssistant.name}
                  onChange={(e) => setNewAssistant({ ...newAssistant, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني المهني</label>
                <input
                  type="email"
                  required
                  placeholder="assistant@aafiya.sa"
                  value={newAssistant.email}
                  onChange={(e) => setNewAssistant({ ...newAssistant, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="0501234567"
                  value={newAssistant.phone}
                  onChange={(e) => setNewAssistant({ ...newAssistant, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور المبدئية</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="الحد الأدنى 8 محارف (مثال: Assist#Pass2026!)"
                    value={newAssistant.password}
                    onChange={(e) => setNewAssistant({ ...newAssistant, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-10 text-slate-900 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  كلمة المرور المبدئية التي يسلمها المسؤول للمساعد لتسجيل الدخول مباشرة (لا يُجبر على تغييرها).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'إنشاء الحساب وتعيين الصلاحيات'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowPassword(false);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
