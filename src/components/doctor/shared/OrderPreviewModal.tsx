'use client';

import React from 'react';
import { X, Printer, ShieldCheck, Activity } from 'lucide-react';
import { MedicalDocumentCode } from '../../shared/MedicalDocumentCode';
import { useTranslations, useLocale } from 'next-intl';

interface PreviewItem {
  id?: string;
  name: string;
  details: string;
  subDetails?: string;
}

interface OrderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  patientName: string;
  doctorName?: string;
  specialty?: string;
  orderNumber: string;
  secureToken?: string;
  date: string;
  items: PreviewItem[];
  accentColor: string;
  documentType: 'prescription' | 'laboratory' | 'radiology';
}

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  patientName,
  doctorName,
  specialty,
  orderNumber,
  secureToken,
  date,
  items,
  accentColor,
  documentType
}) => {
  const t = useTranslations('doctor.shared');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const displayDoctorName = doctorName || t('defaultDoctorName');
  const displaySpecialty = specialty || t('defaultSpecialty');

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`}>
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className={`p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row' : 'flex-row-reverse text-right'}`}>
            <div className={`text-right ${isRtl ? '' : 'flex flex-col items-end'}`}>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500">{subtitle}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg ${accentColor} text-white flex items-center justify-center`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Modal Content (Print Area) */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Clinic Header (Simulated) */}
          <div className={`flex justify-between items-start border-b-2 border-slate-900 pb-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h4 className="font-black text-xl text-slate-900 font-display">{t('clinicName')}</h4>
              <p className="text-xs text-slate-600 mt-1">{displayDoctorName}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tight">{displaySpecialty}</p>
            </div>
            <div className={`text-left dir-ltr ${isRtl ? '' : 'text-right'}`}>
              <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded">
                {orderNumber}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">{date}</p>
            </div>
          </div>

          {/* Barcode / QR Code Section (Top Position) */}
          <div className="pb-4 border-b border-slate-100">
            <MedicalDocumentCode 
              documentId={orderNumber}
              secureToken={secureToken}
              documentType={documentType}
              showVerificationBadge={true}
            />
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className={`p-3 bg-slate-50 rounded-xl border border-slate-200 ${isRtl ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] text-slate-400 block mb-1">{t('patientNameLabel')}</span>
              <span className="font-bold text-slate-900">{patientName}</span>
            </div>
            <div className={`p-3 bg-slate-50 rounded-xl border border-slate-200 ${isRtl ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] text-slate-400 block mb-1">{t('birthDateLabel')}</span>
              <span className="font-bold text-slate-900">12/05/1978</span>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h5 className={`text-xs font-bold text-slate-800 border-slate-900 pr-2 ${isRtl ? 'border-r-4 text-right' : 'border-l-4 text-left pl-2 pr-0'}`}>
              {t('requiredItems')}
            </h5>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className={`p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm ${isRtl ? 'text-right' : 'text-left'}`}>
                   <div className={`flex items-center justify-between mb-1 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="font-bold text-slate-900">{i + 1}. {item.name}</span>
                      {item.subDetails && (
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                           {item.subDetails}
                        </span>
                      )}
                   </div>
                   <p className="text-[11px] text-slate-600 leading-relaxed italic">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Signature Area */}
          <div className={`pt-10 flex justify-between items-end ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{t('certifiedDocument')}</span>
            </div>
            <div className="text-center w-32">
              <div className="h-px bg-slate-300 mb-2"></div>
              <span className="text-[10px] text-slate-500">{t('doctorSignature')}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (Actions) */}
        <div className={`p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => {
              window.print();
            }}
            className={`px-6 py-2 ${accentColor} text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2`}
          >
            <Printer className="w-4 h-4" />
            <span>{t('approveAndPrint')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
