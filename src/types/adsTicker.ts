export type AdDestination =
  | 'ticker'
  | 'home_banner'
  | 'sidebar'
  | 'search_top'
  | 'category_sponsor';

export type AdAudience =
  | 'public'
  | 'patient'
  | 'doctor'
  | 'doctor_assistant'
  | 'booking_center'
  | 'lab'
  | 'lab_assistant'
  | 'radiology'
  | 'rad_assistant'
  | 'all';

export type AdCampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected';

export interface TickerPlacement {
  id: string;
  advertisement_id?: string;
  destination: AdDestination;
  audience: AdAudience;
  created_at?: string;
  updated_at?: string;
}

export interface TickerCampaign {
  id: string;
  title: string;
  content: string;
  banner_image_url: string | null;
  target_url: string | null;
  priority: number;
  status: AdCampaignStatus;
  ticker_clicks_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  placements?: TickerPlacement[];
}

export interface TickerClickResponse {
  success: boolean;
  recorded: boolean;
  clicks_count: number;
  target_url: string | null;
  reason?: string;
}

export interface CreateTickerCampaignPayload {
  clinic_id?: string | null;
  doctor_id?: string | null;
  title: string;
  content: string;
  banner_image_url?: string | null;
  target_url?: string | null;
  priority?: number;
  status?: AdCampaignStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  placements: Array<{
    destination: AdDestination;
    audience: AdAudience;
  }>;
}

export interface UpdateTickerCampaignPayload {
  title?: string;
  content?: string;
  banner_image_url?: string | null;
  target_url?: string | null;
  priority?: number;
  status?: AdCampaignStatus;
  starts_at?: string | null;
  ends_at?: string | null;
}

export const TICKER_DESTINATIONS: AdDestination[] = [
  'ticker',
  'home_banner',
  'sidebar',
  'search_top',
  'category_sponsor',
];

export const TICKER_AUDIENCES: AdAudience[] = [
  'public',
  'patient',
  'doctor',
  'doctor_assistant',
  'booking_center',
  'lab',
  'lab_assistant',
  'radiology',
  'rad_assistant',
  'all',
];

export const TICKER_STATUSES: AdCampaignStatus[] = [
  'draft',
  'pending_approval',
  'active',
  'paused',
  'expired',
  'rejected',
];
