import 'package:flutter/widgets.dart';

/// Supported application locales and directionality indicators.
enum AafiyaSupportedLocale {
  arabic(Locale('ar'), TextDirection.rtl, 'العربية'),
  english(Locale('en'), TextDirection.ltr, 'English'),
  french(Locale('fr'), TextDirection.ltr, 'Français');

  const AafiyaSupportedLocale(this.locale, this.textDirection, this.displayName);

  final Locale locale;
  final TextDirection textDirection;
  final String displayName;

  bool get isRtl => textDirection == TextDirection.rtl;

  static AafiyaSupportedLocale fromLanguageCode(String code) {
    return switch (code.toLowerCase()) {
      'ar' => AafiyaSupportedLocale.arabic,
      'en' => AafiyaSupportedLocale.english,
      'fr' => AafiyaSupportedLocale.french,
      _ => AafiyaSupportedLocale.arabic,
    };
  }

  static const List<Locale> supportedLocales = [
    Locale('ar'),
    Locale('en'),
    Locale('fr'),
  ];
}
