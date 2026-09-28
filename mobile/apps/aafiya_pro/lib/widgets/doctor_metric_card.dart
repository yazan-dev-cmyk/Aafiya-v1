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
  });

  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AafiyaRadius.md),
          child: Container(
            padding: const EdgeInsets.all(AafiyaSpacing.sm + 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AafiyaRadius.md),
              border: Border.all(
                color: color.withValues(alpha: 0.25),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      count.toString(),
                      style: AafiyaTypography.headlineMedium.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Icon(
                      icon,
                      color: color,
                      size: 20,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: AafiyaTypography.caption.copyWith(
                    color: AafiyaColors.primaryText,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
