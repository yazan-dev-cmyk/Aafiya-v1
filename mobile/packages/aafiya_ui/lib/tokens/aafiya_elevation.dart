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
}
