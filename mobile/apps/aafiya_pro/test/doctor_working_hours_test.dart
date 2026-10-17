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
    id: 'doc-user-01',
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

  Map<String, dynamic> createSampleScheduleJson({bool isActivated = false}) {
    return {
      'status': 'success',
      'data': {
        'clinic_id': 'clinic-hours-01',
        'doctor_id': 'doc-user-01',
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
    test('Allowed slots invariant strictly contains 08:00..16:00 and excludes 17:00', () {
      expect(kAllowedHourlySlots.length, 9);
      expect(kAllowedHourlySlots.first, '08:00');
      expect(kAllowedHourlySlots.last, '16:00');
      expect(kAllowedHourlySlots.contains('17:00'), isFalse);
    });

    test('Canonical weekdays ordering has exactly 7 days from 0 (Saturday) to 6 (Friday)', () {
      expect(kWeekdaysOrder, [0, 1, 2, 3, 4, 5, 6]);
    });

    test('DoctorWorkingHoursData.defaultDays creates 7 days with weekend closed', () {
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
      final model = DoctorWorkingHoursData.fromJson(sample['data'] as Map<String, dynamic>);

      expect(model.clinicId, 'clinic-hours-01');
      expect(model.doctorId, 'doc-user-01');
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
    test('getSchedule sends X-Clinic-ID header and returns DoctorWorkingHoursData', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, contains('/doctors/doc-user-01/working-hours'));
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
        doctorId: 'doc-user-01',
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
      final data = (result as ApiSuccess<DoctorWorkingHoursData>).data;
      expect(data.clinicId, 'clinic-hours-01');
      expect(data.isActivated, isFalse);
    });

    test('saveDraft sends PUT request with 7 days and handles success', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.path, contains('/doctors/doc-user-01/working-hours'));
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
        doctorId: 'doc-user-01',
        days: DoctorWorkingHoursData.defaultDays(),
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
    });

    test('saveDraft handles SCHEDULE_CONTRACTION_CONFLICT 422 correctly', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'تعذر حفظ المسودة: توجد مواعيد نشطة في الساعات المحذوفة.',
            'error_code': 'SCHEDULE_CONTRACTION_CONFLICT',
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = DoctorWorkingHoursService(apiClient: apiClient);

      final result = await service.saveDraft(
        doctorId: 'doc-user-01',
        days: DoctorWorkingHoursData.defaultDays(),
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiFailure<DoctorWorkingHoursData>>());
      final failure = result as ApiFailure<DoctorWorkingHoursData>;
      expect(failure.exception.message, contains('تعذر حفظ المسودة'));
    });

    test('activateSchedule sends POST to activate endpoint and receives locked schedule', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, contains('/doctors/doc-user-01/working-hours/activate'));
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
        doctorId: 'doc-user-01',
        clinicId: 'clinic-hours-01',
      );

      expect(result, isA<ApiSuccess<DoctorWorkingHoursData>>());
      final data = (result as ApiSuccess<DoctorWorkingHoursData>).data;
      expect(data.isActivated, isTrue);
    });
  });

  group('DoctorWorkingHoursScreen — Widget Tests', () {
    testWidgets('Renders draft schedule with 7 weekdays and action buttons', (tester) async {
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

    testWidgets('Activation dialog requires mandatory checkbox before confirming', (tester) async {
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
      expect(find.textContaining('المراجعة النهائية والتفعيل النهائي'), findsOneWidget);
      expect(find.textContaining('تحذير حرج: تفعيل جدول ساعات العمل'), findsOneWidget);

      final confirmBtnFinder = find.byKey(const Key('confirm_activation_button'));
      final checkboxFinder = find.byKey(const Key('activation_irreversible_checkbox'));

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

    testWidgets('Renders permanently locked UI when schedule is already activated', (tester) async {
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
      expect(find.textContaining('تم قفل الجدول نهائياً في هذا المركز الطبي'), findsOneWidget);

      // Action buttons in bottom bar should be absent
      expect(find.byKey(const Key('save_draft_button')), findsNothing);
      expect(find.byKey(const Key('activate_schedule_button')), findsNothing);

      // Switches are disabled
      final switches = tester.widgetList<Switch>(find.byType(Switch));
      for (final s in switches) {
        expect(s.onChanged, isNull);
      }
    });
  });
}
