// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/shells/assistant_shell.dart';
import 'package:aafiya_pro/widgets/check_in_sheet.dart';
import 'package:aafiya_pro/widgets/assistant_patient_search_sheet.dart';

void main() {
  const testAssistantUser = User(
    id: 'user-ast-001',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550123450',
    roles: [UserRole.doctorAssistant],
    permissions: [
      'booking.manage_queue',
      'booking.confirm_attendance',
      'booking.create',
      'patient.view_contacts',
    ],
  );

  Widget createTestWidget({
    required AuthSessionManager sessionManager,
    required AssistantQueueService queueService,
    required VoidCallback onSignOut,
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
      home: AssistantShell(
        user: testAssistantUser,
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: onSignOut,
      ),
    );
  }

  group('AssistantShell & Queue Operational Tests', () {
    testWidgets('1. AssistantShell renders app bar with assistant name, role title, and handles logout', (tester) async {
      var signedOut = false;

      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: () => signedOut = true,
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('مريم قدور'), findsWidgets);
      expect(find.textContaining('مساعد عيادة'), findsWidgets);

      // Tap Sign Out
      final signOutFinder = find.byIcon(Icons.logout_rounded);
      expect(signOutFinder, findsOneWidget);
      await tester.tap(signOutFinder);
      await tester.pumpAndSettle();

      expect(signedOut, isTrue);
    });

    testWidgets('2. Displays Waiting Room and Expected Check-In tabs with counts and switches tabs', (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'attended') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-01',
                'booking_reference': 'BK-001',
                'status': 'attended',
                'appointment_date': '2026-09-16',
                'time_slot': '09:00',
                'checked_in_at': '2026-09-16T09:10:00.000000Z',
                'patient': {
                  'id': 'patient-01',
                  'name': 'فاطمة الزهراء',
                  'mrn': 'MRN-001',
                  'phone': '0555112233',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1}
          }), 200, headers: {'content-type': 'application/json'});
        } else {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-02',
                'booking_reference': 'BK-002',
                'status': 'confirmed',
                'appointment_date': '2026-09-16',
                'time_slot': '10:00',
                'patient': {
                  'id': 'patient-02',
                  'name': 'يوسف بن علي',
                  'mrn': 'MRN-002',
                  'phone': '0555445566',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1}
          }), 200, headers: {'content-type': 'application/json'});
        }
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: () {},
      ));
      await tester.pumpAndSettle();

      // Verify tabs exist with counts
      expect(find.text('في قاعة الانتظار'), findsOneWidget);
      expect(find.text('المتوقع حضورهم'), findsOneWidget);

      // In Waiting Room tab by default
      expect(find.text('فاطمة الزهراء'), findsOneWidget);

      // Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('يوسف بن علي'), findsOneWidget);
      expect(find.text('تسجيل حضور'), findsOneWidget);
      expect(find.text('لم يحضر'), findsOneWidget);
    });

    testWidgets('3. Attendance Action: confirms attendance dialog and moves patient to waiting room', (tester) async {
      var attendCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/attend')) {
          attendCalled = true;
          return http.Response(jsonEncode({
            'message': 'تم تسجيل حضور الموعد بنجاح.',
            'data': {
              'id': 'appt-02',
              'booking_reference': 'BK-002',
              'status': 'attended',
              'checked_in_at': '2026-09-16T10:05:00.000000Z',
              'patient': {
                'id': 'patient-02',
                'name': 'يوسف بن علي',
                'mrn': 'MRN-002',
              },
            }
          }), 200, headers: {'content-type': 'application/json'});
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'appt-02',
                'booking_reference': 'BK-002',
                'status': 'confirmed',
                'appointment_date': '2026-09-16',
                'time_slot': '10:00',
                'patient': {
                  'id': 'patient-02',
                  'name': 'يوسف بن علي',
                  'mrn': 'MRN-002',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1}
          }), 200, headers: {'content-type': 'application/json'});
        }

        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: () {},
      ));
      await tester.pumpAndSettle();

      // Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('يوسف بن علي'), findsOneWidget);

      // Tap Mark Attended
      await tester.tap(find.text('تسجيل حضور'));
      await tester.pumpAndSettle();

      // Confirmation Dialog appears
      expect(find.text('تأكيد تسجيل الحضور'), findsOneWidget);

      // Confirm attendance inside dialog
      final confirmBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(ElevatedButton, 'تسجيل حضور'),
      );
      expect(confirmBtn, findsOneWidget);
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      expect(attendCalled, isTrue);
      expect(find.text('تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.'), findsOneWidget);
    });

    testWidgets('4. Quick Check-In: opens modal, submits token, and triggers queue reload', (tester) async {
      var checkInCalled = false;
      const testToken = '64charactertokenforappointmentcheckintest1234567890abcdef12345678';

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/check-in')) {
          checkInCalled = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['token'], equals(testToken));
          return http.Response(jsonEncode({
            'message': 'تم تأكيد حضور الموعد بنجاح.',
            'data': {
              'id': 'appt-03',
              'booking_reference': 'BK-003',
              'status': 'attended',
              'checked_in_at': '2026-09-16T11:00:00.000000Z',
              'patient': {
                'id': 'patient-03',
                'name': 'كريم بن ناصر',
              },
            }
          }), 200, headers: {'content-type': 'application/json'});
        }

        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: () {},
      ));
      await tester.pumpAndSettle();

      // Open Quick Check-In sheet
      final quickCheckInBtn = find.text('تسجيل حضور سريع');
      expect(quickCheckInBtn, findsOneWidget);
      await tester.tap(quickCheckInBtn);
      await tester.pumpAndSettle();

      expect(find.byType(CheckInSheet), findsOneWidget);
      expect(find.text('رمز حضور الموعد'), findsOneWidget);

      // Enter token and submit
      await tester.enterText(find.byType(TextField), testToken);
      final submitBtn = find.descendant(
        of: find.byType(CheckInSheet),
        matching: find.text('تأكيد الحضور الآن'),
      );
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      expect(checkInCalled, isTrue);
      expect(find.textContaining('تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.'), findsOneWidget);
    });

    testWidgets('5. Patient Search: opens sheet, submits query, and displays clinic patient results', (tester) async {
      var searchCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/patients')) {
          searchCalled = true;
          expect(request.url.queryParameters['search'], equals('سارة'));
          return http.Response(jsonEncode({
            'data': [
              {
                'id': 'patient-sara',
                'mrn': 'MRN-2026-VAL99',
                'first_name': 'سارة',
                'last_name': 'بلمهيدي',
                'phone': '0555123456',
                'gender': 'female',
              }
            ]
          }), 200, headers: {'content-type': 'application/json'});
        }

        return http.Response(jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        queueService: queueService,
        onSignOut: () {},
      ));
      await tester.pumpAndSettle();

      // Tap Patient Search button
      final searchBtn = find.text('بحث المرضى');
      expect(searchBtn, findsOneWidget);
      await tester.tap(searchBtn);
      await tester.pumpAndSettle();

      expect(find.byType(AssistantPatientSearchSheet), findsOneWidget);

      // Type in search field
      final inputFinder = find.byType(TextField);
      await tester.enterText(inputFinder, 'سارة');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(searchCalled, isTrue);
      expect(find.text('سارة بلمهيدي'), findsOneWidget);
      expect(find.textContaining('MRN-2026-VAL99'), findsOneWidget);
    });
  });
}
