// ignore_for_file: depend_on_referenced_packages

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:aafiya_core/aafiya_core.dart';
import 'package:aafiya_ui/aafiya_ui.dart';
import 'package:aafiya_pro/screens/clinic_operating_hours_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testDirectorClinic = DoctorClinic(
    id: 'clinic-op-01',
    name: 'مجمع الشفاء الطبي',
    position: 'director',
    isActive: true,
    isPrimary: true,
    isDirector: true,
  );

  const testRegularClinic = DoctorClinic(
    id: 'clinic-op-02',
    name: 'مستوصف السلام',
    position: 'doctor',
    isActive: true,
    isPrimary: false,
    isDirector: false,
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

  Map<String, dynamic> createSampleOperatingHoursJson({
    bool isConfigured = true,
    bool invalidTimes = false,
  }) {
    return {
      'status': 'success',
      'data': {
        'clinic_id': 'clinic-op-01',
        'is_configured': isConfigured,
        'days': [
          {
            'day_of_week': 0, // Saturday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': invalidTimes ? '18:00' : '08:00',
                'close_time': invalidTimes ? '08:00' : '12:00',
              },
              {
                'period_index': 1,
                'open_time': '14:00',
                'close_time': '18:00',
              },
            ],
          },
          {
            'day_of_week': 1, // Sunday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': '08:00',
                'close_time': '16:00',
              },
            ],
          },
          {
            'day_of_week': 2, // Monday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': '08:00',
                'close_time': '16:00',
              },
            ],
          },
          {
            'day_of_week': 3, // Tuesday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': '08:00',
                'close_time': '16:00',
              },
            ],
          },
          {
            'day_of_week': 4, // Wednesday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': '08:00',
                'close_time': '16:00',
              },
            ],
          },
          {
            'day_of_week': 5, // Thursday
            'is_closed': false,
            'periods': [
              {
                'period_index': 0,
                'open_time': '08:00',
                'close_time': '14:00',
              },
            ],
          },
          {
            'day_of_week': 6, // Friday
            'is_closed': true,
            'periods': [],
          },
        ],
      },
    };
  }

  group('Clinic Operating Hours — Models & Serialization', () {
    test('ClinicOperatingPeriod handles fromJson and toJson', () {
      final period = ClinicOperatingPeriod(
        periodIndex: 0,
        openTime: '08:30',
        closeTime: '12:30',
      );

      final json = period.toJson();
      expect(json['period_index'], 0);
      expect(json['open_time'], '08:30');
      expect(json['close_time'], '12:30');

      final reconstructed = ClinicOperatingPeriod.fromJson(json);
      expect(reconstructed.periodIndex, 0);
      expect(reconstructed.openTime, '08:30');
      expect(reconstructed.closeTime, '12:30');
    });

    test('ClinicOperatingDay handles fromJson, toJson and copyWith', () {
      final day = ClinicOperatingDay(
        dayOfWeek: 0,
        isClosed: false,
        periods: [
          ClinicOperatingPeriod(
            periodIndex: 0,
            openTime: '09:00',
            closeTime: '17:00',
          ),
        ],
      );

      expect(day.dayOfWeek, 0);
      expect(day.isClosed, isFalse);
      expect(day.periods.length, 1);

      final closedDay = day.copyWith(isClosed: true, periods: []);
      expect(closedDay.isClosed, isTrue);
      expect(closedDay.periods, isEmpty);
    });

    test('ClinicOperatingHoursData.unconfiguredDays generates 7 days from 0 (Saturday) to 6 (Friday)', () {
      final days = ClinicOperatingHoursData.unconfiguredDays();
      expect(days.length, 7);
      for (int i = 0; i < 7; i++) {
        expect(days[i].dayOfWeek, i);
        expect(days[i].isClosed, isTrue);
        expect(days[i].periods, isEmpty);
      }
    });

    test('ClinicOperatingHoursData handles configured and unconfigured json parsing', () {
      final jsonConfigured = createSampleOperatingHoursJson(isConfigured: true);
      final dataConfigured = ClinicOperatingHoursData.fromJson(
        jsonConfigured['data'] as Map<String, dynamic>,
      );

      expect(dataConfigured.clinicId, 'clinic-op-01');
      expect(dataConfigured.isConfigured, isTrue);
      expect(dataConfigured.days.length, 7);
      expect(dataConfigured.days[0].periods.length, 2); // Split-shift

      final jsonUnconfigured = {
        'clinic_id': 'clinic-op-02',
        'is_configured': false,
        'days': [],
      };
      final dataUnconfigured = ClinicOperatingHoursData.fromJson(jsonUnconfigured);
      expect(dataUnconfigured.isConfigured, isFalse);
      expect(dataUnconfigured.days.length, 7);
    });
  });

  group('ClinicOperatingHoursService — HTTP Mock Client', () {
    test('getOperatingHours sends X-Clinic-ID header and returns data', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, contains('/clinic/operating-hours'));
        expect(request.headers['X-Clinic-ID'], 'clinic-op-01');

        return http.Response(
          jsonEncode(createSampleOperatingHoursJson(isConfigured: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = ClinicOperatingHoursService(apiClient: apiClient);

      final result = await service.getOperatingHours(clinicId: 'clinic-op-01');

      expect(result, isA<ApiSuccess<ClinicOperatingHoursData>>());
      final data = (result as ApiSuccess<ClinicOperatingHoursData>).data;
      expect(data.clinicId, 'clinic-op-01');
      expect(data.isConfigured, isTrue);
      expect(data.days.length, 7);
    });

    test('saveOperatingHours sends PUT request with 7 days and X-Clinic-ID header', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.path, contains('/clinic/operating-hours'));
        expect(request.headers['X-Clinic-ID'], 'clinic-op-01');

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body.containsKey('days'), isTrue);
        final days = body['days'] as List;
        expect(days.length, 7);

        return http.Response(
          jsonEncode({
            'status': 'success',
            'message': 'تم حفظ ساعات عمل المنشأة بنجاح.',
            'data': createSampleOperatingHoursJson(isConfigured: true)['data'],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = ClinicOperatingHoursService(apiClient: apiClient);

      final sampleDays = ClinicOperatingHoursData.fromJson(
        createSampleOperatingHoursJson(isConfigured: true)['data'] as Map<String, dynamic>,
      ).days;

      final result = await service.saveOperatingHours(
        clinicId: 'clinic-op-01',
        days: sampleDays,
      );

      expect(result, isA<ApiSuccess<ClinicOperatingHoursData>>());
    });

    test('saveOperatingHours handles 403 Forbidden correctly', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': 'غير مصرح لك بتعديل ساعات عمل هذه المنشأة.',
            'error_code': 'FORBIDDEN',
          }),
          403,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final service = ClinicOperatingHoursService(apiClient: apiClient);

      final result = await service.saveOperatingHours(
        clinicId: 'clinic-op-01',
        days: ClinicOperatingHoursData.unconfiguredDays(),
      );

      expect(result, isA<ApiFailure<ClinicOperatingHoursData>>());
      final failure = result as ApiFailure<ClinicOperatingHoursData>;
      expect(failure.exception.message, contains('غير مصرح لك'));
    });
  });

  group('ClinicOperatingHoursScreen — Widget Tests', () {
    testWidgets('Renders 7 canonical weekdays and unconfigured warning banner', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleOperatingHoursJson(isConfigured: false)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testDirectorClinic]);
      sessionManager.switchActiveClinic('clinic-op-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicOperatingHoursScreen(
            sessionManager: sessionManager,
            clinicId: 'clinic-op-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check weekdays rendered (Arabic locale)
      expect(find.text('السبت'), findsOneWidget);
      expect(find.text('الأحد'), findsOneWidget);
      expect(find.text('الاثنين'), findsOneWidget);
      expect(find.text('الثلاثاء'), findsOneWidget);
      expect(find.text('الأربعاء'), findsOneWidget);
      expect(find.text('الخميس'), findsOneWidget);
      expect(find.text('الجمعة'), findsOneWidget);

      // Check unconfigured banner
      expect(find.textContaining('ساعات المنشأة غير مهيأة'), findsOneWidget);

      // Check save button is available for director
      expect(find.byKey(const Key('save_clinic_hours_button')), findsOneWidget);
    });

    testWidgets('Non-director sees restriction banner and cannot see save button', (tester) async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleOperatingHoursJson(isConfigured: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testRegularClinic]);
      sessionManager.switchActiveClinic('clinic-op-02');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicOperatingHoursScreen(
            sessionManager: sessionManager,
            clinicId: 'clinic-op-02',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check restriction notice
      expect(
        find.textContaining('هذه الشاشة مخصصة حصراً للمدير الطبي للعيادة أو الموظف المصرح له بإدارة الإعدادات.'),
        findsOneWidget,
      );

      // Save button is hidden for non-director
      expect(find.byKey(const Key('save_clinic_hours_button')), findsNothing);
    });

    testWidgets('Toggling day switch opens/closes periods', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleOperatingHoursJson(isConfigured: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testDirectorClinic]);
      sessionManager.switchActiveClinic('clinic-op-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicOperatingHoursScreen(
            sessionManager: sessionManager,
            clinicId: 'clinic-op-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Friday (day 6) is initially closed
      final fridaySwitch = find.byKey(const Key('switch_day_6'));
      expect(fridaySwitch, findsOneWidget);

      // Toggle Friday to open
      await tester.tap(fridaySwitch);
      await tester.pumpAndSettle();

      // Friday now has an add period button
      expect(find.byKey(const Key('add_period_button_6')), findsOneWidget);
    });

    testWidgets('Validates open_time < close_time locally and blocks save', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode(createSampleOperatingHoursJson(isConfigured: true, invalidTimes: true)),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testDirectorClinic]);
      sessionManager.switchActiveClinic('clinic-op-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicOperatingHoursScreen(
            sessionManager: sessionManager,
            clinicId: 'clinic-op-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap save while invalid times (18:00 -> 08:00) exist
      final saveButton = find.byKey(const Key('save_clinic_hours_button'));
      await tester.tap(saveButton);
      await tester.pumpAndSettle();

      // Local validation error message must be shown (in inline banner and floating snackbar)
      expect(find.textContaining('وقت الفتح يجب أن يسبق وقت الإغلاق'), findsWidgets);
    });

    testWidgets('Saving valid schedule sends PUT and displays success snackbar', (tester) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      bool putCalled = false;
      final mockClient = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode(createSampleOperatingHoursJson(isConfigured: true)),
            200,
            headers: {'content-type': 'application/json'},
          );
        } else if (request.method == 'PUT') {
          putCalled = true;
          return http.Response(
            jsonEncode({
              'status': 'success',
              'message': 'تم حفظ ساعات عمل المنشأة بنجاح.',
              'data': createSampleOperatingHoursJson(isConfigured: true)['data'],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final sessionManager = AuthSessionManager(
        apiClient: apiClient,
        tokenStorage: InMemoryTokenStorage(),
      );
      sessionManager.setAuthorizedClinics([testDirectorClinic]);
      sessionManager.switchActiveClinic('clinic-op-01');

      await tester.pumpWidget(
        createTestWidget(
          child: ClinicOperatingHoursScreen(
            sessionManager: sessionManager,
            clinicId: 'clinic-op-01',
            apiClient: apiClient,
          ),
        ),
      );

      await tester.pumpAndSettle();

      final saveButton = find.byKey(const Key('save_clinic_hours_button'));
      expect(saveButton, findsOneWidget);

      await tester.tap(saveButton);
      await tester.pumpAndSettle();

      expect(putCalled, isTrue);
      expect(find.textContaining('تم حفظ وتحديث ساعات تشغيل العيادة بنجاح والتزامن مع النظام.'), findsWidgets);
    });
  });
}
