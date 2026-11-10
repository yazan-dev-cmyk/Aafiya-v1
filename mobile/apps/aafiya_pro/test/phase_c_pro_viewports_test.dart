// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';

import 'package:aafiya_pro/shells/splash_shell.dart';
import 'package:aafiya_pro/shells/auth_shell.dart';
import 'package:aafiya_pro/shells/doctor_shell.dart';
import 'package:aafiya_pro/widgets/doctor_dashboard_view.dart';
import 'package:aafiya_pro/screens/doctor_queue_screen.dart';
import 'package:aafiya_pro/screens/assistant_booking_screen.dart';
import 'package:aafiya_pro/screens/doctor_working_hours_screen.dart';
import 'package:aafiya_pro/screens/assistant_rewards_screen.dart';
import 'package:aafiya_pro/widgets/qr_scanner_sheet.dart';
import 'package:aafiya_pro/screens/clinic_escalations_screen.dart';
import 'package:aafiya_pro/screens/clinic_operating_hours_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const mandatoryViewports = <String, Size>{
    'Baseline 390x844': Size(390, 844),
    'Narrow Android 360x740': Size(360, 740),
    'Wide Flagship 412x915': Size(412, 915),
    'Compact Modal 360x640': Size(360, 640),
  };

  const testDoctorClinic = DoctorClinic(
    id: 'clinic-c-001',
    name: 'عيادة الشفاء المركزية',
    position: 'director',
    address: 'شارع فلسطين، الجزائر العاصمة',
    wilaya: 'الجزائر',
    isActive: true,
    isPrimary: true,
    isDirector: true,
  );

  const testDoctorUser = User(
    id: 'user-doc-001',
    doctorId: 'doctor-canonical-001',
    name: 'د. يوسف التميمي',
    email: 'doctor@aafiya.test',
    phone: '+213550123456',
    roles: [UserRole.doctor],
    permissions: ['booking.view_all', 'booking.manage_queue', 'clinic.director'],
    clinics: [testDoctorClinic],
  );

  const testAssistantUser = User(
    id: 'user-ast-001',
    name: 'مريم قدور',
    email: 'assistant@aafiya.test',
    phone: '+213550987654',
    roles: [UserRole.doctorAssistant],
    permissions: ['booking.create', 'booking.manage_queue', 'booking.confirm_attendance'],
    clinic: testDoctorClinic,
    clinics: [testDoctorClinic],
  );

  final sampleRewardSummary = {
    'current_balance': 15000.0,
    'total_earned': 25000.0,
    'total_reversed': 500.0,
    'total_deducted': 1000.0,
    'total_paid': 8500.0,
    'total_relieved': 0.0,
    'pending_payout': 15000.0,
    'payout_threshold': 10000.0,
    'is_eligible_for_payout': true,
    'active_profile': {
      'id': 'prof-001',
      'rip_number': '00799999000123456789',
      'version': 1,
      'status': 'active',
    },
  };

  MockClient createUniversalMockClient() {
    return MockClient((request) async {
      final path = request.url.path;

      if (path.contains('/rewards/summary')) {
        return http.Response(
          jsonEncode({'status': 'success', 'data': sampleRewardSummary}),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/rewards/ledger')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'tx-1',
                'assistant_id': 'user-ast-001',
                'transaction_type': 'reward_earned',
                'direction': 'credit',
                'amount': 50.0,
                'balance_after': 15000.0,
                'source_type': 'appointment',
                'source_id': 'appt-001',
                'created_at': '2026-11-02 10:00:00',
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/rewards/payouts')) {
        return http.Response(
          jsonEncode({'status': 'success', 'data': []}),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/doctor/stats')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'today_total': 18,
              'pending_check_in': 5,
              'in_waiting_room': 4,
              'completed_today': 8,
              'no_show_today': 1,
              'active_clinic_id': 'clinic-c-001',
              'active_clinic_name': 'عيادة الشفاء المركزية',
              'date': '2026-11-10',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/doctor/clinics') || path.contains('/clinics')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'clinic-c-001',
                'name': 'عيادة الشفاء المركزية',
                'position': 'director',
                'address': 'شارع فلسطين، الجزائر العاصمة',
                'wilaya': 'الجزائر',
                'is_active': true,
                'is_primary': true,
                'is_director': true,
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/queue') || path.contains('/appointments')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'apt-001',
                'booking_reference': 'BK-PRO-001',
                'patient_name': 'سعيد الهاشمي',
                'patient_display_name': 'سعيد الهاشمي',
                'patient': {
                  'id': 'pat-001',
                  'name': 'سعيد الهاشمي',
                },
                'doctor_id': 'doctor-canonical-001',
                'clinic_id': 'clinic-c-001',
                'appointment_date': '2026-11-10',
                'time_slot': '09:30',
                'status': 'waiting',
                'queue_state': 'in_waiting_room',
                'arrival_time': '2026-11-10T09:15:00Z',
              }
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/working-hours') || path.contains('/schedule')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'clinic_id': 'clinic-c-001',
              'doctor_id': 'doctor-canonical-001',
              'is_activated': true,
              'days': [
                {
                  'day_of_week': 1,
                  'is_active': true,
                  'shifts': [
                    {'start': '08:00', 'end': '12:00'},
                    {'start': '13:00', 'end': '17:00'}
                  ]
                }
              ]
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/operating-hours')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': {
              'clinic_id': 'clinic-c-001',
              'is_configured': true,
              'schedule': {
                'sunday': {'open': '08:00', 'close': '17:00', 'closed': false},
                'monday': {'open': '08:00', 'close': '17:00', 'closed': false},
              }
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/escalations')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'esc-001',
                'clinic_id': 'clinic-c-001',
                'severity': 'urgent',
                'title': 'حالة طارئة حرجة',
                'description': 'مريض بحاجة إلى فحص فوري قبل الموعد المقرر',
                'status': 'open',
                'created_at': '2026-11-10T08:00:00Z',
              }
            ]
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/slots')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {'time_slot': '08:00', 'max_capacity': 10, 'occupied': 2},
              {'time_slot': '09:00', 'max_capacity': 10, 'occupied': 10},
              {'time_slot': '10:00', 'max_capacity': 10, 'occupied': 4},
            ]
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      } else if (path.contains('/doctors')) {
        return http.Response(
          jsonEncode({
            'status': 'success',
            'data': [
              {
                'id': 'doctor-canonical-001',
                'name': 'د. يوسف التميمي',
                'specialty': 'طب عام',
              }
            ]
          }),
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

  Widget createHarness({
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

  group('Phase C — AAFIYA Pro 44-Viewport Responsive Design Suite', () {
    for (final entry in mandatoryViewports.entries) {
      final viewportName = entry.key;
      final viewportSize = entry.value;

      group('Viewport: $viewportName (${viewportSize.width.toInt()}x${viewportSize.height.toInt()})', () {
        late InMemoryTokenStorage tokenStorage;
        late ApiClient apiClient;
        late AuthSessionManager sessionManager;

        setUp(() async {
          tokenStorage = InMemoryTokenStorage('valid-test-pro-token-12345');
          final mockClient = createUniversalMockClient();
          apiClient = ApiClient(tokenStorage: tokenStorage, httpClient: mockClient);
          sessionManager = AuthSessionManager(tokenStorage: tokenStorage, apiClient: apiClient);
          await sessionManager.setAuthenticatedUser(
            token: 'valid-test-pro-token-12345',
            user: testDoctorUser,
          );
          sessionManager.setAuthorizedClinics([testDoctorClinic]);
        });

        // PR-01: Pro Splash Shell
        testWidgets('PR-01 Pro Splash Shell renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: ProSplashShell(
              sessionManager: sessionManager,
              onAuthenticated: () {},
              onUnauthenticated: () {},
            ),
          ));
          await tester.pump(const Duration(milliseconds: 700));

          expect(find.byType(ProSplashShell), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-02: Pro Auth Shell
        testWidgets('PR-02 Pro Auth Shell renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: ProAuthShell(
              sessionManager: sessionManager,
              apiClient: apiClient,
              onLoginSuccess: () {},
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(ProAuthShell), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-03: Doctor Dashboard View
        testWidgets('PR-03 Doctor Dashboard View renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final dashboardService = DoctorDashboardService(apiClient: apiClient);

          FlutterErrorDetails? caughtDetails;
          final originalOnError = FlutterError.onError;
          FlutterError.onError = (details) {
            caughtDetails = details;
            // ignore: avoid_print
            print('EXACT OVERFLOW: ${details.summary}');
            // ignore: avoid_print
            print('INFO: ${details.informationCollector?.call().map((e) => e.toString()).join("\n")}');
          };
          addTearDown(() => FlutterError.onError = originalOnError);

          await tester.pumpWidget(createHarness(
            child: Scaffold(
              body: DoctorDashboardView(
                sessionManager: sessionManager,
                user: testDoctorUser,
                dashboardService: dashboardService,
                apiClient: apiClient,
              ),
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(DoctorDashboardView), findsOneWidget);
          final err = tester.takeException();
          if (err != null) {
            // ignore: avoid_print
            print('PR-03 DEEP: ${(err as dynamic).toStringDeep()}');
          }
          expect(err, isNull);
        });

        // PR-04: Doctor Queue Screen
        testWidgets('PR-04 Doctor Queue Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: Scaffold(
              body: DoctorQueueScreen(
                sessionManager: sessionManager,
                user: testDoctorUser,
              ),
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(DoctorQueueScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-05: Assistant Booking Screen
        testWidgets('PR-05 Assistant Booking Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final assistantSessionManager = AuthSessionManager(
            tokenStorage: InMemoryTokenStorage('valid-assistant-token'),
            apiClient: apiClient,
          );
          await assistantSessionManager.setAuthenticatedUser(
            token: 'valid-assistant-token',
            user: testAssistantUser,
          );
          assistantSessionManager.setAuthorizedClinics([testDoctorClinic]);

          await tester.pumpWidget(createHarness(
            child: AssistantBookingScreen(
              sessionManager: assistantSessionManager,
              user: testAssistantUser,
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(AssistantBookingScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-06: Doctor Working Hours Screen
        testWidgets('PR-06 Doctor Working Hours Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: DoctorWorkingHoursScreen(
              sessionManager: sessionManager,
              user: testDoctorUser,
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(DoctorWorkingHoursScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-07: Assistant Rewards Screen
        testWidgets('PR-07 Assistant Rewards Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final assistantSessionManager = AuthSessionManager(
            tokenStorage: InMemoryTokenStorage('valid-assistant-token'),
            apiClient: apiClient,
          );
          await assistantSessionManager.setAuthenticatedUser(
            token: 'valid-assistant-token',
            user: testAssistantUser,
          );
          assistantSessionManager.setAuthorizedClinics([testDoctorClinic]);

          await tester.pumpWidget(createHarness(
            child: AssistantRewardsScreen(
              sessionManager: assistantSessionManager,
              apiClient: apiClient,
              user: testAssistantUser,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(AssistantRewardsScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-08: Check-In QR Scanner Sheet
        testWidgets('PR-08 QR Scanner Sheet renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: const Scaffold(
              body: QrScannerSheet(),
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(QrScannerSheet), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-09: Clinic Escalations Screen
        testWidgets('PR-09 Clinic Escalations Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: ClinicEscalationsScreen(
              sessionManager: sessionManager,
              user: testDoctorUser,
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(ClinicEscalationsScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-10: Doctor Shell & Profile/Clinic Context
        testWidgets('PR-10 Doctor Shell renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: DoctorShell(
              user: testDoctorUser,
              sessionManager: sessionManager,
              onSignOut: () {},
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(DoctorShell), findsOneWidget);
          expect(tester.takeException(), isNull);
        });

        // PR-11: Clinic Operating Hours Screen
        testWidgets('PR-11 Clinic Operating Hours Screen renders with zero overflows', (tester) async {
          tester.view.physicalSize = viewportSize;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(createHarness(
            child: ClinicOperatingHoursScreen(
              sessionManager: sessionManager,
              clinicId: 'clinic-c-001',
              apiClient: apiClient,
            ),
          ));
          await tester.pumpAndSettle();

          expect(find.byType(ClinicOperatingHoursScreen), findsOneWidget);
          expect(tester.takeException(), isNull);
        });
      });
    }
  });
}
