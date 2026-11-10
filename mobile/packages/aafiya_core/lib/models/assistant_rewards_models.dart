import 'package:flutter/foundation.dart';

/// Reward balance summary domain model for doctor assistant.
@immutable
class AssistantRewardSummary {
  const AssistantRewardSummary({
    required this.currentBalance,
    required this.totalEarned,
    required this.totalReversed,
    required this.totalDeducted,
    required this.totalPaid,
    required this.totalRelieved,
    required this.pendingPayout,
    this.payoutThreshold,
    required this.isEligibleForPayout,
    this.ineligibilityReason,
    this.activeProfile,
  });

  final double currentBalance;
  final double totalEarned;
  final double totalReversed;
  final double totalDeducted;
  final double totalPaid;
  final double totalRelieved;
  final double pendingPayout;
  final double? payoutThreshold;
  final bool isEligibleForPayout;
  final String? ineligibilityReason;
  final AssistantPayoutProfile? activeProfile;

  factory AssistantRewardSummary.fromJson(Map<String, dynamic> json) {
    final rawThreshold = (json['payout_threshold'] as num?)?.toDouble();
    return AssistantRewardSummary(
      currentBalance: (json['current_balance'] as num?)?.toDouble() ?? 0.0,
      totalEarned: (json['total_earned'] as num?)?.toDouble() ?? 0.0,
      totalReversed: (json['total_reversed'] as num?)?.toDouble() ?? 0.0,
      totalDeducted: (json['total_deducted'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (json['total_paid'] as num?)?.toDouble() ?? 0.0,
      totalRelieved: (json['total_relieved'] as num?)?.toDouble() ?? 0.0,
      pendingPayout: (json['pending_payout'] as num?)?.toDouble() ?? 0.0,
      payoutThreshold:
          rawThreshold != null && rawThreshold > 0 ? rawThreshold : null,
      isEligibleForPayout: json['is_eligible_for_payout'] as bool? ?? false,
      ineligibilityReason: json['ineligibility_reason'] as String?,
      activeProfile: json['active_profile'] is Map<String, dynamic>
          ? AssistantPayoutProfile.fromJson(
              json['active_profile'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Domain model for an immutable ledger entry.
@immutable
class AssistantRewardTransaction {
  const AssistantRewardTransaction({
    required this.id,
    required this.assistantId,
    required this.transactionType,
    required this.direction,
    required this.amount,
    required this.balanceAfter,
    required this.sourceType,
    required this.sourceId,
    required this.createdAt,
  });

  final String id;
  final String assistantId;
  final String transactionType;
  final String direction;
  final double amount;
  final double balanceAfter;
  final String sourceType;
  final String sourceId;
  final String createdAt;

  bool get isCredit => direction == 'credit';

  factory AssistantRewardTransaction.fromJson(Map<String, dynamic> json) {
    return AssistantRewardTransaction(
      id: json['id'] as String? ?? '',
      assistantId: json['assistant_id'] as String? ?? '',
      transactionType: json['transaction_type'] as String? ?? '',
      direction: json['direction'] as String? ?? 'credit',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balanceAfter: (json['balance_after'] as num?)?.toDouble() ?? 0.0,
      sourceType: json['source_type'] as String? ?? '',
      sourceId: json['source_id'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}

/// Domain model for postal CCP / RIP payout profile.
@immutable
class AssistantPayoutProfile {
  const AssistantPayoutProfile({
    required this.id,
    this.assistantId = '',
    required this.ripNumber,
    required this.status,
    this.rejectionReason,
    required this.version,
    this.verifiedAt,
    this.createdAt = '',
  });

  final String id;
  final String assistantId;
  final String ripNumber;
  final String status;
  final String? rejectionReason;
  final int version;
  final String? verifiedAt;
  final String createdAt;

  bool get isActive => status == 'active';
  bool get isPending => status == 'pending' || status == 'pending_verification';
  bool get isRejected => status == 'rejected';
  bool get isSuperseded => status == 'superseded';

  factory AssistantPayoutProfile.fromJson(Map<String, dynamic> json) {
    return AssistantPayoutProfile(
      id: json['id'] as String? ?? '',
      assistantId: json['assistant_id'] as String? ?? '',
      ripNumber: json['rip_number'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      rejectionReason: json['rejection_reason'] as String?,
      version: (json['version'] as num?)?.toInt() ?? 1,
      verifiedAt: json['verified_at'] as String?,
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}

/// Domain model for an individual payout batch item.
@immutable
class AssistantPayoutItem {
  const AssistantPayoutItem({
    required this.id,
    required this.batchId,
    required this.amount,
    required this.status,
    this.transferReference,
    this.transferredAt,
    this.batchNumber,
    this.periodStart,
    this.periodEnd,
  });

  final String id;
  final String batchId;
  final double amount;
  final String status;
  final String? transferReference;
  final String? transferredAt;
  final String? batchNumber;
  final String? periodStart;
  final String? periodEnd;

  bool get isPaid => status == 'paid';
  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed';

  factory AssistantPayoutItem.fromJson(Map<String, dynamic> json) {
    final batch = json['batch'] is Map<String, dynamic> ? json['batch'] : null;

    return AssistantPayoutItem(
      id: json['id'] as String? ?? '',
      batchId: json['batch_id'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'pending',
      transferReference: json['transfer_reference'] as String?,
      transferredAt: json['transferred_at'] as String?,
      batchNumber: batch?['batch_number'] as String?,
      periodStart: batch?['period_start'] as String?,
      periodEnd: batch?['period_end'] as String?,
    );
  }
}
