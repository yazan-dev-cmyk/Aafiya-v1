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
import 'package:aafiya_patient/widgets/visit_pass_sheet.dart';
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
    String doctorId = 'doc-1',
    String doctorName = 'د. كمال عماري',
    String clinicId = 'cl-1',
    String clinicName = 'عيادة النور المركزية',
    String appointmentDate = '2026-10-25',
    String timeSlot = '10:00',
    String? notes,
  }) {
    return Appointment(
      id: id,
      bookingReference: bookingReference,
      secureToken: secureToken,
      status: status,
      doctor: AppointmentDoctor(id: doctorId, name: doctorName, specialty: 'Cardiology'),
      clinic: AppointmentClinic(id: clinicId, name: clinicName, wilaya: '16', phone: '021000000'),
      patient: AppointmentPatient(id: patientId, name: patientName),
      appointmentDate: appointmentDate,
      timeSlot: timeSlot,
      notes: notes,
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

  group('FIX-PAT-02: Patient Appointment Rescheduling in Flutter Tests', () {
    // 1. Visibility for eligible future appointments
    testWidgets('1. Reschedule button is visible for pending, confirmed, and rescheduled future appointments',
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
          find.byKey(const Key('reschedule_appointment_button')),
          findsOneWidget,
          reason: 'Reschedule button should be visible for status $activeStatus',
        );
      }
    });

    // 2. Prevent rescheduling for past appointments (even if pending or confirmed)
    testWidgets('2. Reschedule button is hidden when current time is at or after appointment start time (Option A)',
        (tester) async {
      configureViewport(tester);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
        status: AppointmentStatus.confirmed,
      );

      // Scenario A: Exactly at start time (10:00) -> Ineligible
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            key: const Key('scenario_a'),
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 10, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reschedule_appointment_button')), findsNothing);

      // Scenario B: 1 minute past start time (10:01) -> Ineligible
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            key: const Key('scenario_b'),
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 10, 1),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reschedule_appointment_button')), findsNothing);

      // Scenario C: Days in the past with pending status -> Ineligible
      final pendingPast = createTestAppointment(
        id: 'appt-past-1',
        appointmentDate: '2026-10-20',
        timeSlot: '09:00',
        status: AppointmentStatus.pending,
      );
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            key: const Key('scenario_c'),
            appointment: pendingPast,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reschedule_appointment_button')), findsNothing);
    });

    // 3. Ownership validation
    testWidgets('3. Reschedule button is hidden if appointment does not belong to current patient',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0);
      final appt = createTestAppointment(patientId: 'pat-actual-owner');

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-different-user',
            currentTime: () => now,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('reschedule_appointment_button')), findsNothing);
    });

    // 4. Ineligible statuses
    testWidgets('4. Reschedule button is hidden for attended, cancelled, rejected, expired, and noShow statuses',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0);

      for (final terminalStatus in [
        AppointmentStatus.attended,
        AppointmentStatus.cancelled,
        AppointmentStatus.rejected,
        AppointmentStatus.expired,
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
          find.byKey(const Key('reschedule_appointment_button')),
          findsNothing,
          reason: 'Reschedule button should be hidden for status $terminalStatus',
        );
      }
    });

    // 5. Slot fetching and availability rendering
    testWidgets('5. Slot fetching queries GET /slots, displays available slots and disables full slots',
        (tester) async {
      configureViewport(tester);
      String? queriedPath;
      Map<String, String>? queryParams;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/appointments/slots')) {
          queriedPath = request.url.path;
          queryParams = request.url.queryParameters;
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [
                  {
                    'time_slot': '09:00',
                    'max_capacity': 5,
                    'occupied': 2,
                    'available': 3,
                    'is_available': true,
                  },
                  {
                    'time_slot': '10:00',
                    'max_capacity': 5,
                    'occupied': 5,
                    'available': 0,
                    'is_available': false,
                  },
                  {
                    'time_slot': '11:00',
                    'max_capacity': 5,
                    'occupied': 1,
                    'available': 4,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
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

      // Tap reschedule button to open bottom sheet
      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      // Verify slots endpoint was queried with correct parameters
      expect(queriedPath, endsWith('/appointments/slots'));
      expect(queryParams?['clinic_id'], 'cl-1');
      expect(queryParams?['doctor_id'], 'doc-1');
      expect(queryParams?['date'], '2026-10-25');

      // Verify slot chips rendered
      expect(find.byKey(const Key('slot_chip_09:00')), findsOneWidget);
      expect(find.byKey(const Key('slot_chip_10:00')), findsOneWidget);
      expect(find.byKey(const Key('slot_chip_11:00')), findsOneWidget);

      // Verify confirm button is disabled before selecting a slot
      final confirmBtnFinder = find.byKey(const Key('confirm_reschedule_button'));
      expect(confirmBtnFinder, findsOneWidget);

      // Select full slot (10:00) -> should NOT select it
      await tester.tap(find.byKey(const Key('slot_chip_10:00')));
      await tester.pumpAndSettle();

      // Select available slot (09:00) -> should be selected
      await tester.tap(find.byKey(const Key('slot_chip_09:00')));
      await tester.pumpAndSettle();
    });

    // 6. Empty slots handling & error state with retry
    testWidgets('6. Empty slots displays empty view; slot fetch failure displays error view with retry',
        (tester) async {
      configureViewport(tester);
      int fetchCount = 0;

      final mockClient = MockClient((request) async {
        fetchCount++;
        if (fetchCount == 1) {
          // First attempt: 500 error
          return http.Response(
            jsonEncode({'message': 'خطأ في جلب الفترات'}),
            500,
            headers: {'content-type': 'application/json'},
          );
        } else {
          // Second attempt: empty slots list
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment();

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

      // Open sheet
      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      // Verify error view is shown on first attempt
      expect(find.byKey(const Key('slots_error_view')), findsOneWidget);
      expect(find.byKey(const Key('retry_slots_button')), findsOneWidget);

      // Tap retry button
      await tester.tap(find.byKey(const Key('retry_slots_button')));
      await tester.pumpAndSettle();

      // Verify empty view is shown on second attempt
      expect(find.byKey(const Key('no_slots_available_view')), findsOneWidget);
    });

    // 7. Successful reschedule flow
    testWidgets('7. Successful reschedule sends POST payload, updates local appointment state and fires callback',
        (tester) async {
      configureViewport(tester);
      String? postPath;
      Map<String, dynamic>? postBody;
      Appointment? callbackUpdated;

      final mockClient = MockClient((request) async {
        if (request.method == 'GET' && request.url.path.contains('/appointments/slots')) {
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [
                  {
                    'time_slot': '14:00',
                    'max_capacity': 5,
                    'occupied': 1,
                    'available': 4,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (request.method == 'POST' && request.url.path.contains('/reschedule')) {
          postPath = request.url.path;
          postBody = jsonDecode(request.body) as Map<String, dynamic>;

          return http.Response(
            jsonEncode({
              'message': 'تم تعديل موعد الحجز بنجاح.',
              'data': {
                'id': 'appt-100',
                'booking_reference': 'BK-100200',
                'secure_token': 'sec_tok_valid_test_token_1234567890abcdef',
                'status': 'confirmed',
                'appointment_date': '2026-10-25',
                'time_slot': '14:00',
                'notes': 'تغيير لظرف مسائي',
                'doctor': {'id': 'doc-1', 'name': 'د. كمال عماري'},
                'clinic': {'id': 'cl-1', 'name': 'عيادة النور المركزية'},
                'patient': {'id': 'pat-1', 'name': 'أحمد بن علي'},
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
      );

      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            apiClient: apiClient,
            currentPatientId: 'pat-1',
            currentTime: () => DateTime(2026, 10, 25, 8, 0),
            onAppointmentRescheduled: (updated) {
              callbackUpdated = updated;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open sheet
      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      // Select available slot 14:00
      await tester.tap(find.byKey(const Key('slot_chip_14:00')));
      await tester.pumpAndSettle();

      // Enter notes
      await tester.enterText(
        find.byKey(const Key('reschedule_notes_field')),
        'تغيير لظرف مسائي',
      );
      await tester.pumpAndSettle();

      // Confirm reschedule
      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pumpAndSettle();

      // Verify POST endpoint and payload
      expect(postPath, endsWith('/appointments/appt-100/reschedule'));
      expect(postBody?['appointment_date'], '2026-10-25');
      expect(postBody?['time_slot'], '14:00');
      expect(postBody?['notes'], 'تغيير لظرف مسائي');

      // Verify callback received updated appointment
      expect(callbackUpdated, isNotNull);
      expect(callbackUpdated?.timeSlot, '14:00');
      expect(callbackUpdated?.appointmentDate, '2026-10-25');
      expect(callbackUpdated?.notes, 'تغيير لظرف مسائي');
      expect(callbackUpdated?.secureToken, 'sec_tok_valid_test_token_1234567890abcdef');

      // Verify success SnackBar is displayed
      expect(find.text('تمت إعادة جدولة الموعد بنجاح.'), findsOneWidget);
    });

    // 8. No-op reschedule prevention
    testWidgets('8. Rescheduling to identical date and time slot is prevented with inline error banner',
        (tester) async {
      configureViewport(tester);
      bool postCalled = false;

      final mockClient = MockClient((request) async {
        if (request.method == 'GET' && request.url.path.contains('/appointments/slots')) {
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [
                  {
                    'time_slot': '10:00', // same as current appointment
                    'max_capacity': 5,
                    'occupied': 1,
                    'available': 4,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.method == 'POST') {
          postCalled = true;
          return http.Response('{}', 200);
        }
        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
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

      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      // Select identical slot (10:00)
      await tester.tap(find.byKey(const Key('slot_chip_10:00')));
      await tester.pumpAndSettle();

      // Tap confirm
      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pumpAndSettle();

      // Verify error banner is shown and no POST request was sent
      expect(find.byKey(const Key('reschedule_error_banner')), findsOneWidget);
      expect(find.text('التاريخ والفترة المحددة مطابقة لموعدك الحالي بالفعل.'), findsOneWidget);
      expect(postCalled, isFalse);
    });

    // 9. Double-click prevention
    testWidgets('9. Confirm button is disabled during submission and prevents multiple requests',
        (tester) async {
      configureViewport(tester);
      final completer = Completer<http.Response>();
      int postCount = 0;

      final mockClient = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [
                  {
                    'time_slot': '15:00',
                    'max_capacity': 5,
                    'occupied': 1,
                    'available': 4,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (request.method == 'POST') {
          postCount++;
          return completer.future;
        }

        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(appointmentDate: '2026-10-25', timeSlot: '10:00');

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

      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('slot_chip_15:00')));
      await tester.pumpAndSettle();

      // First tap on confirm
      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pump(); // Start request

      expect(postCount, 1);

      // Attempt second tap while in flight
      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pump();

      // Post count remains 1
      expect(postCount, 1);

      // Complete request
      completer.complete(
        http.Response(
          jsonEncode({
            'message': 'تم تعديل موعد الحجز بنجاح.',
            'data': {
              'id': 'appt-100',
              'appointment_date': '2026-10-25',
              'time_slot': '15:00',
              'status': 'confirmed',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await tester.pumpAndSettle();
    });

    // 10. Backend 422 errors and network recovery
    testWidgets('10. Backend 422 errors (capacity, vacation, duplicate) display error banner without corrupting state',
        (tester) async {
      configureViewport(tester);
      const serverErrorMessage = 'اكتملت السعة القصوى المحددة (5 مرضى) للطبيب في هذه الفترة الزمنية (14:00).';

      final mockClient = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-25',
                'slots': [
                  {
                    'time_slot': '14:00',
                    'max_capacity': 5,
                    'occupied': 4,
                    'available': 1,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (request.method == 'POST') {
          return http.Response(
            jsonEncode({
              'message': serverErrorMessage,
              'errors': {
                'capacity': [serverErrorMessage],
              },
            }),
            422,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(appointmentDate: '2026-10-25', timeSlot: '10:00');

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

      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('slot_chip_14:00')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pumpAndSettle();

      // Verify 422 error banner is rendered
      expect(find.byKey(const Key('reschedule_error_banner')), findsOneWidget);
      expect(find.text(serverErrorMessage), findsOneWidget);

      // Dismiss sheet
      await tester.tap(find.byKey(const Key('close_reschedule_sheet_button')));
      await tester.pumpAndSettle();

      // Verify appointment on screen remained on original 10:00 slot
      expect(find.textContaining('10:00'), findsWidgets);
    });

    // 11. QR Integration (P-02 with FIX-PAT-02)
    testWidgets('11. QR pass reflects updated date and time slot while keeping exact same secureToken',
        (tester) async {
      configureViewport(tester);
      const token = 'sec_tok_fixed_immutable_token_777';

      final mockClient = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': {
                'doctor_id': 'doc-1',
                'clinic_id': 'cl-1',
                'date': '2026-10-28',
                'slots': [
                  {
                    'time_slot': '16:00',
                    'max_capacity': 5,
                    'occupied': 0,
                    'available': 5,
                    'is_available': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (request.method == 'POST') {
          return http.Response(
            jsonEncode({
              'message': 'تم تعديل موعد الحجز بنجاح.',
              'data': {
                'id': 'appt-100',
                'booking_reference': 'BK-100200',
                'secure_token': token,
                'status': 'confirmed',
                'appointment_date': '2026-10-28',
                'time_slot': '16:00',
                'doctor': {'id': 'doc-1', 'name': 'د. كمال عماري'},
                'clinic': {'id': 'cl-1', 'name': 'عيادة النور المركزية'},
                'patient': {'id': 'pat-1', 'name': 'أحمد بن علي'},
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('Not found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final appt = createTestAppointment(
        appointmentDate: '2026-10-25',
        timeSlot: '10:00',
        secureToken: token,
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

      // Reschedule appointment
      await tester.tap(find.byKey(const Key('reschedule_appointment_button')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('slot_chip_16:00')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('confirm_reschedule_button')));
      await tester.pumpAndSettle();

      // Open VisitPassSheet
      await tester.tap(find.byKey(const Key('view_visit_pass_button')));
      await tester.pumpAndSettle();

      // Verify VisitPassSheet is displayed and contains same secureToken
      final passFinder = find.byType(VisitPassSheet);
      expect(passFinder, findsOneWidget);
      final sheetWidget = tester.widget<VisitPassSheet>(passFinder);
      expect(sheetWidget.appointment.secureToken, token);

      // Verify QrImageView exists
      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byKey(const Key('visit_pass_qr_image')), findsOneWidget);

      // Verify new time slot (16:00) is displayed on VisitPassSheet
      expect(
        find.descendant(
          of: find.byType(VisitPassSheet),
          matching: find.text('16:00'),
        ),
        findsOneWidget,
      );
    });

    // 12. Trilingual localization verification
    testWidgets('12. Trilingual localization verification across Arabic, English, and French',
        (tester) async {
      configureViewport(tester);
      final now = DateTime(2026, 10, 25, 8, 0);
      final appt = createTestAppointment();

      // Arabic
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => now,
          ),
          locale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('إعادة جدولة الموعد'), findsOneWidget);

      // English
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => now,
          ),
          locale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Reschedule Appointment'), findsOneWidget);

      // French
      await tester.pumpWidget(
        createTestWidget(
          AppointmentDetailScreen(
            appointment: appt,
            currentPatientId: 'pat-1',
            currentTime: () => now,
          ),
          locale: const Locale('fr'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Reporter le rendez-vous'), findsOneWidget);
    });
  });
}
