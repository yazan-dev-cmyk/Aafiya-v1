// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/doctor_working_hours_screen.dart';
import 'package:aafiya_pro/widgets/schedule_activation_dialog.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testClinic = DoctorClinic(
    id: 'clinic-hours-01',
    name: 'مركز النور التخصصي',
    position: 'doctor',
    isActive: true,
    isPrimary: true,
  );

  const testDoctor = User(
    id: 'user-uuid-001',
    doctorId: 'doctor-canonical-uuid-999',
    name: 'د. يوسف التميمي',
    email: 'doctor@aafiya.test',
    phone: '+213555001122',
    roles: [UserRole.doctor],
    permissions: ['booking.view_all'],
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

  Map<String, dynamic> createSampleScheduleJson({
    bool isActivated = false,
    String doctorId = 'doctor-canonical-uuid-999',
  }) {
    return {
      'status': 'success',
      'data': {
        'clinic_id': 'clinic-hours-01',
        'doctor_id': doctorId,
        'is_activated': isActivated,
        'activated_at': isActivated ? '2026-10-17T10:00:00Z' : null,
        'schedule_version': 1,
        'days': [
          {'day_of_week': 0, 'is_closed': true, 'slots': []},
          {
            'day_of_week': 1,
            'is_closed': false,
            'slots': ['08:00', '09:00', '10:00'],
          },
          {
            'day_of_week': 2,
            'is_closed': false,
            'slots': ['08:00', '09:00'],
          },
          {'day_of_week': 3, 'is_closed': true, 'slots': []},
          {'day_of_week': 4, 'is_closed': true, 'slots': []},
          {'day_of_week': 5, 'is_closed': true, 'slots': []},
          {'day_of_week': 6, 'is_closed': true, 'slots': []},
        ],
      },
    };
  }

  group('Doctor Working Hours — DTO & Invariants', () {
    test(
        'Allowed slots invariant strictly contains 08:00..16:00 and excludes 17:00',
        () {
      expect(kAllowedHourlySlots.length, 9);
      expect(kAllowedHourlySlots.first, '08:00');
      expect(kAllowedHourlySlots.last, '16:00');
      expect(kAllowedHourlySlots.contains('17:00'), isFalse);
    });

    test(
        'Canonical weekdays ordering has exactly 7 days from 0 (Saturday) to 6 (Friday)',
        () {
      expect(kWeekdaysOrder, [0, 1, 2, 3, 4, 5, 6]);
    });

    test(
        'DoctorWorkingHoursData.defaultDays creates 7 days with weekend closed',
        () {
      final days = DoctorWorkingHoursData.defaultDays();
      expect(days.length, 7);
      expect(days[0].dayOfWeek, 0); // Saturday
      expect(days[0].isClosed, isTrue);
      expect(days[0].slots, isEmpty);

      expect(days[1].dayOfWeek, 1); // Sunday
      expect(days[1].isClosed, isFalse);
      expect(days[1].slots, contains('08:00'));
      expect(days[1].slots, contains('16:00'));

      expect(days[6].dayOfWeek, 6); // Friday
      expect(days[6].isClosed, isTrue);
    });

    test('Correctly serializes and deserializes DoctorWorkingHoursData', () {
      final sample = createSampleScheduleJson(isActivated: true);
      final model = DoctorWorkingHoursData.fromJson(
          sample['data'] as Map<String, dynamic>);

      expect(model.clinicId, 'clinic-hours-01');
      expect(model.doctorId, 'doctor-canonical-uuid-999');
      expect(model.isActivated, isTrue);
      expect(model.activatedAt, isNotNull);
      expect(model.days.length, 7);
      expect(model.days[1].slots, ['08:00', '09:00', '10:00']);

      final serialized = model.toJson();
      expect(serialized['clinic_id'], 'clinic-hours-01');
      expect(serialized['is_activated'], isTrue);
      expect((serialized['days'] as List).length, 7);
    });
  });

  group('DoctorWorkingHoursService — HTTP Mock Client', () {
    test(
        'getSchedule sends X-Clinic-ID header and returns DoctorWorkingHoursData',
        () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path,
            contains('/doctors/doctor-canonical-uuid-999/working-hours'));
        expect(request.url.path, isNot(contains('user-uuid-001')));
        expect(request.headers['X-Clinic-ID'], 'clinic-hours-01');

        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: false)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorWorkingHoursService(apiClient: apiClient);

      final result = await service.getSchedule(
        doctorId: 'doctor-canonical-uuid-999',
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
      final data = (result as ApiSuccess<DoctorWorkingHoursData>).data;
      expect(data.clinicId, 'clinic-hours-01');
      expect(data.isActivated, isFalse);
    });

    test('saveDraft sends PUT request with 7 days and handles success',
        () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.path,
            contains('/doctors/doctor-canonical-uuid-999/working-hours'));
        expect(request.url.path, isNot(contains('user-uuid-001')));
        expect(request.headers['X-Clinic-ID'], 'clinic-hours-01');

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body.containsKey('days'), isTrue);

        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: false)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorWorkingHoursService(apiClient: apiClient);

      final result = await service.saveDraft(
        doctorId: 'doctor-canonical-uuid-999',
        days: DoctorWorkingHoursData.defaultDays(),
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
    });

    test('saveDraft handles SCHEDULE_CONTRACTION_CONFLICT 422 correctly',
        () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message':
                'تعذر حفظ المسودة: توجد مواعيد نشطة في الساعات المحذوفة.',
            'error_code': 'SCHEDULE_CONTRACTION_CONFLICT',
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorWorkingHoursService(apiClient: apiClient);

      final result = await service.saveDraft(
        doctorId: 'doctor-canonical-uuid-999',
        days: DoctorWorkingHoursData.defaultDays(),
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiFailure<DoctorWorkingHoursData>>());
      final failure = result as ApiFailure<DoctorWorkingHoursData>;
      expect(failure.exception.message, contains('تعذر حفظ المسودة'));
    });

    test(
        'activateSchedule sends POST to activate endpoint and receives locked schedule',
        () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(
            request.url.path,
            contains(
                '/doctors/doctor-canonical-uuid-999/working-hours/activate'));
        expect(request.url.path, isNot(contains('user-uuid-001')));
        expect(request.headers['X-Clinic-ID'], 'clinic-hours-01');

        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorWorkingHoursService(apiClient: apiClient);

      final result = await service.activateSchedule(
        doctorId: 'doctor-canonical-uuid-999',
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
      final data = (result as ApiSuccess<DoctorWorkingHoursData>).data;
      expect(data.isActivated, isTrue);
    });
  });

  group('DoctorWorkingHoursScreen — Widget Tests', () {
    testWidgets('Renders draft schedule with 7 weekdays and action buttons',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: false)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check weekdays rendered (Arabic locale)
      expect(find.text('السبت'), findsOneWidget);
      expect(find.text('الأحد'), findsOneWidget);
      expect(find.text('الاثنين'), findsOneWidget);

      // Check draft banner
      expect(find.textContaining('مسودة غير مفعلة'), findsOneWidget);

      // Check action buttons in bottom navigation bar
      expect(find.byKey(const Key('save_draft_button')), findsOneWidget);
      expect(find.byKey(const Key('activate_schedule_button')), findsOneWidget);
    });

    testWidgets('Toggling slot chips modifies day schedule', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: false)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Find Sunday (day 1) slot 11:00 (which is currently unselected in sample)
      final sundaySlot11Finder = find.byKey(const Key('slot_1_11:00'));
      expect(sundaySlot11Finder, findsOneWidget);

      // Tap slot 11:00 to toggle it on
      await tester.tap(sundaySlot11Finder);
      await tester.pumpAndSettle();

      // Sunday slot 11:00 should now be selected
      final chip = tester.widget<FilterChip>(sundaySlot11Finder);
      expect(chip.selected, isTrue);
    });

    testWidgets(
        'Activation dialog requires mandatory checkbox before confirming',
        (tester) async {
      bool onConfirmCalled = false;

      final sampleDays = DoctorWorkingHoursData.defaultDays();

      await tester.pumpWidget(
        createTestWidget(
          child: Builder(
            builder: (ctx) => ElevatedButton(
              onPressed: () {
                ScheduleActivationDialog.show(
                  ctx,
                  days: sampleDays,
                  onConfirm: () async {
                    onConfirmCalled = true;
                  },
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      // Check dialog elements
      expect(find.textContaining('المراجعة النهائية والتفعيل النهائي'),
          findsOneWidget);
      expect(find.textContaining('تحذير حرج: تفعيل جدول ساعات العمل'),
          findsOneWidget);

      final confirmBtnFinder =
          find.byKey(const Key('confirm_activation_button'));
      final checkboxFinder =
          find.byKey(const Key('activation_irreversible_checkbox'));

      expect(confirmBtnFinder, findsOneWidget);
      expect(checkboxFinder, findsOneWidget);

      // Button is disabled when checkbox is unchecked
      final initialButton = tester.widget<ElevatedButton>(confirmBtnFinder);
      expect(initialButton.onPressed, isNull);

      // Check the checkbox
      await tester.ensureVisible(checkboxFinder);
      await tester.tap(checkboxFinder);
      await tester.pumpAndSettle();

      // Button is now enabled
      final enabledButton = tester.widget<ElevatedButton>(confirmBtnFinder);
      expect(enabledButton.onPressed, isNotNull);

      // Tap confirm button
      await tester.tap(confirmBtnFinder);
      await tester.pumpAndSettle();

      expect(onConfirmCalled, isTrue);
      // Dialog should have closed
      expect(find.byType(ScheduleActivationDialog), findsNothing);
    });

    testWidgets(
        'Renders permanently locked UI when schedule is already activated',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check locked banner
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(find.textContaining('تم قفل الجدول نهائياً في هذا المركز الطبي'),
          findsOneWidget);

      // Action buttons in bottom bar should be absent
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);

      // Switches are disabled
      final switches = tester.widgetList<Switch>(find.byType(Switch));
      for (final s in switches) {
        expect(s.onChanged, isNull);
      }
    });

    testWidgets('Shows error and blocks API requests when User has no doctorId',
        (tester) async {
      int requestCount = 0;
      final mockClient = MockClient((request) async {
        requestCount++;
        return http.Response('{}', 500);
      });

      const userWithoutDoctor = User(
        id: 'user-no-doc-01',
        name: 'مستخدم بلا طبيب',
        email: 'nodoc@aafiya.test',
        roles: [UserRole.doctor],
        clinics: [testClinic],
        // doctorId is absent / null
      );

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: userWithoutDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(requestCount, 0); // Strictly 0 network requests
      expect(find.byType(AafiyaErrorView), findsOneWidget);
      expect(find.textContaining('معرف الطبيب غير متوفر في ملف الحساب'),
          findsOneWidget);
    });
  });

  group('Doctor Working Hours — Permanent Lock Lifecycle & Session Durability (FIND-04)', () {
    testWidgets(
        '1. Level 1 (Widget rebuild & In-situ State): Locked schedule disables all controls and action buttons',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('test-token-01'),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Check locked banner & invariants
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);

      // Rebuild widget (Level 1: Rebuild)
      await tester.pump();
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
    });

    testWidgets(
        '2. Level 2 (Navigation Away & Pop Return): Locked state remains intact upon route return',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('test-token-01'),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('ar'),
          supportedLocales: AafiyaSupportedLocale.supportedLocales,
          localizationsDelegates: const [
            AafiyaLocalizationsDelegate(),
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: AafiyaTheme.lightTheme,
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('open_hours'),
                  onPressed: () {
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => DoctorWorkingHoursScreen(
                        sessionManager: sessionManager,
                        user: testDoctor,
                        clinicId: 'clinic-hours-01',
                        apiClient: apiClient,
                      ),
                    ));
                  },
                  child: const Text('افتح مواعيد العمل'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Open screen
      await tester.tap(find.byKey(const Key('open_hours')));
      await tester.pumpAndSettle();
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);

      // Push secondary screen on top (Navigate away)
      final navigator = tester.state<NavigatorState>(find.byType(Navigator));
      navigator.push(MaterialPageRoute(
        builder: (_) => const Scaffold(body: Text('شاشة فرعية مؤقتة')),
      ));
      await tester.pumpAndSettle();
      expect(find.text('شاشة فرعية مؤقتة'), findsOneWidget);

      // Pop back to working hours
      navigator.pop();
      await tester.pumpAndSettle();

      // Verify lock persists after returning
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);
    });

    testWidgets(
        '3. Level 3 (Widget State Recreation): Complete disposal and re-initialization reloads locked state from backend',
        (tester) async {
      int requestCount = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/working-hours')) {
          requestCount++;
          return http.Response(
            jsonEncode(createSampleScheduleJson(isActivated: true)),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('test-token-01'),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      // First mount
      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(requestCount, 1);

      // Dispose state completely
      await tester.pumpWidget(createTestWidget(child: const SizedBox.shrink()));
      await tester.pumpAndSettle();
      expect(find.byType(DoctorWorkingHoursScreen), findsNothing);

      // Re-create and re-mount (State recreation)
      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(requestCount, 2);
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);
    });

    testWidgets(
        '4. Level 4 (Session Restoration & Re-Login): Lock survives logout and re-authentication with new session',
        (tester) async {
      int fetchCount = 0;
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/working-hours')) {
          fetchCount++;
          return http.Response(
            jsonEncode(createSampleScheduleJson(isActivated: true)),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path.contains('/auth/logout')) {
          return http.Response('{"status":"success"}', 200,
              headers: {'content-type': 'application/json'});
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final initialSessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('initial-doctor-token-111'),
      );
      initialSessionManager.setAuthorizedClinics([testClinic]);
      initialSessionManager.switchActiveClinic('clinic-hours-01');

      // 1. Initial authenticated session
      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: initialSessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);

      // 2. Doctor logs out: session cleared and widget destroyed
      await initialSessionManager.logout();
      await tester.pumpWidget(createTestWidget(child: const SizedBox.shrink()));
      await tester.pumpAndSettle();

      // 3. New login: fresh session manager and new token
      final restoredSessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('new-doctor-token-222'),
      );
      restoredSessionManager.setAuthorizedClinics([testClinic]);
      restoredSessionManager.switchActiveClinic('clinic-hours-01');

      // 4. Re-enter DoctorWorkingHoursScreen
      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: restoredSessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 5. Verify permanent lock is strictly enforced in the new session
      expect(fetchCount, 2);
      expect(find.textContaining('جدول مفعل ومقفل نهائياً'), findsOneWidget);
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);

      final switches = tester.widgetList<Switch>(find.byType(Switch));
      for (final s in switches) {
        expect(s.onChanged, isNull);
      }
    });

    testWidgets(
        '5. Verification of Zero Mobile Unlock Controls: No unlock action or override exists in UI',
        (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleScheduleJson(isActivated: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage('test-token-01'),
      );
      sessionManager.setAuthorizedClinics([testClinic]);
      sessionManager.switchActiveClinic('clinic-hours-01');

      await tester.pumpWidget(
        createTestWidget(
          child: DoctorWorkingHoursScreen(
            sessionManager: sessionManager,
            user: testDoctor,
            clinicId: 'clinic-hours-01',
            apiClient: apiClient,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify no unlock-related texts, buttons, or overrides exist
      expect(find.textContaining('إلغاء القفل'), findsNothing);
      expect(find.textContaining('فتح الجدول'), findsNothing);
      expect(find.textContaining('unlock'), findsNothing);
      expect(find.textContaining('تعديل الدوام'), findsNothing);
      expect(find.byKey(const Key('unlock_schedule_button')), findsNothing);
    });
  });
}
