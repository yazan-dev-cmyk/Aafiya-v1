import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_locked_action.dart';

enum AafiyaButtonVariant { primary, secondary, outline, action }

/// Reusable AAFIYA button component adhering to brand kit tokens.
class AafiyaButton extends StatelessWidget {
  const AafiyaButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AafiyaButtonVariant.primary,
    this.isLoading = false,
    this.isLocked = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final AafiyaButtonVariant variant;
  final bool isLoading;
  final bool isLocked;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    if (isLocked) {
      final effectiveIcon = icon ??
          const Icon(
            Icons.lock_outline_rounded,
            size: 18,
            color: Color(0xFFD97706),
          );

      return SizedBox(
        height: 48,
        child: ElevatedButton.icon(
          onPressed: () => AafiyaLockedNotice.showNotice(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF1F5F9),
            foregroundColor: AafiyaColors.secondaryText,
            textStyle: AafiyaTypography.labelLarge,
            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
            shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
            elevation: 0,
          ),
          icon: effectiveIcon,
          label: Text(label),
        ),
      );
    }

    if (isLoading) {
      final spinnerColor = switch (variant) {
        AafiyaButtonVariant.primary => AafiyaColors.pureWhite,
        AafiyaButtonVariant.secondary => AafiyaColors.onHealingGreen,
        AafiyaButtonVariant.outline => AafiyaColors.healthBlue,
        AafiyaButtonVariant.action => AafiyaColors.pureWhite,
      };

      return SizedBox(
        height: 48,
        child: ElevatedButton(
          onPressed: null,
          style: _buttonStyle,
          child: SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(spinnerColor),
            ),
          ),
        ),
      );
    }

    if (icon != null) {
      return SizedBox(
        height: 48,
        child: ElevatedButton.icon(
          onPressed: onPressed,
          style: _buttonStyle,
          icon: icon!,
          label: Text(label),
        ),
      );
    }

    return SizedBox(
      height: 48,
      child: ElevatedButton(
        onPressed: onPressed,
        style: _buttonStyle,
        child: Text(label),
      ),
    );
  }

  ButtonStyle get _buttonStyle {
    return switch (variant) {
      AafiyaButtonVariant.primary => ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.healthBlue,
          foregroundColor: AafiyaColors.pureWhite,
          textStyle: AafiyaTypography.labelLarge,
          shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
          elevation: 0,
        ),
      AafiyaButtonVariant.secondary => ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.healingGreen,
          foregroundColor: AafiyaColors.onHealingGreen,
          textStyle: AafiyaTypography.labelLarge.copyWith(color: AafiyaColors.onHealingGreen),
          shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
          elevation: 0,
        ),
      AafiyaButtonVariant.outline => ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: AafiyaColors.healthBlue,
          textStyle: AafiyaTypography.labelLarge.copyWith(color: AafiyaColors.healthBlue),
          side: const BorderSide(color: AafiyaColors.healthBlue, width: 1.5),
          shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
          elevation: 0,
        ),
      AafiyaButtonVariant.action => ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.actionGreen,
          foregroundColor: AafiyaColors.pureWhite,
          textStyle: AafiyaTypography.labelLarge,
          shape: const RoundedRectangleBorder(borderRadius: AafiyaRadius.borderMd),
          elevation: 0,
        ),
    };
  }
}
