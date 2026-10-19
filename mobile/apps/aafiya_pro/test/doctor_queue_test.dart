// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/doctor_queue_screen.dart';

void main() {
  final testDoctorUser = const User(
    id: 'user-doc-009',
    name: 'د. أحمد الجزائري',
    email: 'doctor009@aafiya.test',
    phone: '+213551000009',
    roles: [UserRole.doctor],
  );

  final testClinic01 = DoctorClinic(
    id: 'clinic-01',
    name: 'عيادة النور 01',
    address: 'شارع ديدوش، الجزائر',
    isPrimary: true,
    isActive: true,
  );

  final testClinic07 = DoctorClinic(
    id: 'clinic-07',
    name: 'عيادة الشفاء 07',
    address: 'شارع العربي بن مهيدي، وهران',
    isPrimary: false,
    isActive: true,
  );

  Widget createTestWidget({
    required AuthSessionManager sessionManager,
    DoctorDashboardService? dashboardService,
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
      home: Scaffold(
        body: DoctorQueueScreen(
          sessionManager: sessionManager,
          user: testDoctorUser,
          dashboardService: dashboardService,
        ),
      ),
    );
  }

  group('Doctor Live Waiting Room Queue Widget Tests', () {
    testWidgets('1. Loading: displays loading indicator while requests in-flight',
        (tester) async {
      final mockClient = MockClient((request) async {
        // Delay response to inspect loading state
        await Future.delayed(const Duration(milliseconds: 200));
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();
    });

    testWidgets('2. Loaded: renders Waiting Room and Expected Check-In lists with correct data',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];

        if (status == 'attended') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'app-att-001',
                  'booking_reference': 'MS-2026-0001',
                  'status': 'attended',
                  'appointment_date': '2026-09-15',
                  'time_slot': '08:00',
                  'checked_in_at': '2026-09-15T08:05:00.000Z',
                  'checked_in_by': 'د. أحمد الجزائري',
                  'patient': {
                    'id': 'pat-001',
                    'name': 'عمر بن الخطاب',
                    'phone': '+213550000001',
                  },
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': [
                {
                  'id': 'app-conf-002',
                  'booking_reference': 'MS-2026-0002',
                  'status': 'confirmed',
                  'appointment_date': '2026-09-15',
                  'time_slot': '09:00',
                  'patient': {
                    'id': 'pat-002',
                    'name': 'فاطمة الزهراء',
                    'phone': '+213550000002',
                  },
                  'notes': 'متابعة كشف سابقة',
                }
              ],
              'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // 1. Verify Waiting Room Sub-Tab (Default selected)
      expect(find.text('في قاعة الانتظار'), findsOneWidget);
      expect(find.text('المتوقع حضورهم'), findsOneWidget);
      expect(find.text('عمر بن الخطاب'), findsOneWidget);
      expect(find.textContaining('MS-2026-0001'), findsOneWidget);
      expect(find.text('\u200E08:00\u200E'), findsOneWidget);
      expect(find.text('في الانتظار'), findsOneWidget);

      // Verify ZERO attendance action buttons for already attended patients
      expect(find.text('تسجيل حضور'), findsNothing);
      expect(find.text('لم يحضر'), findsNothing);

      // 2. Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('فاطمة الزهراء'), findsOneWidget);
      expect(find.textContaining('MS-2026-0002'), findsOneWidget);
      expect(find.text('\u200E09:00\u200E'), findsOneWidget);
      expect(find.text('متابعة كشف سابقة'), findsOneWidget);

      // Verify Operational Action buttons ARE present for confirmed patients
      expect(find.text('تسجيل حضور'), findsOneWidget);
      expect(find.text('لم يحضر'), findsOneWidget);

      // 3. SEC-01 / SEC-05: Verify ZERO phone numbers exposed on screen
      expect(find.text('+213550000001'), findsNothing);
      expect(find.text('+213550000002'), findsNothing);
    });

    testWidgets('3. Attend Action: confirms dialog and calls /attend endpoint',
        (tester) async {
      bool attendCalled = false;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/attend')) {
          attendCalled = true;
          expect(request.method, 'POST');
          expect(path, '/api/v1/appointments/app-conf-002/attend');

          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل حضور الموعد بنجاح.',
              'data': {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'checked_in_at': '2026-09-15T09:05:00.000Z',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        // Return confirmed item for expected tab
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'confirmed',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'patient': {
                  'id': 'pat-002',
                  'name': 'فاطمة الزهراء',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Navigate to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Tap "تسجيل حضور" button
      await tester.tap(find.text('تسجيل حضور'));
      await tester.pumpAndSettle();

      // Confirmation dialog should appear
      expect(find.text('تأكيد تسجيل الحضور'), findsOneWidget);
      expect(find.text('إلغاء'), findsOneWidget);

      // Confirm attendance
      // Tap the confirm button in the dialog (second "تسجيل حضور" widget)
      final confirmButtons = find.widgetWithText(ElevatedButton, 'تسجيل حضور');
      await tester.tap(confirmButtons.last);
      await tester.pumpAndSettle();

      expect(attendCalled, isTrue);
      // SnackBar success feedback should be displayed
      expect(find.text('تم تسجيل حضور المريض بنجاح ونقله لقاعة الانتظار.'), findsOneWidget);
    });

    testWidgets('4. No-Show Action: confirms dialog with optional reason and calls /no-show',
        (tester) async {
      bool noShowCalled = false;
      String? sentReason;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/no-show')) {
          noShowCalled = true;
          expect(request.method, 'POST');
          expect(path, '/api/v1/appointments/app-conf-002/no-show');

          if (request.body.isNotEmpty) {
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            sentReason = body['reason'] as String?;
          }

          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل عدم حضور المريض للموعد (No-Show).',
              'data': {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'no_show',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-conf-002',
                'booking_reference': 'MS-2026-0002',
                'status': 'confirmed',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'patient': {
                  'id': 'pat-002',
                  'name': 'فاطمة الزهراء',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Navigate to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Tap "لم يحضر" button
      await tester.tap(find.text('لم يحضر'));
      await tester.pumpAndSettle();

      // Dialog should appear
      expect(find.text('تأكيد عدم الحضور (No-Show)'), findsOneWidget);

      // Enter optional reason
      await tester.enterText(find.byType(TextField), 'تأخر لأكثر من ساعة ولم يجب');
      await tester.pumpAndSettle();

      // Tap confirm button in dialog
      final confirmButtons = find.widgetWithText(ElevatedButton, 'لم يحضر');
      await tester.tap(confirmButtons.last);
      await tester.pumpAndSettle();

      expect(noShowCalled, isTrue);
      expect(sentReason, 'تأخر لأكثر من ساعة ولم يجب');
      expect(find.text('تم تسجيل عدم حضور المريض للموعد (No-Show).'), findsOneWidget);
    });

    testWidgets('5. Empty States: renders AafiyaEmptyView when queues are empty',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Waiting Room Empty View
      expect(find.text('لا يوجد أي مريض في قاعة الانتظار حالياً.'), findsOneWidget);

      // Switch to Expected Check-In Tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Expected Queue Empty View
      expect(find.text('لا توجد مواعيد مؤكدة أخرى متوقعة اليوم.'), findsOneWidget);
    });

    testWidgets('6. Clinic Context Switch & Stale Response Protection',
        (tester) async {
      String lastHeader = '';

      final mockClient = MockClient((request) async {
        lastHeader = request.headers['X-Clinic-ID'] ?? '';
        final isClinic07 = lastHeader == 'clinic-07';

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': isClinic07 ? 'app-clinic-07' : 'app-clinic-01',
                'booking_reference': isClinic07 ? 'MS-CLINIC-07' : 'MS-CLINIC-01',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '10:00',
                'patient': {
                  'id': 'pat-007',
                  'name': isClinic07 ? 'مريض عيادة وهران' : 'مريض عيادة الجزائر',
                },
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 1},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01, testClinic07]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      expect(find.text('مريض عيادة الجزائر'), findsOneWidget);

      // Switch to Clinic 07
      sessionManager.switchActiveClinic('clinic-07');
      await tester.pumpAndSettle();

      expect(lastHeader, 'clinic-07');
      expect(find.text('مريض عيادة وهران'), findsOneWidget);
      expect(find.text('مريض عيادة الجزائر'), findsNothing);
    });

    testWidgets('7. Trilingual Localization: renders properly in English and French',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      // Test English (LTR)
      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        locale: const Locale('en'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('In Waiting Room'), findsNWidgets(2));
      expect(find.text('Expected Arrivals'), findsOneWidget);
      expect(find.text('No patients currently in the waiting room.'), findsOneWidget);

      // Test French (LTR)
      await tester.pumpWidget(createTestWidget(
        sessionManager: sessionManager,
        locale: const Locale('fr'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('En salle d\'attente'), findsNWidgets(2));
      expect(find.text('Arrivées attendues'), findsOneWidget);
      expect(find.text('Aucun patient en salle d’attente actuellement.'), findsOneWidget);
    });
  });

  group('DA-03: Doctor Queue Statistics Synchronization Tests', () {
    testWidgets('DA-03.1: Sub-tab badge displays authoritative total when total exceeds page size',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];

        if (status == 'attended') {
          // 15 items in page 1, but total is 25
          return http.Response(
            jsonEncode({
              'data': List.generate(
                15,
                (i) => {
                  'id': 'app-att-$i',
                  'booking_reference': 'MS-ATT-$i',
                  'status': 'attended',
                  'appointment_date': '2026-09-15',
                  'time_slot': '08:00',
                  'patient': {
                    'id': 'pat-$i',
                    'name': 'مريض في الانتظار $i',
                  },
                },
              ),
              'meta': {
                'current_page': 1,
                'last_page': 2,
                'per_page': 15,
                'total': 25,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (status == 'confirmed') {
          // 15 items in page 1, but total is 42
          return http.Response(
            jsonEncode({
              'data': List.generate(
                15,
                (i) => {
                  'id': 'app-conf-$i',
                  'booking_reference': 'MS-CONF-$i',
                  'status': 'confirmed',
                  'appointment_date': '2026-09-15',
                  'time_slot': '09:00',
                  'patient': {
                    'id': 'pat-conf-$i',
                    'name': 'مريض متوقع $i',
                  },
                },
              ),
              'meta': {
                'current_page': 1,
                'last_page': 3,
                'per_page': 15,
                'total': 42,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Waiting Room badge must reflect authoritative total (25), not items.length (15)
      expect(find.text('\u200E25\u200E'), findsOneWidget);

      // Expected Arrivals badge must reflect authoritative total (42), not items.length (15)
      expect(find.text('\u200E42\u200E'), findsOneWidget);
    });

    testWidgets('DA-03.2: Infinite scroll pagination deduplicates items by ID and retains authoritative total',
        (tester) async {
      final mockClient = MockClient((request) async {
        final status = request.url.queryParameters['status'];
        final page = int.tryParse(request.url.queryParameters['page'] ?? '1') ?? 1;

        if (status == 'attended') {
          if (page == 1) {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'app-1',
                    'booking_reference': 'REF-1',
                    'status': 'attended',
                    'appointment_date': '2026-09-15',
                    'time_slot': '08:00',
                    'patient': {'id': 'p-1', 'name': 'مريض 1'},
                  },
                  {
                    'id': 'app-2',
                    'booking_reference': 'REF-2',
                    'status': 'attended',
                    'appointment_date': '2026-09-15',
                    'time_slot': '08:30',
                    'patient': {'id': 'p-2', 'name': 'مريض 2'},
                  },
                ],
                'meta': {
                  'current_page': 1,
                  'last_page': 2,
                  'per_page': 2,
                  'total': 3,
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          } else {
            // Page 2 contains app-2 (overlapping duplicate) and app-3 (new)
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id': 'app-2',
                    'booking_reference': 'REF-2',
                    'status': 'attended',
                    'appointment_date': '2026-09-15',
                    'time_slot': '08:30',
                    'patient': {'id': 'p-2', 'name': 'مريض 2'},
                  },
                  {
                    'id': 'app-3',
                    'booking_reference': 'REF-3',
                    'status': 'attended',
                    'appointment_date': '2026-09-15',
                    'time_slot': '09:00',
                    'patient': {'id': 'p-3', 'name': 'مريض 3'},
                  },
                ],
                'meta': {
                  'current_page': 2,
                  'last_page': 2,
                  'per_page': 2,
                  'total': 3,
                },
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }

        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      expect(find.text('مريض 1'), findsOneWidget);
      expect(find.text('مريض 2'), findsOneWidget);
      expect(find.text('\u200E3\u200E'), findsOneWidget); // badge total = 3

      // Trigger scroll to load page 2
      final scrollableFinder = find.byType(Scrollable);
      await tester.scrollUntilVisible(
        find.text('مريض 2'),
        100.0,
        scrollable: scrollableFinder,
      );
      await tester.pumpAndSettle();

      // If duplicate was NOT prevented, 'مريض 2' would have appeared 2 times.
      // With deduplication, 'مريض 2' appears exactly once.
      expect(find.text('مريض 2'), findsOneWidget);
      expect(find.text('\u200E3\u200E'), findsOneWidget);
    });

    testWidgets('DA-03.3: Attend action authoritatively re-syncs queue statistics for both tabs',
        (tester) async {
      int attendCallCount = 0;
      bool attended = false;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/attend')) {
          attended = true;
          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل الحضور بنجاح.',
              'data': {
                'id': 'app-100',
                'status': 'attended',
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
              'data': attended
                  ? []
                  : [
                      {
                        'id': 'app-100',
                        'booking_reference': 'CONF-100',
                        'status': 'confirmed',
                        'appointment_date': '2026-09-15',
                        'time_slot': '10:00',
                        'patient': {'id': 'p-100', 'name': 'مريض للتأكيد'},
                      }
                    ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 15,
                'total': attended ? 0 : 1,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (status == 'attended') {
          attendCallCount++;
          return http.Response(
            jsonEncode({
              'data': attended
                  ? [
                      {
                        'id': 'app-100',
                        'booking_reference': 'CONF-100',
                        'status': 'attended',
                        'appointment_date': '2026-09-15',
                        'time_slot': '10:00',
                        'patient': {'id': 'p-100', 'name': 'مريض للتأكيد'},
                      }
                    ]
                  : [],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 15,
                'total': attended ? 1 : 0,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response('{}', 404);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Before attendance: Waiting Room = 0, Expected = 1
      expect(find.text('\u200E0\u200E'), findsOneWidget);
      expect(find.text('\u200E1\u200E'), findsOneWidget);

      // Switch to Expected tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      // Perform attend
      await tester.tap(find.text('تسجيل حضور'));
      await tester.pumpAndSettle();

      final confirmButton = find.widgetWithText(ElevatedButton, 'تسجيل حضور').last;
      await tester.tap(confirmButton);
      await tester.pumpAndSettle();

      expect(attended, isTrue);
      expect(attendCallCount, greaterThan(0));

      // After attendance: Expected becomes 0, Waiting Room becomes 1
      expect(find.text('\u200E0\u200E'), findsOneWidget);
      expect(find.text('\u200E1\u200E'), findsOneWidget);
    });

    testWidgets('DA-03.4: No-show action authoritatively re-syncs expected queue statistics',
        (tester) async {
      bool noShowRecorded = false;

      final mockClient = MockClient((request) async {
        final path = request.url.path;

        if (path.contains('/no-show')) {
          noShowRecorded = true;
          return http.Response(
            jsonEncode({
              'message': 'تم تسجيل عدم الحضور.',
              'data': {'id': 'app-200', 'status': 'no_show'},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        final status = request.url.queryParameters['status'];
        if (status == 'confirmed') {
          return http.Response(
            jsonEncode({
              'data': noShowRecorded
                  ? []
                  : [
                      {
                        'id': 'app-200',
                        'booking_reference': 'CONF-200',
                        'status': 'confirmed',
                        'appointment_date': '2026-09-15',
                        'time_slot': '11:00',
                        'patient': {'id': 'p-200', 'name': 'مريض غائب'},
                      }
                    ],
              'meta': {
                'current_page': 1,
                'last_page': 1,
                'per_page': 15,
                'total': noShowRecorded ? 0 : 1,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({
            'data': [],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 0},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Navigate to expected tab
      await tester.tap(find.text('المتوقع حضورهم'));
      await tester.pumpAndSettle();

      expect(find.text('\u200E1\u200E'), findsOneWidget); // Expected total = 1

      // Tap no-show
      await tester.tap(find.text('لم يحضر'));
      await tester.pumpAndSettle();

      final confirmButton = find.widgetWithText(ElevatedButton, 'لم يحضر').last;
      await tester.tap(confirmButton);
      await tester.pumpAndSettle();

      expect(noShowRecorded, isTrue);

      // Now Expected total becomes 0
      expect(find.text('\u200E0\u200E'), findsNWidgets(2)); // Both tabs are 0
    });

    testWidgets('DA-03.5: API failure on initial load displays "-" indicator rather than misleading 0 and recovers on retry',
        (tester) async {
      bool shouldFail = true;

      final mockClient = MockClient((request) async {
        if (shouldFail) {
          return http.Response(
            jsonEncode({'message': 'خطأ في الخادم أو انقطاع الاتصال.'}),
            500,
            headers: {'content-type': 'application/json'},
          );
        }

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'app-recovered',
                'booking_reference': 'REF-REC',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '08:00',
                'patient': {'id': 'p-rec', 'name': 'مريض بعد التعافي'},
              }
            ],
            'meta': {'current_page': 1, 'last_page': 1, 'per_page': 15, 'total': 7},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // During failure, badges show '-' rather than misleading '0'
      expect(find.text('-'), findsNWidgets(2));
      expect(find.text('خطأ في الخادم أو انقطاع الاتصال.'), findsOneWidget);

      // Retry
      shouldFail = false;
      await tester.tap(find.text('إعادة المحاولة'));
      await tester.pumpAndSettle();

      // Now badges recover and reflect authoritative total 7
      expect(find.text('\u200E7\u200E'), findsNWidgets(2));
      expect(find.text('مريض بعد التعافي'), findsOneWidget);
    });

    testWidgets('DA-03.6: Active clinic switch re-syncs queue statistics to target clinic without stale overlap',
        (tester) async {
      final mockClient = MockClient((request) async {
        final clinicHeader = request.headers['X-Clinic-ID'];
        final isClinic07 = clinicHeader == 'clinic-07';

        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': isClinic07 ? 'app-oran' : 'app-algiers',
                'booking_reference': isClinic07 ? 'ORAN-01' : 'ALG-01',
                'status': 'attended',
                'appointment_date': '2026-09-15',
                'time_slot': '09:00',
                'patient': {
                  'id': isClinic07 ? 'p-oran' : 'p-alg',
                  'name': isClinic07 ? 'مريض وهران' : 'مريض الجزائر',
                },
              }
            ],
            'meta': {
              'current_page': 1,
              'last_page': 1,
              'per_page': 15,
              'total': isClinic07 ? 3 : 11,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        tokenStorage: InMemoryTokenStorage('test-token'),
      );
      final sessionManager = AuthSessionManager(
        tokenStorage: InMemoryTokenStorage('test-token'),
        apiClient: apiClient,
      );
      sessionManager.setAuthorizedClinics([testClinic01, testClinic07]);

      await tester.pumpWidget(createTestWidget(sessionManager: sessionManager));
      await tester.pumpAndSettle();

      // Clinic 01 initial state: total = 11
      expect(find.text('\u200E11\u200E'), findsNWidgets(2));
      expect(find.text('مريض الجزائر'), findsOneWidget);

      // Switch to Clinic 07
      sessionManager.switchActiveClinic('clinic-07');
      await tester.pumpAndSettle();

      // Clinic 07 state: total = 3
      expect(find.text('\u200E3\u200E'), findsNWidgets(2));
      expect(find.text('مريض وهران'), findsOneWidget);
      expect(find.text('مريض الجزائر'), findsNothing);
    });
  });
}
