import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_core/aafiya_core.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase A — Workstream A1 & A2: Typography & Shared Theme Configuration',
      () {
    test(
        'A-01 & A-04: Arabic Theme uses IBM Plex Sans Arabic with package namespace',
        () {
      final theme = AafiyaTheme.themeFor(const Locale('ar'));

      // Check primary font family and package
      expect(theme.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');
      expect(theme.textTheme.titleLarge?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');
      expect(theme.textTheme.labelLarge?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');

      // Check fallback list
      final fallbacks = theme.textTheme.bodyMedium?.fontFamilyFallback;
      expect(fallbacks, isNotNull);
      expect(fallbacks, contains('packages/aafiya_ui/PlusJakartaSans'));

      // Check Amiri is not default interactive control font
      expect(
          theme.elevatedButtonTheme.style?.textStyle?.resolve({})?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');
      expect(theme.inputDecorationTheme.hintStyle?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');
    });

    test(
        'A-03 & A-06: Latin Theme uses Plus Jakarta Sans with package namespace',
        () {
      final themeFr = AafiyaTheme.themeFor(const Locale('fr'));

      // Check primary font family for French
      expect(themeFr.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');
      expect(themeFr.textTheme.titleLarge?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');
      expect(themeFr.textTheme.labelLarge?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');

      // Check fallback list contains Arabic font for dual-script robustness
      final fallbacks = themeFr.textTheme.bodyMedium?.fontFamilyFallback;
      expect(fallbacks, isNotNull);
      expect(fallbacks, contains('packages/aafiya_ui/IBMPlexSansArabic'));

      final themeEn = AafiyaTheme.themeFor(const Locale('en'));
      expect(themeEn.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');
    });

    test(
        'A-07: Runtime font resolution layout with TextPainter for Arabic and Latin',
        () {
      // 1. Arabic TextPainter layout
      final arabicStyle = AafiyaTypography.styleFor(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AafiyaColors.primaryText,
        height: 1.35,
        languageCode: 'ar',
      );
      expect(arabicStyle.fontFamily, 'packages/aafiya_ui/IBMPlexSansArabic');

      final arabicPainter = TextPainter(
        text: TextSpan(text: 'مرحبا بك في عافية 1234 دج', style: arabicStyle),
        textDirection: TextDirection.rtl,
      )..layout(maxWidth: 390);

      expect(arabicPainter.width, greaterThan(0));
      expect(arabicPainter.height, greaterThan(0));
      expect(arabicPainter.didExceedMaxLines, isFalse);

      // 2. Latin TextPainter layout
      final latinStyle = AafiyaTypography.styleFor(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AafiyaColors.primaryText,
        height: 1.35,
        languageCode: 'fr',
      );
      expect(latinStyle.fontFamily, 'packages/aafiya_ui/PlusJakartaSans');

      final latinPainter = TextPainter(
        text:
            TextSpan(text: 'Bienvenue sur Aafiya 1234 DZD', style: latinStyle),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 390);

      expect(latinPainter.width, greaterThan(0));
      expect(latinPainter.height, greaterThan(0));
      expect(latinPainter.didExceedMaxLines, isFalse);
    });
  });

  group('Phase A — Workstream A3: Locale Directionality & Dynamics', () {
    test('A-05: Arabic locale defines RTL directionality and Arabic typography',
        () {
      final localeAr = AafiyaSupportedLocale.fromLanguageCode('ar');
      expect(localeAr.isRtl, isTrue);
      expect(localeAr.textDirection, TextDirection.rtl);

      final theme = AafiyaTheme.themeFor(localeAr.locale);
      expect(theme.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/IBMPlexSansArabic');
    });

    test(
        'A-06: French and English locales define LTR directionality and Latin typography',
        () {
      final localeFr = AafiyaSupportedLocale.fromLanguageCode('fr');
      expect(localeFr.isRtl, isFalse);
      expect(localeFr.textDirection, TextDirection.ltr);

      final themeFr = AafiyaTheme.themeFor(localeFr.locale);
      expect(themeFr.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');

      final localeEn = AafiyaSupportedLocale.fromLanguageCode('en');
      expect(localeEn.isRtl, isFalse);
      expect(localeEn.textDirection, TextDirection.ltr);

      final themeEn = AafiyaTheme.themeFor(localeEn.locale);
      expect(themeEn.textTheme.bodyMedium?.fontFamily,
          'packages/aafiya_ui/PlusJakartaSans');
    });

    testWidgets('MaterialApp inherits dynamic locale theme and direction',
        (tester) async {
      Locale currentLocale = const Locale('ar');

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              theme: AafiyaTheme.themeFor(currentLocale),
              locale: currentLocale,
              supportedLocales: AafiyaSupportedLocale.supportedLocales,
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              home: Builder(
                builder: (context) {
                  final theme = Theme.of(context);
                  final direction = Directionality.of(context);
                  return Scaffold(
                    body: Column(
                      children: [
                        Text('Direction: ${direction.name}',
                            key: const ValueKey('dir_text')),
                        Text('Font: ${theme.textTheme.bodyMedium?.fontFamily}',
                            key: const ValueKey('font_text')),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              currentLocale = const Locale('fr');
                            });
                          },
                          child: const Text('Switch to French'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            );
          },
        ),
      );

      // Initial Arabic assertion
      expect(find.text('Direction: rtl'), findsOneWidget);
      expect(find.text('Font: packages/aafiya_ui/IBMPlexSansArabic'),
          findsOneWidget);

      // Switch to French without app restart
      await tester.tap(find.text('Switch to French'));
      await tester.pumpAndSettle();

      // Updated French assertion
      expect(find.text('Direction: ltr'), findsOneWidget);
      expect(find.text('Font: packages/aafiya_ui/PlusJakartaSans'),
          findsOneWidget);
    });
  });

  group('Phase A — Workstream A4: Typography Guardrails', () {
    test(
        'A-10: Amiri is strictly forbidden as default font on interactive UI controls',
        () {
      final themeAr = AafiyaTheme.themeFor(const Locale('ar'));

      // Check interactive button themes
      final elevatedStyle =
          themeAr.elevatedButtonTheme.style?.textStyle?.resolve({});
      expect(elevatedStyle?.fontFamily, isNot(contains('Amiri')));

      // Check input decoration
      final hintStyle = themeAr.inputDecorationTheme.hintStyle;
      expect(hintStyle?.fontFamily, isNot(contains('Amiri')));

      // Check app bar title
      final appBarTitleStyle = themeAr.appBarTheme.titleTextStyle;
      expect(appBarTitleStyle?.fontFamily, isNot(contains('Amiri')));
    });
  });
}
