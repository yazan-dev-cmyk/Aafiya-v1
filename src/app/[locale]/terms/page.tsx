import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, FileText, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AAFIYA — Terms of Service | شروط الاستخدام',
  description: 'Terms of Service and Platform Usage Conditions for AAFIYA Medical Services Platform',
};

interface TermsContent {
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

const termsData: Record<string, TermsContent> = {
  ar: {
    title: 'شروط وأحكام استخدام منصة عافية',
    subtitle: 'القواعد المنظمة لاستخدام البنية الرقمية لمنظومة عافية للخدمات الطبية',
    versionLabel: 'الإصدار المعتمد تقنياً:',
    version: '2026.1 (مسودة تشغيلية)',
    effectiveDate: 'تاريخ السريان: أكتوبر 2026',
    disclaimerTitle: 'إشعار قانوني أولي',
    disclaimerText: 'هذه الوثيقة تحدد الإطار التقني والإعلامي لاستخدام منصة عافية. لا تعد هذه الشروط استشارة قانونية نهائية أو صياغة تعاقدية مبرمة حتى اعتمادها الرسمي من المستشار القانوني المعتمد للجهة المشغلة.',
    backHome: 'العودة إلى الرئيسية',
    sections: [
      {
        id: 'nature-of-service',
        title: '1. طبيعة المنصة والحدود التشغيلية',
        content: [
          'منصة "عافية" (AAFIYA) هي بنية برمجية وسيطة (SaaS) مصممة لتيسير حجز المواعيد الطبية وإدارة السجلات الإدارية والملفات الصحية الإلكترونية للمرضى والمهنيين الصحيين في الجزائر.',
          'المنصة ليست مؤسسة استشفائية ولا تمارس مهنة الطب أو التشخيص أو تقديم الرعاية السريرية. جميع القرارات الطبية والعلاجية تقع تحت المسؤولية الحصرية والمباشرة للأطباء والممارسين الصحيين المرخصين وفقاً للقانون رقم 18-11 المتعلق بالصحة.',
        ],
      },
      {
        id: 'account-registration',
        title: '2. إنشاء الحساب ومسؤولية الهوية الرقمية',
        content: [
          'يشترط للتسجيل تقديم بيانات صحيحة ومحدثة تتطابق مع الهوية الفعلية للمستخدم أو الصفة المهنية المعتمدة للممارس الطبي.',
          'يلتزم المستخدم بالحفاظ التام على سرية بيانات تسجيل الدخول وكلمة المرور، ويتحمل كامل المسؤولية عن أي نشاط يتم عبر حسابه.',
          'يخضع تسجيل الأطباء والمراكز الصحية لتدقيق اعتمادات الترخيص الإداري والطبي قبل التفعيل الكامل لخصائص المنظومة.',
        ],
      },
      {
        id: 'record-sharing',
        title: '3. ضوابط مشاركة السجلات الطبية (Patient Share Tokens)',
        content: [
          'تتيح المنصة للمريض خيار توليد روابط مؤقتة لمشاركة سجله الطبي مع أطباء أو جهات فحص خارجية.',
          'تكون هذه المشاركة طوعية ومحمية برمز مرور (PIN) وصلاحية زمنية محددة، مع احتفاظ المريض بالحق التقني في إلغاء الرابط فورياً في أي وقت.',
          'يحظر على أي طرف خارجي محاولة التحايل على ضوابط الأمان أو محاولة الوصول غير المصرح به لسجلات غير مخصصة له.',
        ],
      },
      {
        id: 'prohibited-uses',
        title: '4. الاستخدامات المحظورة وضمان النزاهة',
        content: [
          'يحظر استخدام المنصة لأي غرض غير قانوني، أو محاولة تعطيل خدماتها، أو استخراج البيانات آلياً (Scraping)، أو محاولة اختراق خوادمها وقواعد بياناتها.',
          'تخضع كافة محاولات الوصول غير المشروع للتسجيل الجنائي الفوري في سجلات التدقيق الأمني، وقد تعرض صاحبها للمساءلة القانونية.',
        ],
      },
      {
        id: 'intellectual-property',
        title: '5. الملكية الفكرية والعلامات',
        content: [
          'جميع البرمجيات، الواجهات، التصاميم، والشعارات المرتبطة بعافية مملوكة حصرياً للجهة المشغلة ومحمية بموجب قوانين الملكية الفكرية السارية في الجمهورية الجزائرية الديمقراطية الشعبية.',
        ],
      },
    ],
  },
  fr: {
    title: "Conditions Générales d'Utilisation — Plateforme AAFIYA",
    subtitle: "Règles régissant l'utilisation de l'infrastructure numérique AAFIYA",
    versionLabel: 'Version technique :',
    version: '2026.1 (Version de cadrage technique)',
    effectiveDate: "Date d'effet : Octobre 2026",
    disclaimerTitle: 'Avis Juridique Préalable',
    disclaimerText: "Ce document définit le cadre technique et informationnel d'utilisation de la plateforme. Il ne constitue pas un avis juridique définitif jusqu'à sa validation par le conseiller juridique agréé.",
    backHome: "Retour à l'accueil",
    sections: [
      {
        id: 'nature-of-service',
        title: '1. Nature de la Plateforme et Limites Opérationnelles',
        content: [
          "La plateforme AAFIYA est une solution logicielle intermédiaire (SaaS) conçue pour faciliter la prise de rendez-vous médicaux et la gestion des dossiers administratifs et de santé en Algérie.",
          "La plateforme n'est pas un établissement de santé et n'exerce aucune activité médicale de diagnostic ou de soin. Les actes médicaux relèvent de la responsabilité exclusive des praticiens de santé agréés conformément à la Loi n° 18-11 relative à la santé.",
        ],
      },
      {
        id: 'account-registration',
        title: '2. Création de Compte et Sécurité des Identifiants',
        content: [
          "L'inscription requiert des informations exactes et conformes à l'identité réelle ou professionnelle de l'utilisateur.",
          "L'utilisateur s'engage à préserver la stricte confidentialité de ses identifiants et demeure responsable des activités opérées depuis son compte.",
          "Les comptes des praticiens font l'objet d'une vérification de conformité de licence avant activation complète.",
        ],
      },
      {
        id: 'record-sharing',
        title: '3. Partage de Dossiers Médicaux (Patient Share Tokens)',
        content: [
          "Le patient dispose de la faculté de générer des liens temporaires protégés par code PIN pour partager son dossier avec des tiers soignants.",
          "Ce partage demeure facultatif, révocable à tout instant, et strictement limité dans le temps.",
        ],
      },
      {
        id: 'prohibited-uses',
        title: '4. Usages Prohibés et Intégrité',
        content: [
          "Tout usage frauduleux, tentative d'accès non autorisé, ou extraction automatisée de données est strictement prohibé et fait l'objet d'une journalisation technique systématique.",
        ],
      },
      {
        id: 'intellectual-property',
        title: '5. Propriété Intellectuelle',
        content: [
          "L'ensemble des interfaces, codes et marques demeurent la propriété exclusive de l'opérateur de la plateforme sous le droit algérien applicable.",
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service — AAFIYA Platform',
    subtitle: 'Rules governing the usage of the AAFIYA digital medical services infrastructure',
    versionLabel: 'Technical Release Version:',
    version: '2026.1 (Technical Baseline Draft)',
    effectiveDate: 'Effective Date: October 2026',
    disclaimerTitle: 'Preliminary Legal Notice',
    disclaimerText: 'This document specifies the technical and informational operational framework of the AAFIYA platform. It does not constitute final binding legal counsel until formally validated by licensed Algerian legal counsel.',
    backHome: 'Back to Home',
    sections: [
      {
        id: 'nature-of-service',
        title: '1. Nature of the Platform & Operational Boundaries',
        content: [
          'AAFIYA is an intermediary software platform (SaaS) designed to streamline clinical appointment scheduling and electronic medical record management in Algeria.',
          'The platform is not a hospital and does not provide direct medical care, diagnosis, or clinical advice. All clinical decisions remain under the exclusive professional responsibility of licensed healthcare practitioners under Algerian Public Health Law 18-11.',
        ],
      },
      {
        id: 'account-registration',
        title: '2. Account Registration & Credentials',
        content: [
          'Accurate, verifiable information is required for registration, matching the true identity of patients or verified licensing credentials of healthcare professionals.',
          'Users must maintain the strict confidentiality of their access credentials.',
        ],
      },
      {
        id: 'record-sharing',
        title: '3. Medical Record Sharing Controls (Patient Share Tokens)',
        content: [
          'Patients may voluntarily generate ephemeral, PIN-protected links to share designated medical record scopes with healthcare practitioners.',
          'Such shares are strictly revocable by the patient at any time via the patient console.',
        ],
      },
      {
        id: 'prohibited-uses',
        title: '4. Prohibited Uses & Security Invariants',
        content: [
          'Unauthorized access attempts, tampering, automated scraping, or security circumvention are strictly prohibited and actively recorded in security audit logs.',
        ],
      },
      {
        id: 'intellectual-property',
        title: '5. Intellectual Property',
        content: [
          'All software, design systems, and marks are the exclusive property of the platform operator protected under applicable Algerian intellectual property laws.',
        ],
      },
    ],
  },
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isRtl = locale === 'ar';
  const data = termsData[locale] || termsData.en;

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
            <FileText className="w-8 h-8" />
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
            <Link href={`/${locale}/privacy`} className="text-teal-600 font-bold hover:underline">
              {locale === 'ar' ? 'إشعار الخصوصية والبيانات' : locale === 'fr' ? 'Politique de Confidentialité' : 'Privacy Notice'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
