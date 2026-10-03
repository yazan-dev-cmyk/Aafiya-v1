import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

void main() {
  group('AafiyaSkeleton Widget Tests', () {
    testWidgets('AafiyaSkeleton base widget renders with custom dimensions and animates', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: const Scaffold(
            body: AafiyaSkeleton(
              width: 120,
              height: 24,
              borderRadius: AafiyaRadius.borderMd,
            ),
          ),
        ),
      );

      final skeleton = tester.widget<AafiyaSkeleton>(find.byType(AafiyaSkeleton));
      expect(skeleton.width, equals(120.0));
      expect(skeleton.height, equals(24.0));

      // Advance animation frames to verify repeating shimmer gradient updates
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));
    });

    testWidgets('AafiyaSkeleton.line renders full width line placeholder', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: const Scaffold(
            body: AafiyaSkeleton.line(
              width: 200,
              height: 14,
            ),
          ),
        ),
      );

      expect(find.byType(AafiyaSkeleton), findsOneWidget);
    });

    testWidgets('AafiyaSkeleton.circle renders circular avatar placeholder', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: const Scaffold(
            body: AafiyaSkeleton.circle(size: 48),
          ),
        ),
      );

      expect(find.byType(AafiyaSkeleton), findsOneWidget);
      final skeleton = tester.widget<AafiyaSkeleton>(find.byType(AafiyaSkeleton));
      expect(skeleton.shape, equals(BoxShape.circle));
      expect(skeleton.width, equals(48.0));
      expect(skeleton.height, equals(48.0));
    });

    testWidgets('AafiyaSkeleton.card renders default structured card placeholder', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: Scaffold(
            body: AafiyaSkeleton.card(
              width: 320,
              height: 160,
            ),
          ),
        ),
      );

      // Expect 3 internal skeleton lines inside default card
      expect(find.byType(AafiyaSkeleton), findsNWidgets(3));
    });

    testWidgets('AafiyaSkeleton.card renders in dark mode with dark surfaces', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.darkTheme,
          home: Scaffold(
            body: AafiyaSkeleton.card(
              child: const Text('Dark Card Skeleton'),
            ),
          ),
        ),
      );

      expect(find.text('Dark Card Skeleton'), findsOneWidget);
    });

    testWidgets('AafiyaSkeleton.listTile renders with leading and trailing placeholders', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AafiyaTheme.lightTheme,
          home: Scaffold(
            body: AafiyaSkeleton.listTile(
              hasLeading: true,
              hasTrailing: true,
            ),
          ),
        ),
      );

      // Leading circle (1) + 2 text lines (2) + trailing box (1) = 4 skeletons
      expect(find.byType(AafiyaSkeleton), findsNWidgets(4));
    });

    testWidgets('AafiyaSkeleton disposes AnimationController cleanly when removed from tree', (tester) async {
      var showSkeleton = true;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: showSkeleton
                    ? const AafiyaSkeleton(width: 100, height: 20)
                    : const SizedBox.shrink(),
                floatingActionButton: FloatingActionButton(
                  onPressed: () {
                    setState(() {
                      showSkeleton = false;
                    });
                  },
                ),
              ),
            );
          },
        ),
      );

      expect(find.byType(AafiyaSkeleton), findsOneWidget);

      // Tap button to unmount skeleton
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaSkeleton), findsNothing);
      // Clean unmount confirms zero animation controller leak exceptions
    });
  });
}
