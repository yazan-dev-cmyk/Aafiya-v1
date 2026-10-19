import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';

/// Accessible confirmation dialog presented before destroying an auth session.
class AafiyaSignOutDialog extends StatelessWidget {
  const AafiyaSignOutDialog({
    super.key,
    required this.title,
    required this.message,
    required this.cancelLabel,
    required this.confirmLabel,
  });

  final String title;
  final String message;
  final String cancelLabel;
  final String confirmLabel;

  /// Helper to show this confirmation dialog and return true if confirmed.
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String message,
    required String cancelLabel,
    required String confirmLabel,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AafiyaSignOutDialog(
        title: title,
        message: message,
        cancelLabel: cancelLabel,
        confirmLabel: confirmLabel,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AafiyaRadius.card),
      ),
      backgroundColor: AafiyaColors.pureWhite,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Warning Icon Header
            Center(
              child: Container(
                width: 52.0,
                height: 52.0,
                decoration: const BoxDecoration(
                  color: AafiyaColors.statusUrgentBg,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.logout_rounded,
                    color: AafiyaColors.statusUrgentInk,
                    size: 26.0,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16.0),

            // Dialog Title
            Text(
              title,
              style: AafiyaTypography.titleLarge.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10.0),

            // Dialog Message
            Text(
              message,
              style: AafiyaTypography.bodyMedium.copyWith(
                fontSize: 14.5,
                color: AafiyaColors.secondaryText,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24.0),

            // Action Buttons Row
            Row(
              children: [
                Expanded(
                  child: AafiyaButton(
                    label: cancelLabel,
                    variant: AafiyaButtonVariant.outline,
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ),
                const SizedBox(width: 12.0),
                Expanded(
                  child: AafiyaButton(
                    label: confirmLabel,
                    variant: AafiyaButtonVariant.primary,
                    onPressed: () => Navigator.of(context).pop(true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
