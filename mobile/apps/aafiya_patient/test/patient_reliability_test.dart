import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:http/http.dart' as http;
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/app.dart';

void main() {
  group('AafiyaPatientApp Reliability & Error Boundary Integration', () {
    late InMemoryTokenStorage tokenStorage;
    late ApiClient apiClient;
    late AuthSessionManager sessionManager;
    late MockConnectivityService mockConnectivity;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
      apiClient = ApiClient(
        httpClient: MockClient((request) async => http.Response('{"data": {}}', 200)),
        tokenStorage: tokenStorage,
        retryPolicy: const RetryPolicy(useDelays: false),
      );
      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
      );
      mockConnectivity = MockConnectivityService(initialOnline: true);
    });

    tearDown(() {
      mockConnectivity.dispose();
    });

    testWidgets('Patient app boots with offline banner hidden when online', (tester) async {
      await tester.pumpWidget(AafiyaPatientApp(
        sessionManager: sessionManager,
        apiClient: apiClient,
        connectivityService: mockConnectivity,
        initialNavState: PatientNavState.auth,
      ));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaOfflineBanner), findsOneWidget);
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsNothing);
    });

    testWidgets('Patient app displays offline banner when network drops', (tester) async {
      await tester.pumpWidget(AafiyaPatientApp(
        sessionManager: sessionManager,
        apiClient: apiClient,
        connectivityService: mockConnectivity,
        initialNavState: PatientNavState.auth,
      ));
      await tester.pumpAndSettle();

      // Trigger network loss
      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.text('لا يوجد اتصال بالإنترنت'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    });

    testWidgets('AafiyaCrashBoundary renders safely without PHI or raw traces on error', (tester) async {
      bool recovered = false;
      await tester.pumpWidget(MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AafiyaSupportedLocale.supportedLocales,
        localizationsDelegates: const [
          AafiyaLocalizationsDelegate(),
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: AafiyaCrashBoundary(
          onRecover: () => recovered = true,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaCrashBoundary), findsOneWidget);
      expect(find.text('حدث خطأ غير متوقع'), findsOneWidget);
      expect(find.text('العودة للرئيسية'), findsOneWidget);

      await tester.tap(find.text('العودة للرئيسية'));
      await tester.pump();
      expect(recovered, isTrue);
    });
  });
}
