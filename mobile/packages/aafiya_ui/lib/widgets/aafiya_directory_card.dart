import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
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
      child: Material(
        color: AafiyaColors.pureWhite,
        borderRadius: BorderRadius.circular(AafiyaRadius.card),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AafiyaRadius.card),
          child: Container(
            padding: const EdgeInsets.all(14.0),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AafiyaRadius.card),
              border: Border.all(
                color: AafiyaColors.lineDivider,
                width: 1.0,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar
                Container(
                  width: 44.0,
                  height: 44.0,
                  decoration: BoxDecoration(
                    color: avatarColor ?? const Color(0xFFE6F1F9),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      color: AafiyaColors.royalBlue,
                      size: 22.0,
                    ),
                  ),
                ),
                const SizedBox(height: 10.0),

                // Name / Title
                Text(
                  title,
                  style: AafiyaTypography.directoryCardTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4.0),

                // Specialty / Subtitle
                Text(
                  subtitle,
                  style: AafiyaTypography.directoryCardSubtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6.0),

                // Location Row
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 14.0,
                      color: AafiyaColors.secondaryText,
                    ),
                    const SizedBox(width: 4.0),
                    Expanded(
                      child: Text(
                        location,
                        style: AafiyaTypography.directoryCardSubtitle,
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
    );
  }
}
