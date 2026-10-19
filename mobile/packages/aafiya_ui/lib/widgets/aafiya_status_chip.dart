import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

enum AafiyaStatusType {
  confirmed,
  pending,
  concluded,
  urgent,
  custom,
}

/// Accessible Status Chip following the prototype visual specification.
///
/// Ensures strict WCAG 2.1 AA compliance (contrast ratio >= 4.5:1):
/// - Confirmed: #166534 on #E3F6EA (6.33:1)
/// - Pending: #92400E on #FEF1DC (6.36:1)
/// - Concluded: #475569 on #F1F5F9 (6.92:1)
/// - Urgent / Cancelled: #B91C1C on #FDECEC (5.66:1)
class AafiyaStatusChip extends StatelessWidget {
  const AafiyaStatusChip({
    super.key,
    required this.label,
    this.type = AafiyaStatusType.confirmed,
    this.icon,
    this.customBgColor,
    this.customInkColor,
  });

  /// The localized status text.
  final String label;

  /// Semantic status category.
  final AafiyaStatusType type;

  /// Optional leading icon.
  final IconData? icon;

  /// Custom background color when type is [AafiyaStatusType.custom].
  final Color? customBgColor;

  /// Custom text and icon ink color when type is [AafiyaStatusType.custom].
  final Color? customInkColor;

  @override
  Widget build(BuildContext context) {
    final (bg, ink) = switch (type) {
      AafiyaStatusType.confirmed => (
          AafiyaColors.statusConfirmedBg,
          AafiyaColors.statusConfirmedInk,
        ),
      AafiyaStatusType.pending => (
          AafiyaColors.statusPendingBg,
          AafiyaColors.statusPendingInk,
        ),
      AafiyaStatusType.concluded => (
          AafiyaColors.statusConcludedBg,
          AafiyaColors.statusConcludedInk,
        ),
      AafiyaStatusType.urgent => (
          AafiyaColors.statusUrgentBg,
          AafiyaColors.statusUrgentInk,
        ),
      AafiyaStatusType.custom => (
          customBgColor ?? AafiyaColors.statusConcludedBg,
          customInkColor ?? AafiyaColors.statusConcludedInk,
        ),
    };

    final effectiveIcon = icon ??
        switch (type) {
          AafiyaStatusType.confirmed => Icons.check_circle_outline_rounded,
          AafiyaStatusType.pending => Icons.schedule_rounded,
          AafiyaStatusType.concluded => Icons.history_rounded,
          AafiyaStatusType.urgent => Icons.error_outline_rounded,
          AafiyaStatusType.custom => null,
        };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AafiyaRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (effectiveIcon != null) ...[
            Icon(
              effectiveIcon,
              size: 14.0,
              color: ink,
            ),
            const SizedBox(width: 5.0),
          ],
          Text(
            label,
            style: AafiyaTypography.caption.copyWith(
              fontSize: 14.0,
              fontWeight: FontWeight.w600,
              color: ink,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
