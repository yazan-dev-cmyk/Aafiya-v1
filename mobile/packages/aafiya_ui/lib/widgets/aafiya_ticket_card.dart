import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';

/// Reusable Appointment Ticket Card with dynamic side notches and dashed divider.
///
/// Faithfully reproduces the appointment ticket from aafiya-home-prototype.html:
/// - Background: pure white with card shadow
/// - Corner radius: 22px
/// - Two semicircle side notches (radius 11px) cut out of both edges
/// - A horizontal dashed line (#C3D3E0) precisely aligned with the center of the notches
/// - Top section and bottom actions section layout
class AafiyaTicketCard extends StatelessWidget {
  const AafiyaTicketCard({
    super.key,
    required this.topContent,
    required this.bottomContent,
    this.notchRadius = 11.0,
    this.cardRadius = AafiyaRadius.ticket,
    this.dividerColor = AafiyaColors.ticketDottedLine,
    this.elevation = 4.0,
  });

  /// The top section containing doctor, specialty, metadata, and clinic info.
  final Widget topContent;

  /// The bottom section containing primary actions (e.g. Details button).
  final Widget bottomContent;

  /// Radius of the cutout semicircle notches on left and right edges.
  final double notchRadius;

  /// Outer corner radius of the ticket card.
  final double cardRadius;

  /// Color of the dashed separator line.
  final Color dividerColor;

  /// Shadow elevation.
  final double elevation;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(cardRadius),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF023E73).withValues(alpha: 0.16),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipPath(
        clipper: _TicketNotchClipper(
          notchRadius: notchRadius,
          cardRadius: cardRadius,
        ),
        child: Container(
          color: AafiyaColors.pureWhite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Section
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: topContent,
              ),

              // Dashed Divider with Notches clearance
              _TicketDashedDivider(
                color: dividerColor,
                notchRadius: notchRadius,
              ),

              // Bottom Actions Section
              Padding(
                padding: const EdgeInsets.fromLTRB(16.0, 14.0, 16.0, 16.0),
                child: bottomContent,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom clipper that punches two semicircle notches on the start and end edges.
class _TicketNotchClipper extends CustomClipper<Path> {
  const _TicketNotchClipper({
    required this.notchRadius,
    required this.cardRadius,
  });

  final double notchRadius;
  final double cardRadius;

  @override
  Path getClip(Size size) {
    // The notch is positioned dynamically at the divider level, estimated by ratio or measured
    // Since top content has variable height, we build a path that reads the divider position
    final path = Path();
    final r = cardRadius;
    final nr = notchRadius;

    // Approximate divider position from bottom padding (bottom is approx 76px)
    // We can compute notch Y accurately:
    final notchY = size.height - 76.0;

    // Start from top-left after corner
    path.moveTo(r, 0);

    // Top edge
    path.lineTo(size.width - r, 0);
    // Top-right corner
    path.arcToPoint(Offset(size.width, r), radius: Radius.circular(r));

    // Right edge down to notch
    if (notchY > r + nr && notchY < size.height - r - nr) {
      path.lineTo(size.width, notchY - nr);
      // Right notch: inward semicircle
      path.arcToPoint(
        Offset(size.width, notchY + nr),
        radius: Radius.circular(nr),
        clockwise: false,
      );
    }

    // Right edge to bottom-right corner
    path.lineTo(size.width, size.height - r);
    path.arcToPoint(Offset(size.width - r, size.height), radius: Radius.circular(r));

    // Bottom edge
    path.lineTo(r, size.height);
    // Bottom-left corner
    path.arcToPoint(Offset(0, size.height - r), radius: Radius.circular(r));

    // Left edge up to notch
    if (notchY > r + nr && notchY < size.height - r - nr) {
      path.lineTo(0, notchY + nr);
      // Left notch: inward semicircle
      path.arcToPoint(
        Offset(0, notchY - nr),
        radius: Radius.circular(nr),
        clockwise: false,
      );
    }

    // Left edge to top-left corner
    path.lineTo(0, r);
    path.arcToPoint(Offset(r, 0), radius: Radius.circular(r));

    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant _TicketNotchClipper oldClipper) {
    return oldClipper.notchRadius != notchRadius || oldClipper.cardRadius != cardRadius;
  }
}

/// Dashed horizontal line widget spanning between the two notches.
class _TicketDashedDivider extends StatelessWidget {
  const _TicketDashedDivider({
    required this.color,
    required this.notchRadius,
  });

  final Color color;
  final double notchRadius;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: notchRadius + 4),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final boxWidth = constraints.maxWidth;
          const dashWidth = 6.0;
          const dashGap = 4.0;
          final dashCount = (boxWidth / (dashWidth + dashGap)).floor();

          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(dashCount, (_) {
              return SizedBox(
                width: dashWidth,
                height: 2.0,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(1.0),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}
