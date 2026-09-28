import React, { useState } from 'react';
import { PRESCRIPTION_TEMPLATES } from '../../../data/doctorDashboardData';
import {
  FileText,
  Plus,
  Star,
  Printer,
  Copy,
  Trash2,
  CheckCircle2,
  Bookmark,
  Sparkles,
  Search,
  Check,
  Edit2,
  Eye,
  AlertCircle,
  Pill
} from 'lucide-react';
import { EngineHeader } from '../shared/EngineHeader';
import { TemplateSection } from '../shared/TemplateSection';
import { OrderPreviewModal } from '../shared/OrderPreviewModal';

import { useTranslations, useLocale } from 'next-intl';

interface Medication {
  id?: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface EPrescriptionsTabProps {
  patientName?: string;
  patientType?: 'registered' | 'guest';
  isDarkMode?: boolean;
}

export const EPrescriptionsTab: React.FC<EPrescriptionsTabProps> = ({
  patientName = '',
  patientType = 'registered',
  isDarkMode = false
}) => {
  const t = useTranslations('doctor.prescriptions');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const containerClass = isDarkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200/80 text-slate-900 shadow-xs";

  const [rxList, setRxList] = useState<Medication[]>([]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  const applyTemplate = (tplId: string) => {
    const tpl = PRESCRIPTION_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      // Create new medication objects with unique IDs to allow independent editing
      const newMeds = tpl.medications.map(m => ({
        ...m,
        id: Math.random().toString(36).substr(2, 9)
      }));
      setRxList(prev => [...prev, ...newMeds]);
      setAppliedTemplate(tpl.templateName);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setAppliedTemplate(null), 3000);
    }
  };

  const removeMedication = (index: number) => {
    if (confirm(t('modal.deleteConfirm'))) {
      setRxList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const previewItems = rxList.map(m => ({
    name: m.drugName,
    details: `${m.dosage} - ${m.frequency} - ${m.duration} (${m.instructions})`,
    subDetails: m.duration
  }));

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Engine Header v1.0 */}
      <EngineHeader 
        engineName={t('engineName')}
        engineSubtitle={t('engineSubtitle')}
        patientName={patientName}
        patientType={patientType}
        icon={FileText}
        iconBgColor="bg-emerald-600"
        badgeText={t('badgeText')}
        badgeColor={isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
        isDarkMode={isDarkMode}
        onAction={() => setIsPreviewOpen(true)}
        actionText={t('actionText')}
        actionIcon={Eye}
      />

      {/* Templates Section v1.0 */}
      <TemplateSection 
        title={t('templateTitle')}
        subtitle={t('templateSubtitle')}
        templates={PRESCRIPTION_TEMPLATES.map(t => ({
          id: t.id,
          name: t.templateName, // Fixed from t.name to t.templateName
          badge: t.category,
          itemCount: t.medications.length
        }))}
        onApply={applyTemplate}
        isDarkMode={isDarkMode}
        accentColor="text-emerald-700"
        icon={Bookmark}
      />

      {/* Active Prescription Table v1.0 */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600" />
            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('activeTableTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            {appliedTemplate && (
              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 animate-pulse">
                {t('appliedTemplate')} {appliedTemplate}
              </span>
            )}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addCustomMed')}</span>
            </button>
          </div>
        </div>

        {rxList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <FileText className="w-8 h-8" />
             </div>
             <div className="max-w-xs">
                <h4 className="text-sm font-bold text-slate-400">{t('emptyStateTitle')}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{t('emptyStateDesc')}</p>
             </div>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className={isDarkMode ? 'bg-slate-950 text-slate-400 font-medium' : 'bg-slate-100 text-slate-600 font-bold'}>
                <tr>
                  <th className="p-3">{t('table.drugName')}</th>
                  <th className="p-3">{t('table.dosage')}</th>
                  <th className="p-3">{t('table.frequency')}</th>
                  <th className="p-3">{t('table.duration')}</th>
                  <th className="p-3">{t('table.instructions')}</th>
                  <th className="p-3 text-center">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                {rxList.map((med, idx) => (
                  <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{med.drugName}</td>
                    <td className="p-3">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {med.dosage}
                       </span>
                    </td>
                    <td className="p-3 font-medium">{med.frequency}</td>
                    <td className="p-3 font-bold text-blue-600">{med.duration}</td>
                    <td className="p-3">
                       <p className={`line-clamp-1 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} title={med.instructions}>
                          {med.instructions || '---'}
                       </p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                             setEditingIndex(idx);
                             setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeMedication(idx)}
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

        {rxList.length > 0 && (
          <div className="flex flex-wrap gap-3">
             <div className={`flex-1 p-3 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-[10px] text-emerald-800 leading-relaxed font-bold">
                   {t('networkNotice')}
                </p>
             </div>
             <button 
                onClick={() => alert(t('modal.saveNewTemplateAlert'))}
                className={`px-4 py-2 rounded-xl border border-dashed flex items-center gap-2 transition-all hover:bg-slate-50 ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500 font-bold text-xs'}`}
             >
                <Star className="w-4 h-4 text-amber-500" />
                <span>{t('saveFavorite')}</span>
             </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <OrderPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={t('previewTitle')}
        subtitle={t('previewSubtitle')}
        patientName={patientName}
        orderNumber={`RX-2026-${Math.floor(1000 + Math.random() * 9000)}`}
        date="05 أوت 2026"
        items={previewItems}
        accentColor="bg-emerald-600"
        documentType="prescription"
      />

      {/* Add/Edit Mock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
             <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900">{editingIndex !== null ? t('modal.editTitle') : t('modal.addTitle')}</h3>
                <button onClick={() => { setIsAddModalOpen(false); setEditingIndex(null); }} className={`text-slate-400 hover:text-slate-600 ${isRtl ? 'mr-auto' : 'ml-auto'}`}><Plus className="w-5 h-5 rotate-45" /></button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.drugNameLabel')}</label>
                   <div className="relative">
                      <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-slate-400`} />
                      <input 
                        type="text" 
                        placeholder={t('modal.searchPlaceholder')} 
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs focus:ring-2 focus:ring-emerald-500 outline-none`}
                        defaultValue={editingIndex !== null ? rxList[editingIndex].drugName : ''}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.dosageLabel')}</label>
                      <input 
                        type="text" 
                        placeholder={t('modal.dosagePlaceholder')} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        defaultValue={editingIndex !== null ? rxList[editingIndex].dosage : ''}
                      />
                   </div>
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.frequencyLabel')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500">
                         <option>{t('frequencies.once')}</option>
                         <option>{t('frequencies.twice')}</option>
                         <option>{t('frequencies.thrice')}</option>
                         <option>{t('frequencies.asNeeded')}</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.durationLabel')}</label>
                      <input 
                        type="text" 
                        placeholder={t('modal.durationPlaceholder')} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        defaultValue={editingIndex !== null ? rxList[editingIndex].duration : ''}
                      />
                   </div>
                   <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.timingLabel')}</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500">
                         <option>{t('timings.before')}</option>
                         <option>{t('timings.during')}</option>
                         <option>{t('timings.after')}</option>
                         <option>{t('timings.any')}</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-[11px] font-bold text-slate-500 block mb-1">{t('modal.instructionsLabel')}</label>
                   <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs h-20 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={t('modal.instructionsPlaceholder')}
                      defaultValue={editingIndex !== null ? rxList[editingIndex].instructions : ''}
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
                      alert(t('modal.mockEditAlert'));
                      setIsAddModalOpen(false); 
                      setEditingIndex(null); 
                   }}
                   className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
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
