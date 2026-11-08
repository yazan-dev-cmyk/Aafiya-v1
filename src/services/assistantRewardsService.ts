import { api, ApiResponse, getStoredToken } from '../lib/api';
import {
  AssistantRewardsSummary,
  AssistantRewardTransaction,
  AssistantPayoutProfile,
  AssistantPayoutBatchItem,
} from '../types/assistantRewards';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

export const assistantRewardsService = {
  getSummary: async (): Promise<ApiResponse<AssistantRewardsSummary>> => {
    return api.get<AssistantRewardsSummary>('/assistant/rewards/summary');
  },

  getTransactions: async (page = 1, perPage = 20): Promise<ApiResponse<AssistantRewardTransaction[]>> => {
    return api.get<AssistantRewardTransaction[]>(`/assistant/rewards/transactions?page=${page}&per_page=${perPage}`);
  },

  getPayouts: async (page = 1, perPage = 20): Promise<ApiResponse<AssistantPayoutBatchItem[]>> => {
    return api.get<AssistantPayoutBatchItem[]>(`/assistant/rewards/payouts?page=${page}&per_page=${perPage}`);
  },

  getProfiles: async (): Promise<ApiResponse<AssistantPayoutProfile[]>> => {
    return api.get<AssistantPayoutProfile[]>('/assistant/rewards/profiles');
  },

  submitProfile: async (ripNumber: string, chequeFile: File): Promise<ApiResponse<AssistantPayoutProfile>> => {
    const formData = new FormData();
    formData.append('rip_number', ripNumber);
    formData.append('cheque_document', chequeFile);

    return api.post<AssistantPayoutProfile>('/assistant/rewards/profiles', formData);
  },

  viewChequeBlobUrl: async (profileId: string): Promise<string> => {
    const token = getStoredToken();
    const url = `${getApiBaseUrl()}/assistant/rewards/profiles/${profileId}/cheque`;
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load cheque document: ${response.statusText}`);
    }

    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  },
};
