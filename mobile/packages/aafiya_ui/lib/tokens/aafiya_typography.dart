import 'package:flutter/material.dart';
import 'aafiya_colors.dart';

/// Central Typography definitions for AAFIYA design system.
///
/// Uses locally bundled IBM Plex Sans Arabic (Option B) for authentic, high-clarity
/// Arabic (RTL) typography with native Latin glyphs and Plus Jakarta Sans fallback,
/// maintaining 100% offline stability with zero runtime network font fetching.
abstract final class AafiyaTypography {
  /// The local package asset identifier where fonts are bundled.
  static const String package = 'aafiya_ui';

  /// The official Arabic typeface for AAFIYA mobile applications.
  static const String fontFamily = 'IBMPlexSansArabic';

  /// Secondary Latin and digital UI fallback typeface.
  static const String fallbackFontFamily = 'PlusJakartaSans';

  /// Standard font fallback list for dual-script robustness.
  static const List<String> fontFallbacks = [
    'PlusJakartaSans',
    'Noto Sans Arabic',
    'sans-serif',
  ];

  /// Base text style builder with local font bundling and disciplined line heights.
  static TextStyle _style({
    required double fontSize,
    required FontWeight fontWeight,
    required Color color,
    required double height,
    double? letterSpacing,
  }) {
    return TextStyle(
      fontFamily: fontFamily,
      package: package,
      fontFamilyFallback: fontFallbacks,
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  // Display Styles
  static final TextStyle displayLarge = _style(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    color: AafiyaColors.primaryText,
    height: 1.25,
  );

  static final TextStyle displayMedium = _style(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    color: AafiyaColors.primaryText,
    height: 1.25,
  );

  // Headline Styles
  static final TextStyle headlineLarge = _style(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  static final TextStyle headlineMedium = _style(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  static final TextStyle headlineSmall = _style(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  // Title Styles
  static final TextStyle titleLarge = _style(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle titleMedium = _style(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle titleSmall = _style(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  // Body Styles
  static final TextStyle bodyLarge = _style(
    fontSize: 15,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.primaryText,
    height: 1.45,
  );

  static final TextStyle bodyMedium = _style(
    fontSize: 13,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.45,
  );

  static final TextStyle bodySmall = _style(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.45,
  );

  // Label Styles
  static final TextStyle labelLarge = _style(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AafiyaColors.pureWhite,
    height: 1.2,
  );

  static final TextStyle labelMedium = _style(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AafiyaColors.primaryText,
    height: 1.2,
  );

  static final TextStyle labelSmall = _style(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: AafiyaColors.secondaryText,
    height: 1.2,
  );

  // Caption & Helper Styles
  static final TextStyle caption = _style(
    fontSize: 11,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.25,
  );

  /// Material 3 TextTheme mapped with light palette colors and local IBM Plex typography.
  static TextTheme get textTheme => TextTheme(
    displayLarge: displayLarge,
    displayMedium: displayMedium,
    headlineLarge: headlineLarge,
    headlineMedium: headlineMedium,
    headlineSmall: headlineSmall,
    titleLarge: titleLarge,
    titleMedium: titleMedium,
    titleSmall: titleSmall,
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelLarge,
    labelMedium: labelMedium,
    labelSmall: labelSmall,
  );

  /// Material 3 TextTheme mapped with dark palette colors and local IBM Plex typography.
  static TextTheme get darkTextTheme => TextTheme(
    displayLarge: displayLarge.copyWith(color: AafiyaColors.darkPrimaryText),
    displayMedium: displayMedium.copyWith(color: AafiyaColors.darkPrimaryText),
    headlineLarge: headlineLarge.copyWith(color: AafiyaColors.darkPrimaryText),
    headlineMedium: headlineMedium.copyWith(color: AafiyaColors.darkPrimaryText),
    headlineSmall: headlineSmall.copyWith(color: AafiyaColors.darkPrimaryText),
    titleLarge: titleLarge.copyWith(color: AafiyaColors.darkPrimaryText),
    titleMedium: titleMedium.copyWith(color: AafiyaColors.darkPrimaryText),
    titleSmall: titleSmall.copyWith(color: AafiyaColors.darkPrimaryText),
    bodyLarge: bodyLarge.copyWith(color: AafiyaColors.darkPrimaryText),
    bodyMedium: bodyMedium.copyWith(color: AafiyaColors.darkSecondaryText),
    bodySmall: bodySmall.copyWith(color: AafiyaColors.darkSecondaryText),
    labelLarge: labelLarge,
    labelMedium: labelMedium.copyWith(color: AafiyaColors.darkPrimaryText),
    labelSmall: labelSmall.copyWith(color: AafiyaColors.darkSecondaryText),
  );
}
