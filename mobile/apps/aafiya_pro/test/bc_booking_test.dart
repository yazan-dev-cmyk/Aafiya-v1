// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'package:aafiya_pro/screens/bc_appointment_booking_screen.dart';
import 'package:aafiya_pro/screens/bc_appointments_list_screen.dart';
import 'package:aafiya_pro/shells/booking_center_shell.dart';
import 'package:aafiya_pro/widgets/bc_booking_ticket_sheet.dart';
import 'package:aafiya_pro/widgets/slot_selection_grid.dart';

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

void configureTestScreen(WidgetTester tester) {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

http.Response jsonResponse(dynamic body, [int statusCode = 200]) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    statusCode,
    headers: const {'content-type': 'application/json; charset=utf-8'},
  );
}

(ApiClient, AuthSessionManager) createTestClients(MockClient mockClient) {
  final tokenStorage = InMemoryTokenStorage();
  final apiClient = ApiClient(httpClient: mockClient, tokenStorage: tokenStorage);
  final sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
  return (apiClient, sessionManager);
}

void main() {
  const bcUser = User(
    id: 'bc-user-001',
    name: 'مركز الجزائر للحجوزات',
    email: 'booking@algiers.dz',
    roles: [UserRole.bookingCenter],
  );

  final mockQuotaPayload = {
    'data': {
      'booking_center_id': 'bc-001',
      'name': 'مركز الجزائر للحجوزات',
      'quota_balance': 18,
    }
  };

  final mockZeroQuotaPayload = {
    'data': {
      'booking_center_id': 'bc-001',
      'name': 'مركز الجزائر للحجوزات',
      'quota_balance': 0,
    }
  };

  final mockPatientsSearchPayload = {
    'data': [
      {
        'id': 'pat-uuid-001',
        'mrn': 'MRN-2026-001',
        'first_name': 'عمر',
        'last_name': 'فاروق',
        'full_name': 'عمر فاروق',
        'gender': 'male',
        'date_of_birth': '1992-05-15',
        'phone': '0555123456',
        'email': 'omar@example.com',
        'is_active': true,
      },
    ]
  };

  final mockDoctorsPayload = {
    'status': 'success',
    'data': [
      {
        'id': 'doc-uuid-001',
        'name': 'د. فاطمة الزهراء',
        'specialty': 'أمراض القلب والشرايين',
        'bio': 'طبيبة قلب معتمدة',
        'is_verified': true,
        'clinics': [
          {
            'id': 'clinic-uuid-001',
            'name': 'عيادة النور',
            'wilaya': 'الجزائر',
            'address': 'شارع ديدوش مراد',
            'phone': '021123456',
            'position': 'director',
          },
        ],
      },
    ]
  };

  final mockSlotsPayload = {
    'data': {
      'doctor_id': 'doc-uuid-001',
      'clinic_id': 'clinic-uuid-001',
      'date': '2026-09-25',
      'slots': [
        {
          'time_slot': '08:00',
          'max_capacity': 10,
          'occupied': 2,
          'available': 8,
          'is_available': true,
        },
        {
          'time_slot': '09:00',
          'max_capacity': 10,
          'occupied': 10,
          'available': 0,
          'is_available': false,
        },
      ],
    }
  };

  final mockCreatedAppointmentPayload = {
    'message': 'تم إنشاء حجز الموعد بنجاح.',
    'data': {
      'id': 'apt-uuid-001',
      'booking_reference': 'MS-2026-4B82',
      'secure_token': 'sec_tok_abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
      'clinic': {
        'id': 'clinic-uuid-001',
        'name': 'عيادة النور',
        'phone': '021123456',
        'wilaya': 'الجزائر',
      },
      'doctor': {
        'id': 'doc-uuid-001',
        'name': 'د. فاطمة الزهراء',
        'specialty': 'أمراض القلب والشرايين',
      },
      'patient': {
        'id': 'pat-uuid-001',
        'name': 'عمر فاروق',
        'phone': '0555123456',
        'mrn': 'MRN-2026-001',
      },
      'booking_center': {
        'id': 'bc-001',
        'name': 'مركز الجزائر للحجوزات',
      },
      'appointment_date': '2026-09-25',
      'time_slot': '08:00',
      'status': 'pending',
      'notes': 'موعد فحص دوري',
      'created_at': '2026-09-21T18:00:00.000Z',
    },
  };

  final mockAppointmentsListPayload = {
    'data': [
      {
        'id': 'apt-uuid-001',
        'booking_reference': 'MS-2026-4B82',
        'secure_token': 'sec_tok_abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        'clinic': {
          'id': 'clinic-uuid-001',
          'name': 'عيادة النور',
          'phone': '021123456',
          'wilaya': 'الجزائر',
        },
        'doctor': {
          'id': 'doc-uuid-001',
          'name': 'د. فاطمة الزهراء',
          'specialty': 'أمراض القلب والشرايين',
        },
        'patient': {
          'id': 'pat-uuid-001',
          'name': 'عمر فاروق',
          'phone': '0555123456',
          'mrn': 'MRN-2026-001',
        },
        'appointment_date': '2026-09-25',
        'time_slot': '08:00',
        'status': 'pending',
        'created_at': '2026-09-21T18:00:00.000Z',
      },
      {
        'id': 'apt-uuid-002',
        'booking_reference': 'MS-2026-9C14',
        'secure_token': 'sec_tok_9988776655443322110099887766554433221100998877665544332211001122',
        'clinic': {
          'id': 'clinic-uuid-001',
          'name': 'عيادة النور',
          'phone': '021123456',
          'wilaya': 'الجزائر',
        },
        'doctor': {
          'id': 'doc-uuid-001',
          'name': 'د. فاطمة الزهراء',
          'specialty': 'أمراض القلب والشرايين',
        },
        'patient': {
          'name': 'سمير بلقاسم',
          'phone': '0666112233',
        },
        'appointment_date': '2026-09-24',
        'time_slot': '10:00',
        'status': 'confirmed',
        'created_at': '2026-09-20T10:00:00.000Z',
      },
    ]
  };

  group('BookingCenterShell Operational Tiles & Governance Tests', () {
    testWidgets('Renders New Booking and Appointments History action tiles', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BookingCenterShell(
          user: bcUser,
          sessionManager: sessionManager,
          apiClient: apiClient,
          bookingCenterService: service,
          onSignOut: () {},
        ),
      ));
      await tester.pumpAndSettle();

      // Assert operational tiles exist
      expect(find.byKey(const Key('open_new_booking_tile')), findsOneWidget);
      expect(find.byKey(const Key('open_appointments_history_tile')), findsOneWidget);
      expect(find.text('حجز موعد جديد'), findsOneWidget);
      expect(find.text('سجل مواعيد المركز'), findsOneWidget);

      // Governance Assertions (DISC-04): Zero staff/employee UI
      expect(find.text('إدارة الموظفين'), findsNothing);
      expect(find.text('إضافة موظف'), findsNothing);
      expect(find.text('Employees'), findsNothing);
      expect(find.text('Staff'), findsNothing);
    });
  });

  group('BcAppointmentBookingScreen Wizard Tests', () {
    testWidgets('Step 1: Renders Registered and Guest patient modes, searches registered patients', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        if (request.url.path.contains('/doctors')) {
          return jsonResponse(mockDoctorsPayload);
        }
        if (request.url.path.contains('/patients')) {
          return jsonResponse(mockPatientsSearchPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentBookingScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
          initialQuotaBalance: 18,
        ),
      ));
      await tester.pumpAndSettle();

      // Assert Step 1 is active
      expect(find.text('بيانات المريض'), findsAtLeast(1));
      expect(find.text('مريض مسجل'), findsOneWidget);
      expect(find.text('مريض زائر / جديد'), findsOneWidget);

      // Search registered patient
      final searchField = find.byType(TextField).first;
      await tester.enterText(searchField, 'عمر');
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();

      expect(find.text('عمر فاروق'), findsOneWidget);
      expect(find.textContaining('MRN: MRN-2026-001'), findsOneWidget);

      // Tap on searched patient to select
      await tester.tap(find.text('عمر فاروق'));
      await tester.pumpAndSettle();

      expect(find.text('المريض المحدد'), findsOneWidget);
      expect(find.text('تغيير المريض'), findsOneWidget);
    });

    testWidgets('Step 2 & 3: Doctor and Clinic selection, slot capacity display', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        if (request.url.path.contains('/doctors')) {
          return jsonResponse(mockDoctorsPayload);
        }
        if (request.url.path.contains('/patients')) {
          return jsonResponse(mockPatientsSearchPayload);
        }
        if (request.url.path.contains('/appointments/slots')) {
          return jsonResponse(mockSlotsPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentBookingScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
          initialQuotaBalance: 18,
        ),
      ));
      await tester.pumpAndSettle();

      // Select guest mode
      await tester.tap(find.text('مريض زائر / جديد'));
      await tester.pumpAndSettle();

      // Enter name and phone
      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'أحمد بن علي');
      await tester.enterText(textFields.at(1), '0555987654');
      await tester.pumpAndSettle();

      // Advance to Step 2
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();

      // Assert Step 2 (Doctor & Clinic)
      expect(find.text('د. فاطمة الزهراء'), findsOneWidget);
      expect(find.text('أمراض القلب والشرايين'), findsOneWidget);

      // Select doctor
      await tester.tap(find.byKey(const Key('doctor_radio_doc-uuid-001')));
      await tester.pumpAndSettle();

      // Advance to Step 3
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();

      // Assert Step 3 (Slots)
      expect(find.byType(SlotSelectionGrid), findsOneWidget);
      expect(find.text('08:00'), findsOneWidget);
      expect(find.text('09:00'), findsOneWidget);
      expect(find.text('مكتمل'), findsOneWidget); // 09:00 is full
    });

    testWidgets('Step 4 & Submission: Quota notice transparency and creation of pending appointment', (tester) async {
      configureTestScreen(tester);
      bool appointmentPostReceived = false;

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers/quota-balance')) {
          return jsonResponse(mockQuotaPayload);
        }
        if (request.url.path.contains('/doctors')) {
          return jsonResponse(mockDoctorsPayload);
        }
        if (request.url.path.contains('/appointments/slots')) {
          return jsonResponse(mockSlotsPayload);
        }
        if (request.url.path == '/api/v1/appointments' && request.method == 'POST') {
          appointmentPostReceived = true;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['patient_name'], 'أحمد بن علي');
          expect(body['time_slot'], '08:00');
          return jsonResponse(mockCreatedAppointmentPayload, 201);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentBookingScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
          initialQuotaBalance: 18,
        ),
      ));
      await tester.pumpAndSettle();

      // Guest mode
      await tester.tap(find.text('مريض زائر / جديد'));
      await tester.pumpAndSettle();
      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'أحمد بن علي');
      await tester.enterText(textFields.at(1), '0555987654');
      await tester.pumpAndSettle();

      // Step 2
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('doctor_radio_doc-uuid-001')));
      await tester.pumpAndSettle();

      // Step 3
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('08:00'));
      await tester.pumpAndSettle();

      // Step 4
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();

      // Verify canonical quota explanation notice is displayed
      expect(find.text('تنبيه هام حول خصم الحصص'), findsOneWidget);
      expect(
        find.textContaining('يتم إنشاء الموعد بحالة "معلق" ولن يتم خصم أي حصة'),
        findsOneWidget,
      );

      // Submit booking
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();

      expect(appointmentPostReceived, isTrue);

      // Assert Ticket Sheet appeared with Reference and QR
      expect(find.byType(BcBookingTicketSheet), findsOneWidget);
      expect(find.text('MS-2026-4B82'), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.text('قيد الانتظار'), findsAtLeast(1));
    });

    testWidgets('Zero Quota renders warning banner in Review step', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/booking-centers/quota-balance')) {
          return jsonResponse(mockZeroQuotaPayload);
        }
        if (request.url.path.contains('/doctors')) {
          return jsonResponse(mockDoctorsPayload);
        }
        if (request.url.path.contains('/appointments/slots')) {
          return jsonResponse(mockSlotsPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentBookingScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
          initialQuotaBalance: 0,
        ),
      ));
      await tester.pumpAndSettle();

      // Guest mode
      await tester.tap(find.text('مريض زائر / جديد'));
      await tester.pumpAndSettle();
      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.at(0), 'كمال رامي');
      await tester.enterText(textFields.at(1), '0777123456');
      await tester.pumpAndSettle();

      // Step 2 & 3 & 4
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('doctor_radio_doc-uuid-001')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('08:00'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('wizard_next_button')));
      await tester.pumpAndSettle();

      // Assert zero quota warning is visible
      expect(
        find.textContaining('الرصيد الحالي 0 — لا يمكن تأكيد حجوزات جديدة دون شحن باقة'),
        findsOneWidget,
      );
    });
  });

  group('BcAppointmentsListScreen History & Actions Tests', () {
    testWidgets('Lists center appointments and supports status filtering', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/appointments') {
          return jsonResponse(mockAppointmentsListPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentsListScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
        ),
      ));
      await tester.pumpAndSettle();

      // Assert appointments rendered
      expect(find.text('MS-2026-4B82'), findsOneWidget);
      expect(find.text('MS-2026-9C14'), findsOneWidget);
      expect(find.text('عمر فاروق'), findsOneWidget);
      expect(find.text('سمير بلقاسم'), findsOneWidget);

      // Status filters
      expect(find.text('الكل'), findsOneWidget);
      expect(find.text('قيد الانتظار'), findsAtLeast(1));
      expect(find.text('مؤكد'), findsAtLeast(1));
    });

    testWidgets('Tap card opens BcBookingTicketSheet', (tester) async {
      configureTestScreen(tester);
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/appointments') {
          return jsonResponse(mockAppointmentsListPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentsListScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
        ),
      ));
      await tester.pumpAndSettle();

      // Tap on first appointment card
      await tester.tap(find.text('MS-2026-4B82'));
      await tester.pumpAndSettle();

      // Assert Ticket Sheet opened
      expect(find.byType(BcBookingTicketSheet), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
    });

    testWidgets('Cancellation dialog triggers backend cancel call and invokes refresh callback', (tester) async {
      configureTestScreen(tester);
      bool cancelCalled = false;
      bool quotaRefreshTriggered = false;

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/v1/appointments') {
          return jsonResponse(mockAppointmentsListPayload);
        }
        if (request.url.path == '/api/v1/appointments/apt-uuid-001/cancel' && request.method == 'POST') {
          cancelCalled = true;
          return jsonResponse(mockCreatedAppointmentPayload);
        }
        return jsonResponse({});
      });

      final (apiClient, sessionManager) = createTestClients(mockClient);
      final service = BookingCenterService(apiClient: apiClient);

      await tester.pumpWidget(createTestWidget(
        child: BcAppointmentsListScreen(
          sessionManager: sessionManager,
          user: bcUser,
          apiClient: apiClient,
          bookingCenterService: service,
          onQuotaNeedsRefresh: () {
            quotaRefreshTriggered = true;
          },
        ),
      ));
      await tester.pumpAndSettle();

      // Tap Cancel button on first card
      final cancelButtons = find.text('إلغاء الموعد الطبي');
      await tester.tap(cancelButtons.first);
      await tester.pumpAndSettle();

      // Assert dialog appeared
      expect(find.text('هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟'), findsOneWidget);

      // Confirm cancel
      await tester.tap(find.text('تأكيد الإلغاء'));
      await tester.pumpAndSettle();

      expect(cancelCalled, isTrue);
      expect(quotaRefreshTriggered, isTrue);
    });
  });

  group('BcBookingTicketSheet Standalone Tests', () {
    testWidgets('Renders all canonical fields and QR image', (tester) async {
      configureTestScreen(tester);
      final appointment = Appointment.fromJson(
        (mockCreatedAppointmentPayload['data'] as Map<String, dynamic>),
      );

      await tester.pumpWidget(createTestWidget(
        child: BcBookingTicketSheet(
          appointment: appointment,
          onBookAnother: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('تذكرة الحجز'), findsOneWidget);
      expect(find.text('MS-2026-4B82'), findsOneWidget);
      expect(find.text('عمر فاروق'), findsOneWidget);
      expect(find.text('د. فاطمة الزهراء'), findsOneWidget);
      expect(find.text('عيادة النور'), findsOneWidget);
      expect(find.text('2026-09-25'), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.text('حجز موعد آخر'), findsOneWidget);
    });
  });
}
