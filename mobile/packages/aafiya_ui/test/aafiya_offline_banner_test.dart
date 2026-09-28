import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

Widget buildTestableWidget({
  required Widget child,
  Locale locale = const Locale('ar'),
}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: AafiyaSupportedLocale.supportedLocales,
    localizationsDelegates: const [
      AafiyaLocalizationsDelegate(),
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: child),
  );
}

void main() {
  group('AafiyaOfflineBanner Widget Tests', () {
    late MockConnectivityService mockConnectivity;

    setUp(() {
      mockConnectivity = MockConnectivityService(initialOnline: true);
    });

    tearDown(() {
      mockConnectivity.dispose();
    });

    testWidgets('Banner is hidden when device is online', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        child: AafiyaOfflineBanner(connectivityService: mockConnectivity),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaOfflineBanner), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_rounded), findsNothing);
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsNothing);
    });

    testWidgets('Banner appears with warning styling when going offline (Arabic)', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('ar'),
        child: AafiyaOfflineBanner(connectivityService: mockConnectivity),
      ));
      await tester.pumpAndSettle();

      // Trigger offline event
      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsOneWidget);
    });

    testWidgets('Banner appears with English localization when going offline', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('en'),
        child: AafiyaOfflineBanner(connectivityService: mockConnectivity),
      ));
      await tester.pumpAndSettle();

      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
      expect(find.text('No Internet Connection'), findsOneWidget);
    });

    testWidgets('Banner transitions to green Reconnected and auto-dismisses', (tester) async {
      await tester.pumpWidget(buildTestableWidget(
        locale: const Locale('ar'),
        child: AafiyaOfflineBanner(
          connectivityService: mockConnectivity,
          reconnectDisplayDuration: const Duration(milliseconds: 1000),
        ),
      ));
      await tester.pumpAndSettle();

      // 1. Go offline
      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsOneWidget);

      // 2. Reconnect
      mockConnectivity.setOnline(true);
      await tester.pump();
      expect(find.text('تم استعادة الاتصال بالإنترنت'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_rounded), findsOneWidget);

      // 3. Wait for auto-dismiss timer (1000ms) + slide reverse (300ms)
      await tester.pump(const Duration(milliseconds: 1050));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.text('تم استعادة الاتصال بالإنترنت'), findsNothing);
      expect(find.byIcon(Icons.wifi_rounded), findsNothing);
    });
  });
}
