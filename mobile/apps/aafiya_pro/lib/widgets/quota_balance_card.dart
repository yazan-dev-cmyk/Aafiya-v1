import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Card displaying the authoritative quota balance for a Booking Center.
/// Features:
/// - Distinct zero-quota state with warning and recharge prompt.
/// - Authoritative server balance display without client calculation.
/// - Refresh trigger to fetch latest balance.
/// - CTA button to trigger package purchase flow.
class QuotaBalanceCard extends StatelessWidget {
  const QuotaBalanceCard({
    super.key,
    required this.centerName,
    required this.quotaBalance,
    required this.isLoading,
    this.onRefresh,
    this.onRecharge,
  });

  final String centerName;
  final int quotaBalance;
  final bool isLoading;
  final VoidCallback? onRefresh;
  final VoidCallback? onRecharge;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final isZero = quotaBalance == 0;

    return AafiyaCard(
      backgroundColor: isZero ? const Color(0xFF1E293B) : AafiyaColors.healthBlue,
      padding: AafiyaSpacing.insetAllLg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      centerName,
                      style: AafiyaTypography.titleLarge.copyWith(
                        color: AafiyaColors.pureWhite,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      strings.bookingCenterRoleTitle,
                      style: AafiyaTypography.bodySmall.copyWith(
                        color: AafiyaColors.pureWhite.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
              if (onRefresh != null)
                IconButton(
                  key: const Key('quota_refresh_button'),
                  icon: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                          ),
                        )
                      : const Icon(Icons.refresh_rounded, color: AafiyaColors.pureWhite),
                  tooltip: strings.retry,
                  onPressed: isLoading ? null : onRefresh,
                ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AafiyaColors.pureWhite.withValues(alpha: 0.15),
              borderRadius: AafiyaRadius.borderMd,
              border: Border.all(
                color: isZero
                    ? AafiyaColors.error.withValues(alpha: 0.6)
                    : AafiyaColors.pureWhite.withValues(alpha: 0.2),
                width: isZero ? 1.5 : 1.0,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.confirmation_num_rounded,
                  color: isZero ? const Color(0xFFFCA5A5) : AafiyaColors.pureWhite,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.quotaBalanceLabel,
                        style: AafiyaTypography.labelSmall.copyWith(
                          color: AafiyaColors.pureWhite.withValues(alpha: 0.85),
                        ),
                      ),
                      const SizedBox(height: 2),
                      isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 60,
                              child: LinearProgressIndicator(
                                backgroundColor: Colors.transparent,
                                valueColor: AlwaysStoppedAnimation<Color>(AafiyaColors.pureWhite),
                              ),
                            )
                          : Text(
                              '$quotaBalance ${strings.unitsLabel}',
                              key: const Key('quota_balance_value'),
                              style: AafiyaTypography.headlineMedium.copyWith(
                                color: isZero ? const Color(0xFFFCA5A5) : AafiyaColors.pureWhite,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ],
                  ),
                ),
                if (onRecharge != null)
                  ElevatedButton.icon(
                    key: const Key('recharge_quota_button'),
                    onPressed: onRecharge,
                    icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
                    label: Text(strings.purchaseRequest),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AafiyaColors.pureWhite,
                      foregroundColor: isZero ? const Color(0xFF1E293B) : AafiyaColors.healthBlue,
                      elevation: 0,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      textStyle: AafiyaTypography.labelSmall.copyWith(fontWeight: FontWeight.bold),
                      shape: RoundedRectangleBorder(
                        borderRadius: AafiyaRadius.borderSm,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (isZero && !isLoading) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AafiyaColors.error.withValues(alpha: 0.15),
                borderRadius: AafiyaRadius.borderSm,
                border: Border.all(color: AafiyaColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Color(0xFFFCA5A5), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      strings.zeroQuotaWarning,
                      style: AafiyaTypography.caption.copyWith(
                        color: const Color(0xFFFCA5A5),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
