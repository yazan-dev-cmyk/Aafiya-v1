import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_elevation.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_locked_action.dart';

enum AafiyaButtonVariant { primary, secondary, outline, action, gradient }

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
    this.height = 48.0,
    this.isPill = false,
    this.useGradient = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AafiyaButtonVariant variant;
  final bool isLoading;
  final bool isLocked;
  final Widget? icon;
  final double height;
  final bool isPill;
  final bool useGradient;

  BorderRadius get _borderRadius =>
      (isPill || variant == AafiyaButtonVariant.gradient)
          ? AafiyaRadius.borderPill
          : AafiyaRadius.borderButton;

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
        height: height,
        child: ElevatedButton.icon(
          onPressed: () => AafiyaLockedNotice.showNotice(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF1F5F9),
            foregroundColor: AafiyaColors.secondaryText,
            textStyle: AafiyaTypography.labelLarge,
            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: _borderRadius),
            elevation: 0,
          ),
          icon: effectiveIcon,
          label: Text(label),
        ),
      );
    }

    final isGrad = variant == AafiyaButtonVariant.gradient || useGradient;

    if (isLoading) {
      final spinnerColor = switch (variant) {
        AafiyaButtonVariant.primary => AafiyaColors.pureWhite,
        AafiyaButtonVariant.secondary => AafiyaColors.onHealingGreen,
        AafiyaButtonVariant.outline => AafiyaColors.healthBlue,
        AafiyaButtonVariant.action => AafiyaColors.pureWhite,
        AafiyaButtonVariant.gradient => AafiyaColors.pureWhite,
      };

      final loader = Center(
        child: SizedBox(
          height: 20,
          width: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(spinnerColor),
          ),
        ),
      );

      if (isGrad) {
        return Container(
          height: height,
          decoration: BoxDecoration(
            gradient: AafiyaColors.primaryButtonGradient,
            borderRadius: _borderRadius,
            boxShadow: AafiyaElevation.primaryButtonShadow,
          ),
          child: loader,
        );
      }

      return SizedBox(
        height: height,
        child: ElevatedButton(
          onPressed: null,
          style: _buttonStyle,
          child: loader,
        ),
      );
    }

    if (isGrad) {
      final labelWidget = Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AafiyaTypography.labelLarge.copyWith(
          color: AafiyaColors.pureWhite,
          fontWeight: FontWeight.w700,
        ),
      );

      return Container(
        height: height,
        decoration: BoxDecoration(
          gradient: onPressed != null ? AafiyaColors.primaryButtonGradient : null,
          color: onPressed == null ? const Color(0xFFCBD5E1) : null,
          borderRadius: _borderRadius,
          boxShadow: onPressed != null ? AafiyaElevation.primaryButtonShadow : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onPressed,
            borderRadius: _borderRadius,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: icon != null
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          icon!,
                          const SizedBox(width: 8.0),
                          Flexible(child: labelWidget),
                        ],
                      )
                    : labelWidget,
              ),
            ),
          ),
        ),
      );
    }

    if (icon != null) {
      return SizedBox(
        height: height,
        child: ElevatedButton.icon(
          onPressed: onPressed,
          style: _buttonStyle,
          icon: icon!,
          label: Text(label),
        ),
      );
    }

    return SizedBox(
      height: height,
      child: ElevatedButton(
        onPressed: onPressed,
        style: _buttonStyle,
        child: Text(label),
      ),
    );
  }

  ButtonStyle get _buttonStyle {
    return switch (variant) {
      AafiyaButtonVariant.primary || AafiyaButtonVariant.gradient =>
        ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.healthBlue,
          foregroundColor: AafiyaColors.pureWhite,
          textStyle: AafiyaTypography.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: _borderRadius),
          elevation: 0,
        ),
      AafiyaButtonVariant.secondary => ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.healingGreen,
          foregroundColor: AafiyaColors.onHealingGreen,
          textStyle: AafiyaTypography.labelLarge
              .copyWith(color: AafiyaColors.onHealingGreen),
          shape: RoundedRectangleBorder(borderRadius: _borderRadius),
          elevation: 0,
        ),
      AafiyaButtonVariant.outline => ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: AafiyaColors.healthBlue,
          textStyle: AafiyaTypography.labelLarge
              .copyWith(color: AafiyaColors.healthBlue),
          side: const BorderSide(color: AafiyaColors.healthBlue, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: _borderRadius),
          elevation: 0,
        ),
      AafiyaButtonVariant.action => ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.actionGreen,
          foregroundColor: AafiyaColors.pureWhite,
          textStyle: AafiyaTypography.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: _borderRadius),
          elevation: 0,
        ),
    };
  }
}
