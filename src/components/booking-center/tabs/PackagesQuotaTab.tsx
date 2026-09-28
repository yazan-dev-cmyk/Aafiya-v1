import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PackageDetails, AuditLogEntry, SystemNotification } from '../../../types';
import { bookingCenterService } from '@/services/bookingCenterService';
import {
  Package,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Upload,
  CreditCard,
  Building,
  FileText,
  X,
  Check,
  Eye,
  Info,
  History
} from 'lucide-react';

interface PackageOption {
  id: string;
  name: string;
  quota: number;
  priceDzd: number;
  validityMonths: number;
  tag?: string;
  description: string;
}

interface PurchaseRequest {
  id: string;
  refNumber: string;
  packageId: string;
  packageName: string;
  quota: number;
  priceDzd: number;
  paymentMethod: 'baridimob' | 'bank_transfer';
  transactionRef: string;
  receiptFileName: string;
  requestDate: string;
  status: 'pending_review' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvalDate?: string;
}

interface PackagesQuotaTabProps {
  packageDetails: PackageDetails;
  onUpdatePackageDetails?: (updated: PackageDetails) => void;
  onAddAuditLog?: (entry: AuditLogEntry) => void;
  onAddNotification?: (notif: SystemNotification) => void;
}

export const PackagesQuotaTab: React.FC<PackagesQuotaTabProps> = ({
  packageDetails,
  onUpdatePackageDetails,
  onAddAuditLog,
  onAddNotification
}) => {
  const t = useTranslations('bookingCenter.packages');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [availablePackages, setAvailablePackages] = useState<PackageOption[]>([
    {
      id: 'pkg-500',
      name: isRtl ? 'باقة 500 موعد' : '500 Slots Package',
      quota: 500,
      priceDzd: 25000,
      validityMonths: 6,
      description: isRtl ? 'باقة حجز اعتيادية للمراكز المتوسطة' : 'Standard booking package'
    }
  ]);

  // Load real packages from API
  useEffect(() => {
    const fetchLivePackages = async () => {
      try {
        const res = await bookingCenterService.getPackages();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: PackageOption[] = res.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            quota: p.quota_units || p.quota || 100,
            priceDzd: p.price_dzd || p.price || 5000,
            validityMonths: 12,
            description: p.description || '',
            tag: p.quota_units >= 500 ? (isRtl ? 'الأكثر طلباً' : 'Popular') : undefined,
          }));
          setAvailablePackages(mapped);
          setSelectedPackage(mapped[0]);
        }
      } catch (e) {
        console.warn('Live packages fetch failed in booking center:', e);
      }
    };
    fetchLivePackages();
  }, [isRtl]);

  // Step Wizard Modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Wizard Data State
  const [selectedPackage, setSelectedPackage] = useState<PackageOption>(availablePackages[0]);
  const [paymentMethod, setPaymentMethod] = useState<'baridimob' | 'bank_transfer'>('baridimob');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [additionalNote, setAdditionalNote] = useState<string>('');

  // Purchase Requests Audit History
  const [requestsHistory, setRequestsHistory] = useState<PurchaseRequest[]>([]);

  // Selected request preview modal
  const [viewingRequest, setViewingRequest] = useState<PurchaseRequest | null>(null);

  // Load real purchase requests and quota balance from API
  const fetchRequestsAndBalance = async () => {
    setIsLoadingRequests(true);
    try {
      // 1. Fetch Requests
      const res = await bookingCenterService.getPurchaseRequests();
      if (res.data && Array.isArray(res.data)) {
        const mapped: PurchaseRequest[] = res.data.map((r: any) => ({
          id: r.id,
          refNumber: r.request_reference,
          packageId: r.booking_package_id,
          packageName: r.package_name,
          quota: r.quota_units,
          priceDzd: Number(r.price_dzd) || 0,
          paymentMethod: r.payment_method === 'bank_transfer' ? 'bank_transfer' : 'baridimob',
          transactionRef: r.transaction_reference || '--',
          receiptFileName: r.receipt_document_path || 'receipt_document.pdf',
          requestDate: r.created_at ? r.created_at.substring(0, 16).replace('T', ' ') : '',
          status: r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending_review',
          rejectionReason: r.rejection_reason,
          approvedBy: r.reviewed_by?.name,
          approvalDate: r.reviewed_at ? r.reviewed_at.substring(0, 16).replace('T', ' ') : undefined,
        }));
        setRequestsHistory(mapped);
      }

      // 2. Fetch Quota Balance
      const balRes = await bookingCenterService.getQuotaBalance();
      if (balRes.data && onUpdatePackageDetails) {
        onUpdatePackageDetails({
          ...packageDetails,
          remainingQuota: balRes.data.quota_balance,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch purchase requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequestsAndBalance();
  }, []);

  const percentageUsed = packageDetails.totalQuota > 0
    ? Math.round((packageDetails.usedQuota / packageDetails.totalQuota) * 100)
    : 0;

  // Submit new purchase request to Backend API (Step 3 -> Step 4)
  const handleSubmitRequest = async () => {
    if (!selectedPackage?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await bookingCenterService.createPurchaseRequest({
        package_id: selectedPackage.id,
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || undefined,
        receipt_document_path: receiptFileName || undefined,
        notes: additionalNote.trim() || undefined,
      });

      if (res.data) {
        // Audit log
        if (onAddAuditLog) {
          onAddAuditLog({
            id: `audit-${Date.now()}`,
            employeeName: t('mockData.manager'),
            action: t('mockData.buyAction'),
            targetRef: res.data.request_reference,
            timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-DZ' : 'en-US'),
            details: t('mockData.buyDetails', {
              name: selectedPackage.name,
              quota: selectedPackage.quota,
              price: selectedPackage.priceDzd.toLocaleString(),
              method: paymentMethod === 'baridimob' ? t('paymentMethods.baridimob') : t('paymentMethods.bankTransfer'),
            }),
            ipAddress: '192.168.1.45',
          });
        }

        // Advance to Confirmation Step & Refresh Requests
        await fetchRequestsAndBalance();
        setCurrentStep(4);
      } else {
        setSubmitError(res.message || 'فشل تقديم طلب الشراء.');
      }
    } catch (err: any) {
      console.error('Error submitting purchase request:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تقديم طلب الشراء.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
              {t('techSpecs')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{t('title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setCurrentStep(1);
            setShowPurchaseModal(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>{t('buyMore')}</span>
        </button>
      </div>

      {/* Main Active Package Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-7 shadow-lg relative overflow-hidden">
        <div className="absolute start-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
          <Package className="w-80 h-80" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('currentApprovedPackage')}
              </span>
              <h3 className="text-2xl font-bold text-white mt-2">{packageDetails.packageName}</h3>
              <p className="text-xs text-slate-300 mt-1">{t('validity', { start: packageDetails.startDate, end: packageDetails.endDate })}</p>
            </div>

            <div className="text-left dir-ltr bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-300 block">{t('availableBalance')}</span>
              <span className="text-4xl font-extrabold text-emerald-400 block mt-0.5">{packageDetails.remainingQuota}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t('ofTotalQuota', { total: packageDetails.totalQuota })}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">{t('usedQuota', { count: packageDetails.usedQuota, percent: percentageUsed })}</span>
              <span className="text-emerald-300">{t('remainingQuota', { count: packageDetails.remainingQuota })}</span>
            </div>
            <div className="w-full bg-slate-700/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-600">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${percentageUsed}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">{t('dailyAvgRate')}</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {packageDetails.dailyAverageRate} <span className="text-xs text-slate-500 font-normal">{t('bookingPerDay')}</span>
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">{t('activityIndicator')}</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">{t('expectedDepletion')}</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {packageDetails.estimatedDaysRemaining} <span className="text-xs text-slate-500 font-normal">{t('workingDays')}</span>
            </span>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">{t('earlyRechargeWarning')}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">{t('projectedDepletionDate')}</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block dir-ltr text-start">
              {packageDetails.projectedDepletionDate}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">{t('algorithmCalculation')}</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION 3.7 - SABA': PURCHASES & ACTIVATION REQUESTS HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>{t('historyTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('historySubtitle')}
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {t('totalRequests', { count: requestsHistory.length })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <th className="p-3">{t('tableColumns.ref')}</th>
                <th className="p-3">{t('tableColumns.packages')}</th>
                <th className="p-3">{t('tableColumns.quota')}</th>
                <th className="p-3">{t('tableColumns.price')}</th>
                <th className="p-3">{t('tableColumns.paymentMethod')}</th>
                <th className="p-3">{t('tableColumns.date')}</th>
                <th className="p-3">{t('tableColumns.status')}</th>
                <th className="p-3 text-center">{t('tableColumns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requestsHistory.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-700">{req.refNumber}</td>
                  <td className="p-3 font-bold text-slate-900">{req.packageName}</td>
                  <td className="p-3 font-semibold text-slate-800">{t('detailsModal.quotaCount', { count: req.quota })}</td>
                  <td className="p-3 font-bold text-emerald-700">{req.priceDzd.toLocaleString()} {t('detailsModal.dzd')}</td>
                  <td className="p-3 font-medium text-slate-700">
                    {req.paymentMethod === 'baridimob' ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <CreditCard className="w-3 h-3" />
                        {t('paymentMethods.baridimob')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <Building className="w-3 h-3" />
                        {t('paymentMethods.bankTransfer')}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-[11px] font-mono">{req.requestDate}</td>
                  <td className="p-3">
                    {req.status === 'pending_review' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                        <Clock className="w-3 h-3 animate-spin" />
                        {t('statuses.pending')}
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('statuses.approved')}
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-300">
                        <AlertTriangle className="w-3 h-3" />
                        {t('statuses.rejected')}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewingRequest(req)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        {t('viewDetails')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST DETAILS MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 text-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {t('detailsModal.title', { ref: viewingRequest.refNumber })}
              </h3>
              <button
                onClick={() => setViewingRequest(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">{t('detailsModal.package')}</span>
                  <strong className="text-slate-900 text-sm block">{viewingRequest.packageName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('detailsModal.quotaCount')}</span>
                  <strong className="text-emerald-700 text-sm block">{t('detailsModal.quotaCount', { count: viewingRequest.quota })}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('detailsModal.totalAmount')}</span>
                  <strong className="text-slate-900 block">{viewingRequest.priceDzd.toLocaleString()} {t('detailsModal.dzd')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('tableColumns.paymentMethod')}:</span>
                  <strong className="text-slate-900 block">
                    {viewingRequest.paymentMethod === 'baridimob' ? t('wizard.baridimobDesc') : t('wizard.bankTransferOfficial')}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
                <span className="text-blue-900 font-bold block">{t('detailsModal.paymentProofData')}</span>
                <p className="text-blue-800">{t('detailsModal.transactionRef')} <strong className="font-mono">{viewingRequest.transactionRef}</strong></p>
                <p className="text-blue-800">{t('detailsModal.receiptFileName')} <strong className="underline">{viewingRequest.receiptFileName}</strong></p>
                <p className="text-blue-800">{t('detailsModal.requestDate')} {viewingRequest.requestDate}</p>
              </div>

              {viewingRequest.status === 'approved' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  <p className="font-bold">{t('detailsModal.activationStatus')}</p>
                  <p className="text-[11px]">{t('detailsModal.approvedBy', { user: viewingRequest.approvedBy || '', date: viewingRequest.approvalDate || '' })}</p>
                </div>
              )}

              {viewingRequest.status === 'rejected' && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 space-y-1">
                  <p className="font-bold">{t('detailsModal.rejectionReasonLabel')}</p>
                  <p className="text-[11px]">{viewingRequest.rejectionReason}</p>
                  <p className="text-[10px] text-rose-600 mt-1">{t('detailsModal.rejectionHint')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingRequest(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                {t('detailsModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3.6 MULTI-STEP PURCHASE WIZARD MODAL */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 text-start relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  {t('wizard.title')}
                </h3>
                <p className="text-xs text-slate-500">{t('wizard.subtitle')}</p>
              </div>

              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, label: t('wizard.steps.1') },
                { step: 2, label: t('wizard.steps.2') },
                { step: 3, label: t('wizard.steps.3') },
                { step: 4, label: t('wizard.steps.4') }
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    currentStep === s.step
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                      : currentStep > s.step
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] block opacity-80">{t('wizard.stepLabel', { step: s.step })}</span>
                  <span className="text-xs">{s.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: PACKAGE SELECTION */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{t('wizard.infoRequirement')}</span>
                </div>

                <div className="space-y-3">
                  {availablePackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {pkg.tag && (
                          <span className="absolute top-3 start-3 bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full">
                            {pkg.tag}
                          </span>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {pkg.name}
                              {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-700">
                              <span className="text-blue-700">{t('wizard.quotaLabel', { count: pkg.quota })}</span>
                              <span className="text-slate-500">{t('wizard.validityMonths', { count: pkg.validityMonths })}</span>
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-lg font-extrabold text-blue-700 block">
                              {pkg.priceDzd.toLocaleString()} {t('detailsModal.dzd')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    {t('wizard.nextPayment')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PAYMENT METHOD SELECTION */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">{t('wizard.choosePayment')}</h4>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('baridimob')}
                    className={`p-4 rounded-2xl border-2 text-start transition-all cursor-pointer ${
                      paymentMethod === 'baridimob'
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-6 h-6 text-amber-600" />
                      {paymentMethod === 'baridimob' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <strong className="text-slate-900 text-sm block">{t('paymentMethods.baridimob')} (BaridiMob)</strong>
                    <span className="text-[11px] text-slate-500 block mt-1">{t('wizard.baridimobDesc')}</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-4 rounded-2xl border-2 text-start transition-all cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Building className="w-6 h-6 text-blue-600" />
                      {paymentMethod === 'bank_transfer' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <strong className="text-slate-900 text-sm block">{t('wizard.bankTransferOfficial')}</strong>
                    <span className="text-[11px] text-slate-500 block mt-1">{t('wizard.bankTransferDesc')}</span>
                  </button>
                </div>

                {/* Account Details Box */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 dir-ltr">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs text-amber-400 font-bold">{t('wizard.paymentAccountInfo')}</span>
                    <span className="text-[10px] text-slate-400">{t('wizard.officialPlatformAdmin')}</span>
                  </div>

                  {paymentMethod === 'baridimob' ? (
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-slate-300"><strong className="text-slate-100">RIP BaridiMob:</strong> 00799999002348102934</p>
                      <p className="text-slate-300"><strong className="text-slate-100">Beneficiary:</strong> SPA AAFIYA PLATFORMS ALGERIA</p>
                      <p className="text-slate-300"><strong className="text-slate-100">CCP Account:</strong> 2348102 Key 94</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-slate-300"><strong className="text-slate-100">Bank Name:</strong> Banque Nationale d&apos;Algérie (BNA) - Agence Didouche</p>
                      <p className="text-slate-300"><strong className="text-slate-100">RIB:</strong> 0010061203000492019482</p>
                      <p className="text-slate-300"><strong className="text-slate-100">Beneficiary:</strong> SPA AAFIYA PLATFORMS ALGERIA</p>
                    </div>
                  )}

                  <div className={`pt-1 text-[11px] text-emerald-400 border-t border-slate-800 font-sans ${isRtl ? 'dir-rtl text-start' : 'dir-ltr text-end'}`}>
                    {t('wizard.amountToTransfer')} <strong className="text-white">{selectedPackage.priceDzd.toLocaleString()} {t('detailsModal.dzd')}</strong>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {t('wizard.back')}
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    {t('wizard.nextUpload')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: UPLOAD PAYMENT RECEIPT */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">{t('wizard.step3Title')}</h4>

                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50 cursor-pointer">
                  <Upload className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">{t('wizard.dragDrop')}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{t('wizard.acceptedFormats')}</p>
                  
                  <div className="mt-3 inline-block">
                    <input
                      type="file"
                      id="receipt-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReceiptFile(e.target.files[0]);
                          setReceiptFileName(e.target.files[0].name);
                        }
                      }}
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs hover:bg-slate-100"
                    >
                      {t('wizard.browseFiles')}
                    </label>
                  </div>

                  {receiptFileName && (
                    <p className="text-xs text-emerald-700 font-bold mt-3 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('wizard.attachedFile', { name: receiptFileName || '' })}
                    </p>
                  )}
                </div>

                {/* Reference ID input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">{t('wizard.transactionRefLabel')}</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={t('wizard.transactionRefPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">{t('wizard.additionalNotesLabel')}</label>
                  <textarea
                    rows={2}
                    value={additionalNote}
                    onChange={(e) => setAdditionalNote(e.target.value)}
                    placeholder={t('wizard.additionalNotesPlaceholder')}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    {t('wizard.back')}
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جاري إرسال الطلب...' : 'Submitting Request...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('wizard.confirmAndSend')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMATION & REVIEW STATUS */}
            {currentStep === 4 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-900">{t('wizard.successTitle')}</h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                    {t('statuses.pending')}: <strong className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{t('wizard.pendingReviewStep')}</strong>
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-start max-w-md mx-auto space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('wizard.requestedPackage')}</span>
                    <strong className="text-slate-900">{selectedPackage.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('tableColumns.quota')}:</span>
                    <strong className="text-blue-700">{t('detailsModal.quotaCount', { count: selectedPackage.quota })}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('detailsModal.totalAmount')}</span>
                    <strong className="text-emerald-700">{selectedPackage.priceDzd.toLocaleString()} {t('detailsModal.dzd')}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">{t('detailsModal.transactionRef')}</span>
                    <strong className="font-mono text-slate-800">{transactionRef}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  {t('wizard.successNote')}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    {t('wizard.backToDashboard')}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

