export interface AssistantRewardsSummary {
  current_balance: number;
  total_earned: number;
  total_reversed: number;
  total_deducted: number;
  total_paid: number;
  total_relieved: number;
  pending_payout: number;
  payout_threshold: number;
  is_eligible_for_payout: boolean;
  current_reward_rate?: number;
  current_rate?: { amount: number; currency: string; effective_since: string | null };
  active_profile: {
    id: string;
    rip_number: string;
    version: number;
    status: string;
  } | null;
  program_lifecycle?: AssistantProgramLifecycle;
}

export interface AssistantProgramLifecycle {
  state: 'active' | 'suspended' | 'terminated';
  effective_since: string | null;
  notice_deadline_at: string | null;
  reason: string;
  decision_reference: string | null;
  is_active: boolean;
  is_suspended: boolean;
  is_terminated: boolean;
}

export type AssistantTransactionType =
  | 'reward_earned'
  | 'cancellation_deduction'
  | 'payout_settlement'
  | 'departure_deficit_relief'
  | 'reversal';

export interface AssistantRewardTransaction {
  id: string;
  assistant_id: string;
  transaction_type: AssistantTransactionType;
  direction: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  source_type: string;
  source_id: string;
  idempotency_key?: string;
  created_at: string;
}

export interface AssistantPayoutProfile {
  id: string;
  assistant_id: string;
  rip_number: string;
  cheque_document_path?: string;
  status: 'pending' | 'active' | 'rejected';
  rejection_reason?: string | null;
  version: number;
  verified_at?: string | null;
  created_at: string;
}

export interface AssistantPayoutBatchItem {
  id: string;
  batch_id: string;
  assistant_id: string;
  payout_profile_id: string;
  amount: number;
  gross_amount?: number;
  debt_offset_amount?: number;
  net_amount?: number;
  returned_amount?: number;
  return_count?: number;
  settlement_category?: string;
  status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'deferred'
    | 'rejected'
    | 'cancelled'
    | 'partially_returned'
    | 'fully_returned';
  rejection_reason?: string | null;
  transfer_reference?: string | null;
  transferred_at?: string | null;
  created_at: string;
  batch?: {
    id: string;
    batch_number: string;
    period_start: string;
    period_end: string;
    status: string;
  };
}
