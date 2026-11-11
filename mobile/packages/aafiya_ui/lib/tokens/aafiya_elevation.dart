import 'package:flutter/material.dart';

/// Elevation and box shadow tokens for AAFIYA V1.
/// Aligned across Flutter mobile and Web Tailwind surface depths.
class AafiyaElevation {
  const AafiyaElevation._();

  // Numeric elevation constants for Material widgets
  static const double none = 0.0;
  static const double xs = 1.0;
  static const double sm = 2.0;
  static const double md = 4.0;
  static const double lg = 8.0;
  static const double xl = 12.0;

  // Box shadow definitions for Container / BoxDecoration decorations
  static const List<BoxShadow> shadowNone = [];

  /// Subtle elevation shadow (sm)
  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x0D000000), // rgba(0, 0, 0, 0.05)
      offset: Offset(0, 1),
      blurRadius: 2,
      spreadRadius: 0,
    ),
  ];

  /// Standard card elevation shadow (md)
  static const List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
      offset: Offset(0, 4),
      blurRadius: 6,
      spreadRadius: -1,
    ),
    BoxShadow(
      color: Color(0x0F000000), // rgba(0, 0, 0, 0.06)
      offset: Offset(0, 2),
      blurRadius: 4,
      spreadRadius: -1,
    ),
  ];

  /// Prominent elevation shadow (lg)
  static const List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Color(0x1A000000), // rgba(0, 0, 0, 0.1)
      offset: Offset(0, 10),
      blurRadius: 15,
      spreadRadius: -3,
    ),
    BoxShadow(
      color: Color(0x0D000000), // rgba(0, 0, 0, 0.05)
      offset: Offset(0, 4),
      blurRadius: 6,
      spreadRadius: -2,
    ),
  ];

  /// Floating/modal elevation shadow (xl)
  static const List<BoxShadow> shadowXl = [
    BoxShadow(
      color: Color(0x26000000), // rgba(0, 0, 0, 0.15)
      offset: Offset(0, 20),
      blurRadius: 25,
      spreadRadius: -5,
    ),
    BoxShadow(
      color: Color(0x0A000000), // rgba(0, 0, 0, 0.04)
      offset: Offset(0, 10),
      blurRadius: 10,
      spreadRadius: -5,
    ),
  ];

  /// Specialized card shadow token
  static const List<BoxShadow> card = shadowSm;

  /// Specialized modal bottom sheet / dialog shadow token
  static const List<BoxShadow> modal = shadowLg;

  // Approved Design Shadows (AAFIYA-APPS-DESIGN-SYSTEM-ADOPTION-01)
  /// Canonical soft card elevation shadow: 0 14px 36px rgba(26, 78, 125, 0.10)
  static const List<BoxShadow> softCardShadow = [
    BoxShadow(
      color: Color(0x1A1A4E7D), // rgba(26, 78, 125, 0.10)
      offset: Offset(0, 14),
      blurRadius: 36,
      spreadRadius: 0,
    ),
  ];

  /// Hero appointment calendar card shadow: 0 18px 40px rgba(29, 87, 137, 0.13)
  static const List<BoxShadow> heroCardShadow = [
    BoxShadow(
      color: Color(0x211D5789), // rgba(29, 87, 137, 0.13)
      offset: Offset(0, 18),
      blurRadius: 40,
      spreadRadius: 0,
    ),
  ];

  /// Primary pill action button gradient shadow: 0 12px 22px rgba(0, 126, 185, 0.20)
  static const List<BoxShadow> primaryButtonShadow = [
    BoxShadow(
      color: Color(0x33007EB9), // rgba(0, 126, 185, 0.20)
      offset: Offset(0, 12),
      blurRadius: 22,
      spreadRadius: 0,
    ),
  ];

  /// Circular quick action bubble shadow: 0 8px 17px rgba(38, 83, 120, 0.08)
  static const List<BoxShadow> bubbleShadow = [
    BoxShadow(
      color: Color(0x14265378), // rgba(38, 83, 120, 0.08)
      offset: Offset(0, 8),
      blurRadius: 17,
      spreadRadius: 0,
    ),
  ];

  /// Filter pill active state shadow: 0 7px 15px rgba(7, 81, 143, 0.15)
  static const List<BoxShadow> filterActiveShadow = [
    BoxShadow(
      color: Color(0x2607518F), // rgba(7, 81, 143, 0.15)
      offset: Offset(0, 7),
      blurRadius: 15,
      spreadRadius: 0,
    ),
  ];

  /// Directory card subtle shadow: 0 9px 22px rgba(32, 77, 117, 0.07)
  static const List<BoxShadow> directoryCardShadow = [
    BoxShadow(
      color: Color(0x12204D75), // rgba(32, 77, 117, 0.07)
      offset: Offset(0, 9),
      blurRadius: 22,
      spreadRadius: 0,
    ),
  ];
}
