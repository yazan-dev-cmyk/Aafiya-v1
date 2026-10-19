import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// AAFIYA Brand Mark widget following aafiya-home-prototype.html.
///
/// Consists of a 40x40 rounded square (radius 13) with a gradient
/// from #27C3B1 to #0B8074 containing a centered white plus cross,
/// optionally accompanied by the brand wordmark.
class AafiyaBrandMark extends StatelessWidget {
  const AafiyaBrandMark({
    super.key,
    this.title = 'عافية',
    this.showWordmark = true,
    this.markSize = 40.0,
    this.titleStyle,
  });

  /// The text wordmark displayed alongside the mark.
  final String title;

  /// Whether to display the text wordmark.
  final bool showWordmark;

  /// Size (width and height) of the mark icon container.
  final double markSize;

  /// Custom typography style for the wordmark.
  final TextStyle? titleStyle;

  @override
  Widget build(BuildContext context) {
    final effectiveTitleStyle = titleStyle ??
        AafiyaTypography.titleLarge.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: AafiyaColors.pureWhite,
          letterSpacing: 0,
        );

    final markContainer = Container(
      width: markSize,
      height: markSize,
      decoration: BoxDecoration(
        gradient: AafiyaColors.brandMarkGradient,
        borderRadius: BorderRadius.circular(AafiyaRadius.brandMark),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          Icons.add_rounded,
          color: AafiyaColors.pureWhite,
          size: markSize * 0.55,
        ),
      ),
    );

    if (!showWordmark) {
      return markContainer;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        markContainer,
        const SizedBox(width: 10),
        Text(
          title,
          style: effectiveTitleStyle,
        ),
      ],
    );
  }
}
