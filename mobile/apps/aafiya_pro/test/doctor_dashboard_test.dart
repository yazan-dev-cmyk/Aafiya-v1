// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/widgets/doctor_dashboard_view.dart';
import 'package:aafiya_pro/widgets/doctor_agenda_tile.dart';
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
  group('Doctor Today Agenda & Dashboard Widget Tests', () {
    const testDoctor = User(
      id: 'doc-001',
      name: 'د. كريم بن علي',
      email: 'doctor@aafiya.test',
      roles: [UserRole.doctor],
    );

    const testClinic = DoctorClinic(
      id: 'clinic-001',
      name: 'عيادة النور المركزية',
      wilaya: 'Alger',
      address: 'شارع ديدوش مراد 15',
      isActive: true,
      isPrimary: true,
    );

    const testClinic2 = DoctorClinic(
      id: 'clinic-002',
      name: 'عيادة الأمل',
      wilaya: 'Alger',
      address: 'شارع فلسطين 02',
      isActive: true,
      isPrimary: false,
    );

    late InMemoryTokenStorage tokenStorage;
    late AuthSessionManager sessionManager;

    setUp(() {
      tokenStorage = InMemoryTokenStorage('test_doctor_token');
    });

    testWidgets('1. Loading: displays loading indicator while requests in-flight', (tester) async {
      final completer = Completer<http.Response>();

      final mockClient = MockClient((request) async {
        return completer.future;
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
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

      // Verify loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Complete requests to prevent hanging
      completer.complete(
        http.Response(
          jsonEncode({
            'status': 'success',
            'data': {'today_total': 0, 'date': '2026-09-15'},
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await tester.pumpAndSettle();
    });

    testWidgets('2. Loaded: displays operational statistics and today agenda list', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'today_total': 15,
                'pending_check_in': 5,
                'in_waiting_room': 3,
                'completed_today': 6,
                'no_show_today': 1,
                'active_clinic_id': 'clinic-001',
                'active_clinic_name': 'عيادة النور المركزية',
                'date': '2026-09-15',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.endsWith('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'app-001',
                  'booking_reference': 'MS-2026-001',
                  'time_slot': '08:30',
                  'appointment_date': '2026-09-15',
                  'status': 'confirmed',
                  'patient': {
                    'id': 'pat-101',
                    'name': 'مريض اختباري الأول',
                  },
                  'booking_center': {
                    'name': 'مركز الحجز التجريبي',
                  },
                },
                {
                  'id': 'app-002',
                  'booking_reference': 'MS-2026-002',
                  'time_slot': '09:00',
                  'appointment_date': '2026-09-15',
                  'status': 'attended',
                  'patient': {
                    'id': 'pat-102',
                    'name': 'مريض اختباري الثاني',
                  },
                },
              ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 20,
                'total': 2,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
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

      // Verify KPI Metric Cards
      expect(find.byType(DoctorMetricCard), findsNWidgets(5));
      expect(find.text('15'), findsOneWidget); // today_total
      expect(find.text('3'), findsOneWidget); // in_waiting_room
      expect(find.text('5'), findsOneWidget); // pending_check_in
      expect(find.text('6'), findsOneWidget); // completed_today
      expect(find.text('1'), findsOneWidget); // no_show_today

      // Verify Agenda Items
      expect(find.byType(DoctorAgendaTile), findsNWidgets(2));
      expect(find.text('08:30'), findsOneWidget);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('مريض اختباري الأول'), findsOneWidget);
      expect(find.text('مريض اختباري الثاني'), findsOneWidget);
      expect(find.textContaining('MS-2026-001'), findsWidgets);
    });

    testWidgets('3. Empty: renders AafiyaEmptyView when no appointments scheduled today', (tester) async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'today_total': 0,
                'pending_check_in': 0,
                'in_waiting_room': 0,
                'completed_today': 0,
                'no_show_today': 0,
                'date': '2026-09-15',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.endsWith('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': <Map<String, dynamic>>[],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 20,
                'total': 0,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
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

      // Metrics show 0
      expect(find.text('0'), findsNWidgets(5));

      // Empty view displayed
      expect(find.byType(AafiyaEmptyView), findsOneWidget);
      expect(find.text('لا توجد مواعيد مسجلة لهذا اليوم.'), findsOneWidget);
    });

    testWidgets('4. Error & Retry: request failure displays AafiyaErrorView and retry refetches', (tester) async {
      int requestCount = 0;

      final mockClient = MockClient((request) async {
        requestCount++;
        if (requestCount <= 2) {
          // Fail initial requests
          return http.Response('Server Error', 500);
        }
        // Succeed on retry
        if (request.url.path.endsWith('/doctor/stats')) {
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {'today_total': 2, 'date': '2026-09-15'},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({
            'data': <Map<String, dynamic>>[],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 20, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
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

      // Error view shown
      expect(find.byType(AafiyaErrorView), findsOneWidget);

      // Tap retry
      final retryFinder = find.widgetWithText(AafiyaButton, 'إعادة المحاولة');
      expect(retryFinder, findsOneWidget);
      await tester.tap(retryFinder);
      await tester.pumpAndSettle();

      // Now successful
      expect(find.byType(AafiyaErrorView), findsNothing);
      expect(find.text('2'), findsOneWidget);
    });

    testWidgets('5. Clinic Context Switch: switching active clinic reloads dashboard data with new header', (tester) async {
      String? lastClinicIdHeader;

      final mockClient = MockClient((request) async {
        lastClinicIdHeader = request.headers['x-clinic-id'];

        if (request.url.path.endsWith('/doctor/stats')) {
          final isClinic2 = lastClinicIdHeader == 'clinic-002';
          return http.Response(
            jsonEncode({
              'status': 'success',
              'data': {
                'today_total': isClinic2 ? 77 : 11,
                'active_clinic_id': lastClinicIdHeader,
                'date': '2026-09-15',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({
            'data': <Map<String, dynamic>>[],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 20, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
      sessionManager.setAuthorizedClinics([testClinic, testClinic2]);

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

      // Initially Clinic 1: today_total = 11
      expect(find.text('11'), findsOneWidget);
      expect(lastClinicIdHeader, 'clinic-001');

      // Switch to Clinic 2 via sessionManager
      sessionManager.switchActiveClinic('clinic-002');
      await tester.pumpAndSettle();

      // Now Clinic 2: today_total = 77
      expect(find.text('77'), findsOneWidget);
      expect(lastClinicIdHeader, 'clinic-002');
    });

    testWidgets('6. Stale Response Protection: late response from previous clinic is safely discarded', (tester) async {
      Completer<http.Response> clinic1StatsCompleter = Completer<http.Response>();

      final mockClient = MockClient((request) async {
        final clinicHeader = request.headers['x-clinic-id'];

        if (clinicHeader == 'clinic-001') {
          // Hang response for Clinic 1
          return clinic1StatsCompleter.future;
        }

        // Fast response for Clinic 2
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'today_total': 99,
              'active_clinic_id': 'clinic-002',
              'date': '2026-09-15',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
      sessionManager.setAuthorizedClinics([testClinic, testClinic2]);

      await tester.pumpWidget(
        createTestApp(
          child: DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctor,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pump(); // Start load for Clinic 1

      // User switches to Clinic 2 before Clinic 1 responds
      sessionManager.switchActiveClinic('clinic-002');
      await tester.pumpAndSettle();

      // Verify Clinic 2 data loaded
      expect(find.text('99'), findsOneWidget);

      // Now Clinic 1 finally completes late
      clinic1StatsCompleter.complete(
        http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'today_total': 555,
              'active_clinic_id': 'clinic-001',
              'date': '2026-09-15',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await tester.pumpAndSettle();

      // State MUST remain 99 (Clinic 2), 555 from Clinic 1 was safely discarded!
      expect(find.text('99'), findsOneWidget);
      expect(find.text('555'), findsNothing);
    });

    testWidgets('7. Trilingual Localization: renders properly in English and French', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'today_total': 4,
              'pending_check_in': 1,
              'in_waiting_room': 1,
              'completed_today': 2,
              'no_show_today': 0,
              'date': '2026-09-15',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: tokenStorage,
      );

      sessionManager = AuthSessionManager(
        tokenStorage: tokenStorage,
        apiClient: apiClient,
              );
      sessionManager.setAuthorizedClinics([testClinic]);

      // Test English
      await tester.pumpWidget(
        createTestApp(
          locale: const Locale('en'),
          child: DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctor,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text("Today's Total"), findsOneWidget);
      expect(find.text("In Waiting Room"), findsOneWidget);
      expect(find.text("Today's Schedule"), findsWidgets);

      // Test French
      await tester.pumpWidget(
        createTestApp(
          locale: const Locale('fr'),
          child: DoctorDashboardView(
            sessionManager: sessionManager,
            user: testDoctor,
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text("Total des rendez-vous"), findsOneWidget);
      expect(find.text("En salle d'attente"), findsOneWidget);
      expect(find.text("Programme d'aujourd'hui"), findsWidgets);
    });
  });
}
