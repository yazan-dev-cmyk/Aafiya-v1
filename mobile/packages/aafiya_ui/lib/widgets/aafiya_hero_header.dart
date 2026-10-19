import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_typography.dart';
import 'aafiya_brand_mark.dart';
import 'aafiya_khatam_pattern.dart';

/// Hero Header widget following the visual prototype.
///
/// Features:
/// - 160-degree linear gradient (Navy #023E73 -> #04569A -> #0069A8)
/// - Background Algerian 8-point Khatam star pattern
/// - Brand mark row with optional trailing action
/// - Title and subtitle typography tokens
/// - Configurable bottom padding to accommodate overlapping slot cards
class AafiyaHeroHeader extends StatelessWidget {
  const AafiyaHeroHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailingAction,
    this.brandTitle = 'عافية',
    this.bottomPadding = 72.0,
  });

  /// Main headline greeting (e.g. "مرحباً، سمير").
  final String title;

  /// Subtitle / temporal status message (e.g. "موعدك القادم بعد 3 أيام").
  final String? subtitle;

  /// Optional trailing widget in the top bar (e.g. QR shortcut or settings).
  final Widget? trailingAction;

  /// Wordmark brand label (defaults to "عافية").
  final String brandTitle;

  /// Bottom inset to reserve space for the overlapping ticket slot.
  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AafiyaColors.heroGradient,
      ),
      child: Stack(
        children: [
          // Background geometric Khatam pattern
          const Positioned.fill(
            child: AafiyaKhatamPattern(),
          ),

          // Content Layer
          SafeArea(
            bottom: false,
            child: Padding(
              padding: EdgeInsetsDirectional.fromSTEB(
                20.0,
                16.0,
                20.0,
                bottomPadding,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top Bar: Brand Mark + Trailing Action
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      AafiyaBrandMark(title: brandTitle),
                      if (trailingAction != null) trailingAction!,
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Greeting Title
                  Text(
                    title,
                    style: AafiyaTypography.heroGreeting,
                  ),

                  // Optional Subtitle
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: AafiyaTypography.heroSubtitle,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
