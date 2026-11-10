// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/notifications_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testPatientUser = User(
    id: 'patient-user-1',
    name: 'سارة أحمد',
    email: 'sarah@aafiya.test',
    phone: '+213555887766',
    roles: [UserRole.patientRegistered],
  );

  Widget createTestWidget({
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
      theme: AafiyaTheme.lightTheme,
      home: child,
    );
  }

  group('PatientNotification Model Tests (N-09, N-10)', () {
    test('Parses prescription notification payload correctly', () {
      final json = {
        'id': 'notif-rx-1',
        'created_at': '2026-11-04T10:00:00Z',
        'template': 'prescription_issued',
        'payload': {
          'prescription_id': 'rx-uuid-999',
          'prescription_reference': 'RX-2026-00042',
          'clinic_name': 'عيادة النور التخصصية',
          'doctor_name': 'د. كريم بلقاسم',
          'issue_date': '2026-11-04',
          'message': 'تم إصدار وصفة طبية إلكترونية جديدة (RX-2026-00042)',
        },
      };

      final notif = PatientNotification.fromJson(json);

      expect(notif.id, 'notif-rx-1');
      expect(notif.template, 'prescription_issued');
      expect(notif.prescriptionId, 'rx-uuid-999');
      expect(notif.prescriptionReference, 'RX-2026-00042');
      expect(notif.clinicName, 'عيادة النور التخصصية');
      expect(
          notif.message, 'تم إصدار وصفة طبية إلكترونية جديدة (RX-2026-00042)');

      final serialized = notif.toJson();
      expect(serialized['prescription_id'], 'rx-uuid-999');
      expect(serialized['prescription_reference'], 'RX-2026-00042');
    });

    test(
        'Resolves localized messages for prescription_issued in Arabic, French, and English',
        () {
      final notif = PatientNotification(
        id: 'rx-2',
        createdAt: DateTime.now(),
        template: 'prescription_issued',
        message: 'تم إصدار وصفة طبية إلكترونية جديدة.',
        prescriptionId: 'rx-uuid-1',
        prescriptionReference: 'RX-1234',
      );

      final arabicStrings = LocalizedStrings(const Locale('ar'));
      final frenchStrings = LocalizedStrings(const Locale('fr'));
      final englishStrings = LocalizedStrings(const Locale('en'));

      expect(
          notif.displayMessage(arabicStrings), contains('وصفة طبية إلكترونية'));
      expect(notif.displayMessage(frenchStrings), contains('ordonnance'));
      expect(notif.displayMessage(englishStrings), contains('prescription'));
    });
  });

  group(
      'NotificationsScreen Prescription Rendering & Live Refresh (N-03, N-10)',
      () {
    testWidgets('renders prescription notification card and details',
        (tester) async {
      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-rx-101',
                  'created_at': '2026-11-04T12:00:00Z',
                  'template': 'prescription_issued',
                  'payload': {
                    'prescription_id': 'rx-uuid-101',
                    'prescription_reference': 'RX-2026-00101',
                    'clinic_name': 'عيادة الأمل',
                    'message':
                        'تم إصدار وصفة طبية إلكترونية جديدة (RX-2026-00101)',
                  },
                },
              ],
              'current_page': 1,
              'last_page': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":"not_found"}', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'valid-patient-token',
        user: testPatientUser,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: NotificationsScreen(
            sessionManager: sessionManager,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('RX-2026-00101'), findsOneWidget);
      expect(find.text('عرض الوصفات الطبية'), findsOneWidget);
      expect(find.byIcon(Icons.receipt_long_outlined), findsOneWidget);
    });

    testWidgets(
        '30-second periodic timer triggers refresh while screen is open',
        (tester) async {
      int requestCount = 0;
      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          requestCount++;
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-$requestCount',
                  'created_at': '2026-11-04T12:00:00Z',
                  'template': 'appointment_confirmed',
                  'payload': {
                    'message': 'إشعار رقم $requestCount',
                  },
                },
              ],
              'current_page': 1,
              'last_page': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":"not_found"}', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'valid-patient-token',
        user: testPatientUser,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: NotificationsScreen(
            sessionManager: sessionManager,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(requestCount, 1);
      expect(find.text('إشعار رقم 1'), findsOneWidget);

      // Fast-forward 30 seconds
      await tester.pump(const Duration(seconds: 31));
      await tester.pump(const Duration(milliseconds: 100));

      expect(requestCount, 2);
      expect(find.text('إشعار رقم 2'), findsOneWidget);
    });
  });

  group('PatientHomeShell Live Unread Badge Refresh (N-03)', () {
    testWidgets(
        '30-second periodic timer refreshes unread count while home shell is open',
        (tester) async {
      int countRequests = 0;
      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications/unread-count')) {
          countRequests++;
          return http.Response(
            jsonEncode({'unread_count': countRequests}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.method == 'GET' &&
            request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{"error":"not_found"}', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'valid-patient-token',
        user: testPatientUser,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: PatientHomeShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(countRequests, 1);
      expect(find.text('1'), findsOneWidget);

      // Fast-forward 30 seconds
      await tester.pump(const Duration(seconds: 31));
      await tester.pump(const Duration(milliseconds: 100));

      expect(countRequests, 2);
      expect(find.text('2'), findsOneWidget);
    });
  });
}
