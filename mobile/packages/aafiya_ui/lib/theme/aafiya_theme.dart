import 'package:flutter/material.dart';
import '../tokens/aafiya_colors.dart';
import '../tokens/aafiya_radius.dart';
import '../tokens/aafiya_typography.dart';

/// Central Theme builder for AAFIYA mobile applications.
abstract final class AafiyaTheme {
  /// Light theme matching official AAFIYA brand specifications.
  static ThemeData get lightTheme {
    const colorScheme = ColorScheme.light(
      primary: AafiyaColors.healthBlue,
      onPrimary: AafiyaColors.pureWhite,
      secondary: AafiyaColors.healingGreen,
      onSecondary: AafiyaColors.onHealingGreen,
      surface: AafiyaColors.pureWhite,
      onSurface: AafiyaColors.primaryText,
      error: AafiyaColors.error,
      onError: AafiyaColors.pureWhite,
      outline: AafiyaColors.border,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: AafiyaTypography.fontFamily,
      colorScheme: colorScheme,
      textTheme: AafiyaTypography.textTheme,
      scaffoldBackgroundColor: AafiyaColors.lightBackground,
      appBarTheme: AppBarTheme(
        backgroundColor: AafiyaColors.pureWhite,
        foregroundColor: AafiyaColors.primaryText,
        elevation: 0,
        centerTitle: true,
        scrolledUnderElevation: 1,
        titleTextStyle: AafiyaTypography.titleLarge,
      ),
      cardTheme: const CardThemeData(
        color: AafiyaColors.pureWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AafiyaRadius.borderLg,
          side: BorderSide(color: AafiyaColors.border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AafiyaColors.healthBlue,
          foregroundColor: AafiyaColors.pureWhite,
          minimumSize: const Size.fromHeight(48),
          shape: const RoundedRectangleBorder(
            borderRadius: AafiyaRadius.borderMd,
          ),
          textStyle: AafiyaTypography.labelLarge,
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AafiyaColors.pureWhite,
        contentPadding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 14),
        border: const OutlineInputBorder(
          borderRadius: AafiyaRadius.borderMd,
          borderSide: BorderSide(color: AafiyaColors.border),
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: AafiyaRadius.borderMd,
          borderSide: BorderSide(color: AafiyaColors.border),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: AafiyaRadius.borderMd,
          borderSide: BorderSide(color: AafiyaColors.healthBlue, width: 1.5),
        ),
        errorBorder: const OutlineInputBorder(
          borderRadius: AafiyaRadius.borderMd,
          borderSide: BorderSide(color: AafiyaColors.error),
        ),
        hintStyle: AafiyaTypography.bodyMedium,
      ),
    );
  }

  /// Dark theme prepared for future dark-mode enablement.
  static ThemeData get darkTheme {
    const colorScheme = ColorScheme.dark(
      primary: AafiyaColors.healthBlue,
      onPrimary: AafiyaColors.pureWhite,
      secondary: AafiyaColors.healingGreen,
      onSecondary: AafiyaColors.onHealingGreen,
      surface: AafiyaColors.darkSurface,
      onSurface: AafiyaColors.darkPrimaryText,
      error: AafiyaColors.error,
      onError: AafiyaColors.pureWhite,
      outline: AafiyaColors.darkBorder,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: AafiyaTypography.fontFamily,
      colorScheme: colorScheme,
      textTheme: AafiyaTypography.darkTextTheme,
      scaffoldBackgroundColor: AafiyaColors.darkBackground,
      appBarTheme: AppBarTheme(
        backgroundColor: AafiyaColors.darkSurface,
        foregroundColor: AafiyaColors.darkPrimaryText,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AafiyaTypography.titleLarge.copyWith(
          color: AafiyaColors.darkPrimaryText,
        ),
      ),
      cardTheme: const CardThemeData(
        color: AafiyaColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AafiyaRadius.borderLg,
          side: BorderSide(color: AafiyaColors.darkBorder, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
    );
  }
}
