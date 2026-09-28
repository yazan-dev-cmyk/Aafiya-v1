import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:http/http.dart' as http;
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/app.dart';

void main() {
  group('AafiyaProApp Reliability & Error Boundary Integration', () {
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

    testWidgets('Pro app boots with offline banner hidden when online', (tester) async {
      await tester.pumpWidget(AafiyaProApp(
        sessionManager: sessionManager,
        apiClient: apiClient,
        connectivityService: mockConnectivity,
        initialNavState: ProNavState.auth,
      ));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaOfflineBanner), findsOneWidget);
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsNothing);
    });

    testWidgets('Pro app displays offline banner when network drops', (tester) async {
      await tester.pumpWidget(AafiyaProApp(
        sessionManager: sessionManager,
        apiClient: apiClient,
        connectivityService: mockConnectivity,
        initialNavState: ProNavState.auth,
      ));
      await tester.pumpAndSettle();

      // Trigger network loss
      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.text('لا يوجد اتصال بالإنترنت'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    });

    testWidgets('Pro app displays Reconnected indicator upon network restoration', (tester) async {
      await tester.pumpWidget(AafiyaProApp(
        sessionManager: sessionManager,
        apiClient: apiClient,
        connectivityService: mockConnectivity,
        initialNavState: ProNavState.auth,
      ));
      await tester.pumpAndSettle();

      // 1. Go offline
      mockConnectivity.setOnline(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.text('لا يوجد اتصال بالإنترنت'), findsOneWidget);

      // 2. Restore connectivity
      mockConnectivity.setOnline(true);
      await tester.pump();
      expect(find.text('تم استعادة الاتصال بالإنترنت'), findsOneWidget);
    });
  });
}
