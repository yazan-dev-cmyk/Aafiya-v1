import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';

import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';

/// Clean, localized, PHI-safe fallback screen rendered when an unhandled error occurs.
///
/// Enforces Global Error Boundary Contract (Section 9):
/// - Replaces default red/grey error widgets.
/// - Never leaks technical stack traces, database logs, or PHI to users.
/// - Provides actionable recovery button (Restart / Return to Home).
class AafiyaCrashBoundary extends StatelessWidget {
  const AafiyaCrashBoundary({
    super.key,
    this.onRecover,
    this.recoverLabel,
    this.customTitle,
    this.customMessage,
  });

  final VoidCallback? onRecover;
  final String? recoverLabel;
  final String? customTitle;
  final String? customMessage;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final title = customTitle ?? strings.globalErrorTitle;
    final message = customMessage ?? strings.globalErrorMessage;
    final buttonLabel = recoverLabel ?? strings.returnToHome;

    return Scaffold(
      backgroundColor: AafiyaColors.lightBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: AafiyaSpacing.insetScreen,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 440),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              decoration: BoxDecoration(
                color: AafiyaColors.pureWhite,
                borderRadius: BorderRadius.circular(AafiyaRadius.lg),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 16,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AafiyaColors.error.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.shield_outlined,
                      size: 40,
                      color: AafiyaColors.error,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    title,
                    style: AafiyaTypography.headlineSmall.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AafiyaColors.primaryText,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    style: AafiyaTypography.bodyMedium.copyWith(
                      color: AafiyaColors.secondaryText,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (onRecover != null) ...[
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      child: AafiyaButton(
                        label: buttonLabel,
                        onPressed: onRecover,
                        variant: AafiyaButtonVariant.primary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
