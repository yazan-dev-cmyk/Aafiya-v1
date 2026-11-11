import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_elevation.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_button.dart';

/// Reusable Empty State widget matching the approved design reference:
/// - Hero card radius: 34px (AafiyaRadius.cardHero)
/// - Elevation shadow: AafiyaElevation.heroCardShadow (0 18px 40px rgba(29,87,137,.13))
/// - Calendar illustration with teal plus badge
/// - Bold title (22pt, Navy #142E5D)
/// - Explanatory guidance text (15pt, line height 1.7)
/// - Full-width primary pill gradient CTA button (52dp height)
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
      padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 26.0),
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.cardHero),
        border: Border.all(
          color: Colors.white,
          width: 1.0,
        ),
        boxShadow: AafiyaElevation.heroCardShadow,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Illustration Artwork
          Center(
            child: illustration ?? const _DefaultEmptyIllustration(),
          ),
          const SizedBox(height: 14.0),

          // Title
          Text(
            title,
            style: AafiyaTypography.titleLarge.copyWith(
              fontSize: 22.0,
              fontWeight: FontWeight.w700,
              color: AafiyaColors.navy,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8.0),

          // Description
          Text(
            description,
            style: AafiyaTypography.bodyMedium.copyWith(
              fontSize: 15.0,
              color: const Color(0xFF63718B),
              height: 1.6,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 22.0),

          // Full-width Gradient Pill CTA Button
          AafiyaButton(
            label: buttonLabel,
            onPressed: onButtonPressed,
            variant: AafiyaButtonVariant.gradient,
            isPill: true,
            height: 52.0,
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
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(30, 12, 6, 16), const Radius.circular(3)),
      ringPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(60, 12, 6, 16), const Radius.circular(3)),
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
