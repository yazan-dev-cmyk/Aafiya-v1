import React, { useState } from 'react';
import { EmployeeRecord, AuditLogEntry } from '../../../types';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Search,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Users
} from 'lucide-react';

interface EmployeesAuditTabProps {
  employees: EmployeeRecord[];
  auditLogs: AuditLogEntry[];
}

export const EmployeesAuditTab: React.FC<EmployeesAuditTabProps> = ({
  employees,
  auditLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'audit'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // New Employee State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'manager' | 'receptionist'>('receptionist');
  const [newEmpPhone, setNewEmpPhone] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.employeeName.includes(searchQuery) ||
      log.action.includes(searchQuery) ||
      log.details.includes(searchQuery) ||
      (log.targetRef && log.targetRef.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      
      {/* Manager Access Restriction Security Note */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold block">صلاحية الوصول مقيدة (Manager Only Access):</span>
          قسم إدارة الموظفين وسجل التدقيق الشامل (Audit Trail) متاح حصرياً للمدير التنفيذي لمركز الحجز لضمان الأمان ومحاسبة الأداء الفردي.
        </div>
      </div>

      {/* Header & Sub-Tabs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">إدارة الموظفين وسجل النشاطات (Employees & Audit Log)</h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حركة موظفي الاستقبال، تتبع إجراءات النظام لحظياً، وإدارة الصلاحيات
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'audit' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل النشاطات (Audit Trail)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('employees')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'employees' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>فريق الموظفين ({employees.length})</span>
            </button>
          </div>

          {activeSubTab === 'employees' && (
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة موظف جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: Audit Log (سجل النشاطات الشامل) */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث باسم الموظف، الإجراء (إنشاء/تعديل/إلغاء)، أو رقم المرجع BK-xxxx..."
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>سجل التدقيق الرقابي التلقائي (System Audit Trail)</span>
              <span className="text-xs font-normal text-slate-500">غير قابل للتعديل أو الحذف</span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">لا توجد سجلات تدقيق حالياً</p>
                <p className="text-slate-400 mt-1">سيتم تسجيل كافة الأنشطة والإجراءات الرقابية فور تنفيذ العمليات.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">التوقيت والتاريخ</th>
                      <th className="px-5 py-3.5">اسم الموظف المنفذ</th>
                      <th className="px-5 py-3.5">نوع الإجراء</th>
                      <th className="px-5 py-3.5">المستهدف / المرجع</th>
                      <th className="px-5 py-3.5">تفاصيل الإجراء</th>
                      <th className="px-5 py-3.5">عنوان IP المحطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-mono dir-ltr text-right">
                          {log.timestamp}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                          {log.employeeName}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600">
                          {log.targetRef || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 max-w-sm">
                          {log.details}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 dir-ltr text-right">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Employees Directory */}
      {activeSubTab === 'employees' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {employees.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">لا يوجد موظفون مسجلون حتى الآن</p>
              <p className="text-slate-400 mt-1">يمكنك إضافة موظف جديد بالنقر على زر إضافة موظف أعلاه.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">اسم الموظف</th>
                    <th className="px-5 py-3.5">الدور والتصنيف</th>
                    <th className="px-5 py-3.5">البريد الإلكتروني</th>
                    <th className="px-5 py-3.5">رقم الهاتف</th>
                    <th className="px-5 py-3.5">تاريخ الانضمام</th>
                    <th className="px-5 py-3.5">إجمالي الحجوزات المنفذة</th>
                    <th className="px-5 py-3.5 text-center">حالة الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {emp.fullName}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {emp.role === 'manager' ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold">
                            مدير تنفيذـي
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            موظف استقبال / حجز
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                        {emp.email}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 dir-ltr text-right">
                        {emp.phone}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dir-ltr text-right">
                        {emp.createdDate}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                        {emp.totalBookingsHandled}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          نشط (Active)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Add Employee */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-right">
            <h3 className="font-bold text-slate-900 text-lg">إضافة موظف استقبال جديد</h3>
            <p className="text-xs text-slate-500">
              سيتم إنشاء حساب موظف برقم سري مؤقت وإرسال بيانات الاعتماد إلى هاتف الموظف:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  placeholder="0661112233"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الصلاحية والتصنيف</label>
                <select
                  value={newEmpRole}
                  onChange={(e: any) => setNewEmpRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="receptionist">موظف حجز واستقبال (Receptionist)</option>
                  <option value="manager">مدير مركز الحجز (Center Manager)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  alert('تمت إضافة الموظف بنجاح وإرسال بيانات تسجيل الدخول إلى هاتفه.');
                  setShowAddEmployeeModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
              >
                تأكيد الإضافة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
