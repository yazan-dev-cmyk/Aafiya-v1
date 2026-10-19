import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Algerian-inspired eight-point star (Khatam) geometric pattern widget.
///
/// Faithfully reproduces the SVG pattern from aafiya-home-prototype.html:
/// - 56x56 tile unit
/// - Two overlapping 28x28 squares (one rotated 45 degrees around center 28, 28)
/// - Center circle with radius 5
/// - Stroke width 1.2
/// - Opacity 0.13
/// - Fading mask from one edge to transparent by 75% width
class AafiyaKhatamPattern extends StatelessWidget {
  const AafiyaKhatamPattern({
    super.key,
    this.color = Colors.white,
    this.opacity = 0.13,
    this.tileSize = 56.0,
    this.fadeToTransparent = true,
  });

  /// Base stroke color of the geometric pattern.
  final Color color;

  /// Opacity multiplier (prototype default is 0.13).
  final double opacity;

  /// Width and height of each pattern tile unit in logical pixels.
  final double tileSize;

  /// Whether to apply a horizontal gradient fade to transparent.
  final bool fadeToTransparent;

  @override
  Widget build(BuildContext context) {
    final painter = RepaintBoundary(
      child: CustomPaint(
        painter: _KhatamPainter(
          color: color.withValues(alpha: opacity),
          tileSize: tileSize,
        ),
        size: Size.infinite,
      ),
    );

    if (!fadeToTransparent) {
      return painter;
    }

    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return ShaderMask(
      shaderCallback: (Rect bounds) {
        return LinearGradient(
          begin: isRtl ? Alignment.centerRight : Alignment.centerLeft,
          end: isRtl ? Alignment.centerLeft : Alignment.centerRight,
          colors: const [
            Colors.black,
            Colors.transparent,
          ],
          stops: const [0.0, 0.75],
        ).createShader(bounds);
      },
      blendMode: BlendMode.dstIn,
      child: painter,
    );
  }
}

class _KhatamPainter extends CustomPainter {
  const _KhatamPainter({
    required this.color,
    required this.tileSize,
  });

  final Color color;
  final double tileSize;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final cols = (size.width / tileSize).ceil() + 1;
    final rows = (size.height / tileSize).ceil() + 1;

    for (int r = 0; r < rows; r++) {
      for (int c = 0; c < cols; c++) {
        canvas.save();
        canvas.translate(c * tileSize, r * tileSize);

        final cx = tileSize / 2;
        final cy = tileSize / 2;
        const rectSize = 28.0;

        // Square 1: unrotated
        canvas.drawRect(
          Rect.fromCenter(center: Offset(cx, cy), width: rectSize, height: rectSize),
          paint,
        );

        // Square 2: rotated 45 degrees
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(45 * math.pi / 180);
        canvas.drawRect(
          Rect.fromCenter(center: Offset.zero, width: rectSize, height: rectSize),
          paint,
        );
        canvas.restore();

        // Center circle (radius 5)
        canvas.drawCircle(Offset(cx, cy), 5.0, paint);

        canvas.restore();
      }
    }
  }

  @override
  bool shouldRepaint(covariant _KhatamPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.tileSize != tileSize;
  }
}
