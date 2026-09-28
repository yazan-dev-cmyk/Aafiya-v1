import { api, ApiResponse } from '../lib/api';

export interface AdvertisementItem {
  id: string;
  title: string;
  content: string;
  banner_image_url?: string;
  target_url?: string;
  placement: string;
  target_role?: string;
  target_specialty?: string;
  target_wilaya?: string;
  is_welcome_offer: boolean;
  status: string;
  is_active: boolean;
  impressions_count: number;
  clicks_count: number;
}

export const advertisementService = {
  getActiveAds: async (params?: Record<string, any>): Promise<ApiResponse<AdvertisementItem[]>> => {
    const query = new URLSearchParams(params).toString();
    return api.get<AdvertisementItem[]>(`/advertisements${query ? `?${query}` : ''}`);
  },

  recordClick: async (id: string): Promise<ApiResponse<{ target_url: string; clicks_count: number }>> => {
    return api.post(`/advertisements/${id}/click`);
  },

  getMyAds: async (): Promise<ApiResponse<AdvertisementItem[]>> => {
    return api.get<AdvertisementItem[]>('/advertisements/my-ads');
  },

  createAd: async (data: Partial<AdvertisementItem>): Promise<ApiResponse<AdvertisementItem>> => {
    return api.post<AdvertisementItem>('/advertisements', data);
  },
};
