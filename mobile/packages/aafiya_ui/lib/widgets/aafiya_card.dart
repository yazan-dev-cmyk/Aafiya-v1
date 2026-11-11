import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_elevation.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';

/// Reusable AAFIYA Card container with standard borders, padding, and soft elevation.
class AafiyaCard extends StatelessWidget {
  const AafiyaCard({
    super.key,
    required this.child,
    this.padding = AafiyaSpacing.insetCard,
    this.onTap,
    this.borderColor,
    this.backgroundColor,
    this.borderRadius,
    this.hasShadow = true,
    this.boxShadow,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? borderColor;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;
  final bool hasShadow;
  final List<BoxShadow>? boxShadow;

  @override
  Widget build(BuildContext context) {
    final effectiveRadius = borderRadius ?? AafiyaRadius.borderCardLg;
    final effectiveBorder = BorderSide(
      color: borderColor ?? AafiyaColors.cardBorder,
      width: 1.0,
    );

    final content = Padding(
      padding: padding,
      child: child,
    );

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor ?? AafiyaColors.pureWhite,
        borderRadius: effectiveRadius,
        border: Border.fromBorderSide(effectiveBorder),
        boxShadow: hasShadow
            ? (boxShadow ?? AafiyaElevation.softCardShadow)
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: effectiveRadius,
        child: onTap != null
            ? InkWell(
                onTap: onTap,
                borderRadius: effectiveRadius,
                child: content,
              )
            : content,
      ),
    );
  }
}
