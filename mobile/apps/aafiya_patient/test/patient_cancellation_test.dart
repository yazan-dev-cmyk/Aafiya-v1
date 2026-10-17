import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/screens/appointment_detail_screen.dart';
import 'package:qr_flutter/qr_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Appointment createTestAppointment({
    String id = 'appt-100',
    String bookingReference = 'BK-100200',
    String? secureToken = 'sec_tok_valid_test_token_1234567890abcdef',
    AppointmentStatus status = AppointmentStatus.confirmed,
    String patientId = 'pat-1',
    String patientName = 'أحمد بن علي',
    String doctorName = 'د. كمال عماري',
    String clinicName = 'عيادة النور المركزية',
    String appointmentDate = '2026-10-25',
    String timeSlot = '10:00',
  }) {
    return Appointment(
      id: id,
      bookingReference: bookingReference,
      secureToken: secureToken,
      status: status,
      doctor: AppointmentDoctor(id: 'doc-1', name: doctorName, specialty: 'Cardiology'),
      clinic: AppointmentClinic(id: 'cl-1', name: clinicName, wilaya: '16', phone: '021000000'),
      patient: AppointmentPatient(id: patientId, name: patientName),
      appointmentDate: appointmentDate,
      timeSlot: timeSlot,
    );
  }

  Widget createTestWidget(
    Widget child, {
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
      home: Scaffold(body: child),
    );
  }

  void configureViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
  }

  group('FIX-PAT-01 / P-01: Patient Appointment Cancellation Tests', () {
    // 1. Cancellation button visible for active future appointments
    testWidgets('cancellation button is visible for pending, confirmed, and rescheduled future appointments',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0); // 2 hours before 10:00

      for (final activeStatus in [
        AppointmentStatus.pending,
        AppointmentStatus.confirmed,
        AppointmentStatus.rescheduled,
      ]) {
        final appt = createTestAppointment(status: activeStatus);
        await tester.pumpWidget(
          createTestWidget(
            AppointmentDetailScreen(
              appointment: appt,
              currentPatientId: 'pat-1',
              currentTime: () => now,
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(
          find.byKey(const Key('cancel_appointment_button')),
          findsOneWidget,
          reason: 'Cancel button should be visible for status $activeStatus',
        );
      }
    });

    // 2. Cancellation button hidden for terminal appointments
    testWidgets('cancellation button is hidden for terminal/completed appointments',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0);

      for (final terminalStatus in [
        AppointmentStatus.cancelled,
        AppointmentStatus.rejected,
        AppointmentStatus.expired,
        AppointmentStatus.attended,
        AppointmentStatus.noShow,
      ]) {
        final appt = createTestAppointment(status: terminalStatus);
        await tester.pumpWidget(
          createTestWidget(
            AppointmentDetailScreen(
              appointment: appt,
              currentPatientId: 'pat-1',
              currentTime: () => now,
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(
          find.byKey(const Key('cancel_appointment_button')),
          findsNothing,
          reason: 'Cancel button must be hidden for status $terminalStatus',
        );
      }
    });

    // 3. DEC-POL-02 Policy Boundary: Cancellation button hidden when now >= appointment start time
    testWidgets('cancellation button is hidden when current time is at or after appointment start time (DEC-POL-02)',
        (tester) async {
      configureViewport(tester);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
        status: AppointmentStatus.confirmed,
      );

      // Case A: Exact start time
      final exactTime = DateTime(2026, 10, 25, 10, 0);
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => exactTime,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);

      // Case B: After start time (e.g. 1 minute later)
      final afterTime = DateTime(2026, 10, 25, 10, 1);
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => afterTime,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);

      // Case C: Before start time (e.g. 1 minute before start time is allowed)
      final beforeTime = DateTime(2026, 10, 25, 9, 59);
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => beforeTime,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('cancel_appointment_button')), findsOneWidget);
    });

    // 4. Ownership verification: Cancellation button hidden if currentPatientId does not match
    testWidgets('cancellation button is hidden when patient ID does not match appointment patient ID',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0);
      final appt = createTestAppointment(
        patientId: 'pat-1',
        status: AppointmentStatus.confirmed,
      );

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-999-intruder',
            currentTime: () => now,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);
    });

    // 5. Dialog dismissal: Cancel button in confirmation dialog dismisses without API call
    testWidgets('dialog dismissal does not trigger cancellation or API call', (tester) async {
      configureViewport(tester);
      var apiCalled = false;
      final mockClient = MockClient((request) async {
        apiCalled = true;
        return http.Response('{}', 200);
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
        status: AppointmentStatus.confirmed,
      );

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap cancel button to open confirmation dialog
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();

      // Verify dialog is open
      expect(find.byKey(const Key('cancellation_reason_input')), findsOneWidget);
      expect(find.byKey(const Key('cancel_dialog_dismiss_button')), findsOneWidget);

      // Tap dismiss (strings.cancel)
      await tester.tap(find.byKey(const Key('cancel_dialog_dismiss_button')));
      await tester.pumpAndSettle();

      // Dialog dismissed, no API call
      expect(find.byKey(const Key('cancellation_reason_input')), findsNothing);
      expect(apiCalled, isFalse);
      // Cancel button remains visible because appointment is still confirmed
      expect(find.byKey(const Key('cancel_appointment_button')), findsOneWidget);
    });

    // 6. Successful cancellation flow with reason, API call, status mutation, callback and SnackBar
    testWidgets('successful cancellation sends POST with reason, updates status, and fires callback',
        (tester) async {
      configureViewport(tester);
      String? sentMethod;
      String? sentPath;
      Map<String, dynamic>? sentBody;
      Appointment? callbackResult;

      final mockClient = MockClient((request) async {
        sentMethod = request.method;
        sentPath = request.url.path;
        if (request.body.isNotEmpty) {
          sentBody = jsonDecode(request.body) as Map<String, dynamic>;
        }

        return http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد بنجاح.',
            'data': {
              'id': 'appt-100',
              'booking_reference': 'BK-100200',
              'status': 'cancelled',
              'notes': 'سبب عائلي طارئ',
              'appointment_date': '2026-10-25',
              'time_slot': '10:00',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(
        id: 'appt-100',
        bookingReference: 'BK-100200',
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
        status: AppointmentStatus.confirmed,
      );

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
            onAppointmentCancelled: (updated) {
              callbackResult = updated;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open cancel dialog
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();

      // Enter reason
      await tester.enterText(
        find.byKey(const Key('cancellation_reason_input')),
        'سبب عائلي طارئ',
      );
      await tester.pumpAndSettle();

      // Tap confirm cancel
      await tester.tap(find.byKey(const Key('confirm_cancel_button')));
      await tester.pumpAndSettle();

      // Verify API invocation contract
      expect(sentMethod, equals('POST'));
      expect(sentPath, endsWith('/api/v1/appointments/appt-100/cancel'));
      expect(sentBody, equals({'reason': 'سبب عائلي طارئ'}));

      // Verify callback fired
      expect(callbackResult, isNotNull);
      expect(callbackResult!.id, equals('appt-100'));
      expect(callbackResult!.status, equals(AppointmentStatus.cancelled));

      // Verify UI updated: status badge reflects cancelled, cancel button is gone
      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);
      expect(find.text('ملغى'), findsWidgets);

      // Verify SnackBar message displayed
      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('تم إلغاء الموعد بنجاح وتحديث الرصيد إن كان مؤكداً.'), findsOneWidget);
    });

    // 7. Successful cancellation without reason (optional reason contract)
    testWidgets('cancellation without reason sends empty payload to API', (tester) async {
      configureViewport(tester);
      String? sentBody;

      final mockClient = MockClient((request) async {
        sentBody = request.body;
        return http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد بنجاح.',
            'data': {
              'id': 'appt-100',
              'booking_reference': 'BK-100200',
              'status': 'cancelled',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(status: AppointmentStatus.confirmed);

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open cancel dialog
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();

      // Directly confirm without typing a reason
      await tester.tap(find.byKey(const Key('confirm_cancel_button')));
      await tester.pumpAndSettle();

      // Verify empty or null body sent
      expect(sentBody, anyOf(isNull, isEmpty));
      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);
    });

    // 8. Backend error handling (422 / 403 / 500)
    testWidgets('backend error displays error SnackBar and keeps appointment in active status',
        (tester) async {
      configureViewport(tester);
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'لا يمكن إلغاء الموعد بعد موعد بدئه.',
            'error': 'appointment_already_started',
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(status: AppointmentStatus.confirmed);

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open cancel dialog and confirm
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm_cancel_button')));
      await tester.pumpAndSettle();

      // Verify error message displayed in SnackBar
      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('لا يمكن إلغاء الموعد بعد موعد بدئه.'), findsOneWidget);

      // Verify appointment remains confirmed and cancel button is still available
      expect(find.byKey(const Key('cancel_appointment_button')), findsOneWidget);
      expect(find.text('مؤكد'), findsWidgets);
    });

    // 9. In-flight loading state and double-click prevention
    testWidgets('in-flight loading indicator and double-click prevention while cancelling',
        (tester) async {
      configureViewport(tester);
      final completer = Completer<http.Response>();
      var callCount = 0;

      final mockClient = MockClient((request) async {
        callCount++;
        return await completer.future;
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(status: AppointmentStatus.confirmed);

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open cancel dialog and tap confirm
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm_cancel_button')));
      await tester.pump(); // Start async work without settling

      // Verify call was initiated once
      expect(callCount, equals(1));

      // Attempt tapping cancel button again if possible - it should be loading / disabled
      final cancelButton = tester.widget<AafiyaButton>(
        find.byKey(const Key('cancel_appointment_button')),
      );
      expect(cancelButton.isLoading, isTrue);
      expect(cancelButton.onPressed, isNull);

      // Resolve the network call
      completer.complete(
        http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد بنجاح.',
            'data': {'id': 'appt-100', 'status': 'cancelled'},
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await tester.pumpAndSettle();

      expect(callCount, equals(1));
      expect(find.byKey(const Key('cancel_appointment_button')), findsNothing);
    });

    // 10. Localization coverage across Arabic, French, and English
    testWidgets('cancellation dialog and action labels render correctly in Arabic, French, and English',
        (tester) async {
      configureViewport(tester);
      final appt = createTestAppointment(status: AppointmentStatus.confirmed);
      final now = DateTime(2026, 10, 25, 8, 0);

      final locales = [
        (const Locale('ar'), 'إلغاء الموعد الطبي', 'هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟', 'تأكيد الإلغاء'),
        (const Locale('fr'), 'Annuler le rendez-vous', 'Êtes-vous sûr de vouloir annuler ce rendez-vous ?', "Confirmer l'annulation"),
        (const Locale('en'), 'Cancel Appointment', 'Are you sure you want to cancel this appointment?', 'Confirm Cancellation'),
      ];

      for (final (locale, title, prompt, confirmLabel) in locales) {
        await tester.pumpWidget(
          createTestWidget(
            AppointmentDetailScreen(
              appointment: appt,
              currentPatientId: 'pat-1',
              currentTime: () => now,
            ),
            locale: locale,
          ),
        );
        await tester.pumpAndSettle();

        // Check button title
        expect(find.text(title), findsOneWidget);

        // Open dialog
        await tester.tap(find.byKey(const Key('cancel_appointment_button')));
        await tester.pumpAndSettle();

        // Check dialog prompt and confirm action label
        expect(find.text(prompt), findsOneWidget);
        expect(find.text(confirmLabel), findsOneWidget);

        // Dismiss dialog
        await tester.tap(find.byKey(const Key('cancel_dialog_dismiss_button')));
        await tester.pumpAndSettle();
      }
    });

    // 11. Interaction with VisitPassSheet: After cancellation, VisitPassSheet suppresses QR code and shows ineligible card
    testWidgets('after cancellation, opening VisitPassSheet suppresses QR and shows ineligible card',
        (tester) async {
      configureViewport(tester);
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'تم إلغاء الموعد بنجاح.',
            'data': {
              'id': 'appt-100',
              'booking_reference': 'BK-100200',
              'status': 'cancelled',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final apiClient = ApiClient(httpClient: mockClient);

      final appt = createTestAppointment(status: AppointmentStatus.confirmed);

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Cancel appointment
      await tester.tap(find.byKey(const Key('cancel_appointment_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm_cancel_button')));
      await tester.pumpAndSettle();

      // Now tap the Visit Pass button
      await tester.tap(find.byKey(const Key('view_visit_pass_button')));
      await tester.pumpAndSettle();

      // Verify VisitPassSheet is opened for the updated cancelled appointment
      expect(find.byKey(const Key('visit_pass_ineligible_card')), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_container')), findsNothing);
      expect(find.byType(QrImageView), findsNothing);
      expect(find.text('هذا الموعد غير مؤهل لتسجيل الحضور'), findsOneWidget);
    });
  });
}
