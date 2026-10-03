'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Lock, 
  Mail, 
  CheckCircle2, 
  User, 
  Stethoscope, 
  Building2, 
  FlaskConical, 
  Activity,
  MapPin,
  Phone,
  ShieldCheck,
  Fingerprint,
  CreditCard,
  ArrowRight,
  Shield,
  History,
  Globe
} from 'lucide-react';
import { RoleType } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Form';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../auth/AuthProvider';
import { WilayaSelect, CommuneSelect, SpecialtySelect } from './master-data';

const getDashboardPathForRole = (role: string, loc: string): string => {
  switch (role) {
    case 'admin':
      return `/${loc}/admin/dashboard`;
    case 'admin_assistant':
      return `/${loc}/admin/assistant-dashboard`;
    case 'doctor':
      return `/${loc}/doctor/dashboard`;
    case 'doctor_assistant':
      return `/${loc}/assistant/dashboard`;
    case 'booking_center':
      return `/${loc}/booking/dashboard`;
    case 'lab':
      return `/${loc}/laboratory/dashboard`;
    case 'lab_assistant':
      return `/${loc}/laboratory/assistant-dashboard`;
    case 'radiology':
      return `/${loc}/radiology/dashboard`;
    case 'rad_assistant':
      return `/${loc}/radiology/assistant-dashboard`;
    case 'patient_registered':
    case 'patient_guest':
      return `/${loc}/patient/dashboard`;
    default:
      return `/${loc}`;
  }
};

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: RoleType;
  isRegisterMode?: boolean;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  onClose,
  initialRole = 'patient_registered',
  isRegisterMode = false
}) => {
  const router = useRouter();
  const { login: authLogin, register: authRegister } = useAuth();
  const t = useTranslations('auth');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const [isRegister, setIsRegister] = useState<boolean>(isRegisterMode);
  const [selectedRole, setSelectedRole] = useState<RoleType>(initialRole);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setIsRegister(isRegisterMode);
      setSelectedRole(initialRole);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, isRegisterMode, initialRole]);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Specific Fields
  const [specialty, setSpecialty] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [address, setAddress] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [mapsLink, setMapsLink] = useState('');
  const [commercialRegister, setCommercialRegister] = useState('');

  const handleReset = () => {
    setSubmitted(false);
    setIsRegister(isRegisterMode);
    setSelectedRole(initialRole);
    setError(null);
    setLoading(false);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setSpecialty('');
    setSpecialtyId('');
    setLicenseNumber('');
    setFacilityName('');
    setDirectorName('');
    setAddress('');
    setWilaya('');
    setCommune('');
    setMapsLink('');
    setCommercialRegister('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isRegister) {
      try {
        const response = await authLogin({ email, password });
        // Authoritative role from backend response
        const userRoles = response?.user?.roles || [];
        const primaryRole = userRoles[0] || 'patient_registered';
        const targetPath = getDashboardPathForRole(primaryRole, locale);

        // Immediate direct window navigation to dashboard:
        // Keeps modal in loading state while browser navigates directly to target dashboard,
        // eliminating any intermediate flash or visibility of the /ar landing page!
        window.location.assign(targetPath);
      } catch (err: any) {
        setLoading(false);
        const status = err?.status || err?.response?.status || (err?.errors ? 422 : 0);
        if (status === 422 || status === 401) {
          setError(t('invalidCredentials'));
        } else {
          setError(err?.message || t('loginFailed'));
        }
      }
    } else {
      try {
        const response = await authRegister({
          name,
          email,
          phone,
          password,
          password_confirmation: password,
          role: selectedRole,
          specialty_id: selectedRole === 'doctor' && specialtyId ? parseInt(specialtyId, 10) : undefined,
          specialty: specialty || undefined,
          license_number: licenseNumber || (selectedRole === 'doctor' ? `DZ-ALG-2026-DOC-001` : undefined),
          clinic_name: facilityName || (selectedRole === 'doctor' ? `عيادة ${name}` : undefined),
          commercial_register: commercialRegister || undefined,
          manager_name: directorName || undefined,
          wilaya: wilaya || '16',
          commune: commune || undefined,
          address: address || 'الجزائر',
        });
        const userRoles = response?.user?.roles || [];
        const primaryRole = userRoles[0] || selectedRole;
        const targetPath = getDashboardPathForRole(primaryRole, locale);

        window.location.assign(targetPath);
      } catch (err: any) {
        setLoading(false);
        const errMsg = err?.response?.data?.message || err?.message || t('registrationFailed') || 'فشل إنشاء الحساب';
        setError(errMsg);
      }
    }
  };

  const accountTypes = [
    { id: 'patient_registered' as RoleType, label: t('patient'), icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'doctor' as RoleType, label: t('doctor'), icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'booking_center' as RoleType, label: t('bookingCenter'), icon: Building2, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'lab' as RoleType, label: t('lab'), icon: FlaskConical, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'radiology' as RoleType, label: t('radiology'), icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={isRegister ? "lg" : "md"}
      title={isRegister ? t('register') : t('login')}
      description={isRegister ? t('registerSubtitle') : t('loginSubtitle')}
    >
      <div className="space-y-6">
        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-6"
          >
            <div className="w-20 h-20 rounded-[28px] bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-sm border border-emerald-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">
                {isRegister ? t('submittedTitleRegister') : t('submittedTitleLogin')}
              </h4>
              <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto">
                {isRegister 
                  ? t('submittedDescRegister')
                  : t('submittedDescLogin')}
              </p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                {error}
              </div>
            )}
            
            {/* Login Tab Switcher */}
            {!isRegister && (
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                {(['patient_registered', 'provider'] as const).map((tab) => {
                  const isActive = tab === 'patient_registered' 
                    ? selectedRole === 'patient_registered' 
                    : selectedRole !== 'patient_registered';
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSelectedRole(tab === 'patient_registered' ? 'patient_registered' : 'doctor')}
                      className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                        isActive 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'patient_registered' ? t('patientPortal') : t('practitionerPortal')}
                    </button>
                  );
                })}
              </div>
            )}

            {isRegister && (
              <div className="space-y-4">
                <label className={cn("text-xs font-black text-slate-800 block", isRtl ? "mr-1" : "ml-1")}>{t('chooseAccountType')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {accountTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedRole(type.id)}
                      className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-2 group ${
                        selectedRole === type.id 
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${type.bg} ${type.color}`}>
                        <type.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-black ${selectedRole === type.id ? 'text-primary' : 'text-slate-600'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isRegister && (
                <>
                  {/* Common Name Field with Role-Specific Labels */}
                  <div className="md:col-span-2">
                    <Input
                      label={
                        selectedRole === 'patient_registered' ? t('fullName') : 
                        selectedRole === 'doctor' ? t('doctorFullName') :
                        selectedRole === 'booking_center' ? t('agencyName') :
                        selectedRole === 'lab' ? t('laboratoryName') :
                        t('centerName')
                      }
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('placeholderName')}
                    />
                  </div>

                  {/* Role-Specific Fields */}
                  {selectedRole === 'doctor' && (
                    <>
                      <Input
                        label={t('clinicName')}
                        required
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder={t('placeholderClinic')}
                      />
                      <SpecialtySelect
                        label={t('specialty')}
                        required
                        value={specialtyId}
                        onChange={(idStr, selectedSpec) => {
                          setSpecialtyId(idStr);
                          if (selectedSpec) {
                            setSpecialty(selectedSpec.name_ar);
                          } else {
                            setSpecialty('');
                          }
                        }}
                        placeholder={t('placeholderSpecialty')}
                      />
                      <Input
                        label={t('licenseNumber')}
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="12345678"
                      />
                    </>
                  )}

                  {selectedRole === 'booking_center' && (
                    <>
                      <Input
                        label={t('commercialRegister')}
                        required
                        value={commercialRegister}
                        onChange={(e) => setCommercialRegister(e.target.value)}
                        placeholder="RC-23/00-123456"
                      />
                      <Input
                        label={t('managerName')}
                        required
                        value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)}
                        placeholder={t('placeholderName')}
                      />
                    </>
                  )}

                  {(selectedRole === 'lab' || selectedRole === 'radiology') && (
                    <>
                      <Input
                        label={t('directorName')}
                        required
                        value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)}
                        placeholder={t('placeholderName')}
                      />
                      <Input
                        label={t('licenseNumber')}
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="LIC-12345"
                      />
                    </>
                  )}

                  <Input
                    label={t('phone')}
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={<Phone className="w-5 h-5" />}
                    placeholder="+213 --- -- -- --"
                  />
                  
                  <WilayaSelect
                    label={t('wilaya')}
                    required
                    value={wilaya}
                    onChange={(code) => {
                      setWilaya(code);
                      setCommune('');
                    }}
                    placeholder={t('placeholderWilaya')}
                  />

                  <CommuneSelect
                    label={t('commune')}
                    wilayaCode={wilaya}
                    value={commune}
                    onChange={setCommune}
                  />

                  {selectedRole !== 'patient_registered' && (
                    <>
                      <div className="md:col-span-2">
                        <Input
                          label={t('exactAddress')}
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          icon={<MapPin className="w-5 h-5" />}
                          placeholder={t('placeholderAddress')}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={t('googleMapsLink')}
                          value={mapsLink}
                          onChange={(e) => setMapsLink(e.target.value)}
                          icon={<Globe className="w-5 h-5" />}
                          placeholder={t('placeholderMaps')}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className={cn(isRegister ? "md:col-span-1" : "md:col-span-1")}>
                <Input
                  label={t('email')}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  placeholder={t('placeholderEmail')}
                />
              </div>

              <div className={cn(isRegister ? "md:col-span-1" : "md:col-span-1")}>
                <Input
                  label={t('password')}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  placeholder={t('placeholderPassword')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20" />
                <span className="text-xs text-slate-500 font-bold group-hover:text-slate-700 transition-colors">{t('rememberMe')}</span>
              </label>
              {!isRegister && (
                <button type="button" className="text-xs text-primary font-black hover:underline">{t('forgotPassword')}</button>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Button type="submit" fullWidth size="lg" loading={loading}>
                <ShieldCheck className={cn("w-5 h-5", isRtl ? "ml-2" : "mr-2")} />
                {isRegister ? t('submitRegister') : t('submitLogin')}
              </Button>
              
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs font-black text-slate-500 hover:text-primary transition-colors"
                >
                  {isRegister ? t('toggleLogin') : t('toggleRegister')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Security Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-500" />
            {t('encryption')}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
            <History className="w-4 h-4 text-blue-500" />
            {t('compliance')}
          </div>
        </div>
      </div>
    </Modal>
  );
};

