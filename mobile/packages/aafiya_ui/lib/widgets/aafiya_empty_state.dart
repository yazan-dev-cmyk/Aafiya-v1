import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';

/// Reusable Empty State widget matching the prototype visual specification.
///
/// Features:
/// - Rounded card (radius 22px) with subtle elevation
/// - Calendar illustration with teal plus badge
/// - Bold title (18pt)
/// - Explanatory guidance text (14.5pt, line height 1.7)
/// - Full-width primary CTA button
class AafiyaEmptyState extends StatelessWidget {
  const AafiyaEmptyState({
    super.key,
    required this.title,
    required this.description,
    required this.buttonLabel,
    required this.onButtonPressed,
    this.illustration,
  });

  /// The headline text (e.g. "ليس لديك موعد قادم").
  final String title;

  /// The explanatory message.
  final String description;

  /// Label for the primary action button.
  final String buttonLabel;

  /// Callback when the action button is pressed.
  final VoidCallback onButtonPressed;

  /// Optional custom illustration. Defaults to the clipboard artwork.
  final Widget? illustration;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 22.0),
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.ticket),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF023E73).withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Illustration Artwork
          Center(
            child: illustration ?? const _DefaultEmptyIllustration(),
          ),
          const SizedBox(height: 12.0),

          // Title
          Text(
            title,
            style: AafiyaTypography.titleLarge.copyWith(
              fontSize: 18.0,
              fontWeight: FontWeight.w700,
              color: AafiyaColors.primaryText,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8.0),

          // Description
          Text(
            description,
            style: AafiyaTypography.bodyMedium.copyWith(
              fontSize: 14.5,
              color: AafiyaColors.secondaryText,
              height: 1.6,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20.0),

          // Full-width CTA Button
          AafiyaButton(
            label: buttonLabel,
            onPressed: onButtonPressed,
            variant: AafiyaButtonVariant.primary,
          ),
        ],
      ),
    );
  }
}

/// Vector calendar clipboard illustration reproducing the prototype SVG.
class _DefaultEmptyIllustration extends StatelessWidget {
  const _DefaultEmptyIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 92.0,
      height: 92.0,
      child: CustomPaint(
        painter: _CalendarIllustrationPainter(),
      ),
    );
  }
}

class _CalendarIllustrationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 96.0;
    canvas.save();
    canvas.scale(scale);

    // Calendar background base
    final basePaint = Paint()..color = const Color(0xFFE6F1F9);
    final baseRect = RRect.fromRectAndRadius(
      const Rect.fromLTWH(14, 20, 68, 62),
      const Radius.circular(12),
    );
    canvas.drawRRect(baseRect, basePaint);

    // Header bar (Health Blue)
    final headerPaint = Paint()..color = AafiyaColors.healthBlue;
    final headerRect = RRect.fromRectAndRadius(
      const Rect.fromLTWH(14, 20, 68, 18),
      const Radius.circular(9),
    );
    canvas.drawRRect(headerRect, headerPaint);

    // Rings/Hangers (Navy #023E73)
    final ringPaint = Paint()..color = AafiyaColors.navy;
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(30, 12, 6, 16), const Radius.circular(3)),
      ringPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(60, 12, 6, 16), const Radius.circular(3)),
      ringPaint,
    );

    // Calendar grid dots
    final dotPaint = Paint()..color = Colors.white;
    const dots = [
      Offset(32, 52),
      Offset(48, 52),
      Offset(64, 52),
      Offset(32, 67),
      Offset(48, 67),
    ];
    for (final dot in dots) {
      canvas.drawCircle(dot, 4.0, dotPaint);
    }

    // Badge Circle (Teal #0B8074)
    final badgePaint = Paint()..color = AafiyaColors.tealDeep;
    canvas.drawCircle(const Offset(68, 68), 14.0, badgePaint);

    // Plus icon inside badge
    final plusPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(68, 61), const Offset(68, 75), plusPaint);
    canvas.drawLine(const Offset(61, 68), const Offset(75, 68), plusPaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
