import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_spacing.dart';

/// Reusable AAFIYA Card container with standard borders and padding.
class AafiyaCard extends StatelessWidget {
  const AafiyaCard({
    super.key,
    required this.child,
    this.padding = AafiyaSpacing.insetCard,
    this.onTap,
    this.borderColor,
    this.backgroundColor,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? borderColor;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: padding,
      child: child,
    );

    return Material(
      color: backgroundColor ?? AafiyaColors.pureWhite,
      shape: RoundedRectangleBorder(
        borderRadius: AafiyaRadius.borderLg,
        side: BorderSide(
          color: borderColor ?? AafiyaColors.border,
          width: 1.0,
        ),
      ),
      child: onTap != null
          ? InkWell(
              onTap: onTap,
              borderRadius: AafiyaRadius.borderLg,
              child: content,
            )
          : content,
    );
  }
}
