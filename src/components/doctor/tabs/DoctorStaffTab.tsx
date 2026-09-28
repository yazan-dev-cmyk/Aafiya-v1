import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Users,
  UserPlus,
  Stethoscope,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  X,
  Key,
  RefreshCw,
  Building,
  Award,
  Sparkles,
  Search,
  Send,
  Clock
} from 'lucide-react';
import {
  clinicService,
  ClinicDetails,
  ClinicDoctorStaff,
  ClinicAssistantStaff,
  DoctorLookupResult,
  ClinicDoctorInvitation,
} from '@/services/clinicService';
import { useAuth } from '@/auth';
import { StaffDetailDrawer } from '../staff/StaffDetailDrawer';

interface DoctorStaffTabProps {
  isDarkMode?: boolean;
}

interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
  roleTitle: string;
}

const DELEGABLE_PERMISSIONS = [
  {
    key: 'booking.manage_queue',
    titleAr: 'إدارة قائمة الانتظار الحية',
    titleFr: 'Gestion de la file d\'attente',
    titleEn: 'Live Queue Management',
    descAr: 'ترتيب وتنظيم دخول المرضى لغرفة الكشف',
    descFr: 'Organiser l\'ordre d\'entrée des patients',
    descEn: 'Organize patient entry to consultation room',
  },
  {
    key: 'booking.confirm_attendance',
    titleAr: 'تأكيد حضور المرضى',
    titleFr: 'Confirmation de présence',
    titleEn: 'Confirm Patient Attendance',
    descAr: 'تسجيل وصول المريض وتأكيد تواجده بالعيادة',
    descFr: 'Enregistrer l\'arrivée et la présence du patient',
    descEn: 'Check in patients upon clinic arrival',
  },
  {
    key: 'booking.create',
    titleAr: 'إنشاء وحجز المواعيد',
    titleFr: 'Prise de rendez-vous',
    titleEn: 'Create & Book Appointments',
    descAr: 'تسجيل مواعيد جديدة للمرضى بالاستقبال',
    descFr: 'Enregistrer de nouveaux rendez-vous',
    descEn: 'Schedule new appointments at reception',
  },
  {
    key: 'booking.confirm',
    titleAr: 'تأكيد المواعيد الطبية',
    titleFr: 'Confirmation des rendez-vous',
    titleEn: 'Confirm Medical Appointments',
    descAr: 'تحويل الحجز الأولي إلى موعد مؤكد ومراجعة قائمة الانتظار',
    descFr: 'Confirmer la réservation initiale du patient',
    descEn: 'Confirm initial bookings and manage confirmed schedule',
  },
  {
    key: 'patient.view_contacts',
    titleAr: 'الاطلاع على بيانات الاتصال',
    titleFr: 'Consulter les coordonnées',
    titleEn: 'View Patient Contacts',
    descAr: 'الاطلاع على رقم هاتف المريض للتواصل والتذكير',
    descFr: 'Voir le numéro de téléphone pour rappel',
    descEn: 'Access phone numbers for notifications',
  },
];

export const DoctorStaffTab: React.FC<DoctorStaffTabProps> = ({ isDarkMode = false }) => {
  const { user } = useAuth();
  const t = useTranslations('doctor.staff');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [clinic, setClinic] = useState<ClinicDetails | null>(null);
  const [isDirector, setIsDirector] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState<boolean>(false);
  const [isAddAssistantOpen, setIsAddAssistantOpen] = useState<boolean>(false);
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Form states: Doctor (New Account)
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docLicense, setDocLicense] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docBio, setDocBio] = useState('');
  const [submittingDoctor, setSubmittingDoctor] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  // Form states: Doctor (Existing Account Invitation)
  const [doctorAddTab, setDoctorAddTab] = useState<'existing' | 'new'>('existing');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchingDoctor, setSearchingDoctor] = useState(false);
  const [lookupResult, setLookupResult] = useState<DoctorLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [inviteNotes, setInviteNotes] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [sentInvitations, setSentInvitations] = useState<ClinicDoctorInvitation[]>([]);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

  // Form states: Assistant
  const [astName, setAstName] = useState('');
  const [astEmail, setAstEmail] = useState('');
  const [astPhone, setAstPhone] = useState('');
  const [astPassword, setAstPassword] = useState('');
  const [astPermissions, setAstPermissions] = useState<string[]>([
    'booking.manage_queue',
    'booking.confirm_attendance',
    'booking.create',
  ]);
  const [submittingAssistant, setSubmittingAssistant] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  // Permissions edit modal state
  const [editingAssistant, setEditingAssistant] = useState<ClinicAssistantStaff | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Staff Detail Drawer state
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffType, setSelectedStaffType] = useState<'doctor' | 'assistant'>('doctor');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const handleOpenStaffDetail = (id: string, type: 'doctor' | 'assistant') => {
    setSelectedStaffId(id);
    setSelectedStaffType(type);
    setIsDrawerOpen(true);
  };

  const containerClass = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200/80 text-slate-900 shadow-xs';

  const cardBgClass = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200/70';

  const fallbackClinic: ClinicDetails = {
    id: 'demo-clinic-director-1',
    name: 'عيادة ابن سينا التخصصية للطب الباطني',
    address: 'شارع ديدوش مراد، عمارة 14، الطابق الثاني',
    wilaya: 'الجزائر العاصمة',
    phone: '+213 21 65 43 21',
    is_active: true,
    director: {
      id: 'doc-dir-1',
      name: 'د. محمد العربي',
      specialty: 'الطب الباطني وأمراض الجهاز الهضمي',
      license_number: 'DZ-ALG-88492'
    },
    doctors: [
      {
        id: 'doc-dir-1',
        name: 'د. محمد العربي',
        email: 'dr.larbi@aafiya.dz',
        phone: '+213 555 12 34 56',
        specialty: 'الطب الباطني وأمراض الجهاز الهضمي',
        license_number: 'DZ-ALG-88492',
        position: 'director',
        is_primary: true,
        is_active: true,
        joined_at: '2025-01-10'
      }
    ],
    assistants: [
      {
        id: 'ast-1',
        name: 'سارة بنت إبراهيم التلمساني',
        email: 'sara.asst@aafiya.dz',
        phone: '+213 771 33 22 11',
        permissions_json: ['booking.manage_queue', 'booking.confirm_attendance', 'booking.create', 'patient.view_contacts'],
        is_active: true,
        created_at: '2025-02-15'
      }
    ]
  };

  const fetchStaffData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await clinicService.getOnboardingStatus();
      const affiliation = statusRes.data?.clinic_affiliation;
      const clinicId = affiliation?.id || user?.clinic?.id;
      const isDir = Boolean(affiliation?.is_director) || user?.clinic?.position === 'director' || user?.clinic?.is_director === true;
      setIsDirector(isDir);

      if (clinicId) {
        const clinicRes = await clinicService.getClinic(clinicId);
        if (clinicRes.data) {
          setClinic(clinicRes.data);
        } else {
          setClinic(fallbackClinic);
        }

        if (isDir) {
          try {
            const invRes = await clinicService.getClinicInvitations(clinicId);
            if (invRes.data) {
              setSentInvitations(invRes.data);
            }
          } catch {
            // Ignore error fetching sent invitations
          }
        }
      } else {
        setClinic(fallbackClinic);
      }
    } catch {
      const isDir = user?.clinic?.position === 'director' || user?.clinic?.is_director === true;
      setIsDirector(isDir);
      setClinic(fallbackClinic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleCancelInvitation = async (invitationId: string) => {
    const currentClinicId = clinic?.id || user?.clinic?.id;
    if (!currentClinicId) return;
    setCancellingInvitationId(invitationId);
    try {
      await clinicService.cancelDoctorInvitation(currentClinicId, invitationId);
      setSentInvitations((prev) =>
        prev.map((inv) => (inv.id === invitationId ? { ...inv, status: 'cancelled' } : inv))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel invitation');
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Med#';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '2026!';
  };

  const handleOpenAddDoctor = () => {
    setDoctorAddTab('existing');
    setSearchEmail('');
    setLookupResult(null);
    setLookupError(null);
    setInviteNotes('');
    setInviteSuccessMsg(null);
    setDocName('');
    setDocEmail('');
    setDocPhone('+213');
    setDocSpecialty('طب عام (General Medicine)');
    setDocLicense(`DZ-ALG-2026-DOC-${Math.floor(100 + Math.random() * 900)}`);
    setDocPassword(generateRandomPassword());
    setDocBio('');
    setDoctorError(null);
    setIsAddDoctorOpen(true);
  };

  const handleLookupDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id || !searchEmail.trim()) return;
    setSearchingDoctor(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await clinicService.lookupDoctor(clinic.id, searchEmail.trim());
      if (res.data) {
        setLookupResult(res.data);
      } else {
        setLookupError(t('doctorNotFound'));
      }
    } catch (err: any) {
      setLookupError(err?.message || t('doctorNotFound'));
    } finally {
      setSearchingDoctor(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!clinic?.id || !lookupResult?.id) return;
    setSendingInvite(true);
    setLookupError(null);
    try {
      await clinicService.sendDoctorInvitation(clinic.id, lookupResult.id, inviteNotes);
      setInviteSuccessMsg(t('inviteSuccess'));
      setLookupResult(null);
      setSearchEmail('');
      setInviteNotes('');
      setTimeout(() => {
        setIsAddDoctorOpen(false);
        setInviteSuccessMsg(null);
      }, 1500);
      await fetchStaffData();
    } catch (err: any) {
      setLookupError(err?.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleOpenAddAssistant = () => {
    setAstName('');
    setAstEmail('');
    setAstPhone('+213');
    setAstPassword(generateRandomPassword());
    setAstPermissions(['booking.manage_queue', 'booking.confirm_attendance', 'booking.create']);
    setAssistantError(null);
    setIsAddAssistantOpen(true);
  };

  const handleSubmitDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    setDoctorError(null);
    setSubmittingDoctor(true);
    try {
      await clinicService.createEmployedDoctor(clinic.id, {
        name: docName,
        email: docEmail,
        phone: docPhone,
        password: docPassword,
        specialty: docSpecialty,
        license_number: docLicense,
        bio: docBio,
      });

      setIsAddDoctorOpen(false);
      setCreatedCreds({
        name: docName,
        email: docEmail,
        password: docPassword,
        roleTitle: `طبيب موظف ممارس (${docSpecialty})`,
      });
      await fetchStaffData();
    } catch (err: any) {
      setDoctorError(err?.response?.data?.message || err?.message || 'فشل إنشاء حساب الطبيب الموظف');
    } finally {
      setSubmittingDoctor(false);
    }
  };

  const handleSubmitAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    setAssistantError(null);
    setSubmittingAssistant(true);
    try {
      await clinicService.createAssistant(clinic.id, {
        name: astName,
        email: astEmail,
        phone: astPhone,
        password: astPassword,
        permissions_json: astPermissions,
      });

      setIsAddAssistantOpen(false);
      setCreatedCreds({
        name: astName,
        email: astEmail,
        password: astPassword,
        roleTitle: 'مساعد عيادة (Clinical Assistant)',
      });
      await fetchStaffData();
    } catch (err: any) {
      setAssistantError(err?.response?.data?.message || err?.message || 'فشل إنشاء حساب المساعد');
    } finally {
      setSubmittingAssistant(false);
    }
  };

  const handleOpenEditPermissions = (ast: ClinicAssistantStaff) => {
    setEditingAssistant(ast);
    setEditingPermissions(ast.permissions_json || []);
  };

  const handleSavePermissions = async () => {
    if (!clinic?.id || !editingAssistant) return;
    setSavingPermissions(true);
    try {
      await clinicService.updateAssistantPermissions(clinic.id, editingAssistant.id, editingPermissions);
      setEditingAssistant(null);
      await fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث الصلاحيات');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCreds) return;
    const text = `بيانات الدخول إلى منصة عافية:\nالصفة: ${createdCreds.roleTitle}\nالاسم: ${createdCreds.name}\nالبريد الإلكتروني: ${createdCreds.email}\nكلمة المرور المؤقتة: ${createdCreds.password}\nالرابط: http://localhost:3000/ar`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className={`${containerClass} rounded-2xl p-12 text-center border space-y-3`}>
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="font-bold text-sm text-slate-500">جاري تحميل بيانات طاقم العيادة...</p>
      </div>
    );
  }

  const doctorsList = clinic?.doctors || [];
  const assistantsList = clinic?.assistants || [];

  return (
    <div className={`space-y-6 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Clinic Header Banner */}
      <div className={`${containerClass} rounded-2xl p-6 border flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {clinic?.wilaya || 'الجزائر العاصمة'}
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isDirector ? t('directorBadge') : t('employedBadge')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
              {clinic?.name || 'عيادة النور الطبية'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{clinic?.address} | {clinic?.phone}</p>
          </div>
        </div>

        {/* Action buttons (Only for Clinic Director) */}
        {isDirector && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddDoctor}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>{t('addDoctorBtn')}</span>
            </button>
            <button
              onClick={handleOpenAddAssistant}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('addAssistantBtn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${containerClass} p-5 rounded-2xl border space-y-1`}>
          <span className="text-xs font-bold text-slate-500">{t('totalDoctors')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 font-mono">{doctorsList.length}</span>
            <span className="text-xs text-slate-400">{t('registeredDoctorsCount')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-5 rounded-2xl border space-y-1`}>
          <span className="text-xs font-bold text-slate-500">{t('totalAssistants')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 font-mono">{assistantsList.length}</span>
            <span className="text-xs text-slate-400">{t('registeredAssistantsCount')}</span>
          </div>
        </div>

        <div className={`${containerClass} p-5 rounded-2xl border space-y-1`}>
          <span className="text-xs font-bold text-slate-500">{t('securityActive')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <Shield className="w-4 h-4" /> 4D Authorization Active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Doctors Staff List */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base">{t('doctorsSectionTitle')} ({doctorsList.length})</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {doctorsList.filter((d) => d.position === 'director').length} مدير | {doctorsList.filter((d) => d.position !== 'director').length} موظف
          </span>
        </div>

        {doctorsList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">{t('noDoctors')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorsList.map((doc) => {
              const isDocDirector = doc.position === 'director';
              const isActive = doc.is_active !== false;
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenStaffDetail(doc.id, 'doctor')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenStaffDetail(doc.id, 'doctor');
                    }
                  }}
                  aria-label={`${doc.name || 'Doctor'} - ${isActive ? t('statusActive') : t('statusSuspended')}`}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer hover:shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    isDocDirector ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40' : cardBgClass
                  }`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {doc.name || 'د. طبيب'}
                      </span>
                      {isDocDirector ? (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-600 text-white text-[10px] flex items-center gap-1 shadow-xs">
                          <Award className="w-3 h-3" /> {t('doctorPositionDirector')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                          {t('doctorPositionEmployed')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {doc.specialty || 'طب عام'}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-1">
                      <span>{t('licenseLabel')}: <strong>{doc.license_number || 'DZ-2026-DOC'}</strong></span>
                      <span className={`font-bold flex items-center gap-1 ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {isActive ? t('statusActive') : t('statusSuspended')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 1.5: Sent Pending Invitations */}
      {sentInvitations.filter((i) => i.status === 'pending').length > 0 && (
        <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">{t('sentInvitationsTitle')}</h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {sentInvitations.filter((i) => i.status === 'pending').length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sentInvitations
              .filter((i) => i.status === 'pending')
              .map((inv) => (
                <div
                  key={inv.id}
                  className={`${cardBgClass} p-4 rounded-xl border flex items-center justify-between gap-3`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-black text-xs truncate">
                      {inv.doctor_name || inv.doctor_email || 'طبيب مدعو'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      {inv.doctor_specialty && <span>{inv.doctor_specialty}</span>}
                      {inv.created_at && (
                        <span>• {new Date(inv.created_at).toLocaleDateString(locale)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelInvitation(inv.id)}
                    disabled={cancellingInvitationId === inv.id}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {cancellingInvitationId === inv.id ? t('cancellingInvite') : t('cancelInviteBtn')}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Assistants Staff List */}
      <div className={`${containerClass} rounded-2xl p-6 border space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">{t('assistantsSectionTitle')} ({assistantsList.length})</h3>
          </div>
        </div>

        {assistantsList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {t('noAssistants')}
          </div>
        ) : (
          <div className="space-y-3">
            {assistantsList.map((ast) => {
              const perms = (ast as any).delegated_permissions || ast.permissions_json || [];
              const isActive = ast.is_active !== false;
              return (
                <div
                  key={ast.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenStaffDetail(ast.id, 'assistant')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenStaffDetail(ast.id, 'assistant');
                    }
                  }}
                  aria-label={`${ast.name} - ${isActive ? t('statusActive') : t('statusSuspended')}`}
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${cardBgClass}`}
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{ast.name}</span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px]">
                        {t('assistantPosition')}
                      </span>
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {isActive ? t('statusActive') : t('statusSuspended')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                      <span><Mail className="w-3.5 h-3.5 inline mr-1" /> {ast.email}</span>
                      <span><Phone className="w-3.5 h-3.5 inline mr-1" /> {ast.phone}</span>
                    </div>

                    {/* Permissions list */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {perms.map((p: string) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                        >
                          {p === 'booking.manage_queue' && (locale === 'ar' ? 'إدارة الطابور' : locale === 'fr' ? 'File d\'attente' : 'Queue')}
                          {p === 'booking.confirm_attendance' && (locale === 'ar' ? 'تأكيد الحضور' : locale === 'fr' ? 'Présence' : 'Attendance')}
                          {p === 'booking.create' && (locale === 'ar' ? 'حجز المواعيد' : locale === 'fr' ? 'Rendez-vous' : 'Booking')}
                          {p === 'patient.view_contacts' && (locale === 'ar' ? 'بيانات الاتصال' : locale === 'fr' ? 'Contacts' : 'Contacts')}
                          {!['booking.manage_queue', 'booking.confirm_attendance', 'booking.create', 'patient.view_contacts'].includes(p) && p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isDirector && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditPermissions(ast);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      {t('editPermissions')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Add Employed Doctor (Dual Mode: Invite Existing vs Create New) */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${containerClass} w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">{t('addDoctorBtn')}</h3>
              </div>
              <button
                onClick={() => setIsAddDoctorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs: Existing Doctor vs Create New */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDoctorAddTab('existing')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  doctorAddTab === 'existing'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('addDoctorExistingTab')}
              </button>
              <button
                type="button"
                onClick={() => setDoctorAddTab('new')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  doctorAddTab === 'new'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('addDoctorNewTab')}
              </button>
            </div>

            {/* TAB 1: Existing Doctor Search & Invite */}
            {doctorAddTab === 'existing' && (
              <div className="space-y-4 text-xs">
                {inviteSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{inviteSuccessMsg}</span>
                  </div>
                )}

                {lookupError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}

                <form onSubmit={handleLookupDoctor} className="space-y-3">
                  <div>
                    <label className="font-bold block mb-1">{t('searchDoctorEmail')}</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder={t('searchDoctorPlaceholder')}
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        className="flex-1 p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono text-xs"
                      />
                      <button
                        type="submit"
                        disabled={searchingDoctor || !searchEmail.trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {searchingDoctor ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{t('searching')}</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>{t('searchDoctorBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Doctor Found Card */}
                {lookupResult && (
                  <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300">
                        {t('doctorFoundTitle')}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                        <Shield className="w-3 h-3" />
                        {t('privacyBadge')}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-black text-sm text-slate-900 dark:text-white">
                        {lookupResult.full_name}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span>{t('specialtyLabel')}:</span>
                        <strong className="font-bold text-slate-800 dark:text-slate-200">
                          {lookupResult.specialty || '--'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span>{t('licenseLabel')}:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">
                          {lookupResult.license_number || '--'}
                        </strong>
                      </div>
                    </div>

                    {/* Privacy Disclaimer */}
                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <span>{t('privacyNotice')}</span>
                    </div>

                    {/* Status Warnings */}
                    {lookupResult.is_already_member ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{t('alreadyMemberWarning')}</span>
                      </div>
                    ) : lookupResult.has_pending_invitation ? (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>{t('pendingInviteWarning')}</span>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="font-bold block mb-1">{t('inviteNotesLabel')}</label>
                          <textarea
                            rows={2}
                            placeholder={t('inviteNotesPlaceholder')}
                            value={inviteNotes}
                            onChange={(e) => setInviteNotes(e.target.value)}
                            className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSendInvitation}
                          disabled={sendingInvite}
                          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {sendingInvite ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{t('sendingInvite')}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{t('sendInviteBtn')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddDoctorOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Create New Account Form (Legacy) */}
            {doctorAddTab === 'new' && (
              <form onSubmit={handleSubmitDoctor} className="space-y-3.5 text-xs">
                {doctorError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{doctorError}</span>
                  </div>
                )}

                <div>
                  <label className="font-bold block mb-1">الاسم الكامل للطبيب *</label>
                  <input
                    type="text"
                    required
                    placeholder="د. سمير بن علي"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      placeholder="doctor@aafiya.dz"
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">رقم الهاتف *</label>
                    <input
                      type="text"
                      required
                      value={docPhone}
                      onChange={(e) => setDocPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">التخصص الطبي *</label>
                    <input
                      type="text"
                      required
                      placeholder="طب عام / أمراض باطنية"
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">رقم الترخيص الطبي *</label>
                    <input
                      type="text"
                      required
                      value={docLicense}
                      onChange={(e) => setDocLicense(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold">كلمة المرور المؤقتة الأولية *</label>
                    <button
                      type="button"
                      onClick={() => setDocPassword(generateRandomPassword())}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Sparkles className="w-3 h-3" /> توليد كلمة مرور آمنة
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    سيُطلب من الطبيب تغيير كلمة المرور هذه إلزاميًا عند أول تسجيل دخول.
                  </span>
                </div>

                <div>
                  <label className="font-bold block mb-1">نبذة مهنية (اختياري)</label>
                  <textarea
                    rows={2}
                    placeholder="خبرات الطبيب وسيرته المهنية..."
                    value={docBio}
                    onChange={(e) => setDocBio(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddDoctorOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDoctor}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingDoctor && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>إنشاء وتأهيل الطبيب الموظف</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Add Assistant */}
      {isAddAssistantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${containerClass} w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">إضافة وتفويض مساعد عيادة جديد</h3>
              </div>
              <button
                onClick={() => setIsAddAssistantOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assistantError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assistantError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAssistant} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1">اسم المساعد الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="أمينة حداد"
                  value={astName}
                  onChange={(e) => setAstName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="assistant@aafiya.dz"
                    value={astEmail}
                    onChange={(e) => setAstEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={astPhone}
                    onChange={(e) => setAstPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold">كلمة المرور المؤقتة الأولية *</label>
                  <button
                    type="button"
                    onClick={() => setAstPassword(generateRandomPassword())}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Sparkles className="w-3 h-3" /> توليد كلمة مرور آمنة
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={astPassword}
                  onChange={(e) => setAstPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-950 font-mono font-bold text-blue-600 dark:text-blue-400"
                />
              </div>

              {/* Delegated Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="font-bold block text-slate-700 dark:text-slate-300">
                  الصلاحيات المفوضة للمساعد (وفق سقف الأمان P2):
                </label>
                <div className="space-y-2">
                  {DELEGABLE_PERMISSIONS.map((perm) => {
                    const isChecked = astPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800' : cardBgClass
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAstPermissions([...astPermissions, perm.key]);
                            } else {
                              setAstPermissions(astPermissions.filter((k) => k !== perm.key));
                            }
                          }}
                          className="mt-0.5 rounded text-blue-600 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="font-bold block text-slate-900 dark:text-white">{perm.titleAr}</span>
                          <span className="text-[11px] text-slate-500 block">{perm.descAr}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAssistantOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAssistant}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAssistant && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>إنشاء وتفويض المساعد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Assistant Permissions */}
      {editingAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${containerClass} w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">تعديل صلاحيات {editingAssistant.name}</h3>
              </div>
              <button
                onClick={() => setEditingAssistant(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {DELEGABLE_PERMISSIONS.map((perm) => {
                const isChecked = editingPermissions.includes(perm.key);
                const title = locale === 'ar' ? perm.titleAr : locale === 'fr' ? perm.titleFr : perm.titleEn;
                const desc = locale === 'ar' ? perm.descAr : locale === 'fr' ? perm.descFr : perm.descEn;
                return (
                  <label
                    key={perm.key}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800' : cardBgClass
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingPermissions([...editingPermissions, perm.key]);
                        } else {
                          setEditingPermissions(editingPermissions.filter((k) => k !== perm.key));
                        }
                      }}
                      className="mt-0.5 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-slate-900 dark:text-white">{title}</span>
                      <span className="text-[11px] text-slate-500 block">{desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEditingAssistant(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
              >
                {savingPermissions && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{t('saveChanges')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Credentials Handoff Success Modal */}
      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${containerClass} w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-4`}>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">تم إنشاء الحساب بنجاح</h3>
              <p className="text-xs text-slate-500">
                يرجى تسليم بيانات الدخول المؤقتة هذه للموظف ليتمكن من الدخول وتغيير كلمة المرور.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b pb-1.5 border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">الصفة:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-sans">{createdCreds.roleTitle}</strong>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">الاسم:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-sans">{createdCreds.name}</strong>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">البريد:</span>
                <strong className="text-slate-900 dark:text-white">{createdCreds.email}</strong>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-sans">كلمة المرور المؤقتة:</span>
                <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 text-sm">
                  {createdCreds.password}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCopyCredentials}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ البيانات بنجاح!' : 'نسخ بيانات الدخول للموظف'}</span>
              </button>
            </div>

            <button
              onClick={() => setCreatedCreds(null)}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Staff Detail Drawer */}
      <StaffDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        clinicId={clinic?.id || ''}
        staffId={selectedStaffId}
        staffType={selectedStaffType}
        isDarkMode={isDarkMode}
        currentUserId={user?.id}
        currentDoctorId={user?.doctor?.id}
        onStaffUpdated={fetchStaffData}
        onEditAssistantPermissions={(ast) => {
          setIsDrawerOpen(false);
          handleOpenEditPermissions(ast);
        }}
      />

    </div>
  );
};
