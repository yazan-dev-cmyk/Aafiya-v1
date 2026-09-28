import React, { useState } from 'react';
import { RADIOLOGY_FAVORITE_STUDIES } from '../../../data/doctorDashboardData';
import {
  Scan,
  Plus,
  Sparkles,
  Printer,
  Trash2,
  Edit2,
  Eye,
  Search,
  Activity,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { EngineHeader } from '../shared/EngineHeader';
import { TemplateSection } from '../shared/TemplateSection';
import { OrderPreviewModal } from '../shared/OrderPreviewModal';

import { useTranslations, useLocale } from 'next-intl';

interface RadiologyOrdersTabProps {
  patientName?: string;
  patientType?: 'registered' | 'guest';
  isDarkMode?: boolean;
}

interface RadiologyStudy {
  id: string;
  code: string;
  name: string;
  modality: string;
  urgency: string;
  reason: string;
  instructions: string;
}

export const RadiologyOrdersTab: React.FC<RadiologyOrdersTabProps> = ({
  patientName = '',
  patientType = 'registered',
  isDarkMode = false
}) => {
  const t = useTranslations('doctor.orders');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const [selectedStudies, setSelectedStudies] = useState<RadiologyStudy[]>([]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const applyTemplate = (tplId: string) => {
    const study = RADIOLOGY_FAVORITE_STUDIES.find(s => s.id === tplId);
    if (study) {
      const newStudy: RadiologyStudy = {
        id: Math.random().toString(36).substr(2, 9),
        code: study.id.toUpperCase(),
        name: study.name,
        modality: study.modality,
        urgency: t('priority.routine'),
        reason: t('mockData.clinicalIndication'),
        instructions: t('mockData.protocolInstructions')
      };
      setSelectedStudies(prev => [...prev, newStudy]);
    }
  };

  const removeStudy = (index: number) => {
    if (confirm(t('modal.deleteConfirm'))) {
      setSelectedStudies((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const previewItems = selectedStudies.map(s => ({
    name: s.name,
    details: s.reason || t('mockData.noReason'),
    subDetails: `${s.modality} - ${s.urgency}`
  }));

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Engine Header v1.0 */}
      <EngineHeader 
        engineName={t('radTitle')}
        engineSubtitle={t('radSubtitle')}
        patientName={patientName}
        patientType={patientType}
        icon={Scan}
        iconBgColor="bg-amber-600"
        badgeText={t('badgeText')}
        badgeColor={isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'}
        isDarkMode={isDarkMode}
        onAction={() => setIsPreviewOpen(true)}
        actionText={t('table.actions')}
        actionIcon={Eye}
      />

      {/* Templates Section v1.0 */}
      <TemplateSection 
        title={t('radTemplateTitle')}
        subtitle={t('radTemplateSubtitle')}
        templates={RADIOLOGY_FAVORITE_STUDIES.map(s => ({
          id: s.id,
          name: s.name,
          badge: s.badge,
          description: s.modality
        }))}
        onApply={applyTemplate}
        isDarkMode={isDarkMode}
        accentColor="text-amber-700"
        icon={Plus}
      />

      {/* Active Requisition Table v1.0 */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" />
            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('activeRadTitle')}</span>
          </div>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addRad')}</span>
          </button>
        </div>

        {selectedStudies.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <Scan className="w-8 h-8" />
             </div>
             <div className="max-w-xs">
                <h4 className="text-sm font-bold text-slate-400">{t('emptyRadTitle')}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{t('emptyRadDesc')}</p>
             </div>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
                <tr>
                  <th className="p-3">{t('table.category')}</th>
                  <th className="p-3">{t('table.testName')}</th>
                  <th className="p-3">{t('table.reason')}</th>
                  <th className="p-3">{t('table.priority')}</th>
                  <th className="p-3 text-center">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                {selectedStudies.map((std, i) => (
                  <tr key={std.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className="p-3">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {std.modality}
                       </span>
                    </td>
                    <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{std.name}</td>
                    <td className="p-3">
                       <p className={`line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} title={std.reason}>
                          {std.reason}
                       </p>
                    </td>
                    <td className="p-3">
                       <span className={`font-bold ${std.urgency === t('priority.stat') ? 'text-rose-600' : 'text-blue-600'}`}>
                          {std.urgency}
                       </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                             setEditingIndex(i);
                             setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeStudy(i)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedStudies.length > 0 && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-[10px] text-amber-800 leading-relaxed font-bold">
                {t('radNotice')}
             </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <OrderPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={t('modal.addRadTitle')}
        subtitle={t('radPreviewSubtitle')}
        patientName={patientName}
        orderNumber={`RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`}
        date="05 أوت 2026"
        items={previewItems}
        accentColor="bg-amber-600"
        documentType="radiology"
      />

      {/* Add/Edit Mock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
             <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900">{editingIndex !== null ? t('modal.editRadTitle') : t('modal.addRadTitle')}</h3>
                <button onClick={() => { setIsAddModalOpen(false); setEditingIndex(null); }} className={`text-slate-400 hover:text-slate-600 ${isRtl ? 'mr-auto' : 'ml-auto'}`}><Plus className="w-5 h-5 rotate-45" /></button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.testNameLabel')}</label>
                   <div className="relative">
                      <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-slate-400`} />
                      <input 
                        type="text" 
                        placeholder={t('modal.searchPlaceholder') || "ابحث عن فحص..."} 
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs focus:ring-2 focus:ring-amber-500 outline-none`}
                        defaultValue={editingIndex !== null ? selectedStudies[editingIndex].name : ''}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.modalityLabel')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500">
                         <option>X-Ray</option>
                         <option>CT Scan</option>
                         <option>MRI</option>
                         <option>Ultrasound</option>
                         <option>Mammography</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('table.priority')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500">
                         <option>{t('priority.routine')}</option>
                         <option>{t('priority.urgent')}</option>
                         <option>{t('priority.stat')}</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.reasonLabel')}</label>
                   <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs h-20 outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={t('modal.reasonPlaceholder')}
                      defaultValue={editingIndex !== null ? selectedStudies[editingIndex].reason : ''}
                   ></textarea>
                </div>
             </div>

             <div className="flex gap-3 pt-2">
                <button 
                   onClick={() => { setIsAddModalOpen(false); setEditingIndex(null); }}
                   className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                   {t('modal.cancel')}
                </button>
                <button 
                   onClick={() => { 
                      alert(t('modal.mockEditAlert') || 'تم حفظ التعديلات بنجاح');
                      setIsAddModalOpen(false); 
                      setEditingIndex(null); 
                   }}
                   className="flex-1 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-500/20"
                >
                   {editingIndex !== null ? t('modal.save') : t('modal.add')}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};
