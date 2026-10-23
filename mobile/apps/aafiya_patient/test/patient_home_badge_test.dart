// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/state/patient_notification_count_manager.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testPatientUser = User(
    id: 'patient-test-user',
    name: 'فاطمة الزهراء',
    email: 'fatima@aafiya.test',
    phone: '+213555998877',
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

  group('PatientHomeShell Notification Badge Widget Tests', () {
    testWidgets(
        '5. Displays badge "1" when 1 unread notification exists; hides badge when count is 0',
        (tester) async {
      int unreadItemsCount = 1;

      final client = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.contains('/patient/notifications')) {
          return http.Response(
            jsonEncode({
              'data': unreadItemsCount == 1
                  ? [
                      {
                        'id': 'notif-single',
                        'created_at': '2026-10-23T08:00:00Z',
                        'acknowledged_at': null,
                        'template': 'vacation_reschedule_success',
                        'payload': {'message': 'تم حجز موعدكم بنجاح'},
                      }
                    ]
                  : [],
              'current_page': 1,
              'last_page': 1,
              'per_page': 20,
              'total': unreadItemsCount,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUser,
        token: 'valid-token',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final countManager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: PatientHomeShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            notificationService: service,
            countManager: countManager,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Find the Badge widget
      final badgeFinder = find.byType(Badge);
      expect(badgeFinder, findsOneWidget);

      final badgeWidget = tester.widget<Badge>(badgeFinder);
      expect(badgeWidget.isLabelVisible, isTrue);
      expect(find.text('1'), findsOneWidget);

      // Now set unread count to 0 and refresh
      unreadItemsCount = 0;
      await countManager.refresh();
      await tester.pumpAndSettle();

      // Badge must now hide its label
      final updatedBadgeWidget = tester.widget<Badge>(badgeFinder);
      expect(updatedBadgeWidget.isLabelVisible, isFalse);
      expect(find.text('1'), findsNothing);

      countManager.dispose();
      sessionManager.dispose();
    });

    testWidgets(
        'Displays "99+" when unread count exceeds 99, and immediately zeroes on logout',
        (tester) async {
      final client = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({'data': []}),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.url.path.contains('/patient/notifications')) {
          return http.Response(
            jsonEncode({
              'data': List.generate(
                120,
                (i) => {
                  'id': 'notif-$i',
                  'created_at': '2026-10-23T08:00:00Z',
                  'acknowledged_at': null,
                  'template': 'vacation_reschedule_success',
                  'payload': {'message': 'إشعار $i'},
                },
              ),
              'current_page': 1,
              'last_page': 6,
              'per_page': 20,
              'total': 120,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: client);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('valid-token'),
        apiClient: apiClient,
      );
      await sessionManager.setAuthenticatedUser(
        user: testPatientUser,
        token: 'valid-token',
      );

      final service = PatientNotificationService(apiClient: apiClient);
      final countManager = PatientNotificationCountManager(
        sessionManager: sessionManager,
        service: service,
      );

      await tester.pumpWidget(
        createTestWidget(
          child: PatientHomeShell(
            sessionManager: sessionManager,
            apiClient: apiClient,
            notificationService: service,
            countManager: countManager,
            onSignOut: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      final badgeFinder = find.byType(Badge);
      expect(badgeFinder, findsOneWidget);

      final badgeWidget = tester.widget<Badge>(badgeFinder);
      expect(badgeWidget.isLabelVisible, isTrue);
      expect(find.text('99+'), findsOneWidget);

      // Trigger logout
      await sessionManager.logout();
      await tester.pumpAndSettle();

      // Badge must be hidden immediately upon logout
      final loggedOutBadge = tester.widget<Badge>(badgeFinder);
      expect(loggedOutBadge.isLabelVisible, isFalse);
      expect(countManager.unreadCount, 0);

      countManager.dispose();
      sessionManager.dispose();
    });
  });
}
