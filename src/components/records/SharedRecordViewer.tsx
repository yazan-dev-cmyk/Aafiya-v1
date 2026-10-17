'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertCircle, 
  Clock, 
  KeyRound, 
  FileText, 
  Activity, 
  HeartPulse, 
  Pill, 
  AlertTriangle, 
  Globe, 
  Calendar, 
  User, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ehrService, SharedPatientMedicalRecord } from '@/services/ehrService';
import { ApiError } from '@/lib/api';

type Locale = 'ar' | 'en' | 'fr';

interface TranslationMap {
  title: string;
  subtitle: string;
  pinPrompt: string;
  pinPlaceholder: string;
  submitButton: string;
  verifying: string;
  remainingAttempts: string;
  missingTokenTitle: string;
  missingTokenDesc: string;
  invalidPin: string;
  lockedTitle: string;
  lockedDesc: string;
  expiredTitle: string;
  expiredDesc: string;
  revokedTitle: string;
  revokedDesc: string;
  notFoundTitle: string;
  notFoundDesc: string;
  rateLimitTitle: string;
  rateLimitDesc: string;
  networkError: string;
  patientInfo: string;
  mrn: string;
  fullName: string;
  gender: string;
  male: string;
  female: string;
  dateOfBirth: string;
  bloodGroup: string;
  allergiesTitle: string;
  noAllergies: string;
  allergen: string;
  severity: string;
  reaction: string;
  chronicConditionsTitle: string;
  noConditions: string;
  conditionName: string;
  icd10: string;
  diagnosedDate: string;
  currentMedicationsTitle: string;
  noMedications: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  metadataTitle: string;
  scope: string;
  allEmrScope: string;
  expiresAt: string;
  accessGrantedAt: string;
  securityNotice: string;
  httpsWarning: string;
}

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  ar: {
    title: 'السجل الطبي الموحد المشفر',
    subtitle: 'بوابة التحقق الآمن والمصادقة برمز الحماية (PIN)',
    pinPrompt: 'يرجى إدخال رمز الحماية PIN للوصول إلى السجل الطبي المشترك',
    pinPlaceholder: 'أدخل رمز PIN (4 إلى 8 أرقام)',
    submitButton: 'فك التشفير وعرض السجل',
    verifying: 'جاري التحقق وفك التشفير...',
    remainingAttempts: 'المحاولات المتبقية: {count}',
    missingTokenTitle: 'رابط المشاركة غير صالح أو مفقود',
    missingTokenDesc: 'لم يتم العثور على رمز المشاركة في الرابط. يرجى التأكد من فتح الرابط المشفر كاملاً كما استلمته من المريض.',
    invalidPin: 'رمز الحماية PIN غير صحيح.',
    lockedTitle: 'تم قفل الرابط مؤقتاً',
    lockedDesc: 'تم قفل الرابط مؤقتاً لمدة 15 دقيقة بسبب استنفاد محاولات إدخال رمز PIN. يرجى الانتظار والمحاولة لاحقاً.',
    expiredTitle: 'انتهت صلاحية الرابط',
    expiredDesc: 'انتهت صلاحية رابط المشاركة المحدد. يرجى طلب رابط جديد من المريض.',
    revokedTitle: 'تم إلغاء رابط المشاركة',
    revokedDesc: 'تم إلغاء رابط المشاركة من قِبل المريض، ولم يعد صالحاً للاستخدام.',
    notFoundTitle: 'رابط المشاركة غير موجود',
    notFoundDesc: 'رابط المشاركة غير صالح أو غير موجود.',
    rateLimitTitle: 'تم تجاوز المعدل المسموح',
    rateLimitDesc: 'تم تجاوز معدل محاولات التحقق. يرجى الانتظار والمحاولة لاحقاً.',
    networkError: 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
    patientInfo: 'بيانات المريض الأساسية',
    mrn: 'رقم الملف الطبي (MRN)',
    fullName: 'الاسم الكامل',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    dateOfBirth: 'تاريخ الميلاد',
    bloodGroup: 'فصيلة الدم',
    allergiesTitle: 'الحساسية الموثقة سريرياً',
    noAllergies: 'لا توجد حساسيات مسجلة',
    allergen: 'المحسس',
    severity: 'الشدة',
    reaction: 'رد الفعل',
    chronicConditionsTitle: 'الأمراض والحالات المزمنة',
    noConditions: 'لا توجد أمراض مزمنة مسجلة',
    conditionName: 'الحالة / المرض',
    icd10: 'رمز ICD-10',
    diagnosedDate: 'تاريخ التشخيص',
    currentMedicationsTitle: 'الأدوية الحالية',
    noMedications: 'لا توجد أدوية حالية مسجلة',
    medicationName: 'الدواء',
    dosage: 'الجرعة',
    frequency: 'التكرار',
    metadataTitle: 'معلومات ونطاق المشاركة',
    scope: 'النطاق المصرح',
    allEmrScope: 'ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)',
    expiresAt: 'تاريخ انتهاء الصلاحية',
    accessGrantedAt: 'وقت منح الوصول',
    securityNotice: 'تم تطبيق مبدأ تقليل البيانات لحماية الخصوصية: معلومات الاتصال والهوية الوطنية مستبعدة تماماً.',
    httpsWarning: 'تحذير أمني: الاتصال غير مشفر (HTTP). في البيئات غير المحلية يلزم استخدام HTTPS لحماية السجل الطبي.',
  },
  en: {
    title: 'Encrypted Unified Medical Record',
    subtitle: 'Secure Verification & PIN Authentication Gateway',
    pinPrompt: 'Please enter the security PIN to access the shared medical record',
    pinPlaceholder: 'Enter PIN code (4 to 8 digits)',
    submitButton: 'Decrypt & View Record',
    verifying: 'Verifying and decrypting...',
    remainingAttempts: 'Remaining attempts: {count}',
    missingTokenTitle: 'Invalid or Missing Share Link',
    missingTokenDesc: 'No share token was detected in the link. Please ensure you opened the complete encrypted link as provided by the patient.',
    invalidPin: 'Incorrect security PIN.',
    lockedTitle: 'Link Temporarily Locked',
    lockedDesc: 'The link has been temporarily locked for 15 minutes due to consecutive failed attempts. Please try again later.',
    expiredTitle: 'Share Link Expired',
    expiredDesc: 'The validity period for this share link has expired. Please request a new link from the patient.',
    revokedTitle: 'Share Link Revoked',
    revokedDesc: 'The patient has revoked access to this share link, and it is no longer valid.',
    notFoundTitle: 'Share Link Not Found',
    notFoundDesc: 'The share link is invalid or could not be found.',
    rateLimitTitle: 'Rate Limit Exceeded',
    rateLimitDesc: 'Too many verification attempts. Please wait a moment and try again.',
    networkError: 'Connection failed. Please check your internet connection.',
    patientInfo: 'Patient Demographics',
    mrn: 'Medical Record Number (MRN)',
    fullName: 'Full Name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    dateOfBirth: 'Date of Birth',
    bloodGroup: 'Blood Group',
    allergiesTitle: 'Documented Allergies',
    noAllergies: 'No recorded allergies',
    allergen: 'Allergen',
    severity: 'Severity',
    reaction: 'Reaction',
    chronicConditionsTitle: 'Chronic Conditions',
    noConditions: 'No recorded chronic conditions',
    conditionName: 'Condition',
    icd10: 'ICD-10 Code',
    diagnosedDate: 'Diagnosed Date',
    currentMedicationsTitle: 'Current Medications',
    noMedications: 'No recorded current medications',
    medicationName: 'Medication',
    dosage: 'Dosage',
    frequency: 'Frequency',
    metadataTitle: 'Share Metadata & Scope',
    scope: 'Authorized Scope',
    allEmrScope: 'Authorized Unified Medical Record (PII & Contact Info Excluded)',
    expiresAt: 'Expires At',
    accessGrantedAt: 'Access Granted At',
    securityNotice: 'Strict data minimization applied for privacy: contact info and national ID are completely excluded.',
    httpsWarning: 'Security Warning: Insecure connection (HTTP). Non-local environments strictly require HTTPS to safeguard clinical records.',
  },
  fr: {
    title: 'Dossier Médical Unifié Chiffré',
    subtitle: 'Passerelle de Vérification Sécurisée et Authentification PIN',
    pinPrompt: 'Veuillez saisir le code PIN de sécurité pour accéder au dossier médical partagé',
    pinPlaceholder: 'Entrez le code PIN (4 à 8 chiffres)',
    submitButton: 'Déchiffrer et afficher le dossier',
    verifying: 'Vérification et déchiffrement en cours...',
    remainingAttempts: 'Tentatives restantes : {count}',
    missingTokenTitle: 'Lien de partage invalide ou manquant',
    missingTokenDesc: 'Aucun jeton de partage détecté dans le lien. Veuillez vous assurer d\'ouvrir le lien chiffré complet tel que reçu du patient.',
    invalidPin: 'Code PIN de sécurité incorrect.',
    lockedTitle: 'Lien temporairement verrouillé',
    lockedDesc: 'Le lien a été temporairement verrouillé pendant 15 minutes suite à des tentatives infructueuses consécutives. Veuillez réessayer plus tard.',
    expiredTitle: 'Lien de partage expiré',
    expiredDesc: 'La période de validité de ce lien de partage a expiré. Veuillez demander un nouveau lien au patient.',
    revokedTitle: 'Lien de partage révoqué',
    revokedDesc: 'Le patient a révoqué l\'accès à ce lien de partage, il n\'est plus utilisable.',
    notFoundTitle: 'Lien de partage introuvable',
    notFoundDesc: 'Le lien de partage est invalide ou inexistant.',
    rateLimitTitle: 'Limite de requêtes dépassée',
    rateLimitDesc: 'Trop de tentatives de vérification. Veuillez patienter un instant et réessayer.',
    networkError: 'Échec de connexion au serveur. Veuillez vérifier votre connexion Internet.',
    patientInfo: 'Informations du Patient',
    mrn: 'Numéro de dossier médical (MRN)',
    fullName: 'Nom complet',
    gender: 'Genre',
    male: 'Homme',
    female: 'Femme',
    dateOfBirth: 'Date de naissance',
    bloodGroup: 'Groupe sanguin',
    allergiesTitle: 'Allergies Documentées',
    noAllergies: 'Aucune allergie enregistrée',
    allergen: 'Allergène',
    severity: 'Gravité',
    reaction: 'Réaction',
    chronicConditionsTitle: 'Affections Chroniques',
    noConditions: 'Aucune affection chronique enregistrée',
    conditionName: 'Affection',
    icd10: 'Code CIM-10',
    diagnosedDate: 'Date de diagnostic',
    currentMedicationsTitle: 'Médicaments Actuels',
    noMedications: 'Aucun médicament actuel enregistré',
    medicationName: 'Médicament',
    dosage: 'Posologie',
    frequency: 'Fréquence',
    metadataTitle: 'Métadonnées et Portée du Partage',
    scope: 'Portée autorisée',
    allEmrScope: 'Dossier médical unifié approuvé (coordonnées et identifiant personnel exclus)',
    expiresAt: 'Expire le',
    accessGrantedAt: 'Accès accordé le',
    securityNotice: 'Minimisation stricte des données appliquée : les coordonnées et le numéro d\'identification national sont totalement exclus pour la confidentialité.',
    httpsWarning: 'Avertissement de sécurité : Connexion non chiffrée (HTTP). Les environnements non locaux exigent strictement HTTPS pour protéger le dossier médical.',
  },
};

/**
 * Normalizes Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) numerals to ASCII 0-9 and strips non-digits.
 */
function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[^0-9]/g, '');
}

export default function SharedRecordViewer() {
  const [locale, setLocale] = useState<Locale>('ar');
  const isRtl = locale === 'ar';
  const t = TRANSLATIONS[locale];

  // In-memory credential and state only - NEVER persisted to storage/cookies/logs
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isHttps, setIsHttps] = useState(true);

  // Active token and request guards against async race conditions
  const activeTokenRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Resolution states
  const [hasResolved, setHasResolved] = useState(false);
  const [record, setRecord] = useState<SharedPatientMedicalRecord | null>(null);

  // Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isMissingToken, setIsMissingToken] = useState(false);

  // Extract and synchronize token strictly on the client from window.location.hash or search parameter
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check HTTPS in non-local environments
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal && window.location.protocol !== 'https:') {
      setIsHttps(false);
    }

    const safeDecodeToken = (raw: string): string | null => {
      try {
        return decodeURIComponent(raw);
      } catch {
        // Malformed URI sequence: return null to treat as invalid token without throwing URIError
        return null;
      }
    };

    const extractToken = (): string | null => {
      const hash = window.location.hash || '';
      if (hash.includes('token=')) {
        const match = hash.match(/token=([^&]+)/);
        if (match && match[1]) {
          const decoded = safeDecodeToken(match[1]);
          if (!decoded) return null;
          return decoded;
        }
      }

      // Fallback: check query parameter if URL was restructured or passed via search
      const search = window.location.search || '';
      if (search.includes('token=')) {
        const match = search.match(/token=([^&]+)/);
        if (match && match[1]) {
          const decoded = safeDecodeToken(match[1]);
          if (!decoded) return null;
          return decoded;
        }
      }

      return null;
    };

    const syncTokenFromUrl = () => {
      const extractedToken = extractToken();
      const validToken = (extractedToken && extractedToken.startsWith('pst_')) ? extractedToken : null;

      // Invalidate any active verification request immediately if token changed or became invalid
      if (activeTokenRef.current !== validToken) {
        activeTokenRef.current = validToken;
        activeRequestIdRef.current += 1;
        setIsVerifying(false);
      }

      if (validToken) {
        setToken((prevToken) => {
          if (prevToken !== validToken) {
            // New or changed token: reset verification state and related errors safely
            setHasResolved(false);
            setRecord(null);
            setPin('');
            setErrorMessage(null);
            setErrorTitle(null);
            setErrorCode(null);
            setRemainingAttempts(null);
            return validToken;
          }
          return prevToken;
        });
        setIsMissingToken(false);
      } else {
        setToken((prevToken) => {
          if (prevToken !== null) {
            setHasResolved(false);
            setRecord(null);
            setPin('');
            setErrorMessage(null);
            setErrorTitle(null);
            setErrorCode(null);
            setRemainingAttempts(null);
            return null;
          }
          return null;
        });
        setIsMissingToken(true);
      }
    };

    // Initial extraction on mount
    syncTokenFromUrl();

    // Listen to hash changes in the same tab to prevent Stale Token retention
    window.addEventListener('hashchange', syncTokenFromUrl);

    return () => {
      activeRequestIdRef.current += 1;
      activeTokenRef.current = null;
      window.removeEventListener('hashchange', syncTokenFromUrl);
    };
  }, []);

  const handlePinSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || token !== activeTokenRef.current) {
      setIsMissingToken(true);
      return;
    }

    // Enforce HTTPS in non-local environments: block POST submission over insecure HTTP
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && window.location.protocol !== 'https:') {
        setErrorTitle(isRtl ? 'حظر أمني: يلزم اتصال مشفر' : 'Security Block: Encrypted Connection Required');
        setErrorMessage(t.httpsWarning);
        return;
      }
    }

    const cleanPin = normalizeDigits(pin);
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8 || !/^[0-9]{4,8}$/.test(cleanPin)) {
      setErrorTitle(t.invalidPin);
      setErrorMessage(isRtl ? 'يجب أن يتكون رمز PIN من 4 إلى 8 أرقام رقمية فقط.' : 'PIN code must be between 4 and 8 numeric digits.');
      return;
    }

    const requestToken = token;
    const requestId = ++activeRequestIdRef.current;

    setIsVerifying(true);
    setErrorMessage(null);
    setErrorTitle(null);
    setErrorCode(null);
    setRemainingAttempts(null);

    try {
      // Submit exclusively in the POST body to /api/v1/shared-records/resolve
      const response = await ehrService.resolveSharedRecord({
        token: requestToken,
        pin: cleanPin,
      });

      // Strict race condition check: ensure this request is still the active one for the active token
      if (requestId !== activeRequestIdRef.current || requestToken !== activeTokenRef.current) {
        return;
      }

      // Handle both wrapped response.data and direct JSON payload from resolve endpoint
      const resolvedRecord: SharedPatientMedicalRecord | null =
        (response && (response as any).data && (response as any).data.patient)
          ? (response as any).data
          : (response && (response as any).patient)
          ? (response as any)
          : null;

      if (resolvedRecord) {
        setRecord(resolvedRecord);
        setHasResolved(true);
        // Wipe PIN from state upon successful resolution
        setPin('');

        // Sanitize the address bar once verified to prevent credential leakage in history/visual snooping
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // Fallback if replaceState is restricted
        }
      } else {
        throw new Error(t.notFoundDesc);
      }
    } catch (err: any) {
      // Strict race condition check: ensure this request is still the active one for the active token
      if (requestId !== activeRequestIdRef.current || requestToken !== activeTokenRef.current) {
        return;
      }

      const status = err?.status || 0;
      setErrorCode(status);

      // Extract remaining attempts if provided by backend response (FIX-3)
      const attempts = err?.responseData?.remaining_attempts;
      if (typeof attempts === 'number') {
        setRemainingAttempts(attempts);
      }

      if (status === 403) {
        setErrorTitle(t.invalidPin);
        setErrorMessage(
          typeof attempts === 'number'
            ? t.remainingAttempts.replace('{count}', attempts.toString())
            : t.invalidPin
        );
      } else if (status === 423) {
        setPin(''); // Immediately clear PIN on temporary lockout
        setErrorTitle(t.lockedTitle);
        setErrorMessage(t.lockedDesc);
      } else if (status === 410) {
        setPin(''); // Immediately clear PIN on expired or revoked link
        const msg = err?.message || '';
        if (msg.includes('إلغاء') || msg.toLowerCase().includes('revok')) {
          setErrorTitle(t.revokedTitle);
          setErrorMessage(t.revokedDesc);
        } else {
          setErrorTitle(t.expiredTitle);
          setErrorMessage(t.expiredDesc);
        }
      } else if (status === 404) {
        setErrorTitle(t.notFoundTitle);
        setErrorMessage(t.notFoundDesc);
      } else if (status === 429) {
        setErrorTitle(t.rateLimitTitle);
        setErrorMessage(t.rateLimitDesc);
      } else {
        setErrorTitle(isRtl ? 'خطأ في التحقق' : 'Verification Error');
        setErrorMessage(err?.message || t.networkError);
      }
    } finally {
      // Only reset verifying if this specific request is still the active one for the active token
      if (requestId === activeRequestIdRef.current && requestToken === activeTokenRef.current) {
        setIsVerifying(false);
      }
    }
  }, [token, pin, isRtl, t]);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white pb-16">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              ع
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">Aafiya</span>
              <span className="text-xs font-medium text-teal-600 block -mt-1">
                {isRtl ? 'منصة عافية الطبية الرقمية' : 'Digital Healthcare Platform'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  locale === 'ar' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  locale === 'en' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale('fr')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  locale === 'fr' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FR
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Security notice regarding HTTPS in non-local environments */}
      {!isHttps && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-start gap-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed font-medium">{t.httpsWarning}</p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
        {/* State 1: Missing Token Error */}
        {isMissingToken && !token && !hasResolved && (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">{errorTitle || t.missingTokenTitle}</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
              {errorMessage || t.missingTokenDesc}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-4 py-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>DEC-P05-02 / DEC-P05-03 Protocol Compliance</span>
            </div>
          </div>
        )}

        {/* State 2: Active Token - PIN Verification Form */}
        {(!isMissingToken || !!token) && !hasResolved && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shrink-0">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
                <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
              </div>
            </div>

            {/* Error / Alert box */}
            {errorMessage && (
              <div 
                role="alert"
                className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
                  errorCode === 423 || errorCode === 410 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : errorCode === 403 
                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                    : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div className="text-sm">
                  {errorTitle && <div className="font-bold mb-0.5">{errorTitle}</div>}
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* PIN Entry Form */}
            {errorCode !== 423 && errorCode !== 410 && (
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div>
                  <label htmlFor="pin-input" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t.pinPrompt}
                  </label>
                  <div className="relative max-w-xs">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <input
                      id="pin-input"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      autoComplete="off"
                      autoFocus
                      required
                      value={pin}
                      onChange={(e) => setPin(normalizeDigits(e.target.value))}
                      placeholder={t.pinPlaceholder}
                      aria-label={t.pinPlaceholder}
                      disabled={isVerifying}
                      className="w-full ps-11 pe-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-lg tracking-widest focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {isRtl 
                      ? 'الرمز السري يتكون من 4 إلى 8 أرقام قام المريض بتحديده أثناء إنشاء الرابط.' 
                      : 'Security PIN consists of 4 to 8 digits defined by the patient upon link creation.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying || pin.length < 4}
                    className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t.verifying}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-5 h-5" />
                        <span>{t.submitButton}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>DEC-P05-03 Mandatory PIN Verification</span>
              </span>
              <span>AAFIYA Security Gateway</span>
            </div>
          </div>
        )}

        {/* State 3: Decrypted Unified Medical Record Presentation */}
        {hasResolved && record && (
          <div className="space-y-6">
            {/* Success Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-teal-950">{t.title}</h2>
                  <p className="text-xs text-teal-800 font-medium">{record.share_metadata?.authorized_clinical_scope}</p>
                </div>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-xs text-teal-900 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{new Date(record.share_metadata?.access_granted_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Privacy Minimization Banner (DEC-P05-04) */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
              <span>{t.securityNotice}</span>
            </div>

            {/* Patient Demographics Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <User className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">{t.patientInfo}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.fullName}</span>
                  <span className="font-bold text-slate-900 text-base">{record.patient?.full_name || `${record.patient?.first_name} ${record.patient?.last_name}`}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.mrn}</span>
                  <span className="font-mono font-bold text-teal-800 text-base">{record.patient?.mrn}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.bloodGroup}</span>
                  <span className="font-bold text-rose-700 text-base">{record.patient?.blood_group || '—'}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.gender}</span>
                  <span className="font-medium text-slate-800">
                    {record.patient?.gender === 'female' ? t.female : record.patient?.gender === 'male' ? t.male : record.patient?.gender}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.dateOfBirth}</span>
                  <span className="font-medium text-slate-800 font-mono">{record.patient?.date_of_birth || '—'}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t.scope}</span>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono text-xs font-semibold">
                    {record.scope}
                  </span>
                </div>
              </div>
            </div>

            {/* Documented Allergies Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">{t.allergiesTitle}</h3>
              </div>

              {(!record.patient?.allergies || record.patient.allergies.length === 0) ? (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl text-sm border border-dashed border-slate-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p>{t.noAllergies}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {record.patient.allergies.map((allergy) => (
                    <div key={allergy.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{allergy.allergen}</span>
                          {allergy.severity && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              {allergy.severity}
                            </span>
                          )}
                        </div>
                        {allergy.reaction && (
                          <p className="text-xs text-rose-950 mt-1">
                            <span className="text-slate-500">{t.reaction}: </span>
                            {allergy.reaction}
                          </p>
                        )}
                        {allergy.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{allergy.notes}</p>
                        )}
                      </div>
                      {allergy.diagnosed_at && (
                        <div className="text-xs font-mono text-slate-500 shrink-0">
                          {allergy.diagnosed_at}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chronic Conditions Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <Activity className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">{t.chronicConditionsTitle}</h3>
              </div>

              {(!record.patient?.chronic_conditions || record.patient.chronic_conditions.length === 0) ? (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl text-sm border border-dashed border-slate-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p>{t.noConditions}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {record.patient.chronic_conditions.map((condition) => (
                    <div key={condition.id} className="p-4 rounded-xl border border-teal-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{condition.condition_name}</span>
                          {condition.icd10_code && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded-md font-bold bg-teal-100 text-teal-800 border border-teal-200">
                              {condition.icd10_code}
                            </span>
                          )}
                        </div>
                        {condition.notes && (
                          <p className="text-xs text-slate-500 mt-1">{condition.notes}</p>
                        )}
                      </div>
                      {condition.diagnosed_date && (
                        <div className="text-xs font-mono text-slate-500 shrink-0">
                          {condition.diagnosed_date}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Medications Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <Pill className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">{t.currentMedicationsTitle}</h3>
              </div>

              {(!record.patient?.current_medications || record.patient.current_medications.length === 0) ? (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl text-sm border border-dashed border-slate-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p>{t.noMedications}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {record.patient.current_medications.map((medication) => (
                    <div key={medication.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                      <div className="font-bold text-slate-900 text-sm mb-1">{medication.medication_name}</div>
                      <div className="text-xs text-slate-600 space-y-1">
                        {medication.dosage && (
                          <div>
                            <span className="text-slate-400">{t.dosage}: </span>
                            <span className="font-medium">{medication.dosage}</span>
                          </div>
                        )}
                        {medication.frequency && (
                          <div>
                            <span className="text-slate-400">{t.frequency}: </span>
                            <span className="font-medium">{medication.frequency}</span>
                          </div>
                        )}
                        {medication.prescribed_by && (
                          <div className="text-slate-500 italic">{medication.prescribed_by}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security and Expiration Metadata */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-800 block mb-1">{t.metadataTitle}</span>
                <span>{record.share_metadata?.authorized_clinical_scope}</span>
              </div>
              <div className="text-end font-mono space-y-1">
                {record.share_metadata?.expires_at && (
                  <div>
                    <span className="text-slate-500">{t.expiresAt}: </span>
                    <span className="font-bold text-slate-800">{new Date(record.share_metadata.expires_at).toLocaleString(locale)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
