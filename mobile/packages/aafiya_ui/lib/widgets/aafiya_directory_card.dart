import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_elevation.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// Reusable Directory Card for the horizontal carousel in the patient home screen.
///
/// Features:
/// - Fixed width 176px for horizontal scroll snap
/// - Rounded corners 18px with subtle border (#DCE6EE)
/// - Avatar 44x44
/// - Title (15pt, bold)
/// - Specialty or subtitle (13.5pt, muted)
/// - Location / Wilaya with pin icon (13.5pt)
/// - STRICT EXCLUSION (EXCL-02): Zero unverified "Open Today" badges.
class AafiyaDirectoryCard extends StatelessWidget {
  const AafiyaDirectoryCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.location,
    required this.onTap,
    this.icon = Icons.person_rounded,
    this.avatarColor,
    this.width = 176.0,
  });

  /// The name of the doctor, clinic, or booking center.
  final String title;

  /// The specialty or classification.
  final String subtitle;

  /// The Wilaya or address.
  final String location;

  /// Action when tapped.
  final VoidCallback onTap;

  /// Icon inside the avatar.
  final IconData icon;

  /// Custom avatar background tint.
  final Color? avatarColor;

  /// Card width (defaults to 176.0 matching prototype).
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        decoration: BoxDecoration(
          color: AafiyaColors.pureWhite,
          borderRadius: AafiyaRadius.borderCardLg,
          border: Border.all(
            color: AafiyaColors.cardBorder,
            width: 1.0,
          ),
          boxShadow: AafiyaElevation.directoryCardShadow,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: AafiyaRadius.borderCardLg,
          child: InkWell(
            onTap: onTap,
            borderRadius: AafiyaRadius.borderCardLg,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Avatar / Icon Container
                  Container(
                    width: 45.0,
                    height: 45.0,
                    decoration: BoxDecoration(
                      color: avatarColor ?? const Color(0xFFE9F5FC),
                      borderRadius: BorderRadius.circular(16.0),
                    ),
                    child: Center(
                      child: Icon(
                        icon,
                        color: const Color(0xFF087BB7),
                        size: 23.0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10.0),

                  // Name / Title
                  Text(
                    title,
                    style: AafiyaTypography.directoryCardTitle.copyWith(
                      color: AafiyaColors.navy,
                      fontWeight: FontWeight.w700,
                      fontSize: 15.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4.0),

                  // Specialty / Subtitle
                  Text(
                    subtitle,
                    style: AafiyaTypography.directoryCardSubtitle.copyWith(
                      color: const Color(0xFF697991),
                      fontSize: 13.0,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8.0),

                  // Location Row
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 14.0,
                        color: Color(0xFF596B88),
                      ),
                      const SizedBox(width: 4.0),
                      Expanded(
                        child: Text(
                          location,
                          style: AafiyaTypography.directoryCardSubtitle.copyWith(
                            color: const Color(0xFF596B88),
                            fontSize: 12.0,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
