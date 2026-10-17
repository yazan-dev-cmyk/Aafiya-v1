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
import 'package:aafiya_pro/screens/assistant_queue_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testClinic = DoctorClinic(
    id: 'clinic-val-01',
    name: 'عيادة الأمل المركزية',
    position: 'assistant',
    isActive: true,
    isPrimary: true,
  );

  const fullAssistantUser = User(
    id: 'user-ast-all',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550123450',
    roles: [UserRole.doctorAssistant],
    permissions: [
      'booking.create',
      'booking.manage_queue',
      'booking.confirm_attendance',
      'patient.view_contacts',
      'booking.confirm',
    ],
    clinic: testClinic,
    clinics: [testClinic],
  );

  const restrictedAssistantUser = User(
    id: 'user-ast-restricted',
    name: 'علي قدور',
    email: 'ali@aafiya.test',
    phone: '+213550123451',
    roles: [UserRole.doctorAssistant],
    permissions: [
      'booking.manage_queue',
    ],
    clinic: testClinic,
    clinics: [testClinic],
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

  group('DA-04 AssistantQueueService.confirmAppointment Unit Tests', () {
    const apptId = 'appt-test-100';

    test('POSTs to /appointments/{id}/confirm with reason in body', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$apptId/confirm'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['reason'], equals('تأكيد بالاتصال الهاتفي'));

        return http.Response(
          jsonEncode({
            'message': 'تم تأكيد الموعد بنجاح.',
            'data': {
              'id': apptId,
              'booking_reference': 'BK-100',
              'status': 'confirmed',
              'appointment_date': '2026-10-25',
              'time_slot': '10:00',
              'patient': {'id': 'pat-1', 'name': 'أحمد بلحاج'},
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(
        apptId,
        reason: 'تأكيد بالاتصال الهاتفي',
      );

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(apptId));
      expect(appt.status, equals(AppointmentStatus.confirmed));
    });

    test('POSTs to /appointments/{id}/confirm with null body when reason is omitted', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$apptId/confirm'));
        expect(request.body, isEmpty);

        return http.Response(
          jsonEncode({
            'message': 'تم تأكيد الموعد بنجاح.',
            'data': {
              'id': apptId,
              'booking_reference': 'BK-100',
              'status': 'confirmed',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(apptId);

      expect(result, isA<ApiSuccess<Appointment>>());
    });

    test('returns ApiFailure on 422 Unprocessable Entity with validation message', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'لا يمكن تأكيد موعد بحالة (cancelled).',
            'errors': {
              'status': ['لا يمكن تأكيد موعد بحالة (cancelled).']
            },
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ValidationException>());
      expect(failure.exception.message, contains('لا يمكن تأكيد موعد بحالة (cancelled)'));
    });

    test('returns ApiFailure on 403 Forbidden', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'غير مصرح لك بتأكيد المواعيد في هذه العيادة.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ForbiddenException>());
    });

    test('returns ApiFailure on 404 Not Found', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'الموعد غير موجود.'}),
          404,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<NotFoundException>());
    });

    test('returns ApiFailure on 500 Server Error', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'message': 'خطأ داخلي في الخادم'}),
          500,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.confirmAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ServerException>());
    });
  });

  group('DA-04 AssistantQueueScreen Confirmation UI & State Mutation Widget Tests', () {
    const pendingAppt = {
      'id': 'appt-pnd-da04',
      'booking_reference': 'BK-PND-DA04',
      'status': 'pending',
      'appointment_date': '2026-10-25',
      'time_slot': '10:00',
      'patient': {
        'id': 'pat-da04',
        'name': 'يوسف بلقاسم',
        'phone': '0550112233',
      },
    };

    const confirmedAppt = {
      'id': 'appt-pnd-da04',
      'booking_reference': 'BK-PND-DA04',
      'status': 'confirmed',
      'appointment_date': '2026-10-25',
      'time_slot': '10:00',
      'patient': {
        'id': 'pat-da04',
        'name': 'يوسف بلقاسم',
        'phone': '0550112233',
      },
    };

    testWidgets(
        'Successful confirmation moves appointment from Pending to Expected and displays success SnackBar',
        (tester) async {
      var confirmCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-da04/confirm')) {
          confirmCalled = true;
          return http.Response(
            jsonEncode({
              'message': 'تم تأكيد الموعد بنجاح وخصم الحصة من الرصيد إن وجدت.',
              'data': confirmedAppt,
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // 1. Switch to Pending tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      expect(find.text('يوسف بلقاسم'), findsOneWidget);
      expect(find.text('تأكيد الموعد'), findsOneWidget);

      // 2. Tap Confirm action on the tile
      await tester.tap(find.text('تأكيد الموعد'));
      await tester.pumpAndSettle();

      // 3. Verify AlertDialog
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('تأكيد الموعد الطبي'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.textContaining('يوسف بلقاسم'),
        ),
        findsOneWidget,
      );

      // 4. Tap Confirm action in AlertDialog
      final dialogConfirmBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الموعد'),
      );
      await tester.tap(dialogConfirmBtn);
      await tester.pumpAndSettle();

      // 5. Verify API called and success SnackBar shown
      expect(confirmCalled, isTrue);
      expect(find.text('تم تأكيد الموعد بنجاح.'), findsOneWidget);

      // 6. Verify appointment removed from Pending tab
      expect(find.text('يوسف بلقاسم'), findsNothing);

      // 7. Switch to Expected tab (المتوقع حضورهم) and verify appointment is present
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('يوسف بلقاسم'), findsOneWidget);
    });

    testWidgets(
        'Server error (422) on confirmation shows error SnackBar, preserves pending queue, and does not show false success',
        (tester) async {
      var confirmCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-da04/confirm')) {
          confirmCalled = true;
          return http.Response(
            jsonEncode({
              'message': 'لا يمكن تأكيد الموعد: رصيد المركز غير كافٍ.',
            }),
            422,
            headers: {'content-type': 'application/json'},
          );
        }

        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Tap Confirm
      await tester.tap(find.text('تأكيد الموعد'));
      await tester.pumpAndSettle();

      // Confirm in dialog
      final dialogConfirmBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الموعد'),
      );
      await tester.tap(dialogConfirmBtn);
      await tester.pumpAndSettle();

      expect(confirmCalled, isTrue);

      // Verify Error SnackBar shown
      expect(find.text('لا يمكن تأكيد الموعد: رصيد المركز غير كافٍ.'), findsOneWidget);

      // Verify Success SnackBar is NOT shown
      expect(find.text('تم تأكيد الموعد بنجاح.'), findsNothing);

      // Verify appointment REMAINS in Pending tab
      expect(find.text('يوسف بلقاسم'), findsOneWidget);
    });

    testWidgets(
        'Dismissing confirmation dialog (Cancel) aborts flow without calling API or modifying queue',
        (tester) async {
      var confirmCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-da04/confirm')) {
          confirmCalled = true;
          return http.Response('{}', 200);
        }

        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Tap Confirm
      await tester.tap(find.text('تأكيد الموعد'));
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsOneWidget);

      // Tap Cancel
      await tester.tap(find.text('إلغاء'));
      await tester.pumpAndSettle();

      // Dialog is gone
      expect(find.byType(AlertDialog), findsNothing);

      // API was NOT called
      expect(confirmCalled, isFalse);

      // Appointment remains in Pending
      expect(find.text('يوسف بلقاسم'), findsOneWidget);
    });

    testWidgets(
        'In-flight confirmation disables confirm button with progress indicator and prevents double-clicking',
        (tester) async {
      final completer = Completer<http.Response>();
      var callCount = 0;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-da04/confirm')) {
          callCount++;
          return completer.future;
        }

        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Tap Confirm
      await tester.tap(find.text('تأكيد الموعد'));
      await tester.pumpAndSettle();

      // Tap Confirm in Dialog
      final dialogConfirmBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الموعد'),
      );
      await tester.tap(dialogConfirmBtn);
      await tester.pump(); // dispatch tap and trigger pop
      await tester.pump(const Duration(milliseconds: 400)); // complete pop route animation

      // Dialog is dismissed
      expect(find.byType(AlertDialog), findsNothing);

      // In-flight progress indicator is showing on the tile
      expect(find.byType(CircularProgressIndicator), findsWidgets);
      expect(callCount, equals(1));

      // Attempt to tap the tile button again while processing
      final tileBtn = find.widgetWithText(ElevatedButton, 'تأكيد الموعد');
      if (tileBtn.evaluate().isNotEmpty) {
        final buttonWidget = tester.widget<ElevatedButton>(tileBtn);
        expect(buttonWidget.onPressed, isNull, reason: 'Button must be disabled during in-flight processing');
      }

      // Complete the response
      completer.complete(http.Response(
        jsonEncode({
          'message': 'تم تأكيد الموعد بنجاح.',
          'data': confirmedAppt,
        }),
        200,
        headers: {'content-type': 'application/json'},
      ));
      await tester.pumpAndSettle();

      // Call count remains strictly 1 (no duplicate calls)
      expect(callCount, equals(1));
      expect(find.text('تم تأكيد الموعد بنجاح.'), findsOneWidget);
    });

    testWidgets(
        'User lacking booking.confirm permission cannot see or trigger the confirm action',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: restrictedAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // Switch to Pending tab
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      // Patient is listed
      expect(find.text('يوسف بلقاسم'), findsOneWidget);

      // Confirm button is NOT present because onConfirm is null
      expect(find.text('تأكيد الموعد'), findsNothing);
    });

    testWidgets(
        'Confirmation dialog and action buttons render correct localized text across English and French locales',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        if (status == 'pending') {
          return http.Response(
            jsonEncode({
              'data': [pendingAppt],
              'meta': {'current_page': 1, 'last_page': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('tok'),
        apiClient: apiClient,
      );

      // Test English
      await tester.pumpWidget(createTestWidget(
        locale: const Locale('en'),
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      // English pending tab
      await tester.tap(find.text('Pending Confirmation'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Appointment'), findsOneWidget);
      await tester.tap(find.text('Confirm Appointment'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Medical Appointment'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(ElevatedButton, 'Confirm Appointment'),
        ),
        findsOneWidget,
      );

      // Dismiss dialog
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      // Test French
      await tester.pumpWidget(createTestWidget(
        locale: const Locale('fr'),
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: fullAssistantUser,
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('En attente'));
      await tester.pumpAndSettle();

      expect(find.text('Confirmer le rendez-vous'), findsOneWidget);
      await tester.tap(find.text('Confirmer le rendez-vous'));
      await tester.pumpAndSettle();

      expect(find.text('Confirmer le rendez-vous médical'), findsOneWidget);
      expect(find.text('Annuler'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(ElevatedButton, 'Confirmer le rendez-vous'),
        ),
        findsOneWidget,
      );
    });
  });
}
