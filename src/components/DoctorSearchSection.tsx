'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Building2, 
  FlaskConical, 
  Activity, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Phone,
  CalendarCheck2
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { WilayaSelect, SpecialtySelect } from './master-data';
import { masterDataService, MedicalSpecialty } from '../services/masterDataService';
import { api, getStoredToken } from '../lib/api';

export interface HealthcareProvider {
  id: string;
  name: string;
  role: RoleType;
  roleTitle: string;
  specialty: string;
  specialty_id?: number;
  city: string;
  wilaya_code?: string;
  address: string;
  mapsUrl: string;
  phone: string;
  rating?: number;
  reviewsCount?: number;
  availableDays?: string;
  workingHours?: string;
  image?: string;
  tags?: string[];
  is_verified?: boolean;
}

interface DirectoryItem {
  id: string;
  rawId: number | string;
  type: 'doctor' | 'clinic' | 'facility';
  role: RoleType;
  name: string;
  roleTitle: string;
  specialtyName: string;
  wilaya: string;
  address: string;
  phone: string;
  isVerified: boolean;
}

interface DoctorSearchSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
  }
  return name.slice(0, 2);
};

export const DoctorSearchSection: React.FC<DoctorSearchSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('directory');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('all');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Default Showcase Data States (max 3 per category)
  const [showcaseDoctors, setShowcaseDoctors] = useState<DirectoryItem[]>([]);
  const [showcaseClinics, setShowcaseClinics] = useState<DirectoryItem[]>([]);
  const [showcaseBookingCenters, setShowcaseBookingCenters] = useState<DirectoryItem[]>([]);
  const [showcaseLabs, setShowcaseLabs] = useState<DirectoryItem[]>([]);
  const [showcaseRadiology, setShowcaseRadiology] = useState<DirectoryItem[]>([]);

  // Search Results & Pagination States (max 10 per page)
  const [searchResults, setSearchResults] = useState<DirectoryItem[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);

  // Common UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialtiesMap, setSpecialtiesMap] = useState<Record<number, MedicalSpecialty>>({});

  const requestIdRef = useRef(0);

  // Check if user is currently filtering or searching
  const isSearching = Boolean(
    debouncedSearch.trim() || 
    selectedWilaya !== 'all' || 
    selectedSpecialty !== 'all' || 
    selectedRoleCategory !== 'all'
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Preload specialties for localized name lookup
  useEffect(() => {
    let isMounted = true;
    masterDataService.getSpecialties().then((specs) => {
      if (!isMounted) return;
      const map: Record<number, MedicalSpecialty> = {};
      specs.forEach((s) => {
        map[s.id] = s;
      });
      setSpecialtiesMap(map);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Listen to specialty selection from global search modal
  useEffect(() => {
    const handleSpecialtySelect = (e: CustomEvent<{ specialtyId: string }>) => {
      if (e.detail?.specialtyId) {
        setSelectedSpecialty(e.detail.specialtyId);
        setCurrentPage(1);
      }
    };
    window.addEventListener('aafiya:select-specialty' as any, handleSpecialtySelect as any);
    return () => {
      window.removeEventListener('aafiya:select-specialty' as any, handleSpecialtySelect as any);
    };
  }, []);

  // Helpers to map raw API models to unified DirectoryItem
  const mapDoctorToItem = useCallback((doc: any): DirectoryItem => {
    let specName = doc.specialty || '';
    if (doc.medical_specialty) {
      if (locale === 'ar') specName = doc.medical_specialty.name_ar;
      else if (locale === 'fr') specName = doc.medical_specialty.name_fr;
      else specName = doc.medical_specialty.name_en || doc.medical_specialty.name_fr;
    } else if (doc.specialty_id && specialtiesMap[doc.specialty_id]) {
      const s = specialtiesMap[doc.specialty_id];
      if (locale === 'ar') specName = s.name_ar;
      else if (locale === 'fr') specName = s.name_fr;
      else specName = s.name_en || s.name_fr;
    }

    const primaryClinic = Array.isArray(doc.clinics) && doc.clinics.length > 0 ? doc.clinics[0] : null;
    return {
      id: `doc-${doc.id}`,
      rawId: doc.id,
      type: 'doctor',
      role: 'doctor',
      name: doc.name || t('generic_doctor_name'),
      roleTitle: t('doctor_role_title'),
      specialtyName: specName || t('verified_practitioner'),
      wilaya: primaryClinic?.wilaya || '',
      address: primaryClinic?.address || primaryClinic?.name || '',
      phone: primaryClinic?.phone || '',
      isVerified: Boolean(doc.is_verified ?? true),
    };
  }, [locale, specialtiesMap, t]);

  const mapClinicToItem = useCallback((clinic: any): DirectoryItem => {
    let specName = clinic.director?.specialty || '';
    if (clinic.director?.medical_specialty) {
      if (locale === 'ar') specName = clinic.director.medical_specialty.name_ar;
      else if (locale === 'fr') specName = clinic.director.medical_specialty.name_fr;
      else specName = clinic.director.medical_specialty.name_en || clinic.director.medical_specialty.name_fr;
    }
    return {
      id: `clinic-${clinic.id}`,
      rawId: clinic.id,
      type: 'clinic',
      role: 'doctor',
      name: clinic.name || t('clinic_role_title'),
      roleTitle: t('clinic_role_title'),
      specialtyName: specName || t('clinic_role_title'),
      wilaya: clinic.wilaya || '',
      address: clinic.address || '',
      phone: clinic.phone || '',
      isVerified: Boolean(clinic.is_active ?? true),
    };
  }, [locale, t]);

  const mapBookingCenterToItem = useCallback((bc: any): DirectoryItem => {
    return {
      id: `bc-${bc.id}`,
      rawId: bc.id,
      type: 'facility',
      role: 'booking_center',
      name: bc.name || t('categories.booking_centers'),
      roleTitle: t('categories.booking_centers'),
      specialtyName: bc.wilaya ? `${bc.wilaya}` : t('categories.booking_centers'),
      wilaya: bc.wilaya || '',
      address: bc.address || '',
      phone: bc.phone || '',
      isVerified: bc.verification_status === 'verified',
    };
  }, [t]);

  const mapDiagnosticToItem = useCallback((dc: any, roleType: 'lab' | 'radiology'): DirectoryItem => {
    const isLab = roleType === 'lab';
    return {
      id: `dc-${dc.id}`,
      rawId: dc.id,
      type: 'facility',
      role: roleType,
      name: dc.name || (isLab ? t('categories.labs') : t('categories.radiology')),
      roleTitle: isLab ? t('categories.labs') : t('categories.radiology'),
      specialtyName: dc.wilaya ? `${dc.wilaya}` : (isLab ? t('categories.labs') : t('categories.radiology')),
      wilaya: dc.wilaya || '',
      address: dc.address || '',
      phone: dc.phone || '',
      isVerified: Boolean(dc.is_active ?? true),
    };
  }, [t]);

  // Main Directory Fetcher (Default Showcase vs Search Mode)
  const fetchDirectory = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    const token = getStoredToken();

    try {
      if (!isSearching) {
        // DEFAULT SHOWCASE MODE: Fetch up to 3 latest items per category
        const [docRes, clinicRes] = await Promise.all([
          api.publicGet<any[]>('/doctors?per_page=3').catch(() => null),
          api.publicGet<any[]>('/clinics?per_page=3').catch(() => null),
        ]);

        let bcRes = null;
        let labRes = null;
        let radRes = null;

        // Only query protected endpoints if visitor has a verified stored token
        if (token) {
          [bcRes, labRes, radRes] = await Promise.all([
            api.get<any[]>('/booking-centers?per_page=3').catch(() => null),
            api.get<any[]>('/diagnostic-centers?type=laboratory&per_page=3').catch(() => null),
            api.get<any[]>('/diagnostic-centers?type=radiology&per_page=3').catch(() => null),
          ]);
        }

        if (currentRequestId === requestIdRef.current) {
          setShowcaseDoctors(Array.isArray(docRes?.data) ? docRes.data.map(mapDoctorToItem).slice(0, 3) : []);
          setShowcaseClinics(Array.isArray(clinicRes?.data) ? clinicRes.data.map(mapClinicToItem).slice(0, 3) : []);
          setShowcaseBookingCenters(Array.isArray(bcRes?.data) ? bcRes.data.map(mapBookingCenterToItem).slice(0, 3) : []);
          setShowcaseLabs(Array.isArray(labRes?.data) ? labRes.data.map((item) => mapDiagnosticToItem(item, 'lab')).slice(0, 3) : []);
          setShowcaseRadiology(Array.isArray(radRes?.data) ? radRes.data.map((item) => mapDiagnosticToItem(item, 'radiology')).slice(0, 3) : []);
          setIsLoading(false);
        }
      } else {
        // ACTIVE SEARCH / FILTER MODE: Max 10 items per page with Pagination
        const perPage = 10;
        let results: DirectoryItem[] = [];
        let total = 0;
        let calculatedLastPage = 1;

        if (selectedRoleCategory === 'doctor') {
          const docParams = new URLSearchParams();
          if (debouncedSearch.trim()) docParams.append('search', debouncedSearch.trim());
          if (selectedWilaya !== 'all') docParams.append('wilaya', selectedWilaya);
          if (selectedSpecialty !== 'all') docParams.append('specialty_id', selectedSpecialty);
          docParams.append('per_page', String(perPage));
          docParams.append('page', String(currentPage));

          const res = await api.publicGet<any[]>(`/doctors?${docParams.toString()}`).catch(() => null);
          if (res && Array.isArray(res.data)) {
            results = res.data.map(mapDoctorToItem);
            total = res.meta?.total ?? results.length;
            calculatedLastPage = res.meta?.last_page ?? 1;
          }
        } else if (selectedRoleCategory === 'clinic') {
          const clinicParams = new URLSearchParams();
          if (selectedWilaya !== 'all') clinicParams.append('wilaya', selectedWilaya);
          if (selectedSpecialty !== 'all') clinicParams.append('specialty_id', selectedSpecialty);
          clinicParams.append('per_page', String(perPage));
          clinicParams.append('page', String(currentPage));

          const res = await api.publicGet<any[]>(`/clinics?${clinicParams.toString()}`).catch(() => null);
          if (res && Array.isArray(res.data)) {
            let mapped = res.data.map(mapClinicToItem);
            if (debouncedSearch.trim()) {
              const query = debouncedSearch.trim().toLowerCase();
              mapped = mapped.filter((c) => c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query));
            }
            results = mapped;
            total = res.meta?.total ?? results.length;
            calculatedLastPage = res.meta?.last_page ?? 1;
          }
        } else if (selectedRoleCategory === 'booking_center') {
          if (token) {
            const bcParams = new URLSearchParams();
            if (selectedWilaya !== 'all') bcParams.append('wilaya', selectedWilaya);
            bcParams.append('per_page', String(perPage));
            bcParams.append('page', String(currentPage));

            const res = await api.get<any[]>(`/booking-centers?${bcParams.toString()}`).catch(() => null);
            if (res && Array.isArray(res.data)) {
              results = res.data.map(mapBookingCenterToItem);
              total = res.meta?.total ?? results.length;
              calculatedLastPage = res.meta?.last_page ?? 1;
            }
          } else {
            results = [];
            total = 0;
            calculatedLastPage = 1;
          }
        } else if (selectedRoleCategory === 'lab') {
          if (token) {
            const labParams = new URLSearchParams();
            labParams.append('type', 'laboratory');
            if (selectedWilaya !== 'all') labParams.append('wilaya', selectedWilaya);
            labParams.append('per_page', String(perPage));
            labParams.append('page', String(currentPage));

            const res = await api.get<any[]>(`/diagnostic-centers?${labParams.toString()}`).catch(() => null);
            if (res && Array.isArray(res.data)) {
              results = res.data.map((item) => mapDiagnosticToItem(item, 'lab'));
              total = res.meta?.total ?? results.length;
              calculatedLastPage = res.meta?.last_page ?? 1;
            }
          } else {
            results = [];
            total = 0;
            calculatedLastPage = 1;
          }
        } else if (selectedRoleCategory === 'radiology') {
          if (token) {
            const radParams = new URLSearchParams();
            radParams.append('type', 'radiology');
            if (selectedWilaya !== 'all') radParams.append('wilaya', selectedWilaya);
            radParams.append('per_page', String(perPage));
            radParams.append('page', String(currentPage));

            const res = await api.get<any[]>(`/diagnostic-centers?${radParams.toString()}`).catch(() => null);
            if (res && Array.isArray(res.data)) {
              results = res.data.map((item) => mapDiagnosticToItem(item, 'radiology'));
              total = res.meta?.total ?? results.length;
              calculatedLastPage = res.meta?.last_page ?? 1;
            }
          } else {
            results = [];
            total = 0;
            calculatedLastPage = 1;
          }
        } else {
          // 'all' category active search: Query doctors (up to 10 per page)
          const docParams = new URLSearchParams();
          if (debouncedSearch.trim()) docParams.append('search', debouncedSearch.trim());
          if (selectedWilaya !== 'all') docParams.append('wilaya', selectedWilaya);
          if (selectedSpecialty !== 'all') docParams.append('specialty_id', selectedSpecialty);
          docParams.append('per_page', String(perPage));
          docParams.append('page', String(currentPage));

          const res = await api.publicGet<any[]>(`/doctors?${docParams.toString()}`).catch(() => null);
          if (res && Array.isArray(res.data)) {
            results = res.data.map(mapDoctorToItem);
            total = res.meta?.total ?? results.length;
            calculatedLastPage = res.meta?.last_page ?? 1;
          }
        }

        if (currentRequestId === requestIdRef.current) {
          setSearchResults(results);
          setTotalResults(total);
          setLastPage(calculatedLastPage);
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      if (currentRequestId === requestIdRef.current) {
        console.error('Unified Directory fetch error:', err);
        setError(t('error_loading'));
        setIsLoading(false);
      }
    }
  }, [
    isSearching,
    debouncedSearch,
    selectedRoleCategory,
    selectedWilaya,
    selectedSpecialty,
    currentPage,
    mapDoctorToItem,
    mapClinicToItem,
    mapBookingCenterToItem,
    mapDiagnosticToItem,
    t
  ]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Reset to page 1 and clear all filters to return to default showcase
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedRoleCategory('all');
    setSelectedWilaya('all');
    setSelectedSpecialty('all');
    setCurrentPage(1);
  };

  // Pagination page change with smooth scroll to section top
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const element = document.getElementById('search-directory');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const categoryTabs = [
    { id: 'all', label: t('tabs.all'), icon: Search },
    { id: 'doctor', label: t('tabs.doctor'), icon: Stethoscope },
    { id: 'clinic', label: t('tabs.clinic'), icon: Building2 },
    { id: 'booking_center', label: t('tabs.booking_center'), icon: CalendarCheck2 },
    { id: 'lab', label: t('tabs.lab'), icon: FlaskConical },
    { id: 'radiology', label: t('tabs.radiology'), icon: Activity },
  ];

  // Render individual provider card
  const renderCard = (item: DirectoryItem, idx: number) => {
    const isDoctor = item.type === 'doctor';
    const isClinic = item.type === 'clinic';
    const initials = getInitials(item.name);

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: Math.min(idx * 0.04, 0.4) }}
      >
        <Card variant="elevated" padding="none" className="h-full flex flex-col group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 border-transparent bg-white">
          
          {/* Header Banner */}
          <div className={`h-20 relative overflow-hidden ${
            isDoctor 
              ? 'bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-primary/10' 
              : isClinic
              ? 'bg-gradient-to-l from-indigo-500/10 via-sky-500/5 to-primary/10'
              : 'bg-gradient-to-l from-amber-500/10 via-teal-500/5 to-primary/10'
          }`}>
            <div className="absolute top-3 end-3 z-10">
              {item.isVerified && (
                <Badge variant="success" className="bg-white/95 backdrop-blur-sm border-emerald-100 text-[10px] font-black gap-1 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {t('verified_practitioner')}
                </Badge>
              )}
            </div>
          </div>

          <div className="px-6 -mt-8 flex-1 flex flex-col pb-6">
            {/* Authentic Local SVG Avatar Badge (Zero external Unsplash requests) */}
            <div className="relative mb-3">
              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center font-black text-lg border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-300 ${
                isDoctor
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                  : isClinic
                  ? 'bg-gradient-to-br from-indigo-600 to-primary text-white'
                  : item.role === 'booking_center'
                  ? 'bg-gradient-to-br from-sky-600 to-blue-700 text-white'
                  : item.role === 'lab'
                  ? 'bg-gradient-to-br from-teal-600 to-emerald-700 text-white'
                  : 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
              }`}>
                {isDoctor ? (
                  <span className="tracking-tight">{initials}</span>
                ) : isClinic ? (
                  <Building2 className="w-7 h-7 text-white" />
                ) : item.role === 'booking_center' ? (
                  <CalendarCheck2 className="w-7 h-7 text-white" />
                ) : item.role === 'lab' ? (
                  <FlaskConical className="w-7 h-7 text-white" />
                ) : (
                  <Activity className="w-7 h-7 text-white" />
                )}
              </div>
            </div>

            <div className="space-y-0.5 mb-3 text-start">
              <div className="text-[10px] font-black text-primary uppercase tracking-widest">
                {item.roleTitle}
              </div>
              <h3 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                {item.name}
              </h3>
            </div>

            <div className="space-y-3 flex-1 text-start">
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">
                  {t('specialty_label')}
                </div>
                <div className="text-xs font-bold text-slate-800 line-clamp-1">
                  {item.specialtyName}
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-bold text-slate-500">
                {item.address ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.address}</span>
                  </div>
                ) : item.wilaya ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{item.wilaya}</span>
                  </div>
                ) : null}

                {item.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span dir="ltr">{item.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Action */}
            <div className="mt-6 pt-3 border-t border-slate-100">
              <Button 
                fullWidth 
                onClick={() => onOpenAuth(item.role, false)}
                className="rounded-2xl font-black text-xs h-11"
              >
                <span>{isDoctor ? t('book_now') : isClinic ? t('contact_clinic') : t('book_now')}</span>
                {isRtl ? <ChevronLeft className="w-4 h-4 ms-1.5" /> : <ChevronRight className="w-4 h-4 ms-1.5" />}
              </Button>
            </div>

          </div>
        </Card>
      </motion.div>
    );
  };

  // Render accreditation callout card for protected roles when guest or unauthenticated
  const renderAccreditationNotice = (
    role: RoleType, 
    title: string, 
    desc: string,
    IconComponent: React.ElementType,
    badgeColor: string
  ) => {
    return (
      <Card variant="elevated" padding="none" className="col-span-full border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-xs overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${badgeColor}`}>
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-1.5 text-start">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900">{title}</h4>
                <Badge variant="info" className="text-[10px] font-black">
                  {t('section_badge')}
                </Badge>
              </div>
              <p className="text-xs font-bold text-slate-500 max-w-2xl leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAuth(role, false)}
              className="rounded-xl font-black text-xs flex-1 md:flex-initial"
            >
              {t('accreditation.login_cta')}
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenAuth(role, true)}
              className="rounded-xl font-black text-xs flex-1 md:flex-initial bg-primary hover:bg-primary/90"
            >
              {t('accreditation.apply_cta')}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <section id="search-directory" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge variant="info" icon={<Search className="w-4 h-4" />}>{t('section_badge')}</Badge>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-slate-500 font-bold leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Search & Filter Controls Panel */}
        <div className="space-y-8 mb-16">
          <Card variant="elevated" padding="md" className="border-transparent shadow-2xl shadow-slate-900/5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              <div className="lg:col-span-4 relative group">
                <div className="absolute inset-y-0 start-0 ps-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full ps-14 pe-6 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] text-slate-900 font-bold focus:outline-none focus:border-primary/20 focus:bg-white text-sm transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="lg:col-span-3 relative">
                <SpecialtySelect
                  value={selectedSpecialty}
                  onChange={(id) => {
                    setSelectedSpecialty(id);
                    setCurrentPage(1);
                  }}
                  includeAllOption={true}
                  allOptionLabel={t('all_specialties')}
                  icon={<Stethoscope className="w-5 h-5 text-primary" />}
                  className="ps-14 pe-6 py-4 h-[58px] bg-slate-50 border-2 border-transparent rounded-[24px] text-slate-900 font-bold focus:outline-none focus:border-primary/20 focus:bg-white text-sm transition-all cursor-pointer appearance-none"
                />
              </div>

              <div className="lg:col-span-3 relative">
                <WilayaSelect
                  value={selectedWilaya}
                  onChange={(code) => {
                    setSelectedWilaya(code);
                    setCurrentPage(1);
                  }}
                  includeAllOption={true}
                  allOptionLabel={t('all_provinces')}
                  icon={<MapPin className="w-5 h-5 text-primary" />}
                  className="ps-14 pe-6 py-4 h-[58px] bg-slate-50 border-2 border-transparent rounded-[24px] text-slate-900 font-bold focus:outline-none focus:border-primary/20 focus:bg-white text-sm transition-all cursor-pointer appearance-none"
                />
              </div>

              <div className="lg:col-span-2">
                <Button 
                  fullWidth 
                  size="lg" 
                  className="h-[52px]"
                  onClick={() => {
                    setCurrentPage(1);
                    fetchDirectory();
                  }}
                >
                  {t('search_cta')}
                </Button>
              </div>

            </div>
          </Card>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categoryTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = selectedRoleCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedRoleCategory(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-3.5 rounded-[20px] text-xs font-black transition-all flex items-center gap-3 shrink-0 group relative cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/20'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-primary'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info & Filter Reset (Active Search Mode) */}
        {isSearching && (
          <div className="flex items-center justify-between mb-8">
            <Badge variant="neutral" className="px-4 py-2 bg-white border-slate-100 font-black">
              {isLoading ? t('loading_directory') : t('results_found', { count: totalResults })}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters} 
              className="text-primary hover:bg-primary/5 font-black cursor-pointer"
            >
              {t('clear_filters')}
            </Button>
          </div>
        )}

        {/* Dynamic Display Area: Loading / Error / Showcase / Search Results */}
        {isLoading ? (
          /* Skeleton Loading Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <Card key={idx} variant="elevated" padding="none" className="h-full flex flex-col border-transparent animate-pulse">
                <div className="h-20 bg-slate-100" />
                <div className="px-6 -mt-8 flex-1 flex flex-col pb-6 space-y-4">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-200 border-4 border-white shadow-md" />
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-5 w-40 bg-slate-200 rounded" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
                    <div className="h-2.5 w-16 bg-slate-200 rounded" />
                    <div className="h-3.5 w-full bg-slate-200 rounded" />
                  </div>
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="pt-4 mt-auto">
                    <div className="h-10 bg-slate-200 rounded-2xl w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          /* Error & Retry State */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center max-w-md mx-auto"
          >
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[28px] flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{error}</h3>
            <p className="text-slate-500 font-bold mb-6 text-sm">{t('no_results_desc')}</p>
            <Button onClick={() => fetchDirectory()} className="rounded-2xl gap-2 font-black">
              <RefreshCw className="w-4 h-4" />
              <span>{t('retry')}</span>
            </Button>
          </motion.div>
        ) : isSearching ? (
          /* ACTIVE SEARCH MODE RESULTS (Max 10 per page + Pagination) */
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {searchResults.map((item, idx) => renderCard(item, idx))}
                </div>
              ) : (
                /* Authentic Empty Search State */
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 text-center max-w-lg mx-auto"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Search className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{t('no_results_title')}</h3>
                  <p className="text-slate-500 font-bold mb-8 text-sm leading-relaxed">{t('no_results_desc')}</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={handleClearFilters}
                      className="w-full sm:w-auto rounded-2xl font-black cursor-pointer"
                    >
                      {t('view_all')}
                    </Button>
                    <Button 
                      onClick={() => onOpenAuth('doctor', true)}
                      className="w-full sm:w-auto rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700"
                    >
                      {t('join_network_cta')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination Controls matching NewBookingWizardTab style */}
            {lastPage > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 pt-6 mt-8 gap-4 text-xs font-medium text-slate-600">
                <div>
                  {t('pagination_summary', {
                    total: totalResults,
                    page: currentPage,
                    lastPage: lastPage,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isLoading}
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs bg-white text-slate-700"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    <span>{t('prev_page')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= lastPage || isLoading}
                    onClick={() => handlePageChange(Math.min(lastPage, currentPage + 1))}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs bg-white text-slate-700"
                  >
                    <span>{t('next_page')}</span>
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT SHOWCASE MODE: Up to 3 cards per category, grouped in clear sections */
          <div className="space-y-16">
            
            {/* 1. Doctors Section (Max 3) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {t('categories.doctors')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {showcaseDoctors.length} {t('verified_practitioner')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoleCategory('doctor');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:bg-primary/5 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <span>{t('view_category_all')}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {showcaseDoctors.map((doc, idx) => renderCard(doc, idx))}
              </div>
            </div>

            {/* 2. Clinics Section (Max 3) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {t('categories.clinics')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {showcaseClinics.length} {t('clinic_role_title')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoleCategory('clinic');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:bg-primary/5 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <span>{t('view_category_all')}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {showcaseClinics.map((clinic, idx) => renderCard(clinic, idx))}
              </div>
            </div>

            {/* 3. Booking Centers Section (Max 3 or Accreditation Notice) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {t('categories.booking_centers')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {showcaseBookingCenters.length > 0 ? `${showcaseBookingCenters.length} ${t('tabs.booking_center')}` : t('section_badge')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoleCategory('booking_center');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:bg-primary/5 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <span>{t('view_category_all')}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {showcaseBookingCenters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {showcaseBookingCenters.map((bc, idx) => renderCard(bc, idx))}
                </div>
              ) : (
                renderAccreditationNotice(
                  'booking_center',
                  t('categories.booking_centers'),
                  t('accreditation.booking_centers_desc'),
                  CalendarCheck2,
                  'bg-gradient-to-br from-sky-600 to-blue-700'
                )
              )}
            </div>

            {/* 4. Laboratories Section (Max 3 or Accreditation Notice) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {t('categories.labs')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {showcaseLabs.length > 0 ? `${showcaseLabs.length} ${t('tabs.lab')}` : t('section_badge')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoleCategory('lab');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:bg-primary/5 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <span>{t('view_category_all')}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {showcaseLabs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {showcaseLabs.map((lab, idx) => renderCard(lab, idx))}
                </div>
              ) : (
                renderAccreditationNotice(
                  'lab',
                  t('categories.labs'),
                  t('accreditation.labs_desc'),
                  FlaskConical,
                  'bg-gradient-to-br from-teal-600 to-emerald-700'
                )
              )}
            </div>

            {/* 5. Radiology Section (Max 3 or Accreditation Notice) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {t('categories.radiology')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {showcaseRadiology.length > 0 ? `${showcaseRadiology.length} ${t('tabs.radiology')}` : t('section_badge')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoleCategory('radiology');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:bg-primary/5 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <span>{t('view_category_all')}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {showcaseRadiology.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {showcaseRadiology.map((rad, idx) => renderCard(rad, idx))}
                </div>
              ) : (
                renderAccreditationNotice(
                  'radiology',
                  t('categories.radiology'),
                  t('accreditation.radiology_desc'),
                  Activity,
                  'bg-gradient-to-br from-purple-600 to-indigo-700'
                )
              )}
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
