import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable empty state view.
class AafiyaEmptyView extends StatelessWidget {
  const AafiyaEmptyView({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final String? title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 56,
              color: AafiyaColors.secondaryText.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 16),
            if (title != null) ...[
              Text(
                title!,
                style: AafiyaTypography.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
            ],
            Text(
              message,
              style: AafiyaTypography.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
