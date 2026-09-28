import React, { useState } from 'react';
import { LABORATORY_FAVORITE_PANELS } from '../../../data/doctorDashboardData';
import {
  FlaskConical,
  Plus,
  Bookmark,
  Printer,
  Sparkles,
  Trash2,
  Edit2,
  Eye,
  Info,
  Beaker,
  AlertCircle,
  Search
} from 'lucide-react';
import { EngineHeader } from '../shared/EngineHeader';
import { TemplateSection } from '../shared/TemplateSection';
import { OrderPreviewModal } from '../shared/OrderPreviewModal';

interface LabOrdersTabProps {
  patientName?: string;
  patientType?: 'registered' | 'guest';
  isDarkMode?: boolean;
}

import { useTranslations, useLocale } from 'next-intl';

interface LabTest {
  id: string;
  code: string;
  name: string;
  sampleType: string;
  urgency: string;
  instructions: string;
  notes: string;
}

export const LabOrdersTab: React.FC<LabOrdersTabProps> = ({
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

  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const applyTemplate = (panelId: string) => {
    const panel = LABORATORY_FAVORITE_PANELS.find(p => p.id === panelId);
    if (panel) {
      const newTest: LabTest = {
        id: Math.random().toString(36).substr(2, 9),
        code: panel.id.toUpperCase(),
        name: panel.name,
        sampleType: t('mockData.multiSample'),
        urgency: t('priority.routine'),
        instructions: t('mockData.protocolInstructions'),
        notes: `${t('mockData.addedFromTemplate')} ${panel.name}`
      };
      setSelectedTests(prev => [...prev, newTest]);
    }
  };

  const removeTest = (index: number) => {
    if (confirm(t('modal.deleteConfirm'))) {
      setSelectedTests((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const previewItems = selectedTests.map(item => ({
    name: item.name,
    details: item.instructions || t('mockData.noInstructions'),
    subDetails: item.urgency
  }));

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Engine Header v1.0 */}
      <EngineHeader 
        engineName={t('labTitle')}
        engineSubtitle={t('labSubtitle')}
        patientName={patientName}
        patientType={patientType}
        icon={FlaskConical}
        iconBgColor="bg-purple-600"
        badgeText={t('badgeText')}
        badgeColor={isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'}
        isDarkMode={isDarkMode}
        onAction={() => setIsPreviewOpen(true)}
        actionText={t('table.actions')}
        actionIcon={Eye}
      />

      {/* Templates Section v1.0 */}
      <TemplateSection 
        title={t('templateTitle')}
        subtitle={t('templateSubtitle')}
        templates={LABORATORY_FAVORITE_PANELS.map(p => ({
          id: p.id,
          name: p.name,
          badge: p.badge,
          itemCount: p.testsCount
        }))}
        onApply={applyTemplate}
        isDarkMode={isDarkMode}
        accentColor="text-purple-700"
        icon={Plus}
      />

      {/* Active Requisition Table v1.0 */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-purple-600" />
            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('activeLabTitle')}</span>
          </div>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addLab')}</span>
          </button>
        </div>

        {selectedTests.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <FlaskConical className="w-8 h-8" />
             </div>
             <div className="max-w-xs">
                <h4 className="text-sm font-bold text-slate-400">{t('emptyLabTitle')}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{t('emptyLabDesc')}</p>
             </div>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
                <tr>
                  <th className="p-3">{t('table.testName')}</th>
                  <th className="p-3">{t('table.category')}</th>
                  <th className="p-3">{t('table.priority')}</th>
                  <th className="p-3">{t('table.instructions')}</th>
                  <th className="p-3 text-center">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                {selectedTests.map((test, i) => (
                  <tr key={test.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className="p-3">
                      <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{test.code}</div>
                    </td>
                    <td className="p-3">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                          {test.sampleType}
                       </span>
                    </td>
                    <td className="p-3">
                       <span className={`font-bold ${test.urgency === t('priority.stat') ? 'text-rose-600' : 'text-blue-600'}`}>
                          {test.urgency}
                       </span>
                    </td>
                    <td className="p-3">
                       <p className={`line-clamp-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} title={test.instructions}>
                          {test.instructions || '---'}
                       </p>
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
                          onClick={() => removeTest(i)}
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
        
        {selectedTests.length > 0 && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-[10px] text-amber-800 leading-relaxed font-bold">
                {t('labNotice')}
             </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <OrderPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={t('previewTitle')}
        subtitle={t('labPreviewSubtitle')}
        patientName={patientName}
        orderNumber={`LAB-2026-${Math.floor(1000 + Math.random() * 9000)}`}
        date="05 أوت 2026"
        items={previewItems}
        accentColor="bg-purple-600"
        documentType="laboratory"
      />

      {/* Add/Edit Mock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
             <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900">{editingIndex !== null ? t('modal.editLabTitle') : t('modal.addLabTitle')}</h3>
                <button onClick={() => { setIsAddModalOpen(false); setEditingIndex(null); }} className={`text-slate-400 hover:text-slate-600 ${isRtl ? 'mr-auto' : 'ml-auto'}`}><Plus className="w-5 h-5 rotate-45" /></button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.testNameLabel')}</label>
                   <div className="relative">
                      <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-slate-400`} />
                      <input 
                        type="text" 
                        placeholder={t('modal.searchPlaceholder') || "ابحث عن تحليل..."} 
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs focus:ring-2 focus:ring-purple-500 outline-none`}
                        defaultValue={editingIndex !== null ? selectedTests[editingIndex].name : ''}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('table.category')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                         <option>Blood / EDTA</option>
                         <option>Urine / Mid-stream</option>
                         <option>Stool</option>
                         <option>Swab</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('table.priority')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                         <option>{t('priority.routine')}</option>
                         <option>{t('priority.urgent')}</option>
                         <option>{t('priority.stat')}</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.instructionsLabel')}</label>
                   <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs h-20 outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={t('modal.instructionsPlaceholder') || "تعليمات للمختبر..."}
                      defaultValue={editingIndex !== null ? selectedTests[editingIndex].instructions : ''}
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
                   className="flex-1 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20"
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
