import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('AafiyaColors Tokens', () {
    test('brand colors match verified brand kit specifications', () {
      expect(AafiyaColors.healthBlue.toARGB32(), equals(0xFF0077B6));
      expect(AafiyaColors.healingGreen.toARGB32(), equals(0xFF48C774));
      expect(AafiyaColors.primaryText.toARGB32(), equals(0xFF0F172A));
      expect(AafiyaColors.secondaryText.toARGB32(), equals(0xFF475569));
      expect(AafiyaColors.lightBackground.toARGB32(), equals(0xFFF5F5F5));
      expect(AafiyaColors.pureWhite.toARGB32(), equals(0xFFFFFFFF));
      expect(AafiyaColors.border.toARGB32(), equals(0xFFE2E8F0));
    });

    test('brand aliases map directly to official colors', () {
      expect(AafiyaColors.aafiyaBlue, equals(AafiyaColors.healthBlue));
      expect(AafiyaColors.aafiyaGreen, equals(AafiyaColors.healingGreen));
      expect(AafiyaColors.primaryBlue, equals(AafiyaColors.healthBlue));
      expect(AafiyaColors.primaryGreen, equals(AafiyaColors.healingGreen));
    });

    test('semantic status colors match design specifications', () {
      expect(AafiyaColors.success.toARGB32(), equals(0xFF16A34A));
      expect(AafiyaColors.warning.toARGB32(), equals(0xFFD97706));
      expect(AafiyaColors.error.toARGB32(), equals(0xFFDC2626));
      expect(AafiyaColors.info.toARGB32(), equals(0xFF2563EB));
    });

    test('accessible role tokens match WCAG 2.1 AA specifications', () {
      expect(AafiyaColors.actionGreen.toARGB32(), equals(0xFF15803D));
      expect(AafiyaColors.linkBlue.toARGB32(), equals(0xFF005F92));
      expect(AafiyaColors.healingGreenSurface.toARGB32(), equals(0xFFE8F8EE));
      expect(AafiyaColors.onHealingGreen.toARGB32(), equals(0xFF0F172A));
    });

    test('dark theme tokens match dark-mode specifications', () {
      expect(AafiyaColors.darkBackground.toARGB32(), equals(0xFF0F172A));
      expect(AafiyaColors.darkSurface.toARGB32(), equals(0xFF1E293B));
      expect(AafiyaColors.darkBorder.toARGB32(), equals(0xFF334155));
      expect(AafiyaColors.darkPrimaryText.toARGB32(), equals(0xFFF8FAFC));
      expect(AafiyaColors.darkSecondaryText.toARGB32(), equals(0xFF94A3B8));
    });
  });

  group('AafiyaSpacing Tokens', () {
    test('numeric scale constants are deterministic', () {
      expect(AafiyaSpacing.xs, equals(4.0));
      expect(AafiyaSpacing.sm, equals(8.0));
      expect(AafiyaSpacing.md, equals(16.0));
      expect(AafiyaSpacing.lg, equals(24.0));
      expect(AafiyaSpacing.xl, equals(32.0));
      expect(AafiyaSpacing.xxl, equals(48.0));
    });

    test('physical insets match scale values', () {
      expect(AafiyaSpacing.insetAllXs, equals(const EdgeInsets.all(4.0)));
      expect(AafiyaSpacing.insetAllSm, equals(const EdgeInsets.all(8.0)));
      expect(AafiyaSpacing.insetAllMd, equals(const EdgeInsets.all(16.0)));
      expect(AafiyaSpacing.insetAllLg, equals(const EdgeInsets.all(24.0)));
      expect(AafiyaSpacing.insetAllXl, equals(const EdgeInsets.all(32.0)));
      expect(AafiyaSpacing.insetScreen, equals(const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0)));
      expect(AafiyaSpacing.insetCard, equals(const EdgeInsets.all(16.0)));
    });

    test('directional insets provide logical start/end values', () {
      expect(AafiyaSpacing.insetDirectionalAllXs, equals(const EdgeInsetsDirectional.all(4.0)));
      expect(AafiyaSpacing.insetDirectionalAllSm, equals(const EdgeInsetsDirectional.all(8.0)));
      expect(AafiyaSpacing.insetDirectionalAllMd, equals(const EdgeInsetsDirectional.all(16.0)));
      expect(AafiyaSpacing.insetDirectionalAllLg, equals(const EdgeInsetsDirectional.all(24.0)));
      expect(AafiyaSpacing.insetDirectionalAllXl, equals(const EdgeInsetsDirectional.all(32.0)));
      expect(AafiyaSpacing.insetDirectionalScreen, equals(const EdgeInsetsDirectional.symmetric(horizontal: 16.0, vertical: 8.0)));
      expect(AafiyaSpacing.insetDirectionalCard, equals(const EdgeInsetsDirectional.all(16.0)));
      expect(AafiyaSpacing.insetHorizontalSm, equals(const EdgeInsetsDirectional.symmetric(horizontal: 8.0)));
      expect(AafiyaSpacing.insetHorizontalMd, equals(const EdgeInsetsDirectional.symmetric(horizontal: 16.0)));
      expect(AafiyaSpacing.insetHorizontalLg, equals(const EdgeInsetsDirectional.symmetric(horizontal: 24.0)));
      expect(AafiyaSpacing.insetStartSm, equals(const EdgeInsetsDirectional.only(start: 8.0)));
      expect(AafiyaSpacing.insetStartMd, equals(const EdgeInsetsDirectional.only(start: 16.0)));
      expect(AafiyaSpacing.insetStartLg, equals(const EdgeInsetsDirectional.only(start: 24.0)));
      expect(AafiyaSpacing.insetEndSm, equals(const EdgeInsetsDirectional.only(end: 8.0)));
      expect(AafiyaSpacing.insetEndMd, equals(const EdgeInsetsDirectional.only(end: 16.0)));
      expect(AafiyaSpacing.insetEndLg, equals(const EdgeInsetsDirectional.only(end: 24.0)));
    });

    test('gap constants have matching width and height dimensions', () {
      expect(AafiyaSpacing.gapXs.width, equals(4.0));
      expect(AafiyaSpacing.gapXs.height, equals(4.0));
      expect(AafiyaSpacing.gapSm.width, equals(8.0));
      expect(AafiyaSpacing.gapSm.height, equals(8.0));
      expect(AafiyaSpacing.gapMd.width, equals(16.0));
      expect(AafiyaSpacing.gapMd.height, equals(16.0));
      expect(AafiyaSpacing.gapLg.width, equals(24.0));
      expect(AafiyaSpacing.gapLg.height, equals(24.0));
      expect(AafiyaSpacing.gapXl.width, equals(32.0));
      expect(AafiyaSpacing.gapXl.height, equals(32.0));
    });
  });

  group('AafiyaRadius Tokens', () {
    test('numeric radius constants are deterministic', () {
      expect(AafiyaRadius.sm, equals(4.0));
      expect(AafiyaRadius.md, equals(8.0));
      expect(AafiyaRadius.lg, equals(12.0));
      expect(AafiyaRadius.xl, equals(16.0));
      expect(AafiyaRadius.pill, equals(999.0));
    });

    test('circular radius constants match numeric values', () {
      expect(AafiyaRadius.circularSm, equals(const Radius.circular(4.0)));
      expect(AafiyaRadius.circularMd, equals(const Radius.circular(8.0)));
      expect(AafiyaRadius.circularLg, equals(const Radius.circular(12.0)));
      expect(AafiyaRadius.circularXl, equals(const Radius.circular(16.0)));
      expect(AafiyaRadius.circularPill, equals(const Radius.circular(999.0)));
    });

    test('border radius tokens match scale specifications', () {
      expect(AafiyaRadius.borderSm, equals(BorderRadius.circular(4.0)));
      expect(AafiyaRadius.borderMd, equals(BorderRadius.circular(8.0)));
      expect(AafiyaRadius.borderLg, equals(BorderRadius.circular(12.0)));
      expect(AafiyaRadius.borderXl, equals(BorderRadius.circular(16.0)));
      expect(AafiyaRadius.borderPill, equals(BorderRadius.circular(999.0)));
    });

    test('directional border radius tokens have correct start and end orientations', () {
      expect(AafiyaRadius.directionalSmStart, equals(const BorderRadiusDirectional.horizontal(start: Radius.circular(4.0))));
      expect(AafiyaRadius.directionalSmEnd, equals(const BorderRadiusDirectional.horizontal(end: Radius.circular(4.0))));
      expect(AafiyaRadius.directionalMdStart, equals(const BorderRadiusDirectional.horizontal(start: Radius.circular(8.0))));
      expect(AafiyaRadius.directionalMdEnd, equals(const BorderRadiusDirectional.horizontal(end: Radius.circular(8.0))));
      expect(AafiyaRadius.directionalLgStart, equals(const BorderRadiusDirectional.horizontal(start: Radius.circular(12.0))));
      expect(AafiyaRadius.directionalLgEnd, equals(const BorderRadiusDirectional.horizontal(end: Radius.circular(12.0))));
      expect(AafiyaRadius.directionalXlStart, equals(const BorderRadiusDirectional.horizontal(start: Radius.circular(16.0))));
      expect(AafiyaRadius.directionalXlEnd, equals(const BorderRadiusDirectional.horizontal(end: Radius.circular(16.0))));
    });
  });

  group('AafiyaTypography & IBM Plex Sans Arabic Tokens', () {
    test('fontFamily is IBMPlexSansArabic', () {
      expect(AafiyaTypography.fontFamily, equals('IBMPlexSansArabic'));
      expect(AafiyaTypography.package, equals('aafiya_ui'));
    });

    test('all text styles bind to IBMPlexSansArabic font family and aafiya_ui package', () {
      final styles = [
        AafiyaTypography.displayLarge,
        AafiyaTypography.displayMedium,
        AafiyaTypography.headlineLarge,
        AafiyaTypography.headlineMedium,
        AafiyaTypography.headlineSmall,
        AafiyaTypography.titleLarge,
        AafiyaTypography.titleMedium,
        AafiyaTypography.titleSmall,
        AafiyaTypography.bodyLarge,
        AafiyaTypography.bodyMedium,
        AafiyaTypography.bodySmall,
        AafiyaTypography.labelLarge,
        AafiyaTypography.labelMedium,
        AafiyaTypography.labelSmall,
        AafiyaTypography.caption,
      ];

      for (final style in styles) {
        expect(style.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      }
    });

    test('typography styles have correct font sizes and weights', () {
      expect(AafiyaTypography.displayLarge.fontSize, equals(28.0));
      expect(AafiyaTypography.displayLarge.fontWeight, equals(FontWeight.bold));

      expect(AafiyaTypography.displayMedium.fontSize, equals(24.0));
      expect(AafiyaTypography.displayMedium.fontWeight, equals(FontWeight.bold));

      expect(AafiyaTypography.headlineLarge.fontSize, equals(24.0));
      expect(AafiyaTypography.headlineLarge.fontWeight, equals(FontWeight.w700));

      expect(AafiyaTypography.headlineMedium.fontSize, equals(22.0));
      expect(AafiyaTypography.headlineMedium.fontWeight, equals(FontWeight.w700));

      expect(AafiyaTypography.headlineSmall.fontSize, equals(20.0));
      expect(AafiyaTypography.headlineSmall.fontWeight, equals(FontWeight.w700));

      expect(AafiyaTypography.titleLarge.fontSize, equals(18.0));
      expect(AafiyaTypography.titleLarge.fontWeight, equals(FontWeight.w600));

      expect(AafiyaTypography.titleMedium.fontSize, equals(16.0));
      expect(AafiyaTypography.titleMedium.fontWeight, equals(FontWeight.w600));

      expect(AafiyaTypography.titleSmall.fontSize, equals(14.0));
      expect(AafiyaTypography.titleSmall.fontWeight, equals(FontWeight.w600));

      expect(AafiyaTypography.bodyLarge.fontSize, equals(15.0));
      expect(AafiyaTypography.bodyLarge.fontWeight, equals(FontWeight.normal));

      expect(AafiyaTypography.bodyMedium.fontSize, equals(13.0));
      expect(AafiyaTypography.bodyMedium.fontWeight, equals(FontWeight.normal));

      expect(AafiyaTypography.bodySmall.fontSize, equals(12.0));
      expect(AafiyaTypography.bodySmall.fontWeight, equals(FontWeight.normal));

      expect(AafiyaTypography.labelLarge.fontSize, equals(14.0));
      expect(AafiyaTypography.labelLarge.fontWeight, equals(FontWeight.w600));

      expect(AafiyaTypography.labelMedium.fontSize, equals(12.0));
      expect(AafiyaTypography.labelMedium.fontWeight, equals(FontWeight.w600));

      expect(AafiyaTypography.labelSmall.fontSize, equals(11.0));
      expect(AafiyaTypography.labelSmall.fontWeight, equals(FontWeight.w500));

      expect(AafiyaTypography.caption.fontSize, equals(11.0));
      expect(AafiyaTypography.caption.fontWeight, equals(FontWeight.normal));
    });

    test('textTheme getter produces full Material 3 text theme with IBMPlexSansArabic', () {
      final textTheme = AafiyaTypography.textTheme;
      expect(textTheme.displayLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.displayMedium?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.headlineLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.headlineMedium?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.headlineSmall?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.titleLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.titleMedium?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.titleSmall?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.bodyLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.bodyMedium?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.bodySmall?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.labelLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.labelMedium?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(textTheme.labelSmall?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
    });

    test('darkTextTheme getter produces text theme with dark-mode colors and IBMPlexSansArabic', () {
      final darkTextTheme = AafiyaTypography.darkTextTheme;
      expect(darkTextTheme.displayLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(darkTextTheme.displayLarge?.color, equals(AafiyaColors.darkPrimaryText));
      expect(darkTextTheme.titleLarge?.color, equals(AafiyaColors.darkPrimaryText));
      expect(darkTextTheme.bodyLarge?.color, equals(AafiyaColors.darkPrimaryText));
      expect(darkTextTheme.bodyMedium?.color, equals(AafiyaColors.darkSecondaryText));
    });
  });

  group('AafiyaTheme Configuration', () {
    test('lightTheme contains official brand colors, IBMPlexSansArabic font, and textTheme', () {
      final theme = AafiyaTheme.lightTheme;
      expect(theme.textTheme.bodyLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(theme.textTheme.titleLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(theme.colorScheme.primary, equals(AafiyaColors.healthBlue));
      expect(theme.colorScheme.secondary, equals(AafiyaColors.healingGreen));
      expect(theme.colorScheme.onSecondary, equals(AafiyaColors.onHealingGreen));
      expect(theme.scaffoldBackgroundColor, equals(AafiyaColors.lightBackground));
      expect(theme.inputDecorationTheme.contentPadding, equals(const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 14)));
    });

    test('darkTheme contains dark surfaces, IBMPlexSansArabic font, and dark textTheme', () {
      final theme = AafiyaTheme.darkTheme;
      expect(theme.textTheme.bodyLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(theme.textTheme.titleLarge?.fontFamily?.contains('IBMPlexSansArabic'), isTrue);
      expect(theme.colorScheme.primary, equals(AafiyaColors.healthBlue));
      expect(theme.colorScheme.secondary, equals(AafiyaColors.healingGreen));
      expect(theme.colorScheme.onSecondary, equals(AafiyaColors.onHealingGreen));
      expect(theme.scaffoldBackgroundColor, equals(AafiyaColors.darkBackground));
      expect(theme.colorScheme.surface, equals(AafiyaColors.darkSurface));
      expect(theme.textTheme.titleLarge?.color, equals(AafiyaColors.darkPrimaryText));
    });
  });

  group('RTL Geometry Resolution', () {
    test('EdgeInsetsDirectional resolves start to right in RTL and left in LTR', () {
      const insetsStart = AafiyaSpacing.insetStartMd;

      final resolvedRtl = insetsStart.resolve(TextDirection.rtl);
      expect(resolvedRtl.right, equals(16.0));
      expect(resolvedRtl.left, equals(0.0));

      final resolvedLtr = insetsStart.resolve(TextDirection.ltr);
      expect(resolvedLtr.left, equals(16.0));
      expect(resolvedLtr.right, equals(0.0));

      const insetsEnd = AafiyaSpacing.insetEndSm;

      final resolvedEndRtl = insetsEnd.resolve(TextDirection.rtl);
      expect(resolvedEndRtl.left, equals(8.0));
      expect(resolvedEndRtl.right, equals(0.0));

      final resolvedEndLtr = insetsEnd.resolve(TextDirection.ltr);
      expect(resolvedEndLtr.right, equals(8.0));
      expect(resolvedEndLtr.left, equals(0.0));
    });

    test('BorderRadiusDirectional resolves start corner correctly in RTL and LTR', () {
      const radiusStart = AafiyaRadius.directionalMdStart;

      final resolvedRtl = radiusStart.resolve(TextDirection.rtl);
      expect(resolvedRtl.topRight, equals(const Radius.circular(8.0)));
      expect(resolvedRtl.bottomRight, equals(const Radius.circular(8.0)));
      expect(resolvedRtl.topLeft, equals(Radius.zero));
      expect(resolvedRtl.bottomLeft, equals(Radius.zero));

      final resolvedLtr = radiusStart.resolve(TextDirection.ltr);
      expect(resolvedLtr.topLeft, equals(const Radius.circular(8.0)));
      expect(resolvedLtr.bottomLeft, equals(const Radius.circular(8.0)));
      expect(resolvedLtr.topRight, equals(Radius.zero));
      expect(resolvedLtr.bottomRight, equals(Radius.zero));
    });

    testWidgets('Padding widget with EdgeInsetsDirectional renders properly in RTL', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: AafiyaSpacing.insetStartMd,
            child: SizedBox(width: 50, height: 50),
          ),
        ),
      );

      final paddingWidget = tester.widget<Padding>(find.byType(Padding));
      final resolved = paddingWidget.padding.resolve(TextDirection.rtl);
      expect(resolved.right, equals(16.0));
      expect(resolved.left, equals(0.0));
    });
  });

  group('Aafiya UI Widgets', () {
    testWidgets('AafiyaButton renders label and triggers tap', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: Scaffold(
            body: AafiyaButton(
              label: 'تسجيل الدخول',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('تسجيل الدخول'), findsOneWidget);
      await tester.tap(find.text('تسجيل الدخول'));
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('AafiyaButton secondary variant uses accessible onHealingGreen foreground', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: Scaffold(
            body: AafiyaButton(
              label: 'تأكيد الحضور',
              variant: AafiyaButtonVariant.secondary,
              onPressed: () {},
            ),
          ),
        ),
      );

      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      final style = button.style!;
      expect(style.backgroundColor?.resolve({}), equals(AafiyaColors.healingGreen));
      expect(style.foregroundColor?.resolve({}), equals(AafiyaColors.onHealingGreen));
    });

    testWidgets('AafiyaButton action variant uses accessible actionGreen background with pureWhite foreground', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: Scaffold(
            body: AafiyaButton(
              label: 'حفظ التغييرات',
              variant: AafiyaButtonVariant.action,
              onPressed: () {},
            ),
          ),
        ),
      );

      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      final style = button.style!;
      expect(style.backgroundColor?.resolve({}), equals(AafiyaColors.actionGreen));
      expect(style.foregroundColor?.resolve({}), equals(AafiyaColors.pureWhite));
    });

    testWidgets('AafiyaCard renders child content with border', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: const Scaffold(
            body: AafiyaCard(
              child: Text('Card Content'),
            ),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
    });

    testWidgets('AafiyaAppBar renders in RTL directionality correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              appBar: AafiyaAppBar(title: 'عافية'),
              body: SizedBox.shrink(),
            ),
          ),
        ),
      );

      expect(find.text('عافية'), findsOneWidget);
    });
  });
}
