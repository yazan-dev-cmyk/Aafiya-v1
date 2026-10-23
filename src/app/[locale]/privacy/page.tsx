import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, AlertTriangle, Eye, Server, FileCheck, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AAFIYA — Privacy Notice | إشعار الخصوصية وحماية المعطيات',
  description: 'Privacy Notice and Data Protection Framework for AAFIYA Medical Services Platform',
};

interface PrivacyContent {
  title: string;
  subtitle: string;
  versionLabel: string;
  version: string;
  effectiveDate: string;
  disclaimerTitle: string;
  disclaimerText: string;
  backHome: string;
  sections: Array<{
    id: string;
    title: string;
    content: string[];
  }>;
}

const privacyData: Record<string, PrivacyContent> = {
  ar: {
    title: 'إشعار الخصوصية وحماية المعطيات الشخصية',
    subtitle: 'بيان الشفافية حول معالجة وحماية المعطيات الشخصية والصحية وفق التشريع الجزائري',
    versionLabel: 'الإصدار المعتمد تقنياً:',
    version: '2026.1 (مسودة شفافية أولية)',
    effectiveDate: 'تاريخ السريان: أكتوبر 2026',
    disclaimerTitle: 'إشعار قانوني أولي وتنبيه الامتثال',
    disclaimerText: 'يوثق هذا الإشعار التدابير التقنية والتنظيمية لمعالجة المعطيات المطبقة فعلياً في منصة عافية استناداً لأحكام القانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، المعدل والمتمم بالقانون 25-11، وأحكام القانون رقم 18-11 المتعلق بالصحة. لا يعد هذا النص وثيقة نهائية أو ترخيصاً رسمياً حتى استكمال الإجراءات الإدارية والقانونية مع السلطة الوطنية (ANPDP).',
    backHome: 'العودة إلى الرئيسية',
    sections: [
      {
        id: 'data-controller',
        title: '1. هوية المشغل وتكييف المسؤوليات (المادة 32 من القانون 18-07)',
        content: [
          'يتم تشغيل البنية التحتية البرمجية للمنصة من قبل شركة عافية للخدمات الرقمية، بصفتها مزود برمجيات وسيطة.',
          'العيادات والممارسون الصحيون المعتمدون هم "المسؤولون عن المعالجة" (Responsables du traitement) فيما يتعلق بالملف الطبي والبيانات السريرية لمرضاهم، وتعمل منصة عافية بصفة "معالج من الباطن" (Sous-traitant) يقدم الدعم التقني والتخزين الآمن بموجب التزامات السرية والسر الطبي (المادتان 41 من القانون 18-07 و67 من قانون الصحة 18-11).',
        ],
      },
      {
        id: 'data-categories',
        title: '2. فئات المعطيات المعالجة والغرض منها',
        content: [
          'معطيات الحساب والهوية: الاسم واللقب، رقم الهاتف، البريد الإلكتروني، والصفة المهنية للأطباء. الغرض: إنشاء الحساب، التوثيق، وإدارة المواعيد (الأساس: الضرورة التعاقدية لتقديم الخدمة).',
          'المعطيات الصحية والسريرية: التاريخ الطبي، الفحوصات، والوصفات الطبية التي يدخلها الطبيب أو يحملها المريض. الغرض: المتابعة السريرية والرعاية الطبية الوقائية والتشخيصية بإشراف طبي خاضع للسر المهني (الأساس: المادة 9 من القانون 18-07 والمادة 67 من قانون الصحة).',
          'معطيات المشاركة الطوعية: السجلات المحددة التي يختار المريض مشاركتها عبر روابط مؤقتة (الأساس: الموافقة الصريحة للمريض والقابلة للإلغاء في أي وقت).',
        ],
      },
      {
        id: 'data-security',
        title: '3. التدابير الأمنية وسلامة المعطيات (المادة 40 من القانون 18-07)',
        content: [
          'تشفير الاتصال والبيانات: يتم تأمين جميع الاتصالات عبر بروتوكولات التشفير الحديثة (TLS)، مع تشفير النسخ الاحتياطية باستخدام معيار AES-256-CBC ومفاتيح تشفير مشتقة.',
          'حماية روابط المشاركة برمز سداسي (PIN): تخضع كافة روابط مشاركة السجلات للتحقق الإلزامي برمز PIN، مع حظر مؤقت آلي عند تكرار المحاولات الخاطئة لحماية خصوصية المريض.',
          'الدفتر الآلي للعمليات وسجلات التدقيق (القانون 25-11): تسجل المنصة أحداث الوصول، التعديل، والمشاركة في سجلات تدقيق أمنية وطبية غير قابلة للتعديل أو المحو (Append-Only) لضمان الشفافية ومراقبة النزاهة.',
        ],
      },
      {
        id: 'data-retention',
        title: '4. سياسة الاحتفاظ وحذف المعطيات',
        content: [
          'تحتفظ المنصة ببيانات الحساب طوال فترة نشاطه. وعند طلب إغلاق الحساب، يتم محو بيانات التعريف الشخصية مع الاحتفاظ بالأدلة الرقمية وسجلات التدقيق للأجل القانوني المحدد نظامياً لأغراض إثبات المعاملات.',
          'تخضع الملفات الطبية للالتزامات التشريعية الخاصة بمدة حفظ الملفات الطبية المحددة بموجب التنظيم الصحي الجزائري.',
        ],
      },
      {
        id: 'data-subject-rights',
        title: '5. حقوق أصحاب المعطيات وسبل الممارسة',
        content: [
          'يحق للمستخدم الاطلاع على بياناته الشخصية المسجلة، وتصحيحها، والاعتراض على معالجتها لأسباب مشروعة وفقاً للمواد 34 و35 من القانون 18-07.',
          'يمكن ممارسة هذه الحقوق مباشرة عبر لوحة تحكم المستخدم، أو عبر مراسلة مسؤول حماية البيانات على البريد المخصص: privacy@aafiya.dz أو support@aafiya.dz.',
        ],
      },
    ],
  },
  fr: {
    title: 'Politique de Confidentialité et Protection des Données',
    subtitle: 'Déclaration de transparence sur le traitement et la sécurité des données selon la législation algérienne',
    versionLabel: 'Version technique :',
    version: '2026.1 (Cadre technique de transparence)',
    effectiveDate: "Date d'effet : Octobre 2026",
    disclaimerTitle: 'Avis Juridique Préalable & Information Réglementaire',
    disclaimerText: "Cette politique documente les mesures techniques et organisationnelles appliquées par AAFIYA, conformément à la Loi n° 18-07 relative à la protection des données personnelles (modifiée par la Loi n° 25-11) et à la Loi n° 18-11 relative à la santé. Elle constitue une base d'information technique dans l'attente de la formalisation administrative définitive auprès de l'ANPDP.",
    backHome: "Retour à l'accueil",
    sections: [
      {
        id: 'data-controller',
        title: '1. Identification et Rôles (Article 32 de la Loi 18-07)',
        content: [
          "L'infrastructure est opérée par AAFIYA en qualité de fournisseur de solution technique (SaaS).",
          "Les praticiens et centres médicaux sont responsables du traitement des données cliniques de leurs patients. AAFIYA intervient en qualité de sous-traitant technique soumis au strict respect du secret médical et de la confidentialité (Article 41 de la Loi 18-07 et Article 67 de la Loi 18-11).",
        ],
      },
      {
        id: 'data-categories',
        title: '2. Catégories de Données et Finalités',
        content: [
          "Données de compte : Nom, prénom, téléphone, email. Finalité : Gestion des accès et rendez-vous (Base : Nécessité contractuelle).",
          "Données de santé : Antécédents, diagnostics, ordonnances saisis sous supervision médicale. Finalité : Soins et continuité médicale (Base : Article 9 de la Loi 18-07).",
          "Partage volontaire : Données transmises via liens temporaires sécurisés par code PIN (Base : Consentement explicite du patient).",
        ],
      },
      {
        id: 'data-security',
        title: '3. Sécurité et Intégrité des Données (Article 40 de la Loi 18-07)',
        content: [
          "Chiffrement des flux en transit (TLS) et des sauvegardes au repos (AES-256-CBC).",
          "Protection des accès partagés par code PIN avec limitation stricte des tentatives.",
          "Journalisation automatisée et immuable des opérations conformément aux exigences de la Loi 25-11.",
        ],
      },
      {
        id: 'data-retention',
        title: '4. Conservation des Données',
        content: [
          "Les données de compte sont conservées pendant la durée d'activité du compte. Les journaux de preuve et les dossiers médicaux respectent les délais légaux de conservation applicables en Algérie.",
        ],
      },
      {
        id: 'data-subject-rights',
        title: "5. Droits des Personnes Concernées",
        content: [
          "Conformément aux Articles 34 et 35 de la Loi 18-07, chaque utilisateur dispose d'un droit d'accès, de rectification et d'opposition, exerçable depuis l'espace utilisateur ou par courriel à : privacy@aafiya.dz.",
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Notice & Data Protection Policy',
    subtitle: 'Transparency notice regarding personal and health data processing under Algerian Law',
    versionLabel: 'Technical Release Version:',
    version: '2026.1 (Technical Transparency Baseline)',
    effectiveDate: 'Effective Date: October 2026',
    disclaimerTitle: 'Preliminary Regulatory Notice',
    disclaimerText: 'This notice documents the technical and organizational safeguards implemented by AAFIYA under Algerian Law 18-07 (as amended by Law 25-11) and Public Health Law 18-11. It provides operational transparency pending formal administrative certification by the National Authority (ANPDP).',
    backHome: 'Back to Home',
    sections: [
      {
        id: 'data-controller',
        title: '1. Governance Roles (Article 32 of Law 18-07)',
        content: [
          'The platform infrastructure is provided by AAFIYA as a technical software provider (SaaS).',
          'Licensed healthcare practitioners and medical centers act as Controllers for clinical data. AAFIYA acts as a technical Processor bound by strict confidentiality and professional medical secrecy (Law 18-07 Art. 41 and Health Law 18-11 Art. 67).',
        ],
      },
      {
        id: 'data-categories',
        title: '2. Data Categories & Lawful Bases',
        content: [
          'Identity & Credentials: Name, phone, email, professional license. Purpose: Account administration (Basis: Contractual necessity).',
          'Health & Clinical Data: Medical records, diagnostic fulfilled orders, prescriptions administered under clinical supervision (Basis: Law 18-07 Art. 9 healthcare exemption & medical secrecy).',
          'Voluntary Sharing: EMR views generated via patient share tokens (Basis: Explicit, revocable patient consent).',
        ],
      },
      {
        id: 'data-security',
        title: '3. Technical Safeguards (Article 40 of Law 18-07)',
        content: [
          'End-to-end transport security (TLS) and AES-256-CBC backup encryption with PBKDF2 derived keys.',
          'Mandatory PIN verification on external share links with automated lockout telemetry.',
          'Immutable append-only audit trail logging for administrative and public access events in accordance with Law 25-11 requirements.',
        ],
      },
      {
        id: 'data-retention',
        title: '4. Data Retention Principles',
        content: [
          'Account credentials persist while active. Upon account deletion, personal identity identifiers are expunged while evidentiary consent and transaction audit trails are retained per statutory requirements.',
        ],
      },
      {
        id: 'data-subject-rights',
        title: '5. Data Subject Rights & Contact',
        content: [
          'Under Articles 34 and 35 of Law 18-07, individuals have the right to access, rectify, and object to processing. Requests can be submitted via the account console or via privacy@aafiya.dz.',
        ],
      },
    ],
  },
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isRtl = locale === 'ar';
  const data = privacyData[locale] || privacyData.en;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-500 selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {data.backHome}
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
              {data.versionLabel} {data.version}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Title Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-200">
          <div className="inline-flex p-3 rounded-2xl bg-teal-50 text-teal-600 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {data.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium max-w-2xl mx-auto">
            {data.subtitle}
          </p>
          <div className="text-xs text-slate-400 font-semibold">
            {data.effectiveDate}
          </div>
        </div>

        {/* Preliminary Legal Notice Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {data.disclaimerTitle}
            </div>
            <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed">
              {data.disclaimerText}
            </p>
          </div>
        </div>

        {/* Structured Sections */}
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
          {data.sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-3 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
                {section.title}
              </h2>
              <div className="space-y-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                {section.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Nav Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div>
            AAFIYA Digital Medical Services &copy; 2026. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/terms`} className="text-teal-600 font-bold hover:underline">
              {locale === 'ar' ? 'شروط وأحكام الاستخدام' : locale === 'fr' ? "Conditions d'Utilisation" : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
