import 'package:flutter/widgets.dart';

/// Spacing scale tokens for padding, margin, and layout gaps.
abstract final class AafiyaSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;

  // Predefined insets (Physical)
  static const EdgeInsets insetAllXs = EdgeInsets.all(xs);
  static const EdgeInsets insetAllSm = EdgeInsets.all(sm);
  static const EdgeInsets insetAllMd = EdgeInsets.all(md);
  static const EdgeInsets insetAllLg = EdgeInsets.all(lg);
  static const EdgeInsets insetAllXl = EdgeInsets.all(xl);

  static const EdgeInsets insetScreen = EdgeInsets.symmetric(horizontal: md, vertical: sm);
  static const EdgeInsets insetCard = EdgeInsets.all(md);

  // Directional insets for RTL-aware geometry (Logical start/end)
  static const EdgeInsetsDirectional insetDirectionalAllXs = EdgeInsetsDirectional.all(xs);
  static const EdgeInsetsDirectional insetDirectionalAllSm = EdgeInsetsDirectional.all(sm);
  static const EdgeInsetsDirectional insetDirectionalAllMd = EdgeInsetsDirectional.all(md);
  static const EdgeInsetsDirectional insetDirectionalAllLg = EdgeInsetsDirectional.all(lg);
  static const EdgeInsetsDirectional insetDirectionalAllXl = EdgeInsetsDirectional.all(xl);

  static const EdgeInsetsDirectional insetDirectionalScreen = EdgeInsetsDirectional.symmetric(horizontal: md, vertical: sm);
  static const EdgeInsetsDirectional insetDirectionalCard = EdgeInsetsDirectional.all(md);

  static const EdgeInsetsDirectional insetHorizontalSm = EdgeInsetsDirectional.symmetric(horizontal: sm);
  static const EdgeInsetsDirectional insetHorizontalMd = EdgeInsetsDirectional.symmetric(horizontal: md);
  static const EdgeInsetsDirectional insetHorizontalLg = EdgeInsetsDirectional.symmetric(horizontal: lg);

  static const EdgeInsetsDirectional insetStartSm = EdgeInsetsDirectional.only(start: sm);
  static const EdgeInsetsDirectional insetStartMd = EdgeInsetsDirectional.only(start: md);
  static const EdgeInsetsDirectional insetStartLg = EdgeInsetsDirectional.only(start: lg);

  static const EdgeInsetsDirectional insetEndSm = EdgeInsetsDirectional.only(end: sm);
  static const EdgeInsetsDirectional insetEndMd = EdgeInsetsDirectional.only(end: md);
  static const EdgeInsetsDirectional insetEndLg = EdgeInsetsDirectional.only(end: lg);

  // Gap constants for layout spacing
  static const SizedBox gapXs = SizedBox(width: xs, height: xs);
  static const SizedBox gapSm = SizedBox(width: sm, height: sm);
  static const SizedBox gapMd = SizedBox(width: md, height: md);
  static const SizedBox gapLg = SizedBox(width: lg, height: lg);
  static const SizedBox gapXl = SizedBox(width: xl, height: xl);
}
