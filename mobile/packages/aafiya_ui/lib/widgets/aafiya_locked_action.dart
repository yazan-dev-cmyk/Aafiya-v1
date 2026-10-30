import 'package:flutter/material.dart';
import 'package:aafiya_core/aafiya_core.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable utility and widgets for administrative UI feature locks.
///
/// Implements AAFIYA-MOBILE-UI-FEATURE-LOCK-01 specifications:
/// - Visual lock indicator (Icons.lock_outline_rounded).
/// - Non-interactive / disabled action execution.
/// - Standardized floating notice in the active language:
///   «هذه الميزة مغلقة حاليًا لأسباب إدارية وتنظيمية.»
class AafiyaLockedNotice {
  const AafiyaLockedNotice._();

  /// Displays the official trilingual administrative lock notice floating snackbar.
  static void showNotice(BuildContext context) {
    final strings = LocalizedStrings.of(context);
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(
              Icons.lock_outline_rounded,
              color: Color(0xFFF59E0B), // Amber accent
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                strings.featureLockedNotice,
                style: const TextStyle(
                  color: AafiyaColors.pureWhite,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B), // Dark slate
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: const BorderSide(color: Color(0xFFF59E0B), width: 1.2),
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }
}

/// A wrapper widget that intercepts interactions when [isLocked] is true
/// and displays the official feature locked notice.
class AafiyaLockedAction extends StatelessWidget {
  const AafiyaLockedAction({
    super.key,
    required this.child,
    this.isLocked = true,
    this.showLockBadge = true,
  });

  /// The interactive widget to wrap (button, tile, icon, etc.).
  final Widget child;

  /// Whether the feature is currently locked.
  final bool isLocked;

  /// Whether to overlay a subtle lock badge indicator when locked.
  final bool showLockBadge;

  @override
  Widget build(BuildContext context) {
    if (!isLocked) return child;

    final content = IgnorePointer(
      child: Opacity(
        opacity: 0.65,
        child: child,
      ),
    );

    return InkWell(
      onTap: () => AafiyaLockedNotice.showNotice(context),
      borderRadius: BorderRadius.circular(AafiyaRadius.md),
      child: showLockBadge
          ? Stack(
              clipBehavior: Clip.none,
              children: [
                content,
                PositionedDirectional(
                  top: -4,
                  end: -4,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: Color(0xFFD97706), // Amber warning
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.lock_outline_rounded,
                      size: 14,
                      color: AafiyaColors.pureWhite,
                    ),
                  ),
                ),
              ],
            )
          : content,
    );
  }
}

/// A dedicated locked action button matching AAFIYA design tokens.
class AafiyaLockedButton extends StatelessWidget {
  const AafiyaLockedButton({
    super.key,
    required this.label,
    this.height = 48,
  });

  final String label;
  final double height;

  @override
  Widget build(BuildContext context) {
    final strings = LocalizedStrings.of(context);

    return SizedBox(
      height: height,
      child: Tooltip(
        message: strings.featureLockedNotice,
        child: OutlinedButton.icon(
          onPressed: () => AafiyaLockedNotice.showNotice(context),
          icon: const Icon(
            Icons.lock_outline_rounded,
            size: 18,
            color: Color(0xFFD97706), // Amber
          ),
          label: Text(
            label,
            style: AafiyaTypography.labelLarge.copyWith(
              color: AafiyaColors.secondaryText,
            ),
          ),
          style: OutlinedButton.styleFrom(
            backgroundColor: const Color(0xFFF8FAFC),
            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
            shape: const RoundedRectangleBorder(
              borderRadius: AafiyaRadius.borderMd,
            ),
            elevation: 0,
          ),
        ),
      ),
    );
  }
}
