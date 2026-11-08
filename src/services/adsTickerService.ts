import { api } from '../lib/api';
import { TickerCampaign, TickerClickResponse } from '../types/adsTicker';

export const adsTickerService = {
  /**
   * Fetch active, eligible public advertising ticker campaigns.
   * Public guest request: requiresAuth=false, X-Platform=web, cache=no-store.
   * Gracefully returns an empty array on any network or API failure.
   */
  async getPublicCampaigns(): Promise<TickerCampaign[]> {
    try {
      const res = await api.optionalGet<TickerCampaign[]>('/ads/ticker', {
        headers: {
          'X-Platform': 'web',
        },
        cache: 'no-store',
      });

      const items = res?.data;
      if (!Array.isArray(items)) {
        return [];
      }

      // Defensive filtering to ensure required display fields exist
      return items.filter(
        (c): c is TickerCampaign =>
          Boolean(c && typeof c.id === 'string' && typeof c.title === 'string' && typeof c.content === 'string')
      );
    } catch {
      // In case of any API or network error, fail closed and return empty array
      return [];
    }
  },

  /**
   * Record a non-blocking ticker click telemetry event.
   * Gracefully handles errors and returns a fallback response without throwing.
   */
  async recordClick(campaignId: string): Promise<TickerClickResponse> {
    try {
      const res = await api.optionalPost<TickerClickResponse>(
        `/ads/ticker/${campaignId}/click`,
        { destination: 'ticker' },
        {
          headers: {
            'X-Platform': 'web',
          },
          keepalive: true,
        }
      );
      return (
        res?.data || {
          success: true,
          recorded: false,
          clicks_count: 0,
          target_url: null,
        }
      );
    } catch (err: any) {
      return {
        success: false,
        recorded: false,
        clicks_count: 0,
        target_url: null,
        reason: err?.message || 'network_error',
      };
    }
  },
};
