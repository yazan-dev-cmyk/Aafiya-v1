import { api, ApiResponse } from '../lib/api';
import {
  TickerCampaign,
  TickerPlacement,
  CreateTickerCampaignPayload,
  UpdateTickerCampaignPayload,
  AdDestination,
  AdAudience,
} from '../types/adsTicker';

export interface CampaignListParams {
  page?: number;
  per_page?: number;
}

export interface TickerAudienceSettings {
  global_enabled: boolean;
  audiences: Record<string, boolean>;
}

export const adminAdsTickerService = {
  getCampaigns: async (params?: CampaignListParams): Promise<ApiResponse<TickerCampaign[]>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));

    const qs = query.toString();
    return api.get<TickerCampaign[]>(`/admin/ads/ticker${qs ? `?${qs}` : ''}`);
  },

  getCampaign: async (id: string): Promise<ApiResponse<TickerCampaign>> => {
    return api.get<TickerCampaign>(`/admin/ads/ticker/${id}`);
  },

  createCampaign: async (payload: CreateTickerCampaignPayload): Promise<ApiResponse<TickerCampaign>> => {
    return api.post<TickerCampaign>('/admin/ads/ticker', payload);
  },

  updateCampaign: async (id: string, payload: UpdateTickerCampaignPayload): Promise<ApiResponse<TickerCampaign>> => {
    return api.put<TickerCampaign>(`/admin/ads/ticker/${id}`, payload);
  },

  toggleStatus: async (id: string): Promise<ApiResponse<TickerCampaign>> => {
    return api.patch<TickerCampaign>(`/admin/ads/ticker/${id}/toggle-status`);
  },

  deleteCampaign: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return api.delete(`/admin/ads/ticker/${id}`);
  },

  reviewCampaign: async (
    id: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<ApiResponse<TickerCampaign>> => {
    return api.post<TickerCampaign>(`/admin/ads/ticker/${id}/review`, { action, notes });
  },

  getAnalytics: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return api.get<Record<string, unknown>>('/admin/ads/ticker/analytics');
  },

  getSettings: async (): Promise<ApiResponse<TickerAudienceSettings>> => {
    return api.get<TickerAudienceSettings>('/admin/ads/ticker/settings');
  },

  updateSetting: async (key: string, enabled: boolean): Promise<ApiResponse<{ key: string; enabled: boolean }>> => {
    return api.put<{ key: string; enabled: boolean }>('/admin/ads/ticker/settings', { key, enabled });
  },

  getPlacements: async (campaignId: string): Promise<ApiResponse<TickerPlacement[]>> => {
    return api.get<TickerPlacement[]>(`/admin/ads/ticker/${campaignId}/placements`);
  },

  addPlacement: async (
    campaignId: string,
    placement: { destination: AdDestination; audience: AdAudience }
  ): Promise<ApiResponse<TickerPlacement>> => {
    return api.post<TickerPlacement>(`/admin/ads/ticker/${campaignId}/placements`, placement);
  },

  removePlacement: async (
    campaignId: string,
    placementId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return api.delete(`/admin/ads/ticker/${campaignId}/placements/${placementId}`);
  },
};
