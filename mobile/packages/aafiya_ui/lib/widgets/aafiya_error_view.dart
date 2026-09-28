import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';

/// Reusable error feedback screen/card with retry action.
class AafiyaErrorView extends StatelessWidget {
  const AafiyaErrorView({
    super.key,
    required this.message,
    this.title,
    this.onRetry,
    this.retryLabel = 'Retry',
  });

  final String message;
  final String? title;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AafiyaSpacing.insetScreen,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 56,
              color: AafiyaColors.error,
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
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: 180,
                child: AafiyaButton(
                  label: retryLabel,
                  onPressed: onRetry,
                  variant: AafiyaButtonVariant.outline,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
