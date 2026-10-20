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

  // Accessible Role-Based Action & Surface Tokens (WCAG 2.1 AA Compliant)
  /// Accessible high-contrast green for filled action CTAs with white text (Contrast 5.02:1).
  static const Color actionGreen = Color(0xFF15803D);

  /// Accessible link blue for text links on light background (Contrast 6.31:1).
  static const Color linkBlue = Color(0xFF005F92);

  /// Surface tint for healingGreen chips, tags, and badge backgrounds.
  static const Color healingGreenSurface = Color(0xFFE8F8EE);

  /// Foreground text/icon color on healingGreen surfaces (Contrast 8.24:1, WCAG AAA).
  static const Color onHealingGreen = Color(0xFF0F172A);

  // Surface & Text (Light Mode)
  static const Color primaryText = Color(0xFF0F172A);
  static const Color secondaryText = Color(0xFF475569);
  static const Color lightBackground = Color(0xFFF5F5F5);
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFDCE6EE);

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

  // Prototype Visual Palette (aafiya-home-prototype.html)
  static const Color navy = Color(0xFF023E73);
  static const Color royalBlue = Color(0xFF0077B6);
  static const Color tealAccent = Color(0xFF0E9F8E);
  static const Color tealDeep = Color(0xFF0B8074);
  static const Color tealButton = Color(0xFF0B8074);
  static const Color tealInk = Color(0xFF0A6F64);
  static const Color tealSoft = Color(0xFFE0F5F2);
  static const Color scaffoldBg = Color(0xFFF4F8FB);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color lineDivider = Color(0xFFDCE6EE);
  static const Color ticketDottedLine = Color(0xFFC3D3E0);

  // Accessible Status Tokens (WCAG 2.1 AA Compliant >= 4.5:1)
  static const Color statusConfirmedBg = Color(0xFFE3F6EA);
  static const Color statusConfirmedInk = Color(0xFF166534); // CR: 6.33:1

  static const Color statusPendingBg = Color(0xFFFEF1DC);
  static const Color statusPendingInk = Color(0xFF92400E); // CR: 6.36:1

  static const Color statusConcludedBg = Color(0xFFF1F5F9);
  static const Color statusConcludedInk = Color(0xFF475569); // CR: 6.92:1

  static const Color statusUrgentBg = Color(0xFFFDECEC);
  static const Color statusUrgentInk =
      Color(0xFFB91C1C); // CR: 5.66:1 (WCAG AA compliant for normal text)
  static const Color statusUrgentAccent =
      Color(0xFFDC2626); // Preserved for large text/icons (CR: 4.23:1)

  // Gradients
  static const LinearGradient heroGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color(0xFF023E73),
      Color(0xFF04569A),
      Color(0xFF0069A8),
    ],
    stops: [0.0, 0.6, 1.0],
  );

  static const LinearGradient brandMarkGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color(0xFF27C3B1),
      Color(0xFF0B8074),
    ],
  );
}
