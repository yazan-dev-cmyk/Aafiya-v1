import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  group('AafiyaBreakpoints & Responsive Tokens Tests', () {
    test('screenTypeFromWidth resolves correct screen categories', () {
      // Compact (< 400dp)
      expect(AafiyaBreakpoints.screenTypeFromWidth(320.0), equals(AafiyaScreenType.compact));
      expect(AafiyaBreakpoints.screenTypeFromWidth(360.0), equals(AafiyaScreenType.compact));
      expect(AafiyaBreakpoints.screenTypeFromWidth(375.0), equals(AafiyaScreenType.compact));
      expect(AafiyaBreakpoints.screenTypeFromWidth(390.0), equals(AafiyaScreenType.compact));
      expect(AafiyaBreakpoints.screenTypeFromWidth(399.9), equals(AafiyaScreenType.compact));

      // Medium (400dp - 599dp)
      expect(AafiyaBreakpoints.screenTypeFromWidth(400.0), equals(AafiyaScreenType.medium));
      expect(AafiyaBreakpoints.screenTypeFromWidth(412.0), equals(AafiyaScreenType.medium));
      expect(AafiyaBreakpoints.screenTypeFromWidth(500.0), equals(AafiyaScreenType.medium));
      expect(AafiyaBreakpoints.screenTypeFromWidth(599.9), equals(AafiyaScreenType.medium));

      // Expanded (>= 600dp)
      expect(AafiyaBreakpoints.screenTypeFromWidth(600.0), equals(AafiyaScreenType.expanded));
      expect(AafiyaBreakpoints.screenTypeFromWidth(768.0), equals(AafiyaScreenType.expanded));
      expect(AafiyaBreakpoints.screenTypeFromWidth(1024.0), equals(AafiyaScreenType.expanded));
    });

    testWidgets('AafiyaResponsive renders compact layout on 360dp phone width', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AafiyaResponsive(
              compact: Text('Compact View'),
              medium: Text('Medium View'),
              expanded: Text('Expanded View'),
            ),
          ),
        ),
      );

      expect(find.text('Compact View'), findsOneWidget);
      expect(find.text('Medium View'), findsNothing);
      expect(find.text('Expanded View'), findsNothing);
    });

    testWidgets('AafiyaResponsive renders medium layout on 480dp width', (tester) async {
      tester.view.physicalSize = const Size(480, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AafiyaResponsive(
              compact: Text('Compact View'),
              medium: Text('Medium View'),
              expanded: Text('Expanded View'),
            ),
          ),
        ),
      );

      expect(find.text('Compact View'), findsNothing);
      expect(find.text('Medium View'), findsOneWidget);
      expect(find.text('Expanded View'), findsNothing);
    });

    testWidgets('AafiyaResponsive renders expanded layout on 720dp width', (tester) async {
      tester.view.physicalSize = const Size(720, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AafiyaResponsive(
              compact: Text('Compact View'),
              medium: Text('Medium View'),
              expanded: Text('Expanded View'),
            ),
          ),
        ),
      );

      expect(find.text('Compact View'), findsNothing);
      expect(find.text('Medium View'), findsNothing);
      expect(find.text('Expanded View'), findsOneWidget);
    });

    testWidgets('AafiyaResponsive falls back gracefully when medium/expanded omitted', (tester) async {
      // 500dp with only compact provided -> fallback to compact
      tester.view.physicalSize = const Size(500, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AafiyaResponsive(
              compact: Text('Fallback Compact View'),
            ),
          ),
        ),
      );

      expect(find.text('Fallback Compact View'), findsOneWidget);
    });

    testWidgets('AafiyaResponsiveBuilder delivers active screen type and context extensions work', (tester) async {
      tester.view.physicalSize = const Size(375, 667);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      AafiyaScreenType? observedScreenType;
      bool? observedIsCompact;
      bool? observedIsMedium;
      bool? observedIsExpanded;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AafiyaResponsiveBuilder(
              builder: (context, screenType) {
                observedScreenType = screenType;
                observedIsCompact = context.isCompact;
                observedIsMedium = context.isMedium;
                observedIsExpanded = context.isExpanded;
                return Text('Active: ${screenType.name}');
              },
            ),
          ),
        ),
      );

      expect(observedScreenType, equals(AafiyaScreenType.compact));
      expect(observedIsCompact, isTrue);
      expect(observedIsMedium, isFalse);
      expect(observedIsExpanded, isFalse);
      expect(find.text('Active: compact'), findsOneWidget);
    });
  });

  group('AafiyaElevation Tokens Tests', () {
    test('numeric elevation tokens match scale', () {
      expect(AafiyaElevation.none, equals(0.0));
      expect(AafiyaElevation.xs, equals(1.0));
      expect(AafiyaElevation.sm, equals(2.0));
      expect(AafiyaElevation.md, equals(4.0));
      expect(AafiyaElevation.lg, equals(8.0));
      expect(AafiyaElevation.xl, equals(12.0));
    });

    test('box shadow tokens match elevation surface depths', () {
      expect(AafiyaElevation.shadowNone, isEmpty);
      expect(AafiyaElevation.shadowSm, isNotEmpty);
      expect(AafiyaElevation.shadowMd.length, equals(2));
      expect(AafiyaElevation.shadowLg.length, equals(2));
      expect(AafiyaElevation.shadowXl.length, equals(2));
      expect(AafiyaElevation.card, equals(AafiyaElevation.shadowSm));
      expect(AafiyaElevation.modal, equals(AafiyaElevation.shadowLg));
    });
  });
}
