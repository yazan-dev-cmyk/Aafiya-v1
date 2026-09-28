import React, { useState } from 'react';
import { PatientRecord, PatientType } from '../../../types';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Lock,
  Search,
  Plus,
  Calendar,
  Phone,
  Mail,
  Eye,
  ArrowRight
} from 'lucide-react';

interface PatientsDirectoryTabProps {
  patients: PatientRecord[];
  onOpenNewBooking: () => void;
}

export const PatientsDirectoryTab: React.FC<PatientsDirectoryTabProps> = ({
  patients,
  onOpenNewBooking,
}) => {
  const [activeTab, setActiveTab] = useState<PatientType>('registered');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const perPage = 20;

  const registeredPatients = patients.filter((p) => p.type === 'registered');
  const guestPatients = patients.filter((p) => p.type === 'guest');

  const currentList = activeTab === 'registered' ? registeredPatients : guestPatients;

  const filteredList = currentList.filter(
    (p) =>
      p.fullName.includes(searchQuery) ||
      p.phone.includes(searchQuery) ||
      (p.uuid && p.uuid.includes(searchQuery))
  );

  const totalPages = Math.ceil(filteredList.length / perPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleTabChange = (tab: PatientType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Privacy Wall Security Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl flex-shrink-0 mt-0.5">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>جدار الخصوصية المطلق (Strict Privacy Wall Enforced)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
              HIPAA & GDPR Compliant
            </span>
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            وفقاً لقواعد نظام عافية، يقتصر وصول مركز الحجز على **البيانات التعريفية وتاريخ الحجوزات الإدارية فقط**. يمنع النظام منعاً مطلقاً أي اطلاع على: الملف الطبي، التشخيصات، الوصفات الطبية، نتائج التحاليل، أو التقارير الأشعية.
          </p>
        </div>
      </div>

      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل ودليل المرضى (Patients Directory)</h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتصفح قائمة المرضى المسجلين والزوار الذين تم إجراء حجوزات لصالحهم
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
          <button
            onClick={() => handleTabChange('registered')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'registered'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>المرضى المسجلين ({registeredPatients.length})</span>
          </button>
          <button
            onClick={() => handleTabChange('guest')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'guest'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>المرضى الزوار ({guestPatients.length})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ابحث بالاسم الكامل، رقم الهاتف، أو معرف الملف UUID..."
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Patients Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {paginatedList.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-semibold text-sm">لم يتم العثور على أي مريض بهذه المواصفات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  {activeTab === 'registered' && <th className="px-5 py-3.5">معرف الملف UUID</th>}
                  <th className="px-5 py-3.5">اسم المريض الكامل</th>
                  <th className="px-5 py-3.5">رقم الهاتف</th>
                  <th className="px-5 py-3.5">الولايـــة</th>
                  <th className="px-5 py-3.5">تاريخ آخر زيارة</th>
                  <th className="px-5 py-3.5">آخر طبيب تم الحجز لديه</th>
                  <th className="px-5 py-3.5 text-center">إجمالي الحجوزات</th>
                  <th className="px-5 py-3.5 text-center">الإجراء المتاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {activeTab === 'registered' && (
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">
                        {p.uuid || '—'}
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {p.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dir-ltr text-right font-medium">
                      {p.phone}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {p.wilaya}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dir-ltr text-right">
                      {p.lastVisitDate || 'لا يوجد'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-blue-600">
                      {p.lastDoctorBooked || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {p.totalBookings}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={onOpenNewBooking}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>حجز موعد</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">
                  صفحة {currentPage} من {totalPages}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-700">
                  إجمالي: {filteredList.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    currentPage <= 1
                      ? 'opacity-40 cursor-not-allowed border-slate-300 text-slate-400'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    currentPage >= totalPages
                      ? 'opacity-40 cursor-not-allowed border-slate-300 text-slate-400'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                  }`}
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
