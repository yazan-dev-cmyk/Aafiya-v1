// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'package:aafiya_patient/screens/appointment_detail_screen.dart';
import 'package:aafiya_patient/screens/booking_center_directory_screen.dart';
import 'package:aafiya_patient/screens/clinic_directory_screen.dart';
import 'package:aafiya_patient/screens/doctor_directory_screen.dart';
import 'package:aafiya_patient/screens/emergency_profile_screen.dart';
import 'package:aafiya_patient/screens/notifications_screen.dart';
import 'package:aafiya_patient/screens/patient_shared_records_screen.dart';
import 'package:aafiya_patient/screens/prescriptions_screen.dart';
import 'package:aafiya_patient/shells/auth_shell.dart';
import 'package:aafiya_patient/shells/patient_home_shell.dart';
import 'package:aafiya_patient/shells/splash_shell.dart';
import 'package:aafiya_patient/widgets/visit_pass_sheet.dart';

void main() {
  const mandatoryViewports = <String, Size>{
    'Baseline 390x844': Size(390, 844),
    'Narrow Android 360x740': Size(360, 740),
    'Wide Flagship 412x915': Size(412, 915),
    'Compact Modal 360x640': Size(360, 640),
  };

  const testUser = User(
    id: 'pat-101',
    name: 'أحمد بلحاج',
    email: 'ahmed@aafiya.dz',
    phone: '0555123456',
    roles: [UserRole.patient],
  );

  final testAppointment = Appointment.fromJson({
    'id': 'apt-001',
    'booking_reference': 'BK-2026-001',
    'clinic': {
      'id': 'cln-1',
      'name': 'عيادة الرحمة',
      'phone': '023112233',
      'wilaya': 'الجزائر',
    },
    'doctor': {
      'id': 'doc-1',
      'name': 'د. ياسمين بوعلام',
      'specialty': 'طب الأطفال',
    },
    'patient': {
      'id': 'pat-101',
      'name': 'أحمد بلحاج',
      'phone': '0555123456',
    },
    'appointment_date': '2026-11-20',
    'time_slot': '11:00',
    'status': 'confirmed',
    'notes': 'متابعة دورية',
    'confirmed_at': '2026-11-01T10:00:00.000Z',
    'secure_token': 'AAFIYA-APPT:v1:apt-001:sig-dummy-token-abc12345',
  });

  Widget createHarness({
    required Widget child,
    Locale locale = const Locale('ar'),
  }) {
    return MaterialApp(
      locale: locale,
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
        Locale('fr'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AafiyaTheme.themeFor(locale),
      darkTheme: AafiyaTheme.darkThemeFor(locale),
      home: child,
    );
  }

  MockClient createMockClient() {
    return MockClient((request) async {
      final path = request.url.path;

      if (path.contains('/api/v1/patient/appointments') ||
          path.contains('/api/v1/appointments')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'apt-001',
                'booking_reference': 'BK-2026-001',
                'clinic': {
                  'id': 'cln-1',
                  'name': 'عيادة الرحمة',
                  'phone': '023112233',
                  'wilaya': 'الجزائر',
                },
                'doctor': {
                  'id': 'doc-1',
                  'name': 'د. ياسمين بوعلام',
                  'specialty': 'طب الأطفال',
                },
                'patient': {
                  'id': 'pat-101',
                  'name': 'أحمد بلحاج',
                  'phone': '0555123456',
                },
                'appointment_date': '2026-11-20',
                'time_slot': '11:00',
                'status': 'confirmed',
                'notes': 'متابعة دورية',
                'confirmed_at': '2026-11-01T10:00:00.000Z',
                'secure_token':
                    'AAFIYA-APPT:v1:apt-001:sig-dummy-token-abc12345',
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/patient/emergency-profile')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'patient_id': 'pat-101',
              'blood_group': 'O+',
              'allergies': ['بنسلين'],
              'chronic_conditions': ['ضغط دم مرتفع'],
              'emergency_contacts': [
                {
                  'name': 'فاطمة بلحاج',
                  'phone': '0555987654',
                  'relationship': 'زوجة'
                }
              ],
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/notifications')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [],
            'meta': {'unread_count': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/prescriptions')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/booking-centers') ||
          path.contains('/api/v1/directory/booking-centers')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'bc-1',
                'name': 'مركز حجز العاصمة',
                'wilaya_code': '16',
                'wilaya': 'الجزائر',
                'commune': 'باب الوادي',
                'phone': '021998877',
                'is_active': true,
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/clinics') ||
          path.contains('/api/v1/directory/clinics')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'cln-1',
                'name': 'عيادة الرحمة',
                'wilaya': 'الجزائر',
                'commune': 'المرادية',
                'phone': '023112233',
                'doctor_count': 5,
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/doctors') ||
          path.contains('/api/v1/directory/doctors')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'doc-1',
                'name': 'د. ياسمين بوعلام',
                'specialty': 'طب الأطفال',
                'clinic_name': 'عيادة الرحمة',
                'wilaya': 'الجزائر',
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/ads')) {
        return http.Response(
          jsonEncode({'status': 'success', 'data': []}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      if (path.contains('/api/v1/patients/share-tokens')) {
        return http.Response(
          jsonEncode({'status': 'success', 'data': []}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }

      return http.Response(
        jsonEncode({'status': 'success', 'data': []}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
  }

  group(
      'Phase B: Multi-Viewport 15-Page Rendering & Overflow Suite (DEC-UI-04)',
      () {
    late ApiClient apiClient;
    late AuthSessionManager sessionManager;

    setUp(() {
      apiClient = ApiClient(httpClient: createMockClient());
      sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
    });

    for (final entry in mandatoryViewports.entries) {
      final viewportName = entry.key;
      final viewportSize = entry.value;

      group(
          'Viewport: $viewportName (${viewportSize.width.toInt()}x${viewportSize.height.toInt()})',
          () {
        testWidgets('P-01 Splash / Launch Shell renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: PatientSplashShell(
              sessionManager: sessionManager,
              onAuthenticated: () {},
              onUnauthenticated: () {},
            ),
          ));
          await tester.pump(const Duration(milliseconds: 700));

          expect(find.byType(PatientSplashShell), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets(
            'P-02 Login Auth Shell renders with 52dp button and zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: PatientAuthShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onLoginSuccess: () {},
              initialMode: AuthMode.login,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(PatientAuthShell), findsOneWidget);
          expect(find.byType(AafiyaButton), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-03 Registration Auth Shell renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: PatientAuthShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onLoginSuccess: () {},
              initialMode: AuthMode.register,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(PatientAuthShell), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets(
            'P-04 Home Dashboard (DEC-UI-01 Luminous White Card) renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await sessionManager.setAuthenticatedUser(
            token: 'valid-token',
            user: testUser,
          );

          await tester.pumpWidget(createHarness(
            child: PatientHomeShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onSignOut: () {},
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(PatientHomeShell), findsOneWidget);
          expect(find.byType(AafiyaShortcutTile), findsNWidgets(4));
          // Verifies restored AafiyaHeroHeader renders properly
          expect(find.byType(AafiyaHeroHeader), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets(
            'P-06 Appointment Detail Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: AppointmentDetailScreen(
              appointment: testAppointment,
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(AppointmentDetailScreen), findsOneWidget);
          expect(find.byType(AafiyaCard), findsWidgets);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-07 Visit Pass Sheet renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: Scaffold(
              body: VisitPassSheet(appointment: testAppointment),
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(VisitPassSheet), findsOneWidget);
          expect(
              find.byKey(const Key('visit_pass_qr_container')), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-08 Doctor Directory Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: DoctorDirectoryScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(DoctorDirectoryScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-09 Prescriptions Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: PrescriptionsScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(PrescriptionsScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-10 Emergency Profile Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: EmergencyProfileScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(EmergencyProfileScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-11 Notifications Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: NotificationsScreen(
              sessionManager: sessionManager,
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(NotificationsScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets(
            'P-12 Booking Center Directory Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: BookingCenterDirectoryScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(BookingCenterDirectoryScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-13 Clinic Directory Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: ClinicDirectoryScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(ClinicDirectoryScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        testWidgets('P-15 Shared Records Screen renders with zero overflows',
            (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: PatientSharedRecordsScreen(apiClient: apiClient),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(PatientSharedRecordsScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });
      });
    }
  });
}
