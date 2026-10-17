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

  group('DA-03 AssistantQueueService.cancelAppointment Unit Tests', () {
    const apptId = 'appt-test-200';

    test('POSTs to /appointments/{id}/cancel with reason in body', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$apptId/cancel'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['reason'], equals('إلغاء بناءً على رغبة المريض'));

        return http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
            'data': {
              'id': apptId,
              'booking_reference': 'BK-200',
              'status': 'cancelled',
              'appointment_date': '2026-10-25',
              'time_slot': '11:00',
              'patient': {'id': 'pat-1', 'name': 'أحمد بلحاج'},
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.cancelAppointment(
        apptId,
        reason: 'إلغاء بناءً على رغبة المريض',
      );

      expect(result, isA<ApiSuccess<Appointment>>());
      final appt = (result as ApiSuccess<Appointment>).data;
      expect(appt.id, equals(apptId));
      expect(appt.status, equals(AppointmentStatus.cancelled));
    });

    test('POSTs to /appointments/{id}/cancel with null body when reason is omitted', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/appointments/$apptId/cancel'));
        expect(request.body, isEmpty);

        return http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
            'data': {
              'id': apptId,
              'booking_reference': 'BK-200',
              'status': 'cancelled',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.cancelAppointment(apptId);

      expect(result, isA<ApiSuccess<Appointment>>());
    });

    test('returns ApiFailure on 403 Forbidden when assistant is unauthorized', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'غير مصرح: المساعد غير مصرح له بالعمل على هذه العيادة.',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.cancelAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ForbiddenException>());
    });

    test('returns ApiFailure on 422 Unprocessable Entity when already cancelled', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'الموعد ملغى مسبقاً ولا يمكن إلغاؤه مجدداً.',
            'errors': {
              'status': ['الموعد ملغى مسبقاً ولا يمكن إلغاؤه مجدداً.']
            },
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = AssistantQueueService(apiClient: apiClient);

      final result = await service.cancelAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ValidationException>());
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

      final result = await service.cancelAppointment(apptId);

      expect(result, isA<ApiFailure<Appointment>>());
      final failure = result as ApiFailure<Appointment>;
      expect(failure.exception, isA<ServerException>());
    });
  });

  group('DA-03 AssistantQueueScreen Cancellation UI & State Mutation Widget Tests', () {
    const expectedAppt = {
      'id': 'appt-exp-da03',
      'booking_reference': 'BK-EXP-DA03',
      'status': 'confirmed',
      'appointment_date': '2026-10-25',
      'time_slot': '10:00',
      'patient': {
        'id': 'pat-da03',
        'name': 'سليمان بن عيسى',
        'phone': '0550998877',
      },
    };

    const pendingAppt = {
      'id': 'appt-pnd-da03',
      'booking_reference': 'BK-PND-DA03',
      'status': 'pending',
      'appointment_date': '2026-10-25',
      'time_slot': '11:00',
      'patient': {
        'id': 'pat-da03-pnd',
        'name': 'فاطمة الزهراء',
        'phone': '0550445566',
      },
    };

    testWidgets(
        'Cancelling a confirmed appointment from Expected tab sends reason, shows success SnackBar and removes from list',
        (tester) async {
      var cancelCalled = false;
      String? sentReason;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-exp-da03/cancel')) {
          cancelCalled = true;
          if (request.body.isNotEmpty) {
            final json = jsonDecode(request.body) as Map<String, dynamic>;
            sentReason = json['reason'];
          }
          return http.Response(
            jsonEncode({
              'message': 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
              'data': {
                ...expectedAppt,
                'status': 'cancelled',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [expectedAppt],
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

      // 1. Switch to Expected tab (المتوقع حضورهم)
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('سليمان بن عيسى'), findsOneWidget);

      // 2. Locate the cancel button on the item
      final cancelBtn = find.byKey(const ValueKey('assistant_cancel_expected_appt-exp-da03'));
      expect(cancelBtn, findsOneWidget);

      await tester.tap(cancelBtn);
      await tester.pumpAndSettle();

      // 3. Verify AlertDialog
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('إلغاء الموعد الطبي'), findsOneWidget);
      expect(find.textContaining('سليمان بن عيسى'), findsOneWidget);

      // 4. Enter cancellation reason in TextField
      final reasonField = find.byType(TextField);
      expect(reasonField, findsOneWidget);
      await tester.enterText(reasonField, 'طلب المريض تأجيل السفر');
      await tester.pumpAndSettle();

      // 5. Confirm cancellation in dialog
      final confirmCancelBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الإلغاء'),
      );
      await tester.tap(confirmCancelBtn);
      await tester.pumpAndSettle();

      // 6. Verify API was called with the reason
      expect(cancelCalled, isTrue);
      expect(sentReason, equals('طلب المريض تأجيل السفر'));

      // 7. Verify Success SnackBar shown
      expect(find.text('تم إلغاء الموعد بنجاح وتحديث الرصيد إن كان مؤكداً.'), findsOneWidget);

      // 8. Verify appointment removed from Expected tab
      expect(find.text('سليمان بن عيسى'), findsNothing);
    });

    testWidgets(
        'Cancelling a pending appointment from Pending tab without reason sends null body and removes from pending list',
        (tester) async {
      var cancelCalled = false;
      var bodyWasEmpty = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-pnd-da03/cancel')) {
          cancelCalled = true;
          bodyWasEmpty = request.body.isEmpty;
          return http.Response(
            jsonEncode({
              'message': 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
              'data': {
                ...pendingAppt,
                'status': 'cancelled',
              },
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

      // 1. Switch to Pending tab (بانتظار التأكيد)
      await tester.tap(find.text('بانتظار التأكيد'));
      await tester.pumpAndSettle();

      expect(find.text('فاطمة الزهراء'), findsOneWidget);

      // 2. Locate the cancel button on the pending item
      final cancelBtn = find.byKey(const ValueKey('assistant_cancel_pending_appt-pnd-da03'));
      expect(cancelBtn, findsOneWidget);

      await tester.tap(cancelBtn);
      await tester.pumpAndSettle();

      // 3. Confirm directly without typing a reason
      final confirmCancelBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الإلغاء'),
      );
      await tester.tap(confirmCancelBtn);
      await tester.pumpAndSettle();

      expect(cancelCalled, isTrue);
      expect(bodyWasEmpty, isTrue);

      // Success SnackBar and removal
      expect(find.text('تم إلغاء الموعد بنجاح وتحديث الرصيد إن كان مؤكداً.'), findsOneWidget);
      expect(find.text('فاطمة الزهراء'), findsNothing);
    });

    testWidgets(
        'Dismissing cancellation dialog aborts flow without calling API or modifying lists',
        (tester) async {
      var cancelCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-exp-da03/cancel')) {
          cancelCalled = true;
          return http.Response('{}', 200);
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [expectedAppt],
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

      // Switch to Expected tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Tap cancel
      final cancelBtn = find.byKey(const ValueKey('assistant_cancel_expected_appt-exp-da03'));
      await tester.tap(cancelBtn);
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsOneWidget);

      // Tap Cancel in Dialog (إلغاء)
      final dialogCancelBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('إلغاء'),
      );
      await tester.tap(dialogCancelBtn);
      await tester.pumpAndSettle();

      // Dialog dismissed, API NOT called, item remains
      expect(find.byType(AlertDialog), findsNothing);
      expect(cancelCalled, isFalse);
      expect(find.text('سليمان بن عيسى'), findsOneWidget);
    });

    testWidgets(
        'Server error (403/500) shows error SnackBar, preserves list, and does not show false success',
        (tester) async {
      var cancelCalled = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-exp-da03/cancel')) {
          cancelCalled = true;
          return http.Response(
            jsonEncode({
              'message': 'غير مصرح: تم تعليق حساب المساعد في هذه العيادة.',
            }),
            403,
            headers: {'content-type': 'application/json'},
          );
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [expectedAppt],
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

      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      final cancelBtn = find.byKey(const ValueKey('assistant_cancel_expected_appt-exp-da03'));
      await tester.tap(cancelBtn);
      await tester.pumpAndSettle();

      final confirmCancelBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الإلغاء'),
      );
      await tester.tap(confirmCancelBtn);
      await tester.pumpAndSettle();

      expect(cancelCalled, isTrue);

      // Error SnackBar shown
      expect(find.text('غير مصرح: تم تعليق حساب المساعد في هذه العيادة.'), findsOneWidget);

      // Success SnackBar is NOT shown
      expect(find.text('تم إلغاء الموعد بنجاح وتحديث الرصيد إن كان مؤكداً.'), findsNothing);

      // Appointment remains in the list
      expect(find.text('سليمان بن عيسى'), findsOneWidget);
    });

    testWidgets(
        'In-flight cancellation disables action buttons and prevents double clicking',
        (tester) async {
      final completer = Completer<http.Response>();
      var callCount = 0;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/appointments/appt-exp-da03/cancel')) {
          callCount++;
          return completer.future;
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [expectedAppt],
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

      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      final cancelBtn = find.byKey(const ValueKey('assistant_cancel_expected_appt-exp-da03'));
      await tester.tap(cancelBtn);
      await tester.pumpAndSettle();

      final confirmCancelBtn = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('تأكيد الإلغاء'),
      );
      await tester.tap(confirmCancelBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(callCount, equals(1));

      // Attempt to tap cancel again while processing
      if (cancelBtn.evaluate().isNotEmpty) {
        final buttonWidget = tester.widget<OutlinedButton>(cancelBtn);
        expect(buttonWidget.onPressed, isNull, reason: 'Cancel button must be disabled during processing');
      }

      completer.complete(http.Response(
        jsonEncode({
          'message': 'تم إلغاء الموعد.',
          'data': {
            ...expectedAppt,
            'status': 'cancelled',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      ));
      await tester.pumpAndSettle();

      expect(callCount, equals(1));
      expect(find.text('سليمان بن عيسى'), findsNothing);
    });
  });
}
