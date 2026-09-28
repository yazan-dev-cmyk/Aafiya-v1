'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  TrendingUp, 
  MousePointer2, 
  BarChart3,
  Calendar,
  MapPin,
  Users,
  Stethoscope,
  X,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { Advertisement, AdPlacement, AdAudience, AdStatus } from '../../types/advertisement';
import { advertisementService } from '@/services/advertisementService';
import { motion, AnimatePresence } from 'motion/react';

export function AdvertisementManagement() {
  const t = useTranslations('admin.ads');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await advertisementService.getActiveAds();
        if (res.data && res.data.length > 0) {
          const liveAds: Advertisement[] = res.data.map((ad) => ({
            id: ad.id,
            title: ad.title,
            description: ad.content,
            imageUrl: ad.banner_image_url || 'https://images.unsplash.com/photo-1579152276503-34988636b13e',
            targetUrl: ad.target_url || '/packages',
            placement: [ad.placement as any],
            audience: [ad.target_role as any || 'PATIENTS'],
            startDate: '2026-08-01',
            endDate: '2026-09-30',
            status: ad.status === 'active' ? 'ACTIVE' : 'PAUSED',
            metrics: {
              impressions: ad.impressions_count || 0,
              clicks: ad.clicks_count || 0,
              ctr: ad.impressions_count ? Number(((ad.clicks_count / ad.impressions_count) * 100).toFixed(1)) : 0,
            },
            createdAt: '2026-08-21',
          }));
          setAds(liveAds);
        } else {
          setAds([]);
        }
      } catch {
        setAds([]);
      }
    };
    fetchAds();
  }, []);

  const filteredAds = ads.filter(ad => {
    const matchesStatus = filterStatus === 'ALL' || ad.status === filterStatus;
    const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ad.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleStatus = (id: string) => {
    setAds(prev => prev.map(ad => {
      if (ad.id === id) {
        const newStatus: AdStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        return { ...ad, status: newStatus };
      }
      return ad;
    }));
  };

  const deleteAd = (id: string) => {
    if (confirm(t('form.confirmDelete'))) {
      setAds(prev => prev.filter(ad => ad.id !== id));
    }
  };

  const handleSaveAd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newAd: Advertisement = {
      id: editingAd?.id || `AD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      imageUrl: formData.get('imageUrl') as string,
      targetUrl: formData.get('targetUrl') as string,
      placement: (formData.getAll('placement') as AdPlacement[]),
      audience: (formData.getAll('audience') as AdAudience[]),
      targetSpecialty: formData.get('targetSpecialty') as string || undefined,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: (formData.get('status') as AdStatus) || 'ACTIVE',
      metrics: editingAd?.metrics || { impressions: 0, clicks: 0, ctr: 0 },
      createdAt: editingAd?.createdAt || new Date().toISOString().split('T')[0]
    };

    if (editingAd) {
      setAds(prev => prev.map(ad => ad.id === editingAd.id ? newAd : ad));
    } else {
      setAds(prev => [newAd, ...prev]);
    }
    
    setIsModalOpen(false);
    setEditingAd(null);
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingAd(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-teal-600" />
            {t('title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t('subtitle')}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {t('createNew')}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t('stats.total')}</span>
          </div>
          <p className="text-xl font-black text-slate-900">{ads.length}</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t('stats.active')}</span>
          </div>
          <p className="text-xl font-black text-emerald-600">{ads.filter(a => a.status === 'ACTIVE').length}</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t('stats.impressions')}</span>
          </div>
          <p className="text-xl font-black text-slate-900">
            {ads.reduce((acc, curr) => acc + curr.metrics.impressions, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MousePointer2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t('stats.ctr')}</span>
          </div>
          <p className="text-xl font-black text-teal-600">
            {(ads.reduce((acc, curr) => acc + curr.metrics.ctr, 0) / (ads.length || 1)).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('filters.searchPlaceholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-10 ps-4 py-2 text-xs focus:outline-none focus:border-teal-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="ALL">{t('filters.statusAll')}</option>
            <option value="ACTIVE">{t('filters.statusActive')}</option>
            <option value="PAUSED">{t('filters.statusPaused')}</option>
            <option value="SCHEDULED">{t('filters.statusScheduled')}</option>
            <option value="ENDED">{t('filters.statusEnded')}</option>
          </select>
        </div>
      </div>

      {/* Ads Grid/List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAds.map((ad) => (
          <motion.div 
            layout
            key={ad.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-teal-500/50 transition-colors shadow-xs group"
          >
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Ad Image Preview */}
              <div className="w-full md:w-64 h-40 md:h-auto relative bg-slate-100 flex-shrink-0">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 end-3">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${
                    ad.status === 'ACTIVE' ? 'bg-emerald-500 text-white' :
                    ad.status === 'PAUSED' ? 'bg-amber-500 text-white' :
                    ad.status === 'SCHEDULED' ? 'bg-blue-500 text-white' :
                    'bg-slate-500 text-white'
                  }`}>
                    {ad.status === 'ACTIVE' ? t('filters.statusActive') : 
                     ad.status === 'PAUSED' ? t('filters.statusPaused') : 
                     ad.status === 'SCHEDULED' ? t('filters.statusScheduled') : t('filters.statusEnded')}
                  </span>
                </div>
              </div>

              {/* Ad Content */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-black text-slate-900">{ad.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{ad.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(ad)}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-colors"
                        title={t('table.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(ad.id)}
                        className={`p-2 hover:bg-slate-100 rounded-xl transition-colors ${
                          ad.status === 'ACTIVE' ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                        }`}
                        title={ad.status === 'ACTIVE' ? t('table.pause') : t('table.play')}
                      >
                        {ad.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => deleteAd(ad.id)}
                        className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                        title={t('table.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">
                      <MapPin className="w-3 h-3" />
                      <span>{t('table.placements', { count: ad.placement.length })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">
                      <Users className="w-3 h-3" />
                      <span>{t('table.audience', { count: ad.audience.length })}</span>
                    </div>
                    {ad.targetSpecialty && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-bold border border-teal-200">
                        <Stethoscope className="w-3 h-3" />
                        <span>{t('table.specialty', { specialty: ad.targetSpecialty })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">
                      <Calendar className="w-3 h-3" />
                      <span>{t('table.period', { start: ad.startDate, end: ad.endDate })}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Impressions</span>
                    <p className="text-sm font-black text-slate-900">{ad.metrics.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Clicks</span>
                    <p className="text-sm font-black text-slate-900">{ad.metrics.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">CTR</span>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-sm font-black text-teal-600">{ad.metrics.ctr}%</p>
                      <TrendingUp className="w-3 h-3 text-teal-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredAds.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('empty.title')}</h3>
            <p className="text-sm text-slate-500 mb-6">{t('empty.subtitle')}</p>
            <button 
              onClick={openCreateModal}
              className="bg-teal-600 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-teal-600/20"
            >
              {t('createNew')}
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden relative my-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{editingAd ? t('form.editTitle') : t('form.createTitle')}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('form.engine')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAd} className="p-8 space-y-8">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-s-4 border-teal-500 ps-3">{t('form.basicInfo')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 ps-1">{t('form.adTitle')}</label>
                      <input 
                        name="title"
                        required
                        defaultValue={editingAd?.title}
                        placeholder={t('form.adTitlePlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 ps-1">{t('form.imageUrl')}</label>
                      <div className="relative">
                        <ImageIcon className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          name="imageUrl"
                          required
                          defaultValue={editingAd?.imageUrl}
                          placeholder="https://example.com/banner.jpg"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pe-11 ps-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 ps-1">{t('form.description')}</label>
                    <textarea 
                      name="description"
                      required
                      defaultValue={editingAd?.description}
                      rows={3}
                      placeholder={t('form.descriptionPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 ps-1">{t('form.targetUrl')}</label>
                    <input 
                      name="targetUrl"
                      required
                      defaultValue={editingAd?.targetUrl}
                      placeholder="مثال: /packages أو https://external-link.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Targeting */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-s-4 border-blue-500 ps-3">{t('form.targeting')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {t('form.placement')}
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { val: 'HOMEPAGE', label: t('placements.HOMEPAGE') },
                          { val: 'PATIENT_DASHBOARD', label: t('placements.PATIENT_DASHBOARD') },
                          { val: 'DOCTOR_DASHBOARD', label: t('placements.DOCTOR_DASHBOARD') },
                          { val: 'BOOKING_CENTER', label: t('placements.BOOKING_CENTER') },
                          { val: 'LABORATORY', label: t('placements.LABORATORY') },
                          { val: 'RADIOLOGY', label: t('placements.RADIOLOGY') }
                        ].map(item => (
                          <label key={item.val} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-white hover:border-teal-500 transition-all group">
                            <input 
                              type="checkbox" 
                              name="placement" 
                              value={item.val}
                              defaultChecked={editingAd?.placement.includes(item.val as AdPlacement)}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" 
                            />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {t('form.audience')}
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { val: 'PATIENTS', label: t('audiences.PATIENTS') },
                          { val: 'DOCTORS', label: t('audiences.DOCTORS') },
                          { val: 'LAB_STAFF', label: t('audiences.LAB_STAFF') },
                          { val: 'RAD_STAFF', label: t('audiences.RAD_STAFF') },
                          { val: 'BOOKING_AGENTS', label: t('audiences.BOOKING_AGENTS') },
                          { val: 'ALL', label: t('audiences.ALL') }
                        ].map(item => (
                          <label key={item.val} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-white hover:border-blue-500 transition-all group">
                            <input 
                              type="checkbox" 
                              name="audience" 
                              value={item.val}
                              defaultChecked={editingAd?.audience.includes(item.val as AdAudience)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 ps-1">{t('form.specialty')}</label>
                    <div className="relative">
                      <Stethoscope className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        name="targetSpecialty"
                        defaultValue={editingAd?.targetSpecialty}
                        placeholder={t('form.specialtyPlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pe-11 ps-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ps-1 font-bold">{t('form.specialtyHint')}</p>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-s-4 border-amber-500 ps-3">{t('form.scheduling')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 ps-1">{t('form.startDate')}</label>
                      <input 
                        type="date"
                        name="startDate"
                        required
                        defaultValue={editingAd?.startDate}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 ps-1">{t('form.endDate')}</label>
                      <input 
                        type="date"
                        name="endDate"
                        required
                        defaultValue={editingAd?.endDate}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 ps-1">{t('form.status')}</label>
                      <select 
                        name="status"
                        defaultValue={editingAd?.status || 'ACTIVE'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 font-bold"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAUSED">PAUSED</option>
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="ENDED">ENDED</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    Secure Campaign Manager
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-black text-xs rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {t('form.cancel')}
                    </button>
                    <button 
                      type="submit"
                      className="px-10 py-3 bg-teal-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-teal-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                    >
                      {editingAd ? t('form.save') : t('form.publish')}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
