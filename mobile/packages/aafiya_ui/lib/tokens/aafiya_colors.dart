import 'package:flutter/material.dart';

/// AAFIYA Brand & Design System Color Palette.
///
/// Verified directly against:
/// `logo/Aafiya_Final_Brand_Kit/13_Guidelines/Color_Specifications.csv`
abstract final class AafiyaColors {
  // Brand Identity Colors
  static const Color healthBlue = Color(0xFF0077B6);
  static const Color healingGreen = Color(0xFF48C774);

  // Unambiguous Brand Aliases
  static const Color aafiyaBlue = healthBlue;
  static const Color aafiyaGreen = healingGreen;
  static const Color primaryBlue = healthBlue;
  static const Color primaryGreen = healingGreen;

  // Surface & Text (Light Mode)
  static const Color primaryText = Color(0xFF0F172A);
  static const Color secondaryText = Color(0xFF475569);
  static const Color lightBackground = Color(0xFFF5F5F5);
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);

  // Semantic Status Colors
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color error = Color(0xFFDC2626);
  static const Color info = Color(0xFF2563EB);

  // Dark Theme Tokens (Dark-readiness)
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkBorder = Color(0xFF334155);
  static const Color darkPrimaryText = Color(0xFFF8FAFC);
  static const Color darkSecondaryText = Color(0xFF94A3B8);
}
