import 'package:flutter/widgets.dart';

/// Corner radius scale tokens for cards, buttons, inputs, and dialogs.
abstract final class AafiyaRadius {
  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double xl = 16.0;
  static const double pill = 999.0;

  // Circular Radius constants
  static const Radius circularSm = Radius.circular(sm);
  static const Radius circularMd = Radius.circular(md);
  static const Radius circularLg = Radius.circular(lg);
  static const Radius circularXl = Radius.circular(xl);
  static const Radius circularPill = Radius.circular(pill);

  // Border radius tokens (Physical)
  static const BorderRadius borderSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius borderMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius borderLg = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius borderXl = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius borderPill = BorderRadius.all(Radius.circular(pill));

  // Directional border radius tokens (RTL-aware logical start/end)
  static const BorderRadiusDirectional directionalSmStart = BorderRadiusDirectional.horizontal(start: Radius.circular(sm));
  static const BorderRadiusDirectional directionalSmEnd = BorderRadiusDirectional.horizontal(end: Radius.circular(sm));
  static const BorderRadiusDirectional directionalMdStart = BorderRadiusDirectional.horizontal(start: Radius.circular(md));
  static const BorderRadiusDirectional directionalMdEnd = BorderRadiusDirectional.horizontal(end: Radius.circular(md));
  static const BorderRadiusDirectional directionalLgStart = BorderRadiusDirectional.horizontal(start: Radius.circular(lg));
  static const BorderRadiusDirectional directionalLgEnd = BorderRadiusDirectional.horizontal(end: Radius.circular(lg));
  static const BorderRadiusDirectional directionalXlStart = BorderRadiusDirectional.horizontal(start: Radius.circular(xl));
  static const BorderRadiusDirectional directionalXlEnd = BorderRadiusDirectional.horizontal(end: Radius.circular(xl));
}
