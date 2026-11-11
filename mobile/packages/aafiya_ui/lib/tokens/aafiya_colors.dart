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
  static const Color pureBlack = Color(0xFF000000);
  static const Color border = Color(0xFFDCE6EE);
  static const Color neutralLight = Color(0xFFF8FAFC);
  static const Color blueSoft = Color(0xFFE6F1F9);
  static const Color indigoSoft = Color(0xFFE8EEFB);
  static const Color indigoInk = Color(0xFF2B4FA8);

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

  // Approved Design Palette (AAFIYA-APPS-DESIGN-SYSTEM-ADOPTION-01)
  static const Color navy = Color(0xFF102B59);
  static const Color medicalBlue = Color(0xFF0879BD);
  static const Color deepBlue = Color(0xFF07518F);
  static const Color darkBlueGradient = Color(0xFF0754A1);
  static const Color teal = Color(0xFF08AD9C);
  static const Color tealBright = Color(0xFF08BFAE);
  static const Color tealActiveNav = Color(0xFF087C73);
  static const Color tealActiveNavBg = Color(0xFFDFF8F3);
  static const Color royalBlue = Color(0xFF0077B6);
  static const Color tealAccent = Color(0xFF0E9F8E);
  static const Color tealDeep = Color(0xFF0B8074);
  static const Color tealButton = Color(0xFF0B8074);
  static const Color tealInk = Color(0xFF0A6F64);
  static const Color tealSoft = Color(0xFFE0F5F2);
  static const Color scaffoldBg = Color(0xFFF1F8FC);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color cardBorder = Color(0xFFE2EBF1);
  static const Color lineDivider = Color(0xFFDCE8F0);
  static const Color ticketDottedLine = Color(0xFFC3D3E0);
  static const Color unreadBadge = Color(0xFFE52E3A);

  // Notice Banner Surface Tokens
  static const Color noticeBg = Color(0xFFE1F8ED);
  static const Color noticeBorder = Color(0xFFB9EFD3);
  static const Color noticeText = Color(0xFF16764E);

  // Quick Action Pastel Tokens (68x68 Circular Bubbles)
  static const Color redSoftBg = Color(0xFFFFF0F1);
  static const Color redInk = Color(0xFFC82436);
  static const Color blueSoftBg = Color(0xFFEAF0FF);
  static const Color blueInk = Color(0xFF2365BD);
  static const Color greenSoftBg = Color(0xFFE3F8F3);
  static const Color greenInk = Color(0xFF078B78);
  static const Color cyanSoftBg = Color(0xFFE8F5FC);
  static const Color cyanInk = Color(0xFF087BB5);

  // Filter Chip Tokens
  static const Color filterActiveBg = Color(0xFF07518F);
  static const Color filterActiveText = Color(0xFFFFFFFF);
  static const Color filterInactiveBg = Color(0xFFFFFFFF);
  static const Color filterInactiveBorder = Color(0xFFD7E4EE);
  static const Color filterInactiveText = Color(0xFF58677D);

  // Accessible Status Tokens (WCAG 2.1 AA Compliant >= 4.5:1)
  static const Color statusConfirmedBg = Color(0xFFE3F6EA);
  static const Color statusConfirmedBorder = Color(0xFFBBF7D0);
  static const Color statusConfirmedInk = Color(0xFF166534); // CR: 6.33:1

  static const Color amberDark = Color(0xFFF59E0B);
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
  /// Primary Action Button Gradient (linear-gradient(100deg, #08BFAE 0%, #0785C5 55%, #0754A1 100%))
  static const LinearGradient primaryButtonGradient = LinearGradient(
    begin: AlignmentDirectional.centerStart,
    end: AlignmentDirectional.centerEnd,
    colors: [
      Color(0xFF08BFAE),
      Color(0xFF0785C5),
      Color(0xFF0754A1),
    ],
    stops: [0.0, 0.55, 1.0],
  );

  /// Background Scaffold Atmospheric Gradient
  static const LinearGradient scaffoldGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color(0xFFEAF6FC),
      Color(0xFFF7FBFD),
      Color(0xFFEDF6FB),
    ],
    stops: [0.0, 0.45, 1.0],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color(0xFF102B59),
      Color(0xFF07549A),
      Color(0xFF0879BD),
    ],
    stops: [0.0, 0.55, 1.0],
  );

  static const LinearGradient brandMarkGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color(0xFF08BFAE),
      Color(0xFF08AD9C),
    ],
  );
}
