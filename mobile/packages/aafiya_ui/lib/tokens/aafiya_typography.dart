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
    'IBMPlexSansArabic',
    'PlusJakartaSans',
    'Amiri',
    'sans-serif',
  ];

  /// Resolves the canonical primary font family according to language code.
  static String fontFamilyFor(String languageCode) {
    switch (languageCode) {
      case 'ar':
        return fontFamily;
      case 'fr':
      case 'en':
      default:
        return fallbackFontFamily;
    }
  }

  /// Resolves the dual-script font fallbacks according to language code.
  static List<String> fontFallbacksFor(String languageCode) {
    if (languageCode == 'ar') {
      return const [
        'PlusJakartaSans',
        'Amiri',
        'sans-serif',
      ];
    }
    return const [
      'IBMPlexSansArabic',
      'Amiri',
      'sans-serif',
    ];
  }

  /// Base text style builder with local font bundling and disciplined line heights.
  static TextStyle _style({
    required double fontSize,
    required FontWeight fontWeight,
    required Color color,
    required double height,
    double? letterSpacing,
    String? languageCode,
  }) {
    return TextStyle(
      fontFamily:
          languageCode != null ? fontFamilyFor(languageCode) : fontFamily,
      package: package,
      fontFamilyFallback:
          languageCode != null ? fontFallbacksFor(languageCode) : fontFallbacks,
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  /// Public text style builder for locale-aware styling.
  static TextStyle styleFor({
    required double fontSize,
    required FontWeight fontWeight,
    required Color color,
    required double height,
    double? letterSpacing,
    String languageCode = 'ar',
  }) {
    return _style(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
      letterSpacing: letterSpacing,
      languageCode: languageCode,
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

  // Prototype Specific Typography Tokens (aafiya-home-prototype.html)
  static final TextStyle heroGreeting = _style(
    fontSize: 26,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.pureWhite,
    height: 1.35,
  );

  static final TextStyle heroSubtitle = _style(
    fontSize: 15.5,
    fontWeight: FontWeight.w500,
    color: AafiyaColors.pureWhite.withValues(alpha: 0.9),
    height: 1.4,
  );

  static final TextStyle ticketDoctorName = _style(
    fontSize: 17,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle ticketDoctorSpecialty = _style(
    fontSize: 14.5,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.4,
  );

  static final TextStyle sectionHeader = _style(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle shortcutLabel = _style(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  static final TextStyle directoryCardTitle = _style(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.4,
  );

  static final TextStyle directoryCardSubtitle = _style(
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.35,
  );

  static final TextStyle bottomNavLabel = _style(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.secondaryText,
    height: 1.2,
  );

  static final TextStyle bottomNavLabelActive = _style(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.tealInk,
    height: 1.2,
  );

  /// Returns light TextTheme tailored for the specified [languageCode].
  static TextTheme textThemeFor(String languageCode) => TextTheme(
        displayLarge: styleFor(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
            color: AafiyaColors.primaryText,
            height: 1.25,
            languageCode: languageCode),
        displayMedium: styleFor(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.3,
            color: AafiyaColors.primaryText,
            height: 1.25,
            languageCode: languageCode),
        headlineLarge: styleFor(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AafiyaColors.primaryText,
            height: 1.3,
            languageCode: languageCode),
        headlineMedium: styleFor(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AafiyaColors.primaryText,
            height: 1.3,
            languageCode: languageCode),
        headlineSmall: styleFor(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AafiyaColors.primaryText,
            height: 1.3,
            languageCode: languageCode),
        titleLarge: styleFor(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AafiyaColors.primaryText,
            height: 1.35,
            languageCode: languageCode),
        titleMedium: styleFor(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AafiyaColors.primaryText,
            height: 1.35,
            languageCode: languageCode),
        titleSmall: styleFor(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AafiyaColors.primaryText,
            height: 1.35,
            languageCode: languageCode),
        bodyLarge: styleFor(
            fontSize: 15,
            fontWeight: FontWeight.normal,
            color: AafiyaColors.primaryText,
            height: 1.45,
            languageCode: languageCode),
        bodyMedium: styleFor(
            fontSize: 13,
            fontWeight: FontWeight.normal,
            color: AafiyaColors.secondaryText,
            height: 1.45,
            languageCode: languageCode),
        bodySmall: styleFor(
            fontSize: 12,
            fontWeight: FontWeight.normal,
            color: AafiyaColors.secondaryText,
            height: 1.45,
            languageCode: languageCode),
        labelLarge: styleFor(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.1,
            color: AafiyaColors.pureWhite,
            height: 1.2,
            languageCode: languageCode),
        labelMedium: styleFor(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.1,
            color: AafiyaColors.primaryText,
            height: 1.2,
            languageCode: languageCode),
        labelSmall: styleFor(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.1,
            color: AafiyaColors.secondaryText,
            height: 1.2,
            languageCode: languageCode),
      );

  /// Returns dark TextTheme tailored for the specified [languageCode].
  static TextTheme darkTextThemeFor(String languageCode) {
    final light = textThemeFor(languageCode);
    return TextTheme(
      displayLarge:
          light.displayLarge?.copyWith(color: AafiyaColors.darkPrimaryText),
      displayMedium:
          light.displayMedium?.copyWith(color: AafiyaColors.darkPrimaryText),
      headlineLarge:
          light.headlineLarge?.copyWith(color: AafiyaColors.darkPrimaryText),
      headlineMedium:
          light.headlineMedium?.copyWith(color: AafiyaColors.darkPrimaryText),
      headlineSmall:
          light.headlineSmall?.copyWith(color: AafiyaColors.darkPrimaryText),
      titleLarge:
          light.titleLarge?.copyWith(color: AafiyaColors.darkPrimaryText),
      titleMedium:
          light.titleMedium?.copyWith(color: AafiyaColors.darkPrimaryText),
      titleSmall:
          light.titleSmall?.copyWith(color: AafiyaColors.darkPrimaryText),
      bodyLarge: light.bodyLarge?.copyWith(color: AafiyaColors.darkPrimaryText),
      bodyMedium:
          light.bodyMedium?.copyWith(color: AafiyaColors.darkSecondaryText),
      bodySmall:
          light.bodySmall?.copyWith(color: AafiyaColors.darkSecondaryText),
      labelLarge: light.labelLarge,
      labelMedium:
          light.labelMedium?.copyWith(color: AafiyaColors.darkPrimaryText),
      labelSmall:
          light.labelSmall?.copyWith(color: AafiyaColors.darkSecondaryText),
    );
  }

  /// Material 3 TextTheme mapped with light palette colors and local IBM Plex typography (Arabic default).
  static TextTheme get textTheme => textThemeFor('ar');

  /// Material 3 TextTheme mapped with dark palette colors and local IBM Plex typography (Arabic default).
  static TextTheme get darkTextTheme => darkTextThemeFor('ar');
}
