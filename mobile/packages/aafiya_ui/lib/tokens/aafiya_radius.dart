import 'package:flutter/widgets.dart';

/// Corner radius scale tokens for cards, buttons, inputs, and dialogs.
abstract final class AafiyaRadius {
  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double xl = 16.0;
  static const double pill = 999.0;

  // Prototype Specific Radii
  static const double brandMark = 13.0;
  static const double button = 14.0;
  static const double card = 18.0;
  static const double ticket = 22.0;
  static const double sheet = 26.0;
  static const double shortcutCircle = 58.0;

  // Circular Radius constants
  static const Radius circularSm = Radius.circular(sm);
  static const Radius circularMd = Radius.circular(md);
  static const Radius circularLg = Radius.circular(lg);
  static const Radius circularXl = Radius.circular(xl);
  static const Radius circularPill = Radius.circular(pill);
  static const Radius circularBrandMark = Radius.circular(brandMark);
  static const Radius circularButton = Radius.circular(button);
  static const Radius circularCard = Radius.circular(card);
  static const Radius circularTicket = Radius.circular(ticket);
  static const Radius circularSheet = Radius.circular(sheet);

  // Border radius tokens (Physical)
  static const BorderRadius borderSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius borderMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius borderLg = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius borderXl = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius borderPill = BorderRadius.all(Radius.circular(pill));
  static const BorderRadius borderBrandMark = BorderRadius.all(Radius.circular(brandMark));
  static const BorderRadius borderButton = BorderRadius.all(Radius.circular(button));
  static const BorderRadius borderCard = BorderRadius.all(Radius.circular(card));
  static const BorderRadius borderTicket = BorderRadius.all(Radius.circular(ticket));
  static const BorderRadius borderSheet = BorderRadius.vertical(top: Radius.circular(sheet));

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
