import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Search, Stethoscope, PackageCheck, MapPin, ExternalLink } from 'lucide-react';
import { FEATURES_LIST } from '../data/content';
import { PROVIDERS_DATA } from './DoctorSearchSection';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { masterDataService, MedicalSpecialty } from '../services/masterDataService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSpec?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onViewSpec }) => {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [specialtiesMap, setSpecialtiesMap] = useState<Record<number, MedicalSpecialty>>({});

  useEffect(() => {
    let isMounted = true;
    masterDataService.getSpecialties().then((specs) => {
      if (!isMounted) return;
      const map: Record<number, MedicalSpecialty> = {};
      specs.forEach((s) => { map[s.id] = s; });
      setSpecialtiesMap(map);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const getProviderSpecialty = (p: typeof PROVIDERS_DATA[0]) => {
    if (p.specialty_id && specialtiesMap[p.specialty_id]) {
      const s = specialtiesMap[p.specialty_id];
      if (locale === 'ar') return s.name_ar;
      if (locale === 'fr') return s.name_fr;
      return s.name_en || s.name_fr;
    }
    return p.specialty;
  };

  const filteredProviders = PROVIDERS_DATA.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    getProviderSpecialty(p).toLowerCase().includes(query.toLowerCase()) ||
    p.city.toLowerCase().includes(query.toLowerCase()) ||
    p.address.toLowerCase().includes(query.toLowerCase())
  );

  const filteredFeatures = FEATURES_LIST.filter(f => 
    f.title.toLowerCase().includes(query.toLowerCase()) || 
    f.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleGoToDirectory = () => {
    onClose();
    const el = document.getElementById('search-directory');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      size="lg"
      className="!rounded-[24px]" // Slightly sharper for search
    >
      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative group">
          <Input
            autoFocus
            placeholder="ابحث عن طبيب، تخصص، مركز صحي، ولاية..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 text-lg border-primary/20 focus:ring-primary/5 bg-slate-50/50"
            icon={<Search className="w-6 h-6 text-primary" />}
          />
        </div>

        {/* Results */}
        <div className="space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
          
          {/* Healthcare Providers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h4 className="text-sm font-black text-slate-900 tracking-tight">الأطباء والخدمات ({filteredProviders.length})</h4>
              </div>
              <button 
                onClick={handleGoToDirectory} 
                className="text-[11px] font-black text-primary hover:bg-primary/5 px-3 py-1.5 rounded-xl transition-colors"
              >
                فتح الدليل الكامل
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {filteredProviders.slice(0, 5).map((provider) => (
                <div 
                  key={provider.id} 
                  className="group p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{provider.name}</span>
                        <Badge variant="info" className="scale-90">{provider.roleTitle}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold">
                        <span className="flex items-center gap-1.5">
                          {getProviderSpecialty(provider)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary/60" />
                          {provider.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={provider.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 bg-slate-200 rounded-full" />
              <h4 className="text-sm font-black text-slate-900 tracking-tight">وظائف المنصة والباقات</h4>
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
