// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_patient/app.dart';
import 'package:aafiya_patient/screens/appointment_detail_screen.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/widgets/appointment_card.dart';

void main() {
  group('TASK-03-02: Patient Home Dashboard & Appointments List Tests', () {
    late InMemoryTokenStorage tokenStorage;
    const testPatient = User(
      id: 'patient-42',
      name: 'مراد قادري',
      email: 'mourad@aafiya.dz',
      phone: '0555333444',
      roles: [UserRole.patient],
    );

    final mockUpcomingAppointmentJson = {
      'id': 'app-upcoming-1',
      'booking_reference': 'BK-20261015-001',
      'clinic': {
        'id': 'clinic-1',
        'name': 'عيادة الشفاء التخصصية',
        'phone': '021445566',
        'wilaya': 'الجزائر',
      },
      'doctor': {
        'id': 'doc-1',
        'name': 'د. كريم بلقاسم',
        'specialty': 'أمراض القلب',
      },
      'patient': {
        'id': 'patient-42',
        'name': 'مراد قادري',
        'phone': '0555333444',
      },
      'appointment_date': '2026-10-15',
      'time_slot': '10:30',
      'status': 'confirmed',
      'notes': 'يرجى إحضار التحاليل السابقة',
      'confirmed_at': '2026-09-01T10:00:00.000Z',
      'checked_in_at': null,
      'created_at': '2026-09-01T09:00:00.000Z',
    };

    final mockPendingUpcomingJson = {
      'id': 'app-upcoming-2',
      'booking_reference': 'BK-20261020-002',
      'clinic': {
        'id': 'clinic-2',
        'name': 'عيادة الأمل',
        'phone': '021332211',
        'wilaya': 'البليدة',
      },
      'doctor': {
        'id': 'doc-2',
        'name': 'د. نادية منصوري',
        'specialty': 'طب الأطفال',
      },
      'appointment_date': '2026-10-20',
      'time_slot': '14:00',
      'status': 'pending',
      'notes': null,
      'confirmed_at': null,
      'checked_in_at': null,
      'created_at': '2026-09-05T08:00:00.000Z',
    };

    final mockPastAttendedJson = {
      'id': 'app-past-1',
      'booking_reference': 'BK-20260701-003',
      'clinic': {
        'id': 'clinic-1',
        'name': 'عيادة الشفاء التخصصية',
        'phone': '021445566',
        'wilaya': 'الجزائر',
      },
      'doctor': {
        'id': 'doc-1',
        'name': 'د. كريم بلقاسم',
        'specialty': 'أمراض القلب',
      },
      'appointment_date': '2026-07-01',
      'time_slot': '09:00',
      'status': 'attended',
      'notes': 'فحص دوري',
      'confirmed_at': '2026-06-25T11:00:00.000Z',
      'checked_in_at': '2026-07-01T08:50:00.000Z',
      'created_at': '2026-06-20T10:00:00.000Z',
    };

    final mockPastCancelledJson = {
      'id': 'app-past-2',
      'booking_reference': 'BK-20260610-004',
      'clinic': {
        'id': 'clinic-3',
        'name': 'مركز ابن سينا',
        'phone': '031556677',
        'wilaya': 'قسنطينة',
      },
      'doctor': {
        'id': 'doc-3',
        'name': 'د. توفيق عماري',
        'specialty': 'طب وجراحة العيون',
      },
      'appointment_date': '2026-06-10',
      'time_slot': '11:15',
      'status': 'cancelled',
      'notes': 'تم إلغاء الموعد',
      'confirmed_at': null,
      'checked_in_at': null,
      'created_at': '2026-06-01T12:00:00.000Z',
    };

    final mockPastNoShowJson = {
      'id': 'app-past-3',
      'booking_reference': 'BK-20260515-005',
      'clinic': {
        'id': 'clinic-1',
        'name': 'عيادة الشفاء التخصصية',
        'phone': '021445566',
        'wilaya': 'الجزائر',
      },
      'doctor': {
        'id': 'doc-1',
        'name': 'د. كريم بلقاسم',
        'specialty': 'أمراض القلب',
      },
      'appointment_date': '2026-05-15',
      'time_slot': '16:00',
      'status': 'no_show',
      'notes': null,
      'confirmed_at': '2026-05-10T10:00:00.000Z',
      'checked_in_at': null,
      'created_at': '2026-05-01T14:00:00.000Z',
    };

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    Widget createPatientHomeWidget({
      required ApiClient client,
      required AuthSessionManager manager,
      Locale locale = const Locale('ar'),
    }) {
      return AafiyaPatientApp(
        sessionManager: manager,
        apiClient: client,
        initialNavState: PatientNavState.home,
        initialLocale: locale,
      );
    }

    // =========================================================================
    // TEST 1 — LOADING STATE
    // =========================================================================
    testWidgets('1. Loading: displays AafiyaLoadingView while appointment request is in-flight', (tester) async {
      final completer = Completer<http.Response>();
      final mockHttp = MockClient((request) => completer.future);

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));

      // Switch to appointments tab (index 1)
      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pump();

      expect(find.byType(AafiyaLoadingView), findsOneWidget);
      expect(find.text('جاري تحميل المواعيد...'), findsOneWidget);

      // Complete request to avoid pending timer/future
      completer.complete(http.Response(jsonEncode({'data': []}), 200, headers: {'content-type': 'application/json'}));
      await tester.pumpAndSettle();
    });

    // =========================================================================
    // TEST 2 — UPCOMING APPOINTMENTS RENDERING
    // =========================================================================
    testWidgets('2. Upcoming Rendering: displays doctor, specialty, clinic, date, time, reference and status', (tester) async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [mockUpcomingAppointmentJson],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      // Switch to Appointments tab
      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Verify AppointmentCard renders key upcoming details
      expect(find.byType(AppointmentCard), findsOneWidget);
      expect(find.text('د. كريم بلقاسم'), findsOneWidget);
      expect(find.text('أمراض القلب'), findsOneWidget);
      expect(find.text('عيادة الشفاء التخصصية (الجزائر)'), findsOneWidget);
      expect(find.text('2026-10-15'), findsOneWidget);
      expect(find.text('10:30'), findsOneWidget);
      expect(find.text('مؤكد'), findsOneWidget);
      expect(find.text('رقم الحجز: #BK-20261015-001'), findsOneWidget);
    });

    // =========================================================================
    // TEST 3 — PAST VISITS / HISTORY PARTITIONING
    // =========================================================================
    testWidgets('3. Past History: partitions past and attended appointments into past history tab', (tester) async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [
                mockUpcomingAppointmentJson,
                mockPastAttendedJson,
                mockPastCancelledJson,
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      // Switch to Appointments tab
      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Upcoming subtab has 1 appointment
      expect(find.text('المواعيد القادمة (1)'), findsOneWidget);
      expect(find.text('المواعيد السابقة (2)'), findsOneWidget);
      expect(find.text('د. كريم بلقاسم'), findsOneWidget);

      // Tap Past subtab
      await tester.tap(find.text('المواعيد السابقة (2)'));
      await tester.pumpAndSettle();

      // In Past tab: past attended and cancelled appointments appear
      expect(find.text('تم الحضور'), findsOneWidget);
      expect(find.text('ملغى'), findsOneWidget);
      expect(find.text('د. توفيق عماري'), findsOneWidget);
    });

    // =========================================================================
    // TEST 4 — STATUS LABELS
    // =========================================================================
    testWidgets('4. Status Labels: verifies representative statuses render correct localized text', (tester) async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [
                mockUpcomingAppointmentJson, // confirmed
                mockPendingUpcomingJson,     // pending
                mockPastAttendedJson,        // attended
                mockPastCancelledJson,       // cancelled
                mockPastNoShowJson,          // no_show
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // In Upcoming: confirmed & pending appear
      expect(find.text('مؤكد'), findsOneWidget);
      expect(find.text('قيد الانتظار'), findsOneWidget);

      // Switch to Past: attended, cancelled, no_show appear
      await tester.tap(find.text('المواعيد السابقة (3)'));
      await tester.pumpAndSettle();

      expect(find.text('تم الحضور'), findsOneWidget);
      expect(find.text('ملغى'), findsOneWidget);
      expect(find.text('لم يحضر'), findsOneWidget);
    });

    // =========================================================================
    // TEST 5 — APPOINTMENT DETAILS SCREEN
    // =========================================================================
    testWidgets('5. Details: tapping an appointment opens AppointmentDetailScreen with full info', (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [mockUpcomingAppointmentJson],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Tap on the AppointmentCard
      await tester.tap(find.byType(AppointmentCard));
      await tester.pumpAndSettle();

      // Verify AppointmentDetailScreen is displayed
      expect(find.byType(AppointmentDetailScreen), findsOneWidget);
      expect(find.text('تفاصيل الموعد'), findsOneWidget);
      expect(find.text('يرجى إحضار التحاليل السابقة'), findsOneWidget);
      expect(find.text('تم التأكيد بتاريخ: 1 سبتمبر 2026'), findsOneWidget);

      // Tap close icon in app bar
      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();

      expect(find.byType(AppointmentDetailScreen), findsNothing);
    });

    // =========================================================================
    // TEST 6 — EMPTY UPCOMING APPOINTMENTS
    // =========================================================================
    testWidgets('6. Empty Upcoming: displays AafiyaEmptyView when no upcoming appointments exist', (tester) async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [mockPastAttendedJson], // Only past appointments
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Upcoming subtab is empty
      expect(find.byType(AafiyaEmptyView), findsOneWidget);
      expect(find.text('لا توجد مواعيد قادمة مجدولة.'), findsOneWidget);
    });

    // =========================================================================
    // TEST 7 — EMPTY PAST APPOINTMENTS
    // =========================================================================
    testWidgets('7. Empty Past: displays AafiyaEmptyView when no past appointments exist', (tester) async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.contains('/appointments')) {
          return http.Response(
            jsonEncode({
              'data': [mockUpcomingAppointmentJson], // Only upcoming
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Tap Past subtab
      await tester.tap(find.text('المواعيد السابقة (0)'));
      await tester.pumpAndSettle();

      expect(find.byType(AafiyaEmptyView), findsOneWidget);
      expect(find.text('لا توجد مواعيد سابقة مسجلة.'), findsOneWidget);
    });

    // =========================================================================
    // TEST 8 — ERROR AND RETRY
    // =========================================================================
    testWidgets('8. Error & Retry: request failure displays AafiyaErrorView and retry refetches', (tester) async {
      int requestCount = 0;
      final mockHttp = MockClient((request) async {
        requestCount++;
        if (requestCount == 1) {
          return http.Response(
            jsonEncode({
              'status': 'error',
              'message': 'تعذر الاتصال بالخادم، يرجى التحقق من الشبكة.',
            }),
            500,
            headers: {'content-type': 'application/json'},
          );
        } else {
          return http.Response(
            jsonEncode({
              'data': [mockUpcomingAppointmentJson],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Error view displayed
      expect(find.byType(AafiyaErrorView), findsOneWidget);
      expect(find.text('تعذر الاتصال بالخادم، يرجى التحقق من الشبكة.'), findsOneWidget);
      expect(find.text('إعادة محاولة تحميل المواعيد'), findsOneWidget);

      // Tap Retry
      await tester.tap(find.text('إعادة محاولة تحميل المواعيد'));
      await tester.pumpAndSettle();

      // Success: AppointmentCard rendered
      expect(find.byType(AppointmentCard), findsOneWidget);
      expect(find.text('د. كريم بلقاسم'), findsOneWidget);
    });

    // =========================================================================
    // TEST 9 — DISC-01 STRICT DIRECT BOOKING PROHIBITION
    // =========================================================================
    testWidgets('9. DISC-01: Proves ZERO direct booking buttons or slot pickers exist in PatientHome', (tester) async {
      final mockHttp = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [mockUpcomingAppointmentJson],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      // In Home overview: Verify DISC-01 notice is present
      expect(find.text('يتم حجز المواعيد حصرياً عبر مراكز الحجز المعتمدة.'), findsOneWidget);

      // Verify no booking action exists on Home
      expect(find.text('احجز موعد'), findsNothing);
      expect(find.text('حجز جديد'), findsNothing);
      expect(find.text('Book Appointment'), findsNothing);
      expect(find.text('New Appointment'), findsNothing);
      expect(find.text('اختر موعد'), findsNothing);
      expect(find.text('اختر طبيب'), findsNothing);
      expect(find.text('إنشاء موعد'), findsNothing);
      expect(find.byKey(const Key('book_appointment_button')), findsNothing);

      // Switch to Appointments tab
      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();

      // Verify no booking action exists on Appointments tab
      expect(find.text('احجز موعد'), findsNothing);
      expect(find.text('حجز جديد'), findsNothing);
      expect(find.text('Book Appointment'), findsNothing);

      // Tap card to open details
      await tester.tap(find.byType(AppointmentCard));
      await tester.pumpAndSettle();

      // Verify no booking action exists on AppointmentDetailScreen
      expect(find.text('احجز موعد'), findsNothing);
      expect(find.text('إعادة جدولة'), findsNothing);
      expect(find.text('Reschedule'), findsNothing);
      expect(find.text('Book Appointment'), findsNothing);
    });

    // =========================================================================
    // TEST 10 — LOCALIZATION & RTL/LTR
    // =========================================================================
    testWidgets('10. Localization: Arabic renders RTL, English renders LTR with proper translations', (tester) async {
      final mockHttp = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [mockUpcomingAppointmentJson],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      // 1. Arabic: RTL
      await tester.pumpWidget(
        AafiyaPatientApp(
          key: const Key('ar_app'),
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.home,
          initialLocale: const Locale('ar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(Directionality.of(tester.element(find.byType(PatientHomeShell))), TextDirection.rtl);
      expect(find.text('الرئيسية'), findsOneWidget);
      expect(find.text('المواعيد'), findsWidgets);

      // 2. English: LTR
      await tester.pumpWidget(
        AafiyaPatientApp(
          key: const Key('en_app'),
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.home,
          initialLocale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();

      expect(Directionality.of(tester.element(find.byType(PatientHomeShell))), TextDirection.ltr);
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Appointments'), findsWidgets);
      expect(find.text('Appointments are arranged exclusively through registered Booking Centers.'), findsOneWidget);

      // 3. French: LTR
      await tester.pumpWidget(
        AafiyaPatientApp(
          key: const Key('fr_app'),
          sessionManager: manager,
          apiClient: client,
          initialNavState: PatientNavState.home,
          initialLocale: const Locale('fr'),
        ),
      );
      await tester.pumpAndSettle();

      expect(Directionality.of(tester.element(find.byType(PatientHomeShell))), TextDirection.ltr);
      expect(find.text('Accueil'), findsOneWidget);
      expect(find.text('Rendez-vous'), findsWidgets);
      expect(find.text('Les rendez-vous sont réservés exclusivement via les centres de réservation agréés.'), findsOneWidget);
    });

    // =========================================================================
    // TEST 11 — PULL-TO-REFRESH
    // =========================================================================
    testWidgets('11. Pull-to-refresh: RefreshIndicator triggers fresh appointments fetch', (tester) async {
      int requestCount = 0;
      final mockHttp = MockClient((request) async {
        requestCount++;
        return http.Response(
          jsonEncode({
            'data': [mockUpcomingAppointmentJson],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final client = ApiClient(httpClient: mockHttp, tokenStorage: tokenStorage);
      final manager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: client);
      await manager.setAuthenticatedUser(token: 'test_token', user: testPatient);

      await tester.pumpWidget(createPatientHomeWidget(client: client, manager: manager));
      await tester.pumpAndSettle();

      final initialRequests = requestCount;

      // Trigger pull to refresh on Home overview
      await tester.fling(find.byType(SingleChildScrollView).first, const Offset(0, 300), 1000);
      await tester.pumpAndSettle();

      expect(requestCount, greaterThan(initialRequests));
    });
  });
}
