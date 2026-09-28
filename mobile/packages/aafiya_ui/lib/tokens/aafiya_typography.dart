import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'aafiya_colors.dart';

/// Central Typography definitions for AAFIYA design system.
/// Uses Amiri font family (via google_fonts) for authentic Arabic (RTL) typography
/// while maintaining full compatibility with Latin (LTR) scripts.
abstract final class AafiyaTypography {
  /// The official Arabic typeface for AAFIYA mobile applications.
  static String get fontFamily => GoogleFonts.amiri().fontFamily ?? 'Amiri';

  // Display Styles
  static final TextStyle displayLarge = GoogleFonts.amiri(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  static final TextStyle displayMedium = GoogleFonts.amiri(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    color: AafiyaColors.primaryText,
    height: 1.3,
  );

  // Headline Styles
  static final TextStyle headlineLarge = GoogleFonts.amiri(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle headlineMedium = GoogleFonts.amiri(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  static final TextStyle headlineSmall = GoogleFonts.amiri(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AafiyaColors.primaryText,
    height: 1.35,
  );

  // Title Styles
  static final TextStyle titleLarge = GoogleFonts.amiri(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.4,
  );

  static final TextStyle titleMedium = GoogleFonts.amiri(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.4,
  );

  static final TextStyle titleSmall = GoogleFonts.amiri(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AafiyaColors.primaryText,
    height: 1.4,
  );

  // Body Styles
  static final TextStyle bodyLarge = GoogleFonts.amiri(
    fontSize: 15,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.primaryText,
    height: 1.5,
  );

  static final TextStyle bodyMedium = GoogleFonts.amiri(
    fontSize: 13,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.5,
  );

  static final TextStyle bodySmall = GoogleFonts.amiri(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
    height: 1.5,
  );

  // Label Styles
  static final TextStyle labelLarge = GoogleFonts.amiri(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AafiyaColors.pureWhite,
  );

  static final TextStyle labelMedium = GoogleFonts.amiri(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AafiyaColors.primaryText,
  );

  static final TextStyle labelSmall = GoogleFonts.amiri(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: AafiyaColors.secondaryText,
  );

  // Caption & Helper Styles
  static final TextStyle caption = GoogleFonts.amiri(
    fontSize: 11,
    fontWeight: FontWeight.normal,
    color: AafiyaColors.secondaryText,
  );

  /// Material 3 TextTheme mapped with light palette colors and Amiri typography.
  static TextTheme get textTheme => GoogleFonts.amiriTextTheme(
    TextTheme(
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
    ),
  );

  /// Material 3 TextTheme mapped with dark palette colors and Amiri typography.
  static TextTheme get darkTextTheme => GoogleFonts.amiriTextTheme(
    TextTheme(
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
    ),
  );
}
