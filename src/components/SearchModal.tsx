import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Search, Stethoscope, PackageCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { FEATURES_LIST } from '../data/content';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { masterDataService, MedicalSpecialty } from '../services/masterDataService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSpec?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const isRtl = locale === 'ar';

  useEffect(() => {
    let isMounted = true;
    masterDataService.getSpecialties().then((specs) => {
      if (!isMounted) return;
      setSpecialties(specs);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const getSpecialtyName = (s: MedicalSpecialty) => {
    if (locale === 'ar') return s.name_ar;
    if (locale === 'fr') return s.name_fr;
    return s.name_en || s.name_fr || s.name_ar;
  };

  const filteredSpecialties = specialties.filter(s => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.name_ar.toLowerCase().includes(q) ||
      s.name_fr.toLowerCase().includes(q) ||
      (s.name_en && s.name_en.toLowerCase().includes(q)) ||
      s.code.toLowerCase().includes(q);
  });

  const filteredFeatures = FEATURES_LIST.filter(f => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return f.title.toLowerCase().includes(q) || 
      f.description.toLowerCase().includes(q);
  });

  const handleGoToDirectory = (specialtyId?: number) => {
    onClose();
    const el = document.getElementById('search-directory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      if (specialtyId !== undefined) {
        window.dispatchEvent(new CustomEvent('aafiya:select-specialty', { detail: { specialtyId: String(specialtyId) } }));
      }
    }
  };

  const labels = {
    placeholder: locale === 'ar' 
      ? 'ابحث عن تخصص طبي، خدمة صحية، وظيفة في المنصة...' 
      : locale === 'fr' 
        ? 'Rechercher une spécialité, service, fonction...' 
        : 'Search medical specialty, health service, feature...',
    specialtiesTitle: locale === 'ar' ? 'التخصصات الطبية المعتمدة' : locale === 'fr' ? 'Spécialités Médicales Agréées' : 'Accredited Medical Specialties',
    openFullDirectory: locale === 'ar' ? 'فتح الدليل الموحد' : locale === 'fr' ? 'Ouvrir l\'annuaire unifié' : 'Open Unified Directory',
    featuresTitle: locale === 'ar' ? 'وظائف المنصة والباقات' : locale === 'fr' ? 'Fonctionnalités et Forfaits' : 'Platform Features & Quotas',
    searchInDirectory: locale === 'ar' ? 'البحث عن أطباء وعيادات في الدليل' : locale === 'fr' ? 'Rechercher dans l\'annuaire des praticiens' : 'Search practitioners in directory',
    noSpecialties: locale === 'ar' ? 'لا توجد تخصصات مطابقة' : locale === 'fr' ? 'Aucune spécialité trouvée' : 'No matching specialties',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      size="lg"
      className="!rounded-2xl sm:!rounded-[24px]"
    >
      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative group">
          <Input
            autoFocus
            placeholder={labels.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 text-lg border-primary/20 focus:ring-primary/5 bg-slate-50/50"
            icon={<Search className="w-6 h-6 text-primary" />}
          />
        </div>

        {/* Quick Directory CTA banner */}
        <div 
          onClick={() => handleGoToDirectory()}
          className="p-3.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">{labels.searchInDirectory}</p>
              {query && (
                <p className="text-[11px] text-primary font-bold">"{query}"</p>
              )}
            </div>
          </div>
          <button 
            type="button"
            className="text-xs font-black text-primary flex items-center gap-1"
          >
            {labels.openFullDirectory}
            {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-8 max-h-[55vh] overflow-y-auto custom-scrollbar px-1">
          
          {/* Medical Specialties */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h4 className="text-sm font-black text-slate-900 tracking-tight">
                  {labels.specialtiesTitle} ({filteredSpecialties.length})
                </h4>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredSpecialties.slice(0, 6).map((spec) => (
                <div 
                  key={spec.id} 
                  onClick={() => handleGoToDirectory(spec.id)}
                  className="group p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">
                        {getSpecialtyName(spec)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{spec.code}</p>
                    </div>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">
                    {labels.openFullDirectory}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 bg-slate-200 rounded-full" />
              <h4 className="text-sm font-black text-slate-900 tracking-tight">{labels.featuresTitle}</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredFeatures.slice(0, 2).map((feat) => (
                <div key={feat.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-primary" />
                    <h5 className="text-[13px] font-black text-slate-900">{feat.title}</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] font-satisfy">Aafiya Global Search</p>
        </div>
      </div>
    </Modal>
  );
};
