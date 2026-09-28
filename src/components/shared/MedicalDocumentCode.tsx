import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MedicalDocumentCodeProps {
  documentId: string;
  secureToken?: string;
  documentType: 'prescription' | 'laboratory' | 'radiology' | 'LAB_ORDER' | 'LAB_RESULT' | 'RAD_ORDER' | 'RAD_RESULT' | 'ADMIN_REPORT' | 'ASSISTANT_REPORT';
  patientName?: string;
  locale?: string;
  isDarkMode?: boolean;
  showVerificationBadge?: boolean;
}

export const MedicalDocumentCode: React.FC<MedicalDocumentCodeProps> = ({
  documentId,
  secureToken,
  documentType,
  patientName,
  locale = 'ar',
  isDarkMode = false,
  showVerificationBadge = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(documentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLabel = () => {
    switch (documentType) {
      case 'prescription': return 'رقم الوصفة (Prescription ID)';
      case 'laboratory': 
      case 'LAB_ORDER': return 'رقم طلب المختبر (Lab Order ID)';
      case 'LAB_RESULT': return 'رقم نتيجة المختبر (Lab Result ID)';
      case 'radiology':
      case 'RAD_ORDER': return 'رقم طلب الأشعة (Radiology Order ID)';
      case 'RAD_RESULT': return 'رقم تقرير الأشعة (Radiology Report ID)';
      case 'ADMIN_REPORT': return 'رقم تقرير الإدارة (Admin Report ID)';
      case 'ASSISTANT_REPORT': return 'رقم تقرير المساعد (Assistant Report ID)';
      default: return 'رقم الوثيقة';
    }
  };

  const getAriaLabel = () => {
    return `رمز تعريف ${getLabel()} ${documentId}`;
  };

  const getAppOrigin = (): string => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) {
      return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  };

  const tokenToUse = secureToken || documentId;
  const isDiagnostic = ['laboratory', 'LAB_ORDER', 'LAB_RESULT', 'radiology', 'RAD_ORDER', 'RAD_RESULT'].includes(documentType);
  const qrValue = isDiagnostic
    ? `${getAppOrigin()}/${locale}/diagnostic/order/${tokenToUse}`
    : `${getAppOrigin()}/${locale}/verify/${tokenToUse}`;

  return (
    <div className={`flex flex-col items-center sm:items-start gap-4 p-4 rounded-2xl border ${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-slate-50 border-slate-200'
    } print:border-none print:bg-white print:p-0`}>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        {/* QR Code Container */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <QRCode
            value={qrValue}
            size={200}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
            aria-label={getAriaLabel()}
          />
        </div>

        {/* Document Info */}
        <div className="flex-1 space-y-2 text-center sm:text-right w-full">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{getLabel()}</span>
            {showVerificationBadge && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                <Check className="w-2.5 h-2.5" />
                <span>Reference ID</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className={`text-xl font-mono font-bold tracking-tighter ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {documentId}
            </h3>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-teal-600 print:hidden"
              title="نسخ الرقم المرجعي"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px] mx-auto sm:mx-0">
            هذا الرمز مخصص للتحقق الرقمي من الوثيقة عبر شبكة عافية. لا يحتوي الرمز على بيانات طبية حساسة.
          </p>
        </div>
      </div>

      {/* Verification Hint */}
      <div className={`w-full pt-3 border-t flex items-center justify-center sm:justify-start gap-2 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      } print:hidden`}>
        <Info className="w-3 h-3 text-slate-400" />
        <span className="text-[9px] text-slate-400 font-medium">
          يمكن قراءة هذا الرمز من قبل الصيدلية أو المختبر لتأكيد الطلب.
        </span>
      </div>
    </div>
  );
};
