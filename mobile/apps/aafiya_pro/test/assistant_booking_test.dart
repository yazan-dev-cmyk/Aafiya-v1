// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/assistant_booking_screen.dart';
import 'package:aafiya_pro/screens/assistant_queue_screen.dart';
import 'package:aafiya_pro/widgets/slot_selection_grid.dart';

void main() {
  const testClinicId = '01a081ea-2e14-72d8-b97d-29026efc4bf4';
  const testDoctorId = '01a081ea-2e12-73b9-a130-c6026b413ba8';

  const testClinic = DoctorClinic(
    id: testClinicId,
    name: 'عيادة الأمل',
    position: 'assistant',
    isActive: true,
    isPrimary: true,
  );

  const testUser = User(
    id: 'user-ast-001',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    roles: [UserRole.doctorAssistant],
    permissions: ['booking.create', 'booking.manage_queue'],
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

  group('SlotSelectionGrid Widget Tests', () {
    final testSlots = [
      const AppointmentSlot(
        timeSlot: '08:00',
        maxCapacity: 10,
        occupied: 2,
        available: 8,
        isAvailable: true,
      ),
      const AppointmentSlot(
        timeSlot: '09:00',
        maxCapacity: 10,
        occupied: 10,
        available: 0,
        isAvailable: false,
      ),
      const AppointmentSlot(
        timeSlot: '10:00',
        maxCapacity: 10,
        occupied: 4,
        available: 6,
        isAvailable: true,
      ),
    ];

    testWidgets('Renders all slots with time and capacity information', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: SlotSelectionGrid(
            slots: testSlots,
            selectedSlot: '08:00',
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('08:00'), findsOneWidget);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('10:00'), findsOneWidget);

      // 08:00 is available (8/10)
      expect(find.text('متاح: 8 من 10'), findsOneWidget);
      // 09:00 is full
      expect(find.text('مكتمل'), findsOneWidget);
      // 10:00 is available (6/10)
      expect(find.text('متاح: 6 من 10'), findsOneWidget);
    });

    testWidgets('Tapping available slot triggers onSlotSelected', (tester) async {
      AppointmentSlot? selected;
      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: SlotSelectionGrid(
            slots: testSlots,
            onSlotSelected: (slot) => selected = slot,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('slot_tile_10:00')));
      await tester.pumpAndSettle();

      expect(selected, isNotNull);
      expect(selected!.timeSlot, equals('10:00'));
    });

    testWidgets('Tapping full slot does not trigger onSlotSelected', (tester) async {
      AppointmentSlot? selected;
      await tester.pumpWidget(createTestWidget(
        child: Scaffold(
          body: SlotSelectionGrid(
            slots: testSlots,
            onSlotSelected: (slot) => selected = slot,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('slot_tile_09:00')));
      await tester.pumpAndSettle();

      expect(selected, isNull);
    });

    testWidgets('Shows loading indicator when isLoading is true', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const Scaffold(
          body: SlotSelectionGrid(
            slots: [],
            isLoading: true,
          ),
        ),
      ));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('جارٍ تحميل الفترات المتاحة...'), findsOneWidget);
    });

    testWidgets('Shows empty view when slots list is empty', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const Scaffold(
          body: SlotSelectionGrid(
            slots: [],
            isLoading: false,
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('لا توجد فترات حجز متاحة لهذا التاريخ.'), findsOneWidget);
    });
  });

  group('AssistantBookingScreen Full Flow Tests', () {
    late ApiClient mockApiClient;
    late AuthSessionManager sessionManager;

    setUp(() async {
      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.endsWith('/clinics/$testClinicId')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': testClinicId,
                'name': 'عيادة الأمل',
                'doctors': [
                  {
                    'id': testDoctorId,
                    'name': 'د. مرسلي فاتح',
                    'specialty': 'طب عام',
                    'position': 'director',
                    'is_active': true,
                  },
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (path.endsWith('/appointments/slots')) {
          return http.Response(
            jsonEncode({
              'data': {
                'slots': [
                  {'time_slot': '08:00', 'max_capacity': 10, 'occupied': 1, 'available': 9, 'is_available': true},
                  {'time_slot': '09:00', 'max_capacity': 10, 'occupied': 10, 'available': 0, 'is_available': false},
                  {'time_slot': '10:00', 'max_capacity': 10, 'occupied': 2, 'available': 8, 'is_available': true},
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        if (path.endsWith('/appointments') && request.method == 'POST') {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          // Ensure no booking_center_id is transmitted
          if (body.containsKey('booking_center_id')) {
            return http.Response(jsonEncode({'message': 'booking_center_id forbidden'}), 400);
          }

          return http.Response(
            jsonEncode({
              'data': {
                'id': 'new-appt-001',
                'booking_reference': 'MS-2026-0099',
                'status': 'pending',
                'appointment_date': body['appointment_date'],
                'time_slot': body['time_slot'],
                'doctor': {'id': testDoctorId, 'name': 'د. مرسلي فاتح'},
                'patient': {
                  'id': body['patient_id'],
                  'name': body['patient_name'],
                  'phone': body['patient_phone'],
                  'mrn': body['patient_mrn'],
                },
              },
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(jsonEncode({'message': 'Not Found'}), 404);
      });

      mockApiClient = ApiClient(httpClient: mockClient);

      sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: mockApiClient,
      );
      await sessionManager.setAuthenticatedUser(
        token: 'test-token',
        user: testUser,
      );
    });

    testWidgets('Walk-in booking validates required fields and creates appointment', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: AssistantBookingScreen(
          sessionManager: sessionManager,
          user: testUser,
          apiClient: mockApiClient,
        ),
      ));
      await tester.pumpAndSettle();

      // Verify Walk-in badge displayed
      expect(find.text('مريض قادم مباشرة'), findsOneWidget);

      // Verify Doctor is pre-selected
      expect(find.text('د. مرسلي فاتح'), findsOneWidget);

      // Verify Slots are rendered
      expect(find.text('08:00'), findsOneWidget);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('10:00'), findsOneWidget);

      // Attempt to submit without selecting slot or filling fields
      await tester.ensureVisible(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.tap(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.pumpAndSettle();

      // SnackBar should warn about time slot
      expect(find.text('الفترة الزمنية المتاحة'), findsWidgets);

      // Select 08:00 slot
      await tester.ensureVisible(find.byKey(const ValueKey('slot_tile_08:00')));
      await tester.tap(find.byKey(const ValueKey('slot_tile_08:00')));
      await tester.pumpAndSettle();

      // Fill in Patient Name & Phone
      await tester.ensureVisible(find.byKey(const ValueKey('patient_name_field')));
      await tester.enterText(find.byKey(const ValueKey('patient_name_field')), 'يوسف بن بوعلي');

      await tester.ensureVisible(find.byKey(const ValueKey('patient_phone_field')));
      await tester.enterText(find.byKey(const ValueKey('patient_phone_field')), '0661223344');

      // Submit
      await tester.ensureVisible(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.tap(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.pumpAndSettle();

      // Verify Success Dialog is shown with Booking Reference
      expect(find.text('تم إنشاء حجز الموعد بنجاح'), findsOneWidget);
      expect(find.text('MS-2026-0099'), findsOneWidget);
      expect(find.text('العودة إلى قائمة الانتظار'), findsOneWidget);
      expect(find.text('حجز موعد آخر'), findsOneWidget);
    });

    testWidgets('Return-visit booking prefills patient details and displays return badge', (tester) async {
      const returnPatient = PatientSearchResult(
        id: 'patient-uuid-888',
        mrn: 'MRN-ALG-2026-01',
        firstName: 'فاطمة',
        lastName: 'براهيمي',
        phone: '0555998877',
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantBookingScreen(
          sessionManager: sessionManager,
          user: testUser,
          apiClient: mockApiClient,
          initialPatient: returnPatient,
        ),
      ));
      await tester.pumpAndSettle();

      // Verify Return Visit Badge is shown
      expect(find.text('زيارة عودة'), findsWidgets);

      // Verify fields prefilled
      expect(find.text('فاطمة براهيمي'), findsOneWidget);
      expect(find.text('0555998877'), findsOneWidget);
      expect(find.text('MRN-ALG-2026-01'), findsOneWidget);

      // Select 10:00 slot
      await tester.ensureVisible(find.byKey(const ValueKey('slot_tile_10:00')));
      await tester.tap(find.byKey(const ValueKey('slot_tile_10:00')));
      await tester.pumpAndSettle();

      // Submit
      await tester.ensureVisible(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.tap(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.pumpAndSettle();

      // Verify Success
      expect(find.text('تم إنشاء حجز الموعد بنجاح'), findsOneWidget);
      expect(find.text('MS-2026-0099'), findsOneWidget);
    });

    testWidgets('Handles 422 slot capacity conflict gracefully', (tester) async {
      final conflictClient = MockClient((request) async {
        final path = request.url.path;
        if (path.endsWith('/clinics/$testClinicId')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': testClinicId,
                'doctors': [
                  {'id': testDoctorId, 'name': 'د. مرسلي فاتح', 'is_active': true},
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.endsWith('/appointments/slots')) {
          return http.Response(
            jsonEncode({
              'data': {
                'slots': [
                  {'time_slot': '08:00', 'max_capacity': 10, 'occupied': 9, 'available': 1, 'is_available': true},
                ],
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.endsWith('/appointments') && request.method == 'POST') {
          return http.Response(
            jsonEncode({'message': 'Selected slot is full'}),
            422,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(jsonEncode({'message': 'Not Found'}), 404);
      });

      final apiClient = ApiClient(httpClient: conflictClient);
      apiClient.setActiveClinicId(testClinicId);
      final testSession = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );

      await tester.pumpWidget(createTestWidget(
        child: AssistantBookingScreen(
          sessionManager: testSession,
          user: testUser,
          apiClient: apiClient,
        ),
      ));
      await tester.pumpAndSettle();

      // Select 08:00 slot
      await tester.ensureVisible(find.byKey(const ValueKey('slot_tile_08:00')));
      await tester.tap(find.byKey(const ValueKey('slot_tile_08:00')));
      await tester.pumpAndSettle();

      // Fill name and phone
      await tester.ensureVisible(find.byKey(const ValueKey('patient_name_field')));
      await tester.enterText(find.byKey(const ValueKey('patient_name_field')), 'حميد قادري');
      await tester.ensureVisible(find.byKey(const ValueKey('patient_phone_field')));
      await tester.enterText(find.byKey(const ValueKey('patient_phone_field')), '0555001122');

      // Tap submit
      await tester.ensureVisible(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.tap(find.byKey(const ValueKey('confirm_booking_button')));
      await tester.pumpAndSettle();

      // Verify slot full message displayed in SnackBar
      expect(find.textContaining('امتلأت السعة القصوى'), findsOneWidget);
    });
  });

  group('AssistantQueueScreen Entry Point Integration', () {
    testWidgets('AssistantQueueScreen renders new booking action button', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'data': [], 'meta': {'current_page': 1, 'last_page': 1}}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      apiClient.setActiveClinicId(testClinicId);
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      final queueService = AssistantQueueService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: AssistantQueueScreen(
          sessionManager: sessionManager,
          user: testUser,
          apiClient: apiClient,
          queueService: queueService,
        ),
      ));
      await tester.pumpAndSettle();

      // Check New Booking Button exists
      final newBookingBtn = find.byKey(const ValueKey('new_booking_action_button'));
      expect(newBookingBtn, findsOneWidget);
      expect(find.text('حجز موعد جديد'), findsWidgets);
    });
  });
}
