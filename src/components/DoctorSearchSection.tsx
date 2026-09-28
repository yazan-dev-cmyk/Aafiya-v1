'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Building2, 
  FlaskConical, 
  Activity, 
  Star, 
  Clock, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RoleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface HealthcareProvider {
  id: string;
  name: string;
  role: RoleType;
  roleTitle: string;
  specialty: string;
  city: string;
  address: string;
  mapsUrl: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  availableDays: string;
  workingHours: string;
  image: string;
  tags: string[];
}

export const PROVIDERS_DATA: HealthcareProvider[] = [
  {
    id: 'doc-1',
    name: 'د. سليم العمراني',
    role: 'doctor',
    roleTitle: 'طبيب استشاري',
    specialty: 'أمراض القلب والشرايين والقسطرة العلاجية',
    city: 'الجزائر العاصمة',
    address: 'شارع ديدوش مراد، بناية 42، الطابق 3، الجزائر العاصمة',
    mapsUrl: 'https://maps.google.com/?q=36.7753,3.0601',
    phone: '+213 21 63 45 10',
    rating: 4.9,
    reviewsCount: 128,
    availableDays: 'الأحد - الخميس',
    workingHours: '08:30 - 16:30',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    tags: ['تخطيط القلب', 'إيكو دبلر', 'قسطرة']
  },
  {
    id: 'doc-2',
    name: 'د. مريم القاسمي',
    role: 'doctor',
    roleTitle: 'طبيبة أخصائية',
    specialty: 'أمراض الباطنية والجهاز الهضمي والمنظار',
    city: 'وهران',
    address: 'حي العقيد لطفي، المجمع الطبي الشفاء، وهران',
    mapsUrl: 'https://maps.google.com/?q=35.6971,-0.6308',
    phone: '+213 41 53 12 90',
    rating: 4.8,
    reviewsCount: 94,
    availableDays: 'السبت - الأربعاء',
    workingHours: '09:00 - 17:00',
    image: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?w=300&auto=format&fit=crop&q=80',
    tags: ['مناظير', 'فحص المعدة', 'قولون']
  },
  {
    id: 'center-1',
    name: 'مركز الحجز السريع للخدمات الصحية',
    role: 'booking_center',
    roleTitle: 'مركز حجز معتمد',
    specialty: 'تنسيق وحجز المواعيد الطبية لجميع التخصصات',
    city: 'الجزائر العاصمة',
    address: 'حي باب الزوار، مقابل محطة الترامواي، الجزائر العاصمة',
    mapsUrl: 'https://maps.google.com/?q=36.7167,3.1833',
    phone: '+213 23 83 20 00',
    rating: 5.0,
    reviewsCount: 310,
    availableDays: 'طيلة أيام الأسبوع',
    workingHours: '08:00 - 20:00',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80',
    tags: ['حجز فوري', 'دعم 24/7', 'باقات معتمدة']
  },
  {
    id: 'lab-1',
    name: 'مخبر الأمل للتحاليل الطبية الشاملة',
    role: 'lab',
    roleTitle: 'مخبر تحاليل طبية',
    specialty: 'تحاليل الدم، البيوكيمياء، والهرمونات والجينات',
    city: 'قسنطينة',
    address: 'حي سيدي مبروك، شارع الاستقلال، قسنطينة',
    mapsUrl: 'https://maps.google.com/?q=36.3650,6.6147',
    phone: '+213 31 92 40 11',
    rating: 4.9,
    reviewsCount: 156,
    availableDays: 'السبت - الخميس',
    workingHours: '07:00 - 18:00',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=300&auto=format&fit=crop&q=80',
    tags: ['نتائج رقمية', 'سحب من المنزلي', 'تحاليل دقيقة']
  },
  {
    id: 'radio-1',
    name: 'مركز الشفاء التشخيصي للأشعة والرنين',
    role: 'radiology',
    roleTitle: 'مركز تصوير وإشعاع',
    specialty: 'أشعة سكانر (CT)، رنين مغناطيسي (MRI)، وإيكوغرافيا',
    city: 'البليدة',
    address: 'شارع أول نوفمبر، مقابل المستشفى الجامعي، البليدة',
    mapsUrl: 'https://maps.google.com/?q=36.4700,2.8300',
    phone: '+213 25 39 88 77',
    rating: 4.7,
    reviewsCount: 88,
    availableDays: 'الأحد - الخميس',
    workingHours: '08:00 - 17:30',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&auto=format&fit=crop&q=80',
    tags: ['MRI رنين', 'سكانر ثلاثي الأبعاد', 'أشعة سينية']
  },
  {
    id: 'doc-3',
    name: 'د. أمين منصوري',
    role: 'doctor',
    roleTitle: 'طبيب أخصائي',
    specialty: 'جراحة العظام والمفاصل والإصابات الرياضية',
    city: 'سطيف',
    address: 'شارع 8 ماي 1945، مجمع الأطباء، سطيف',
    mapsUrl: 'https://maps.google.com/?q=36.1900,5.4100',
    phone: '+213 36 84 10 20',
    rating: 4.8,
    reviewsCount: 112,
    availableDays: 'السبت - الأربعاء',
    workingHours: '09:00 - 16:00',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    tags: ['مفاصل', 'منظار الركبة', 'كسور']
  },
  {
    id: 'center-2',
    name: 'مركز الأوراس لتنسيق الخدمات الصحية',
    role: 'booking_center',
    roleTitle: 'مركز حجز معتمد',
    specialty: 'استقبال وحجز المواعيد للمواطنين والزوار',
    city: 'عنابة',
    address: 'حي الكورنيش، مقابل مقر الولاية القديم، عنابة',
    mapsUrl: 'https://maps.google.com/?q=36.9000,7.7667',
    phone: '+213 38 45 90 00',
    rating: 4.9,
    reviewsCount: 145,
    availableDays: ' طيلة أيام الأسبوع',
    workingHours: '08:00 - 19:00',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&auto=format&fit=crop&q=80',
    tags: ['حجز مؤكد', 'متابعة الهاتف', 'مواعيد مستعجلة']
  },
  {
    id: 'doc-4',
    name: 'د. فاطمة الزهراء شريفي',
    role: 'doctor',
    roleTitle: 'طبيبة استشارية',
    specialty: 'طب الأطفال والحديثي الولادة والنمو',
    city: 'تلمسان',
    address: 'شارع امبارك الميلي، حومة الجامع، تلمسان',
    mapsUrl: 'https://maps.google.com/?q=34.8828,-1.3167',
    phone: '+213 43 27 60 50',
    rating: 5.0,
    reviewsCount: 175,
    availableDays: 'الأحد - الخميس',
    workingHours: '08:30 - 16:00',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    tags: ['رضع', 'لقاحات', 'متابعة النمو']
  }
];

interface DoctorSearchSectionProps {
  onOpenAuth: (role?: RoleType, isRegister?: boolean) => void;
}

export const DoctorSearchSection: React.FC<DoctorSearchSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('directory');
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const cityKeys = ['all', 'algiers', 'oran', 'constantine', 'annaba', 'blida', 'setif', 'tlemcen'];

  const categoryTabs = [
    { id: 'all', label: t('tabs.all'), icon: Search },
    { id: 'doctor', label: t('tabs.doctor'), icon: Stethoscope },
    { id: 'booking_center', label: t('tabs.booking_center'), icon: Building2 },
    { id: 'lab', label: t('tabs.lab'), icon: FlaskConical },
    { id: 'radiology', label: t('tabs.radiology'), icon: Activity },
  ];

  const filteredProviders = PROVIDERS_DATA.filter((provider) => {
    const matchesRole = selectedRoleCategory === 'all' || provider.role === selectedRoleCategory;
    
    // City match is trickier because we use keys now. 
    // PROVIDERS_DATA city is still Arabic/Hardcoded. 
    // I should match by provider.city (hardcoded) against t(`cities.${cityKey}`)
    const matchesCity = selectedCity === 'all' || provider.city === t(`cities.${selectedCity}`);

    const query = searchTerm.trim().toLowerCase();
    
    // For search, we should ideally search translated content
    const pName = t(`providers.${provider.id}.name`).toLowerCase();
    const pSpec = t(`providers.${provider.id}.specialty`).toLowerCase();
    const pAddr = t(`providers.${provider.id}.address`).toLowerCase();
    const pCity = t(`providers.${provider.id}.city`).toLowerCase();
    
    const matchesQuery = 
      !query || 
      pName.includes(query) ||
      pSpec.includes(query) ||
      pAddr.includes(query) ||
      pCity.includes(query) ||
      provider.tags.some((_, i) => t(`providers.${provider.id}.tags.${i}`).toLowerCase().includes(query));

    return matchesRole && matchesCity && matchesQuery;
  });

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

        {/* Search & ListFilter Controls Panel */}
        <div className="space-y-8 mb-16">
          <Card variant="elevated" padding="md" className="border-transparent shadow-2xl shadow-slate-900/5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              <div className="lg:col-span-7 relative group">
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
                <div className="absolute inset-y-0 start-0 ps-5 flex items-center pointer-events-none text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full ps-14 pe-6 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] text-slate-900 font-bold focus:outline-none focus:border-primary/20 focus:bg-white text-sm transition-all cursor-pointer appearance-none"
                >
                  <option value="all">{t('all_provinces')}</option>
                  {cityKeys.filter(c => c !== 'all').map(cityKey => (
                    <option key={cityKey} value={cityKey}>{t(`cities.${cityKey}`)}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <Button fullWidth size="lg" className="h-[52px]">{t('search_cta')}</Button>
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
                  onClick={() => setSelectedRoleCategory(tab.id)}
                  className={`px-6 py-3.5 rounded-[20px] text-xs font-black transition-all flex items-center gap-3 shrink-0 group relative ${
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

        {/* Results Info */}
        <div className="flex items-center justify-between mb-8">
          <Badge variant="neutral" className="px-4 py-2 bg-white border-slate-100 font-black">
            {t('results_found', { count: filteredProviders.length })}
          </Badge>
          {(searchTerm || selectedRoleCategory !== 'all' || selectedCity !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setSelectedRoleCategory('all'); setSelectedCity('all'); }} className="text-primary hover:bg-primary/5 font-black">
              {t('clear_filters')}
            </Button>
          )}
        </div>

        {/* Providers Grid */}
        <AnimatePresence mode="popLayout">
          {filteredProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProviders.map((provider, idx) => (
                <motion.div
                  key={provider.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card variant="elevated" padding="none" className="h-full flex flex-col group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-transparent">
                    {/* Header Image/Banner */}
                    <div className="h-24 bg-gradient-to-l from-primary/10 to-indigo-100 relative overflow-hidden">
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="warning" className="bg-white/90 backdrop-blur-sm border-amber-100">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 ml-1" />
                          {provider.rating}
                        </Badge>
                      </div>
                    </div>

                    <div className="px-6 -mt-10 flex-1 flex flex-col pb-6">
                      <div className="relative mb-4">
                        <img 
                          src={provider.image} 
                          alt={provider.name}
                          className="w-20 h-20 rounded-[24px] object-cover border-4 border-white shadow-xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="space-y-1 mb-4 text-start">
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest">{t(`providers.${provider.id}.roleTitle`)}</div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">{t(`providers.${provider.id}.name`)}</h3>
                      </div>

                      <div className="space-y-4 flex-1 text-start">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/80">
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('specialty_label')}</div>
                          <div className="text-xs font-bold text-slate-700 line-clamp-2">{t(`providers.${provider.id}.specialty`)}</div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs font-bold text-slate-500">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <span>{t(`providers.${provider.id}.address`)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>{t(`providers.${provider.id}.availableDays`)} • {provider.workingHours}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {provider.tags.map((_, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-black">
                              #{t(`providers.${provider.id}.tags.${i}`)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => window.open(provider.mapsUrl, '_blank')}
                          className="rounded-2xl shrink-0"
                        >
                          <MapPin className="w-5 h-5" />
                        </Button>
                        <Button 
                          fullWidth 
                          onClick={() => onOpenAuth(provider.role, false)}
                          className="rounded-2xl font-black"
                        >
                          <span>{t('book_now')}</span>
                          {locale === 'ar' ? <ChevronLeft className="w-4 h-4 ms-2" /> : <ChevronRight className="w-4 h-4 ms-2" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center"
            >
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Search className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{t('no_results_title')}</h3>
              <p className="text-slate-500 font-bold mb-8 max-w-md mx-auto">{t('no_results_desc')}</p>
              <Button onClick={() => { setSearchTerm(''); setSelectedRoleCategory('all'); setSelectedCity('all'); }}>{t('view_all')}</Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
};
