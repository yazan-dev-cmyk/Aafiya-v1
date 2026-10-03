/**
 * Master Data Service (Wilaya & Commune)
 * Consumes authoritative Laravel backend API endpoints:
 * - GET /api/v1/master/wilayas
 * - GET /api/v1/master/wilayas/{wilaya}/communes
 */

import { api } from '../lib/api';

export interface Wilaya {
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  is_active: boolean;
  display_order: number;
}

export interface Commune {
  code: string;
  wilaya_code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  postal_code: string | null;
  is_active: boolean;
  display_order: number;
}

export interface MedicalSpecialty {
  id: number;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  is_active: boolean;
  display_order: number;
}

export interface MasterDataApiResponse<T> {
  status: string;
  data: T;
  meta?: {
    total?: number;
    wilaya_code?: string;
  };
}

class MasterDataService {
  private wilayasCache: Wilaya[] | null = null;
  private wilayasPromise: Promise<Wilaya[]> | null = null;
  private communesCache: Map<string, Commune[]> = new Map();
  private communesPromises: Map<string, Promise<Commune[]>> = new Map();
  private specialtiesCache: MedicalSpecialty[] | null = null;
  private specialtiesPromise: Promise<MedicalSpecialty[]> | null = null;

  /**
   * Fetch all active Wilayas (69 Wilayas).
   * Cached in memory for client session efficiency.
   */
  async getWilayas(): Promise<Wilaya[]> {
    if (this.wilayasCache) {
      return this.wilayasCache;
    }
    if (this.wilayasPromise) {
      return this.wilayasPromise;
    }

    this.wilayasPromise = (async () => {
      try {
        const response = await api.get<MasterDataApiResponse<Wilaya[]>>('/master/wilayas');
        const items = Array.isArray(response.data) ? response.data : ((response as any).data?.data || []);
        this.wilayasCache = items;
        return items;
      } catch (error) {
        this.wilayasPromise = null;
        throw error;
      }
    })();

    return this.wilayasPromise;
  }

  /**
   * Search Wilayas by text query (code, Arabic, French, English).
   */
  async searchWilayas(query: string): Promise<Wilaya[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getWilayas();
    }

    const response = await api.get<MasterDataApiResponse<Wilaya[]>>(
      `/master/wilayas?search=${encodeURIComponent(trimmed)}`
    );
    return Array.isArray(response.data) ? response.data : ((response as any).data?.data || []);
  }

  /**
   * Fetch Communes for a specific Wilaya code.
   * Cached per wilaya code in memory.
   */
  async getCommunes(wilayaCode: string): Promise<Commune[]> {
    const formatted = wilayaCode.trim();
    if (!formatted) {
      return [];
    }

    if (this.communesCache.has(formatted)) {
      return this.communesCache.get(formatted)!;
    }
    if (this.communesPromises.has(formatted)) {
      return this.communesPromises.get(formatted)!;
    }

    const promise = (async () => {
      try {
        const response = await api.get<MasterDataApiResponse<Commune[]>>(
          `/master/wilayas/${encodeURIComponent(formatted)}/communes`
        );
        const items = Array.isArray(response.data) ? response.data : ((response as any).data?.data || []);
        this.communesCache.set(formatted, items);
        return items;
      } catch (error) {
        this.communesPromises.delete(formatted);
        throw error;
      }
    })();

    this.communesPromises.set(formatted, promise);
    return promise;
  }

  /**
   * Fetch all active Medical Specialties (38 Specialties).
   * Cached in memory for client session efficiency.
   */
  async getSpecialties(): Promise<MedicalSpecialty[]> {
    if (this.specialtiesCache) {
      return this.specialtiesCache;
    }
    if (this.specialtiesPromise) {
      return this.specialtiesPromise;
    }

    this.specialtiesPromise = (async () => {
      try {
        const response = await api.get<MasterDataApiResponse<MedicalSpecialty[]>>('/master/specialties');
        const items = Array.isArray(response.data) ? response.data : ((response as any).data?.data || []);
        this.specialtiesCache = items;
        return items;
      } catch (error) {
        this.specialtiesPromise = null;
        throw error;
      }
    })();

    return this.specialtiesPromise;
  }

  /**
   * Search Medical Specialties by text query (code, Arabic, French, English).
   */
  async searchSpecialties(query: string): Promise<MedicalSpecialty[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getSpecialties();
    }

    const response = await api.get<MasterDataApiResponse<MedicalSpecialty[]>>(
      `/master/specialties?search=${encodeURIComponent(trimmed)}`
    );
    return Array.isArray(response.data) ? response.data : ((response as any).data?.data || []);
  }

  /**
   * Helper to format localized name based on active locale ('ar', 'fr', 'en').
   */
  getLocalizedName(
    item: { name_ar: string; name_fr: string; name_en: string },
    locale: string
  ): string {
    const norm = (locale || '').toLowerCase();
    if (norm.startsWith('ar')) return item.name_ar;
    if (norm.startsWith('en')) return item.name_en;
    return item.name_fr;
  }

  /**
   * Clear in-memory caches (for testing or cache invalidation).
   */
  clearCache(): void {
    this.wilayasCache = null;
    this.wilayasPromise = null;
    this.communesCache.clear();
    this.communesPromises.clear();
    this.specialtiesCache = null;
    this.specialtiesPromise = null;
  }
}

export const masterDataService = new MasterDataService();
