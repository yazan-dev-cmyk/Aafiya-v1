import 'package:flutter/material.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

/// Material 3 operational metric card displaying a KPI count and localized label.
class DoctorMetricCard extends StatelessWidget {
  const DoctorMetricCard({
    super.key,
    required this.label,
    required this.count,
    required this.icon,
    this.color = AafiyaColors.healthBlue,
    this.onTap,
    this.maxLines = 2,
    this.useExpanded = true,
  });

  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final int maxLines;
  final bool useExpanded;

  @override
  Widget build(BuildContext context) {
    final cardContent = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AafiyaRadius.borderCardLg,
          child: Container(
            constraints: const BoxConstraints(minHeight: 74),
            padding: const EdgeInsets.all(AafiyaSpacing.sm + 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: AafiyaRadius.borderCardLg,
              border: Border.all(
                color: AafiyaColors.cardBorder,
                width: 1,
              ),
              boxShadow: AafiyaElevation.softCardShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '\u200E$count\u200E',
                      style: AafiyaTypography.headlineMedium.copyWith(
                        color: AafiyaColors.navy,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        boxShadow: AafiyaElevation.bubbleShadow,
                      ),
                      child: SizedBox(
                        width: 34,
                        height: 34,
                        child: Center(
                          child: Icon(
                            icon,
                            color: color,
                            size: 18,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.secondaryText,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: maxLines,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      );

    return useExpanded ? Expanded(child: cardContent) : cardContent;
  }
}
