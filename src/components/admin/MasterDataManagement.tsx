'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  MapPin, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Power,
  Sliders,
  X,
  Check
} from 'lucide-react';
import { 
  adminService, 
  AdminMasterSpecialtyItem, 
  AdminMasterWilayaItem 
} from '@/services/adminService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

interface MasterDataManagementProps {
  isRtl?: boolean;
}

export const MasterDataManagement: React.FC<MasterDataManagementProps> = ({ isRtl = false }) => {
  const [subTab, setSubTab] = useState<'specialties' | 'wilayas'>('specialties');

  // Specialties State
  const [specialties, setSpecialties] = useState<AdminMasterSpecialtyItem[]>([]);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [specialtyStatusFilter, setSpecialtyStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Wilayas State
  const [wilayas, setWilayas] = useState<AdminMasterWilayaItem[]>([]);
  const [isLoadingWilayas, setIsLoadingWilayas] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [wilayaStatusFilter, setWilayaStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals & Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Specialty Modal State
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<AdminMasterSpecialtyItem | null>(null);
  const [specialtyForm, setSpecialtyForm] = useState({
    code: '',
    name_ar: '',
    name_fr: '',
    name_en: '',
    is_active: true,
    display_order: 0,
  });

  // Wilaya Modal State
  const [isWilayaModalOpen, setIsWilayaModalOpen] = useState(false);
  const [editingWilaya, setEditingWilaya] = useState<AdminMasterWilayaItem | null>(null);
  const [wilayaForm, setWilayaForm] = useState({
    code: '',
    name_ar: '',
    name_fr: '',
    name_en: '',
    is_active: true,
    display_order: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const fetchSpecialties = async () => {
    setIsLoadingSpecialties(true);
    try {
      const res = await adminService.getMasterSpecialties({
        search: specialtySearch,
        status: specialtyStatusFilter,
        per_page: 100,
      });
      if (res.data) {
        setSpecialties(res.data);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر تحميل التخصصات الطبية' : 'Failed to load specialties'),
      });
    } finally {
      setIsLoadingSpecialties(false);
    }
  };

  const fetchWilayas = async () => {
    setIsLoadingWilayas(true);
    try {
      const res = await adminService.getMasterWilayas({
        search: wilayaSearch,
        status: wilayaStatusFilter,
        per_page: 100,
      });
      if (res.data) {
        setWilayas(res.data);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر تحميل الولايات' : 'Failed to load wilayas'),
      });
    } finally {
      setIsLoadingWilayas(false);
    }
  };

  useEffect(() => {
    if (subTab === 'specialties') {
      fetchSpecialties();
    } else {
      fetchWilayas();
    }
  }, [subTab, specialtyStatusFilter, wilayaStatusFilter]);

  // Handle Search on Enter or debounced
  const handleSpecialtySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSpecialties();
  };

  const handleWilayaSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWilayas();
  };

  // -------------------------------------------------------------
  // Specialty Actions
  // -------------------------------------------------------------
  const handleOpenCreateSpecialty = () => {
    setEditingSpecialty(null);
    setSpecialtyForm({
      code: '',
      name_ar: '',
      name_fr: '',
      name_en: '',
      is_active: true,
      display_order: specialties.length + 1,
    });
    setIsSpecialtyModalOpen(true);
  };

  const handleOpenEditSpecialty = (spec: AdminMasterSpecialtyItem) => {
    setEditingSpecialty(spec);
    setSpecialtyForm({
      code: spec.code,
      name_ar: spec.name_ar,
      name_fr: spec.name_fr,
      name_en: spec.name_en,
      is_active: spec.is_active,
      display_order: spec.display_order,
    });
    setIsSpecialtyModalOpen(true);
  };

  const handleSaveSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingSpecialty) {
        await adminService.updateMasterSpecialty(editingSpecialty.id, specialtyForm);
        setFeedback({
          type: 'success',
          message: isRtl ? 'تم تحديث التخصص الطبي بنجاح' : 'Specialty updated successfully',
        });
      } else {
        await adminService.createMasterSpecialty(specialtyForm);
        setFeedback({
          type: 'success',
          message: isRtl ? 'تم إنشاء التخصص الطبي بنجاح' : 'Specialty created successfully',
        });
      }
      setIsSpecialtyModalOpen(false);
      fetchSpecialties();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'حدث خطأ أثناء حفظ التخصص' : 'Error saving specialty'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSpecialtyStatus = async (spec: AdminMasterSpecialtyItem) => {
    try {
      await adminService.toggleMasterSpecialtyStatus(spec.id, !spec.is_active);
      setFeedback({
        type: 'success',
        message: isRtl
          ? (spec.is_active ? 'تم إلغاء تفعيل التخصص الطبي' : 'تم تفعيل التخصص الطبي')
          : (spec.is_active ? 'Specialty deactivated' : 'Specialty activated'),
      });
      fetchSpecialties();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر تغيير حالة التخصص' : 'Failed to update status'),
      });
    }
  };

  const handleDeleteSpecialty = async (spec: AdminMasterSpecialtyItem) => {
    const confirmMsg = isRtl
      ? `هل أنت متأكد من حذف التخصص "${spec.code} - ${spec.name_ar}"؟ لا يمكن حذف التخصصات المرتبطة بأطباء.`
      : `Are you sure you want to delete specialty "${spec.code} - ${spec.name_en}"? Referenced specialties cannot be deleted.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.deleteMasterSpecialty(spec.id);
      setFeedback({
        type: 'success',
        message: isRtl ? 'تم حذف التخصص بنجاح' : 'Specialty deleted successfully',
      });
      fetchSpecialties();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر حذف التخصص' : 'Failed to delete specialty'),
      });
    }
  };

  // -------------------------------------------------------------
  // Wilaya Actions
  // -------------------------------------------------------------
  const handleOpenCreateWilaya = () => {
    setEditingWilaya(null);
    setWilayaForm({
      code: '',
      name_ar: '',
      name_fr: '',
      name_en: '',
      is_active: true,
      display_order: wilayas.length + 1,
    });
    setIsWilayaModalOpen(true);
  };

  const handleOpenEditWilaya = (w: AdminMasterWilayaItem) => {
    setEditingWilaya(w);
    setWilayaForm({
      code: w.code,
      name_ar: w.name_ar,
      name_fr: w.name_fr,
      name_en: w.name_en,
      is_active: w.is_active,
      display_order: w.display_order,
    });
    setIsWilayaModalOpen(true);
  };

  const handleSaveWilaya = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingWilaya) {
        await adminService.updateMasterWilaya(editingWilaya.id, wilayaForm);
        setFeedback({
          type: 'success',
          message: isRtl ? 'تم تحديث بيانات الولاية بنجاح' : 'Wilaya updated successfully',
        });
      } else {
        await adminService.createMasterWilaya(wilayaForm);
        setFeedback({
          type: 'success',
          message: isRtl ? 'تم إنشاء الولاية بنجاح' : 'Wilaya created successfully',
        });
      }
      setIsWilayaModalOpen(false);
      fetchWilayas();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'حدث خطأ أثناء حفظ بيانات الولاية' : 'Error saving wilaya'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWilayaStatus = async (w: AdminMasterWilayaItem) => {
    try {
      await adminService.toggleMasterWilayaStatus(w.id, !w.is_active);
      setFeedback({
        type: 'success',
        message: isRtl
          ? (w.is_active ? 'تم إلغاء تفعيل الولاية' : 'تم تفعيل الولاية')
          : (w.is_active ? 'Wilaya deactivated' : 'Wilaya activated'),
      });
      fetchWilayas();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر تغيير حالة الولاية' : 'Failed to update status'),
      });
    }
  };

  const handleDeleteWilaya = async (w: AdminMasterWilayaItem) => {
    const confirmMsg = isRtl
      ? `هل أنت متأكد من حذف الولاية "${w.code} - ${w.name_ar}"؟ لا يمكن حذف الولايات المرتبطة بسجلات في النظام.`
      : `Are you sure you want to delete wilaya "${w.code} - ${w.name_en}"? Referenced wilayas cannot be deleted.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.deleteMasterWilaya(w.id);
      setFeedback({
        type: 'success',
        message: isRtl ? 'تم حذف الولاية بنجاح' : 'Wilaya deleted successfully',
      });
      fetchWilayas();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر حذف الولاية' : 'Failed to delete wilaya'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            <span>{isRtl ? 'إدارة البيانات المرجعية (Master Data)' : 'Master Data Administration'}</span>
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {isRtl 
              ? 'التحكم المركزي في التخصصات الطبية والولايات والتقسيم الإداري الوطني'
              : 'Central management of canonical Medical Specialties, Wilayas, and territorial master data'}
          </p>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setSubTab('specialties')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'specialties'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isRtl ? 'التخصصات الطبية' : 'Medical Specialties'}</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-bold">
              {specialties.length}
            </span>
          </button>
          <button
            onClick={() => setSubTab('wilayas')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              subTab === 'wilayas'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{isRtl ? 'الولايات' : 'Wilayas'}</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-bold">
              {wilayas.length}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-black ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION: MEDICAL SPECIALTIES                                    */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'specialties' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSpecialtySearchSubmit} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isRtl ? 'بحث بالرمز، الاسم بالعربية، الفرنسية أو الإنجليزية...' : 'Search by code, Arabic, French, or English name...'}
                  value={specialtySearch}
                  onChange={(e) => setSpecialtySearch(e.target.value)}
                  className="w-full ps-9 pe-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="rounded-xl shrink-0 font-black">
                {isRtl ? 'بحث' : 'Search'}
              </Button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Filter */}
              <select
                value={specialtyStatusFilter}
                onChange={(e) => setSpecialtyStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{isRtl ? 'النشطة فقط' : 'Active Only'}</option>
                <option value="inactive">{isRtl ? 'غير النشطة فقط' : 'Inactive Only'}</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchSpecialties}
                disabled={isLoadingSpecialties}
                className="rounded-xl font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSpecialties ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={handleOpenCreateSpecialty}
                size="sm"
                className="rounded-xl font-black flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'إضافة تخصص جديد' : 'New Specialty'}</span>
              </Button>
            </div>
          </div>

          {/* Specialties Table */}
          <Card padding="none" className="overflow-hidden border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                  <tr>
                    <th className="py-3 px-4 text-start">#</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الرمز المرجعي' : 'Code'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (فرنسي)' : 'French Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (إنجليزي)' : 'English Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الترتيب' : 'Order'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {isLoadingSpecialties ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>{isRtl ? 'جاري تحميل التخصصات الطبية...' : 'Loading medical specialties...'}</span>
                      </td>
                    </tr>
                  ) : specialties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        <span>{isRtl ? 'لا توجد نتائج مطابقة' : 'No specialties found'}</span>
                      </td>
                    </tr>
                  ) : (
                    specialties.map((spec, idx) => (
                      <tr key={spec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-black border border-slate-200">
                            {spec.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-black">{spec.name_ar}</td>
                        <td className="py-3 px-4 text-slate-700">{spec.name_fr}</td>
                        <td className="py-3 px-4 text-slate-700">{spec.name_en}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{spec.display_order}</td>
                        <td className="py-3 px-4">
                          {spec.is_active ? (
                            <Badge variant="success" className="text-[10px] font-black">
                              {isRtl ? 'نشط' : 'Active'}
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] font-black bg-slate-200 text-slate-600">
                              {isRtl ? 'غير نشط' : 'Inactive'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleSpecialtyStatus(spec)}
                              title={spec.is_active ? (isRtl ? 'إلغاء التفعيل' : 'Deactivate') : (isRtl ? 'تفعيل' : 'Activate')}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                spec.is_active
                                  ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditSpecialty(spec)}
                              title={isRtl ? 'تعديل' : 'Edit'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSpecialty(spec)}
                              title={isRtl ? 'حذف' : 'Delete'}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION: WILAYAS                                                */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'wilayas' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleWilayaSearchSubmit} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isRtl ? 'بحث برقم الولاية أو اسمها...' : 'Search by wilaya code or name...'}
                  value={wilayaSearch}
                  onChange={(e) => setWilayaSearch(e.target.value)}
                  className="w-full ps-9 pe-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="rounded-xl shrink-0 font-black">
                {isRtl ? 'بحث' : 'Search'}
              </Button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={wilayaStatusFilter}
                onChange={(e) => setWilayaStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{isRtl ? 'النشطة فقط' : 'Active Only'}</option>
                <option value="inactive">{isRtl ? 'غير النشطة فقط' : 'Inactive Only'}</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchWilayas}
                disabled={isLoadingWilayas}
                className="rounded-xl font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWilayas ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={handleOpenCreateWilaya}
                size="sm"
                className="rounded-xl font-black flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'إضافة ولاية' : 'New Wilaya'}</span>
              </Button>
            </div>
          </div>

          {/* Wilayas Table */}
          <Card padding="none" className="overflow-hidden border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'رقم الولاية' : 'Code'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (فرنسي)' : 'French Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الاسم (إنجليزي)' : 'English Name'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الترتيب' : 'Order'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {isLoadingWilayas ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>{isRtl ? 'جاري تحميل الولايات...' : 'Loading wilayas...'}</span>
                      </td>
                    </tr>
                  ) : wilayas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        <span>{isRtl ? 'لا توجد نتائج مطابقة' : 'No wilayas found'}</span>
                      </td>
                    </tr>
                  ) : (
                    wilayas.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded-md text-[11px] font-black border border-slate-200">
                            {w.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-black">{w.name_ar}</td>
                        <td className="py-3 px-4 text-slate-700">{w.name_fr}</td>
                        <td className="py-3 px-4 text-slate-700">{w.name_en}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{w.display_order}</td>
                        <td className="py-3 px-4">
                          {w.is_active ? (
                            <Badge variant="success" className="text-[10px] font-black">
                              {isRtl ? 'نشطة' : 'Active'}
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] font-black bg-slate-200 text-slate-600">
                              {isRtl ? 'غير نشطة' : 'Inactive'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleWilayaStatus(w)}
                              title={w.is_active ? (isRtl ? 'إلغاء التفعيل' : 'Deactivate') : (isRtl ? 'تفعيل' : 'Activate')}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                w.is_active
                                  ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditWilaya(w)}
                              title={isRtl ? 'تعديل' : 'Edit'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWilaya(w)}
                              title={isRtl ? 'حذف' : 'Delete'}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT SPECIALTY                                */}
      {/* ------------------------------------------------------------- */}
      {isSpecialtyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                <span>
                  {editingSpecialty
                    ? (isRtl ? `تعديل التخصص: ${editingSpecialty.code}` : `Edit Specialty: ${editingSpecialty.code}`)
                    : (isRtl ? 'إضافة تخصص طبي جديد' : 'Add New Medical Specialty')}
                </span>
              </h3>
              <button
                onClick={() => setIsSpecialtyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecialty} className="space-y-4 text-xs font-bold text-slate-700">
              {/* Code */}
              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500 uppercase">
                  {isRtl ? 'الرمز المرجعي الفريد (Code)' : 'Canonical Code (Unique)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CARD, NEUR, PED"
                  value={specialtyForm.code}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, code: e.target.value.toUpperCase() })}
                  disabled={!!editingSpecialty}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-black disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Names */}
              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة العربية' : 'Arabic Denomination'}
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  placeholder="مثال: أمراض القلب والشرايين"
                  value={specialtyForm.name_ar}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, name_ar: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة الفرنسية' : 'French Denomination'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cardiologie"
                  value={specialtyForm.name_fr}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, name_fr: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة الإنجليزية' : 'English Denomination'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cardiology"
                  value={specialtyForm.name_en}
                  onChange={(e) => setSpecialtyForm({ ...specialtyForm, name_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[11px] font-black text-slate-500">
                    {isRtl ? 'ترتيب العرض' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={specialtyForm.display_order}
                    onChange={(e) => setSpecialtyForm({ ...specialtyForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="spec_is_active"
                    checked={specialtyForm.is_active}
                    onChange={(e) => setSpecialtyForm({ ...specialtyForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary rounded-sm border-slate-300 focus:ring-primary"
                  />
                  <label htmlFor="spec_is_active" className="text-xs font-black text-slate-800 cursor-pointer">
                    {isRtl ? 'تخصص نشط ومتاح' : 'Active Specialty'}
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSpecialtyModalOpen(false)}
                  className="rounded-xl"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl font-black"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{editingSpecialty ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إنشاء التخصص' : 'Create Specialty')}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT WILAYA                                   */}
      {/* ------------------------------------------------------------- */}
      {isWilayaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>
                  {editingWilaya
                    ? (isRtl ? `تعديل الولاية: ${editingWilaya.code}` : `Edit Wilaya: ${editingWilaya.code}`)
                    : (isRtl ? 'إضافة ولاية جديدة' : 'Add New Wilaya')}
                </span>
              </h3>
              <button
                onClick={() => setIsWilayaModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWilaya} className="space-y-4 text-xs font-bold text-slate-700">
              {/* Code */}
              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500 uppercase">
                  {isRtl ? 'رقم الولاية (Code)' : 'Wilaya Code'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 16, 31, 09"
                  value={wilayaForm.code}
                  onChange={(e) => setWilayaForm({ ...wilayaForm, code: e.target.value })}
                  disabled={!!editingWilaya}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-black disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Names */}
              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة العربية' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  placeholder="مثال: الجزائر العاصمة"
                  value={wilayaForm.name_ar}
                  onChange={(e) => setWilayaForm({ ...wilayaForm, name_ar: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة الفرنسية' : 'French Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alger"
                  value={wilayaForm.name_fr}
                  onChange={(e) => setWilayaForm({ ...wilayaForm, name_fr: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-black text-slate-500">
                  {isRtl ? 'الاسم باللغة الإنجليزية' : 'English Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Algiers"
                  value={wilayaForm.name_en}
                  onChange={(e) => setWilayaForm({ ...wilayaForm, name_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[11px] font-black text-slate-500">
                    {isRtl ? 'ترتيب العرض' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wilayaForm.display_order}
                    onChange={(e) => setWilayaForm({ ...wilayaForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="wilaya_is_active"
                    checked={wilayaForm.is_active}
                    onChange={(e) => setWilayaForm({ ...wilayaForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary rounded-sm border-slate-300 focus:ring-primary"
                  />
                  <label htmlFor="wilaya_is_active" className="text-xs font-black text-slate-800 cursor-pointer">
                    {isRtl ? 'ولاية نشطة' : 'Active Wilaya'}
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWilayaModalOpen(false)}
                  className="rounded-xl"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl font-black"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{editingWilaya ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إنشاء الولاية' : 'Create Wilaya')}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
