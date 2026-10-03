// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/widgets/doctor_dashboard_view.dart';
import 'package:aafiya_pro/widgets/doctor_metric_card.dart';

Widget createTestApp({
  required Widget child,
  Locale locale = const Locale('ar'),
}) {
  return MaterialApp(
    locale: locale,
    theme: AafiyaTheme.lightTheme,
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
  group('Doctor Dashboard Responsive KPI Tests (DEF-05 / TASK-B-05)', () {
    const testDoctor = User(
      id: 'doc-001',
      name: 'Dr. Benali',
      email: 'doctor@aafiya.test',
      roles: [UserRole.doctor],
    );

    const testClinic = DoctorClinic(
      id: 'clinic-001',
      name: 'Clinique El Chifa',
      wilaya: 'Alger',
      address: 'Didouche Mourad 15',
      isActive: true,
      isPrimary: true,
    );

    late InMemoryTokenStorage tokenStorage;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    http.Client createMockClient() {
      return MockClient((request) async {
        if (request.url.path.endsWith('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'today_total': 18,
                'pending_check_in': 5,
                'in_waiting_room': 4,
                'completed_today': 8,
                'no_show_today': 1,
                'active_clinic_id': 'clinic-001',
                'active_clinic_name': 'Clinique El Chifa',
                'date': '2026-10-02',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.endsWith('/appointments')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': [],
              'meta': {
                'current_page': 1,
                'per_page': 15,
                'total': 0,
                'total_pages': 1,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });
    }

    testWidgets('DoctorMetricCard defaults to maxLines 2 and enforces minHeight constraint', (tester) async {
      await tester.pumpWidget(
        createTestApp(
          child: const Row(
            children: [
              DoctorMetricCard(
                label: "En attente d'enregistrement des patients",
                count: 12,
                icon: Icons.schedule_rounded,
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      final cardWidget = tester.widget<DoctorMetricCard>(find.byType(DoctorMetricCard));
      expect(cardWidget.maxLines, equals(2));

      final container = tester.widget<Container>(find.descendant(
        of: find.byType(DoctorMetricCard),
        matching: find.byType(Container),
      ));
      expect(container.constraints?.minHeight, equals(74.0));
    });

    for (final width in [360.0, 375.0, 390.0]) {
      for (final locale in [const Locale('ar'), const Locale('fr'), const Locale('en')]) {
        testWidgets('Compact viewport ${width}dp in ${locale.languageCode} renders 2+2+1 layout with zero overflow', (tester) async {
          tester.view.physicalSize = Size(width, 700.0);
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() => tester.view.resetPhysicalSize());

          final mockHttpClient = createMockClient();
          final apiClient = ApiClient(httpClient: mockHttpClient, tokenStorage: tokenStorage);
          final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

          await sessionManager.setAuthenticatedUser(token: 'valid_mock_token', user: testDoctor);
          sessionManager.setAuthorizedClinics([testClinic]);

          await tester.pumpWidget(
            createTestApp(
              locale: locale,
              child: DoctorDashboardView(
                sessionManager: sessionManager,
                user: testDoctor,
                apiClient: apiClient,
              ),
            ),
          );
          await tester.pumpAndSettle();

          // Zero exceptions or RenderFlex overflow
          expect(tester.takeException(), isNull);

          // All 5 metric cards must be rendered
          expect(find.byType(DoctorMetricCard), findsNWidgets(5));
          expect(find.text('18'), findsOneWidget); // today_total
          expect(find.text('4'), findsOneWidget);  // in_waiting_room
          expect(find.text('5'), findsOneWidget);  // pending_check_in
          expect(find.text('8'), findsOneWidget);  // completed_today
          expect(find.text('1'), findsOneWidget);  // no_show_today

          // Verify text widgets inside metric cards have maxLines: 2
          final textWidgets = tester.widgetList<Text>(
            find.descendant(
              of: find.byType(DoctorMetricCard),
              matching: find.byType(Text),
            ),
          );
          // Label texts have maxLines: 2
          final labelTexts = textWidgets.where((t) => t.maxLines == 2);
          expect(labelTexts.length, equals(5));

          // Verify adaptive structure: responsive builder rendered compact layout
          expect(find.byKey(const Key('compact_kpi_layout')), findsOneWidget);
          expect(find.byKey(const Key('compact_kpi_row_0')), findsOneWidget);
          expect(find.byKey(const Key('compact_kpi_row_1')), findsOneWidget);
          expect(find.byKey(const Key('compact_kpi_row_2')), findsOneWidget);
        });
      }
    }

    testWidgets('Medium viewport 450dp renders standard 2+3 layout without overflow', (tester) async {
      tester.view.physicalSize = const Size(450.0, 800.0);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockHttpClient = createMockClient();
      final apiClient = ApiClient(httpClient: mockHttpClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await sessionManager.setAuthenticatedUser(token: 'valid_mock_token', user: testDoctor);
      sessionManager.setAuthorizedClinics([testClinic]);

      await tester.pumpWidget(
        createTestApp(
          child: DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctor,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(DoctorMetricCard), findsNWidgets(5));

      expect(find.byKey(const Key('medium_kpi_layout')), findsOneWidget);
      expect(find.byKey(const Key('medium_kpi_row_0')), findsOneWidget);
      expect(find.byKey(const Key('medium_kpi_row_1')), findsOneWidget);
    });

    testWidgets('Expanded viewport 800dp (tablet) renders 1 single row of 5 cards without overflow', (tester) async {
      tester.view.physicalSize = const Size(800.0, 1000.0);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockHttpClient = createMockClient();
      final apiClient = ApiClient(httpClient: mockHttpClient, tokenStorage: tokenStorage);
      final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);

      await sessionManager.setAuthenticatedUser(token: 'valid_mock_token', user: testDoctor);
      sessionManager.setAuthorizedClinics([testClinic]);

      await tester.pumpWidget(
        createTestApp(
          child: DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctor,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(DoctorMetricCard), findsNWidgets(5));

      expect(find.byKey(const Key('expanded_kpi_layout')), findsOneWidget);
    });
  });
}
