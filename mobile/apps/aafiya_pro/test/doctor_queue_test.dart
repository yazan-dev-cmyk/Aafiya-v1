// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/doctor_queue_screen.dart';

void main() {
  final testDoctorUser = const User(
    id: 'user-doc-009',
    name: 'د. أحمد الجزائري',
    email: 'doctor009@aafiya.test',
    phone: '+213551000009',
    roles: [UserRole.doctor],
  );

  final testClinic01 = DoctorClinic(
    id: 'clinic-01',
    name: 'عيادة النور 01',
    address: 'شارع ديدوش، الجزائر',
    isPrimary: true,
    isActive: true,
  );

  final testClinic07 = DoctorClinic(
    id: 'clinic-07',
    name: 'عيادة الشفاء 07',
    address: 'شارع العربي بن مهيدي، وهران',
    isPrimary: false,
    isActive: true,
  );

  Widget createTestWidget({
    required AuthSessionManager sessionManager,
    DoctorDashboardService? dashboardService,
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
      theme: AafiyaTheme.lightTheme,
      home: Scaffold(
        body: DoctorQueueScreen(
          sessionManager: sessionManager,
          user: testDoctorUser,
          dashboardService: dashboardService,
        ),
      ),
    );
  }

  group('Doctor Live Waiting Room Queue Widget Tests', () {
    testWidgets('1. Loading: displays loading indicator while requests in-flight',
        (tester) async {
      final mockClient = MockClient((request) async {
        // Delay response to inspect loading state
        await Future.delayed(const Duration(milliseconds: 200));
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();
    });

    testWidgets('2. Loaded: renders Waiting Room and Expected Check-In lists with correct data',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];

        if (status == 'attended') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'app-att-001',
                  'booking_reference': 'MS-2026-0001',
                  'status': 'attended',
                  'appointment_date': '2026-09-15',
                  'time_slot': '08:00',
                  'checked_in_at': '2026-09-15T08:05:00.000Z',
                  'checked_in_by': 'د. أحمد الجزائري',
                  'patient': {
                    'id': 'pat-001',
                    'name': 'عمر بن الخطاب',
                    'phone': '+213550000001',
                  },
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'app-conf-002',
                  'booking_reference': 'MS-2026-0002',
                  'status': 'confirmed',
                  'appointment_date': '2026-09-15',
                  'time_slot': '09:00',
                  'patient': {
                    'id': 'pat-002',
                    'name': 'فاطمة الزهراء',
                    'phone': '+213550000002',
                  },
                  'notes': 'متابعة كشف سابقة',
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // 1. Verify Waiting Room Sub-Tab (Default selected)
      expect(find.text('في قاعة الانتظار'), findsOneWidget);
      expect(find.text('المتوقع حضورهم'), findsOneWidget);
      expect(find.text('عمر بن الخطاب'), findsOneWidget);
      expect(find.textContaining('MS-2026-0001'), findsOneWidget);
      expect(find.text('08:00'), findsOneWidget);
      expect(find.text('في الانتظار'), findsOneWidget);

      // Verify ZERO attendance action buttons for already attended patients
      expect(find.text('تسجيل حضور'), findsNothing);
      expect(find.text('لم يحضر'), findsNothing);

      // 2. Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('فاطمة الزهراء'), findsOneWidget);
      expect(find.textContaining('MS-2026-0002'), findsOneWidget);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('متابعة كشف سابقة'), findsOneWidget);

      // Verify Operational Action buttons ARE present for confirmed patients
      expect(find.text('تسجيل حضور'), findsOneWidget);
      expect(find.text('لم يحضر'), findsOneWidget);

      // 3. SEC-01 / SEC-05: Verify ZERO phone numbers exposed on screen
      expect(find.text('+213550000001'), findsNothing);
      expect(find.text('+213550000002'), findsNothing);
    });

    testWidgets('3. Attend Action: confirms dialog and calls /attend endpoint',
        (tester) async {
      bool attendCalled = false;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/attend')) {
          attendCalled = true;
          expect(request.method, 'POST');
          expect(path, '/api/v1/appointments/app-conf-002/attend');

          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل حضور الموعد بنجاح.',
              'data': {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'checked_in_at': '2026-09-15T09:05:00.000Z',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        // Return confirmed item for expected tab
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'confirmed',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'patient': {
                  'id': 'pat-002',
                  'name': 'فاطمة الزهراء',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Navigate to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Tap "تسجيل حضور" button
      await tester.tap(find.text('تسجيل حضور'));
      await tester.pumpAndSettle();

      // Confirmation dialog should appear
      expect(find.text('تأكيد تسجيل الحضور'), findsOneWidget);
      expect(find.text('إلغاء'), findsOneWidget);

      // Confirm attendance
      // Tap the confirm button in the dialog (second "تسجيل حضور" widget)
      final confirmButtons = find.widgetWithText(ElevatedButton, 'تسجيل حضور');
      await tester.tap(confirmButtons.last);
      await tester.pumpAndSettle();

      expect(attendCalled, isTrue);
      // SnackBar success feedback should be displayed
      expect(find.text('تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.'), findsOneWidget);
    });

    testWidgets('4. No-Show Action: confirms dialog with optional reason and calls /no-show',
        (tester) async {
      bool noShowCalled = false;
      String? sentReason;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/no-show')) {
          noShowCalled = true;
          expect(request.method, 'POST');
          expect(path, '/api/v1/appointments/app-conf-002/no-show');

          if (request.body.isNotEmpty) {
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            sentReason = body['reason'] as String?;
          }

          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل عدم حضور المريض للموعد (No-Show).',
              'data': {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'no_show',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'confirmed',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'patient': {
                  'id': 'pat-002',
                  'name': 'فاطمة الزهراء',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Navigate to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Tap "لم يحضر" button
      await tester.tap(find.text('لم يحضر'));
      await tester.pumpAndSettle();

      // Dialog should appear
      expect(find.text('تأكيد عدم الحضور (No-Show)'), findsOneWidget);

      // Enter optional reason
      await tester.enterText(find.byType(TextField), 'تأخر لأكثر من ساعة ولم يجب');
      await tester.pumpAndSettle();

      // Tap confirm button in dialog
      final confirmButtons = find.widgetWithText(ElevatedButton, 'لم يحضر');
      await tester.tap(confirmButtons.last);
      await tester.pumpAndSettle();

      expect(noShowCalled, isTrue);
      expect(sentReason, 'تأخر لأكثر من ساعة ولم يجب');
      expect(find.text('تم تسجيل عدم حضور المريض للموعد (No-Show).'), findsOneWidget);
    });

    testWidgets('5. Empty States: renders AafiyaEmptyView when queues are empty',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Waiting Room Empty View
      expect(find.text('لا يوجد أي مريض في قاعة الانتظار حالياً.'), findsOneWidget);

      // Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Expected Queue Empty View
      expect(find.text('لا توجد مواعيد مؤكدة أخرى متوقعة اليوم.'), findsOneWidget);
    });

    testWidgets('6. Clinic Context Switch & Stale Response Protection',
        (tester) async {
      String lastHeader = '';

      final mockClient = MockClient((request) async {
        lastHeader = request.headers['X-Clinic-ID'] ?? '';
        final isClinic07 = lastHeader == 'clinic-07';

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': isClinic07 ? 'app-clinic-07' : 'app-clinic-01',
                'booking_reference': isClinic07 ? 'MS-CLINIC-07' : 'MS-CLINIC-01',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '10:00',
                'patient': {
                  'id': 'pat-007',
                  'name': isClinic07 ? 'مريض عيادة وهران' : 'مريض عيادة الجزائر',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01, testClinic07]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      expect(find.text('مريض عيادة الجزائر'), findsOneWidget);

      // Switch to Clinic 07
      sessionManager.switchActiveClinic('clinic-07');
      await tester.pumpAndSettle();

      expect(lastHeader, 'clinic-07');
      expect(find.text('مريض عيادة وهران'), findsOneWidget);
      expect(find.text('مريض عيادة الجزائر'), findsNothing);
    });

    testWidgets('7. Trilingual Localization: renders properly in English and French',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      // Test English (LTR)
      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        locale: const Locale('en'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('In Waiting Room'), findsNWidgets(2));
      expect(find.text('Expected Arrivals'), findsOneWidget);
      expect(find.text('No patients currently in the waiting room.'), findsOneWidget);

      // Test French (LTR)
      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        locale: const Locale('fr'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('En salle d\'attente'), findsNWidgets(2));
      expect(find.text('Arrivées attendues'), findsOneWidget);
      expect(find.text('Aucun patient en salle d’attente actuellement.'), findsOneWidget);
    });
  });
}
