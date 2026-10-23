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
import 'package:aafiya_patient/screens/notifications_screen.dart';

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

  group('NotificationsScreen Widget Tests', () {
    testWidgets('renders loaded patient notifications and acknowledges receipt',
        (tester) async {
      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-101',
                  'created_at': '2026-10-23T08:00:00Z',
                  'template': 'vacation_reschedule_success',
                  'payload': {
                    'message': 'تمت إعادة جدولة موعدكم إلى 2026-10-25',
                    'clinic_name': 'عيادة الأمل',
                    'new_date': '2026-10-25',
                    'new_slot': '10:00',
                  },
                }
              ],
              'current_page': 1,
              'last_page': 1,
              'per_page': 20,
              'total': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'POST' &&
            request.url.path.contains('/acknowledge')) {
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد استلام الإشعار بنجاح.',
              'data': {
                'id': 'notif-101',
                'created_at': '2026-10-23T08:00:00Z',
                'acknowledged_at': '2026-10-23T09:00:00Z',
                'template': 'vacation_reschedule_success',
                'payload': {
                  'message': 'تمت إعادة جدولة موعدكم إلى 2026-10-25',
                  'clinic_name': 'عيادة الأمل',
                },
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-patient-token', user: testPatientUser);

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

      expect(
          find.text('تمت إعادة جدولة موعدكم إلى 2026-10-25'), findsOneWidget);
      expect(find.text('عيادة الأمل'), findsOneWidget);
      expect(find.text('تأكيد الاطلاع'), findsOneWidget);

      // Tap acknowledge
      await tester.tap(find.text('تأكيد الاطلاع'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // After server response: reconciled to acknowledged
      expect(find.text('تأكيد الاطلاع'), findsNothing);
      expect(find.text('تم الاطلاع'), findsOneWidget);
    });

    testWidgets(
        'unsuccessful acknowledgment preserves unacknowledged state and shows error',
        (tester) async {
      final client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-101',
                  'created_at': '2026-10-23T08:00:00Z',
                  'template': 'vacation_reschedule_success',
                  'payload': {'message': 'رسالة إشعار'},
                }
              ],
              'current_page': 1,
              'last_page': 1,
              'total': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else {
          return http.Response(
            jsonEncode({'message': 'Server error'}),
            500,
            headers: {'content-type': 'application/json'},
          );
        }
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-patient-token', user: testPatientUser);

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

      expect(find.text('تأكيد الاطلاع'), findsOneWidget);

      await tester.tap(find.text('تأكيد الاطلاع'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Still unacknowledged, action button restored
      expect(find.text('تأكيد الاطلاع'), findsOneWidget);
      expect(find.text('تم الاطلاع'), findsNothing);
      expect(find.byType(SnackBar), findsOneWidget);
    });

    testWidgets('logout immediately clears notifications in memory',
        (tester) async {
      final client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-101',
                  'created_at': '2026-10-23T08:00:00Z',
                  'template': 'vacation_reschedule_success',
                  'payload': {'message': 'بيانات المريض الخاصة'},
                }
              ],
              'current_page': 1,
              'last_page': 1,
              'total': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-patient-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'valid-patient-token', user: testPatientUser);

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

      expect(find.text('بيانات المريض الخاصة'), findsOneWidget);

      // Perform logout
      await sessionManager.logout();
      await tester.pump();

      expect(find.text('بيانات المريض الخاصة'), findsNothing);
    });

    testWidgets(
        'stale response from patient A completing after patient B login never populates B UI',
        (tester) async {
      final completerA = Completer<http.Response>();
      int requestCount = 0;

      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          requestCount++;
          if (requestCount == 1) {
            // Patient A request - kept pending
            return completerA.future;
          } else {
            // Patient B request
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'notif-202',
                    'created_at': '2026-10-23T09:00:00Z',
                    'template': 'vacation_reschedule_success',
                    'payload': {'message': 'إشعارات المريض الثاني سفيان'},
                  }
                ],
                'current_page': 1,
                'last_page': 1,
                'per_page': 20,
                'total': 1,
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-a', user: testPatientUser);

      await tester.pumpWidget(
        createTestWidget(
          child: NotificationsScreen(
            sessionManager: sessionManager,
            apiClient: apiClient,
          ),
        ),
      );

      // Request 1 is launched for Patient A and pending
      await tester.pump();
      expect(requestCount, equals(1));

      // Patient A logs out
      await sessionManager.logout();
      await tester.pump();

      // Patient B logs in
      const testPatientUserB = User(
        id: 'patient-user-2',
        name: 'سفيان مرابط',
        email: 'sofiane@aafiya.test',
        phone: '+213555998877',
        roles: [UserRole.patientRegistered],
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-b', user: testPatientUserB);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Patient B's notifications should now be visible
      expect(find.text('إشعارات المريض الثاني سفيان'), findsOneWidget);

      // Now Patient A's request finally completes with Patient A's data
      completerA.complete(
        http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'notif-101',
                'created_at': '2026-10-23T08:00:00Z',
                'template': 'vacation_reschedule_success',
                'payload': {'message': 'بيانات المريض الأول السرية سارة'},
              }
            ],
            'current_page': 1,
            'last_page': 1,
            'per_page': 20,
            'total': 1,
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Patient A's data must NEVER appear in Patient B's UI
      expect(find.text('بيانات المريض الأول السرية سارة'), findsNothing);
      // Patient B's data must remain intact
      expect(find.text('إشعارات المريض الثاني سفيان'), findsOneWidget);
    });

    testWidgets(
        'stale error from patient A completing after patient B login does not clear B data',
        (tester) async {
      final completerA = Completer<http.Response>();
      int requestCount = 0;

      final client = MockClient((request) async {
        if (request.method == 'GET' &&
            request.url.path.contains('/patient/notifications')) {
          requestCount++;
          if (requestCount == 1) {
            return completerA.future;
          } else {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'notif-202',
                    'created_at': '2026-10-23T09:00:00Z',
                    'template': 'vacation_reschedule_success',
                    'payload': {'message': 'بيانات المريض سفيان'},
                  }
                ],
                'current_page': 1,
                'last_page': 1,
                'per_page': 20,
                'total': 1,
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-a', user: testPatientUser);

      await tester.pumpWidget(
        createTestWidget(
          child: NotificationsScreen(
            sessionManager: sessionManager,
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pump();
      expect(requestCount, equals(1));

      // Switch to Patient B
      await sessionManager.logout();
      await tester.pump();

      const testPatientUserB = User(
        id: 'patient-user-2',
        name: 'سفيان مرابط',
        email: 'sofiane@aafiya.test',
        roles: [UserRole.patientRegistered],
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-b', user: testPatientUserB);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('بيانات المريض سفيان'), findsOneWidget);

      // Now Patient A's request fails with server error
      completerA.complete(
        http.Response(
          jsonEncode({'message': 'خطأ فادح في خادم إشعارات المريض الأول'}),
          500,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Patient B's data must remain visible, not wiped by A's stale error
      expect(find.text('بيانات المريض سفيان'), findsOneWidget);
      expect(find.text('خطأ فادح في خادم إشعارات المريض الأول'), findsNothing);
    });

    testWidgets(
        'stale acknowledgment from patient A completing after patient B login does not alter B state',
        (tester) async {
      final ackCompleterA = Completer<http.Response>();

      final client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'notif-101',
                  'created_at': '2026-10-23T08:00:00Z',
                  'template': 'vacation_reschedule_success',
                  'payload': {'message': 'إشعار مشترك 101'},
                }
              ],
              'current_page': 1,
              'last_page': 1,
              'per_page': 20,
              'total': 1,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'POST' &&
            request.url.path.contains('/acknowledge')) {
          return ackCompleterA.future;
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('token-a'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-a', user: testPatientUser);

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

      // Patient A taps acknowledge
      await tester.tap(find.text('تأكيد الاطلاع'));
      await tester.pump();

      // Switch to Patient B while ack is in-flight
      await sessionManager.logout();
      await tester.pump();

      const testPatientUserB = User(
        id: 'patient-user-2',
        name: 'سفيان مرابط',
        email: 'sofiane@aafiya.test',
        roles: [UserRole.patientRegistered],
      );
      await sessionManager.setAuthenticatedUser(
          token: 'token-b', user: testPatientUserB);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // B's notification 101 is displayed and unacknowledged
      expect(find.text('تأكيد الاطلاع'), findsOneWidget);

      // Now A's ack returns success
      ackCompleterA.complete(
        http.Response(
          jsonEncode({
            'message': 'تم الإقرار بنجاح',
            'data': {
              'id': 'notif-101',
              'created_at': '2026-10-23T08:00:00Z',
              'acknowledged_at': '2026-10-23T09:00:00Z',
              'template': 'vacation_reschedule_success',
              'payload': {'message': 'إشعار مشترك 101'},
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // B's notification must NOT be reconciled or marked acknowledged by A's stale response
      expect(find.text('تأكيد الاطلاع'), findsOneWidget);
      expect(find.text('تم الاطلاع'), findsNothing);
    });
  });
}
